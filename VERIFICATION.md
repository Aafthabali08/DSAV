# Verification record — 12–13 October 2026

## Current result

Latest full run: 13 October 2026, on the code at commit `d82bfe4` (later commits change documentation only). Live site: https://sortscopea.vercel.app

- **29 unit tests passed** (`npm test`). Covers five sorting trace engines across supported input sizes, exact counter examples, parsing, deterministic playback bounds, all 70 structure/operation combinations, graph edge validation, diagnostics, diagrams, JavaScript instrumentation and async rejection, execution of all five displayed JavaScript algorithm implementations, hosted-mode detection, and the compiler service's origin, proxy and rate-limit policy.
- **30 local browser scenarios passed** (`npx playwright test --workers=1`): 15 each in installed Google Chrome and Playwright WebKit. Covers sorting playback/rewind/reset, comparison and export, custom values, all structures and operations, keyboard controls, no horizontal overflow on any page at 360px, reduced motion, themes, all five Code Lab languages, compiler/runtime errors, reconnect after HTTP failure, diagrams, and pseudocode/source switching.
- **Five-language runtime suite passed** (`npm run test:runtime`). C, C++, Python 3, Java and JavaScript compiled/executed the supplied input and exposed sorted array snapshots. Also verifies custom Python call frames, C compiler diagnostics, Python runtime exceptions, trace limits, absence of host filesystem mounts, and blocked outbound network.
- **Live site: 42 scenarios passed, 2 skipped** across Chrome and WebKit against https://sortscopea.vercel.app (details below).
- **Production build passed**; `npm audit` reports **0 vulnerabilities**.

## Measurements and limitations

Runtime wall/CPU/peak RSS measurements come from Linux `wait4` around the execution process. They include interpreters/debuggers and tracing. Peak RSS is a process high-water mark, not aggregate simultaneous allocations. Compilation is measured separately. Arbitrary program Big-O is not inferred from a single run.

The supported scope is five sorting algorithms, seven editable data structures, and the five documented programming languages. This is not every DSA topic. C/C++ tracing steps over function calls; JavaScript replay supports synchronous statements and identifies generated stack locations. Complex values are bounded previews. WebKit testing is a Safari-engine check, not the Safari application. No physical-device or formal accessibility-conformance audit was performed.

On the live site, Python and JavaScript run in the visitor's browser; C, C++ and Java are listed as coming soon until a cloud compiler is configured with `VITE_RUNTIME_URL` (see `deploy/README.md`). The cloud compiler adds origin allowlisting, per-IP rate limits and a concurrency cap; it is suitable for a personal learning site, not certified as a hardened multi-tenant execution platform. Browser runs report wall time only; peak memory and CPU time come from the Docker runner.

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

## Deployment, browser runtime and live testing — 2026-10-13

**Vercel deployment.** Added `vercel.json` (Vite build, `dist` output, immutable asset caching, `nosniff`, `DENY` framing and referrer-policy headers). Verified on the live site: HTTP 200, all three security headers present, `/api/runtime` returns 404 as expected for a static host. A clean checkout ran `npm ci`, build and unit tests successfully before the first push.

**Hosted Code Lab.** On a non-local host, Code Lab traces Python (Pyodide 0.28.3) and JavaScript (Web Worker) in the browser, reusing `server/runtime/python_trace.py` and `server/instrument.js`. Tested on a static copy of `dist/` under a non-local hostname in Chrome and WebKit: sorting examples, Python traceback and syntax errors, JavaScript runtime errors, the 1,500-event limit, a 12-second hard timeout for `while (true) {}` with recovery on the next run, and no page errors.

**Problems found and fixed during this work:**

- **Live deploy did not update.** `.vercelignore` excluded `server/`, which the browser runtime imports, so the Vercel build failed and the previous deployment stayed live. Reproduced by building with the ignored files removed; fixed by including `server/`. The live site then served the new build.
- **Comparison card overflowed phone screens.** At 360px the four-column table widened its grid card by 12px, causing horizontal page scroll on Compare. Fixed in CSS; the mobile browser test now checks every page for overflow.
- **Code Lab Pause button moved during playback.** Each step changed the snapshot height and re-attached the controls, moving the button by up to about 130px and restarting its hover transition, so clicks could miss. This was the cause of an intermittent WebKit failure in `controls.spec.js` (2 of 6 runs failed on the previous commit). Controls now sit above the snapshot, stay mounted, and the snapshot no longer shrinks during a replay. The button position stayed constant (within 1px) and the scenario passed 10 of 10 repetitions in each engine.

**Cloud compiler (prepared, not deployed).** `server/policy.js` adds an exact-origin CORS allowlist, proxy-aware client IP, per-minute/per-hour rate limits and a concurrency cap, all disabled by default. Verified locally with a public-mode server instance: preflight 204 with CORS headers for the allowed origin, 403 for other origins and invalid tokens, 429 after the per-minute limit. With `VITE_RUNTIME_URL` set, C, C++ and Java ran through it in Chrome and WebKit (output, traces, compile errors and a Java exception), while Python and JavaScript stayed in the browser. A down server showed "cloud compiler offline" with Python still working, and a restarted server (new token) was reconnected automatically. `deploy/setup.sh` was checked with `bash -n`; in a Debian 12 container the required packages resolved, the Node.js checksum verified, Caddy accepted the generated config, and the Oracle-style iptables rules for ports 80/443 were inserted before the reject rule without duplicates. Shellcheck could not be run (image download stalled), and the full script has not been executed on a real server.

**Live site results (commit `d82bfe4`).** 42 scenarios passed and 2 were skipped in Chrome and WebKit against https://sortscopea.vercel.app, using a copy of the browser suite adjusted for hosting: five-language checks limited to Python and JavaScript, the peak-memory assertion relaxed because browsers show "—", and the local-server reconnect scenario skipped. Added live checks: C/C++/Java appear as disabled "coming soon" options and cannot be selected, Pause stops playback immediately, every visible button on every page can be clicked without page errors, and no page overflows horizontally at 320, 360 or 768px.

**Note on test conditions.** One local run took 28 minutes instead of about 1 minute because the machine was overloaded (load average up to 18 from unrelated macOS processes); sorting-engine unit tests timed out at about 185 to 288 seconds each. All suites were rerun after the load dropped and passed with normal durations (unit tests about 8 seconds). The timeouts were environmental, not code failures.
