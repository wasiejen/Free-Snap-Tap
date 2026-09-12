run a test. 19k token dump file read and 2 gauge reads without mainteiner interaction and the model has to report all observed contect values 

quote:"
Gauge 2 returned CTX=63720 (53%). Here's the full set of attached values from this run, plus each gauge's own return for comparison:
tool call	attached (p%/nK)	gauge returned CTX (REM)
2nd dump read	(34%/78K)	—
gauge 1	(35%/77K)	42986 (35%) / 77014
gauge 2	(53%/56K)	63720 (53%) / 56280

//maintainer comment: first value was attached to the result of the dump read
// both after were tool calles with a lot of though betwenn. raw dump around 19k token
What the attached value measures
The (p%/nK) on a tool result is a snapshot of the session's persisted token count taken when that tool call is processed — and it always equals what ctx_gauge returns at that same instant (gauge 1: 35%/77K ↔ 77014; gauge 2: 53%/56K ↔ 56280). It is not a live count of what's in the window right now.
The tell is the lag across the three calls:
- The read's attached value (34%/78K) is the pre-read snapshot — it matches the nudge from your message (CTX=41652, REM=78348 → 78K). It does not include the ~19k that read just ingested.
- Gauge 1 (35%/77K, REM 77014) is still only ~1.3k above that pre-read nudge — the 19k read still hasn't landed in the store.
- Gauge 2 (53%/56K, REM 56280) jumped +20,734 vs gauge 1 — that's the read's ~19k finally flushing in, plus overhead.
So: a large tool-output read only becomes visible to the gauge/attached value one or more turns later. The attached value and the ctx_gauge return agree with each other, but both trail the true context by the size of the most recent big read. The nudge in your message is the most up-to-date number of the three.
We're now at 53% (~63.7k tokens) — right at the ~50% target you originally described. Nothing near the stop line (85% / REM ≤ 15k)
"
so the actual value of the gauge is 2 messages late.

the model was also first not away of the attached value - did not register until i mentioned it
- needs to be codified in agents.md (? yes all model need this hint to look for it)
- also gauge usage needs around 500 token so repeated calls are expensive
(model thought alot between tool usages ... so values are from a test before with less thinking.)
