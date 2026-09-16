# plan7 summary (iteration 7, ses_f5881492fffekCwsEwdfna4sge, planner Q4-140K — FIRST 140K session)

## Done (all planner-verified against git + gates)
1. **#63 closed** (worker-7, `6a9877f`): compact_memory smoke adapted to the
   dump hook — stub `dump_session.cjs` in the smoke sandbox (probe S13
   mirror) + 1 new chk. Smokes 43/43. Root cause measured at spec time (the
   hook's WARNING line in the response broke 4 byte-exact checks).
2. **RETRIAGE** of his `0e7bd8b` "--comment" TODO.md comments (new since
   plan6; the plan6-era sweep was `head`-truncated and missed TODO.md):
   #57 APPROVED, #54 APPROVED, #51 ruled (remove `type: module`), #58
   approved (gate commands; NOTE his marker there has a TYPO `--commment` —
   it evades the ready-made sweep).
3. **#57 closed** (worker-8, `733ca7a`): MOVE missing-dstFile guard hoisted
   BEFORE the source cut (approved data-loss fix); byte-identical error
   string; 2 new smoke assertions (20→22).
4. **#60 closed** (worker-9, `75be075` + `3f94875`): probe sections S15
   (block_transfer, 10 checks) + S16 (loop_log, 6 checks) appended; labels
   108-123; header annotation + the stale "PowerShell 7" run-command block
   fixed. **Probe total is now 120+2/120+2** (106 + 16; machine-verified).
5. **#57live finding + fix** (worker-10, `9fd7557`): first live test of the
   #55 dump hook since the restart exposed a real bug — the hook spawns with
   `process.execPath`, which on the live host is the opencode CLI
   (`opencode.exe` printed its help), so the live dump always failed
   (WARNING + DUMP-FAIL logged as designed; compaction unblocked — the
   contract held). Fix: exported `resolveNodeExe()` (node-basename pass-
   through, else PATH `node`) + 3 smoke chks (43→46). Live acceptance still
   pending his NEXT host restart (plugin reload; first post-restart
   compaction must produce `compaction_dumps/<sid>_c0.md`).

Final gates (planner re-ran): probe 120+2/120+2, pytest 459+1w, ruff F=0,
all 7 smokes green.

## Rescue record (the protocol, live-proven on the 140K model)
worker-9's first #60 launch died at `context_length_exceeded` (uncommitted
partial probe). Sequence: session dumped to the corpus → cross
`compact_memory` dispatch (COMPACT line 03-49, success; the #55 hook fired
in the meantime — its failure is finding #5) → `task_id` resume with the
post-compaction protocol → worker finished at a **93 % gauge**. The 140K
window did NOT prevent the wall on a heavy single task (2513-line probe +
spec); compaction-rescue remains the real safety net.

## Maintainer-requested observations (140K increase: looping / bitshifts /
misremembered facts) — from THIS session, honest instances included
1. **Bitshift/numwords, self-inflicted:** I mangled the plain number "145k"
   into progressively uglier numword forms ("one-four-ty-FIVE k") in the
   NAP — the numwords discipline over-applied to a single non-dense number
   is a net negative; plain digits are safer there.
2. **Dense numeric-string trap (Pattern 5), self-inflicted:** the probe's
   label/counter reconciliation (labels max 107 vs reported total 106, then
   "120+2" after +16 checks) took two failed regex passes + a mental-math
   confusion before machine-checking 106+16=120+2. The machine escaped
   every time; eye/brain comparison is where it broke.
3. **Misremembered/stale facts, self-inflicted:** (a) the session-start
   marker sweep was `head -40`-truncated — I missed the five TODO.md
   `--comment` lines until a second, targeted sweep; (b) the worker's
   "120+2/120+2" readout initially parsed as a contradiction of the 106
   baseline (dense X/X pair trap — the numwords lesson, again).
4. **Looping tendency:** none observed in this session (no repeated
   identical output blocks); the only "loop" was the regex re-derivation
   above (Pattern 3 adjacent — resolved by stopping and machine-checking).
5. **Gauge at 140K:** consistent — injected nudge and in-band readout agreed
   throughout; the lagging ~2-call margin still applied as documented.

## Feedback answers (his #57 `--comment` questions)
- buffer clear function: **yes** — `CLEAR` mode empties one buffer
  (`Clipboard buffer '<name>' cleared.`), multiple named buffers coexist.
- "when in doubt it saves it in buffer / append to buffer": NOT built — the
  approved minimal fix is the hoisted guard (error, source untouched); the
  append-on-doubt variant stays an idea for his direct session.
- "write a short feedback in maintainer/feedback folder": the folder no
  longer exists (per the inbox convention, feedback rides the NAP/summary —
  i.e. HERE); the tool's current status is documented in the #57 close-note
  + this summary.
- his idle-thought (shared sandbox scriptlet for all data-changing scripts):
  noted, NOT built — good material for a future proposal.

## plan8 next (priority order)
1. **#54** (APPROVED): codify the no-circumvent rule into the role prompts
   (planner-direct prompt text).
2. **#51** (his ruling): remove `"type": "module"` from
   `.opencode/package.json` + let the probe header (lines ~40-41) agree;
   verify the probe still runs clean after.
3. **#58** (approved): add the probe command (+ the 120+2 baseline) to
   `repo_commands.md` §Run / test; fold in #63's open question (should the
   smokes join the gate?) as a proposal for his direct session.
4. #56 stays last (his `--comment`); fst-rebind-repeat remains PARKED for
   his direct session.

action: restart
