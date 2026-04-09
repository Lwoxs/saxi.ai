function json(body: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(body, null, 2), {
    ...init,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...init?.headers
    }
  });
}

export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/health") {
      return json({
        ok: true,
        app: "saxi",
        timestamp: new Date().toISOString()
      });
    }

    if (url.pathname === "/internal/screenshot") {
      return json(
        {
          ok: false,
          error:
            "Screenshot capture is not configured yet. The build pipeline falls back to generated placeholders."
        },
        { status: 501 }
      );
    }

    if (url.pathname === "/favicon.ico") {
      return env.ASSETS.fetch(new Request(new URL("/favicon.svg", url), request));
    }

    return env.ASSETS.fetch(request);
  }
} satisfies ExportedHandler<Env>;
