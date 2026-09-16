# TASK — worker: make intercept_observer loadable + implement the read-scope fuzzy read function

Worker: `worker_Q4_140K`. Stay on the current checkout (opencode_test).
Baseline (re-verified by the planner 2026-09-16, plan2): probe **169/169**
(`node .opencode/plugin/probes/handover_probe.mjs`), pytest **459 passed +
1 warning** (`.venv`), ruff **F=0** (`.venv/Scripts/ruff.exe check --select F .`),
smokes green incl. `intercept_observer.smoke.mjs` 24/24.

## Verified planner facts (do not re-derive)

- The opencode plugin loader (verified in the installed binary's minified
  source): a plugin module is normalized by iterating `Object.values(module)`
  and EVERY value must be a function (or an object with a function
  `.server`) — else `TypeError("Plugin export is not a function")` at load.
  `intercept_observer.ts` exports ~16 named constants/functions, so it FAILS
  to load in the live host (opencode.log run of 2026-09-16:
  `error="Plugin export is not a function"`); `ctx_watchdog.ts` (default
  export ONLY, line 719) loads fine. **Root cause confirmed — this is the
  small fix the maintainer anticipated.**
- The pure core (all named exports: `loadNumwordMap`, `resolveNumword`,
  `classifyContext`, `observeDense/Pairs/Numword/PathAnomaly/Sandbox`,
  `observeArg`, `flattenField`, `underRoot`, the `VERDICTS`/`VERDICT_RANK`/
  constants/regexes) is fully pinned by probe S18 (checks 150–170, section
  starts at line ~3086 in `handover_probe.mjs`) and smoke (24 checks). The
  probe imports the plugin file direct (`OBS_TS`, line ~3098) and uses
  `ioMod.<named>` + `ioMod.default`; the smoke uses `mod.default` only.
- Design source for the read function: research doc
  `.opencode/agent/research/2026-09-16_fuzzy-and-numword-tool-reliability.md`
  §2.2–2.7 (matcher: exact → normalize (case/slash/trim) → Levenshtein over
  FULL relative paths; accept d<=2 AND gap to second-best >= 2; else
  fail-closed with top-N candidate log; corpus cached, TTL-bounded) and
  §2.3 scope rule (READ-ONLY tools only — writes/edit/delete NEVER fuzzy).
- The plugin must stay RESTART-GATED for live acceptance (hooks load at
  registration). Do NOT try to prove liveness — pin + gate green is the DoD.

## Unit 1 — export fix (core split)

1. New file `.opencode/plugin/intercept_observer_core.ts`: moves ALL named
   exports out of the plugin file (types, constants, regexes, pure functions)
   — the file is a pure module, default export NOT required (it is never
   loaded by the host loader directly).
2. `intercept_observer.ts` keeps ONLY the hook plumbing (dir/map state,
   getModel, appendRaw/appendObservation/appendError, onToolBefore) and
   `export default (async (input) => {...}) satisfies Plugin;` importing the
   core. **Zero other `export` statements** (verify:
   `grep -c "^export" .opencode/plugin/intercept_observer.ts` = 1).
3. Probe S18 + smoke: import the named core from the core file, `default`
   from the plugin file. Keep every existing check semantically identical.

## Unit 2 — read-scope fuzzy resolution (the "read functionality", approved)

In the CORE (pure, pinned):
- `buildCorpus(root)`: relative paths under root, skip `.git`/`node_modules`,
  cap 20k entries; cache with TTL (60s) in the plugin layer or a simple
  cache arg — your call; fail-safe: empty corpus → never resolves.
- `resolveReadPath(argPath, corpus)`: arg → relative form (against root);
  exact after normalize → `{kind:"exact"}`; else Levenshtein over full
  relative paths → `{kind:"resolved", path, d, gap}` iff d<=2 AND gap>=2;
  else `{kind:"rejected", cands: top3 [path,d], reason}` (d>2 / gap<2).

In the plugin hook (wiring):
- Scope: `input.tool === "read"` with a string `output.args.filePath` ONLY
  (glob/grep/section-anchors = NOT this unit — queue them in your handover).
- `resolved` → MUTATE `output.args.filePath` to the resolved absolute path.
- Extend `VERDICTS`/`VERDICT_RANK` with two new tokens (existing six stay
  byte-identical): `fuzzy-resolved` (evidence:
  `fuzzy orig=<arg> -> <resolved> d=<n> gap=<g>`) and `fuzzy-rejected`
  (evidence: `fuzzy orig=<arg> cands=<p1 d1,p2 d2,p3 d3> reason=<r>`),
  same C7 8-field line shape to `.opencode/temp/intercept.log`.
- Log BOTH outcomes (addendum C6: conservative + both logged); NEVER touch
  write/edit tool args.

Live-acceptance fixtures (5.4 one-shot, tear-down stays in for the verdict):
- Pre-create the sentinel twin pair in the scratchpad
  (`C:/Users/Wasiejen/AppData/Local/Temp/opencode/fuzzy_accept/`):
  `file-four.txt` (sentinel: word-form name, content `ORIGINAL`) and
  `file-4.txt` (twin, content `TWIN`). Do NOT delete — the acceptance at the
  next restart reads the sentinel with a d<=2 mistyped path and checks the
  returned content + the log line (mutation channel LIVE or NOT).

## Verification (DoD, all must hold)

- `grep -c "^export" .opencode/plugin/intercept_observer.ts` = 1 and the
  module's every `Object.values` entry is a function
  (`node -e` import check on the type-stripped file).
- Probe green with the NEW self-annotated total (S18 grows by the new
  fixtures: resolveReadPath exact/normalize/d1/d2/gap<2/d>2/cand-shape,
  hook mutation on sandbox read, fail-closed no-mutation + log line,
  both new verdicts' line shape). Machine-check the annotation like S18.
- Smoke green (extend with the sandbox read-resolution flow; keep the
  live-log-unchanged guard).
- Standard gate: pytest 459+1w, ruff F=0, all other smokes unchanged.
- Handover to `handover_task_to_planner.md` (what changed, measured
  verification, commits, queue items, what was NOT done).

## DO-NOT-touch
`.opencode/maintainer/**`, `AGENTS.md`, `opencode.jsonc`, the watchdog
plugin, the numword scriptlet (`scripts/numword/`), the live
`.opencode/temp/intercept.log`, `numwords.json`. Commit per the routine
(code + TODO.md + handover in one commit).
