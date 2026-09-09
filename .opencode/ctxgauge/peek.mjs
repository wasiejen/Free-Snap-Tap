// Self-peek CLI (de-peek — TODO.md #30/#35). Thin: the shared gauge core
// (gauge.mjs) does the read — this file prints ONE line. No python, no shell
// (the gauge core reads via built-in node:sqlite, read-only).
//
// Self-peek for agents (repo root):  node .opencode\ctxgauge\peek.mjs
//   ->  SESSION=ses_... CTX=61351 (61%) REM=38649     (window known)
//   ->  SESSION=ses_... CTX=18050                     (window unknown)
//   ->  SESSION=ses_... CTX=notAvailable              (no total / unreadable db)
//
// Exit 0 always (the agent consumes the line, not the exit code); stderr may
// carry the read-failure error text as an ADDITION to the line — never a stack
// trace IN PLACE OF the line.
import { readGauge, formatGauge } from "./gauge.mjs";

const r = await readGauge();
process.stdout.write(formatGauge(r) + "\n");
if (r.kind === "db-error") {
  process.stderr.write(`ctxgauge: ${r.error}\n`);
}
