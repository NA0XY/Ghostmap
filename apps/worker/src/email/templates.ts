function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/**
 * Confirmation email — sent when a HEAVY job is successfully enqueued.
 */
export function enqueuedEmailHtml(params: {
  repoOwner: string;
  repoName: string;
  jobId: string;
}): { subject: string; html: string } {
  const repoOwner = escapeHtml(params.repoOwner);
  const repoName = escapeHtml(params.repoName);
  const jobId = escapeHtml(params.jobId);

  return {
    subject: `Your Ghostmap analysis is queued — ${repoOwner}/${repoName}`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="background:#0a0a0f;color:#e8e8f0;font-family:'Inter',system-ui,sans-serif;margin:0;padding:40px 24px;">
  <div style="max-width:520px;margin:0 auto;">
    <div style="font-size:28px;font-weight:700;margin-bottom:8px;">
      <span style="color:#7c6af7;">◎</span> ghostmap
    </div>
    <h1 style="font-size:20px;font-weight:600;margin:24px 0 8px;color:#e8e8f0;">
      Your analysis is queued
    </h1>
    <p style="color:#8888a8;font-size:14px;line-height:1.6;margin:0 0 16px;">
      We've received your request to map <strong style="color:#e8e8f0;">${repoOwner}/${repoName}</strong>.
      It's been added to the queue and will start shortly.
    </p>
    <p style="color:#8888a8;font-size:14px;line-height:1.6;margin:0 0 24px;">
      We'll email you again as soon as your map is ready. Results are kept for 48 hours.
    </p>
    <p style="color:#44445a;font-size:12px;">Job ID: <code style="font-family:monospace;">${jobId}</code></p>
  </div>
</body>
</html>
    `.trim(),
  };
}

/**
 * Completion email — sent when a HEAVY job reaches "complete" status.
 */
export function readyEmailHtml(params: {
  repoOwner: string;
  repoName: string;
  jobId: string;
  webBaseUrl: string;
}): { subject: string; html: string } {
  const repoOwner = escapeHtml(params.repoOwner);
  const repoName = escapeHtml(params.repoName);
  const resultUrl = `${params.webBaseUrl}/map/${encodeURIComponent(params.jobId)}`;

  return {
    subject: `Your Ghostmap is ready — ${repoOwner}/${repoName}`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="background:#0a0a0f;color:#e8e8f0;font-family:'Inter',system-ui,sans-serif;margin:0;padding:40px 24px;">
  <div style="max-width:520px;margin:0 auto;">
    <div style="font-size:28px;font-weight:700;margin-bottom:8px;">
      <span style="color:#7c6af7;">◎</span> ghostmap
    </div>
    <h1 style="font-size:20px;font-weight:600;margin:24px 0 8px;color:#e8e8f0;">
      Your map is ready
    </h1>
    <p style="color:#8888a8;font-size:14px;line-height:1.6;margin:0 0 24px;">
      The analysis of <strong style="color:#e8e8f0;">${repoOwner}/${repoName}</strong> is complete.
    </p>
    <a
      href="${escapeHtml(resultUrl)}"
      style="display:inline-block;padding:12px 24px;background:#7c6af7;border-radius:6px;color:#fff;font-weight:600;font-size:14px;text-decoration:none;"
    >
      View your Ghostmap →
    </a>
    <p style="color:#44445a;font-size:12px;margin-top:24px;">
      This link expires in 48 hours.
    </p>
  </div>
</body>
</html>
    `.trim(),
  };
}

/**
 * Failure/stale email — sent when a job is dropped or fails.
 */
export function failedEmailHtml(params: {
  repoOwner: string;
  repoName: string;
  errorMessage: string;
  webBaseUrl: string;
}): { subject: string; html: string } {
  const repoOwner = escapeHtml(params.repoOwner);
  const repoName = escapeHtml(params.repoName);
  const errorMessage = escapeHtml(params.errorMessage);
  const webBaseUrl = escapeHtml(params.webBaseUrl);

  return {
    subject: `Ghostmap analysis failed — ${repoOwner}/${repoName}`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="background:#0a0a0f;color:#e8e8f0;font-family:'Inter',system-ui,sans-serif;margin:0;padding:40px 24px;">
  <div style="max-width:520px;margin:0 auto;">
    <div style="font-size:28px;font-weight:700;margin-bottom:8px;">
      <span style="color:#7c6af7;">◎</span> ghostmap
    </div>
    <h1 style="font-size:20px;font-weight:600;margin:24px 0 8px;color:#c0503d;">
      Analysis failed
    </h1>
    <p style="color:#8888a8;font-size:14px;line-height:1.6;margin:0 0 12px;">
      We ran into a problem analysing <strong style="color:#e8e8f0;">${repoOwner}/${repoName}</strong>.
    </p>
    <p style="color:#8888a8;font-size:14px;line-height:1.6;margin:0 0 24px;">
      <strong>Reason:</strong> ${errorMessage}
    </p>
    <a
      href="${webBaseUrl}"
      style="display:inline-block;padding:12px 24px;background:#2a2a3d;border-radius:6px;color:#e8e8f0;font-weight:600;font-size:14px;text-decoration:none;"
    >
      Try again →
    </a>
  </div>
</body>
</html>
    `.trim(),
  };
}
