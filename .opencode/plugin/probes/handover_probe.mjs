// =============================================================================
// Persistent offline probe for .opencode/plugin/handover.ts (v2.2.1 gauge-evidence
// code). Built 2026-09-08 (TODO.md #20), S4 extended the same day for the v2.2.1
// gauge-failure evidence logging. PERMANENT repo tooling: RE-RUN, never rebuild —
// exception: the plugin's hook surface changes.
//
// EXACT RUN COMMAND (from the repo root, PowerShell 7 — this IS the run command,
// do not rediscover anything):
//     $env:ELECTRON_RUN_AS_NODE="1"
//     & "$env:LOCALAPPDATA\Programs\@opencode-aidesktop\OpenCode.exe" .opencode\plugin\probes\handover_probe.mjs before
// (`after` instead of `before` after an edit; default mode = "before")
//
// WHY THAT COMMAND — DO NOT HUNT FOR EXECUTABLES (the hunt cost a prior cycle
// ~10 min and a large context slice):
//   - pinned opencode Electron executable:
//       %LOCALAPPDATA%\Programs\@opencode-aidesktop\OpenCode.exe
//     DO NOT search for it. If the path is ever wrong, report it as a
//     discrepancy (TODO.md + summary) — do not re-hunt.
//   - ELECTRON_RUN_AS_NODE=1 makes the Electron binary behave as plain Node.js.
//     It IS Node 24.15.0 (verified: process.version) — new enough for native
//     TypeScript type stripping, so this probe `import()`s the .ts plugin
//     directly: no compile step, no --experimental-* flags, no bun, no system
//     node. One `MODULE_TYPELESS_PACKAGE_JSON` warning on stderr is expected
//     and harmless — `.opencode/package.json` has no "type" field and must not
//     gain one (that would change the plugin's module context).
//   - One file, self-contained, re-runnable from the repo root.
//
// WHAT IT RUNS:
//   The plugin is initialized with directory=<temp sandbox root> (os.tmpdir,
//   mkdtemp), so ALL its fs writes land in the sandbox: dummy
//   .opencode/handover_task.md spec (non-empty sentinel), mirror file pre-filled
//   with STALE content, empty plugin.log. The real .opencode/ files are NEVER
//   touched (S5 verifies byte-identity + zero writes outside the sandbox).
//   S1 pre-flight warn (spec present → no warn; renamed away → exactly ONE
//      byte-exact warn + byte-exact restore; emptied → exactly one warn)
//   S2 non-handover delegations invisible (no warn, no mirror write, no throw)
//   S3 summary mirror (verbatim OVERWRITE / exact TRUNCATED trailer / empty
//      output → untouched; exactly 3 tool.after log lines)
//   S4 transform injection — v2.2 injects on EVERY transform; v2.2.1 adds the
//      kind:"gauge" evidence line per failed readout — 9 shapes:
//      (1) LIVE shape {sessionID, model:{…}} (no agent) + good shell → exactly
//          ONE `ctx: CTX=12345 (10%) REM=100000` line appended, prior items kept,
//          ZERO gauge lines
//      (2) agent:"worker_120K_mtp" + shell → appended (no gate), zero gauge lines
//      (3) junk shell (resolves without a CTX= prefix) → omitted, no throw + ONE
//          gauge line {reason:no-ctx-output, preview:"no gauge output", session:t3}
//      (4) no shell ($ undefined) → omitted, no throw + ONE gauge line
//          {reason:shell-missing, session:t4} (no preview)
//      (5) timeout shell (text() rejects with the withTimeout "gauge timeout"
//          sentinel) → omitted, no throw + ONE gauge line {reason:timeout,
//          session:t5} (no preview)
//      (6) spawn-failure shell (text() rejects with a foreign error) → omitted,
//          no throw + ONE gauge line {reason:no-ctx-output, preview:error text
//          capped at 120 chars, session:t6}
//      (7) empty-output shell (resolves "") → omitted, no throw + ONE gauge line
//          {reason:no-ctx-output, session:t7} (no preview)
//      (8) ok readout + output.system a STRING (not an array) → system untouched +
//          ONE gauge line {reason:system-not-array, session:t8} (no preview)
//      (9) ok readout + no `system` key → output untouched + ONE gauge line
//          {reason:system-not-array, session:t9} (no preview)
//      Each of the 9 shapes logs exactly one kind:"transform" evidence line (9 total).
//   S5 hygiene: every sandbox plugin.log line is JSON.parse-able, <=2000 chars,
//      has an ISO ts + a string kind; exact kind tallies; the real handover
//      files byte-identical to pre-run and zero CO-APPENDED live lines (the real
//      plugin.log may only grow — the LIVE session's own plugin legitimately
//      appends its own lines while the probe runs inside a bash invocation; a
//      line carrying a probe fingerprint id s*/c*/d*/t* = the probe wrote out
//      of the sandbox); zero new/changed files outside the sandbox
//      (.opencode listing + git status, before vs after).
//
// EXPECTED OUTPUT SUMMARY — the v2.2.1 gauge-evidence edit CHANGES behavior
// (the new kind:"gauge" lines), so the probe was extended the same day and the
// expectations now match the NEW code:
//   S1=5 S2=4 S3=5 S4=9 S5=5  →  "PROBE handover (mode=<mode>): 28/28 PASS",
//   exit code 0. Pre-edit baseline (recorded 2026-09-08): the OLD 23-check probe
//   passed 23/23 against the unchanged v2.2 plugin (`before` mode) — the ok-shape
//   injections are asserted byte-identically on both sides. Anything else than
//   28/28 with THIS file = behavior drift or broken environment — read the
//   failures, do not "fix" the plugin for the probe. On failure the sandbox root
//   is KEPT (printed) for forensics.
// =============================================================================

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

// ------------------------------------------------------------------ args/env

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, "..", "..", "..");
const PLUGIN_TS = path.join(REPO_ROOT, ".opencode", "plugin", "handover.ts");
const MODE = process.argv[2] ?? "before";
if (MODE !== "before" && MODE !== "after") {
  console.error(`bad mode ${JSON.stringify(MODE)} (expected "before" | "after")`);
  process.exit(2);
}
const EXE = path.join(process.env.LOCALAPPDATA ?? "", "Programs", "@opencode-aidesktop", "OpenCode.exe");
if (!existsSync(EXE)) {
  console.error(`Pinned opencode Electron executable missing: ${EXE}`);
  console.error("Do NOT re-hunt — record the discrepancy in TODO.md + summary (see header).");
  process.exit(2);
}

// --------------------------------------------------------------- fixed payloads

const HOV_PROMPT = "Read .opencode/handover_task.md and execute it EXACTLY.";
const ORIGINAL_SPEC =
  "# PROBE DUMMY SPEC\n\nsentinel — NOT the real spec file (the real one lives at <repo root>/.opencode/handover_task.md).\n";
const STALE_SENTINEL = "STALE MIRROR SENTINEL — must be OVERWRITTEN, not appended to.\n";
const GAUGE_GOOD = "CTX=12345 (10%) REM=100000\n";
const GAUGE_JUNK = "no gauge output\n";
const GAUGE_EMPTY = "";
const CTX_EXPECTED = `ctx: CTX=12345 (10%) REM=100000`;
// v2.2.1 — the foreign (non-timeout) rejection = a synthetic BunShell spawn failure. The
// error text (String(e) = "Error: " + message) exceeds 120 chars, so the gauge line
// exercises the 120-cap (cap: first 119 chars + U+2026) AND the omit-when-empty is
// untouched (non-empty here).
const SPAWN_ERR = new Error(`spawn ENOENT: .venv/Scripts/python.exe ${"x".repeat(122)}`);
const cap120 = (s) => (s.length <= 120 ? s : s.slice(0, 119) + "\u2026");
const SPAWN_PREVIEW = cap120(String(SPAWN_ERR));
const M_A = "VERBATIM worker summary line one\nline two\n";
const M_B_OUTPUT = "TRUNCATED BODY\n";
const M_B_EXPECTED = `${M_B_OUTPUT}\n\n[TRUNCATED by opencode tool_output cap — see plugin.log call d2]`;

// ------------------------------------------------------------------ real files

const REAL_OP = path.join(REPO_ROOT, ".opencode");
const REAL_FILES = ["handover_task.md", "handover_task_to_planner.md", "plugin.log"];
const readOrNull = (p) => (existsSync(p) ? readFileSync(p).toString("utf8") : null);
const snapshotReal = () => Object.fromEntries(REAL_FILES.map((f) => [f, readOrNull(path.join(REAL_OP, f))]));
const PRE_REAL = snapshotReal();

const listOpencode = () => {
  const out = [];
  const walk = (d) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      if (e.isDirectory()) {
        if (e.name === "node_modules" || e.name.startsWith("_exported")) continue;
        walk(path.join(d, e.name));
      } else {
        out.push(path.relative(REAL_OP, path.join(d, e.name)));
      }
    }
  };
  walk(REAL_OP);
  return out.sort();
};
const PRE_OP_LISTING = listOpencode();
const gitStatus = () => execFileSync("git", ["status", "--porcelain=v1"], { cwd: REPO_ROOT, encoding: "utf8" });
const PRE_GIT_STATUS = gitStatus();

// ------------------------------------------------------------------ the probe

const results = [];
const check = (id, section, label, cond, detail = "") => {
  const ok = Boolean(cond);
  results.push({ id, section, label, ok, detail: ok ? "" : String(detail).slice(0, 500) });
  console.log(`${ok ? "PASS" : "FAIL"} [${id}] ${label}${ok ? "" : ` — ${String(detail).slice(0, 300)}`}`);
};

// temp sandbox root — the plugin is initialized with directory=SANDBOX, so every
// fs write it performs lands here, never in the repo.
const SANDBOX = mkdtempSync(path.join(os.tmpdir(), "fst_handover_probe_"));
const SB_SPEC = path.join(SANDBOX, ".opencode", "handover_task.md");
const SB_MIRROR = path.join(SANDBOX, ".opencode", "handover_task_to_planner.md");
const SB_LOG = path.join(SANDBOX, ".opencode", "plugin.log");
mkdirSync(path.join(SANDBOX, ".opencode"), { recursive: true });
writeFileSync(path.join(SANDBOX, "sandbox_root_marker.txt"), "sandbox\n");
writeFileSync(SB_SPEC, ORIGINAL_SPEC);
writeFileSync(SB_MIRROR, STALE_SENTINEL);
writeFileSync(SB_LOG, "");

const logLines = () => readFileSync(SB_LOG, "utf8").split("\n").filter((l) => l.length > 0);
const linesOfKind = (k) => logLines().filter((l) => {
  try {
    return JSON.parse(l).kind === k;
  } catch {
    return false;
  }
});
// v2.2.1 — the LAST kind:"gauge" line, but only when the total count matches exactly
// (the S4 failure shapes assert their evidence line field-by-field)
const lastGauge = (expectTotal) => {
  const g = linesOfKind("gauge");
  if (g.length !== expectTotal) return null;
  try {
    return JSON.parse(g[g.length - 1]);
  } catch {
    return null;
  }
};
const readMirror = () => readFileSync(SB_MIRROR, "utf8");

// fake BunShell: shell.cwd(d) → self; shell(cmd) → { nothrow() → self, text() → Promise<fixed> }
// v2.2.1 — text() may REJECT (rejectError) to simulate the timeout sentinel / a spawn failure
const makeShell = (textResult, rejectError) => {
  const shell = (..._a) => ({
    nothrow() { return this; },
    text() { return rejectError ? Promise.reject(rejectError) : Promise.resolve(textResult); },
  });
  shell.cwd = () => shell;
  return shell;
};
const goodShell = makeShell(GAUGE_GOOD);
const junkShell = makeShell(GAUGE_JUNK);
const emptyShell = makeShell(GAUGE_EMPTY);
const timeoutShell = makeShell(null, new Error("gauge timeout"));
const spawnShell = makeShell(null, SPAWN_ERR);

// the plugin, loaded from the REAL repo path (Node 24 strips the TS types)
const plugin = (await import(pathToFileURL(PLUGIN_TS).href)).default;
const HOV_ARGS = { prompt: HOV_PROMPT };
const beforeFeed = (hooks, sess, call, tool, inArgs, outArgs) =>
  hooks["tool.execute.before"]({ tool, sessionID: sess, callID: call, args: inArgs }, { args: outArgs });
const afterFeed = (hooks, sess, call, inArgs, out) =>
  hooks["tool.execute.after"]({ tool: "task", sessionID: sess, callID: call, args: inArgs }, out);

// ------------------------------------------------------------------ S1 pre-flight

{
  const hooks = await plugin({ directory: SANDBOX, $: goodShell });

  // 1 — spec present + handover delegation → no warn, one tool.before (c1)
  await beforeFeed(hooks, "s1", "c1", "task", HOV_ARGS, HOV_ARGS);
  check(
    "01",
    "S1",
    "spec present: handover before → zero warn lines, tool.before logged (c1)",
    linesOfKind("warn").length === 0 && linesOfKind("tool.before").some((l) => l.includes('"call":"c1"')),
    `warn=${linesOfKind("warn").length} tool.before=${linesOfKind("tool.before").length}`,
  );

  // 2 — spec renamed away → exactly ONE warn line, byte-exact fields
  const SPEC_BAK = SB_SPEC + ".bak";
  renameSync(SB_SPEC, SPEC_BAK);
  await beforeFeed(hooks, "s1", "c2", "task", HOV_ARGS, HOV_ARGS);
  const warns = linesOfKind("warn");
  const w2 = warns.length === 1 ? (() => { try { return JSON.parse(warns[0]); } catch { return {}; } })() : {};
  check(
    "02",
    "S1",
    "spec renamed away: exactly one warn, {kind:warn, reason, call:c2, session:s1} byte-exact",
    warns.length === 1 && w2.kind === "warn" && w2.reason === "handover-task-file-missing-or-empty" && w2.call === "c2" && w2.session === "s1",
    warns.join(" | "),
  );
  renameSync(SPEC_BAK, SB_SPEC);

  // 3 — byte-exact restore
  check("03", "S1", "spec restored byte-exact after rename phase", readFileSync(SB_SPEC, "utf8") === ORIGINAL_SPEC, readFileSync(SB_SPEC, "utf8"));

  // 4 — emptied spec → exactly one NEW warn line (total 2, call c3)
  writeFileSync(SB_SPEC, "");
  await beforeFeed(hooks, "s1", "c3", "task", HOV_ARGS, HOV_ARGS);
  const warns3 = linesOfKind("warn");
  const w3 = (() => { try { return JSON.parse(warns3[1] ?? ""); } catch { return {}; } })();
  check("04", "S1", "empty spec: exactly one new warn line (total 2, call c3)", warns3.length === 2 && w3.call === "c3", warns3.join(" | "));
  writeFileSync(SB_SPEC, ORIGINAL_SPEC);

  // 5 — byte-exact restore again
  check("05", "S1", "spec restored byte-exact after empty phase", readFileSync(SB_SPEC, "utf8") === ORIGINAL_SPEC, readFileSync(SB_SPEC, "utf8"));

  // ------------------------------------------------------------------ S2 non-handover invisible

  // 6 — task, non-handover prompt (gate: no spec path in the prompt)
  const P2 = { prompt: "explore the code (no handover spec in prompt)" };
  await beforeFeed(hooks, "s2", "c4", "task", P2, P2);
  check("06", "S2", "task w/o spec in prompt: no new warn, mirror untouched", linesOfKind("warn").length === 2 && readMirror() === STALE_SENTINEL, `warn=${linesOfKind("warn").length}`);

  // 7 — non-task tool carrying the handover-ish prompt (tool gate comes first)
  const P3 = { command: "echo hi", prompt: HOV_PROMPT };
  await beforeFeed(hooks, "s2", "c5", "bash", P3, P3);
  check("07", "S2", "non-task tool (bash) w/ spec-ish prompt: invisible (no warn, mirror untouched)", linesOfKind("warn").length === 2 && readMirror() === STALE_SENTINEL, `warn=${linesOfKind("warn").length}`);

  // 8 — task with NO args at all (the hook must not throw)
  let threw = false;
  try {
    await hooks["tool.execute.before"]({ tool: "task", sessionID: "s2", callID: "c6" }, {});
  } catch {
    threw = true;
  }
  check("08", "S2", "task w/ missing args: resolves (no throw), invisible", !threw && linesOfKind("warn").length === 2 && readMirror() === STALE_SENTINEL, `threw=${threw} warn=${linesOfKind("warn").length}`);

  // 9 — cumulative tally after S1–S2
  check("09", "S2", "cumulative after S1–S2: warn==2, tool.before==6", linesOfKind("warn").length === 2 && linesOfKind("tool.before").length === 6, `warn=${linesOfKind("warn").length} tool.before=${linesOfKind("tool.before").length}`);

  // ------------------------------------------------------------------ S3 mirror — EXACTLY three after feeds

  // 10 — verbatim OVERWRITE (the STALE sentinel is replaced byte-for-byte)
  await afterFeed(hooks, "s3", "d1", HOV_ARGS, { title: "worker final", output: M_A, metadata: {} });
  check("10", "S3", "handover after (no meta): mirror OVERWRITTEN byte-exact verbatim (sentinel replaced)", readMirror() === M_A, readMirror());

  // 11 — exact TRUNCATED trailer with the call id embedded
  await afterFeed(hooks, "s3", "d2", HOV_ARGS, { title: "worker final", output: M_B_OUTPUT, metadata: { truncated: true } });
  check("11", "S3", "handover after (truncated:true): mirror == output + exact trailer (call d2)", readMirror() === M_B_EXPECTED, readMirror());

  // 12 — empty output → untouched
  await afterFeed(hooks, "s3", "d3", HOV_ARGS, { title: "worker final", output: "", metadata: {} });
  check("12", "S3", "handover after (empty output): mirror untouched (byte == S3b state)", readMirror() === M_B_EXPECTED, readMirror());

  // 13 — exactly three tool.after log lines in this phase
  check("13", "S3", "mirror phase logged exactly 3 tool.after lines (d1..d3)", linesOfKind("tool.after").length === 3, `tool.after=${linesOfKind("tool.after").length}`);

  // 14 — final mirror state byte-exact (the transform section below only appends log lines)
  check("14", "S3", "final mirror state byte-identical to S3b content", readMirror() === M_B_EXPECTED, readMirror());

  // ------------------------------------------------------------------ S4 transform — v2.2: inject on EVERY transform; v2.2.1: the failed
  // readout / uninjected-ok cases log exactly ONE kind:"gauge" line, the ok+injected ones none

  // 15 — LIVE shape (no agent field) + good shell: exactly ONE ctx: line appended, prior items intact, ZERO gauge lines
  const h1 = await plugin({ directory: SANDBOX, $: goodShell });
  {
    const system = ["SYS A", "SYS B"];
    await h1["experimental.chat.system.transform"]({ sessionID: "t1", model: { id: "m-27B" } }, { system });
    check(
      "15",
      "S4",
      "LIVE shape (no agent, good shell): exactly one ctx: line appended, prior items verbatim, zero gauge lines",
      Array.isArray(system) && system.length === 3 && system[0] === "SYS A" && system[1] === "SYS B" && system[2] === CTX_EXPECTED && linesOfKind("gauge").length === 0,
      JSON.stringify({ system, gauge: linesOfKind("gauge") }),
    );
  }

  // 16 — worker agent field: no gate — appended (the evidence line carries the agent), zero gauge lines
  {
    const system = ["SYS C"];
    await h1["experimental.chat.system.transform"]({ sessionID: "t2", agent: "worker_120K_mtp", model: { id: "m-27B" } }, { system });
    const evs = linesOfKind("transform");
    const ev2 = (() => { try { return JSON.parse(evs[1] ?? ""); } catch { return {}; } })();
    check(
      "16",
      "S4",
      'agent:"worker_120K_mtp" + shell: ctx: appended (no gate), evidence line carries agent, zero gauge lines',
      system.length === 2 && system[1] === CTX_EXPECTED && ev2.agent === "worker_120K_mtp" && linesOfKind("gauge").length === 0,
      JSON.stringify({ system, ev2 }),
    );
  }

  // 17 — junk shell (resolves without a CTX= prefix): omitted, no throw + ONE gauge line {no-ctx-output, preview}
  {
    const h3 = await plugin({ directory: SANDBOX, $: junkShell });
    const system = ["SYS D"];
    let threw = false;
    try {
      await h3["experimental.chat.system.transform"]({ sessionID: "t3", model: { id: "m-27B" } }, { system });
    } catch {
      threw = true;
    }
    const g = lastGauge(1);
    check(
      "17",
      "S4",
      "junk shell (no CTX=): ctx omitted, no throw, system unchanged + gauge {no-ctx-output, preview:'no gauge output', session:t3}",
      !threw && system.length === 1 && system[0] === "SYS D" && g != null && g.kind === "gauge" && g.reason === "no-ctx-output" && g.preview === "no gauge output" && g.session === "t3",
      JSON.stringify({ system, g }),
    );
  }

  // 18 — no shell ($ undefined): omitted, no throw + ONE gauge line {shell-missing, no preview}
  {
    const h4 = await plugin({ directory: SANDBOX, $: undefined });
    const system = ["SYS E"];
    let threw = false;
    try {
      await h4["experimental.chat.system.transform"]({ sessionID: "t4", model: { id: "m-27B" } }, { system });
    } catch {
      threw = true;
    }
    const g = lastGauge(2);
    check(
      "18",
      "S4",
      "no shell: ctx omitted, no throw, system unchanged + gauge {shell-missing, session:t4, no preview}",
      !threw && system.length === 1 && system[0] === "SYS E" && g != null && g.kind === "gauge" && g.reason === "shell-missing" && g.session === "t4" && !("preview" in g),
      JSON.stringify({ system, g }),
    );
  }

  // 19 — timeout shell (text() rejects with the withTimeout "gauge timeout" sentinel): omitted, no throw
  //      + ONE gauge line {timeout, no preview} — a non-settling (real 3000 ms) shell is not
  //      probed: the sentinel rejection is the same mapping branch, deterministically
  {
    const h5 = await plugin({ directory: SANDBOX, $: timeoutShell });
    const system = ["SYS F"];
    let threw = false;
    try {
      await h5["experimental.chat.system.transform"]({ sessionID: "t5", model: { id: "m-27B" } }, { system });
    } catch {
      threw = true;
    }
    const g = lastGauge(3);
    check(
      "19",
      "S4",
      "timeout sentinel rejection: ctx omitted, no throw, system unchanged + gauge {timeout, session:t5, no preview}",
      !threw && system.length === 1 && system[0] === "SYS F" && g != null && g.kind === "gauge" && g.reason === "timeout" && g.session === "t5" && !("preview" in g),
      JSON.stringify({ system, g }),
    );
  }

  // 20 — spawn-failure shell (foreign rejection): omitted, no throw + ONE gauge line {no-ctx-output, preview = error text capped 120}
  {
    const h6 = await plugin({ directory: SANDBOX, $: spawnShell });
    const system = ["SYS G"];
    let threw = false;
    try {
      await h6["experimental.chat.system.transform"]({ sessionID: "t6", model: { id: "m-27B" } }, { system });
    } catch {
      threw = true;
    }
    const g = lastGauge(4);
    check(
      "20",
      "S4",
      "foreign spawn-error rejection: ctx omitted, no throw, system unchanged + gauge {no-ctx-output, preview=error text capped 120, session:t6}",
      !threw && system.length === 1 && system[0] === "SYS G" && g != null && g.kind === "gauge" && g.reason === "no-ctx-output" && g.session === "t6" && g.preview === SPAWN_PREVIEW && g.preview.length === 120,
      JSON.stringify({ system, g }),
    );
  }

  // 21 — empty-output shell (resolves ""): omitted, no throw + ONE gauge line {no-ctx-output, no preview}
  {
    const h7 = await plugin({ directory: SANDBOX, $: emptyShell });
    const system = ["SYS H"];
    let threw = false;
    try {
      await h7["experimental.chat.system.transform"]({ sessionID: "t7", model: { id: "m-27B" } }, { system });
    } catch {
      threw = true;
    }
    const g = lastGauge(5);
    check(
      "21",
      "S4",
      "empty-output shell: ctx omitted, no throw, system unchanged + gauge {no-ctx-output, session:t7, no preview}",
      !threw && system.length === 1 && system[0] === "SYS H" && g != null && g.kind === "gauge" && g.reason === "no-ctx-output" && g.session === "t7" && !("preview" in g),
      JSON.stringify({ system, g }),
    );
  }

  // 22 — ok readout + output.system a STRING (not an array): system NOT pushed (untouched) + ONE gauge line {system-not-array}
  //      — FRESH plugin instance per shape below: the module-level shell global is whatever the
  //      LAST plugin() call configured, so an older hook instance would resolve the wrong shell
  {
    const h8 = await plugin({ directory: SANDBOX, $: goodShell });
    const out = { system: "SYS NOT AN ARRAY" };
    let threw = false;
    try {
      await h8["experimental.chat.system.transform"]({ sessionID: "t8", model: { id: "m-27B" } }, out);
    } catch {
      threw = true;
    }
    const g = lastGauge(6);
    check(
      "22",
      "S4",
      "ok readout + string system: system NOT pushed, untouched + gauge {system-not-array, session:t8, no preview}",
      !threw && out.system === "SYS NOT AN ARRAY" && g != null && g.kind === "gauge" && g.reason === "system-not-array" && g.session === "t8" && !("preview" in g),
      JSON.stringify({ out, g }),
    );
  }

  // 23 — ok readout + NO `system` key: output untouched + ONE gauge line {system-not-array}
  {
    const h9 = await plugin({ directory: SANDBOX, $: goodShell });
    const out = {};
    let threw = false;
    try {
      await h9["experimental.chat.system.transform"]({ sessionID: "t9", model: { id: "m-27B" } }, out);
    } catch {
      threw = true;
    }
    const g = lastGauge(7);
    check(
      "23",
      "S4",
      "ok readout + no system key: output untouched + gauge {system-not-array, session:t9, no preview}",
      !threw && Object.keys(out).length === 0 && g != null && g.kind === "gauge" && g.reason === "system-not-array" && g.session === "t9" && !("preview" in g),
      JSON.stringify({ out, g }),
    );
  }

  // ------------------------------------------------------------------ S5 hygiene

  // 24 — every sandbox plugin.log line parses as JSON (no stray/blank/garbled lines)
  {
    const bad = logLines().filter((l) => {
      try {
        JSON.parse(l);
        return false;
      } catch {
        return true;
      }
    });
    check("24", "S5", "every sandbox plugin.log line is JSON.parse-able", bad.length === 0, bad.slice(0, 3).join(" | "));
  }

  // 25 — every line <= 2000 chars with an ISO ts + a string kind
  {
    const bad = logLines().filter((l) => {
      if (l.length > 2000) return true;
      try {
        const o = JSON.parse(l);
        return typeof o.ts !== "string" || Number.isNaN(Date.parse(o.ts)) || typeof o.kind !== "string";
      } catch {
        return true;
      }
    });
    check("25", "S5", "every line <= 2000 chars, ISO ts + string kind", bad.length === 0, bad.slice(0, 3).join(" | "));
  }

  // 26 — exact kind tallies (no stray event lines either) — v2.2.1: transform==9 (9 S4 shapes),
  //      gauge==7 (the 7 failure/uninjected shapes; the 2 ok shapes log none)
  {
    const tally = (k) => linesOfKind(k).length;
    check(
      "26",
      "S5",
      "kind tallies exact: warn==2, tool.before==6, tool.after==3, transform==9, gauge==7, event==0",
      tally("warn") === 2 && tally("tool.before") === 6 && tally("tool.after") === 3 && tally("transform") === 9 && tally("gauge") === 7 && tally("event") === 0,
      `warn=${tally("warn")} tool.before=${tally("tool.before")} tool.after=${tally("tool.after")} transform=${tally("transform")} gauge=${tally("gauge")} event=${tally("event")}`,
    );
  }

  // 27 — zero co-appended LIVE lines: the real handover files must be byte-identical, and the
  //      real plugin.log must only GROW. The LIVE session's own plugin legitimately appends its
  //      own tool lines while this probe runs inside a bash invocation — those are not probe
  //      writes. The probe's fingerprint is its synthetic ids (s1–s4/c1–c6/d1–d3/t1–t9): if any
  //      appended real-log line carries one, the probe wrote out of the sandbox.
  {
    const POST = snapshotReal();
    const handoverDiff = REAL_FILES.filter((f) => f !== "plugin.log" && (PRE_REAL[f] ?? null) !== (POST[f] ?? null));
    const preLog = PRE_REAL["plugin.log"] ?? "";
    const postLog = POST["plugin.log"] ?? "";
    const monotonic = postLog.length >= preLog.length && (preLog === "" || postLog.startsWith(preLog));
    const newLines = monotonic ? postLog.slice(preLog.length).split("\n").filter((l) => l.length > 0) : [];
    const FINGERPRINT = ["s1", "s2", "s3", "s4", "c1", "c2", "c3", "c4", "c5", "c6", "d1", "d2", "d3", "t1", "t2", "t3", "t4", "t5", "t6", "t7", "t8", "t9"];
    const probeWroteLive = newLines.some((l) => FINGERPRINT.some((fid) => l.includes(`"session":"${fid}"`) || l.includes(`"call":"${fid}"`)));
    check(
      "27",
      "S5",
      "zero co-appended live lines: handover files byte-identical; plugin.log append-only; no probe-id lines in the appended tail",
      handoverDiff.length === 0 && monotonic && !probeWroteLive,
      `handoverDiff=${handoverDiff.join(",")} monotonic=${monotonic} probeWroteLive=${probeWroteLive}`,
    );
  }

  // 28 — zero writes outside the sandbox: .opencode listing + git status unchanged
  {
    const listingDiff = listOpencode().filter((p) => !PRE_OP_LISTING.includes(p));
    const gitChanged = gitStatus() !== PRE_GIT_STATUS;
    check("28", "S5", "sandbox isolation: .opencode listing + git status unchanged (no new/changed files outside sandbox)", listingDiff.length === 0 && !gitChanged, `new: ${listingDiff.join(", ")}; gitChanged=${gitChanged}`);
  }
}

// ------------------------------------------------------------------ summary

const bySection = {};
for (const r of results) bySection[r.section] = (bySection[r.section] ?? 0) + (r.ok ? 1 : 0);
const perSection = (Object.keys(bySection)).map((s) => `${s}=${bySection[s]}`).join(" ");
const total = results.length;
const okCount = results.filter((r) => r.ok).length;
console.log(`\nsections: ${perSection}  total=${okCount}/${total}`);
if (okCount === total) {
  rmSync(SANDBOX, { recursive: true, force: true });
  console.log(`PROBE handover (mode=${MODE}): ${total}/${total} PASS`);
  process.exit(0);
} else {
  console.log(`PROBE handover (mode=${MODE}): FAILED — ${total - okCount} check(s) failed; sandbox kept at ${SANDBOX}`);
  for (const r of results.filter((x) => !x.ok)) console.log(`  FAIL [${r.id}] ${r.label} — ${r.detail}`);
  process.exit(1);
}
