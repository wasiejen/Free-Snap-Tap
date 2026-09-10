// Self-peek CLI (de-peek — TODO.md #30/#35; backend chain — #37). Thin: the
// shared gauge core (gauge.mjs) does the read — this file prints ONE line.
// No python (the gauge core reads READ-ONLY via its backend chain:
// node:sqlite → bun:sqlite → spawn sqlite3.exe — see the gauge header).
//
// Self-peek for agents (repo root):  node .opencode\plugin\scripts\peek.mjs
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
