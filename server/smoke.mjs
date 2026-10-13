import assert from "node:assert/strict";
import { examples } from "../src/code-lab.js";
const base = "http://127.0.0.1:7002";
const health = await (await fetch(base + "/api/runtime")).json();
assert.equal(health.ready, true);
async function run(language, code, stdin = "9 2 -1 5") {
  const response = await fetch(base + "/api/execute", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-SortScope-Token": health.token,
    },
    body: JSON.stringify({ language, code, stdin }),
  });
  return response.json();
}
for (const language of ["python", "javascript", "c", "cpp", "java"]) {
  const result = await run(language, examples[language]);
  console.log(
    language,
    JSON.stringify({
      events: result.events?.length,
      output: result.stdout,
      error: result.error,
    }),
  );
  assert.equal(result.error, null, language + " runtime error");
  assert.ok(result.events.length > 3);
  assert.ok(result.metrics.executionMs > 0);
  assert.ok(result.metrics.peakMemoryKiB > 0);
  assert.ok(result.metrics.cpuMs >= 0);
  assert.ok(result.stdout.includes("-1"));
  assert.ok(
    result.events.some(
      (s) =>
        Array.isArray(s.variables?.values) &&
        s.variables.values.slice(0, 4).map(Number).join(",") === "-1,2,5,9",
    ),
    language + " sorted array snapshot",
  );
}
const custom = await run(
  "python",
  "def double(n):\n    result = n * 2\n    return result\nx = double(int(input()))\nprint(x)",
  "21",
);
assert.equal(custom.stdout.trim(), "42");
assert.ok(custom.events.some((e) => e.frames.length === 2));
const invalid = await run("c", "this is not valid C", "");
assert.equal(invalid.phase, "compile");
assert.ok(invalid.error.length > 0);
const exception = await run("python", "x=1\ny=0\nprint(x/y)", "");
assert.match(exception.error, /ZeroDivisionError/);
const loop = await run("python", "while True:\n    pass", "");
assert.match(loop.error, /Trace limit/);
const isolate = await run(
  "python",
  'import os, socket\nprint(os.path.exists("/Users/shaikaafthabali"))\ns=socket.socket()\ns.settimeout(0.2)\ntry:\n    s.connect(("1.1.1.1",80))\nexcept OSError:\n    print("network blocked")',
  "",
);
assert.match(isolate.stdout, /False\nnetwork blocked/);
console.log(
  "All five languages, custom recursion frames, compiler errors, runtime errors, trace limits, and isolation checks passed.",
);

const structured = await run(
  "python",
  "from collections import deque\nclass Node:\n    def __init__(self, value):\n        self.value = value\n        self.left = None\n        self.right = None\nvalues = list(map(int, input().split()))\nroot = Node(values[0])\nroot.left = Node(values[1])\nqueue = deque(values)\nprint(root.left.value)",
  "8 3",
);
assert.equal(structured.error, null);
assert.ok(structured.events.some((e) => e.variables.root?.left?.value === 3));
assert.ok(
  structured.events.some((e) => e.variables.queue?.__sortscopeType === "Queue"),
);
console.log("Python class nodes and deque snapshots passed.");
