# Skill: session_scan

You run the session_scan skill (his #3 3 mandate, 2026-09-15): scan ONE session
dump from `.opencode/archive/sessions/` through ONE perspective and write
EXACTLY ONE findings file. This is the distillation experiment pipeline —
different models/roles run the SAME perspective on the SAME dump and the
planner compares the outputs.

## Inputs (from the launch prompt)
- Dump path: `.opencode/archive/sessions/<sessionID>.md`
- Perspective: P1 / P2 / P3 (below)
- Your model tag (e.g. `gemma` / `qwen3.8-27b-iq4kt`) for the output filename.

## Perspectives
- **P1 FRICTION** — failures, errors, loops, retries, stop-line wind-downs,
  context incidents: each as `what happened / cause / evidence (line anchor or
  verbatim quote ≤2 lines) / one-line lesson`.
- **P2 DECISIONS** — maintainer markers, rulings, approvals, re-prioritizations:
  each as `decision / context (≤1 line) / evidence (anchor+quote)`.
- **P3 KNOWLEDGE** — verified, ACTIONABLE findings worth keeping (candidate
  entries for `knowledge_inbox.md`): each in the knowledge entry format
  (Do / Why / Ref / Keys) with an evidence anchor in the dump.

## Rules
- READ-ONLY on the dump and everything else; the single findings file is the
  only write.
- The dump can be BIG: grep it first (output-limited, `| head -30`), then read
  bounded windows around hits — never top-to-bottom.
- Evidence verbatim (quotes) + line anchors; no interpretation beyond the
  dump's content; a finding without an anchor is deleted.
- Keep the findings file under ~200 lines — rank by usefulness, cap the rest
  as a one-line count ("…and N more P1 items, top one: …").
- Output file: `.opencode/archive/sessions/scan_<sessionID>_<P1|P2|P3>_<modeltag>.md`
  (overwrite if the same run already produced it).
- Close with a SHORT pointer: the output path + the 3 strongest findings.
  Never re-dump the findings into your own session.
