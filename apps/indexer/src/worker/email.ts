const EMAIL_FROM = process.env.EMAIL_FROM ?? "Ember <no-reply@ember.app>";
const WEB_APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export interface EmailJob {
  id: string;
  to: string;
  template: string;
  payload: Record<string, unknown>;
}

export async function sendEmail(job: EmailJob): Promise<{ resendId: string }> {
  const response = await fetch(`${WEB_APP_URL}/api/internal/email/render`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(job),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "unknown error");
    throw new Error(`Email render API failed (${response.status}): ${text}`);
  }

  const { html, subject } = await response.json() as { html: string; subject: string };

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { Resend } = require("resend");
  const resend = new Resend(process.env.RESEND_API_KEY);

  const result = await resend.send({
    from: EMAIL_FROM,
    to: job.to,
    subject,
    html,
  });

  if (result.error) {
    throw new Error(`Resend error: ${result.error.message}`);
  }

  return { resendId: result.data?.id ?? "" };
}