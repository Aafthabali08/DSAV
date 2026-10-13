import { it, expect } from "vitest";
import { isLocalHost } from "../src/code-lab.js";
it("treats only loopback hosts as local compiler hosts", () => {
  for (const host of ["localhost", "127.0.0.1", "[::1]", "app.localhost"])
    expect(isLocalHost(host)).toBe(true);
  for (const host of ["sortscope.vercel.app", "example.com", "127.0.0.2"])
    expect(isLocalHost(host)).toBe(false);
});
