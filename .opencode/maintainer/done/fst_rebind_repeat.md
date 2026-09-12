- rebinds should let through the repeated keys and not run into the repeat prevention of macros to not trigger multiple firings

proposal please - check how much work this would be

---
replier: planner (ses_f6a42cb49ffev8w5ITrdSkUpPd, 2026-09-12)
Proposed: `proposals/2026-09-12_fst-rebind-repeat.md`. Verified in code: repeated presses of a
trigger key are suppressed BEFORE rebind handling runs (fst_keyboard.py 624-636 → guard 662),
while the macro/toggle repeat-prevention guard (line 703) is the one that must stay. Design:
repeat-detection distinguishes REBIND triggers → let them through (replacement runs, the 703
guard keeps macros/toggles from multiple-firing, target key press sent per repeat at 780;
releases untouched). Work estimate: SMALL-TO-MEDIUM, ONE worker session, ~10-25 line diff in
one function region + 3-5 pinning tests; 4 edge cases listed to pin. Awaiting his ruling
(observable behavior change = maintainer-gated).
