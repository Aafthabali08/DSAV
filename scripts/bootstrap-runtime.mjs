import { execFile, spawn } from "node:child_process";
import { promisify } from "node:util";
const exec = promisify(execFile);
export async function bootstrapRuntime() {
  async function alive() {
    try {
      await exec("docker", ["info", "--format", "{{.ServerVersion}}"], {
        timeout: 3000,
      });
      return true;
    } catch {
      return false;
    }
  }
  if (!(await alive())) {
    if (process.platform === "darwin") {
      console.log("Starting Docker Desktop for Code Lab…");
      await exec("open", ["-a", "Docker"]);
    }
    for (let i = 0; i < 30 && !(await alive()); i++)
      await new Promise((resolve) => setTimeout(resolve, 2000));
    if (!(await alive()))
      throw Error(
        "Docker is not available. Start Docker Desktop and restart npm run dev.",
      );
  }
  console.log("Preparing the compiler image (cached after the first build)…");
  await new Promise((resolve, reject) => {
    const child = spawn(
      "docker",
      [
        "build",
        "-t",
        "sortscope-runner:local",
        "-f",
        "server/Dockerfile",
        "server",
      ],
      { stdio: "inherit" },
    );
    child.on("error", reject);
    child.on("exit", (code) =>
      code === 0
        ? resolve()
        : reject(
            Error("Compiler image build failed. See Docker output above."),
          ),
    );
  });
  console.log("Code Lab compiler is ready.");
}
