// =============================================================================
// Persistent offline probe for .opencode/plugin/handover.ts (v2.2 final code).
// Built 2026-09-08 (v2.2.1, TODO.md #20). PERMANENT repo tooling: RE-RUN, never
// rebuild — exception: the plugin's hook surface changes.
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
//   S4 transform injection — v2.2 injects on EVERY transform — 4 shapes:
//      (1) LIVE shape {sessionID, model:{…}} (no agent) + good shell → exactly
//          ONE `ctx: CTX=12345 (10%) REM=100000` line appended, prior items kept
//      (2) agent:"worker_120K_mtp" + shell → appended (no gate)
//      (3) junk shell (resolves without a CTX= prefix) → omitted, no throw
//      (4) no shell ($ undefined) → omitted, no throw
//      Each shape logs exactly one kind:"transform" evidence line (4 total).
//   S5 hygiene: every sandbox plugin.log line is JSON.parse-able, <=2000 chars,
//      has an ISO ts + a string kind; exact kind tallies; the real handover
//      files byte-identical to pre-run and zero CO-APPENDED live lines (the real
//      plugin.log may only grow — the LIVE session's own plugin legitimately
//      appends its own lines while the probe runs inside a bash invocation; a
//      line carrying a probe fingerprint id s*/c*/d*/t* = the probe wrote out
//      of the sandbox); zero new/changed files outside the sandbox
//      (.opencode listing + git status, before vs after).
//
// EXPECTED OUTPUT SUMMARY — BEFORE and AFTER run identically 23/23 PASS (the
// v2.2.1 edit is comment-only, so behavior must be byte-identical both sides —
// any S4 drift between the two runs IS the finding):
//   S1=5 S2=4 S3=5 S4=4 S5=5  →  "PROBE handover (mode=<mode>): 23/23 PASS",
//   exit code 0. Anything else = behavior drift or broken environment — read
//   the failures, do not "fix" the plugin for the probe. On failure the
//   sandbox root is KEPT (printed) for forensics.
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
const CTX_EXPECTED = `ctx: CTX=12345 (10%) REM=100000`;
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
const readMirror = () => readFileSync(SB_MIRROR, "utf8");

// fake BunShell: shell.cwd(d) → self; shell(cmd) → { nothrow() → self, text() → Promise<fixed> }
const makeShell = (textResult) => {
  const shell = (..._a) => ({ nothrow() { return this; }, text() { return Promise.resolve(textResult); } });
  shell.cwd = () => shell;
  return shell;
};
const goodShell = makeShell(GAUGE_GOOD);
const junkShell = makeShell(GAUGE_JUNK);

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

  // ------------------------------------------------------------------ S4 transform — v2.2: inject on EVERY transform

  // 15 — LIVE shape (no agent field) + good shell: exactly ONE ctx: line appended, prior items intact
  const h1 = await plugin({ directory: SANDBOX, $: goodShell });
  {
    const system = ["SYS A", "SYS B"];
    await h1["experimental.chat.system.transform"]({ sessionID: "t1", model: { id: "m-27B" } }, { system });
    check(
      "15",
      "S4",
      "LIVE shape (no agent, good shell): exactly one ctx: line appended, prior items verbatim",
      Array.isArray(system) && system.length === 3 && system[0] === "SYS A" && system[1] === "SYS B" && system[2] === CTX_EXPECTED,
      JSON.stringify(system),
    );
  }

  // 16 — worker agent field: no gate — appended (the evidence line carries the agent)
  {
    const system = ["SYS C"];
    await h1["experimental.chat.system.transform"]({ sessionID: "t2", agent: "worker_120K_mtp", model: { id: "m-27B" } }, { system });
    const evs = linesOfKind("transform");
    const ev2 = (() => { try { return JSON.parse(evs[1] ?? ""); } catch { return {}; } })();
    check(
      "16",
      "S4",
      'agent:"worker_120K_mtp" + shell: ctx: appended (no gate), evidence line carries agent',
      system.length === 2 && system[1] === CTX_EXPECTED && ev2.agent === "worker_120K_mtp",
      JSON.stringify({ system, ev2 }),
    );
  }

  // 17 — junk shell (resolves without a CTX= prefix): omitted, no throw
  {
    const h3 = await plugin({ directory: SANDBOX, $: junkShell });
    const system = ["SYS D"];
    let threw = false;
    try {
      await h3["experimental.chat.system.transform"]({ sessionID: "t3", model: { id: "m-27B" } }, { system });
    } catch {
      threw = true;
    }
    check("17", "S4", "junk shell (no CTX=): ctx omitted, no throw, system unchanged", !threw && system.length === 1 && system[0] === "SYS D", JSON.stringify(system));
  }

  // 18 — no shell ($ undefined): omitted, no throw
  {
    const h4 = await plugin({ directory: SANDBOX, $: undefined });
    const system = ["SYS E"];
    let threw = false;
    try {
      await h4["experimental.chat.system.transform"]({ sessionID: "t4", model: { id: "m-27B" } }, { system });
    } catch {
      threw = true;
    }
    check("18", "S4", "no shell: ctx omitted, no throw, system unchanged", !threw && system.length === 1 && system[0] === "SYS E", JSON.stringify(system));
  }

  // ------------------------------------------------------------------ S5 hygiene

  // 19 — every sandbox plugin.log line parses as JSON (no stray/blank/garbled lines)
  {
    const bad = logLines().filter((l) => {
      try {
        JSON.parse(l);
        return false;
      } catch {
        return true;
      }
    });
    check("19", "S5", "every sandbox plugin.log line is JSON.parse-able", bad.length === 0, bad.slice(0, 3).join(" | "));
  }

  // 20 — every line <= 2000 chars with an ISO ts + a string kind
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
    check("20", "S5", "every line <= 2000 chars, ISO ts + string kind", bad.length === 0, bad.slice(0, 3).join(" | "));
  }

  // 21 — exact kind tallies (no stray event lines either)
  {
    const tally = (k) => linesOfKind(k).length;
    check(
      "21",
      "S5",
      "kind tallies exact: warn==2, tool.before==6, tool.after==3, transform==4, event==0",
      tally("warn") === 2 && tally("tool.before") === 6 && tally("tool.after") === 3 && tally("transform") === 4 && tally("event") === 0,
      `warn=${tally("warn")} tool.before=${tally("tool.before")} tool.after=${tally("tool.after")} transform=${tally("transform")} event=${tally("event")}`,
    );
  }

  // 22 — zero co-appended LIVE lines: the real handover files must be byte-identical, and the
  //      real plugin.log must only GROW. The LIVE session's own plugin legitimately appends its
  //      own tool lines while this probe runs inside a bash invocation — those are not probe
  //      writes. The probe's fingerprint is its synthetic ids (s1–s4/c1–c6/d1–d3/t1–t4): if any
  //      appended real-log line carries one, the probe wrote out of the sandbox.
  {
    const POST = snapshotReal();
    const handoverDiff = REAL_FILES.filter((f) => f !== "plugin.log" && (PRE_REAL[f] ?? null) !== (POST[f] ?? null));
    const preLog = PRE_REAL["plugin.log"] ?? "";
    const postLog = POST["plugin.log"] ?? "";
    const monotonic = postLog.length >= preLog.length && (preLog === "" || postLog.startsWith(preLog));
    const newLines = monotonic ? postLog.slice(preLog.length).split("\n").filter((l) => l.length > 0) : [];
    const FINGERPRINT = ["s1", "s2", "s3", "s4", "c1", "c2", "c3", "c4", "c5", "c6", "d1", "d2", "d3", "t1", "t2", "t3", "t4"];
    const probeWroteLive = newLines.some((l) => FINGERPRINT.some((fid) => l.includes(`"session":"${fid}"`) || l.includes(`"call":"${fid}"`)));
    check(
      "22",
      "S5",
      "zero co-appended live lines: handover files byte-identical; plugin.log append-only; no probe-id lines in the appended tail",
      handoverDiff.length === 0 && monotonic && !probeWroteLive,
      `handoverDiff=${handoverDiff.join(",")} monotonic=${monotonic} probeWroteLive=${probeWroteLive}`,
    );
  }

  // 23 — zero writes outside the sandbox: .opencode listing + git status unchanged
  {
    const listingDiff = listOpencode().filter((p) => !PRE_OP_LISTING.includes(p));
    const gitChanged = gitStatus() !== PRE_GIT_STATUS;
    check("23", "S5", "sandbox isolation: .opencode listing + git status unchanged (no new/changed files outside sandbox)", listingDiff.length === 0 && !gitChanged, `new: ${listingDiff.join(", ")}; gitChanged=${gitChanged}`);
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
