const fs = require("fs"),
  util = require("util");
const events = [];
let output = "";
const originalWrite = process.stdout.write.bind(process.stdout);
global.input = fs.readFileSync("/work/stdin.txt", "utf8");
const safe = (v, d = 0) => {
  if (v === undefined) return "<undefined>";
  if (typeof v === "bigint") return String(v) + "n";
  if (typeof v === "function") return "<function>";
  if (v === null || typeof v !== "object") return v;
  if (d > 5) return "…";
  if (Array.isArray(v)) return v.slice(0, 64).map((x) => safe(x, d + 1));
  if (v instanceof Map)
    return {
      __sortscopeType: "Map",
      entries: [...v.entries()]
        .slice(0, 32)
        .map(([k, val]) => [safe(k, d + 1), safe(val, d + 1)]),
    };
  if (v instanceof Set)
    return {
      __sortscopeType: "Set",
      items: [...v].slice(0, 64).map((x) => safe(x, d + 1)),
    };
  const obj = {};
  for (const k of Object.keys(v).slice(0, 32)) {
    try {
      obj[k] = safe(v[k], d + 1);
    } catch {
      obj[k] = "<unavailable>";
    }
  }
  return obj;
};
global.__ss_capture = (line, readers) => {
  if (events.length >= 1500) throw Error("Trace limit reached (1500 events).");
  const variables = {};
  for (const [k, read] of Object.entries(readers)) {
    try {
      const v = read();
      if (typeof v !== "function") variables[k] = safe(v);
    } catch {}
  }
  const stack = new Error().stack
    .split("\n")
    .slice(2)
    .filter((x) => x.includes("/work/main.cjs"))
    .map((x) => {
      const match = x.match(/at (.*?) \(/);
      const location = x.match(/main\.cjs:(\d+):/);
      return {
        name: match ? match[1] : "<module>",
        line: location ? Number(location[1]) : line,
        generated: true,
        variables: {},
      };
    });
  events.push({
    line,
    event: "line",
    variables,
    frames: stack,
    stdout: output,
  });
};
process.stdout.write = (chunk) => {
  output += String(chunk);
  if (output.length > 16000) throw Error("Output limit reached.");
  return true;
};
console.log = (...args) => {
  output += util.format(...args) + "\n";
  if (output.length > 16000) throw Error("Output limit reached.");
};
console.error = console.log;
console.warn = console.log;
let error = null;
try {
  require("/work/main.cjs");
} catch (e) {
  error = e.name + ": " + e.message;
}
originalWrite(
  JSON.stringify({
    events,
    stdout: output.slice(0, 16000),
    error,
    traceKind: "instrumented statement trace",
  }),
);
