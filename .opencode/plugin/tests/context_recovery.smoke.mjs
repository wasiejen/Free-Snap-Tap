// context_recovery.smoke.mjs — the T5 emergency context-recovery plugin
// (scratchpad origin: t5_smoke.mjs; moved per the 2026-09-15_smoke-harness-home
// proposal). Attribution verified at build time: it tests
// .opencode/plugin/deactivated/context_recovery.ts (the plugin currently
// DEACTIVATED — this smoke pins its behavior for re-activation; the import
// path was rewired from the old .opencode/plugin/context_recovery.ts).
// The activation-flag + keep fixture is the SANDBOX compact_budget.json
// (scratchpad — the SAME file as the shared budget store, consolidation
// 2026-09-22; moved out of opencode.jsonc) — the live repo file is never
// read or touched by this smoke.
// Run: node .opencode/plugin/tests/context_recovery.smoke.mjs (plain node, exit 0 iff green).
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { freshSandbox, loadRepo } from "./_smoke_base.mjs";

const SANDBOX = freshSandbox("context_recovery");
mkdirSync(path.join(SANDBOX, ".opencode", "temp"), { recursive: true });

const m = await loadRepo(".opencode/plugin/deactivated/context_recovery.ts");
const factory = m.default;
if (typeof factory !== "function") throw new Error("no default factory");
const clientCalls = { compact: [], prompt: [] };
const fakeClient = {
  session: {
    compact: (o) => { clientCalls.compact.push(o); return Promise.resolve({ ok: true }); },
    promptAsync: (o) => { clientCalls.prompt.push(o); return Promise.resolve({ ok: true }); },
  },
};
const hooks = await factory({ directory: SANDBOX, client: fakeClient });
if (typeof hooks["session.error"] !== "function") throw new Error("no session.error hook");
const fire = (err, sid, ctx = {}) => hooks["session.error"](err, { sessionId: sid, client: fakeClient, ...ctx });

// 1) flag OFF (no compact_budget.json) + overflow -> unhandled
const r1 = await fire({ message: "context length exceeded" }, "ses_smoke_off");
console.log("flag-off:", JSON.stringify(r1), "compact:", clientCalls.compact.length, "prompt:", clientCalls.prompt.length);
if (r1 !== undefined || clientCalls.compact.length !== 0) throw new Error("flag-off must be a no-op");

// 2) flag ON (top-level key in compact_budget.json) + overflow + fresh
// budget -> success (keep defaults 30_000/12 — the measured profile)
// the file carries the "sessions" key so the lenient store read returns the
// WHOLE object — the flag key then survives the recordSuccess write (case 3
// below must hit the BUDGET gate, not the flag gate)
writeFileSync(
  path.join(SANDBOX, ".opencode", "temp", "compact_budget.json"),
  "{\n  \"emergencyRecovery\": true,\n  \"sessions\": {}\n}\n",
  "utf8",
);
const r2 = await fire({ message: "exceeds the available context size" }, "ses_smoke_ok");
console.log("flag-on success:", JSON.stringify(r2));
console.log("compact call:", JSON.stringify(clientCalls.compact.at(-1)));
console.log("directive:", JSON.stringify(clientCalls.prompt.at(-1)?.body?.parts?.[0]?.text));
const budget = JSON.parse(readFileSync(path.join(SANDBOX, ".opencode", "temp", "compact_budget.json"), "utf8"));
console.log("budget:", JSON.stringify(budget.sessions.ses_smoke_ok));
const ctxLog = readFileSync(path.join(SANDBOX, ".opencode", "temp", "ctx.log"), "utf8");
console.log("ctxlog lines:", JSON.stringify(ctxLog.trim().split("\n")));
if (r2?.handled !== true || r2?.action !== "retry") throw new Error("must return handled+retry");
if (clientCalls.compact.at(-1)?.body?.keep?.tokens !== 30_000 || clientCalls.compact.at(-1)?.body?.keep?.messages !== 12) throw new Error("keep must be {30_000,12}");
if (budget.sessions.ses_smoke_ok?.count !== 1) throw new Error("budget must be count=1");

// 3) exhausted budget -> clean fail
budget.sessions.ses_smoke_exh = { count: 2, updated: new Date().toISOString() };
writeFileSync(path.join(SANDBOX, ".opencode", "temp", "compact_budget.json"), JSON.stringify(budget, null, 2) + "\n", "utf8");
const before = clientCalls.compact.length;
const r3 = await fire({ message: "prompt is too long" }, "ses_smoke_exh");
console.log("exhausted:", JSON.stringify(r3), "compact delta:", clientCalls.compact.length - before);
if (r3 !== undefined || clientCalls.compact.length !== before) throw new Error("exhausted must be clean fail");

// 4) non-overflow -> no-op
const r4 = await fire({ message: "unrelated error" }, "ses_smoke_non");
console.log("non-overflow:", JSON.stringify(r4));
if (r4 !== undefined) throw new Error("non-overflow must be no-op");

// 5) flag value `false` -> OFF
writeFileSync(path.join(SANDBOX, ".opencode", "temp", "compact_budget.json"), "{\n  \"emergencyRecovery\": false,\n  \"sessions\": {}\n}\n", "utf8");
const r5 = await fire({ message: "context length exceeded" }, "ses_smoke_false");
console.log("flag=false:", JSON.stringify(r5));
if (r5 !== undefined) throw new Error("flag=false must be OFF");

// 6) keep override from the SAME file (consolidation 2026-09-22): the
// configured keepTokens/keepMessages win over the measured-profile defaults
// (30_000/12) — both in the compact body and in the COMPACT line
writeFileSync(
  path.join(SANDBOX, ".opencode", "temp", "compact_budget.json"),
  "{\n  \"emergencyRecovery\": true,\n  \"keepTokens\": 45000,\n  \"keepMessages\": 5,\n  \"sessions\": {}\n}\n",
  "utf8",
);
const r6 = await fire({ message: "context length exceeded" }, "ses_smoke_keep");
console.log("keep-override:", JSON.stringify(r6));
console.log("compact call:", JSON.stringify(clientCalls.compact.at(-1)));
const ctxLog2 = readFileSync(path.join(SANDBOX, ".opencode", "temp", "ctx.log"), "utf8");
const keepLine = ctxLog2.trim().split("\n").find((l) => l.includes("COMPACT ses_smoke_keep"));
console.log("ctxlog keep line:", JSON.stringify(keepLine));
const budget6 = JSON.parse(readFileSync(path.join(SANDBOX, ".opencode", "temp", "compact_budget.json"), "utf8"));
if (r6?.handled !== true || r6?.action !== "retry") throw new Error("keep-override must return handled+retry");
if (clientCalls.compact.at(-1)?.body?.keep?.tokens !== 45_000 || clientCalls.compact.at(-1)?.body?.keep?.messages !== 5) throw new Error("keep must be the configured {45_000,5}");
if (budget6.sessions.ses_smoke_keep?.count !== 1) throw new Error("keep-override success must be count=1");
if (keepLine == null || !/tokens=45000 messages=5$/.test(keepLine)) throw new Error("COMPACT line must report the configured keep");

rmSync(SANDBOX, { recursive: true, force: true });
console.log("CONTEXT_RECOVERY_SMOKE: ALL PASS");
process.exit(0);
