import { it, expect } from "vitest";
import {
  structureInfo,
  structureTrace,
  buildTree,
} from "../src/structure-engine.js";
import { valueDiagram, valueKind } from "../src/value-diagrams.js";
const run = (
  type,
  operation,
  initial = [8, 3, 12, 1, 6, 10, 14],
  options = {},
) =>
  structureTrace(type, initial, {
    operation,
    value: 8,
    index: 0,
    target: 1,
    edges: [
      [0, 1],
      [1, 2],
    ],
    ...options,
  });
it("every advertised operation generates snapshots without mutating input", () => {
  for (const [type, info] of Object.entries(structureInfo))
    for (const op of info.operations) {
      const input = [8, 3, 12, 1, 6, 10, 14];
      const steps = run(type, op, input);
      expect(steps.length, `${type} ${op}`).toBeGreaterThan(1);
      expect(input).toEqual([8, 3, 12, 1, 6, 10, 14]);
      expect(steps.every((e) => typeof e.message === "string")).toBe(true);
    }
});
it("tree traversals and deletion preserve topology and ordering", () => {
  expect(run("Binary tree", "Inorder").at(-1).order).toEqual([
    1, 3, 6, 8, 10, 12, 14,
  ]);
  expect(run("Binary tree", "Preorder").at(-1).order).toEqual([
    8, 3, 1, 6, 12, 10, 14,
  ]);
  expect(run("Binary tree", "Postorder").at(-1).order).toEqual([
    1, 6, 3, 10, 14, 12, 8,
  ]);
  expect(run("Binary tree", "Level order").at(-1).order).toEqual([
    8, 3, 12, 1, 6, 10, 14,
  ]);
  const after = run("Binary tree", "Remove").at(-1).values;
  expect(buildTree(after)).toMatchObject({
    value: 10,
    left: { value: 3 },
    right: { value: 12, left: null },
  });
  expect(run("Binary tree", "Inorder", after).at(-1).order).toEqual([
    1, 3, 6, 10, 12, 14,
  ]);
  expect(run("Binary tree", "Remove", [4], { value: 4 }).at(-1).values).toEqual(
    [],
  );
});
it("graph editing, DFS and queue inspection use the current data", () => {
  expect(run("Graph", "Depth-first search", [1, 2, 3]).at(-1).visited).toEqual([
    0, 1, 2,
  ]);
  expect(
    run("Graph", "Remove vertex", [1, 2, 3], { index: 1 }).at(-1),
  ).toMatchObject({ values: [1, 3], edges: [] });
  expect(
    run("Graph", "Add edge", [1, 2, 3], { index: 0, target: 2 }).at(-1).edges,
  ).toContainEqual([0, 2]);
  expect(run("Graph", "Remove edge", [1, 2, 3]).at(-1).edges).toEqual([[1, 2]]);
  expect(run("Queue", "Front", [9, 4]).at(-1).message).toContain("9");
  expect(run("Queue", "Rear", [9, 4]).at(-1).message).toContain("4");
  expect(run("Stack", "Peek", []).at(-1).message).toContain("empty");
  expect(
    run("Array", "Update", [9, 4], { index: 1, value: 7 }).at(-1).values,
  ).toEqual([9, 7]);
  expect(run("Linked list", "Reverse", [9, 4, 2]).at(-1).values).toEqual([
    2, 4, 9,
  ]);
});
it("code diagrams connect tree nodes and detect explicit structure hints", () => {
  const svg = valueDiagram(
    {
      data: 8,
      left: { data: 3, left: null, right: null },
      right: { data: 12 },
    },
    "tree",
  );
  expect((svg.match(/class="tree-edge /g) || []).length).toBe(2);
  expect(valueKind([1, 2], "stack")).toBe("stack");
  expect(valueKind([1, 2], "queue")).toBe("queue");
  expect(valueKind([1, 2], "values")).toBe("array");
  expect(valueKind({ A: ["B"], B: [] }, "graph")).toBe("graph");
  expect(valueDiagram({ A: ["B"], B: [] }, "graph")).toContain("graph-edge");
});
