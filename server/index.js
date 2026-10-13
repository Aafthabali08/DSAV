import { readFile, realpath } from "node:fs/promises";
import path from "node:path";
import http from "node:http";
import { spawn, execFile } from "node:child_process";
import { randomUUID, randomBytes } from "node:crypto";
import { promisify } from "node:util";
import { instrument } from "./instrument.js";
const exec = promisify(execFile);
const token = randomBytes(32).toString("hex");
const port = Number(process.env.RUNNER_PORT || 7002),
  image = process.env.RUNNER_IMAGE || "sortscope-runner:local";
let running = false;
const languages = ["c", "cpp", "python", "java", "javascript"];
async function health() {
  try {
    await exec("docker", ["image", "inspect", image], {
      timeout: 5000,
      maxBuffer: 1000 * 1000,
    });
    return { ready: true, languages };
  } catch {
    return {
      ready: false,
      languages,
      error: "Start Docker Desktop, then run npm run runner:build.",
    };
  }
}
function execute(payload) {
  return new Promise((resolve, reject) => {
    const name = "sortscope-" + randomUUID();
    const args = [
      "run",
      "--rm",
      "-i",
      "--name",
      name,
      "--network",
      "none",
      "--read-only",
      "--cap-drop",
      "ALL",
      "--security-opt",
      "no-new-privileges",
      "--memory",
      "512m",
      "--memory-swap",
      "512m",
      "--cpus",
      "1",
      "--pids-limit",
      "64",
      "--ulimit",
      "fsize=16777216:16777216",
      "--tmpfs",
      "/work:rw,exec,nosuid,size=64m,mode=1777",
      "--tmpfs",
      "/tmp:rw,noexec,nosuid,size=32m,mode=1777",
    ];
    // GDB only traces child processes inside this isolated container.
    if (payload.language === "c" || payload.language === "cpp")
      args.push("--cap-add", "SYS_PTRACE");
    args.push(image);
    const child = spawn("docker", args, { stdio: ["pipe", "pipe", "pipe"] });
    let stdout = "",
      stderr = "",
      ended = false;
    const cleanup = () => {
      execFile("docker", ["rm", "-f", name], () => {});
    };
    const timer = setTimeout(() => {
      cleanup();
      child.kill();
    }, 25000);
    child.stdout.on("data", (b) => {
      stdout += b;
      if (stdout.length > 12 * 1024 * 1024) {
        cleanup();
        child.kill();
      }
    });
    child.stderr.on("data", (b) => (stderr = (stderr + b).slice(-16000)));
    child.on("error", (e) => {
      clearTimeout(timer);
      if (!ended) {
        ended = true;
        reject(e);
      }
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (ended) return;
      ended = true;
      if (code !== 0)
        return reject(
          Error(stderr || "Execution stopped: time or output limit exceeded."),
        );
      try {
        resolve(JSON.parse(stdout));
      } catch {
        reject(Error("Runner returned invalid output. " + stderr));
      }
    });
    child.stdin.on("error", () => {});
    child.stdin.end(JSON.stringify(payload));
  });
}
function send(res, status, data) {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  });
  res.end(JSON.stringify(data));
}
const server = http.createServer(async (req, res) => {
  const origin = req.headers.origin;
  if (origin && !/^http:\/\/(127\.0\.0\.1|localhost):(7000|7001)$/.test(origin))
    return send(res, 403, { error: "Origin not allowed." });
  if (req.method === "GET" && req.url === "/api/runtime")
    return send(res, 200, { ...(await health()), token });
  if (
    req.method === "GET" &&
    process.env.SERVE_DIST === "1" &&
    !req.url.startsWith("/api/")
  ) {
    try {
      const root = await realpath("dist");
      const pathname = decodeURIComponent(
        new URL(req.url, "http://localhost").pathname,
      );
      const file = await realpath(
        path.join(root, pathname === "/" ? "index.html" : pathname),
      );
      if (!file.startsWith(root + path.sep))
        return send(res, 403, { error: "Forbidden" });
      const mime =
        {
          ".html": "text/html; charset=utf-8",
          ".js": "text/javascript; charset=utf-8",
          ".css": "text/css; charset=utf-8",
          ".svg": "image/svg+xml",
          ".png": "image/png",
        }[path.extname(file)] || "application/octet-stream";
      const content = await readFile(file);
      res.writeHead(200, {
        "Content-Type": mime,
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": pathname.startsWith("/assets/")
          ? "public, max-age=31536000, immutable"
          : "no-cache",
      });
      res.end(content);
      return;
    } catch {
      return send(res, 404, {
        error: "File not found. Build with npm run build first.",
      });
    }
  }
  if (req.method !== "POST" || req.url !== "/api/execute")
    return send(res, 404, { error: "Not found." });
  if (req.headers["x-sortscope-token"] !== token)
    return send(res, 403, {
      error: "Refresh the runtime connection before running.",
    });
  if (!req.headers["content-type"]?.startsWith("application/json"))
    return send(res, 415, { error: "Use JSON." });
  if (running)
    return send(res, 429, {
      error: "A program is already running. Try again in a moment.",
    });
  let body = "",
    acquired = false;
  try {
    for await (const chunk of req) {
      body += chunk;
      if (body.length > 100000)
        return send(res, 413, {
          error: "Source and input must fit within 100 KB.",
        });
    }
    const payload = JSON.parse(body);
    if (
      !languages.includes(payload.language) ||
      typeof payload.code !== "string" ||
      !payload.code.trim() ||
      payload.code.length > 50000 ||
      typeof payload.stdin !== "string" ||
      payload.stdin.length > 16000
    )
      return send(res, 400, {
        error:
          "Choose a supported language, enter code (max 50 KB) and input (max 16 KB).",
      });
    if (payload.language === "javascript") {
      try {
        payload.code = instrument(payload.code);
      } catch (error) {
        return send(res, 400, {
          error: error.name + ": " + error.message,
          phase: error instanceof SyntaxError ? "syntax" : "service",
          errorLine: error.loc?.line,
          events: [],
        });
      }
    }
    if (running)
      return send(res, 429, {
        error: "A program is already running. Try again in a moment.",
      });
    running = true;
    acquired = true;
    const start = performance.now();
    const result = await execute(payload);
    send(res, 200, {
      ...result,
      durationMs: Math.round(performance.now() - start),
      language: payload.language,
    });
  } catch (e) {
    send(res, 400, { error: e.message, events: [] });
  } finally {
    if (acquired) running = false;
  }
});
server.listen(port, "127.0.0.1", () =>
  console.log(`SortScope isolated runner: http://127.0.0.1:${port}`),
);
