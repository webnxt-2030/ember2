import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { errorResponse } from "@/lib/api-response";
import { ValidationError } from "@/lib/errors";
import { z } from "zod";

const WEBHOOK_SECRET = process.env.RESEND_WEBHOOK_SECRET;

const resendEventSchema = z.object({
  type: z.enum(["email.delivered", "email.bounced", "email.complained"]),
  payload: z.object({
    id: z.string(),
  }),
});

async function verifyWebhookSignature(req: NextRequest, body: string): Promise<boolean> {
  if (!WEBHOOK_SECRET) {
    console.warn("[resend-webhook] RESEND_WEBHOOK_SECRET not set — skipping verification");
    return true;
  }
  const signature = req.headers.get("resend-webhook-signature");
  if (!signature) return false;

  const keyData = new TextEncoder().encode(WEBHOOK_SECRET);
  const key = await globalThis.crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await globalThis.crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  const expected = "sha256=" + Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");

  return expected === signature;
}

export async function POST(req: NextRequest) {
  const body = await req.text();

  const isValid = await verifyWebhookSignature(req, body);
  if (!isValid) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    return errorResponse(new ValidationError("Invalid JSON body"), req);
  }

  const parseResult = resendEventSchema.safeParse(parsed);
  if (!parseResult.success) {
    return NextResponse.json(
      { error: "Invalid event shape" },
      { status: 400 }
    );
  }

  const { type, payload } = parseResult.data;
  const { id: resendId } = payload;

  const notification = await prisma.emailNotification.findUnique({
    where: { resendId },
  });

  if (!notification) {
    return NextResponse.json({ error: "Notification not found" }, { status: 404 });
  }

  switch (type) {
    case "email.delivered":
      await prisma.emailNotification.update({
        where: { id: notification.id },
        data: { status: "SENT", sentAt: new Date() },
      });
      break;
    case "email.bounced":
    case "email.complained":
      await prisma.emailNotification.update({
        where: { id: notification.id },
        data: { status: "FAILED", error: type },
      });
      break;
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}