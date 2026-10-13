# SortScope

A browser-based DSA learning lab with a monochrome glass interface, curved cards, capsule controls, and reversible algorithm playback. No accounts or database. The Code Lab uses a local, isolated Docker compiler service.

## Run

Requires Node 20.19+ or 22.12+ and npm.

```sh
npm ci
# Start Docker Desktop, then build the compiler image once:
npm run runner:build
npm run dev
```

Open http://127.0.0.1:7000. Port 7000 is configured with strict-port behavior: a busy port fails clearly instead of silently moving elsewhere. Stop the server with Ctrl+C.

```sh
npm test
npm run build
npm run preview
```

Stop the dev server before starting preview on the same port. The production artifact is `dist/`. Deploy it to any static host with build command `npm run build` and output directory `dist`. No secrets are required for local use. Static hosting covers sorting and structures; Code Lab requires the Docker-capable service described in server/README.md. Run npm start after building to serve the built frontend and compiler API together. This delivery has not been publicly published. Fonts use Google Fonts with system fallbacks; algorithm operation does not depend on the network.

## Features

- Bubble (early exit), Selection (skip self-swap), Insertion (saved key and shifts), Merge (top-down, left on ties), Quick (Lomuto, last pivot, skip self-swap).
- Play/pause, replay, next/previous, reset, scrubber, four speeds; animation pauses when the page is hidden.
- Seeded random arrays, sorted/reversed/nearly sorted presets, strict custom input (2–64 integers from −999 to 999).
- Synchronized pseudocode, action explanations, auxiliary key/buffer readouts, comparisons, swaps and main-array writes.
- Shared-input comparison with independently frozen completed traces; JSON export of currently displayed counts.
- Seven dynamic data structures with editable starting values, operations, graph connections, bucket counts, generated traces and replay. Supports insertion/removal/search where applicable, tree insertion/search, BFS, stack and queue operations, and chained hashing.
- Responsive chart-local scrolling, zero baseline for negative values, textual values/IDs, visible keyboard focus and reduced motion.

Focus the visualizer region (Tab through the page or click its background): Space toggles play; left/right arrows step while paused. Native fields and buttons keep their normal keyboard behavior.

## Architecture and tradeoffs

`src/engine.js` contains pure trace generation, metadata, parsing, presets and bounded stepping. Every trace event copies element IDs, values, operation highlights, explanation, pseudocode line, auxiliary information, and cumulative metrics. `src/main.js` renders snapshots and owns a single requestAnimationFrame loop. Rendering consumes no sorting logic. Configuration changes cancel playback and rebuild from the original input. Rewind indexes earlier immutable snapshots, restoring exact counters.

Full trace storage is O(events × n), deliberately traded for reliable rewind at the 64-item cap. Algorithm space descriptions exclude trace storage. Insertion and merge intermediate states may contain duplicate IDs while a saved key/buffer holds displaced items; final identity multisets are preserved. Stable variants retain ID order on ties; textual IDs are inspectable under each chart.

Comparisons count sortable value checks only. Swaps exchange distinct positions and add two main-array writes. Temporary-buffer writes, allocation, index checks and UI work are excluded. Animation is operation playback, not a runtime benchmark. Last-element Quick Sort can take quadratic time on sorted or all-equal input. Data-structure snapshots are generated from editable values and operations. Graphs accept custom undirected edges; trees are unbalanced binary search trees with unique keys. Shareable URL state, a dark theme and Heap Sort are deferred optional scope.

## Verification

```sh
npm test
# With the local server running and Google Chrome installed:
npx playwright install webkit
npx playwright test --workers=1
```

The browser configuration uses installed Chrome plus Playwright WebKit (Safari engine, not the Safari application). Tests cover exact reverse restoration, play/pause, reset, custom-input errors, negative values, completion, comparison, every structure example, keyboard controls, 360px/64-value overflow, and reduced motion. Screenshots are saved to `screenshots/`.

Engine tests cover all five algorithms, 2–64 item seeded arrays, negative values, duplicates, all-zero data, identity preservation, stable tie ordering, repeatability, valid highlights, monotonic counts and six exact metric examples. See `VERIFICATION.md` for measured results.

## Two-minute demo

1. Play Bubble, pause, step through a swap and rewind.
2. Show synchronized pseudocode, counters and element IDs.
3. Compare Bubble and Merge on a generated reverse array.
4. Generate sorted input to show Bubble’s early exit.
5. Select Quick and explain its last-pivot limitation.
6. Open Data structures and step through a hash collision or tree search.

## Interview walkthrough

Why snapshots? Exact, simple rewind at a deliberate memory cost. Why IDs? Stability and identity are different from numeric sortedness. Why not time the animations? Events have different semantics and teaching delays. How to scale? Replace full snapshots with patches/checkpoints, virtualize bars, and generate events lazily. How to add structures? Define operations, invariants, traces and visual semantics for each structure independently.

Resume wording: “Built an interactive JavaScript DSA visualizer with five sorting algorithms, reversible trace playback, synchronized pseudocode, shared-input comparisons, and seven guided data-structure demonstrations.”

## Code Lab

C, C++, Python 3, Java and JavaScript run in real isolated runtimes. Edit source and stdin, compile/run, then inspect source lines, locals, array cells/bars, object fields, call frames and program output. Play/pause, rewind and scrub use recorded execution snapshots. Editing code or input invalidates the old trace.

See [compiler setup, runtime semantics and deployment boundary](server/README.md). For runtime checks: `npm run test:runtime`. The initial image download can take several minutes. All subsequent runs reuse it. Code Lab does not require annotations or prewritten snapshot calls. C/C++ steps over function calls; JavaScript supports synchronous statement tracing. Large/complex objects are bounded previews.

### Current startup and learning panels

`npm run dev` now launches the frontend and compiler API together, starts Docker Desktop on macOS if needed, and prepares the cached compiler image automatically. Keep the terminal running. The Code Lab badge reconnects automatically after temporary service failures. For the built app, `npm run build && npm start` serves the frontend and API together (Docker and the runtime image must be ready).

“Behind every move” includes **Pseudocode**, **JavaScript**, and **Both** views. Source highlights follow the same trace instruction as the pseudocode. The displayed implementations are tested by executing them against actual arrays.

Code Lab shows measured execution wall time, CPU time, peak resident memory and compilation time. These include tracing/runtime overhead and are clearly distinguished from Big-O time and auxiliary-space complexity.

### Themes, complexity, and adaptive memory views

The header theme button switches between light and black glass palettes and saves the preference locally. Sorting and comparison panels show average/worst time, auxiliary space, and measured trace-generation time. Structure panels show operation complexity, storage, auxiliary space, and trace-generation time. These timings include visualization work and are not algorithm benchmarks. Code Lab reports measured execution/CPU time and peak process memory; it does not infer Big-O from arbitrary source.

Code Lab automatically draws maps/dictionaries, binary nodes (`left`/`right` with `value`, `val`, `data`, or `key`), and linked nodes (`next`). Python class fields and deque, plus JavaScript Map/Set, are captured. Array views can be explicitly interpreted as stacks or queues; array contents alone do not prove their intended use. Captured fields remain available below each diagram. Nested snapshots are bounded, and unsupported runtime objects remain inspectable only to the extent their tracer exposes them. C/C++ and Java retain their debugger-specific limitations described in `server/README.md`.

Sorting movement follows element identity, including backwards playback. Reduced-motion preferences disable movement effects. Custom arrays apply to both comparison algorithms; structure values and graph edges are editable independently.

Code Lab shows compilation, syntax, and execution failures beside the editor as well as in Program output. Compiler diagnostics are preserved verbatim. Python runtime failures include user-source traceback lines. “Go to line” selects the reported source line when available; edit and rerun to clear stale diagnostics. Partial traces remain replayable after runtime failures.

### Connected diagrams and structure operations

Code Lab trees now use SVG parent-child edges with L/R labels. Graph adjacency lists (objects or indexed lists whose entries are neighbor lists) can be rendered with arrows; names such as `graph` or `adj` enable automatic detection. Array variables named `stack` or `queue` use their corresponding views. These are shape/name hints, not proof of program semantics: use **Interpret as** to override the view. **Focus variable** keeps one structure visible during playback. Snapshot limits still apply (tree diagram: up to six levels / 32 nodes; graph: 32 vertices).

The Structures page has 70 operation choices across seven types:

- Array: insert, remove, search, access, update, traverse, reverse, minimum, maximum, size, empty check, clear.
- Linked list: insert, remove, search, access, update, traverse, reverse, size, empty check, clear.
- Stack: push, pop, peek, search, traverse, size, empty check, clear.
- Queue: enqueue, dequeue, front, rear, search, traverse, size, empty check, clear.
- Binary search tree: insert, search, remove, inorder, preorder, postorder, level order, minimum, maximum, height, size, empty check, clear.
- Graph: BFS, DFS, add/remove vertex, add/remove edge, neighbors, degree, size, empty check, clear. Graph playground edges are undirected; deletion reindexes remaining vertices.
- Hash table: insert, remove, search, traverse, size, empty check, clear. This playground stores keys using chained buckets.

Complexity labels follow the built operation. Graph edits, including edges, can be committed with **Use result as next starting state**. These are supported educational operations, not an exhaustive catalog of every possible data-structure variant.

## Deploy to Vercel

`vercel.json` configures the build (`npm ci`, `npm run build`, output `dist`). Import the repository in Vercel, or run `npx vercel --prod`; no environment variables are needed. The visualizer, comparison and data-structure pages work fully on Vercel.

On a hosted domain, Code Lab switches to a **browser runtime**: Python runs on Pyodide (CPython compiled to WebAssembly, loaded from jsDelivr on the first Python run, about 10 MB) and JavaScript runs in a Web Worker. Both use the same tracers as the Docker runner, so line tracing, variables, replay, errors and the 1,500-event limit behave the same. Runs are stopped after 12 seconds. On a hosted domain, Code Lab offers Python and JavaScript only, because C, C++ and Java need GCC/GDB and the JVM. Run SortScope locally with `npm run dev` for all five languages. To add them to the live site later, deploy the cloud compiler and set `VITE_RUNTIME_URL` in Vercel: see [deploy/README.md](deploy/README.md). Peak memory and CPU time are only measured by the Docker runner.
