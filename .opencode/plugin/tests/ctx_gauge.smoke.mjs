// ctx_gauge.smoke.mjs — the ctx_gauge tool (scratchpad origin:
// ctx_gauge_smoke.mjs, T2 smoke; moved per the 2026-09-15_smoke-harness-home
// proposal). LIVE smoke: check (1) compares the child-process peek.mjs
// readout against the in-process tool readout of the SAME live db state
// (the gauge reads finished steps only — the db cannot change between the
// two reads within this window).
// - (2) no-arg live read is well-formed: `SESSION=… CTX=…` (with pct/REM or
//   the notAvailable form)
// - (3) db-error path (setDbPath to a nonexistent path, in-process): NO
//   throw, the line is NEVER replaced — `CTX=notAvailable` + the appended
//   ` — <error>` note
// Run: node .opencode/plugin/tests/ctx_gauge.smoke.mjs (plain node, exit 0 iff green).
import { execFileSync } from "node:child_process";
import path from "node:path";
import { REPO_ROOT, loadRepo, makeChecker } from "./_smoke_base.mjs";

const cgTool = (await loadRepo(".opencode/tools/ctx_gauge.ts")).default;
const gauge = await loadRepo(".opencode/plugin/scripts/gauge.mjs");
const { chk, finish } = makeChecker("CTX_GAUGE_SMOKE");

// (1) + (2) — live db: peek.mjs (child) vs the tool (in-process)
const peekOut = execFileSync("node", [path.join(REPO_ROOT, ".opencode", "plugin", "scripts", "peek.mjs")], {
  cwd: REPO_ROOT, encoding: "utf8",
}).trim();
const live = await cgTool.execute({}, {});
chk("live-byte-identity (tool vs peek.mjs child)", live === peekOut, `tool=${JSON.stringify(live)} peek=${JSON.stringify(peekOut)}`);
chk("live-wellformed", /^SESSION=\S+ CTX=(\d+|notAvailable)( \(\d+%\))?/.test(live), live);

// (3) — db-error: in-process steer to a nonexistent path (restored after)
const before = gauge.getDbPath();
gauge.setDbPath(path.join(REPO_ROOT, "definitely_missing_fx.db"));
let threw = false, errRes = "";
try {
  errRes = await cgTool.execute({}, {});
} catch (e) {
  threw = true;
  errRes = String(e?.message ?? e);
} finally {
  gauge.setDbPath(before);
}
chk("db-error-inband (no throw, line not replaced, error appended)",
  !threw && errRes.startsWith("SESSION=unknown CTX=notAvailable — ") && errRes.length > "SESSION=unknown CTX=notAvailable — ".length,
  errRes);

finish();
