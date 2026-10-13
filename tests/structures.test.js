import { it, expect } from "vitest";
import {
  structureTrace,
  parseEdges,
  buildTree,
} from "../src/structure-engine.js";
import { instrument } from "../server/instrument.js";
import vm from "node:vm";
it("array operations derive every state from editable input", () => {
  const a = [8, 2, 5];
  const t = structureTrace("Array", a, {
    operation: "Insert",
    index: 1,
    value: -7,
  });
  expect(t.at(-1).values).toEqual([8, -7, 2, 5]);
  expect(a).toEqual([8, 2, 5]);
  expect(t[1].values).toEqual([8, 2, null, 5]);
  expect(
    structureTrace("Array", a, { operation: "Remove", index: 1 }).at(-1).values,
  ).toEqual([8, 5]);
});
it("linked list, stack and queue operations", () => {
  expect(
    structureTrace("Linked list", [5, 9], {
      operation: "Insert",
      index: 1,
      value: 7,
    }).at(-1).values,
  ).toEqual([5, 7, 9]);
  expect(
    structureTrace("Stack", [5, 9], { operation: "Pop" }).at(-1).values,
  ).toEqual([5]);
  expect(
    structureTrace("Queue", [5, 9], { operation: "Dequeue" }).at(-1).values,
  ).toEqual([9]);
  expect(
    structureTrace("Stack", [], { operation: "Pop" }).at(-1).values,
  ).toEqual([]);
});
it("tree, disconnected graph and hash collisions", () => {
  expect(buildTree([5, 2, 9, 7]).right.left.value).toBe(7);
  expect(
    structureTrace("Binary tree", [5, 2, 9], {
      operation: "Insert",
      value: 7,
    }).at(-1).values,
  ).toEqual([5, 2, 9, 7]);
  const g = structureTrace("Graph", [8, 1, 6, 3], {
    operation: "Breadth-first search",
    index: 0,
    edges: [
      [0, 2],
      [2, 1],
    ],
  });
  expect(g.at(-1).visited).toEqual([0, 2, 1]);
  const h = structureTrace("Hash table", [-1, 3], {
    operation: "Insert",
    value: 7,
    buckets: 4,
  });
  expect(h.at(-1).bucket).toBe(3);
  expect(h.at(-1).values).toEqual([-1, 3, 7]);
  expect(() => parseEdges("0-5", 4)).toThrow();
  expect(parseEdges("", 4)).toEqual([]);
});
it("JavaScript instrumentation preserves loops, functions and scopes", () => {
  let snapshots = [];
  const context = {
    __ss_capture: (line, readers) => {
      const vars = {};
      for (const [k, fn] of Object.entries(readers)) {
        try {
          const v = fn();
          if (typeof v !== "function") vars[k] = structuredClone(v);
        } catch {}
      }
      snapshots.push({ line, vars });
    },
    console: { log: () => {} },
  };
  const code =
    "let a = [3, 1, 2];\nfor (let i=0;i<3;i++) a[i] += 2;\nfunction sum(x) { let total=0; for (const n of x) { total+=n; } return total; }\nconst result=sum(a);\nconsole.log(result);";
  vm.runInNewContext(instrument(code), context);
  expect(snapshots.at(-1).vars.a).toEqual([5, 3, 4]);
  expect(snapshots.at(-1).vars.result).toBe(12);
  expect(snapshots.some((s) => s.vars.total === 12)).toBe(true);
  expect(snapshots.every((s) => s.line >= 1 && s.line <= 5)).toBe(true);
});
it("rejects asynchronous JavaScript rather than creating a false trace", () => {
  expect(() => instrument("setTimeout(()=>console.log(1),10)")).toThrow(
    /synchronous/,
  );
});

import { sourceFor } from "../src/algorithm-code.js";
import { metadata, generate } from "../src/engine.js";
it("displayed JavaScript implementations actually sort every supported algorithm", () => {
  for (const name of Object.keys(metadata)) {
    for (const input of [
      [3, 1, 2],
      [-2, 0, -2, 9],
      [0, 0, 0],
      generate(64, 819, "reverse"),
    ]) {
      const ctx = { a: [...input] };
      vm.runInNewContext(sourceFor(name), ctx);
      expect(ctx.a).toEqual([...input].sort((a, b) => a - b));
    }
  }
});
it("searches, deletions, insertions and empty structures preserve their invariants", () => {
  for (const kind of ["Array", "Linked list", "Hash table"]) {
    expect(
      structureTrace(kind, [7, -2, 7], {
        operation: "Search",
        value: 7,
        buckets: 4,
      }).at(-1).message,
    ).toMatch(/Found/);
    expect(
      structureTrace(kind, [7, -2, 7], {
        operation: "Search",
        value: 8,
        buckets: 4,
      }).at(-1).message,
    ).toMatch(/not/);
  }
  expect(
    structureTrace("Linked list", [4, 8, 12], {
      operation: "Remove",
      index: 1,
    }).at(-1).values,
  ).toEqual([4, 12]);
  expect(
    structureTrace("Hash table", [3, 7, 11], {
      operation: "Remove",
      value: 7,
      buckets: 4,
    }).at(-1).values,
  ).toEqual([3, 11]);
  expect(
    structureTrace("Queue", [2], { operation: "Enqueue", value: 3 }).at(-1)
      .values,
  ).toEqual([2, 3]);
  expect(
    structureTrace("Stack", [2], { operation: "Push", value: 3 }).at(-1).values,
  ).toEqual([2, 3]);
  expect(
    structureTrace("Binary tree", [4, 2, 9], {
      operation: "Insert",
      value: 4,
    }).at(-1).values,
  ).toEqual([4, 2, 9]);
  expect(
    structureTrace("Graph", [], { edges: [], index: 0 }).at(-1).visited,
  ).toEqual([]);
  expect(() =>
    structureTrace("Array", [1], { operation: "Remove", index: 4 }),
  ).toThrow();
});
