// gauge_core.smoke.mjs — the gauge core parseWindow/parseModelId fixtures
// (scratchpad origin: pw_test.mjs, moved per the 2026-09-15_smoke-harness-home
// proposal; the old `.opencode/ctxgauge/gauge.mjs` reference is rewired to the
// current location `.opencode/plugin/scripts/gauge.mjs`).
// Run: node .opencode/plugin/tests/gauge_core.smoke.mjs (plain node, exit 0 iff green).
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
console.log(fail === 0 ? "GAUGE_CORE_SMOKE: ALL PASS" : `GAUGE_CORE_SMOKE: ${fail} FAILURES`);
process.exit(fail === 0 ? 0 : 1);
