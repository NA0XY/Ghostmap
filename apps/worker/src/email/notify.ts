import { sendEmail } from "./client.js";
import { enqueuedEmailHtml, failedEmailHtml, readyEmailHtml } from "./templates.js";

const WEB_BASE_URL = process.env["WEB_BASE_URL"] ?? "https://ghostmap.dev";

/**
 * Send confirmation email when a HEAVY job is enqueued.
 */
export async function sendEnqueuedEmail(params: {
  notifyEmail: string | null;
  repoOwner: string;
  repoName: string;
  jobId: string;
}): Promise<void> {
  if (!params.notifyEmail) {
    return;
  }

  const { subject, html } = enqueuedEmailHtml({
    repoOwner: params.repoOwner,
    repoName: params.repoName,
    jobId: params.jobId,
  });

  await sendEmail({
    to: params.notifyEmail,
    subject,
    html,
  });
}

/**
 * Send "map ready" email.
 */
export async function sendReadyEmail(params: {
  notifyEmail: string | null;
  repoOwner: string;
  repoName: string;
  jobId: string;
}): Promise<void> {
  if (!params.notifyEmail) {
    return;
  }

  const { subject, html } = readyEmailHtml({
    repoOwner: params.repoOwner,
    repoName: params.repoName,
    jobId: params.jobId,
    webBaseUrl: WEB_BASE_URL,
  });

  await sendEmail({
    to: params.notifyEmail,
    subject,
    html,
  });
}

/**
 * Send failure email.
 */
export async function sendFailedEmail(params: {
  notifyEmail: string | null;
  repoOwner: string;
  repoName: string;
  errorMessage: string;
}): Promise<void> {
  if (!params.notifyEmail) {
    return;
  }

  const { subject, html } = failedEmailHtml({
    repoOwner: params.repoOwner,
    repoName: params.repoName,
    errorMessage: params.errorMessage,
    webBaseUrl: WEB_BASE_URL,
  });

  await sendEmail({
    to: params.notifyEmail,
    subject,
    html,
  });
}
