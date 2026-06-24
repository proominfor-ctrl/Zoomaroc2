type PagesFunction = () => Response;

export const onRequestGet: PagesFunction = () =>
  new Response(JSON.stringify({ ok: true, source: "cloudflare-pages-functions" }), {
    headers: { "Content-Type": "application/json" },
  });
