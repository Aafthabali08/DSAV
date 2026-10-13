import { describe, it, expect } from "vitest";
import {
  trace,
  metadata,
  parseInput,
  generate,
  advance,
} from "../src/engine.js";
describe("algorithm trace contract", () => {
  for (const key of Object.keys(metadata)) {
    it(`${key}: correct output, identities, stability, immutable snapshots, metadata and counters`, () => {
      const inputs = [
        [2, 1],
        [1, 2, 3],
        [3, 2, 1],
        [0, 0, 0],
        [-3, 0, -3, 9, 1],
        ...Array.from({ length: 63 }, (_, i) => generate(i + 2, i * 73)),
      ];
      for (const a of inputs) {
        const copy = [...a],
          t = trace(a, key),
          end = t.at(-1);
        expect(a).toEqual(copy);
        expect(end.values.map((x) => x.value)).toEqual(
          [...a].sort((a, b) => a - b),
        );
        expect(end.values.map((x) => x.id).sort((a, b) => a - b)).toEqual(
          a.map((_, i) => i),
        );
        if (metadata[key].stable)
          for (let i = 1; i < end.values.length; i++)
            if (end.values[i].value === end.values[i - 1].value)
              expect(end.values[i].id).toBeGreaterThan(end.values[i - 1].id);
        expect(t[0].metrics).toEqual({ comparisons: 0, swaps: 0, writes: 0 });
        for (let i = 1; i < t.length; i++) {
          for (const metric of ["comparisons", "swaps", "writes"])
            expect(t[i].metrics[metric]).toBeGreaterThanOrEqual(
              t[i - 1].metrics[metric],
            );
          expect(t[i].line).toBeLessThan(metadata[key].code.length);
          expect(t[i].active.every((j) => j >= 0 && j < a.length)).toBe(true);
        }
        expect(trace(a, key)).toEqual(t);
      }
    });
  }
});
it("exact metrics", () => {
  const checks = [
    ["bubble", [2, 1], 1, 1, 2],
    ["bubble", [1, 2, 3], 2, 0, 0],
    ["selection", [3, 2, 1], 3, 1, 2],
    ["insertion", [2, 1], 1, 0, 2],
    ["merge", [2, 1], 1, 0, 2],
    ["quick", [2, 1], 1, 1, 2],
  ];
  for (const [key, a, comparisons, swaps, writes] of checks)
    expect(trace(a, key).at(-1).metrics).toEqual({
      comparisons,
      swaps,
      writes,
    });
});
it("strict input validation", () => {
  expect(parseInput("12, -3, 12 0,7")).toEqual([12, -3, 12, 0, 7]);
  for (const s of [
    "",
    "1",
    "3x, 2",
    "1.5,2",
    "Infinity, 1",
    "1000,2",
    Array(65).fill(1).join(","),
  ])
    expect(() => parseInput(s)).toThrow();
});
it("seeded inputs and playback bounds", () => {
  expect(generate(16, 42)).toEqual(generate(16, 42));
  expect(advance(0, 10, -1)).toBe(0);
  expect(advance(9, 10)).toBe(9);
  expect(advance(advance(4, 10), 10, -1)).toBe(4);
  const a = trace([3, 1, 2], "bubble"),
    b = trace([3, 1, 2], "merge");
  expect(a[0].values).toEqual(b[0].values);
  expect(a[0].values).not.toBe(b[0].values);
});
