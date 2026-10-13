export function diagnostic(result) {
  const message = String(result.error || "");
  const phase =
    result.phase === "compile"
      ? "Compilation failed"
      : result.phase === "syntax"
        ? "Syntax error"
        : result.phase === "service"
          ? "Execution service error"
          : "Execution failed";
  const match =
    message.match(/(?:main\.(?:c|cpp|py)|Main\.java):(\d+)(?::(\d+))?/i) ||
    message.match(/File ["'][^"']*main\.py["'], line (\d+)/) ||
    message.match(/\((\d+):(\d+)\)/);
  const line = Number(result.errorLine || match?.[1]) || null;
  return { title: phase, message, line };
}
