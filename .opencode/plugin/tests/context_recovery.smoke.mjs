// context_recovery.smoke.mjs — the emergency context-recovery plugin
// (TODO #93: the 2026-09-25 event-hook port of the retired T5 prototype).
// It tests .opencode/plugin/context_recovery.ts (the ACTIVE plugin — the
// deactivated copy is removed) driven with a FAKE client (records every
// session.summarize / session.promptAsync / session.messages call) +
// FAKE SDK events (the current host's delivery shape: { type:
// "session.error", properties: { sessionID, error } } / { type:
// "session.idle", properties: { sessionID } } — capital-D sessionID).
// The activation-flag + keep + budget fixture is the SANDBOX
// compact_budget.json (scratchpad — the SAME file as the shared budget
// store) — the live repo file is never read or touched by this smoke.
// Run: node .opencode/plugin/tests/context_recovery.smoke.mjs (plain node, exit 0 iff green).
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { freshSandbox, loadRepo, makeChecker } from "./_smoke_base.mjs";

const { chk, finish } = makeChecker("CONTEXT_RECOVERY_SMOKE");

const SANDBOX = freshSandbox("context_recovery");
mkdirSync(path.join(SANDBOX, ".opencode", "temp"), { recursive: true });
const BUDGET = path.join(SANDBOX, ".opencode", "temp", "compact_budget.json");
const CTXLOG = path.join(SANDBOX, ".opencode", "temp", "ctx.log");
const DT = "\\d{4}-\\d{2}-\\d{2}_\\d{2}-\\d{2}";
const writeBudget = (obj) => writeFileSync(BUDGET, JSON.stringify(obj, null, 2) + "\n", "utf8");
const readBudget = () => JSON.parse(readFileSync(BUDGET, "utf8"));
const ctxLines = () => (readFileSync(CTXLOG, "utf8").trim().split("\n").filter((l) => l.length > 0));

const m = await loadRepo(".opencode/plugin/context_recovery.ts");
const factory = m.default;
if (typeof factory !== "function") throw new Error("no default factory");
const clientCalls = { summarize: [], prompt: [] };
const fakeClient = {
  session: {
    summarize: (o) => { clientCalls.summarize.push(o); return Promise.resolve(true); },
    promptAsync: (o) => { clientCalls.prompt.push(o); return Promise.resolve({ ok: true }); },
    messages: (o) => Promise.resolve([{ info: { modelID: "smoke-model", providerID: "smoke-provider" } }]),
  },
};
const hooks = await factory({ directory: SANDBOX, client: fakeClient });

const fireError = (sid, error) => hooks.event({ event: { type: "session.error", properties: { sessionID: sid, error } } });
const fireIdle = (sid) => hooks.event({ event: { type: "session.idle", properties: { sessionID: sid } } });
// The SDK's live error shape (the text lives in data.message).
const OVF = (text) => ({ name: "MessageAbortedError", data: { message: text } });

// 1) the hooks object carries the `event` hook (NO "session.error" key —
//    that hook does not exist in the current SDK)
chk(
  "hook surface: `event` hook (no \"session.error\" key)",
  typeof hooks.event === "function" && !("session.error" in hooks),
  JSON.stringify(Object.keys(hooks)),
);

// 2) a non-error event is ignored (no client call)
{
  const before = { s: clientCalls.summarize.length, p: clientCalls.prompt.length };
  await hooks.event({ event: { type: "file.edited", properties: { file: "x" } } });
  chk(
    "non-error event ignored",
    clientCalls.summarize.length === before.s && clientCalls.prompt.length === before.p,
    JSON.stringify({ ds: clientCalls.summarize.length - before.s, dp: clientCalls.prompt.length - before.p }),
  );
}

// 3) flag OFF (no budget file) + overflow → no-op (no summarize, no
//    promptAsync, no budget entry)
{
  const before = { s: clientCalls.summarize.length, p: clientCalls.prompt.length };
  const res = await fireError("ses_smoke_off", OVF("context length exceeded"));
  chk(
    "flag-off no-op",
    res === undefined && clientCalls.summarize.length === before.s && clientCalls.prompt.length === before.p,
    JSON.stringify({ res, ds: clientCalls.summarize.length - before.s, dp: clientCalls.prompt.length - before.p }),
  );
}

// 4) flag ON + overflow + fresh budget → success: the summarize body
//    carries the MESSAGES-RESOLVED fallback pair (no sandbox
//    opencode.jsonc) + keep { messages: 12 } (the fail-open default — no
//    keep key in the fixture; NO tokens key — spec 01), the directive
//    BYTE-MATCHES the ported constant (synthetic text part), the budget
//    carries count==1 ON DISK (model recorded), and the COMPACT line
//    `<stamp> smoke-model COMPACT ses_smoke_ok messages=12`
{
  writeBudget({ version: 2, emergencyRecovery: true, sessions: {} });
  const before = { s: clientCalls.summarize.length, p: clientCalls.prompt.length };
  await fireError("ses_smoke_ok", OVF("request (148149 tokens) exceeds the available context size (131072 tokens)"));
  const sc = clientCalls.summarize.at(-1);
  const pc = clientCalls.prompt.at(-1);
  const budget = readBudget();
  const okLine = ctxLines().find((l) => l.includes("COMPACT ses_smoke_ok"));
  chk(
    "flag-on success: pair + keep (no tokens key)",
    clientCalls.summarize.length === before.s + 1 && sc?.path?.id === "ses_smoke_ok" &&
      sc?.body?.providerID === "smoke-provider" && sc?.body?.modelID === "smoke-model" &&
      sc?.body?.keep?.messages === 12 && sc?.body?.keep?.tokens === undefined,
    JSON.stringify(sc),
  );
  chk(
    "directive byte-exact (the ported constant, synthetic text part)",
    clientCalls.prompt.length === before.p + 1 && pc?.path?.id === "ses_smoke_ok" &&
      pc?.body?.parts?.length === 1 && pc?.body?.parts?.[0]?.type === "text" && pc?.body?.parts?.[0]?.synthetic === true &&
      pc?.body?.parts?.[0]?.text ===
        "post-compaction: re-read your head files per .opencode/agent/prompts/agent_readme_post_compaction.md and CONTINUE — never re-plan from scratch",
    JSON.stringify(pc?.body?.parts?.[0]?.text),
  );
  chk(
    "budget count==1 on disk (model recorded)",
    budget.sessions.ses_smoke_ok?.count === 1 && budget.sessions.ses_smoke_ok?.model === "smoke-model",
    JSON.stringify(budget.sessions.ses_smoke_ok),
  );
  chk(
    "COMPACT line `<dt> smoke-model COMPACT ses_smoke_ok messages=12`",
    okLine != null && new RegExp(`^${DT} smoke-model COMPACT ses_smoke_ok messages=12$`).test(okLine),
    JSON.stringify(okLine),
  );
}

// 5) the once-per-overflow guard: the host's 4-event burst (the internal
//    tail-strip retries — measured 2026-09-23) → exactly ONE compact
//    (the first fire); the 3 follow-ups are no-ops, the budget UNCHANGED
{
  const before = { s: clientCalls.summarize.length, p: clientCalls.prompt.length };
  for (let i = 0; i < 3; i++) await fireError("ses_smoke_ok", OVF("exceeds the available context size"));
  const budget = readBudget();
  chk(
    "once-guard: 3 more burst events → no-op (exactly ONE compact total)",
    clientCalls.summarize.length === before.s && clientCalls.prompt.length === before.p && budget.sessions.ses_smoke_ok?.count === 1,
    JSON.stringify({ ds: clientCalls.summarize.length - before.s, dp: clientCalls.prompt.length - before.p, count: budget.sessions.ses_smoke_ok?.count }),
  );
}

// 6) EventSessionIdle clears the guard: after the idle, the next overflow
//    fires again — now the EMERGENCY slot (count 1 == cap 1, the model
//    is UNLISTED → model_budget default 1): summarize again, count → 2,
//    the COMPACT line carries the ` emergency` suffix
{
  await fireIdle("ses_smoke_ok");
  const before = { s: clientCalls.summarize.length, p: clientCalls.prompt.length };
  await fireError("ses_smoke_ok", OVF("exceeds the available context size"));
  const budget = readBudget();
  const emgLine = ctxLines().find((l) => l.includes("COMPACT ses_smoke_ok") && l.includes(" emergency"));
  chk(
    "idle clears the guard (the emergency slot: count 1 == cap 1)",
    clientCalls.summarize.length === before.s + 1 && clientCalls.prompt.length === before.p + 1 &&
      budget.sessions.ses_smoke_ok?.count === 2 &&
      emgLine != null && new RegExp(`^${DT} smoke-model COMPACT ses_smoke_ok messages=12 emergency$`).test(emgLine),
    JSON.stringify({ ds: clientCalls.summarize.length - before.s, count: budget.sessions.ses_smoke_ok?.count, line: emgLine }),
  );
}

// 7) budget exhausted (count 2 > cap 1) → CLEAN FAIL: after the idle,
//    the overflow → no summarize, no promptAsync, NO new COMPACT line,
//    the budget UNCHANGED (the looping agent is stopped by the budget,
//    not healed)
{
  await fireIdle("ses_smoke_ok");
  const before = { s: clientCalls.summarize.length, p: clientCalls.prompt.length };
  const linesBefore = ctxLines().filter((l) => l.includes("COMPACT ses_smoke_ok")).length;
  await fireError("ses_smoke_ok", OVF("prompt is too long"));
  const budget = readBudget();
  const linesAfter = ctxLines().filter((l) => l.includes("COMPACT ses_smoke_ok")).length;
  chk(
    "exhausted clean fail (count 2 > cap 1)",
    clientCalls.summarize.length === before.s && clientCalls.prompt.length === before.p &&
      budget.sessions.ses_smoke_ok?.count === 2 && linesAfter === linesBefore,
    JSON.stringify({ ds: clientCalls.summarize.length - before.s, count: budget.sessions.ses_smoke_ok?.count, newLines: linesAfter - linesBefore }),
  );
}

// 8) flag ON + NON-overflow error → NO-OP: no summarize, no promptAsync,
//    no budget entry (the overflow marker gate comes first — in-memory,
//    so a non-overflow error never touches the fs)
{
  writeBudget({ version: 2, emergencyRecovery: true, sessions: {} });
  const before = { s: clientCalls.summarize.length, p: clientCalls.prompt.length };
  await fireError("ses_smoke_non", OVF("connection refused: unrelated transport error"));
  const budget = readBudget();
  chk(
    "non-overflow no-op",
    clientCalls.summarize.length === before.s && clientCalls.prompt.length === before.p && budget.sessions.ses_smoke_non == null,
    JSON.stringify({ ds: clientCalls.summarize.length - before.s, dp: clientCalls.prompt.length - before.p }),
  );
}

// 9) flag value `false` → OFF (missing file / missing key / any other
//    value / unparseable — only strictly `true` enables)
{
  writeBudget({ version: 2, emergencyRecovery: false, sessions: {} });
  const before = { s: clientCalls.summarize.length, p: clientCalls.prompt.length };
  await fireError("ses_smoke_false", OVF("context length exceeded"));
  chk(
    "flag=false OFF",
    clientCalls.summarize.length === before.s && clientCalls.prompt.length === before.p,
    JSON.stringify({ ds: clientCalls.summarize.length - before.s, dp: clientCalls.prompt.length - before.p }),
  );
}

// 10) the keep override: keepMessages 7 in the budget file (keepTokens
//     REMOVED — spec 01: never read, never defaulted, never sent) → the
//     summarize body keep { messages: 7 } (NO tokens key) + the COMPACT
//     line `messages=7`
{
  writeBudget({ version: 2, emergencyRecovery: true, keepMessages: 7, sessions: {} });
  const before = { s: clientCalls.summarize.length, p: clientCalls.prompt.length };
  await fireError("ses_smoke_keep", OVF("context length exceeded"));
  const budget = readBudget();
  const keepLine = ctxLines().find((l) => l.includes("COMPACT ses_smoke_keep"));
  chk(
    "keep override (keepMessages 7 — no tokens key)",
    clientCalls.summarize.at(-1)?.path?.id === "ses_smoke_keep" &&
      clientCalls.summarize.at(-1)?.body?.keep?.messages === 7 && clientCalls.summarize.at(-1)?.body?.keep?.tokens === undefined &&
      budget.sessions.ses_smoke_keep?.count === 1 &&
      keepLine != null && new RegExp(`^${DT} smoke-model COMPACT ses_smoke_keep messages=7$`).test(keepLine),
    JSON.stringify({ keep: clientCalls.summarize.at(-1)?.body?.keep, line: keepLine }),
  );
}

// 11) the config pair override: the sandbox opencode.jsonc
//     agent.compaction.model → the summarize body carries the CONFIG
//     pair (over the messages-resolved fallback) + the COMPACT line's
//     model field — the file is removed afterwards
{
  const CFGP = path.join(SANDBOX, "opencode.jsonc");
  writeBudget({ version: 2, emergencyRecovery: true, sessions: {} });
  writeFileSync(CFGP, `{\n  "agent": { "compaction": { "model": "cfgprov/cfgmodel" } }\n}`, "utf8");
  const before = { s: clientCalls.summarize.length, p: clientCalls.prompt.length };
  await fireError("ses_smoke_cfg", OVF("context length exceeded"));
  rmSync(CFGP, { force: true });
  const budget = readBudget();
  const cfgLine = ctxLines().find((l) => l.includes("COMPACT ses_smoke_cfg"));
  chk(
    "config pair override (the sandbox opencode.jsonc agent.compaction.model)",
    clientCalls.summarize.length === before.s + 1 &&
      clientCalls.summarize.at(-1)?.path?.id === "ses_smoke_cfg" &&
      clientCalls.summarize.at(-1)?.body?.providerID === "cfgprov" && clientCalls.summarize.at(-1)?.body?.modelID === "cfgmodel" &&
      budget.sessions.ses_smoke_cfg?.count === 1 && budget.sessions.ses_smoke_cfg?.model === "cfgmodel" &&
      cfgLine != null && new RegExp(`^${DT} cfgmodel COMPACT ses_smoke_cfg messages=12$`).test(cfgLine),
    JSON.stringify({ body: clientCalls.summarize.at(-1)?.body, line: cfgLine }),
  );
}

// 12) an UNRESOLVABLE model pair (a client with no session.messages) →
//     the request is NOT sent: no summarize, no promptAsync, no budget
//     entry, no COMPACT line (CLEAN FAIL — the v1 body REQUIRES
//     providerID + modelID)
{
  writeBudget({ version: 2, emergencyRecovery: true, sessions: {} });
  const bareClient = {
    session: {
      summarize: (o) => { clientCalls.summarize.push(o); return Promise.resolve(true); },
      promptAsync: (o) => { clientCalls.prompt.push(o); return Promise.resolve({ ok: true }); },
    },
  };
  const hooks2 = await factory({ directory: SANDBOX, client: bareClient });
  const before = { s: clientCalls.summarize.length, p: clientCalls.prompt.length };
  await hooks2.event({ event: { type: "session.error", properties: { sessionID: "ses_smoke_nomodel", error: OVF("context length exceeded") } } });
  const budget = readBudget();
  chk(
    "unresolvable pair clean fail (no session.messages)",
    clientCalls.summarize.length === before.s && clientCalls.prompt.length === before.p &&
      budget.sessions.ses_smoke_nomodel == null && !ctxLines().some((l) => l.includes("COMPACT ses_smoke_nomodel")),
    JSON.stringify({ ds: clientCalls.summarize.length - before.s, dp: clientCalls.prompt.length - before.p }),
  );
}

rmSync(SANDBOX, { recursive: true, force: true });
finish();
