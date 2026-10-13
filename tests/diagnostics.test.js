import { it, expect } from "vitest";
import { diagnostic } from "../src/diagnostics.js";
it("extracts compiler locations and does not invent missing ones", () => {
  expect(
    diagnostic({
      phase: "compile",
      error: "main.cpp:12:4: error: missing expression",
    }),
  ).toMatchObject({ title: "Compilation failed", line: 12 });
  expect(
    diagnostic({ phase: "syntax", error: "Unexpected token (3:5)" }).line,
  ).toBe(3);
  expect(diagnostic({ error: "failure without location" }).line).toBe(null);
  expect(diagnostic({ error: "ZeroDivisionError", errorLine: 7 }).line).toBe(7);
});
