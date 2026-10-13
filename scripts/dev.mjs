import { bootstrapRuntime } from "./bootstrap-runtime.mjs";
import { spawn } from "node:child_process";
const children = [];
let closing = false;
function start(file, args = []) {
  const child = spawn(process.execPath, [file, ...args], { stdio: "inherit" });
  children.push(child);
  child.on("exit", (code) => {
    if (!closing) {
      closing = true;
      for (const other of children) if (other !== child) other.kill("SIGTERM");
      process.exitCode = code || 0;
    }
  });
}
start("server/index.js");
start("node_modules/vite/bin/vite.js", [
  "--host",
  "127.0.0.1",
  "--port",
  "7000",
  "--strictPort",
]);
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => {
    closing = true;
    children.forEach((c) => c.kill(signal));
  });

bootstrapRuntime().catch((error) =>
  console.error("Code Lab setup:", error.message),
);
