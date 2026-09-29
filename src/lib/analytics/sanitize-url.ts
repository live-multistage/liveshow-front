// Routes whose dynamic segment is a bearer secret (invite token, broadcaster dock token).
// Page URLs are stored for 180 days, shown in the tracking debugger and forwarded to
// webhooks, so the segment is replaced by its route placeholder. Query params are
// already reduced to utm_* by the SDK.
const SECRET_SEGMENT_ROUTES = [/^(\/invitations\/)[^/]+/, /^(\/broadcaster-dock\/)[^/]+/];

export function sanitizeTrackedUrl(url: URL): URL {
  const out = new URL(url.href);
  for (const route of SECRET_SEGMENT_ROUTES) {
    out.pathname = out.pathname.replace(route, '$1:token');
  }
  return out;
}
