import { operationCost } from "./structure-operations.js";
import { generate } from "./engine.js";
import { escapeHtml as esc } from "./code-lab.js";
import {
  structureInfo,
  structureTrace,
  buildTree,
  parseEdges,
} from "./structure-engine.js";
export function mountStructures(root) {
  let type = "Array",
    source = generate(5, Date.now()),
    events = [],
    step = 0,
    timer = null,
    playing = false,
    edges = [],
    buckets = 4,
    traceMs = 0,
    builtOperation = "Insert";
  const q = (s) => root.querySelector(s);
  const stop = () => {
    playing = false;
    clearTimeout(timer);
  };
  root.innerHTML = `<div class="structures-header"><div><p class="eyebrow">02 / BUILD IT. CHANGE IT. UNDERSTAND IT.</p><h2>Your data. Your next move.</h2></div><span class="pill">Dynamic structures</span></div><div class="structure-tabs">${Object.keys(
    structureInfo,
  )
    .map((t) => `<button data-structure="${t}">${t}</button>`)
    .join(
      "",
    )}</div><div class="ds-setup"><label>INITIAL VALUES <input id="ds-values" aria-label="Structure values" placeholder="Comma-separated integers"></label><button id="ds-generate" class="outline">⤨ Generate</button><label>OPERATION <select id="ds-operation"></select></label><label id="ds-value-label">VALUE <input id="ds-value" type="number" min="-999" max="999"></label><label id="ds-index-label">POSITION <input id="ds-index" type="number" min="0" value="0"></label><label id="ds-target-label" hidden>TARGET VERTEX <input id="ds-target" type="number" min="0" value="1"></label><label id="ds-buckets-label" hidden>BUCKETS <input id="ds-buckets" type="number" min="2" max="16" value="4"></label><button id="ds-apply" class="dark">Build steps ↗</button></div><label id="ds-edges-label" class="edge-field" hidden>CONNECTIONS <input id="ds-edges" aria-label="Graph edges" placeholder="0-1, 1-2, 0-3"><small>Undirected edges by node index. Empty means no edges.</small></label><p id="ds-error" role="alert"></p><div id="ds-scene"></div>`;
  function configure() {
    stop();
    q("#ds-operation").innerHTML = structureInfo[type].operations
      .map((o) => `<option>${o}</option>`)
      .join("");
    root
      .querySelectorAll("[data-structure]")
      .forEach((b) =>
        b.classList.toggle("active", b.dataset.structure === type),
      );
    q("#ds-edges-label").hidden = type !== "Graph";
    q("#ds-buckets-label").hidden = type !== "Hash table";
    controls();
    build();
  }
  function controls() {
    const op = q("#ds-operation").value;
    q("#ds-value-label").hidden =
      !["Insert", "Update", "Search", "Push", "Enqueue", "Add vertex"].includes(
        op,
      ) && !(op === "Remove" && ["Hash table", "Binary tree"].includes(type));
    q("#ds-index-label").hidden = !(
      (type === "Graph" &&
        !["Add vertex", "Size", "Is empty", "Clear"].includes(op)) ||
      (["Array", "Linked list"].includes(type) &&
        ["Insert", "Remove", "Access", "Update"].includes(op))
    );
    q("#ds-target-label").hidden = !(
      type === "Graph" && ["Add edge", "Remove edge"].includes(op)
    );
  }

  function build() {
    stop();
    try {
      const raw = q("#ds-values").value.trim();
      const parts = raw ? raw.split(/[\s,]+/) : [];
      if (
        parts.length > 16 ||
        parts.some((v) => !/^[-+]?\d+$/.test(v) || Math.abs(+v) > 999)
      )
        throw Error(
          "Use up to 16 whole numbers between −999 and 999. Empty input creates an empty structure.",
        );
      const input = parts.map(Number),
        value = +q("#ds-value").value,
        index = +q("#ds-index").value;
      const count = +q("#ds-buckets").value;
      if (!Number.isInteger(value) || Math.abs(value) > 999)
        throw Error("Value must be a whole number between −999 and 999.");
      if (!Number.isInteger(count) || count < 2 || count > 16)
        throw Error("Choose 2–16 buckets.");
      const nextEdges =
        type === "Graph" ? parseEdges(q("#ds-edges").value, input.length) : [];
      const started = performance.now();
      const next = structureTrace(type, input, {
        operation: q("#ds-operation").value,
        value,
        index,
        target: +q("#ds-target").value,
        buckets: count,
        edges: nextEdges,
      });
      builtOperation = q("#ds-operation").value;
      traceMs = performance.now() - started;
      source = input;
      edges = nextEdges;
      buckets = count;
      events = next;
      step = 0;
      q("#ds-error").textContent = "";
      draw();
    } catch (e) {
      q("#ds-error").textContent = e.message;
    }
  }
  function diagram(event) {
    const v = event.values,
      active = event.active;
    if (type === "Binary tree") {
      const tree = buildTree(v),
        nodes = [],
        links = [];
      let maxDepth = 0;
      function layout(n, depth, min, max, parent) {
        if (!n) return;
        const x = (min + max) / 2,
          y = 40 + depth * 70;
        maxDepth = Math.max(maxDepth, depth);
        if (parent) links.push([parent.x, parent.y, x, y]);
        nodes.push({ x, y, value: n.value });
        layout(n.left, depth + 1, min, x, { x, y });
        layout(n.right, depth + 1, x, max, { x, y });
      }
      layout(tree, 0, 10, 690, null);
      return `<svg class="dynamic-network" viewBox="0 0 700 ${Math.max(240, (maxDepth + 1) * 75)}" role="img" aria-label="Binary search tree generated from your input">${links.map(([x, y, a, b]) => `<line x1="${x}" y1="${y}" x2="${a}" y2="${b}"/>`).join("")}${nodes.map((n) => `<g class="${active.some((i) => v[i] === n.value) ? "node-active" : ""}"><circle cx="${n.x}" cy="${n.y}" r="22"/><text x="${n.x}" y="${n.y + 5}">${n.value}</text></g>`).join("")}</svg>`;
    }
    if (type === "Graph") {
      const nodes = v.map((value, i) => ({
        value,
        x: 350 + Math.cos((i / v.length) * Math.PI * 2 - Math.PI / 2) * 230,
        y: 180 + Math.sin((i / v.length) * Math.PI * 2 - Math.PI / 2) * 140,
      }));
      return `<svg class="dynamic-network" viewBox="0 0 700 360" role="img" aria-label="Graph from your values and edges">${(event.edges || edges).map(([a, b]) => `<line x1="${nodes[a].x}" y1="${nodes[a].y}" x2="${nodes[b].x}" y2="${nodes[b].y}"/>`).join("")}${nodes.map((n, i) => `<g class="${active.includes(i) || event.visited?.includes(i) ? "node-active" : ""}"><circle cx="${n.x}" cy="${n.y}" r="23"/><text x="${n.x}" y="${n.y + 5}">${n.value}</text><text class="node-index" x="${n.x}" y="${n.y + 38}">node ${i}</text></g>`).join("")}</svg><div class="aux-queue">${event.queue ? "QUEUE" : "VISIT ORDER"} <b>${(event.queue || event.visited)?.map((i) => `${i} (${v[i]})`).join(" → ") || "empty"}</b></div>`;
    }
    if (type === "Hash table")
      return `<div class="dynamic-buckets">${Array.from(
        { length: buckets },
        (_, bucket) =>
          `<div class="${event.bucket === bucket ? "selected-bucket" : ""}"><small>BUCKET ${bucket}</small><div>${
            v
              .map((value, i) => ({ value, i }))
              .filter(
                (x) => ((x.value % buckets) + buckets) % buckets === bucket,
              )
              .map(
                (x) =>
                  `<span class="${active.includes(x.i) ? "selected" : ""}">${x.value}</span>`,
              )
              .join("<b>→</b>") || '<span class="empty-bucket">∅</span>'
          }</div></div>`,
      ).join("")}</div>`;
    return `<div class="nodes ${type === "Stack" ? "stack" : ""}">${v.length ? v.map((value, i) => `<div class="node-wrap"><div class="data-node ${active.includes(i) ? "selected" : ""}">${value === null ? "·" : value}</div><small>${type === "Array" ? `INDEX ${i}` : type === "Stack" && i === v.length - 1 ? "TOP" : type === "Queue" ? (i === 0 ? "FRONT" : i === v.length - 1 ? "BACK" : "") : type === "Linked list" ? (i === 0 ? "HEAD" : i === v.length - 1 ? "TAIL" : "") : ""}</small>${type === "Linked list" && i < v.length - 1 ? '<span class="link-arrow">→</span>' : ""}</div>`).join("") : '<p class="muted">Empty structure</p>'}${type === "Linked list" ? '<span class="null-link">→ null</span>' : ""}</div>${event.pending !== undefined ? `<div class="aux-queue">NEW NODE <b>${event.pending}</b></div>` : ""}`;
  }
  function draw() {
    if (!events.length) return;
    const oldNodes = new Map();
    const occurrences = {};
    q("#ds-scene")
      .querySelectorAll(".data-node")
      .forEach((node) => {
        const value = node.textContent;
        const key =
          value + ":" + (occurrences[value] = (occurrences[value] || 0) + 1);
        oldNodes.set(key, node.getBoundingClientRect());
      });
    const e = events[step],
      d = structureInfo[type];
    q("#ds-scene").innerHTML =
      `<div class="structure-content"><div class="structure-stage"><div class="stage-label"><span>${type} · ${e.values.length} values</span><span>STEP ${step + 1} OF ${events.length}</span></div><div class="ds-diagram">${diagram(e)}</div><div class="action"><span>↳</span><b>${esc(e.message)}</b></div><div class="ds-controls"><button id="ds-reset" class="outline">↺ Reset</button><button id="ds-prev" class="outline" ${step === 0 ? "disabled" : ""}>← Previous</button><button id="ds-play" class="dark">${playing ? "Ⅱ Pause" : "▶ Play story"}</button><button id="ds-next" class="outline" ${step === events.length - 1 ? "disabled" : ""}>Next →</button></div><input id="ds-scrub" type="range" aria-label="Structure playback position" min="0" max="${events.length - 1}" value="${step}"><div class="ds-commit"><button id="ds-use-result" class="text-button">Use result as next starting state ↗</button><small>Chain operations on your data.</small></div></div><aside class="structure-explain"><p class="eyebrow">${d.kind}</p><h3>${type}</h3><p>${d.description}</p><div class="complexity-chip">${builtOperation}: ${operationCost(type, builtOperation).time}</div><div class="performance-strip"><span>Storage space <b>${type === "Graph" ? "O(V + E)" : type === "Hash table" ? "O(n + buckets)" : "O(n)"}</b></span><span>Operation auxiliary space <b>${operationCost(type, builtOperation).space}</b></span><span>Trace built <b>${traceMs.toFixed(2)} ms</b></span></div><p class="footnote">Complexity describes the data structure operation; trace timing includes teaching snapshots, whose memory is additional. Tree height is h; graph vertices and edges are V and E.</p><p class="footnote">Generated from your input. Edit values or the operation, then choose Build steps. Play the sequence or inspect each step.</p><div class="state-strip"><small>INITIAL STATE</small><p>[${source.join(", ")}]</p><small>CURRENT STATE</small><p>[${e.values.map((v) => (v === null ? "empty" : v)).join(", ")}]</p></div></aside></div>`;
    if (!matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const counts = {};
      q("#ds-scene")
        .querySelectorAll(".data-node")
        .forEach((node) => {
          const value = node.textContent,
            key = value + ":" + (counts[value] = (counts[value] || 0) + 1),
            before = oldNodes.get(key),
            after = node.getBoundingClientRect();
          node.animate(
            before
              ? [
                  {
                    transform: `translate(${before.x - after.x}px,${before.y - after.y}px)`,
                  },
                  { transform: "translate(0,0)" },
                ]
              : [
                  { opacity: 0, transform: "scale(.7)" },
                  { opacity: 1, transform: "scale(1)" },
                ],
            { duration: 350, easing: "cubic-bezier(.22,1,.36,1)" },
          );
        });
    }
    q("#ds-next").onclick = () => move(step + 1);
    q("#ds-prev").onclick = () => move(step - 1);
    q("#ds-reset").onclick = () => move(0);
    q("#ds-scrub").oninput = (e) => move(+e.target.value);
    q("#ds-play").onclick = () => {
      if (playing) {
        stop();
        draw();
      } else {
        if (step === events.length - 1) step = 0;
        playing = true;
        draw();
        tick();
      }
    };
    q("#ds-use-result").onclick = () => {
      q("#ds-values").value = events.at(-1).values.join(", ");
      if (type === "Graph" && events.at(-1).edges)
        q("#ds-edges").value = events
          .at(-1)
          .edges.map((edge) => edge.join("-"))
          .join(", ");
      build();
    };
  }
  function move(n) {
    stop();
    step = Math.max(0, Math.min(events.length - 1, n));
    draw();
  }
  function tick() {
    timer = setTimeout(() => {
      if (!playing) return;
      step++;
      if (step === events.length - 1) stop();
      draw();
      if (playing) tick();
    }, 750);
  }
  q("#ds-values").value = source.join(", ");
  q("#ds-value").value = generate(1, Date.now() + 13)[0];
  q("#ds-edges").value = source
    .slice(1)
    .map((_, i) => `${i}-${i + 1}`)
    .join(", ");
  q("#ds-apply").onclick = build;
  q("#ds-operation").onchange = controls;
  q("#ds-generate").onclick = () => {
    source = generate(5, Date.now());
    q("#ds-values").value = source.join(", ");
    q("#ds-edges").value = source
      .slice(1)
      .map((_, i) => `${i}-${i + 1}`)
      .join(", ");
    build();
  };
  root.querySelectorAll("[data-structure]").forEach(
    (b) =>
      (b.onclick = () => {
        type = b.dataset.structure;
        configure();
      }),
  );
  configure();
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      stop();
      draw();
    }
  });
  return {
    pause() {
      stop();
      draw();
    },
  };
}
