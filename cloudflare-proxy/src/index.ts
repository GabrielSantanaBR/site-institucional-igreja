const UPSTREAM_ORIGIN = "https://site-institucional-igreja.tudoido521.chatgpt.site";

const AUTH_PATHS = new Set([
  "/acesso-interno",
  "/signin-with-chatgpt",
  "/callback",
  "/signout-with-chatgpt",
]);

function rewriteHeaderUrl(value: string, publicOrigin: string): string {
  return value.startsWith(UPSTREAM_ORIGIN)
    ? `${publicOrigin}${value.slice(UPSTREAM_ORIGIN.length)}`
    : value;
}

export default {
  async fetch(request: Request): Promise<Response> {
    const publicUrl = new URL(request.url);

    // Authentication remains on the original application because its OAuth
    // callback is registered there. Public visitors never need this route.
    if (AUTH_PATHS.has(publicUrl.pathname)) {
      return Response.redirect(
        `${UPSTREAM_ORIGIN}${publicUrl.pathname}${publicUrl.search}`,
        302,
      );
    }

    const upstreamUrl = new URL(publicUrl.pathname + publicUrl.search, UPSTREAM_ORIGIN);
    const headers = new Headers(request.headers);
    headers.delete("host");

    const origin = headers.get("origin");
    if (origin === publicUrl.origin) headers.set("origin", UPSTREAM_ORIGIN);

    const referer = headers.get("referer");
    if (referer?.startsWith(publicUrl.origin)) {
      headers.set("referer", `${UPSTREAM_ORIGIN}${referer.slice(publicUrl.origin.length)}`);
    }

    const upstreamResponse = await fetch(new Request(upstreamUrl, {
      method: request.method,
      headers,
      body: request.method === "GET" || request.method === "HEAD" ? undefined : request.body,
      redirect: "manual",
    }));

    const responseHeaders = new Headers(upstreamResponse.headers);
    const location = responseHeaders.get("location");
    if (location) responseHeaders.set("location", rewriteHeaderUrl(location, publicUrl.origin));

    return new Response(upstreamResponse.body, {
      status: upstreamResponse.status,
      statusText: upstreamResponse.statusText,
      headers: responseHeaders,
    });
  },
} satisfies ExportedHandler;
