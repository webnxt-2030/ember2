import { Resend } from "resend";

const EMAIL_FROM = process.env.EMAIL_FROM ?? "Ember <no-reply@ember.app>";
const WEB_APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const resend = new Resend(process.env.RESEND_API_KEY);

export interface EmailJob {
  id: string;
  to: string;
  template: string;
  payload: Record<string, unknown>;
}

export async function sendEmail(job: EmailJob): Promise<{ resendId: string | null }> {
  const INDEXER_API_KEY = process.env.INDEXER_API_KEY;
  const response = await fetch(`${WEB_APP_URL}/api/internal/email/render`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-indexer-api-key": INDEXER_API_KEY ?? "",
    },
    body: JSON.stringify(job),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "unknown error");
    throw new Error(`Email render API failed (${response.status}): ${text}`);
  }

  const { html, subject } = await response.json() as { html: string; subject: string };

  const result = await resend.emails.send({
    from: EMAIL_FROM,
    to: job.to,
    subject,
    html,
  });

  if (result.error) {
    throw new Error(`Resend error: ${result.error.message}`);
  }

  return { resendId: result.data?.id ?? null };
}