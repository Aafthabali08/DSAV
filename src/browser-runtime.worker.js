// Runs Python (Pyodide) and JavaScript traces inside the visitor's browser,
// producing the same result shape as the Docker runner.
import { instrument } from "../server/instrument.js";
import pythonTracer from "../server/runtime/python_trace.py?raw";

const PYODIDE_URL = "https://cdn.jsdelivr.net/pyodide/v0.28.3/full/";
const LIMIT = 16000;
let pyodide = null;

async function loadPython() {
  if (pyodide) return pyodide;
  const { loadPyodide } = await import(
    /* @vite-ignore */ PYODIDE_URL + "pyodide.mjs"
  );
  pyodide = await loadPyodide({ indexURL: PYODIDE_URL });
  pyodide.FS.mkdirTree("/work");
  return pyodide;
}

async function runPython(code, stdin) {
  const py = await loadPython();
  py.FS.writeFile("/work/main.py", code);
  py.FS.writeFile("/work/stdin.txt", stdin);
  let printed = "";
  py.setStdout({ batched: (line) => (printed += line + "\n") });
  py.setStderr({ batched: () => {} });
  postMessage({ type: "started" });
  const started = performance.now();
  py.runPython(pythonTracer);
  const executionMs = performance.now() - started;
  const json = printed.trim().split("\n").at(-1);
  return { ...JSON.parse(json), executionMs };
}

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

// Approximates Node's console.log formatting for captured values.
const inspect = (v, d = 0) => {
  if (typeof v === "string") return d ? `'${v}'` : v;
  if (v === null || typeof v !== "object") return String(safe(v));
  if (d > 4) return Array.isArray(v) ? "[Array]" : "[Object]";
  if (Array.isArray(v))
    return v.length
      ? `[ ${v.map((x) => inspect(x, d + 1)).join(", ")} ]`
      : "[]";
  if (v instanceof Map)
    return `Map(${v.size}) { ${[...v].map(([k, x]) => `${inspect(k, d + 1)} => ${inspect(x, d + 1)}`).join(", ")} }`;
  if (v instanceof Set)
    return `Set(${v.size}) { ${[...v].map((x) => inspect(x, d + 1)).join(", ")} }`;
  const entries = Object.entries(v);
  return entries.length
    ? `{ ${entries.map(([k, x]) => `${k}: ${inspect(x, d + 1)}`).join(", ")} }`
    : "{}";
};

// Chrome: "at name (main.js:3:5)"; WebKit/Firefox: "name@main.js:3:5".
function frames(line) {
  return new Error().stack
    .split("\n")
    .filter((x) => x.includes("main.js:"))
    .slice(1)
    .map((x) => {
      const name = (x.match(/at (.*?) \(/) || x.match(/^\s*(.*?)@/))?.[1];
      const location = x.match(/main\.js:(\d+):/);
      return {
        name:
          !name || ["eval", "anonymous", "Function"].includes(name)
            ? "<module>"
            : name,
        line: location ? Number(location[1]) : line,
        generated: true,
        variables: {},
      };
    });
}

function runJavaScript(code, stdin) {
  let instrumented;
  try {
    instrumented = instrument(code);
  } catch (error) {
    return {
      events: [],
      stdout: "",
      error: error.name + ": " + error.message,
      phase: error instanceof SyntaxError ? "syntax" : "service",
      errorLine: error.loc?.line,
    };
  }
  const events = [];
  let output = "";
  const write = (...args) => {
    output += args.map((a) => inspect(a)).join(" ") + "\n";
    if (output.length > LIMIT) throw Error("Output limit reached.");
  };
  const capture = (line, readers) => {
    if (events.length >= 1500)
      throw Error("Trace limit reached (1500 events).");
    const variables = {};
    for (const [k, read] of Object.entries(readers)) {
      try {
        const v = read();
        if (typeof v !== "function") variables[k] = safe(v);
      } catch {}
    }
    events.push({
      line,
      event: "line",
      variables,
      frames: frames(line),
      stdout: output,
    });
  };
  const sandboxConsole = { log: write, error: write, warn: write, info: write };
  postMessage({ type: "started" });
  const started = performance.now();
  let error = null;
  try {
    new Function(
      "input",
      "__ss_capture",
      "console",
      instrumented + "\n//# sourceURL=main.js",
    )(stdin, capture, sandboxConsole);
  } catch (e) {
    error = e.name + ": " + e.message;
  }
  return {
    events,
    stdout: output.slice(0, LIMIT),
    error,
    phase: error ? "runtime" : null,
    traceKind: "instrumented statement trace",
    executionMs: performance.now() - started,
  };
}

self.onmessage = async ({ data }) => {
  try {
    const run = data.language === "python" ? runPython : runJavaScript;
    const { executionMs, ...result } = await run(data.code, data.stdin);
    postMessage({
      type: "result",
      result: {
        ...result,
        metrics: {
          compileMs: 0,
          executionMs: Math.round(executionMs * 100) / 100,
          scope: "Measured in this browser tab, including trace recording.",
        },
      },
    });
  } catch (e) {
    postMessage({
      type: "result",
      result: {
        events: [],
        stdout: "",
        error:
          data.language === "python" && !pyodide
            ? "Could not load the in-browser Python runtime. Check your connection and try again. " +
              e.message
            : e.message,
        phase: "service",
      },
    });
  }
};
