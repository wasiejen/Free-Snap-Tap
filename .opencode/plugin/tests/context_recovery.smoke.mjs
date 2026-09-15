// context_recovery.smoke.mjs — the T5 emergency context-recovery plugin
// (scratchpad origin: t5_smoke.mjs; moved per the 2026-09-15_smoke-harness-home
// proposal). Attribution verified at build time: it tests
// .opencode/plugin/deactivated/context_recovery.ts (the plugin currently
// DEACTIVATED — this smoke pins its behavior for re-activation; the import
// path was rewired from the old .opencode/plugin/context_recovery.ts).
// The activation-flag fixture is a SANDBOX opencode.jsonc (scratchpad) — the
// live repo opencode.jsonc is never read or touched by this smoke.
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

// 1) flag OFF (no opencode.jsonc) + overflow -> unhandled
const r1 = await fire({ message: "context length exceeded" }, "ses_smoke_off");
console.log("flag-off:", JSON.stringify(r1), "compact:", clientCalls.compact.length, "prompt:", clientCalls.prompt.length);
if (r1 !== undefined || clientCalls.compact.length !== 0) throw new Error("flag-off must be a no-op");

// 2) flag ON (JSONC fixture with comments) + overflow + fresh budget -> success
writeFileSync(
  path.join(SANDBOX, "opencode.jsonc"),
  "{\n  // line comment\n  \"emergencyRecovery\": true,\n  /* block */\n  \"other\": \"a // b\"\n}\n",
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
writeFileSync(path.join(SANDBOX, "opencode.jsonc"), "{\n  \"emergencyRecovery\": false\n}\n", "utf8");
const r5 = await fire({ message: "context length exceeded" }, "ses_smoke_false");
console.log("flag=false:", JSON.stringify(r5));
if (r5 !== undefined) throw new Error("flag=false must be OFF");

rmSync(SANDBOX, { recursive: true, force: true });
console.log("CONTEXT_RECOVERY_SMOKE: ALL PASS");
process.exit(0);
