// Request policy for exposing the runner beyond localhost: exact-origin CORS
// allowlist, client identification behind a reverse proxy and rate limits.
const LOCAL_ORIGIN = /^http:\/\/(127\.0\.0\.1|localhost):(7000|7001)$/;

export const parseOrigins = (value = "") =>
  value
    .split(",")
    .map((s) => s.trim().replace(/\/+$/, ""))
    .filter((s) => /^https?:\/\/[^/\s]+$/.test(s));

// Requests without an Origin header (curl, same-origin GET) are allowed; the
// rate limiter still applies to them.
export const isAllowedOrigin = (origin, allowed = []) =>
  !origin || LOCAL_ORIGIN.test(origin) || allowed.includes(origin);

export const corsHeaders = (origin, allowed = []) =>
  origin && allowed.includes(origin)
    ? {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, X-SortScope-Token",
        "Access-Control-Max-Age": "600",
        Vary: "Origin",
      }
    : {};

// Behind Caddy the last X-Forwarded-For entry is the address Caddy saw.
export function clientIp(req, trustProxy = false) {
  const forwarded = trustProxy && req.headers["x-forwarded-for"];
  if (forwarded) return String(forwarded).split(",").at(-1).trim();
  return req.socket?.remoteAddress || "unknown";
}

// Fixed-window counter per key. limit <= 0 disables limiting.
export function createRateLimiter({ limit, windowMs, now = Date.now }) {
  const windows = new Map();
  return {
    take(key) {
      if (!(limit > 0)) return { allowed: true, retryAfter: 0 };
      const t = now();
      let w = windows.get(key);
      if (!w || t - w.start >= windowMs) {
        w = { start: t, count: 0 };
        windows.set(key, w);
      }
      if (windows.size > 10000)
        for (const [k, v] of windows)
          if (t - v.start >= windowMs) windows.delete(k);
      if (w.count >= limit)
        return {
          allowed: false,
          retryAfter: Math.ceil((w.start + windowMs - t) / 1000),
        };
      w.count++;
      return { allowed: true, retryAfter: 0 };
    },
  };
}
