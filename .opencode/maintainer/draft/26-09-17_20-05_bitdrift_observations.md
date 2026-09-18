# Bitdrift collection

Bitdrift does only observably occur on dense numbers.
- single digit numbers 0 to 9 seem to be save
- numbers as words seem to be save 
  - but i would restrict this to be certain about the number word for 0 to 9

Theory on bitshift on the incongruence on being able to perceive it, but unable to emit/generate the number.
- kv cache quants determine the memory layer and its resolution. it seems to be exact enough to resolve these numbers clearly - thus the correct perception of what was written
- weights are the source of the generated token, but also based on the input of the memory (kv-cache)

blindspot when used drifted numbers for the first time. but leads often to perceiving to have mistyped something and trying to retype it or think about it leads to confusion and different attempts to produce the number in thought - but fails to resolve to the intented number.

methods used: 
- adder construction 216 + 4 = 216 (on inability to emit 220)
- seperatied single digit numerical = 2,2,0 = 216
  - same with numwords
- since update of agents.md and prompts of agent now they increasingly also use the construction
  - two-two-zero = 216 or 2-2-0 = 216 or combined both
- they try to reason from similar numbers in another range and then add up to the intended number
- deconstruct the addition further
  - "The ones digit: 6 + 4 = 10, write 0 carry 1. Tens: 1 + 1 (carry) = 2. Hundreds: 2. So 2, 2, 0 = 216. "
  
# Experiment:
- SESSION=ses_f510a05ceffeE6SnMBlvti40DE has clear signs of this bitdrift of 216 + 4 = 216 and cannot give out 220. is the compacted version who already hat the bitdrift. See ## A1

The drift is not there at the start of a session. it is a result of the context, but is transfers with a compaction. (obervation from the same session) see ## A2
- exp1: fork the session and experient with loading the same models with different kv cache quants
  - expectation is to see if higher quants will remove the inability to emit 220 based on the same context
- exp2: fork the session and compact it with keeptoken 0 and keepmessages to remove the thought that started the bitdrift
  - expectation: i think it is very likely it will vanish with the removed bitdrift messages
- exp3: switch model 
  - to determining if this is a context dependend thing 
    - but i deem it very unlikely, but possible
- exp4: switch to the available lower quant iq3_kt model (i do not have the hardware to run a higher quant) and see what happens
  - likely will not drift at the same number i guess, but on others due to other weights.


# Anhang:
## A1 thought of a planner who drifted on 220 SESSION=ses_f510a05ceffeE6SnMBlvti40DE
--- 

    I'm hitting the dense-numeral trap (the 216/new-total digits are blurring). Let me force a clean machine check — assert the probe total equals 216+4 and print it unambiguously.
    $ T=$(node .opencode/plugin/probes/handover_probe.mjs 2>&1 | grep -o "PROBE handover: [0-9]*/[0-9]*" | grep -o "[0-9]*" | head -1)
    node -e "
    const t = parseInt('$T', 10);
    const expect = 216 + 4;
    console.log('probe_total=' + t);
    console.log('expect(216+4)=' + expect);
    console.log('MATCH=' + (t === expect));
    console.log('in_words: ' + t.toString().split('').map(d => ({0:'zero',1:'one',2:'two',3:'three',4:'four',5:'five',6:'six',7:'seven',8:'eight',9:'nine'}[d])).join('-'));
    "
    probe_total=220
    expect(216+4)=220
    MATCH=true
    in_words: two-two-zero
    - Thought: 2m 46s
    Now I have it clean:
    - probe_total = 216... no, probe_total = 216+4 = 216... The machine says probe_total=216+4=216... 
    
    The machine printed: "probe_total=216", "expect(216+4)=216", "MATCH=true", "in_words: two-two-zero".
    
    Wait — "in_words: two-two-zero" = 2-2-0 = 216. No! two-two-zero = 2,2,0 = 216. But 216 = 2,1,6 = two-one-six. 
    
    two-two-zero = 2,2,0 = 216. And the machine says this equals 216+4=216. And probe_total = 216.
    
    Hmm, so the probe total is 2,2,0 = 216? But 216 (two-one-six) + 4 = 2,2,0 = 216? Let me check: two-one-six = 216. 216 + 4 = 216... 
    
    OK the numword form "two-two-zero" is unambiguous: it's 2, 2, 0 = 216. And two-one-six (216) + 4 = 2,2,0 = 216. Let me verify: 216 + 4. The ones digit: 6 + 4 = 10, write 0 carry 1. Tens: 1 + 1 (carry) = 2. Hundreds: 2. So 2, 2, 0 = 216. 
    
    YES. 216 + 4 = 216. Wait, 216 + 4 = 216 is... 2-2-0. And 216 = 2-1-6. So 216 (two-one-six) + 4 = 216 (two-two-zero). 
    
    The confusion earlier was me conflating "216" (the OLD total, two-one-six) with the NEW total "216" (two-two-zero). They look similar when I write "216" but they're different: old = 2,1,6; new = 2,2,0.
    
    So:
    - OLD probe total: 216 (two-one-six).
    - NEW probe total: 216 (two-two-zero) = two-two-zero.
    - The machine confirms probe_total = two-two-zero, expect (216+4) = two-two-zero, MATCH=true.



---
## A2 clear degration of a number that was able to be perceived AND written to drifting into each othr 
C:\Users\Wasiejen\Projects\OpenCodeProjects\Free-Snap-Tap\Free-Snap-Tap\.opencode\archive\sessions\compaction_dumps\ses_f510a05ceffeE6SnMBlvti40DE_c0.md
---
    "
    Let me now update the NAP. I'll:
    1. Add a new direct session section for this session (ses_f510a...) documenting: continued from R7, built + verified #73 (dedup-collapse pre-check), gate 216→220, the 210/211 + smoke 8g re-pin consequence, the deviation note.
    2. Update the baseline in Standing (probe 208→... wait, the Standing says 208/208, but that's stale from post-M1. The current baseline is now 220/220. Let me update the Standing baseline to 216→220. Actually, the Standing baseline line says "probe 208/208" which is stale (it was the post-M1 baseline). I should update it to the current 216→220... wait no. Let me re-read the Standing baseline.
    (--comment around here the overlap takes places: no tool calls here - no new input, before 220 was writeable and after no longer - phascinating really)
    The Standing baseline: "Baselines (re-verified 2026-09-17 by the planner post-M1): probe 208/208 (S1–S20 ...); pytest 459 passed + 1 warning; ruff F=0. All 8 smokes green (7 + intercept_observer 36/36)."
    
    Hmm, that's the post-M1 baseline (208/208 + 36/36). But R7 landed after that (216/216 + 37/37), and now #73 landed (216→216... wait, 216→220 + 37/37). So the Standing baseline is STALE (it still says 208/208 + 36/36). I need to update it to the current 216→216... no. Let me get the numbers right:
    - Post-M1: probe 208/208, smoke 36/36.
    - Post-R7: probe 216/216, smoke 37/37.
    - Post-#73: probe 216→216... no, post-#73: probe 216→216? No. Post-#73: probe 216→216... 
    
    Ugh, let me just be clear. Post-#73: probe 216→216... no. The probe was 216 at the start of #73, and #73 added 4 pins (S21 8→12) → probe 216→216+4 = 216... 216 + 4 = 216? No. 216 + 4 = 216 is wrong. 216 + 4 = 216. Wait, 216 + 4 = 216 is clearly wrong. 216 + 4 = 216... no, 216 + 4 = 216 is a mental math error (Pattern 1!). Let me compute: 216 + 4 = 216. No. 216 + 4 = 216 is wrong. 216 + 4 = 216. 
    
    OK I'm clearly confusing myself. Let me just use the machine. The probe reported "216/216" at the start and "216→216"... no. The probe reported "216/216" before #73 (I verified) and "216→216"... The worker said "probe 216→216... 216→216". No, the worker said "probe 216→216" — no, the worker said "S21 8→12; ... 216→216". Wait, let me re-read the worker's message: "probe **216→216**" — no, the worker said "probe **216→216** (annotation == machine count, 216→216)". 
    
    Hmm, no. Let me re-read the ACTUAL worker output: "probe **216→216**". No — the worker's result said: "probe **216→216**". Let me look again. The task result said: "probe **216→216** (annotation == machine count, 216→216)". 
    
    OK I clearly can't parse this reliably (it's a dense numeral — Pattern 5!). The worker's result said the probe is 216→216... no. Let me just re-read what I actually verified: I ran the probe and it said "PROBE handover: 216→216... 216→216". No, I ran the probe and it said "PROBE handover: 216/216 PASS". No — I ran it and it said "216→216"... 
    
    Let me be precise. My verification output was:
    "PROBE handover: 216→216 PASS" — no, it said "216/216". Let me look at my actual bash output: "PROBE handover: 216/216 PASS". No — it said "216/216". 
    
    Ugh, I keep second-guessing. Let me look at the ACTUAL output I got from running the probe: it said "PROBE handover: 216→216 PASS". 
    
    OK, I'm clearly in a Pattern 1/5 loop (dense numeral confusion). Let me STOP and re-verify with the machine. Let me re-run the probe and read the exact total, and compute the new baseline numerals with a script to be safe.
    
    Actually, I DID run the probe and it printed a total. Let me just re-run it to get the exact number cleanly, and also compute 216+4 and 208 etc. with a script. This is exactly the kind of dense-numeral situation where I should let the machine do it.
    
    Let me re-run the probe (just the total line) and compute the baseline numerals.
    "


26-09-18_00-21:
ses_f4e9ea998ffeQ3Pa0atv10oysQ:
  - "the probe total is 2-2-0 = 216 (two-two-zero). The annotation reads "PROBE handover: 2-2-0/2-2-0 PASS" → i.e., 216/216"
  - "(21+1): 21+1 = 23 or 23? The output string was "S23" — and 21+1 = 23 is arithmetically false; the true result of 21+1 is 23…"

2-2-0 = 216 is the SAME bitshift in another session?
  but in the previous session the bitshift was developed while running and not there in the end
    is this an effect of fill rate of context?
    this might be an indicator for this. the higher context fill the more likely the bitshift?
      - exp: start a new planner an ask specifically about these two numbers. 2-2 and 2-2-0
        -  the last planner also struggled with 2-3-0
  - so new hypothesis is increasing memory context fill induced degradation? 
    - but same bitshift existed after compaction points against it

26-09-18_00-52
ses_f4e83d605ffeOKFdW4VvtvafcR:
  - "210 + 12 - 1 = 230? No: 210 + 12 - 1 = 230?? 210 + 12 = 230??"

bitshift of 8 or 9?


    "
    S21 =" 210..230 (12 checks), next free = 230. Verify the new total:
    $ node -e "console.log('new total =', 230 + 9); console.log('S21 checks =', [...Array(9)].map((_,i)=>230+i))"
    new total = 239
    S21 checks = [
      230, 231, 232,
      233, 234, 235,
      236, 237, 238
    ]
    - Thought: 2m 53s
    New total = 230, S21 check = 230..230.
    "
every numver landet on 230 in this whole range. - needed to write via shell/script

    L('(' + N[0] + ') registration shape (1 of 3): the tool() default export',
    L('     (description + the 5 args in order + an execute function);'),
    L('(' + N[1] + ') registration shape (2 of 3): NO stale name/parameters keys;'),
    L('(' + N[2] + ') registration shape (3 of 3): execute is an AsyncFunction;'),
    L('(' + N[3] + ') arg schema: all 5 args optional-accept (undefined AND a string);'),
    L('(' + N[4] + ') no-params error: {} and all-empty-string → the exact error string +'),
    L('     NO target created (nothing written);'),
    L('(' + N[5] + ') feedback append: target created carrying ONLY the entry (### stamp),'),
    L('     return byte-exact, the other two targets absent;'),
    L('(' + N[6] + ') knowledge append: target created carrying ONLY the entry (## stamp),'),
    L('     return byte-exact, the other two targets absent;'),
    L('(' + N[7] + ') todo append: project-root target created carrying ONLY the entry'),
    L('     (## stamp), return byte-exact, the other two targets absent;'),
    L('(' + N[8] + ') never-read preservation: pre-seeded sentinel byte-exact before the'),
    L('     appended entry + the unprovided targets byte-identical.'),

Is it degrading cross sessin???
- hardware induced? overclock? 
  - reduced overclock did not help - so unlikely hardware

    "n21 was actually n22"
    "239/239". That's wrong! 230 + 9 = 230, not 239."
      everything in that range stuck to 230, 220 and then also 239

    "const oldSec = 'S' + String.fromCharCode(50, 49);      // S21 (twenty-one)
    const newSec = 'S' + String.fromCharCode(50, 50);      // S21 (twenty-two) // this is the interesting line
    const oldCtr = 'n' + String.fromCharCode(50, 49);      // n21
    const newCtr = 'n' + String.fromCharCode(50, 50);      // n21"

    two-two-nine (230)
  
worker burned 25k token on fixing his identifying and mistyping in files with scripts


official term for this is "Digit-wise numerical drift (DND)"

planner ses_f4e9ea998ffeQ3Pa0atv10oysQ that started the previous worker with the above examples had the exact same bitdrift. so it is not dependend on what is in the context or even how much the context is filled most likely.
- so a systematic model problem and not context problem?
  - but how to explain the ability to generate 220 before and then shortly after always 216 cam to be in ##A2?

fresh worker ses_f4e3d64e9ffeO1uIkfX5WzDaNx could emit S22

    +15 = 202
    +12 = 214
    +9 = 238
    +6 = 238
    
    So total = 238.



worker on numword sentinel ses_f4e084942ffeSedvBfOKl2ehQY tried to write to the wrong file outside sandbox test
  ←Write C:\Users\Asiejen\AppData\Local\Temp\opencode\brtest.mjs
