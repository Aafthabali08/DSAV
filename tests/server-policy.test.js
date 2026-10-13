import { it, expect } from "vitest";
import {
  parseOrigins,
  isAllowedOrigin,
  corsHeaders,
  clientIp,
  createRateLimiter,
} from "../server/policy.js";

const site = "https://sortscopea.vercel.app";

it("parses only exact http(s) origins", () => {
  expect(
    parseOrigins(` ${site}/ , https://a.test,bad, https://x.test/path,`),
  ).toEqual([site, "https://a.test"]);
  expect(parseOrigins()).toEqual([]);
});

it("allows local dev, listed origins and header-less requests only", () => {
  expect(isAllowedOrigin(undefined, [])).toBe(true);
  expect(isAllowedOrigin("http://127.0.0.1:7000", [])).toBe(true);
  expect(isAllowedOrigin(site, [site])).toBe(true);
  expect(isAllowedOrigin(site, [])).toBe(false);
  expect(isAllowedOrigin("https://evil.example", [site])).toBe(false);
  expect(isAllowedOrigin(site + ".evil.example", [site])).toBe(false);
  expect(isAllowedOrigin("http://127.0.0.1:9999", [])).toBe(false);
});

it("sends CORS headers only to listed origins", () => {
  expect(corsHeaders(site, [site])).toMatchObject({
    "Access-Control-Allow-Origin": site,
    "Access-Control-Allow-Headers": "Content-Type, X-SortScope-Token",
    Vary: "Origin",
  });
  expect(corsHeaders("https://evil.example", [site])).toEqual({});
  expect(corsHeaders(undefined, [site])).toEqual({});
});

it("trusts the proxy-added forwarding address only when configured", () => {
  const req = {
    headers: { "x-forwarded-for": "6.6.6.6, 203.0.113.9" },
    socket: { remoteAddress: "127.0.0.1" },
  };
  expect(clientIp(req, true)).toBe("203.0.113.9");
  expect(clientIp(req, false)).toBe("127.0.0.1");
  expect(clientIp({ headers: {}, socket: {} }, true)).toBe("unknown");
});

it("limits each client per window and resets afterwards", () => {
  let t = 0;
  const limiter = createRateLimiter({ limit: 2, windowMs: 1000, now: () => t });
  expect(limiter.take("a").allowed).toBe(true);
  expect(limiter.take("a").allowed).toBe(true);
  expect(limiter.take("a")).toEqual({ allowed: false, retryAfter: 1 });
  expect(limiter.take("b").allowed).toBe(true);
  t = 1000;
  expect(limiter.take("a").allowed).toBe(true);
  const off = createRateLimiter({ limit: 0, windowMs: 1000 });
  for (let i = 0; i < 50; i++) expect(off.take("a").allowed).toBe(true);
});
