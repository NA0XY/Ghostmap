import { Resend } from "resend";
import { logger } from "../utils/logger.js";

let resendClient: Resend | null = null;

export function getResendClient(): Resend {
  if (resendClient) {
    return resendClient;
  }

  const apiKey = process.env["RESEND_API_KEY"];
  if (!apiKey) {
    throw new Error("Missing RESEND_API_KEY — set in Render environment.");
  }

  resendClient = new Resend(apiKey);
  return resendClient;
}

/**
 * Send an email via Resend.
 * Logs the error but does NOT throw.
 */
export async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
}): Promise<void> {
  const fromEmail = process.env["RESEND_FROM_EMAIL"] ?? "maps@ghostmap.dev";

  try {
    const resend = getResendClient();
    const { error } = await resend.emails.send({
      from: `Ghostmap <${fromEmail}>`,
      to: params.to,
      subject: params.subject,
      html: params.html,
    });

    if (error) {
      logger.error("Resend API returned error", { error: error.message, to: params.to });
      return;
    }

    logger.info("Email sent", { to: params.to, subject: params.subject });
  } catch (err) {
    logger.error("Failed to send email", { error: String(err), to: params.to });
  }
}
