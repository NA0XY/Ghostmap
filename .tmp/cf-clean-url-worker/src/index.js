const RENDER_ORIGIN = "https://ghostmap-worker.onrender.com";

function htmlResponse(body) {
  return new Response(body, {
    status: 200,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

function landingPage() {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>ghostmap</title>
    <style>
      :root {
        --bg: #0b0f1a;
        --card: #141b2d;
        --text: #e6ebff;
        --muted: #9aa8cf;
        --accent: #45c4ff;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        padding: 24px;
        background:
          radial-gradient(1200px 800px at 80% -20%, rgba(69, 196, 255, 0.16), transparent 60%),
          radial-gradient(1000px 700px at -20% 120%, rgba(85, 128, 255, 0.16), transparent 60%),
          var(--bg);
        color: var(--text);
        font-family: "Segoe UI", "Inter", system-ui, sans-serif;
      }
      .card {
        width: min(760px, 100%);
        border: 1px solid rgba(154, 168, 207, 0.24);
        border-radius: 16px;
        padding: 28px;
        background: linear-gradient(180deg, rgba(20, 27, 45, 0.85), rgba(20, 27, 45, 0.65));
        backdrop-filter: blur(4px);
      }
      h1 {
        margin: 0 0 8px;
        font-size: clamp(30px, 5vw, 46px);
        line-height: 1.05;
        letter-spacing: -0.02em;
      }
      p {
        margin: 0;
        color: var(--muted);
        line-height: 1.6;
      }
      .links {
        margin-top: 18px;
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
      }
      a {
        color: var(--text);
        text-decoration: none;
        border: 1px solid rgba(154, 168, 207, 0.3);
        border-radius: 10px;
        padding: 10px 14px;
        font-weight: 600;
      }
      a:hover {
        border-color: var(--accent);
      }
      .mono {
        margin-top: 16px;
        font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
        font-size: 12px;
      }
    </style>
  </head>
  <body>
    <main class="card">
      <h1>ghostmap</h1>
      <p>Clean edge URL for Ghostmap. Worker health and enqueue APIs are proxied through this domain.</p>
      <div class="links">
        <a href="/healthz">Health Check</a>
      </div>
      <p class="mono">Worker URL: ghostmap.quantis.workers.dev</p>
    </main>
  </body>
</html>`;
}

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const pathname = url.pathname;

    if (pathname === "/") {
      return htmlResponse(landingPage());
    }

    if (pathname === "/healthz" || pathname === "/api/enqueue") {
      const targetUrl = new URL(pathname + url.search, RENDER_ORIGIN);
      const proxiedRequest = new Request(targetUrl.toString(), request);
      return fetch(proxiedRequest);
    }

    return new Response(
      JSON.stringify({ error: "Not found." }),
      {
        status: 404,
        headers: { "content-type": "application/json; charset=utf-8" },
      },
    );
  },
};
