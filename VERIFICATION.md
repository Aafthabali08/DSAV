# Verification record — 12 October 2026

## Current result

- **15 unit tests passed** (`npm test`). Covers five sorting trace engines across supported input sizes, exact counter examples, parsing, deterministic playback bounds, all seven data structures and representative operations, graph edge validation, JavaScript instrumentation and async rejection, and execution of all five displayed JavaScript algorithm implementations.
- **14 browser tests passed** (`npx playwright test --workers=1`): seven each in installed Google Chrome and Playwright WebKit. Covers sorting playback/rewind/reset, comparison, custom values, all structures, desktop/mobile overflow, reduced motion, real custom Python execution, all five compiler selectors, error display, time/memory metrics, automatic reconnect after HTTP failure, and pseudocode/source/both switching.
- **Five-language runtime suite passed** (`npm run test:runtime`). C, C++, Python 3, Java and JavaScript compiled/executed the supplied input and exposed sorted array snapshots. Also verifies custom Python call frames, C compiler diagnostics, Python runtime exceptions, trace limits, absence of host filesystem mounts, and blocked outbound network.
- **Production build passed**. Built frontend and API served together on temporary port 7001; Chrome received HTTP 200 and ran actual C++ code with valid sorted output and measured execution/memory/compilation values, without application page errors. Temporary production server stopped afterward.
- **Startup checked**. `npm run dev` starts frontend + API and prepares the cached Docker image. Development server remains on 127.0.0.1:7000; API on 127.0.0.1:7002.

## Measurements and limitations

Runtime wall/CPU/peak RSS measurements come from Linux `wait4` around the execution process. They include interpreters/debuggers and tracing. Peak RSS is a process high-water mark, not aggregate simultaneous allocations. Compilation is measured separately. Arbitrary program Big-O is not inferred from a single run.

The supported scope is five sorting algorithms, seven editable data structures, and the five documented programming languages. This is not every DSA topic. C/C++ tracing steps over function calls; JavaScript replay supports synchronous statements and identifies generated stack locations. Complex values are bounded previews. WebKit testing is a Safari-engine check, not the Safari application. No physical-device or formal accessibility-conformance audit was performed.

The runtime is configured for local use. A static-only deployment cannot execute native code; public multi-user hosting needs a dedicated authenticated, rate-limited execution service. See `server/README.md`.

## Artifacts

Desktop/mobile captures are saved under `screenshots/`, including `chromium-code-lab.png`, `chromium-code-mobile.png`, and matching WebKit screenshots. The screenshots show actual execution output and measured values, not fabricated examples.

## Reverification — 13 October 2026

The web server, API and Docker daemon were not running at the start. `npm run dev` restarted both services, started Docker Desktop, rebuilt the cached image and reached compiler-ready state.

- Unit suite: **15 passed**. Production build: **passed**.
- Runtime suite: **passed for all five languages**, including compiler diagnostics, exceptions, execution limits and isolation checks.
- Expanded browser coverage: **20 checks passed across Chrome and WebKit**. The first run passed 18 checks; two new checks had an incorrect textarea assertion (`textContent` rather than editable `value`). After correcting the test, both checks passed on rerun. No application failure was found in these tested workflows.
- Added coverage: all presets and algorithm selectors, replay/speed/reset, comparison JSON export, equal-algorithm comparisons, result chaining, hash buckets, structure autoplay and validation recovery, code autoplay/pause/speed/reset, cells/bars, per-language drafts, example reload, random-input invalidation and recovery after runtime errors.
- Set Playwright `workers: 1` by default to match the compiler's single-execution contract and avoid spurious concurrent-run rejections.

The local services remain running on ports 7000 and 7002. This is a development session, not a persistent operating-system service. Restart with `npm run dev` after stopping the session or rebooting. Tests cover the implemented features, not every possible arbitrary program or every DSA topic.

## Theme and adaptive diagrams update — 2026-10-13

- 18 unit tests passed, including safe diagram escaping, sequence order, recursive bounds, and zero values.
- 24 browser scenarios passed across Chromium and WebKit (22 on the full run, two corrected theme-selector checks on rerun). Coverage includes custom input, all sorting selectors, all structure selectors, comparison, replay, compiler errors, five languages, persistent themes, and live JavaScript map/tree/list diagrams with stack/queue overrides.
- Docker runtime rebuilt; all five languages, error paths, limits, isolation, Python class-node fields and deque serialization passed runtime smoke checks.
- Production asset build passed. Desktop and 360px mobile dark screenshots inspected for layout.
- Runtime is designed for trusted localhost use; these checks do not certify a public multi-user execution service. Custom-code diagrams reflect captured fields, not automatic understanding of arbitrary program semantics.
- Final production-server smoke test on temporary loopback port 7010 passed: HTML, bundled JavaScript, and compiler readiness. The temporary server was stopped; the development app remains on 7000.

## Compiler diagnostics update — 2026-10-13

19 unit tests and the production build passed. 18 targeted browser scenarios passed in Chromium and WebKit, including real syntax/compile failures in all five languages, source-line selection, Python runtime traceback details, and successful rerun after correcting errors. Existing runtime connection, successful compilation, replay, draft, and input controls also passed. The updated local compiler service and frontend are running on ports 7002 and 7000.

## Connected diagrams and expanded operations — 2026-10-13

- 23 unit tests passed, including all 70 advertised structure/operation combinations, immutable input snapshots, exact traversal orders, two-child BST deletion, graph edge/vertex mutation, code tree edge counts and structure hints.
- Production build passed.
- Full 30-scenario browser run passed 29 scenarios and exposed a WebKit fast-playback pause race. Playback controls were changed to retain DOM identity; the affected scenario then passed three repetitions per engine (6/6). Final connected-diagram, operation, focus-variable and theme scenarios passed in both engines (8/8).
- Earlier in-progress run had a diagnostics check interrupted by Vite hot reload; the diagnostics scenario passed on the subsequent stable run.
- Inspected the Code Lab screenshot with the root variable focused: parent-child edges and L/R labels are visible in dark mode. Mobile width checks passed.
- Diagram semantics remain bounded and heuristic for arbitrary code; explicit interpretation and raw captured fields are available. The educational operations are listed in README, not claimed to cover every variant of every structure.
