const esc = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const text = (value) =>
  esc(typeof value === "object" ? JSON.stringify(value) : value);
export function valueKind(value, name = "") {
  if (!value || typeof value !== "object") return "scalar";
  if (Array.isArray(value))
    return /stack/i.test(name)
      ? "stack"
      : /queue|deque/i.test(name)
        ? "queue"
        : "array";
  if (
    /graph|adjacency|^adj$/i.test(name) &&
    Object.values(value).every((v) => Array.isArray(v))
  )
    return "graph";
  if (["Map", "Set", "Queue"].includes(value.__sortscopeType))
    return value.__sortscopeType.toLowerCase();
  if ("left" in value || "right" in value) return "tree";
  if ("next" in value) return "linked list";
  return "map";
}
export function valueDiagram(value, requested = "auto", previous) {
  const kind = requested === "auto" ? valueKind(value) : requested;
  const items = Array.isArray(value) ? value : value?.items;
  const label = (n) => n?.value ?? n?.val ?? n?.data ?? n?.key ?? "?";
  if (kind === "tree" && value && !Array.isArray(value)) {
    const nodes = [],
      links = [];
    let column = 0;
    const visit = (node, path = "root", depth = 0, old = previous) => {
      if (!node || typeof node !== "object" || depth > 5 || nodes.length >= 32)
        return null;
      const n = {
        path,
        depth,
        value: label(node),
        changed:
          JSON.stringify(label(node)) !==
            JSON.stringify(old ? label(old) : undefined) ||
          !!node.left !== !!old?.left ||
          !!node.right !== !!old?.right,
      };
      nodes.push(n);
      const left = visit(node.left, path + ".left", depth + 1, old?.left);
      n.x = 45 + column++ * 82;
      n.y = 40 + depth * 100;
      const right = visit(node.right, path + ".right", depth + 1, old?.right);
      if (left) links.push({ a: n, b: left, label: "L" });
      if (right) links.push({ a: n, b: right, label: "R" });
      return n;
    };
    visit(value);
    const width = Math.max(200, column * 82),
      height = Math.max(120, ...nodes.map((n) => n.y + 55));
    return `<div class="adaptive-diagram tree-diagram"><svg class="code-network" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="Binary tree with connected parent and child nodes">${links.map(({ a, b, label }) => `<g><line class="tree-edge ${a.changed || b.changed ? "edge-changed" : ""}" x1="${a.x}" y1="${a.y + 24}" x2="${b.x}" y2="${b.y - 24}"/><text class="edge-label" x="${(a.x + b.x) / 2 + 8}" y="${(a.y + b.y) / 2}">${label}</text></g>`).join("")}${nodes.map((n) => `<g class="diagram-vertex ${n.changed ? "vertex-changed" : ""}" data-node-path="${n.path}"><circle cx="${n.x}" cy="${n.y}" r="25"/><text x="${n.x}" y="${n.y + 5}">${text(n.value)}</text></g>`).join("")}</svg><small>L = left child · R = right child · captured branches only (up to 6 levels / 32 nodes)</small></div>`;
  }
  if (kind === "graph" && value && typeof value === "object") {
    const entries = Object.entries(value).filter(([, neighbors]) =>
      Array.isArray(neighbors),
    );
    const keys = [
      ...new Set(
        entries.flatMap(([key, neighbors]) => [
          key,
          ...neighbors.filter((n) => typeof n !== "object").map(String),
        ]),
      ),
    ].slice(0, 32);
    const points = new Map(
      keys.map((key, i) => [
        key,
        {
          x: 220 + 160 * Math.cos((i / keys.length) * Math.PI * 2),
          y: 195 + 150 * Math.sin((i / keys.length) * Math.PI * 2),
        },
      ]),
    );
    const lines = entries.flatMap(([key, neighbors]) =>
      neighbors
        .map(String)
        .filter((n) => points.has(n) && points.has(key))
        .map((n) => {
          const a = points.get(key),
            b = points.get(n);
          const dx = b.x - a.x,
            dy = b.y - a.y,
            length = Math.hypot(dx, dy) || 1,
            ux = dx / length,
            uy = dy / length;
          const x = b.x - ux * 28,
            y = b.y - uy * 28;
          if (key === n)
            return `<path class="graph-edge" d="M ${a.x - 18} ${a.y - 18} C ${a.x - 65} ${a.y - 80}, ${a.x + 65} ${a.y - 80}, ${a.x + 18} ${a.y - 18}" fill="none" stroke="currentColor"/>`;
          return `<line class="graph-edge ${JSON.stringify(value[key]) !== JSON.stringify(previous?.[key]) ? "edge-changed" : ""}" x1="${a.x + ux * 26}" y1="${a.y + uy * 26}" x2="${x}" y2="${y}"/><polygon fill="currentColor" points="${x},${y} ${x - ux * 10 - uy * 5},${y - uy * 10 + ux * 5} ${x - ux * 10 + uy * 5},${y - uy * 10 - ux * 5}"/>`;
        }),
    );
    return `<div class="adaptive-diagram graph-diagram"><svg class="code-network" width="440" height="390" viewBox="0 0 440 390" role="img" aria-label="Graph adjacency connections">${lines.join("")}${keys
      .map((key) => {
        const p = points.get(key);
        return `<g class="diagram-vertex"><circle cx="${p.x}" cy="${p.y}" r="25"/><text x="${p.x}" y="${p.y + 5}">${text(key)}</text></g>`;
      })
      .join(
        "",
      )}</svg><small>Adjacency connections (up to 32 vertices). Arrows follow adjacency entries. Reciprocal entries show both directions.</small></div>`;
  }
  if (kind === "linked list" && value && !Array.isArray(value)) {
    const nodes = [];
    let node = value;
    while (node && typeof node === "object" && nodes.length < 32) {
      nodes.push(label(node));
      node = node.next;
    }
    return `<div class="adaptive-diagram linked-diagram">${nodes.map((n) => `<span class="diagram-node">${text(n)}</span><span>→</span>`).join("")}<small>${text(node && typeof node === "object" ? "…" : (node ?? "null"))}</small></div>`;
  }
  if (["stack", "queue", "set"].includes(kind) && Array.isArray(items)) {
    const shown = kind === "stack" ? [...items].reverse() : items;
    return `<div class="adaptive-diagram ${kind}-diagram"><small>${kind === "stack" ? "TOP · last item" : kind === "queue" ? "FRONT · first item → BACK" : "Unique values"}</small><div class="diagram-sequence">${shown.map((v, i) => `<span class="diagram-node"><b>${text(v)}</b><small>${kind === "stack" ? items.length - 1 - i : i}</small></span>`).join("") || "<small>Empty</small>"}</div></div>`;
  }
  if (kind === "map" && value && !Array.isArray(value)) {
    const entries =
      value.__sortscopeType === "Map" &&
      Array.isArray(value.entries) &&
      value.entries.every((entry) => Array.isArray(entry) && entry.length === 2)
        ? value.entries
        : Object.entries(value);
    if (!Array.isArray(entries)) return "";
    return `<div class="adaptive-diagram map-diagram"><small>KEY → VALUE</small>${entries.map(([k, v]) => `<div><span>${text(k)}</span><span>→</span><b>${text(v)}</b></div>`).join("") || "<small>Empty map</small>"}</div>`;
  }
  return "";
}
