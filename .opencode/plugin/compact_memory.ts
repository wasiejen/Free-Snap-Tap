// compact_memory — the plugin-registered compaction tool (the THIN
// ENTRY-POINT WRAPPER — 2026-09-26 unification Part A:
// .opencode/proposals/approved/2026-09-26_compaction-unification.md).
//
// The shared compaction behavior (the config reader, the budget store +
// cap resolver, the keepTokens resolution (#99), the summarizer-pair
// resolution CARRYING THE SESSION'S OWN providerID + modelID (the
// 2026-09-26_14-26 incident fix), the v1 summarize call, the COMPACT-line
// writer, the verified-success handling, the shared failure helpers)
// lives in the shared core module ./compaction_core.ts — a PURE module
// (NO tool registration — the T5 constraint, satisfied the way
// intercept_observer_core.ts already does for the observer). This file
// keeps ONLY the tool-specific surface:
//   - tool registration + arg validation + SELF/CROSS routing (explicit
//     sessionID → ANOTHER session; absent → the calling session);
//   - the budget gate + the EMERGENCY-1 arg (denial → the hand-over note —
//     ZERO side effects: no increment, no compact call, no COMPACT line;
//     at count == cap the `emergency` arg consumes the configured
//     emergency_budget 1, count → cap+1; count > cap = fully exhausted);
//   - the v2 session.compact dispatch path (fire-and-forget, NO await —
//     the generated v2 types mark the options body `never`, no keep
//     fields);
//   - the pre-compaction dump hook (TODO #152: the corpus dump before ANY
//     dispatch — the DUMP-OK/RETRY/FAIL lines, no-overwrite naming, ONE
//     retry, 120 s spawn budget);
//   - the queued-message path (the `message` arg is STORED at queue time —
//     one per-session file under .opencode/temp/ — and delivered as the
//     FIRST message on the compacted session's next resume by the
//     auto_resume unit-4 CONTINUE relay; NO promptAsync at queue time —
//     the maintainer's temp fix 0f192e5 stays gone — spec 2+11, 526e7e1);
//   - the dispatch response (NEVER a success claim — the budget increment
//     + the COMPACT line land ONLY in the verified-success callback).
//
// Pinned history (the v2 build, 2026-09-12 proposal — carried for the
// pinned behavior): the budget store is the v2 schema ({ count, updated,
// model } per session, INCREMENT-ON-SUCCESS only); the cap is resolved AT
// CALL TIME from the budget file's model_budget map (bare model id → cap;
// unlisted / typo'd → model_budget.default, else 1; CPU models stay cap 0
// — the SAFETY INVARIANT); the client on this build is v1-generation
// (session.summarize; session.compact is undefined) — the body MUST carry
// providerID + modelID (REQUIRED by the server payload schema — an
// unresolvable pair → the request is NOT sent, no budget burned); keep
// fields go in the body WHEN GIVEN; on a 404/missing-key/unexpected-field
// rejection the call is retried ONCE without the keep fields.
//
// Self-location depth: this file lives at <root>/.opencode/plugin/
// compact_memory.ts (the root fallback is the core's SELF_ROOT).

import { appendFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { tool } from "@opencode-ai/plugin";
import {
  budgetCount,
  callSummarize,
  compactionFailure,
  localStamp,
  computeKeepTokens,
  readCompactionConfig,
  readRootConfigContent,
  recordVerifiedSuccess,
  resolveCap,
  resolveCompactionModel,
  resolveModel,
  resolveRoot,
} from "./compaction_core.ts";

// Re-exports for the smoke / probe (the import surface moved to the core —
// the entries stay pinned AT THE ENTRY POINT):
export {
  computeKeepTokens,
  readCompactionConfig,
  resolveCap,
  resolveCompactionModel,
  stripJsoncComments,
} from "./compaction_core.ts";

// The temp dir under the root (the dump hook + the queued-message store
// keep their own fs writes in the tool — the core's budget/ctx.log writes
// share the same dir, resolved through the core).
function tempDir(root: string): string {
  return path.join(root, ".opencode", "temp");
}

// ------------------------------------------------------------------ the pre-compaction dump hook
//
// TODO #152 (the "dump function" entry, approved 2026-09-15): before ANY
// compaction dispatch, dump the target session's FULL pre-compaction content
// into the corpus (`.opencode/archive/sessions/`) so the corpus stays complete
// for compacted sessions. The dump is the repo script
// `.opencode/agent/scripts/db/dump_session.cjs <sid> --out <relpath>` (the
// script opens the LIVE host DB `readOnly:true` — it is NEVER written). The
// hook is BEST-EFFORT: it NEVER throws and NEVER blocks the tool — a failure
// appends a DUMP-FAIL line to the ctx log and the dispatch response carries a
// WARNING (the response is UNCHANGED on success — smoke stability).
//
// NO-OVERWRITE naming (the maintainer's --comment): dumps of the same session
// id across compactions are keyed on the tracked compaction budget count
// (`compaction_dumps/<sid>_c<count>.md`); if that exact file already exists on
// disk, a timestamp suffix is added (`..._<YYYYMMDDTHHmmss>.md`) so one dump
// never overwrites another.

// The dump stamp `YYYYMMDDTHHmmss` — computed by the CALLER so the name
// function stays pure / clock-free (the probe pins it byte-exact).
function dumpStamp(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}T${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

// The pure dump-file NAME (no clock inside): `compaction_dumps/<sid>_c<count>.md`,
// or `compaction_dumps/<sid>_c<count>_<stamp>.md` when a stamp is supplied (the
// no-overwrite fallback). Exported for the probe (byte-exact pinning).
export function preCompactionDumpName(sessionID: string, count: number, stamp: string | null): string {
  const core = `compaction_dumps/${sessionID}_c${count}`;
  return stamp != null ? `${core}_${stamp}.md` : `${core}.md`;
}

// Best-effort append of a DUMP-OK line to the ctx log (unit A, 2026-09-21;
// #78: the elapsed-ms field gained the `ms=` prefix): same local-stamp
// prefix style as the DUMP-FAIL line —
// `<stamp> DUMP-OK <sid> <relfile> ms=<ms>` (relfile = the corpus-relative
// dump path, ms = elapsed milliseconds). Never throws.
function appendDumpOkLine(root: string, sessionID: string, relFile: string, ms: number): void {
  try {
    const dir = tempDir(root);
    mkdirSync(dir, { recursive: true });
    const p = path.join(dir, "ctx.log");
    appendFileSync(p, `${localStamp()} DUMP-OK ${sessionID} ${relFile} ms=${ms}\n`, "utf8");
  } catch {
    // best effort — never break the tool over a write failure
  }
}

// Best-effort append of a DUMP-RETRY= line to the ctx log (#78: the ONE dump
// retry — the first attempt failed, a second spawn is tried): same local-
// stamp prefix style —
// `<stamp> DUMP-RETRY=1 <sid> ms=<ms> err=<one-line error>`. Never throws.
function appendDumpRetryLine(root: string, sessionID: string, ms: number, error: string): void {
  try {
    const dir = tempDir(root);
    mkdirSync(dir, { recursive: true });
    const p = path.join(dir, "ctx.log");
    const oneLine = String(error).replace(/\s+/g, " ").trim();
    appendFileSync(p, `${localStamp()} DUMP-RETRY=1 ${sessionID} ms=${ms} err=${oneLine}\n`, "utf8");
  } catch {
    // best effort — never break the tool over a write failure
  }
}

// Best-effort append of a DUMP-FAIL line to the ctx log (same append style as
// appendCompactLine — never throws).
function appendDumpFailLine(root: string, sessionID: string, error: string): void {
  try {
    const dir = tempDir(root);
    mkdirSync(dir, { recursive: true });
    const p = path.join(dir, "ctx.log");
    const oneLine = String(error).replace(/\s+/g, " ").trim();
    appendFileSync(p, `${localStamp()} DUMP-FAIL ${sessionID} ${oneLine}\n`, "utf8");
  } catch {
    // best effort — never break the tool over a write failure
  }
}

// Resolves the node executable for the dump-script spawn. The live opencode
// host's execPath is the CLI binary, not a node runtime; a wrong spawn fails
// the dump safely (WARNING) but the corpus dump would never happen. Plain
// node runtimes (node / node.exe / nodejs.exe) pass through untouched;
// anything else falls back to "node" (resolved from PATH — on Windows
// PATHEXT finds node.exe). Exported for the smoke checks.
export function resolveNodeExe(execPath: string = process.execPath): string {
  const base = path.basename(execPath).toLowerCase();
  return base.startsWith("node") ? execPath : "node";
}

// The hook: run the dump script for the target session. Returns { ok, file } on
// success or { ok:false, error } on ANY failure (NEVER throws, NEVER blocks).
// The no-overwrite rule: if the base-name target already exists on disk, the
// name is STAMPED so this dump lands in a fresh file. #78: 120 s spawn budget
// (was 60 s), `stdio: "pipe"` stderr capture (was "ignore"), and ONE retry —
// the live DUMP-FAIL ETIMEDOUT was a spawn-level stall (measured dump
// wall-times 64–87 ms), so the retry + the captured stderr trace the root cause.
export function preCompactionDump(root: string, sessionID: string, count: number): { ok: boolean; file?: string; error?: string } {
  const scriptPath = path.join(root, ".opencode", "agent", "scripts", "db", "dump_session.cjs");
  const archiveDir = path.join(root, ".opencode", "archive", "sessions");
  const baseName = preCompactionDumpName(sessionID, count, null);
  const baseTarget = path.join(archiveDir, baseName);
  const stamp = existsSync(baseTarget) ? dumpStamp() : null;
  const name = preCompactionDumpName(sessionID, count, stamp);
  const target = path.join(archiveDir, name);
  const first = runDumpSpawn(scriptPath, sessionID, name);
  if (first.error == null) {
    appendDumpOkLine(root, sessionID, name, first.ms);
    return { ok: true, file: target };
  }
  // #78: ONE retry — the DUMP-RETRY= line records the first failure, then the
  // second spawn gets a full budget of its own.
  appendDumpRetryLine(root, sessionID, first.ms, first.error);
  const second = runDumpSpawn(scriptPath, sessionID, name);
  if (second.error == null) {
    appendDumpOkLine(root, sessionID, name, second.ms);
    return { ok: true, file: target };
  }
  const detail = dumpFailDetail(second);
  appendDumpFailLine(root, sessionID, detail);
  return { ok: false, error: detail };
}

// The fixed dump-spawn budget (#78: raised from 60 s to 120 s — measured dump
// wall-times are 64–87 ms, so the live DUMP-FAIL is a spawn-level stall, not
// budget exhaustion; the raise is cheap insurance).
const DUMP_SPAWN_TIMEOUT_MS = 120_000;

// One dump-spawn attempt. `stdio: "pipe"` (#78: was "ignore" in unit A — the
// pipe capture is what lets a DUMP-FAIL carry the child's stderr; the child
// writes one stdout line + repo files, so no pipe-buffer risk at the
// measured tens-of-ms dump cost). NEVER throws: returns the elapsed ms, and
// on failure the error text + the captured stderr.
function runDumpSpawn(scriptPath: string, sessionID: string, name: string): { ms: number; error?: string; stderr?: string } {
  const t0 = Date.now();
  try {
    execFileSync(resolveNodeExe(), [scriptPath, sessionID, "--out", name], { timeout: DUMP_SPAWN_TIMEOUT_MS, stdio: "pipe" });
    return { ms: Date.now() - t0 };
  } catch (err: any) {
    const stderr = err?.stderr != null ? String(err.stderr) : "";
    const error =
      typeof err?.message === "string" && err.message !== "" ? err.message : err != null ? String(err) : "dump script failed";
    return { ms: Date.now() - t0, error, stderr };
  }
}

// The DUMP-FAIL detail (#78): the error text + the child's captured stderr
// (each one-lined, joined) — unit A's `stdio: "ignore"` swallowed the stderr,
// leaving a stall with no trace.
function dumpFailDetail(r: { ms: number; error?: string; stderr?: string }): string {
  const error = r.error ?? "dump script failed";
  const stderr = (r.stderr ?? "").replace(/\s+/g, " ").trim();
  return stderr !== "" ? `${error} | stderr: ${stderr}` : error;
}

// The queued continuation message (unit A, 2026-09-21 → the item-2 relay,
// 2026-09-24): when `message` is non-empty, AFTER the compaction dispatch
// (the void path — no await anywhere) the message is STORED — one
// per-session file under .opencode/temp/ (the relay's source) — and is
// delivered at RESUME time by the auto_resume plugin's unit-4 CONTINUE
// relay: the stored message is the FIRST message of the resumed turn,
// followed by the one-line post-compaction addendum. NO promptAsync at
// queue time — the maintainer's temp fix 0f192e5 (2026-09-22) disabled
// delivery stays gone; the relay is "the way" (it never interferes with
// the compaction — it fires only on the session's next resume). The
// dispatch response gains the queued note (UNCHANGED — the relay makes it
// true now). Best-effort persistence — a write failure never fails the
// tool.
function queuedMessagePath(root: string, sessionID: string): string {
  return path.join(tempDir(root), `compact_message_${sessionID}`);
}

function storeMessage(root: string, sessionID: string, message: string): void {
  try {
    mkdirSync(tempDir(root), { recursive: true });
    writeFileSync(queuedMessagePath(root, sessionID), message, "utf8");
  } catch {
    // best effort — a persistence hiccup never fails the tool
  }
}

function queueMessage(root: string, sessionID: string, message: unknown, dispatch: string, modelNote: string): string {
  let body = dispatch;
  if (typeof message === "string" && message !== "") {
    storeMessage(root, sessionID, message);
    body += `\nThe message was queued for ${sessionID} (delivered on its resume).`;
  }
  return modelNote !== "" ? `${body}\n${modelNote}` : body;
}

// ------------------------------------------------------------------ the plugin
export default async function CompactMemoryPlugin(ctx: any) {
  return {
    tool: {
      compact_memory: tool({
        description: "Compacts a session to free context space. Two paths: SELF (sessionID omitted) — your own session ENDS after the compaction; you resume from committed files via the post-compaction protocol. CROSS (explicit sessionID) — a fire-and-forget dispatch: it returns immediately and never blocks (an await would deadlock on the single llama-swap model slot); success is verified ASYNCHRONOUSLY — the budget increment + the COMPACT line in .opencode/temp/ctx.log land ONLY on verified success, and a failed dispatch burns NO budget. The budget is per TARGET session, per model — the cap comes from the compact_budget.json model_budget map (bare model id → cap; unlisted models get the configured default; CPU models denied — cap 0). The total budget per session is the cap + ONE emergency compaction: once the normal cap is drained, the `emergency` arg may consume the 1 (count → cap+1 = fully exhausted). Use it at the stop line / near-limit triage (self) or before a task_id resume of a session that died at its limit (cross); do NOT use it as a restart substitute — the recent head stays INTACT and a summary of the dropped tail is auto-created. The summarizer model pair is NOT an argument: it resolves from the root opencode.jsonc agent.compaction.model when set, else from the compacting session's own model.",
        args: {
          sessionID: tool.schema.string().optional().describe("Session to compact. Omit = your own session (the SELF path). An explicit id = ANOTHER session (the CROSS fire-and-forget path)."),
          keepMessages: tool.schema.number().optional().describe("Recent messages to retain (e.g. 18) — drives a keepTokens computation at dispatch time: the token size of the last N messages is sent as keep.tokens in the summarize body (the host retains the token budget, not the count); the budget file's keepTokens is the fallback when the read fails or the sum is 0."),
           message: tool.schema.string().optional().describe("Post-compaction continuation message (1-3 lines: what to resume + which files to re-read) — stored at queue time (one per-session file under .opencode/temp/) and delivered as the FIRST message on the compacted session's next resume by the auto-resume relay (never awaited). ABSENT → nothing is queued."),
          emergency: tool.schema.boolean().optional().describe("Consumes the once-per-session emergency compaction (allowed only when the normal budget is exhausted). Omit = a normal compaction."),
        },
        async execute(args: any, c: any) {
          try {

            //--comment my first try at java script ... i am frustrated with this progamming lanuage - why not clean python!
            // // 1. resolve the session id (Part 1)
            // let sessionID
            // let providerI
            // let model
            // let note
            // let modelNote

            // if (args?.sessionID) {
            //   const sessionID = args.sessionID;
            //   const providerID = args.providerID
            //   const model = args.modelID
            //   const note = "cross sesseion compaction detected"
            //   const modelNote = note
            // } else {
            //   const sessionID = c.sessionID
            //   if (typeof sessionID !== "string" || sessionID === "") {
            //   return "Compaction request failed: no session id available (pass the sessionID argument or a context session id).";
            // }
            //   const isSelf = args?.sessionID == null || (typeof c?.sessionID === "string" && args.sessionID === c.sessionID);
            //   const { model, providerID, note: modelNote } = await resolveModel(ctx?.client, c, sessionID, isSelf);
            // }

            //--comment asked another llm to help me with this xD
           // 1. resolve the session id (Part 1): an explicit id compacts
            //    ANOTHER session (or itself); absent → the calling session
            const explicitID =
              typeof args?.sessionID === "string" && args.sessionID !== "" ? args.sessionID : null;
            const ctxID = typeof c?.sessionID === "string" && c.sessionID !== "" ? c.sessionID : null;
            const sessionID = explicitID ?? ctxID;
            if (sessionID == null) {
              return "Compaction request failed: no session id available (pass the sessionID argument or a context session id).";
            }
            const isSelf = sessionID === c?.sessionID;

            // 2. resolve the model pair — resolveModel is the FALLBACK (self:
            //    extra.model; cross: the messages-RPC read of the LAST entry —
            //    never a throw, a NOTE on degradation); the summarizer pair
            //    then resolves from the root config's agent.compaction.model
            //    when set (unit A, 2026-09-21: providerID/modelID are NOT
            //    arguments — the config is the only override)
            const root = resolveRoot(c);
            const resolved = await resolveModel(ctx?.client, c, sessionID, isSelf);
            let model = resolved.model;
            let providerID = resolved.providerID;
            const modelNote = resolved.note;
            const cfgPair = resolveCompactionModel(readRootConfigContent(root), { providerID, modelID: model });
            if (cfgPair.source === "config") {
              providerID = cfgPair.providerID;
              model = cfgPair.modelID;
            }

            // 3. the configured cap + the budget gate — BEFORE any compact
            //    call: denial has ZERO side effects (no increment, no compact
            //    call, no COMPACT line). The config (keep defaults + the
            //    model_budget caps) is read PER CALL from the budget file.
            const cfg = readCompactionConfig(root);
            const { cap, label } = resolveCap(root, model);
            const count = budgetCount(root, sessionID);
            // The EMERGENCY-1 (item 10, 2026-09-24): the total per session is
            // the cap + one emergency. At count == cap the `emergency` arg
            // consumes the configured emergency_budget 1 (count → cap+1);
            // count > cap is the fully-exhausted refusal state (item 11
            // directive). No store-schema bump — the count tracks it.
            const emergencyArg = args?.emergency === true;
            let isEmergency = false;
            if (count >= cap) {
              if (count === cap && emergencyArg && cfg.emergency_budget >= 1) {
                isEmergency = true;
              } else {
                const emergencyNote =
                  count === cap && !emergencyArg && cfg.emergency_budget >= 1
                    ? " The emergency compaction (once per session) is available via the `emergency` argument."
                    : " The emergency compaction is unavailable or already consumed — the budget is fully exhausted.";
                return (
                  `Compaction refused: the compaction budget for ${sessionID} is exhausted — ` +
                  `model class ${label} (cap ${cap}), used ${count}/${cap}. ` +
                  `Hand over and start fresh — write the handover summary and let the loop restart with a fresh session.` +
                  emergencyNote +
                  (modelNote !== "" ? `\n${modelNote}` : "")
                );
              }
            }

            // Pre-compaction dump hook (TODO #152): before ANY dispatch, dump
            // the target session's full pre-compaction content into the corpus
            // so it stays complete for compacted sessions. Best-effort — NEVER
            // throws / NEVER blocks; on failure the dispatch response carries a
            // WARNING (the response is UNCHANGED on success).
            const dump = preCompactionDump(root, sessionID, count);
            const dumpWarning = dump.ok ? "" : `\nWARNING: pre-compaction dump failed for ${sessionID} (${dump.error})`;

            // 4. the client call path (Part 1) — typeof detection (the SDK
            //    methods live on the prototype). Keep fields go in the body
            //    WHEN GIVEN; on a 404/missing-key/unexpected-field rejection
            //    callSummarize retries ONCE without them.
            const client = ctx?.client;
            const messagesToKeep = args?.keepMessages ?? cfg.keepMessages;
            // #99 (2026-09-25): the dispatch-time keepTokens resolution —
            // the token size of the last messagesToKeep messages is the
            // PRIMARY (read from the session's messages now — never throws:
            // a failed read degrades to the budget/none path); the budget
            // file's keepTokens is the FALLBACK; else NONE (keep.tokens
            // omitted — the host config default applies). keep.messages is
            // UNCHANGED (forward compat — the host honors the token
            // budget, not the count).
            let rawMsgs: unknown = null;
            if (typeof client?.session?.messages === "function") {
              try {
                rawMsgs = await client.session.messages({ path: { id: sessionID } });
              } catch {
                rawMsgs = null; // RPC failure → the budget/none path (fail-open)
              }
            }
            const keepRes = computeKeepTokens(rawMsgs, messagesToKeep, cfg.keepTokens);
            const keep: Record<string, number> = {};
            if (args?.keepMessages != null) keep.messages = args.keepMessages;
            if (keepRes.tokens != null) keep.tokens = keepRes.tokens;
            const keepObj = Object.keys(keep).length > 0 ? keep : undefined;

            // NO AWAIT on the compaction call — for SELF and CROSS alike
            // (maintainer ruling 2026-09-14, live evidence: an `await` in
            // execute deadlocks — the summarize model is normally == the
            // session's LOADED model and llama-swap has ONE slot, so the
            // request queues behind the very turn that issued it; the turn
            // cannot end until the await returns; the session is frozen
            // until a manual interrupt frees the slot). The call is
            // DISPATCHED and verified ASYNCHRONOUSLY: the budget increment
            // + the COMPACT line land ONLY in the verified-success callback
            // (increment-on-verified-success); a failure logs to the
            // terminal and burns no budget. The response is the dispatch
            // line — NEVER a success claim.
            if (typeof client?.session?.compact === "function") {
              // v2: FLAT parameters — the generated v2 types mark the options
              // body `never` (no keep fields).
              void Promise.resolve(client.session.compact({ sessionID }))
                .then((result: any) => {
                  const error = compactionFailure(result);
                  if (error !== "") {
                    console.error(`compact_memory: background compaction FAILED for ${sessionID}: ${error}`);
                    return;
                  }
                   recordVerifiedSuccess(root, c, sessionID, model, messagesToKeep, keepRes, isEmergency);
                 })
                 .catch((err: unknown) =>
                   console.error(
                     `compact_memory: background compaction rejected for ${sessionID}:`,
                     err instanceof Error ? err.message : String(err),
                   ),
                 );
                const dispatch =
                  `Compaction dispatched for ${sessionID} (background, fire-and-forget) — the compact call was sent ` +
                 `(model: ${model}); the budget increment + the COMPACT line in .opencode/temp/ctx.log land ONLY on verified success.` +
                 dumpWarning;
               return queueMessage(root, sessionID, args?.message, dispatch, modelNote);
            } else if (typeof client?.session?.summarize === "function") {
              // v1 — THE ACTIVE PATH ON THIS BUILD: the body MUST carry
              // providerID + modelID (REQUIRED by the server payload schema)
              if (model === "" || providerID === "") {
                return (
                  `Compaction request failed: no resolvable model for ${sessionID} (the server requires providerID + modelID in the summarize body) — the request was NOT sent.` +
                  (modelNote !== "" ? `\n${modelNote}` : "")
                );
              }
              void callSummarize(client, sessionID, { providerID, modelID: model }, keepObj)
                .then(({ note, error }) => {
                  if (error !== "") {
                    console.error(`compact_memory: background compaction FAILED for ${sessionID}: ${error}`);
                    return;
                  }
                   if (note !== "") console.log(`compact_memory (${sessionID}): ${note}`);
                   recordVerifiedSuccess(root, c, sessionID, model, messagesToKeep, keepRes, isEmergency);
                })
                .catch((err: unknown) =>
                  console.error(
                    `compact_memory: background compaction rejected for ${sessionID}:`,
                    err instanceof Error ? err.message : String(err),
                  ),
                );
              const dispatch =
                `Compaction dispatched for ${sessionID} (background, fire-and-forget) — the summarize call was sent ` +
                `(model: ${model}); the budget increment + the COMPACT line in .opencode/temp/ctx.log land ONLY on verified success.` +
                dumpWarning;
              return queueMessage(root, sessionID, args?.message, dispatch, modelNote);
            } else {
              const compactType = typeof client?.session?.compact;
              const summarizeType = typeof client?.session?.summarize;
              return `Compaction request failed: no usable client — probed ctx.client?.session?.compact (type ${compactType}) and ctx.client?.session?.summarize (type ${summarizeType}); neither is a function (the client is not wired for this host build). No compaction was performed.`;
            }
          } catch (err: any) {
            return `Compaction request failed: ${err?.message ?? err}`;
          }
        },
      }),
    },
  };
}
