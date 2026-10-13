// Fallback Code Lab runtime for static hosts: Python and JavaScript run in a
// dedicated worker so infinite loops can be stopped without freezing the page.
export const browserLanguages = ["python", "javascript"];
const TIMEOUT_MS = 12000;
let worker = null;

export function runInBrowser({ language, code, stdin }, onStatus = () => {}) {
  if (!browserLanguages.includes(language))
    return Promise.reject(Error("This language needs the local runtime."));
  worker ||= new Worker(
    new URL("./browser-runtime.worker.js", import.meta.url),
    { type: "module" },
  );
  const active = worker;
  return new Promise((resolve) => {
    let timer = null;
    const started = performance.now();
    const finish = (result) => {
      clearTimeout(timer);
      active.onmessage = active.onerror = null;
      resolve({
        ...result,
        durationMs: Math.round(performance.now() - started),
      });
    };
    active.onmessage = ({ data }) => {
      if (data.type === "started") {
        onStatus("running");
        timer = setTimeout(() => {
          active.terminate();
          if (worker === active) worker = null;
          finish({
            events: [],
            stdout: "",
            error:
              "Execution timed out after 12 seconds. Reduce input or check for an infinite loop.",
            phase: "runtime",
          });
        }, TIMEOUT_MS);
      } else if (data.type === "result") finish(data.result);
    };
    active.onerror = (e) => {
      e.preventDefault?.();
      active.terminate();
      if (worker === active) worker = null;
      finish({
        events: [],
        stdout: "",
        error: "The in-browser runtime failed to start. " + (e.message || ""),
        phase: "service",
      });
    };
    onStatus(language === "python" ? "loading" : "running");
    active.postMessage({ language, code, stdin });
  });
}
