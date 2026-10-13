import { parse } from "acorn";
import { generate } from "astring";
export function instrument(source) {
  const tree = parse(source, {
    ecmaVersion: "latest",
    sourceType: "script",
    locations: true,
  });
  const names = new Set(),
    used = new Set();
  function binding(node) {
    if (!node) return;
    if (node.type === "Identifier") names.add(node.name);
    else if (node.type === "RestElement") binding(node.argument);
    else if (node.type === "AssignmentPattern") binding(node.left);
    else if (node.type === "ArrayPattern") node.elements.forEach(binding);
    else if (node.type === "ObjectPattern")
      node.properties.forEach((p) => binding(p.value || p.argument));
  }
  function collect(node) {
    if (!node || typeof node !== "object") return;
    if (node.type === "Identifier") used.add(node.name);
    if (node.type === "VariableDeclarator") binding(node.id);
    if (
      [
        "FunctionDeclaration",
        "FunctionExpression",
        "ArrowFunctionExpression",
      ].includes(node.type)
    )
      node.params.forEach(binding);
    if (node.type === "CatchClause") binding(node.param);
    for (const [key, v] of Object.entries(node)) {
      if (key === "loc") continue;
      if (Array.isArray(v)) v.forEach(collect);
      else if (v && typeof v === "object") collect(v);
    }
  }
  collect(tree);
  if (
    [...used].some((n) =>
      [
        "Promise",
        "setTimeout",
        "setInterval",
        "setImmediate",
        "queueMicrotask",
        "eval",
        "Function",
      ].includes(n),
    )
  )
    throw Error(
      "Statement replay supports synchronous JavaScript. Timers, promises and dynamically generated code are not supported.",
    );
  const readers = [...names]
    .slice(0, 100)
    .map((name) => `${JSON.stringify(name)}:()=>${name}`)
    .join(",");
  const capture = (line) =>
    parse(`__ss_capture(${line},{${readers}});`, { ecmaVersion: "latest" })
      .body[0];
  function transform(node) {
    if (!node || typeof node !== "object") return;
    for (const [key, v] of Object.entries(node)) {
      if (key === "loc") continue;
      if (Array.isArray(v)) {
        v.forEach(transform);
        if (
          (key === "body" &&
            (node.type === "Program" || node.type === "BlockStatement")) ||
          (key === "consequent" && node.type === "SwitchCase")
        ) {
          node[key] = v.flatMap((s) =>
            s.directive || s.type === "FunctionDeclaration"
              ? [s]
              : [capture(s.loc.start.line), s],
          );
        }
      } else if (v && typeof v === "object") transform(v);
    }
    if (
      [
        "ForStatement",
        "ForInStatement",
        "ForOfStatement",
        "WhileStatement",
        "DoWhileStatement",
      ].includes(node.type) &&
      node.body.type !== "BlockStatement"
    ) {
      node.body = {
        type: "BlockStatement",
        body: [capture(node.body.loc.start.line), node.body],
      };
    }
  }
  transform(tree);
  return generate(tree);
}
