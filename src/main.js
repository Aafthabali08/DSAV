import { algorithmCode } from "./algorithm-code.js";
import { escapeHtml } from "./code-lab.js";
import { mountCodeLab } from "./code-lab.js";
import { mountStructures } from "./structures.js";
import "./styles.css";
import { metadata, parseInput, generate, trace, advance } from "./engine.js";
const $ = (s) => document.querySelector(s);
const icons = {
  play: "▶",
  pause: "Ⅱ",
  prev: "↤",
  next: "↦",
  reset: "↺",
  shuffle: "⤨",
};
let mode = "learn",
  algorithm = "bubble",
  other = "merge",
  seed = Date.now() >>> 0,
  source = generate(16, seed),
  traces = [],
  traceTimes = [],
  step = 0,
  playing = false,
  speed = 1,
  raf = 0,
  last = 0,
  structure = "Array",
  dsStep = 0,
  logicView = "both";
const option = (selected) =>
  Object.entries(metadata)
    .map(
      ([k, m]) =>
        `<option value="${k}" ${selected === k ? "selected" : ""}>${m.name}</option>`,
    )
    .join("");
$("#app").innerHTML =
  `<header><a class="brand" href="./"><span class="brand-icon">▥</span> SortScope<span class="version">/ 01</span></a><nav aria-label="Main navigation"><button data-mode="learn" class="active">Visualizer</button><button data-mode="compare">Compare <span>↗</span></button><button data-mode="structures">Data structures</button><button data-mode="code">Code lab <span>↗</span></button></nav><button id="theme-toggle" class="outline" aria-label="Toggle dark theme">◐ Theme</button><span class="local"><i></i> A playground for your mind</span></header><main><section class="intro"><div><p class="eyebrow"><span class="tiny-mark">✳</span> LESS MEMORIZING. MORE UNDERSTANDING.</p><h1>Make the abstract <em>tangible.</em></h1><p class="subtitle">Explore the logic. Follow every move. Find your aha moment.</p></div><div class="intro-note"><span>INTERACTIVE LEARNING LAB</span><b>Small steps.<br>Deeper understanding. ↙</b></div></section><section class="workspace" aria-label="Interactive visualizer" tabindex="0"><div class="setup"><div class="field"><label for="algorithm">ALGORITHM</label><select id="algorithm">${option(algorithm)}</select></div><div class="field"><label for="preset">INPUT PRESET <small>· apply with Generate</small></label><select id="preset"><option value="random">Random order</option><option value="sorted">Already sorted</option><option value="reverse">Reverse order</option><option value="nearly">Nearly sorted</option></select></div><div class="field size-field"><label for="size">ARRAY SIZE <b id="size-value">16</b></label><input id="size" type="range" min="2" max="64" value="16"></div><button id="generate" class="outline">⤨ <span>Generate</span></button><button id="custom-toggle" class="text-button">[ ] Custom input</button></div><div id="custom" hidden><label for="custom-input">Your array</label><input id="custom-input" placeholder="12, -3, 12, 0, 7"><button id="apply" class="dark">Apply array ↗</button><p id="error" role="alert"></p></div><div id="sorting"><div id="panels"></div><div class="transport"><div class="transport-buttons"><button id="reset" aria-label="Reset" title="Reset">↺</button><button id="prev" aria-label="Previous step" title="Previous step">↤</button><button id="play" class="dark">▶ <span>Play algorithm</span></button><button id="next" aria-label="Next step" title="Next step">↦</button></div><div class="progress-wrap"><div class="step-label"><span id="step-label"></span><span id="percent"></span></div><input id="progress" aria-label="Playback position" type="range" min="0" value="0"></div><label class="speed-label" for="speed">Speed <select id="speed"><option value="0.5">0.5×</option><option selected value="1">1×</option><option value="2">2×</option><option value="4">4×</option></select></label></div></div><div id="structures" hidden></div><div id="code-lab" hidden></div></section><section id="details"></section><footer><span class="brand small">▥ SortScope</span><span>Built for the curious. One operation at a time.</span><span>NO MAGIC. JUST LOGIC. ↗</span></footer><div id="live" class="sr-only" role="status" aria-live="polite"></div></main>`;
const themeButton = $("#theme-toggle");
function applyTheme(dark) {
  document.documentElement.dataset.theme = dark ? "dark" : "light";
  themeButton.setAttribute("aria-pressed", String(dark));
  themeButton.textContent = dark ? "☀ Light" : "◐ Dark";
}
let savedTheme;
try {
  savedTheme = localStorage.getItem("sortscope-theme");
} catch {}
applyTheme(
  savedTheme
    ? savedTheme === "dark"
    : matchMedia("(prefers-color-scheme: dark)").matches,
);
themeButton.onclick = () => {
  applyTheme(document.documentElement.dataset.theme !== "dark");
  try {
    localStorage.setItem(
      "sortscope-theme",
      document.documentElement.dataset.theme,
    );
  } catch {}
};
function stop() {
  playing = false;
  cancelAnimationFrame(raf);
}
function rebuild() {
  stop();
  step = 0;
  traceTimes = [];
  traces = (mode === "compare" ? [algorithm, other] : [algorithm]).map(
    (key) => {
      const start = performance.now();
      const events = trace(source, key);
      traceTimes.push(performance.now() - start);
      return events;
    },
  );
  render();
}
function max() {
  return Math.max(...traces.map((t) => t.length));
}
function chart(t) {
  const vals = t.values.map((v) => v.value),
    low = Math.min(0, ...vals),
    high = Math.max(0, ...vals),
    range = high - low || 1,
    zero = (high / range) * 100;
  return `<div class="chart-scroll"><div class="chart" style="--count:${vals.length};min-width:${vals.length * 29}px"><div class="baseline" style="top:${zero}%"><span>0</span></div>${t.values
    .map((v, i) => {
      let h = (Math.abs(v.value) / range) * 100;
      return `<div class="bar-slot"><div data-element="${v.id}" class="bar ${t.sorted.includes(i) ? "sorted" : ""} ${t.active.includes(i) ? t.kind : ""}" style="height:${Math.max(h, 0.7)}%;top:${v.value >= 0 ? zero - h : zero}%"><span class="bar-value">${v.value}</span>${t.active.includes(i) ? '<span class="active-dot">●</span>' : ""}</div><span class="index">${i}</span></div>`;
    })
    .join("")}</div></div>`;
}
function panel(t, key, index) {
  const m = metadata[key];
  return `<article class="visual-card"><div class="card-heading"><div><div class="eyebrow">${mode === "compare" ? `0${index + 1} / SAME STARTING ARRAY` : "01 / SORTING VISUALIZER"}</div><h2>${mode === "compare" ? `<select class="compare-select" data-index="${index}" aria-label="${index ? "Right" : "Left"} algorithm">${option(key)}</select>` : m.name}<span class="pill">${t.kind === "done" ? "Completed" : playing ? "Running" : step ? "Paused" : "Ready to explore"}</span></h2></div><span class="chart-symbol">▥</span></div><div class="performance-strip"><span>Average time <b>${m.average}</b></span><span>Worst time <b>${m.worst}</b></span><span>Auxiliary space <b>${m.space}</b></span><span>Trace built <b>${traceTimes[index].toFixed(2)} ms</b></span></div>${chart(t)}<div class="legend"><span><i></i> Unsorted</span><span><i class="comparison"></i> Comparing</span><span><i class="writing"></i> Writing / swap</span><span><i class="done"></i> Sorted ✓</span></div><div class="action"><span class="action-icon">${t.kind === "done" ? "✓" : "↳"}</span><div><b>${t.explanation}</b><small>${t.auxiliary || "Watch the highlighted values to follow the operation."}</small></div><span class="event-label">${t.kind}</span></div><div class="metrics">${Object.entries(
    t.metrics,
  )
    .map(
      ([k, v]) =>
        `<div><span>${k === "writes" ? "Array writes" : k}</span><strong>${v.toString().padStart(2, "0")}</strong><small>${k === "comparisons" ? "Value checks" : k === "swaps" ? "Position exchanges" : "Main-array assignments"}</small></div>`,
    )
    .join(
      "",
    )}</div><details class="array-text"><summary>View array values & element IDs</summary><p>${t.values.map((x) => `${x.value} (id ${x.id})`).join(", ")}</p></details></article>`;
}
function logicPanel(m, t) {
  const pseudo = `<div class="logic-label">PSEUDOCODE</div><div class="logic-scroll"><ol>${m.code.map((line, i) => `<li class="${t.line === i ? "current" : ""}"><code>${escapeHtml(line)}</code></li>`).join("")}</ol></div>`;
  const code = `<div class="logic-label">JAVASCRIPT · INPUT ARRAY a</div><div class="logic-scroll source-logic"><ol>${algorithmCode[algorithm].flatMap((lines, group) => lines.map((line) => `<li class="${t.line === group ? "current" : ""}"><code>${escapeHtml(line)}</code></li>`)).join("")}</ol></div>`;
  return `<aside class="code-panel"><div class="code-header"><span>THE LOGIC</span><span class="pill">Live instruction</span></div><h3>Behind every move.</h3><p>Follow the same operation in plain language and executable code.</p><div class="logic-tabs" role="group" aria-label="Logic display">${[
    ["pseudo", "Pseudocode"],
    ["source", "JavaScript"],
    ["both", "Both"],
  ]
    .map(
      ([key, label]) =>
        `<button data-logic="${key}" aria-pressed="${logicView === key}" class="${logicView === key ? "active" : ""}">${label}</button>`,
    )
    .join(
      "",
    )}</div>${logicView === "pseudo" ? pseudo : logicView === "source" ? code : pseudo + code}<div class="code-bottom">${m.stable ? "◉ Stable sorting" : "◎ Unstable sorting"}<span>SPACE ${m.space}</span></div></aside>`;
}
function render() {
  if (mode === "structures") return;
  const oldBars = [...document.querySelectorAll(".visual-card")].map(
    (card) =>
      new Map(
        [...card.querySelectorAll(".bar")].map((b) => [
          b.dataset.element,
          b.getBoundingClientRect(),
        ]),
      ),
  );
  const scrolls = [...document.querySelectorAll(".chart-scroll")].map(
    (c) => c.scrollLeft,
  );
  const arrayOpen = [...document.querySelectorAll(".array-text")].map(
    (d) => d.open,
  );
  $("#panels").className = mode === "compare" ? "compare-grid" : "learn-grid";
  const t = traces[0][Math.min(step, traces[0].length - 1)],
    m = metadata[algorithm];
  $("#panels").innerHTML =
    panel(t, algorithm, 0) +
    (mode === "compare"
      ? panel(traces[1][Math.min(step, traces[1].length - 1)], other, 1)
      : logicPanel(m, t));
  document.querySelectorAll("[data-logic]").forEach(
    (button) =>
      (button.onclick = () => {
        logicView = button.dataset.logic;
        render();
      }),
  );
  document
    .querySelectorAll(".chart-scroll")
    .forEach((c, i) => (c.scrollLeft = scrolls[i] || 0));
  document
    .querySelectorAll(".array-text")
    .forEach((d, i) => (d.open = !!arrayOpen[i]));
  if (!matchMedia("(prefers-reduced-motion: reduce)").matches)
    document.querySelectorAll(".visual-card").forEach((card, panelIndex) => {
      card.querySelectorAll(".bar").forEach((b) => {
        const before = oldBars[panelIndex]?.get(b.dataset.element);
        if (!before) return;
        const after = b.getBoundingClientRect();
        b.animate(
          [
            {
              transform: `translate(${before.x - after.x}px, ${before.y - after.y}px)`,
            },
            { transform: "translate(0, 0)" },
          ],
          {
            duration: Math.min(300, 240 / speed),
            easing: "cubic-bezier(.22,1,.36,1)",
          },
        );
      });
    });
  $("#prev").disabled = step === 0;
  $("#next").disabled = step === max() - 1;
  $("#play").innerHTML =
    `${playing ? "Ⅱ" : "▶"} <span>${playing ? "Pause" : step === max() - 1 ? "Replay" : "Play algorithm"}</span>`;
  $("#step-label").textContent =
    `STEP ${String(step).padStart(2, "0")} / ${max() - 1}`;
  $("#percent").textContent = `${Math.round((step / (max() - 1)) * 100)}%`;
  $("#progress").max = max() - 1;
  $("#progress").value = step;
  $("#details").innerHTML =
    mode === "compare"
      ? `<div class="info-card full"><p class="eyebrow">OPERATION PLAYBACK · SHARED INPUT</p><h3>Different approaches. Same starting point.</h3><p>Each tick advances one event per unfinished algorithm. Counts reflect this exact implementation, not CPU speed. Swaps count as two array writes. Auxiliary reads and allocations are not measured.</p><table><thead><tr><th>Algorithm</th><th>Comparisons</th><th>Swaps</th><th>Writes</th></tr></thead><tbody>${traces
          .map((tr, i) => {
            const s = tr[Math.min(step, tr.length - 1)];
            return `<tr><td>${metadata[i ? other : algorithm].name}</td><td>${s.metrics.comparisons}</td><td>${s.metrics.swaps}</td><td>${s.metrics.writes}</td></tr>`;
          })
          .join(
            "",
          )}</tbody></table><button id="download" class="outline">↓ Export current comparison</button></div>`
      : `<div class="info-card explanation"><p class="eyebrow">THE IDEA</p><h3>${m.tag}.</h3><p>${m.description}</p><div class="experiment"><span>✳</span><p><b>A little experiment</b><br>${m.experiment}</p></div></div><div class="info-card complexity"><p class="eyebrow">AT A GLANCE</p><h3>A little perspective.</h3><div class="complexity-grid"><div><small>Best time</small><strong>${m.best}</strong></div><div><small>Average time</small><strong>${m.average}</strong></div><div><small>Worst time</small><strong>${m.worst}</strong></div><div><small>Auxiliary space</small><strong>${m.space}</strong></div></div><p class="footnote">${m.stable ? "Stable: equal values retain their original ID order." : "Unstable: equal values may change their original ID order."} Space excludes visualization snapshots.</p></div>`;
  document.querySelectorAll(".compare-select").forEach(
    (el) =>
      (el.onchange = () => {
        if (el.dataset.index === "0") {
          algorithm = el.value;
          $("#algorithm").value = algorithm;
        } else other = el.value;
        rebuild();
      }),
  );
  if ($("#download"))
    $("#download").onclick = () => {
      const blob = new Blob(
        [
          JSON.stringify(
            {
              input: source,
              step,
              algorithms: traces.map((t, i) => ({
                name: i ? other : algorithm,
                ...t[Math.min(step, t.length - 1)].metrics,
              })),
            },
            null,
            2,
          ),
        ],
        { type: "application/json" },
      );
      const u = URL.createObjectURL(blob),
        a = document.createElement("a");
      a.href = u;
      a.download = "sortscope-comparison.json";
      a.click();
      URL.revokeObjectURL(u);
    };
}
function announce(text) {
  $("#live").textContent = text;
}
function tick(now) {
  if (!playing) return;
  if (now - last >= 250 / speed) {
    last = now;
    step = advance(step, max());
    if (step === max() - 1) {
      stop();
      announce("Sorting completed.");
    }
    render();
  }
  if (playing) raf = requestAnimationFrame(tick);
}
function play() {
  if (playing) {
    stop();
    announce("Playback paused.");
    render();
    return;
  }
  if (step === max() - 1) step = 0;
  playing = true;
  last = performance.now();
  announce("Playback started.");
  render();
  raf = requestAnimationFrame(tick);
}
function manual(d) {
  stop();
  step = advance(step, max(), d);
  render();
  announce(traces[0][Math.min(step, traces[0].length - 1)].explanation);
}
$("#play").onclick = play;
$("#next").onclick = () => manual(1);
$("#prev").onclick = () => manual(-1);
$("#reset").onclick = rebuild;
$("#speed").onchange = (e) => (speed = Number(e.target.value));
$("#progress").oninput = (e) => {
  stop();
  step = +e.target.value;
  render();
};
$("#algorithm").onchange = (e) => {
  algorithm = e.target.value;
  rebuild();
};
$("#size").oninput = (e) => ($("#size-value").textContent = e.target.value);
$("#generate").onclick = () => {
  seed++;
  source = generate(+$("#size").value, seed, $("#preset").value);
  rebuild();
};
$("#custom-toggle").onclick = () =>
  ($("#custom").hidden = !$("#custom").hidden);
$("#apply").onclick = () => {
  try {
    const next = parseInput($("#custom-input").value);
    source = next;
    $("#size").value = next.length;
    $("#size-value").textContent = next.length;
    $("#error").textContent = "";
    rebuild();
  } catch (e) {
    $("#error").textContent = e.message;
  }
};
let codeLab = null,
  structureLab = null;
document.querySelectorAll("[data-mode]").forEach(
  (b) =>
    (b.onclick = () => {
      mode = b.dataset.mode;
      history.replaceState(null, "", "#" + mode);
      stop();
      codeLab?.pause();
      structureLab?.pause();
      document
        .querySelectorAll("[data-mode]")
        .forEach((x) => x.classList.toggle("active", x === b));
      const sorting = ["learn", "compare"].includes(mode);
      $(".setup").hidden = !sorting;
      $("#custom").hidden = true;
      $("#sorting").hidden = !sorting;
      $("#structures").hidden = mode !== "structures";
      $("#code-lab").hidden = mode !== "code";
      $("#details").hidden = !sorting;
      if (mode === "structures") {
        if (!structureLab) structureLab = mountStructures($("#structures"));
      } else if (mode === "code") {
        if (!codeLab) codeLab = mountCodeLab($("#code-lab"));
        else codeLab.refresh();
      } else rebuild();
    }),
);
$(".workspace").onkeydown = (e) => {
  if (
    /INPUT|SELECT|BUTTON|TEXTAREA/.test(e.target.tagName) ||
    !["learn", "compare"].includes(mode)
  )
    return;
  if (e.code === "Space") {
    e.preventDefault();
    play();
  }
  if (!playing && ["ArrowLeft", "ArrowRight"].includes(e.key)) {
    e.preventDefault();
    manual(e.key === "ArrowLeft" ? -1 : 1);
  }
};
document.addEventListener("visibilitychange", () => {
  if (document.hidden && playing) {
    stop();
    render();
  }
});
rebuild();

const initialMode = location.hash.slice(1);
if (["learn", "compare", "structures", "code"].includes(initialMode))
  document.querySelector(`[data-mode="${initialMode}"]`).click();
