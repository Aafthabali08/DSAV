import { diagnostic } from "./diagnostics.js";
import { valueDiagram, valueKind } from "./value-diagrams.js";
import { generate } from "./engine.js";
export const examples = {
  python: `# Enter your values in Program input below.
values = list(map(int, input().split()))
for end in range(len(values) - 1, 0, -1):
    swapped = False
    for j in range(end):
        if values[j] > values[j + 1]:
            values[j], values[j + 1] = values[j + 1], values[j]
            swapped = True
    if not swapped:
        break
print(values)
`,
  c: `#include <stdio.h>
int main(void) {
    int values[64] = {0};
    int n = 0;
    while (n < 64 && scanf("%d", &values[n]) == 1) {
        n++;
    }
    for (int end = n - 1; end > 0; end--) {
        for (int j = 0; j < end; j++) {
            if (values[j] > values[j + 1]) {
                int temp = values[j];
                values[j] = values[j + 1];
                values[j + 1] = temp;
            }
        }
    }
    for (int i = 0; i < n; i++) {
        printf("%d ", values[i]);
    }
    printf("\\n");
    return 0;
}
`,
  cpp: `#include <iostream>
#include <vector>
int main() {
    std::vector<int> values;
    int value;
    while (std::cin >> value) {
        values.push_back(value);
    }
    for (int end = static_cast<int>(values.size()) - 1; end > 0; end--) {
        for (int j = 0; j < end; j++) {
            if (values[j] > values[j + 1]) {
                int temp = values[j];
                values[j] = values[j + 1];
                values[j + 1] = temp;
            }
        }
    }
    for (int item : values) {
        std::cout << item << " ";
    }
    return 0;
}
`,
  java: `import java.util.Scanner;
public class Main {
    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        String[] tokens = scanner.nextLine().trim().split("\\\\s+");
        int[] values = new int[tokens.length];
        for (int i = 0; i < tokens.length; i++) {
            values[i] = Integer.parseInt(tokens[i]);
        }
        for (int end = values.length - 1; end > 0; end--) {
            for (int j = 0; j < end; j++) {
                if (values[j] > values[j + 1]) {
                    int temp = values[j];
                    values[j] = values[j + 1];
                    values[j + 1] = temp;
                }
            }
        }
        System.out.println(java.util.Arrays.toString(values));
    }
}
`,
  javascript: `// Program input is available as the string "input".
const values = input.trim().split(/\\s+/).map(Number);
for (let end = values.length - 1; end > 0; end--) {
    let swapped = false;
    for (let j = 0; j < end; j++) {
        if (values[j] > values[j + 1]) {
            const temp = values[j];
            values[j] = values[j + 1];
            values[j + 1] = temp;
            swapped = true;
        }
    }
    if (!swapped) break;
}
console.log(values);
`,
};
export const escapeHtml = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const labels = {
  python: "Python 3",
  c: "C · C17",
  cpp: "C++ · C++17",
  java: "Java 17",
  javascript: "JavaScript",
};
import { browserLanguages, runInBrowser } from "./browser-runtime.js";
export const isLocalHost = (hostname = location.hostname) =>
  /^(localhost|127\.0\.0\.1|\[::1\]|::1)$/.test(hostname) ||
  hostname.endsWith(".localhost");
export function mountCodeLab(root) {
  let language = "python",
    events = [],
    position = 0,
    result = null,
    submitted = "",
    playing = false,
    timer = null,
    ready = false,
    token = "",
    drafts = { ...examples },
    running = false,
    view = "cells",
    diagramViews = {},
    focusedVariable = "",
    requestId = 0,
    reconnectTimer = null,
    browserMode = false,
    connectionError = "";
  const q = (s) => root.querySelector(s);
  root.innerHTML = `<div class="lab-heading"><div><p class="eyebrow">03 / YOUR CODE. MADE VISIBLE.</p><h2>See what your code is thinking.</h2><p>Write it. Run it. Follow the values as your program unfolds.</p></div><button class="runtime-badge" id="runtime-check"><i></i><span>Connecting to runtime…</span> ↻</button></div><div class="lab-grid"><section class="editor-card"><div class="editor-top"><label for="code-language">Language <select id="code-language">${Object.entries(
    labels,
  )
    .map(([k, v]) => `<option value="${k}">${v}</option>`)
    .join(
      "",
    )}</select></label><button id="load-example" class="text-button">Load sorting example ↗</button></div><div class="file-tab"><span id="filename">main.py</span><span>EDITABLE SOURCE</span></div><div class="source-editor"><pre id="line-numbers" aria-hidden="true"></pre><textarea id="source-code" aria-label="Custom source code. Escape moves to Run. Control or Command Enter runs code." spellcheck="false" autocapitalize="off" autocomplete="off" wrap="off"></textarea></div><div class="stdin-head"><label for="program-input">PROGRAM INPUT <span>stdin</span></label><button id="random-input">⤨ Random values</button></div><textarea id="program-input" aria-label="Program input" rows="2" spellcheck="false"></textarea><div class="run-row"><span id="code-note">Automatic line tracing · no annotations needed</span><button id="run-code" class="dark">▶ Run & visualize</button></div></section><section class="execution-card"><div class="execution-top"><div><p class="eyebrow">LIVE EXECUTION STORY</p><h3 id="execution-title">A front-row seat to your logic.</h3></div><span id="run-state" class="pill">Not run yet</span></div><div id="diagnostic-summary" class="diagnostic-summary" role="alert" hidden></div><div id="execution-content"></div></section></div><div id="code-output" class="output-card"><div><p class="eyebrow">PROGRAM OUTPUT</p><span id="run-meta">Output and compiler messages appear here.</span></div><pre id="output-text">Run your code to see its output.</pre><pre id="compiler-error" role="alert" hidden></pre></div><section id="run-insights" class="run-insights" aria-label="Execution measurements"></section><div class="lab-guide"><div><b>01</b><span><strong>Make it yours</strong>Edit the code and input. These are real language runtimes.</span></div><div><b>02</b><span><strong>Look inside</strong>Inspect arrays, variables, source lines, and the call stack.</span></div><div><b>03</b><span><strong>Replay the story</strong>Scrub, pause, or move one execution event at a time.</span></div></div>`;
  const stop = () => {
    playing = false;
    clearTimeout(timer);
  };
  const syncEditor = () => {
    const text = q("#source-code").value;
    q("#line-numbers").textContent = text
      .split("\n")
      .map((_, i) => i + 1)
      .join("\n");
    drafts[language] = text;
  };
  function invalidate() {
    requestId++;
    stop();
    events = [];
    result = null;
    position = 0;
    submitted = "";
    draw();
    showMeasurements();
    q("#output-text").textContent =
      "Code or input changed. Run again to generate a fresh trace.";
    q("#compiler-error").hidden = true;
    q("#diagnostic-summary").hidden = true;
  }
  function setLanguage() {
    stop();
    language = q("#code-language").value;
    q("#source-code").value = drafts[language];
    q("#filename").textContent = {
      python: "main.py",
      c: "main.c",
      cpp: "main.cpp",
      java: "Main.java",
      javascript: "main.js",
    }[language];
    q("#code-note").textContent =
      browserMode && !browserLanguages.includes(language)
        ? "Needs the local runtime · Python and JS run here"
        : language === "java"
          ? "Use public class Main · JVM line tracing"
          : language === "c" || language === "cpp"
            ? "Debugger snapshots · calls are stepped over"
            : language === "javascript"
              ? "Statement tracing · stdin is the string input"
              : "Automatic line tracing · no annotations needed";
    syncEditor();
    invalidate();
  }
  async function connect() {
    clearTimeout(reconnectTimer);
    if (browserMode) return;
    q("#runtime-check span").textContent = "Connecting…";
    // Static hosts (e.g. Vercel) have no compiler API: run Python and
    // JavaScript in the browser instead and stop retrying.
    let hostedWithoutRuntime = false;
    try {
      const response = await fetch("/api/runtime", {
        signal: AbortSignal.timeout(7000),
      });
      if (response.status === 404 && !isLocalHost()) {
        hostedWithoutRuntime = true;
        throw Error("No compiler service on this host.");
      }
      if (!response.ok) throw Error("The compiler service is restarting.");
      const health = await response.json();
      ready = health.ready;
      token = health.token;
      connectionError = health.error || "";
    } catch {
      ready = hostedWithoutRuntime;
      connectionError = hostedWithoutRuntime
        ? ""
        : "The local compiler service is offline. Start the app with npm run dev; it launches the frontend and compiler together.";
    }
    browserMode = hostedWithoutRuntime;
    if (browserMode && !browserLanguages.includes(language))
      q("#code-note").textContent =
        "Needs the local runtime · Python and JS run here";
    q("#runtime-check span").textContent = browserMode
      ? "Browser runtime · Python & JS"
      : ready
        ? "Runtime connected"
        : "Reconnecting automatically…";
    q("#runtime-check").classList.toggle("connected", ready);
    q("#runtime-check").title = browserMode
      ? "Python and JavaScript run in this browser. C, C++ and Java need the local Docker runtime (npm run dev)."
      : connectionError || "All five language runtimes are available";
    q("#run-code").disabled = running;
    if (!ready && !hostedWithoutRuntime && !root.hidden)
      reconnectTimer = setTimeout(connect, 3000);
  }
  function showMeasurements() {
    const m = result?.metrics || {};
    const metric = (label, value, detail) =>
      `<div><small>${label}</small><strong>${value}</strong><span>${detail}</span></div>`;
    q("#run-insights").innerHTML =
      `<div class="run-metric-grid">${metric("EXECUTION WALL TIME", Number.isFinite(m.executionMs) ? m.executionMs.toFixed(2) + " ms" : "—", "Includes trace recording")}${metric("PEAK RESIDENT MEMORY", Number.isFinite(m.peakMemoryKiB) ? (m.peakMemoryKiB / 1024).toFixed(2) + " MiB" : "—", "Largest process RSS; includes tracing")}${metric("CPU TIME", Number.isFinite(m.cpuMs) ? m.cpuMs.toFixed(2) + " ms" : "—", "User + system CPU")}${metric("COMPILATION", Number.isFinite(m.compileMs) ? m.compileMs.toFixed(2) + " ms" : "—", "Separate from execution")}</div><p class="measurement-note">${result ? "Measured on this run; interpreter, debugger and trace storage are included. These measurements are not Big-O complexity." : "Run a program to measure its time and memory. No estimates are shown as measurements."}</p><div class="complexity-explainer"><b>Time & space complexity</b><span>${result && submitted === examples[language] ? "Sorting example: worst-case time O(n²), auxiliary sorting space O(1). Input storage and runtime overhead are separate." : "For custom code, Big-O requires reasoning about how work and storage grow with input size. One measured run cannot determine it."}</span></div>`;
  }
  function showError(message, details = {}) {
    const error = diagnostic({ ...details, error: message });
    const summary = q("#diagnostic-summary");
    summary.hidden = false;
    summary.innerHTML = `<strong>${escapeHtml(error.title)}</strong><p>${details.events?.length ? "Execution stopped. You can replay the steps recorded before the error." : "Fix the error below, then run again. No successful execution trace was generated."}</p><pre>${escapeHtml(error.message)}</pre>${error.line ? `<button class="outline" id="error-line">Go to line ${error.line} ↗</button>` : ""}`;
    if (error.line)
      q("#error-line").onclick = () => {
        const editor = q("#source-code"),
          lines = editor.value.split("\n");
        const line = Math.min(lines.length, Math.max(1, error.line));
        const start = lines
          .slice(0, line - 1)
          .reduce((n, text) => n + text.length + 1, 0);
        editor.focus();
        editor.setSelectionRange(start, start + lines[line - 1].length);
        editor.scrollTop =
          (line - 1) * parseFloat(getComputedStyle(editor).lineHeight);
      };
    q("#compiler-error").hidden = false;
    q("#compiler-error").textContent = message;
    q("#run-state").textContent = "Needs attention";
  }
  async function run() {
    if (running) return;
    stop();
    running = true;
    q("#run-code").disabled = true;
    await connect();
    if (!ready) {
      running = false;
      q("#run-code").disabled = false;
      showError(connectionError);
      return;
    }
    if (browserMode && !browserLanguages.includes(language)) {
      running = false;
      q("#run-code").disabled = false;
      showError(
        `${labels[language]} needs a native compiler and debugger (GCC/GDB or the JVM), which cannot run in a browser. Switch to Python or JavaScript to run code here, or run SortScope locally with npm run dev for all five languages.`,
        { phase: "service" },
      );
      return;
    }
    const id = ++requestId;
    running = true;
    q("#run-code").disabled = true;
    q("#run-code").textContent = "◌ Running…";
    q("#run-state").textContent = "Executing";
    q("#compiler-error").hidden = true;
    q("#diagnostic-summary").hidden = true;
    result = null;
    showMeasurements();
    q("#output-text").textContent = "Executing your program…";
    submitted = q("#source-code").value;
    events = [];
    position = 0;
    draw();
    try {
      const payload = {
        language,
        code: submitted,
        stdin: q("#program-input").value,
      };
      const response = browserMode
        ? { ok: true }
        : await fetch("/api/execute", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-SortScope-Token": token,
            },
            body: JSON.stringify(payload),
          });
      const data = browserMode
        ? await runInBrowser(payload, (status) => {
            if (id === requestId && status === "loading")
              q("#output-text").textContent =
                "Loading the in-browser Python runtime (first run downloads about 10 MB)…";
            else if (id === requestId)
              q("#output-text").textContent = "Executing your program…";
          })
        : await response.json();
      if (id !== requestId) return;
      result = data;
      events = Array.isArray(data.events) ? data.events : [];
      if (events.length) {
        const last = events.at(-1);
        events.push({
          ...last,
          event: data.error ? "stopped" : "complete",
          stdout: data.stdout || last.stdout,
        });
      }
      position = 0;
      q("#output-text").textContent = data.stdout || "(No output)";
      q("#run-meta").textContent =
        `${labels[language]} · ${events.length} events${data.durationMs ? ` · ${(data.durationMs / 1000).toFixed(2)}s ${browserMode ? "in this browser" : "including compiler/debugger"}` : ""}`;
      showMeasurements();
      if (data.error)
        showError(data.error, {
          ...data,
          phase: data.phase || (!response.ok ? "service" : "runtime"),
        });
      draw();
    } catch (e) {
      if (id === requestId) {
        result = { error: e.message };
        showError("Could not reach the execution service. " + e.message);
      }
    } finally {
      running = false;
      q("#run-code").disabled = false;
      q("#run-code").textContent = "▶ Run & visualize";
      draw();
    }
  }
  function numeric(v) {
    return (
      typeof v === "number" ||
      (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v)))
    );
  }
  function renderValue(name, value, previous) {
    const changed = JSON.stringify(value) !== JSON.stringify(previous);
    const title = `<div class="memory-name"><b>${escapeHtml(name)}</b><span>${Array.isArray(value) ? `array · ${value.length} items` : value === null ? "null" : typeof value}${changed ? " · changed" : ""}</span></div>`;
    const kind = valueKind(value, name);
    const choices = Array.isArray(value)
      ? ["auto", "array", "stack", "queue", "graph"]
      : value && typeof value === "object"
        ? ["auto", "map", "tree", "linked list", "graph"]
        : ["auto"];
    const selection =
      choices.length > 1
        ? `<label class="diagram-selector">Interpret as <select data-diagram="${escapeHtml(name)}" aria-label="Diagram for ${escapeHtml(name)}">${choices.map((choice) => `<option value="${choice}" ${diagramViews[name] === choice ? "selected" : ""}>${choice === "auto" ? "Automatic" : choice}</option>`).join("")}</select></label>`
        : "";
    const diagram = valueDiagram(
      value,
      !diagramViews[name] || diagramViews[name] === "auto"
        ? kind
        : diagramViews[name],
      previous,
    );
    if (diagram)
      return `<div class="memory-block ${changed ? "changed" : ""}">${title}${selection}<p class="footnote">${diagramViews[name] && diagramViews[name] !== "auto" ? "Your interpretation · values follow the actual trace." : `${kind} view · inferred from captured fields or variable name; use Interpret as to correct it. Snapshots are bounded.`}</p>${diagram}<details class="step-output"><summary>Captured fields</summary><pre>${escapeHtml(JSON.stringify(value, null, 2))}</pre></details></div>`;
    if (Array.isArray(value)) {
      const limit = value.slice(0, 64);
      if (view === "bars" && limit.length && limit.every(numeric)) {
        const max = Math.max(1, ...limit.map((v) => Math.abs(Number(v))));
        return `<div class="memory-block ${changed ? "changed" : ""}">${title}${selection}<div class="runtime-bars">${limit.map((v, i) => `<div class="runtime-bar-wrap"><span>${escapeHtml(v)}</span><div class="runtime-bar ${Number(v) < 0 ? "negative" : ""}" style="height:${Math.max(2, (Math.abs(Number(v)) / max) * 95)}px"></div><small>${i}</small></div>`).join("")}</div></div>`;
      }
      return `<div class="memory-block ${changed ? "changed" : ""}">${title}${selection}<div class="memory-cells">${limit.map((v, i) => `<div class="memory-cell ${JSON.stringify(v) !== JSON.stringify(previous?.[i]) ? "cell-changed" : ""}"><span>${escapeHtml(typeof v === "object" ? JSON.stringify(v) : v)}</span><small>${i}</small></div>`).join("") || '<span class="muted">Empty array</span>'}</div></div>`;
    }
    if (value && typeof value === "object") {
      return `<div class="memory-block ${changed ? "changed" : ""}">${title}<div class="object-fields">${Object.entries(
        value,
      )
        .map(
          ([k, v]) =>
            `<div><span>${escapeHtml(k)}</span><b>${escapeHtml(typeof v === "object" ? JSON.stringify(v) : v)}</b></div>`,
        )
        .join("")}</div></div>`;
    }
    return `<div class="scalar ${changed ? "changed" : ""}"><span>${escapeHtml(name)}</span><strong>${escapeHtml(value)}</strong></div>`;
  }
  function draw() {
    const container = q("#execution-content");
    const previousPlayback = container.querySelector(".code-playback");
    const memoryScroll =
      container.querySelector(".memory-view")?.scrollTop || 0;
    if (!events.length) {
      q("#execution-title").textContent = running
        ? "Recording your execution…"
        : "A front-row seat to your logic.";
      q("#run-state").textContent = running
        ? "Executing"
        : result?.error
          ? "Needs attention"
          : "Not run yet";
      container.innerHTML = `<div class="execution-empty"><div class="empty-diagram"><span>code</span><b>→</b><span>{ }</span><b>→</b><span>aha!</span></div><h3>${running ? "Following your program…" : "Your code has a story to tell."}</h3><p>${running ? "Compiling and recording real execution states." : "Press Run & visualize to turn your code into an interactive sequence of states."}</p><div class="empty-features"><span>↳ Source lines</span><span>▦ Memory diagrams</span><span>↺ Reversible playback</span></div></div>`;
      return;
    }
    const event = events[position],
      prev = events[Math.max(0, position - 1)],
      variables = event.variables || {},
      names = Object.keys(variables),
      changes = names.filter(
        (n) =>
          JSON.stringify(variables[n]) !== JSON.stringify(prev.variables?.[n]),
      );
    q("#run-state").textContent = playing
      ? "Playing"
      : position === events.length - 1
        ? event.event === "complete"
          ? "Complete"
          : "Stopped"
        : "Paused";
    q("#execution-title").textContent =
      `${event.event === "complete" ? "Program complete" : `Line ${event.line}`} · event ${position + 1} of ${events.length}`;
    const lines = submitted.split("\n"),
      line = event.line || 1;
    const excerpt = lines
      .slice(Math.max(0, line - 2), line + 1)
      .map((text, i) => {
        const n = Math.max(0, line - 2) + i + 1;
        return `<div class="${n === line ? "executing" : ""}"><span>${n}</span><code>${escapeHtml(text) || " "}</code></div>`;
      })
      .join("");
    container.innerHTML = `<div class="source-excerpt">${excerpt}</div><div class="event-explanation"><span>↳</span><p><b>${event.event === "complete" ? "Execution has finished." : event.event === "return" ? "Returning from this function." : `Paused before line ${line}.`}</b><small>${changes.length ? `Changed since the previous event: ${escapeHtml(changes.join(", "))}.` : "Inspect the current values, then step forward to execute the next instruction."}</small></p></div><div class="memory-toolbar"><span>VARIABLES & MEMORY</span><div><button data-memory="cells" class="${view === "cells" ? "active" : ""}">▦ Cells</button><button data-memory="bars" class="${view === "bars" ? "active" : ""}">▥ Bars</button></div></div><label class="diagram-selector">Focus variable <select id="focus-variable"><option value="">All variables</option>${names.map((name) => `<option value="${escapeHtml(name)}" ${focusedVariable === name ? "selected" : ""}>${escapeHtml(name)}</option>`).join("")}</select></label><div class="memory-view">${
      names.length
        ? names
            .filter(
              (n) =>
                !focusedVariable ||
                !names.includes(focusedVariable) ||
                n === focusedVariable,
            )
            .map((n) =>
              renderValue(
                n,
                variables[n],
                position ? prev.variables?.[n] : undefined,
              ),
            )
            .join("")
        : '<p class="muted">No local variables have been assigned yet. Step forward.</p>'
    }</div><details class="stack-details"><summary>Call stack · ${event.frames?.length || 0} frames</summary>${(event.frames || []).map((f, i) => `<div><span>${i === 0 ? "↳" : "↥"}</span><b>${escapeHtml(f.name)}</b><small>${f.generated ? "generated " : ""}line ${f.line}</small></div>`).join("")}</details><details class="step-output"><summary>Output at this step</summary><pre>${escapeHtml(event.stdout || "(No output yet)")}</pre></details><div class="code-playback"><div><button id="code-reset" aria-label="Restart execution replay">↺</button><button id="code-prev" aria-label="Previous code step" ${position === 0 ? "disabled" : ""}>↤</button><button id="code-play" class="dark">${playing ? "Ⅱ Pause" : "▶ Play story"}</button><button id="code-next" aria-label="Next code step" ${position === events.length - 1 ? "disabled" : ""}>↦</button><select id="code-speed" aria-label="Code playback speed"><option value="1000">0.5×</option><option value="500" selected>1×</option><option value="250">2×</option><option value="125">4×</option></select></div><input id="code-scrub" type="range" min="0" max="${events.length - 1}" value="${position}" aria-label="Code execution position"><div class="timeline-labels"><span>EVENT ${position + 1} / ${events.length}</span><span>${escapeHtml(result?.traceKind || "Execution trace")}</span></div></div>`;
    // Keep playback controls mounted so a rapid trace update cannot discard a click.
    if (previousPlayback) {
      const nextPlayback = container.querySelector(".code-playback");
      for (const fresh of nextPlayback.querySelectorAll(
        "button, input, .timeline-labels span",
      )) {
        const old = fresh.id
          ? previousPlayback.querySelector(`#${fresh.id}`)
          : previousPlayback.querySelectorAll(".timeline-labels span")[
              [...fresh.parentNode.children].indexOf(fresh)
            ];
        if (!old) continue;
        if (fresh.tagName === "INPUT") {
          old.max = fresh.max;
          old.value = fresh.value;
        } else {
          old.innerHTML = fresh.innerHTML;
          if (fresh.tagName === "BUTTON") old.disabled = fresh.disabled;
        }
      }
      nextPlayback.replaceWith(previousPlayback);
    }
    q(".memory-view").scrollTop = memoryScroll;
    q("#focus-variable").onchange = (event) => {
      focusedVariable = event.target.value;
      draw();
      q(".memory-view").scrollTop = 0;
    };
    q("#code-speed").value = String(delay);
    q("#code-speed").onchange = (e) => (delay = +e.target.value);
    container.querySelectorAll("[data-diagram]").forEach((select) => {
      select.onchange = () => {
        diagramViews[select.dataset.diagram] = select.value;
        draw();
      };
    });
    container.querySelectorAll("[data-memory]").forEach(
      (b) =>
        (b.onclick = () => {
          view = b.dataset.memory;
          draw();
        }),
    );
    q("#code-prev").onclick = () => go(position - 1);
    q("#code-next").onclick = () => go(position + 1);
    q("#code-reset").onclick = () => go(0);
    q("#code-scrub").oninput = (e) => go(+e.target.value);
    q("#code-play").onclick = () => {
      if (playing) {
        stop();
        draw();
      } else {
        if (position === events.length - 1) position = 0;
        playing = true;
        draw();
        tick();
      }
    };
  }
  let delay = 500;
  function go(n) {
    stop();
    position = Math.max(0, Math.min(events.length - 1, n));
    draw();
  }
  function tick() {
    clearTimeout(timer);
    timer = setTimeout(() => {
      if (!playing) return;
      position++;
      if (position >= events.length - 1) {
        position = events.length - 1;
        stop();
      }
      draw();
      if (playing) tick();
    }, delay);
  }
  q("#source-code").oninput = () => {
    syncEditor();
    invalidate();
  };
  q("#source-code").onscroll = () => {
    q("#line-numbers").scrollTop = q("#source-code").scrollTop;
  };
  q("#source-code").onkeydown = (e) => {
    if (e.key === "Escape") {
      q("#run-code").focus();
      return;
    }
    if (e.key === "Tab") {
      e.preventDefault();
      const el = e.target,
        start = el.selectionStart;
      el.setRangeText("    ", start, el.selectionEnd, "end");
      syncEditor();
      invalidate();
    }
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      run();
    }
  };
  q("#program-input").oninput = invalidate;
  q("#code-language").onchange = setLanguage;
  q("#runtime-check").onclick = connect;
  q("#load-example").onclick = () => {
    drafts[language] = examples[language];
    setLanguage();
  };
  q("#run-code").onclick = run;
  q("#random-input").onclick = () => {
    q("#program-input").value = generate(6, Date.now()).join(" ");
    invalidate();
  };
  q("#program-input").value = generate(6, Date.now()).join(" ");
  setLanguage();
  q("#output-text").textContent = "Ready. Run your code to see its output.";
  connect();
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      stop();
      draw();
    }
  });
  return {
    pause() {
      clearTimeout(reconnectTimer);
      stop();
      draw();
    },
    refresh: connect,
  };
}
