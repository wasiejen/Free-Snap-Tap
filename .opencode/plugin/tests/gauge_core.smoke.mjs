// gauge_core.smoke.mjs — the gauge core parseWindow/parseModelId fixtures
// (scratchpad origin: pw_test.mjs, moved per the 2026-09-15_smoke-harness-home
// proposal; the old `.opencode/ctxgauge/gauge.mjs` reference is rewired to the
// current location `.opencode/plugin/scripts/gauge.mjs`) + the item 3
// (2026-09-24) "N compactions left" budget suffix (the 3 states + fail-open
// — the budget store steered at temp fixtures via setBudgetFileForTest).
// Run: node .opencode/plugin/tests/gauge_core.smoke.mjs (plain node, exit 0 iff green).
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { loadRepo } from "./_smoke_base.mjs";

const m = await loadRepo(".opencode/plugin/scripts/gauge.mjs");
const cases = [
  ["Qwen3.8-27B-IQ4KT-100K", 100_000],
  ["Qwen3.8-27B-IQ3KT-120K_MTP", 120_000],
  ["Qwen3.8-27B-IQ3KT-120K_MTP:chat", 120_000],
  ["some-model_210K", 210_000],
  ["some-model_120K-MTP", 120_000],
  ["x-256K", 256_000],
  ["x-1.5M", 1_500_000],
  ["CPU-Qwen3-0.6B", undefined],
  ["no-suffix-at-all", undefined],
  [null, undefined],
  [42, undefined],
];
let fail = 0;
for (const [inp, want] of cases) {
  const got = m.parseWindow(inp);
  const ok = got === want;
  if (!ok) fail++;
  console.log(`${ok ? "PASS" : "FAIL"} parseWindow(${JSON.stringify(inp)}) = ${got} (want ${want})`);
}
console.log("parseModelId JSON:", m.parseModelId('{"id":"Qwen3.8-27B-IQ4KT-100K","providerID":"llama-swap"}'));
console.log("parseModelId plain:", m.parseModelId("plain-id"));
console.log("parseModelId bad:", JSON.stringify(m.parseModelId("{not-json")));

// ---- item 3 (2026-09-24): the "N compactions left" budget suffix — the 3
// states + fail-open. remaining = max(0, cap - count) + 1 iff the emergency
// 1 is still available (count === cap && effective emergency_budget >= 1 —
// key absent → fail-open default 1). The cap resolves like compact_memory's
// resolveCap (exact bare-model-id key, else default, else 1). The store is
// steered at temp fixtures (the setBudgetFileForTest hook).
const tmpB = fs.mkdtempSync(path.join(os.tmpdir(), "gauge_budget_"));
const bfx = path.join(tmpB, "budget.json");
const MB3 = { "probe-model-256K_MTP": 3, default: 1 };
const wb = (count, eb) => {
  const rec = { model_budget: MB3, sessions: { ses_fx_ok: { count, updated: "fx", model: "probe-model-256K_MTP" } } };
  if (eb !== undefined) rec.emergency_budget = eb;
  fs.writeFileSync(bfx, JSON.stringify(rec), "utf-8");
  m.setBudgetFileForTest(bfx);
};
const R_OK = { ok: true, kind: "ok", sid: "ses_fx_ok", modelId: "probe-model-256K_MTP", total: 12345, output: 2345, ctx: 10000, window: 256000 };
const R_NOTAL = { ok: false, kind: "no-total", sid: "ses_fx_ok", modelId: "" };
const base = "SESSION=ses_fx_ok CTX=10000 (3%) REM=246000";
const chkS = (label, want) => {
  const got = m.formatGauge(R_OK);
  const ok = got === want;
  if (!ok) fail++;
  console.log(`${ok ? "PASS" : "FAIL"} ${label}: ${got} (want ${want})`);
};
wb(0);
chkS("state 1 (count 0 < cap 3)", `${base} | 3 compactions left`);
wb(3);
chkS("state 2 (count === cap, emergency key ABSENT → default 1)", `${base} | 1 compaction left`);
wb(4);
chkS("state 3 (count 4 > cap 3 — fully exhausted)", `${base} | 0 compactions left`);
wb(3, 0);
chkS("state 2b (count === cap, emergency_budget 0 explicit)", `${base} | 0 compactions left`);
m.setBudgetFileForTest(path.join(tmpB, "absent.json")); // never created
chkS("fail-open (budget file missing → no suffix)", base);
wb(0);
{
  const got = m.formatGauge(R_NOTAL);
  const want = "SESSION=ses_fx_ok CTX=notAvailable | 3 compactions left";
  const ok = got === want; // the no-total read falls back to the entry's model
  if (!ok) fail++;
  console.log(`${ok ? "PASS" : "FAIL"} no-total (modelId '' → entry-model fallback): ${got} (want ${want})`);
}
fs.rmSync(tmpB, { recursive: true, force: true });

console.log(fail === 0 ? "GAUGE_CORE_SMOKE: ALL PASS" : `GAUGE_CORE_SMOKE: ${fail} FAILURES`);
process.exit(fail === 0 ? 0 : 1);
