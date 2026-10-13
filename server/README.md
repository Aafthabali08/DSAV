# Isolated compiler and trace runner

The browser never executes submitted native code. A loopback-only Node API starts one disposable Docker container per run. No host workspace, Docker socket, credentials, or persistent volume is mounted into that container.

## Setup

Start Docker Desktop (or a Linux Docker daemon), then run:

```sh
npm ci
npm run runner:build
npm run dev
```

The first image build downloads compilers and debuggers and can take several minutes. `npm run dev` starts both the frontend on 127.0.0.1:7000 and the execution API on 127.0.0.1:7002. The Vite proxy makes requests same-origin. Subsequent runs reuse the image.

For a built local application:

```sh
npm run build
npm start
```

Stop the dev server first. `npm start` serves `dist/` and the API together on 127.0.0.1:7000. A static-only host can still serve the visualizer, but Code Lab needs this Docker-capable service. This service is configured for a trusted local user, not public multi-tenant code execution. Public hosting requires an authenticated, rate-limited gateway, a dedicated isolated worker host, and an origin policy appropriate to that deployment. Do not publish the Docker daemon.

## Supported runtimes

| Language | Runtime | Tracing |
|---|---|---|
| C | GCC, C17 | GDB source lines, locals and fixed arrays; step over calls |
| C++ | G++, C++17 | GDB source lines, locals, fixed arrays and supported pretty-printed STL values; step over calls |
| Python 3 | CPython 3.11 | `sys.settrace`, source lines, locals, arrays/dicts and application call frames |
| Java | OpenJDK 17 | JVM Debug Interface line steps, local variables, arrays and application call frames; use `public class Main` |
| JavaScript | Node 18 | AST-instrumented synchronous statements, lexical values and generated-code stack locations; stdin is the string `input` |

Code runs in its actual compiler/interpreter. It is not translated into a guessed sorting algorithm. There is no claim to visualize every pointer, library instruction, asynchronous task, JVM object or machine instruction. JavaScript replay explicitly rejects timers, promises, eval and dynamically generated functions. JavaScript function-stack locations refer to generated code, while the selected statement line refers to the original source. C/C++ locals can be uninitialized before their declarations execute. Snapshots are taken before the highlighted line executes. Python return events additionally capture final local state. Native function calls are stepped over, not expanded into a full instruction trace.

Collection previews cap arrays at 64 elements, mappings at 32 entries and nested depth. Character output caps at 16,000. Programs should be small, single-file educational examples. Dynamic package installation and outbound network calls are unavailable. Debugger and compilation overhead is included in elapsed time; it is not an algorithm benchmark.

## Execution limits and boundary

- Non-root uid 65534; read-only root filesystem; writable temporary `/work` and `/tmp` only.
- No network; no host mounts; capabilities dropped and no-new-privileges enabled.
- C/C++ runs receive only the additional SYS_PTRACE capability for their in-container debugger. GDB startup-through-shell remains disabled. A small preloaded constructor redirects the target's standard streams directly through `freopen`, with no shell launch.
- 512 MB memory, 1 CPU, 64 processes, 64 MB work filesystem, file size limit, source/input limits, and bounded output.
- 1,500 trace events; 12-second compile/execution phase timeouts; 25-second outer container deadline and forced cleanup.
- One active execution, same-origin checks, non-persisted per-process request token, no permissive CORS.

The runtime API returns compiler/runtime errors directly. Trace failures are shown as failures, not substituted with canned results. Unsupported or exceptionally complex data may appear as a type/reference label rather than a diagram.

## Tests

With `npm run dev` running:

```sh
npm run test:runtime
npm run test:e2e -- --workers=1
```

Run browser tests serially because the local service deliberately accepts a single active execution.

Runtime implementation references: [Python tracing API](https://docs.python.org/3/library/sys.html#sys.settrace), [Docker container constraints](https://docs.docker.com/reference/cli/docker/container/run/).

## Automatic startup and measurements

`npm run dev` now starts both services, starts Docker Desktop on macOS when necessary, and builds/reuses the compiler image automatically. Code Lab polls for readiness and reconnects without a manual refresh. Every Run obtains a fresh session token, including after an API restart. Keep this command running while using localhost. Stopping the command stops the web/API services; this is not an OS background service.

Each successful execution returns wall time, user+system CPU time, and peak resident memory from Linux `wait4`. Compilation is timed separately. The measured process includes its interpreter/debugger and trace recording. Peak RSS is the largest process high-water mark reported for that process tree, not the sum of simultaneous memory allocations and not algorithm auxiliary space. Arbitrary custom-code Big-O is not inferred from a single run. The unchanged sorting example has separately explained worst-case O(n²) sorting time and O(1) auxiliary sorting space.
