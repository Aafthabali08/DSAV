import { describe, it, expect } from "vitest";
import { valueKind, valueDiagram } from "../src/value-diagrams.js";
describe("captured value diagrams", () => {
  it("distinguishes fields from sequence interpretations", () => {
    expect(valueKind([3, 1])).toBe("array");
    expect(() =>
      valueDiagram({ __sortscopeType: "Map", entries: [1, 2] }),
    ).not.toThrow();
    expect(valueDiagram([3, 1])).toBe("");
    const stack = valueDiagram([3, 1], "stack");
    expect(stack.indexOf("<b>1</b>")).toBeLessThan(stack.indexOf("<b>3</b>"));
    expect(valueDiagram([3, 1], "queue")).toContain("FRONT");
  });
  it("renders actual map, set, tree and linked values safely", () => {
    expect(
      valueDiagram({ __sortscopeType: "Map", entries: [["x", 4]] }),
    ).toContain("<b>4</b>");
    expect(valueKind({ __sortscopeType: "Set", items: [1] })).toBe("set");
    expect(
      valueDiagram({ value: 8, left: { value: 2 }, right: null }),
    ).toContain(">2</text>");
    expect(
      valueDiagram({ value: 1, next: { value: 2, next: null } }),
    ).toContain("null");
    expect(valueDiagram({ "<script>": "<img>" })).not.toContain("<script>");
    expect(valueDiagram({ "<script>": "<img>" })).toContain("&lt;img&gt;");
  });
  it("bounds recursive views and preserves zero values", () => {
    const node = { value: 0 };
    node.left = node;
    expect(valueDiagram(node).length).toBeLessThan(5000);
    expect(valueDiagram({ value: 0, next: null })).toContain(">0</span>");
  });
});
