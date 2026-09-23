# Salvaged: worker-12 (ses_f33ee8eabffeaE0xuwZ7lc65NR) final message — the in-flight #85 part 3 unit-2 smoke section, cut off mid-write at the context wall (step-finish reason=length, output=23156, total=170238). Everything below the header is verbatim from the dump.

## msg_0cc29adb6001v82dxqlYbS7Gz6 | role=assistant | agent=worker_Q3S_170K | model=Qwen3.8-27B-Q3S-170K | 2026-09-23T02:47:58.646Z
meta: {"mode":"worker_Q3S_170K","finish":"length","tokens":{"total":170238,"input":184,"output":23156,"reasoning":0,"cache":{"write":0,"read":146898}}}
  [step-start] {"type":"step-start"}
  [reasoning]
The module import is fine. Next is the smoke test update — the biggest chunk of work. Let's plan the smoke edits:

1. **Header comment** (L1-36): update the UNIT 2 description to the passive nudge.
2. **UNIT 2 section** (L151-292): rewrite to tool.execute.after driven.
3. **autoCompact section** (L294-373): rewrite to tool-driven.
4. **Config section** (L375-475): rewrite to tool-driven.
5. **UNIT 2 #80 agent retention** (L832-886): rewrite to verdict-gate checks.
6. **New DoD checks**: stale-armed no-fire (new section after the Unit-2 base), 0.95/0.98 ladder, per-session, Direct suppresses both units (planner+Direct unit-4 + unit-2).
7. **smokeSids list** (L1110): add the new sids.

OK, let's carefully design the new smoke content.

### New UNIT 2 section (replaces L151-292):

```js
   // ============================================================
   // UNIT 2 — #85 part 3: the passive ctx-line suffix (no resume)
   //
   // The factory is re-invoked with a SPYING client: promptAsync
   // records every call (it must stay ZERO on the Unit-2 path — the
   // nudge is passive), `messages` is scripted per sid (the nudge's
   // scope gate does a FRESH fetch per nudge-eligible tool result),
   // the provider mock supplies limit data in the LIVE SDK shape.
   // Default config (no budget file — fail-open): usable = 100000 -
   // min(20000, 16000) = 84000; threshold 0.95 → the suffix fires at
   // >= 79800. The nudge rides the TOOL-CALL RETURN (the gauge
   // plugin's ctx: line channel) — driven via the tool.execute.after
   // hook (synchronous observation — no 5s tick wait).
   // ============================================================
   const CONTEXT = 100000, OUTPUT = 16000;
   const USABLE = CONTEXT - Math.min(20000, OUTPUT); // 84000
   const RATIO_HI = (80000 / USABLE).toFixed(3); // 0.952
   const RATIO_98 = (83000 / USABLE).toFixed(3); // 0.988

   const calls = [];
   const u2Msgs = [];
   const TOG = "<|autonom|>";
   const OFF = "<|Direct|>";
   const u2Pairs = (entries) => entries.map(([role, text]) => ({ info: { role }, parts: [{ type: "text", text }] }));
   const u2Script = new Map();
   // The nudge's scope gate needs a FRESH verdict: every nudge-eligible
   // scenario session carries an own-line ON toggle (any agent type —
   // the #82 case) so the verdict is "autorun" (in scope).
   u2Script.set("ses_u2_sat", u2Pairs([["user", TOG], ["assistant", "Working."]]));
   u2Script.set("ses_u2_low", u2Pairs([["user", TOG], ["assistant", "Working."]]));
   u2Script.set("ses_u2_over", u2Pairs([["user", TOG], ["assistant", "Working."]]));
   u2Script.set("ses_u2_nomodel", u2Pairs([["user", TOG], ["assistant", "Working."]]));
   u2Script.set("ses_u2_noprov", u2Pairs([["user", TOG], ["assistant", "Working."]]));
   u2Script.set("ses_u2_hi98", u2Pairs([["user", TOG], ["assistant", "Working."]]));
   u2Script.set("ses_u2_two", u2Pairs([["user", TOG], ["assistant", "Working."]]));
   u2Script.set("ses_u2_str", u2Pairs([["user", TOG], ["assistant", "Working."]]));
   const v2Session = {
     prompt: function () {},
     promptAsync: async (args) => { calls.push(args); return { data: { id: "queued" } }; },
     abort: function () {},
     list: function () {},
     get: function () {},
     message: function () {},
     messages: async (args) => { u2Msgs.push(args); return u2Script.get(args?.path?.id) ?? []; },
     todo: function () {},
     command: function () {},
     summarize: function () {},
   };
   const providerList = async () => ({...same...});
   const hooksU2 = await factory({ directory: proj, client: { session: v2Session, provider: { list: providerList }, app: { log: () => "log" } } });
   chk("UNIT 2: re-factory with the spying client returns the event hook", typeof hooksU2?.event === "function");
   chk("UNIT 2 #85 part 3: the factory exposes the tool.execute.after hook (the ctx-line channel)", typeof hooksU2?.["tool.execute.after"] === "function");

   const MODEL = { providerID: "prov_x", modelID: "model_x" };
   const msgUpdated = ... (same)
   const statusEv = ... (same)
   const fire = ... (same)
   // The nudge channel: one tool result for the session (the hook
   // mutates the output object IN PLACE — the gauge plugin's append
   // channel). The base output ends with a \n (the common real shape).
   const toolAfter = async (h, sid, base = `tool result for ${sid}\n`) => {
     const output = { title: "bash", output: base, metadata: {} };
     await h["tool.execute.after"]({ tool: "bash", sessionID: sid, callID: "call_x", args: {} }, output);
     return output.output;
   };
   const SUFFIX_95 = `self-compact now (ratio=${RATIO_HI})`;
   const SUFFIX_98 = `⚠⚠ --maintainer: context saturated at ratio=${RATIO_98} — self-compact NOW`;
   const nudgeLine = (sid) => readLines().filter((l) => l.includes(`nudge= sid=${sid}`)).length;
```

Wait — careful with SUFFIX_98: the ratio for 83000/84000. Let me compute: 83000/84000 = 0.9880952... toFixed(3) = "0.988". And 0.988 >= 0.98 ✓.

Continuing:

```js
   // Arm every scenario session: busy → assistant token update (NO idle —
   // the passive nudge never needs the tick; an idle would route Unit 4).
   await fire(hooksU2, "ses_u2_sat", [statusEv("ses_u2_sat", "busy"), msgUpdated("ses_u2_sat", "assistant", { total: 80000 }, MODEL)]);
   await fire(hooksU2, "ses_u2_low", [
     statusEv("ses_u2_low", "busy"),
     msgUpdated("ses_u2_low", "assistant", { total: 50000 }, MODEL),
     // a user-role update must NOT overwrite lastTokenTotal
     msgUpdated("ses_u2_low", "user", { total: 1000000 }),
   ]);
   await fire(hooksU2, "ses_u2_over", [
     statusEv("ses_u2_over", "busy"),
     msgUpdated("ses_u2_over", "assistant", { total: 80000 }, MODEL),
     msgUpdated("ses_u2_over", "assistant", { total: 40000 }), // OVERWRITTEN — not accumulated
   ]);
   await fire(hooksU2, "ses_u2_nomodel", [statusEv("ses_u2_nomodel", "busy"), msgUpdated("ses_u2_nomodel", "assistant", { total: 80000 })]);
   await fire(hooksU2, "ses_u2_noprov", [statusEv("ses_u2_noprov", "busy"), msgUpdated("ses_u2_noprov", "assistant", { total: 80000 }, { providerID: "prov_x", modelID: "model_missing" })]);
   await fire(hooksU2, "ses_u2_hi98", [statusEv("ses_u2_hi98", "busy"), msgUpdated("ses_u2_hi98", "assistant", { total: 83000 }, MODEL)]);
   await fire(hooksU2, "ses_u2_two", [statusEv("ses_u2_two", "busy"), msgUpdated("ses_u2_two", "assistant", { total: 80000 }, MODEL)]);

   // ---- DoD: ctx-line suffix on the tool-call return at 0.95 / 0.98
   const out95 = await toolAfter(hooksU2, "ses_u2_sat");
   chk("UNIT 2 #85 part 3: busy session at ratio >= 0.95 (default) → the ctx-line suffix on the tool result (self-compact now)",
     out95.endsWith(SUFFIX_95), out95.slice(-120));
   chk("UNIT 2 #85 part 3: no promptAsync on the Unit-2 path (the nudge is passive — no resume)", calls.length === 0, `n=${calls.length}`);
   chk("UNIT 2 #85 part 3: nudge= log line present for the first suffix (with the ratio)",
     readLines().some((l) => l.includes(`nudge= sid=ses_u2_sat`) && l.includes(RATIO_HI)), "");
   const out98 = await toolAfter(hooksU2, "ses_u2_hi98");
   chk("UNIT 2 #85 part 3: busy session at ratio >= 0.98 → the --maintainer-flagged line on the tool result",
     out98.endsWith(SUFFIX_98), out98.slice(-120));

   // ---- DoD: per-session independent nudge — two active busy sessions
   // each get their own suffix
   const outTwo = await toolAfter(hooksU2, "ses_u2_two");
   chk("UNIT 2 #85 part 3: two active busy sessions at the threshold → EACH gets its own nudge (independent)",
     out95.endsWith(SUFFIX_95) && outTwo.endsWith(SUFFIX_95) &&
       nudgeLine("ses_u2_sat") === 1 && nudgeLine("ses_u2_two") === 1,
     `sat=${nudgeLine("ses_u2_sat")} two=${nudgeLine("ses_u2_two")}`);

   // ---- sub-threshold / model-missing scenarios: no suffix, no send
   const outLow = await toolAfter(hooksU2, "ses_u2_low");
   chk("UNIT 2: sub-threshold session (ratio < 0.95 default) → no suffix (user-role update did not overwrite — still not the saturation input)",
     !outLow.includes("self-compact now") && calls.length === 0, outLow.slice(-80));
   const outOver = await toolAfter(hooksU2, "ses_u2_over");
   chk("UNIT 2: lastTokenTotal OVERWRITTEN (80000 then 40000 → below threshold → no suffix)", !outOver.includes("self-compact now"), outOver.slice(-80));
   const outNm = await toolAfter(hooksU2, "ses_u2_nomodel");
   chk("UNIT 2: no model info → no suffix", !outNm.includes("self-compact now"), outNm.slice(-80));
   const outNp = await toolAfter(hooksU2, "ses_u2_noprov");
   chk("UNIT 2: provider data missing (model not listed) → no suffix", !outNp.includes("self-compact now"), outNp.slice(-80));
```

Next, the "per-step reminder + once-per-cycle log dedup" check (replacing the old "second idle → no second send" + "fresh busy → sends again"):

```js
   // ---- a SECOND tool result in the SAME busy cycle → the suffix
   // appends AGAIN (the per-step reminder — unlike the old once-per-
   // cycle send) but only ONE nudge= log line for the cycle (the dedup)
   const outSat2 = await toolAfter(hooksU2, "ses_u2_sat");
   chk("UNIT 2 #85 part 3: second tool result in the same busy cycle → the suffix appends again (per-step reminder)",
     outSat2.endsWith(SUFFIX_95), outSat2.slice(-80));
   chk("UNIT 2 #85 part 3: once-per-cycle nudge= log line (dedup) — still exactly one for the cycle", nudgeLine("ses_u2_sat") === 1, `n=${nudgeLine("ses_u2_sat")}`);

   // ---- fresh busy cycle → the dedup resets → a new nudge= line
   await fire(hooksU2, "ses_u2_sat", [statusEv("ses_u2_sat", "busy")]);
   const outSat3 = await toolAfter(hooksU2, "ses_u2_sat");
   chk("UNIT 2 #85 part 3: fresh busy → the nudge-log dedup resets (a new nudge= line) + the suffix rides the next tool result",
     outSat3.endsWith(SUFFIX_95) && nudgeLine("ses_u2_sat") === 2, `n=${nudgeLine("ses_u2_sat")}`);
```

Next, the dual-shape string-busy check:

```js
   // ---- dual-shape acceptance: a STRING-shape "busy" event (older host
   // shape / mocks) still arms the watch + the nudge fires on the tool
   // result (the LIVE object shape is what statusEv pins above).
   await fire(hooksU2, "ses_u2_str", [
     { event: { type: "session.status", properties: { sessionID: "ses_u2_str", status: "busy" } } },
     msgUpdated("ses_u2_str", "assistant", { total: 80000 }, MODEL),
   ]);
   const outStr = await toolAfter(hooksU2, "ses_u2_str");
   chk("UNIT 2: STRING-shape busy event still arms + the nudge fires on the tool result (dual-shape acceptance)",
     outStr.endsWith(SUFFIX_95) && readLines().some((l) => l.includes("arm= sid=ses_u2_str")), `n=${calls.length}`);
```

Next, the fail-safety checks (replacing the throwing-promptAsync section):

```js
   // ---- fail-safety: a THROWING messages() fetch (the nudge's scope
   // gate) → no suffix, no throw, no send (fail-safe = no nudge); the
   // hook survives. The throwing client replaces the module client for
   // this scenario.
   const u2ScriptThrow = new Map(u2Script);
   u2ScriptThrow.set("ses_u2_sendfail", { throw: "messages exploded for ses_u2_sendfail" });
   const v3Session = {
     prompt: function () {},
     promptAsync: async (args) => { calls.push(args); return { data: { id: "queued" } }; },
     abort: function () {},
     list: function () {},
     get: function () {},
     message: function () {},
     messages: async (args) => {
       const scripted = u2ScriptThrow.get(args?.path?.id);
       if (scripted && typeof scripted === "object" && scripted.throw) throw new Error(scripted.throw);
       return scripted ?? [];
     },
     todo: function () {},
     command: function () {},
     summarize: function () {},
   };
   const hooksU3 = await factory({ directory: proj, client: { session: v3Session, provider: { list: providerList }, app: {} } });
   await fire(hooksU3, "ses_u2_sendfail", [statusEv("ses_u2_sendfail", "busy"), msgUpdated("ses_u2_sendfail", "assistant", { total: 80000 }, MODEL)]);
   let threw3 = false;
   let outFail = "";
   try { outFail = await toolAfter(hooksU3, "ses_u2_sendfail"); } catch { threw3 = true; }
   chk("UNIT 2 #85 part 3: throwing messages() fetch (scope gate) → no suffix, no throw, no send (fail-safe = no nudge)",
     threw3 === false && !outFail.includes("self-compact now") && calls.length === 0, `n=${calls.length}`);
```

Hmm wait — the old fail-safety section also had "missing provider data → no send, no trigger line, count unchanged" (ses_u2_noprov2 with prov_missing). I'll fold that in: ses_u2_noprov2 with a missing provider → no suffix. Let's add it:

```js
   await fire(hooksU3, "ses_u2_noprov2", [statusEv("ses_u2_noprov2", "busy"), msgUpdated("ses_u2_noprov2", "assistant", { total: 80000 }, { providerID: "prov_missing", modelID: "model_x" })]);
   const outNp2 = await toolAfter(hooksU3, "ses_u2_noprov2");
   chk("UNIT 2: missing provider data → usable null → no suffix, no send, count unchanged",
     calls.length === 0 && !outNp2.includes("self-compact now") && !readLines().some((l) => l.includes(`nudge= sid=ses_u2_noprov2`)), `n=${calls.length}`);
```

Wait — but the calls array: the v3Session's promptAsync pushes to the same `calls`. So far calls.length === 0. ✓

Next, the STALE-ARMED DoD check (new):

```js
   // ---- DoD: stale armed session — armed at a HIGH ratio, goes IDLE,
   // stays armed; autoCompact on (no budget file). The passive nudge
   // CANNOT reach it: no tool result (an idle session emits none) → no
   // nudge, and NO promptAsync (no resume). The old tick design would
   // have fired within 5s — wait one full tick period to pin it.
   const staleMsgs = () => u2Pairs([["user", TOG], ["assistant", "Done. action: stop"]]);
   u2Script.set("ses_u2_stale", staleMsgs());
   // re-factor with the v2 spy client (the fail-safety section above
   // re-factored with the throwing v3Session — restore the spy)
   const hooksU2b = await factory({ directory: proj, client: { session: v2Session, provider: { list: providerList }, app: { log: () => "log" } } });
   await fire(hooksU2b, "ses_u2_stale", [statusEv("ses_u2_stale", "busy"), msgUpdated("ses_u2_stale", "assistant", { total: 80000 }, MODEL), statusEv("ses_u2_stale", "idle")]);
   const cBeforeStale = calls.length;
   await sleep(5600); // at least one full tick period (the old design fired on the tick)
   chk("UNIT 2 #85 part 3: stale armed session (armed at a high ratio, goes idle, stays armed; autoCompact on) → NO fire (no nudge, no resume — no promptAsync, no nudge= line)",
     calls.length === cBeforeStale && nudgeLine("ses_u2_stale") === 0 && !readLines().some((l) => l.includes(`sid=ses_u2_stale`) && l.includes("route=")),
     `n=${calls.length} nudge=${nudgeLine("ses_u2_stale")}`);
```

Hmm wait — about the "no route=" part: the stale session is scoped (autorun — the script has TOG + "Done. action: stop") → Unit 4 routes → action: stop → `route= stop` line. So a `route= stop sid=ses_u2_stale` line IS expected (Unit 4 works as designed). My check `!readLines().some(l => l.includes("sid=ses_u2_stale") && l.includes("route="))` would fail. I shouldn't assert no route line — Unit 4's CONTINUE/stop routing is normal behavior (Unit 4 scope unchanged). The DoD is "no nudge, no resume" — resume = the Unit-2 self-compact send. The stale script's last assistant line is "action: stop" → Unit 4 routes to stop → no CONTINUE send. So the correct assertions are: calls.length unchanged (no promptAsync — no Unit-2 send and no Unit-4 CONTINUE) + no nudge= line. To make the Unit-4 side meaningful, I'll assert that the route= stop line is present (pinning that Unit 4 still routes — the unit-4 scope unchanged) — no, actually that's an extra claim; the DoD doesn't require it. But it's a good pin that the stale session's idle was routed by Unit 4 (not by Unit 2). Let's assert the `route= stop sid=ses_u2_stale` line is present (Unit 4 did its job) — hmm, but the timing: route= stop happens on the tick (within the 5.6s wait). OK, I'll include it.

Wait, actually — hmm, the "route= stop" check: the session's script's last assistant message is "Done. action: stop" → lastAssistantAction → "stop" → route= stop. ✓

Next, the autoCompact section (reusing the hooksUT/tCalls pattern — but now tool-driven):

```js
   // ---- autoCompact toggle (maintainer priority #1): an OPTIONAL
   // top-level `autoCompact` key in `.opencode/temp/compact_budget.json`
   // (the sandbox's budget file — NEVER the live one) gates the nudge
   // (read PER tool-result call — a live edit takes effect on the next
   // tool result, no tick): absent/true → the suffix; false → suppressed
   // SILENTLY (no per-tool-result log line); missing/unreadable/malformed
   // file → fail OPEN (the suffix). A FRESH spying client — the fail-
   // safety section above re-factored with the throwing v3Session.
   const tCalls = [];
   const tScript = new Map(u2Script); // the toggle scenarios: own-line ON toggle
   for (const s of ["ses_u2_tgnof", "ses_u2_tgoff", "ses_u2_tgon", "ses_u2_tgmal"]) tScript.set(s, u2Pairs([["user", TOG], ["assistant", "Working."]]));
   const vTSession = {
     prompt: function () {},
     promptAsync: async (args) => { tCalls.push(args); return { data: { id: "queued" } }; },
     abort: function () {},
     list: function () {},
     get: function () {},
     message: function () {},
     messages: async (args) => tScript.get(args?.path?.id) ?? [],
     todo: function () {},
     command: function () {},
     summarize: function () {},
   };
   const hooksUT = await factory({ directory: proj, client: { session: vTSession, provider: { list: providerList }, app: { log: () => "log" } } });
   const budgetFile = path.join(proj, ".opencode", "temp", "compact_budget.json");
   const writeBudget = (content) => fs.writeFileSync(budgetFile, content, "utf-8");
   const hasSuffix = (s) => s.includes("self-compact now") || s.includes("--maintainer");

   // case 1: NO budget file + ratio >= 0.95 (default) → the suffix
   fs.rmSync(budgetFile, { force: true });
   await fire(hooksUT, "ses_u2_tgnof", [statusEv("ses_u2_tgnof", "busy"), msgUpdated("ses_u2_tgnof", "assistant", { total: 80000 }, MODEL)]);
   const outTNo = await toolAfter(hooksUT, "ses_u2_tgnof");
   chk("UNIT 2: autoCompact — NO budget file (key absent) → the suffix fires (status quo)",
     hasSuffix(outTNo) && tCalls.length === 0 && nudgeLine("ses_u2_tgnof") === 1, `n=${tCalls.length}`);

   // case 2: autoCompact:false + ratio >= 0.95 (default) → NO suffix
   // (silent suppression — no per-tool-result log line); a flip back ON
   // (file removed) takes effect on the NEXT tool result (per-call
   // read — no tick, no budget-retention semantics)
   writeBudget(JSON.stringify({ autoCompact: false }));
   await fire(hooksUT, "ses_u2_tgoff", [statusEv("ses_u2_tgoff", "busy"), msgUpdated("ses_u2_tgoff", "assistant", { total: 80000 }, MODEL)]);
   const nTOff = tCalls.length;
   const outOff1 = await toolAfter(hooksUT, "ses_u2_tgoff");
   const outOff2 = await toolAfter(hooksUT, "ses_u2_tgoff"); // second tool result, still OFF
   chk("UNIT 2: autoCompact:false + ratio >= 0.95 (default) → NO suffix (even on a second tool result)",
     tCalls.length === nTOff && !hasSuffix(outOff1) && !hasSuffix(outOff2), `n=${tCalls.length}`);
   chk("UNIT 2: autoCompact:false → silent suppression (no nudge= line for the suppressed session)", nudgeLine("ses_u2_tgoff") === 0, "");
   fs.rmSync(budgetFile, { force: true }); // flip back ON (key absent)
   const outOff3 = await toolAfter(hooksUT, "ses_u2_tgoff");
   chk("UNIT 2: toggle flipped back ON → the suffix fires on the NEXT tool result (per-call read — no tick needed)",
     hasSuffix(outOff3) && tCalls.length === nTOff && nudgeLine("ses_u2_tgoff") === 1, `n=${tCalls.length}`);

   // case 3: autoCompact:true + ratio >= 0.95 (default) → the suffix
   // (explicit ON)
   writeBudget(JSON.stringify({ autoCompact: true }));
   await fire(hooksUT, "ses_u2_tgon", [statusEv("ses_u2_tgon", "busy"), msgUpdated("ses_u2_tgon", "assistant", { total: 80000 }, MODEL)]);
   const outTOn = await toolAfter(hooksUT, "ses_u2_tgon");
   chk("UNIT 2: autoCompact:true + ratio >= 0.95 (default) → the suffix fires",
     hasSuffix(outTOn) && tCalls.length === nTOff && nudgeLine("ses_u2_tgon") === 1, `n=${tCalls.length}`);

   // case 4: MALFORMED budget file content + ratio >= 0.95 (default) →
   // fail OPEN (the suffix)
   writeBudget("{ this is not valid json !!!");
   await fire(hooksUT, "ses_u2_tgmal", [statusEv("ses_u2_tgmal", "busy"), msgUpdated("ses_u2_tgmal", "assistant", { total: 80000 }, MODEL)]);
   const outTMal = await toolAfter(hooksUT, "ses_u2_tgmal");
   chk("UNIT 2: autoCompact — MALFORMED file → fail OPEN, the suffix fires",
     hasSuffix(outTMal) && tCalls.length === nTOff && nudgeLine("ses_u2_tgmal") === 1, `n=${tCalls.length}`);
   fs.rmSync(budgetFile, { force: true }); // leave the sandbox clean
```

Wait — the nudgeLine() helper is defined in the UNIT 2 section scope (the whole smoke is inside one big try block — so the helper persists). ✓ The toolAfter helper also persists. ✓

Next, the config section:

```js
   // ============================================================
   // UNIT 2 (cont.) — #85 part 3: configurable threshold + output
   // reserve (maintainer ruling 2026-09-22: "only trigger it past the
   // 95% line") — read PER tool-result call (a live edit takes effect on
   // the next tool result, no tick), fail-open (absent / unparseable /
   // out-of-range → the defaults 0.95 / 20000). Reuses hooksUT + tCalls
   // (same spying client). Node-computed expectations: usable (default
   // reserve) = 84000: 80000/84000 = 0.952 (suffix), 79000/84000 = 0.940
   // (no suffix — WOULD fire at the old 0.85 default); 55000/84000 =
   // 0.655 (suffix at 0.60, no suffix at 0.95); 40000/84000 = 0.476 (no
   // suffix even at 0.60). Usable (reserve 0) = 100000: 96000/100000 =
   // 0.960 (suffix), 82000/100000 = 0.820 (no suffix — whereas
   // 82000/84000 = 0.976 WOULD at the default reserve).
   // ============================================================
   const cfgScript = new Map(tScript);
   for (const s of ["ses_u2_cfa_low", "ses_u2_cfa_hi", "ses_u2_cfb_edit", "ses_u2_cfb_fire", "ses_u2_cfb_no", "ses_u2_cfc_fire", "ses_u2_cfc_no", "ses_u2_cfd_low", "ses_u2_cfd_hi"]) cfgScript.set(s, u2Pairs([["user", TOG], ["assistant", "Working."]]));
   // the config scenarios need the cfg script — re-factor (the module-
   // level client is the vT client above; its script is tScript)
```

Hmm wait — hooksUT's client uses tScript. The config section needs cfgScript. I should either re-factor, or just extend tScript in place. Simpler: extend tScript in place (same client): `for (const s of [...]) tScript.set(...)`. The tScript Map is referenced by the closure inside vTSession.messages — mutating the Map works. Let's do that (no re-factor needed).

```js
   for (const s of ["ses_u2_cfa_low", "ses_u2_cfa_hi", "ses_u2_cfb_edit", "ses_u2_cfb_fire", "ses_u2_cfb_no", "ses_u2_cfc_fire", "ses_u2_cfc_no", "ses_u2_cfd_low", "ses_u2_cfd_hi"]) tScript.set(s, u2Pairs([["user", TOG], ["assistant", "Working."]]));

   // case (a): NO config → fail-open defaults 0.95 / 20000 — both
   // sessions evaluated on ONE pass: 79000 (0.940) below, 80000 (0.952)
   // above.
   fs.rmSync(budgetFile, { force: true });
   await fire(hooksUT, "ses_u2_cfa_low", [statusEv("ses_u2_cfa_low", "busy"), msgUpdated("ses_u2_cfa_low", "assistant", { total: 79000 }, MODEL)]);
   await fire(hooksUT, "ses_u2_cfa_hi", [statusEv("ses_u2_cfa_hi", "busy"), msgUpdated("ses_u2_cfa_hi", "assistant", { total: 80000 }, MODEL)]);
   const outCfgLow = await toolAfter(hooksUT, "ses_u2_cfa_low");
   const outCfgHi = await toolAfter(hooksUT, "ses_u2_cfa_hi");
   chk("UNIT 2 config: no config → fail-open 0.95/20000 — 80000 (0.952) gets the suffix", hasSuffix(outCfgHi), outCfgHi.slice(-80));
   chk("UNIT 2 config: no config — 79000 (0.940 < 0.95 default) does NOT get the suffix (would at the old 0.85)", !hasSuffix(outCfgLow), outCfgLow.slice(-80));
   chk("UNIT 2 config: no config — no nudge= line for the below-threshold session, one for the above (with the ratio)",
     nudgeLine("ses_u2_cfa_low") === 0 && readLines().some((l) => l.includes("nudge= sid=ses_u2_cfa_hi") && l.includes("0.952")), "");
```

Wait — "0.952" — RATIO_HI is 0.952. 80000/84000 = 0.952380 → toFixed(3) = "0.952". ✓

```js
   // case (b): PER-CALL LIVE EDIT — ses_u2_cfb_edit armed at 55000
   // (0.655) while NO config (below the 0.95 default) → no suffix on
   // the tool result; then saturationThreshold 0.60 is written → the
   // NEXT tool result gets the suffix (read per call — no restart, no
   // tick needed).
   const nCfgB0 = tCalls.length;
   await fire(hooksUT, "ses_u2_cfb_edit", [statusEv("ses_u2_cfb_edit", "busy"), msgUpdated("ses_u2_cfb_edit", "assistant", { total: 55000 }, MODEL)]);
   const outCfgB0 = await toolAfter(hooksUT, "ses_u2_cfb_edit");
   chk("UNIT 2 config: armed at 0.655 while no config → no suffix (0.95 default)", !hasSuffix(outCfgB0) && tCalls.length === nCfgB0, `n=${tCalls.length}`);
   writeBudget(JSON.stringify({ saturationThreshold: 0.60 }));
   const outCfgB = await toolAfter(hooksUT, "ses_u2_cfb_edit");
   // The next tool result re-evaluates at the new threshold: the armed
   // 0.655 session gets the suffix AND the lingering ses_u2_cfa_low
   // from case (a) (0.940, never suffixed — the same busy cycle keeps
   // its tokens) now crosses 0.60 too.
   const outCfgBLow = await toolAfter(hooksUT, "ses_u2_cfa_low");
   chk("UNIT 2 config: LIVE EDIT saturationThreshold 0.60 → the armed 0.655 session gets the suffix on the NEXT tool result (the lingering 0.940 session crosses too)",
     hasSuffix(outCfgB) && hasSuffix(outCfgBLow) && tCalls.length === nCfgB0, `n=${tCalls.length}`);
   chk("UNIT 2 config: live-edit suffix names ratio 0.655", outCfgB.includes("0.655"), outCfgB.slice(-80));

   // case (b, cont.): threshold 0.60 in force — 55000 (0.655) suffix,
   // 40000 (0.476) does NOT (both on the same pass).
   await fire(hooksUT, "ses_u2_cfb_fire", [statusEv("ses_u2_cfb_fire", "busy"), msgUpdated("ses_u2_cfb_fire", "assistant", { total: 55000 }, MODEL)]);
   await fire(hooksUT, "ses_u2_cfb_no", [statusEv("ses_u2_cfb_no", "busy"), msgUpdated("ses_u2_cfb_no", "assistant", { total: 40000 }, MODEL)]);
   const outCfgBFire = await toolAfter(hooksUT, "ses_u2_cfb_fire");
   const outCfgBNo = await toolAfter(hooksUT, "ses_u2_cfb_no");
   chk("UNIT 2 config: saturationThreshold 0.60 → 55000 (0.655) gets the suffix", hasSuffix(outCfgBFire), outCfgBFire.slice(-80));
   chk("UNIT 2 config: saturationThreshold 0.60 → 40000 (0.476) does NOT", !hasSuffix(outCfgBNo), outCfgBNo.slice(-80));

   // case (c): outputReserve 0 → usable = 100000 - min(0, 16000) = 100000:
   // 96000 (0.960) suffix; 82000 (0.820) does NOT — whereas 82000/84000
   // = 0.976 WOULD at the default reserve.
   writeBudget(JSON.stringify({ outputReserve: 0 }));
   await fire(hooksUT, "ses_u2_cfc_fire", [statusEv("ses_u2_cfc_fire", "busy"), msgUpdated("ses_u2_cfc_fire", "assistant", { total: 96000 }, MODEL)]);
   await fire(hooksUT, "ses_u2_cfc_no", [statusEv("ses_u2_cfc_no", "busy"), msgUpdated("ses_u2_cfc_no", "assistant", { total: 82000 }, MODEL)]);
   const outCfgCFire = await toolAfter(hooksUT, "ses_u2_cfc_fire");
   const outCfgCNo = await toolAfter(hooksUT, "ses_u2_cfc_no");
   chk("UNIT 2 config: outputReserve 0 → usable 100000 — 96000 (0.960) gets the suffix", hasSuffix(outCfgCFire), outCfgCFire.slice(-80));
   chk("UNIT 2 config: outputReserve 0 — the suffix names ratio 0.960 (usable 100000)", outCfgCFire.includes("0.960"), outCfgCFire.slice(-80));
   chk("UNIT 2 config: outputReserve 0 — 82000 (0.820) does NOT get the suffix (0.976 at the default reserve WOULD)", !hasSuffix(outCfgCNo), outCfgCNo.slice(-80));

   // case (d): OUT-OF-RANGE values → fail-open defaults: saturationThreshold
   // "high" (not a number) + outputReserve -5 (negative) are both ignored
   // → 79000 (0.940) no suffix, 80000 (0.952) suffix at usable 84000
   // (same pass).
   writeBudget(JSON.stringify({ saturationThreshold: "high", outputReserve: -5 }));
   await fire(hooksUT, "ses_u2_cfd_low", [statusEv("ses_u2_cfd_low", "busy"), msgUpdated("ses_u2_cfd_low", "assistant", { total: 79000 }, MODEL)]);
   await fire(hooksUT, "ses_u2_cfd_hi", [statusEv("ses_u2_cfd_hi", "busy"), msgUpdated("ses_u2_cfd_hi", "assistant", { total: 80000 }, MODEL)]);
   const outCfgDLow = await toolAfter(hooksUT, "ses_u2_cfd_low");
   const outCfgDHi = await toolAfter(hooksUT, "ses_u2_cfd_hi");
   // The fail-open defaults re-arm the default 0.95/20000 math: the
   // lingering ses_u2_cfc_no from case (c) (82000 — 0.820 under reserve
   // 0, but 0.976 at the default reserve 84000) gets the suffix too,
   // alongside ses_u2_cfd_hi.
   const outCfgCNo2 = await toolAfter(hooksUT, "ses_u2_cfc_no");
   chk("UNIT 2 config: out-of-range values (string threshold, negative reserve) → fail-open defaults — 80000 gets the suffix at usable 84000 (the lingering 0.976-at-default session crosses too)",
     hasSuffix(outCfgDHi) && hasSuffix(outCfgCNo2) && outCfgDHi.includes("0.952"), outCfgDHi.slice(-80));
   chk("UNIT 2 config: out-of-range values → 79000 (0.940 < 0.95 default) does NOT get the suffix", !hasSuffix(outCfgDLow), outCfgDLow.slice(-80));
   fs.rmSync(budgetFile, { force: true }); // leave the sandbox clean
```

Hmm wait — one issue: in case (b), ses_u2_cfa_low gets a suffix on its second tool result (0.940 ≥ 0.60). Its attempts counter: first tool result (case a, threshold 0.95) → no suffix, attempts stays 0. Second tool result (threshold 0.60) → suffix + nudge= line (attempts 0→1). ✓ nudgeLine("ses_u2_cfa_low") becomes 1 — my case (a) check asserted nudgeLine("ses_u2_cfa_low") === 0 — that's before case (b). ✓ Ordering matters: case (a) check runs before case (b) fires. ✓

Also, wait — in case (d), ses_u2_cfc_no gets a suffix (attempts for it: first result in case (c) — threshold... wait, in case (c) the reserve is 0: 82000/100000 = 0.820 < 0.95 → no suffix, attempts 0. Case (d): reserve back to default 20000 → usable 84000 → 0.976 ≥ 0.95 → suffix + nudge= line. ✓

Now — one subtlety: the tScript-based verdict for all config sessions = TOG → autorun. ✓ And the tCalls client's promptAsync stays 0 throughout (no idle → no Unit-4). ✓

Next, the UNIT 2 #80 agent-retention section (L832-886) — rewrite:

Old section: re-factors with the u2agSession client (promptAsync spy, messages from the shared msgScript). Scenarios ses_u3_new (spawned, PLANNER_A agent), ses_u2_agnet (worker agent, no toggle), ses_u2_agnone (no agent). All three 80000. Old checks: 3 sends with the agent-retention rules; then Unit-4 scope= none ×3.

New section: the nudge's scope gate — all three verdicts are "none" for different reasons (spawned / no-toggle-no-planner / no-toggle-no-agent) → NO suffix on any tool result (the (c) gate), zero promptAsync. Then idle → Unit-4 routes all three as scope= none (no route lines).

```js
   // ============================================================
   // UNIT 2 #85 part 3 — the nudge's scope gate (the factory is re-
   // invoked with a fresh spying client — promptAsync + messages both
   // spied, messages scripted per sid from the shared msgScript):
   //  - a spawned (OUT-of-scope, #85) session whose first user
   //    message carries the planner agent → verdict "none" (the
   //    self-mark) → no suffix;
   //  - a NON-scoped session whose first user message carries an
   //    agent field (no toggle) → verdict "none" → no suffix;
   //  - a NON-scoped session with NO user agent field (no toggle) →
   //    verdict "none" → no suffix.
   // The old #80 agent-retention checks pinned the agent field in the
   // unit-2 SEND body — the send is gone (#85 part 3: passive nudge,
   // no body): the equivalent pin is the verdict gate on the fresh
   // fetch.
   // ============================================================
   const u2agCalls = [];
   const u2agSession = {
     prompt: function () {},
     promptAsync: async (args) => { u2agCalls.push(args); return { data: { id: "queued" } }; },
     abort: function () {},
     list: function () {},
     get: function () {},
     message: function () {},
     messages: async (args) => msgScript.get(args?.path?.id) ?? [],
     todo: function () {},
     command: function () {},
     summarize: function () {},
     create: async () => ({ data: { id: "ses_u2ag_spawn" } }),
   };
   const hooksU2ag = await factory({ directory: proj, client: { session: u2agSession, provider: { list: providerList }, app: { log: () => "log" } } });
   chk("UNIT 2 #85 part 3: re-factory with the scope-gate spying client returns the event hook", typeof hooksU2ag?.event === "function");

   await fire(hooksU2ag, "ses_u3_new", [statusEv("ses_u3_new", "busy"), msgUpdated("ses_u3_new", "assistant", { total: 80000 }, MODEL)]);
   await fire(hooksU2ag, "ses_u2_agnet", [statusEv("ses_u2_agnet", "busy"), msgUpdated("ses_u2_agnet", "assistant", { total: 80000 }, MODEL)]);
   await fire(hooksU2ag, "ses_u2_agnone", [statusEv("ses_u2_agnone", "busy"), msgUpdated("ses_u2_agnone", "assistant", { total: 80000 }, MODEL)]);
   const outAg1 = await toolAfter(hooksU2ag, "ses_u3_new");
   const outAg2 = await toolAfter(hooksU2ag, "ses_u2_agnet");
   const outAg3 = await toolAfter(hooksU2ag, "ses_u2_agnone");
   chk("UNIT 2 #85 part 3: the nudge's scope gate — spawned / non-scoped / non-scoped saturated sessions → NO suffix (verdict none), zero promptAsync",
     !hasSuffix(outAg1) && !hasSuffix(outAg2) && !hasSuffix(outAg3) && u2agCalls.length === 0, `n=${u2agCalls.length}`);

   // unit-4 after the nudge pass: all three scope= none (no route line)
   await fire(hooksU2ag, "ses_u3_new", [statusEv("ses_u3_new", "idle")]);
   await fire(hooksU2ag, "ses_u2_agnet", [statusEv("ses_u2_agnet", "idle")]);
   await fire(hooksU2ag, "ses_u2_agnone", [statusEv("ses_u2_agnone", "idle")]);
   const okAg = await waitUntil(
     () =>
       readLines().some((l) => l.includes("scope= none sid=ses_u3_new")) &&
       readLines().some((l) => l.includes("scope= none sid=ses_u2_agnet")) &&
       readLines().some((l) => l.includes("scope= none sid=ses_u2_agnone")),
     12000,
   );
   chk("UNIT 2 #85 part 3: unit-4 after the nudge pass — all three scope= none (spawned / no-toggle worker / no-toggle no-agent), no sends",
     okAg && u2agCalls.length === 0 &&
       !readLines().some((l) => l.includes("sid=ses_u2_agnet") && (l.includes("route=") || l.includes("recovery="))),
     `n=${u2agCalls.length}`);
```

Hmm wait — there's a problem! The msgScript entries for these sessions are set earlier in the smoke:
- L832: `msgScript.set("ses_u3_new", mkPairs([["user", "plain direct"], ["assistant", "Done. action: stop"]], PLANNER_A));` — this is set in the old agent-retention section (which I'm replacing — I need to keep the msgScript setup). The original section sets:
```js
   msgScript.set("ses_u3_new", mkPairs([["user", "plain direct"], ["assistant", "Done. action: stop"]], PLANNER_A));
   msgScript.set("ses_u2_agnet", [
     { info: { role: "user", agent: "worker_Q3S_160K" }, parts: [{ type: "text", text: "plain" }] },
     { info: { info... 
```
Wait, the actual original (L832-840):
```js
   msgScript.set("ses_u3_new", mkPairs([["user", "plain direct"], ["assistant", "Done. action: stop"]], PLANNER_A));
   msgScript.set("ses_u2_agnet", [
     { info: { role: "user", agent: "worker_Q3S_160K" }, parts: [{ type: "text", text: "plain" }] },
     { info: { role: "assistant" }, parts: [{ type: "text", text: "Done. action: stop" }] },
   ]);
   msgScript.set("ses_u2_agnone", [
     { info: { role: "user" }, parts: [{ type: "text", text: "plain" }] },
     { info: { role: "assistant" }, parts: [{ type: "text", text: "Done. action: stop" }] },
   ]);
```

These msgScript sets are at the head of the section — I'll keep them (with the same content) in the new section.

Important — the verdict for ses_u3_new: the `spawned` map — was ses_u3_new self-marked? In the UNIT 3 section, a trigger file spawned ses_u3_new via the vSess client (the module's `spawned` map — module-level). YES: `spawned.set("ses_u3_new", ...)` happened in the UNIT 3 section (scenario 1: trigger present → create → ses_u3_new). So scopeVerdict returns "none" for ses_u3_new regardless of the messages. ✓ (The old smoke relied on that too: "ses_u3_new is still self-marked in the module-level spawned map".)

ses_u2_agnet: first user agent "worker_Q3S_160K" (not a planner), no toggle → none. ✓
ses_u2_agnone: no agent, no toggle → none. ✓

Next, the DoD Direct check (new section — "Direct suppresses both units"). Where to put it? After the UNIT 4 #85 part 1 section, or as its own section. Let me put it as a new section right after the UNIT 4 #85 part 1 block (before the #85 part 2 section), using the u4 client (u4Session + u4Sends). But wait — at that point in the smoke flow, the module's client is... the UNIT 4 #85 section re-factors with hooksU4b (u4Session). The #85 part 2 section re-factors with hooksP2. My Direct section needs both:
- Unit-2 side: a toolAfter for a saturated planner+Direct session → no suffix.
- Unit-4 side: idle → scope= none → no CONTINUE (no recovery line, no send).

I'll put it after the UNIT 4 #85 section (where hooksU4b/u4Session is the module client). Script:

```js
   // (6) #85 part 3 (d)+(c): a PLANNER session with a trailing own-line
   // <Direct|> → the toggle beats the planner test → scope "none":
   // NO Unit-4 CONTINUE (Unit 4 deactivated for the planner) AND no
   // Unit-2 ctx-line suffix (Unit 2 suppressed) — the DoD Direct
   // check (both units).
   msgScript.set("ses_p3_pldirect", [
     { info: { role: "user", agent: PLANNER_A }, parts: [{ type: "text", text: "<|Direct|>" }] },
     { info: { role: "assistant" }, parts: [{ type: "text", text: "Mid-unit, no closing line." }] },
   ]);
   await fire(hooksU4b, "ses_p3_pldirect", [statusEv("ses_p3_pldirect", "busy"), msgUpdated("ses_p3_pldirect", "assistant", { total: 80000 }, MODEL)]);
   const outDirect = await toolAfter(hooksU4b, "ses_p3_pldirect");
   chk("UNIT 2 #85 part 3 (c): Direct (scope none) on a PLANNER session → no ctx-line suffix (Unit 2 suppressed — the verdict beats the planner test)",
     !hasSuffix(outDirect), outDirect.slice(-80));
   const directBefore = u4Sends.length;
   await fire(hooksU4b, "ses_p3_pldirect", [statusEv("ses_p3_pldirect", "idle")]);
   const okDirect = await waitUntil(() => readLines().some((l) => l.includes("scope= none sid=ses_p3_pldirect")), 12000);
   await sleep(5600); // at least one full tick period (the old code CONTINUEd on the tick)
   chk("UNIT 4 #85 part 3 (d): Direct (scope none) on a PLANNER session → NO Unit-4 CONTINUE (Unit 4 deactivated for the planner — the toggle beats the planner test)",
     okDirect && u4Sends.length === directBefore &&
       !readLines().some((l) => l.includes("sid=ses_p3_pldirect") && (l.includes("route=") || l.includes("recovery="))),
     `n=${u4Sends.length}`);
```

Wait — the toolAfter for ses_p3_pldirect: the module's client at that point is hooksU4b (u4Session) — u4Session.messages reads msgScript. ✓ u4Session.promptAsync records to u4Sends. ✓

Hmm — one issue: the toolAfter hook on hooksU4b — the factory instance hooksU4b returns the hooks including "tool.execute.after". ✓ (All factory instances expose it.)

Also note: the nudge for ses_p3_pldirect — verdict "none" → silent (no suffix, no nudge= line, no scope log line — wait: the verdict is "none"; w.scope starts as "unknown" → verdict !== w.scope → the code only logs `scope= none` if it reaches that point... no wait — in onToolAfterNudge, `if (verdict === "none") return;` comes before the w.scope update/log. So the toolAfter pass doesn't log scope= none for it. Then the idle → routeScopedIdle fetches, computes "none", logs `scope= none sid=ses_p3_pldirect`. ✓ The okDirect wait catches that.

Also — the "route=" assertion: scope none → no route/recovery line at all (routeScopedIdle returns before routing). ✓ And no CONTINUE send. ✓

Wait — but there's one twist: in the DoD check, the old (planner-first) code would have: scopeVerdict → "planner" (agent PLANNER_A) → Unit-4 CONTINUE (last assistant "Mid-unit, no closing line." → no action line → CONTINUE attempt 1). So this check catches the regression. ✓ And the old Unit-2 (no scope gate) would have fired the nudge on the tick. The new check pins both suppressions. ✓

Now — another DoD item: "Direct (scope 'none') → no ctx-line suffix (Unit 2 suppressed)". I also have the worker Direct scenario... The DoD item says "Direct suppresses both units" — the planner scenario covers both units (Unit 2 suppression + Unit 4 deactivation). The old Unit 4 #82 section (4) already covers a worker Direct (scope= none, no sends). I think the planner+Direct combined check is the strongest. I could also add a pure-worker Direct nudge suppression check in the Unit-2 section: ses_u2_direct (worker, TOG then Direct, 80000) → no suffix. Let's add it to the UNIT 2 section (after the per-session check):

```js
   // ---- (c) Direct suppresses the Unit-2 nudge: a saturated session
   // with a trailing own-line <Direct|> (last-toggle-wins) → verdict
   // "none" → no suffix (even while actively working)
   u2Script.set("ses_u2_direct", u2Pairs([["user", TOG], ["user", "<|Direct|>"], ["assistant", "Working."]]));
   await fire(hooksU2, "ses_u2_direct", [statusEv("ses_u2_direct", "busy"), msgUpdated("ses_u2_direct", "assistant", { total: 80000 }, MODEL)]);
   const outDirect2 = await toolAfter(hooksU2, "ses_u2_direct");
   chk("UNIT 2 #85 part 3 (c): Direct (scope none) → no ctx-line suffix on the tool result (Unit 2 suppressed while actively working)",
     !hasSuffix(outDirect2) && calls.length === 0 && nudgeLine("ses_u2_direct") === 0, outDirect2.slice(-80));
```

But wait — hasSuffix is defined in the autoCompact section, which comes after the UNIT 2 section in the file! I need to define hasSuffix earlier (right after toolAfter in the UNIT 2 section) so both sections can use it. OK — I'll define it in the UNIT 2 section.

Also — one more consideration about the old Unit-2 section's checks that I'm dropping:
- "UNIT 2: send targets the saturated session (path.id)" → replaced by "the suffix lands on the saturated session's tool result" (implicit in the per-session check — the suffix appears in that session's output). ✓
- "UNIT 2: queued text names the measured ratio" → the suffix names the ratio. ✓ (nudge= line + SUFFIX_95 includes RATIO_HI)
- "UNIT 2: queued text instructs the compact_memory SELF path" → the new text is a short reminder; the spec locked the new text. ✓ (replaced)
- "UNIT 2: body has exactly ONE text part, no noReply" → no longer applicable (no body). The replacement pin is "no promptAsync on the Unit-2 path". ✓

Now — the old Unit-2 section had v2Session without `messages` — my new v2Session adds messages + u2Msgs. ✓

Now — the smoke header (L1-36): update the UNIT 2 description. Replace the UNIT 2 paragraph (L4-7) with the new passive design.

Also the smokeSids list: add "ses_u2_hi98", "ses_u2_two", "ses_u2_str" (already there? no — ses_u2_str was in the old list — checking: the old smokeSids includes "ses_u2_str" ✓), "ses_u2_sendfail" (old list ✓), "ses_u2_noprov2" (old ✓), "ses_u2_direct", "ses_u2_stale", "ses_p3_pldirect", "ses_u2_tgnof/tgoff/tgon/tgmal" (old ✓), the config sids (old list? checking the old smokeSids: ses_u2_cfa... is not in the old list! Looking at the old list: "ses_u2_sat", "ses_u2_low", "ses_u2_over", "ses_u2_nomodel", "ses_u2_noprov", "ses_u2_sendfail", "ses_u2_noprov2", "ses_u2_str", "ses_u2_tgnof", "ses_u2_tgoff", "ses_u2_tgon", "ses_u2_tgmal", "ses_u3_new", "ses_u3_chk2", ... — the config sids (cfa/cfb/cfc/cfd) are missing from the old smokeSids list! Interesting — the old smoke had this gap (the config sids weren't in the list — the live-log check would miss them; but the live check is only about the smoke's line landing in the live log — the config sids' lines also land only in the sandbox... the list is a guard; the old omission is harmless but incomplete). I'll add the missing sids: the config sids + the new ones. That's an improvement (honest fix).

OK — also, the old smoke's UNIT 2 #80 section header comment block (L818-831) references "the factory is re-invoked with a fresh spying client" — I'm replacing the whole section including that comment.

One more: the old Unit-2 section had a comment "The factory is re-invoked with a SPYING client: promptAsync records every call" — my replacement preserves that.

Also — the old smoke's `waitUntil` default 8000ms. My new checks are mostly synchronous; the waitUntil usage for the scope line is fine.

Now — the smoke timing: the old smoke took ~90s (many 5.6s sleeps). The new one: the stale check (5.6s) + the u2ag scope waits (a few ticks, up to 12s each — one waitUntil for 3 lines) + the Direct check (5.6s + a waitUntil). Total ~40-60s. OK.

Let me also double-check the `toolAfter` helper name — I'll use `toolAfter(h, sid)`. And the `hasSuffix` helper. Both defined in the UNIT 2 section.

Another detail — the old smoke's "UNIT 2: idle at ratio >= 0.95 (default) → exactly ONE promptAsync call" used `ok1 = await waitUntil(...)`. My new checks are direct (no waitUntil needed — the hook is synchronous; the getModelLimits cache: the provider list fetch is async — the hook awaits it — toolAfter awaits the hook — so after toolAfter returns, everything is done). ✓ No waitUntil needed in the Unit-2 section.

Wait — one important verification: the getModelLimits cache — the `limitsCache` is module-level (the plugin process's lifetime = the smoke process). In the old smoke, the first Unit-2 factory (hooksU2) called getModelLimits on a tick → cached prov_x/model_x = {context:100000, output:16000}. Subsequent factories reuse the cache. In my new smoke, the first toolAfter for ses_u2_sat triggers the getModelLimits fetch (the providerList mock) → cached. ✓

But — note: in the old smoke, the first provider fetch happened in the old Unit-2 section via the tick. In the new smoke, the first fetch is in the toolAfter — same result.

Now — the old smoke's "UNIT 2: re-factory with the spying client returns the event hook" check — keep + add the hook check.

Now let me write out all the smoke edits. The file is 1118 lines; I'll do targeted edits:

Edit S1: the header UNIT 2 paragraph (L4-7).
Edit S2: the UNIT 2 section L151-292 (from "// ============================================================" before "UNIT 2 — context-limit compaction trigger" to the end of the fail-safety section, i.e., up to just before "// ---- autoCompact toggle").
Edit S3: the autoCompact section L294-373.
Edit S4: the config section L375-475.
Edit S5: the UNIT 2 #80 section L818-886.
Edit S6: add the new Direct DoD section after the UNIT 4 #85 section (after L961, before the #85 part 2 section header).
Edit S7: the smokeSids list.

Let me write out Edit S2's exact oldString. From the read, L151-292:

L151: `   // ============================================================`
L152: `   // UNIT 2 — context-limit compaction trigger`
...
L292: `     calls.length === cBeforeFail && !readLines().some((l) => l.includes("trigger= sid=ses_u2_noprov2")), `n=${calls.length}`);`

That's a huge oldString (~140 lines). The edit tool requires an exact match — error-prone for such a large block. Alternative: use block_transfer? That moves/deletes, doesn't replace. Hmm. I could also: CUT the old block to a buffer, then PASTE the new content at the same location (targetMarker = the autoCompact section header line). block_transfer's COPY/CUT + PASTE: CUT the block from startMarker to endMarker in srcFile (dstFile is the same file), then PASTE the buffer to dstFile with a targetMarker. The anchors must be unique line prefixes.

Actually — simpler and safer: do a series of smaller edits, or use a node script to splice the file (read the file, slice the lines, write). A node script for a mechanical splice is reliable. But the protocol says to use the edit tool for edits... "Use Edit (NOT sed/awk)" — a node splice script is a write tool alternative. Hmm. For a 140-line block replacement, a node splice with line numbers is actually the most reliable. But I've already shifted line numbers by the plugin edits — the smoke file is unchanged so far (I've only edited auto_resume.ts). So the smoke's line numbers are still as read (1-1118).

Plan: a node script that:
1. Reads the smoke file's lines.
2. Replaces the range L151-292 with the new Unit-2 section text.
3. Replaces L294-373 with the new autoCompact section.
4. Replaces L375-475 with the new config section.
5. Replaces L818-886 with the new scope-gate section.
6. Inserts the new Direct section before the #85 part 2 section header (L963 `// ============================================================` — the one at L963-964 "// #85 part 2 — the CURRENT session agent+modelID...").

Wait, but if I replace the ranges in one pass from top to bottom using the original line numbers, the offsets shift — I must do it bottom-up (replace L818-886 first, then L375-475, then L294-373, then L151-292), and the insertion (the Direct section at ~L963) comes before the L818 edit in the bottom-up order: L963 > L886, so the L963 insertion comes first. Order: (1) insert at L963; (2) replace 818-886; (3) replace 375-475; (4) replace 294-373; (5) replace 151-292; (6) the header L4-7; (7) the smokeSids list at L1110 (near the end — do it first among all, or use a unique-string string replacement at the end).

Hmm, actually — the smokeSids list (L1110) is a single long line; I can do a small string edit later via the edit tool (append the new sids).

Rather than a node splice for everything, let me reconsider: 5 large-block replacements via edit() each need the exact old text. I have the exact old text from the reads (the smoke was read in two passes covering all 1118 lines — L1-780 and L781-1118). So I have the exact content. The risk is transcription error. A node splice with line ranges avoids the oldString matching entirely — but I'd write the new content as a heredoc into a temp file and splice. The protocol prefers the edit/write tools; but for a large mechanical splice, a node script is the bit-drift-safe choice (the AGENTS.md pattern: "let the machine do it"). I'll use a node script that writes the new sections into separate files (via the write tool), then splices by line range and verifies with a diff-ish check (line count, grep anchors).

Actually — even simpler and fully compliant: use the write tool to write the entire new smoke file? The smoke is 1118 lines; a full rewrite risks losing unchanged sections (Unit-3, Unit-4, #80, part-2). No — splice is better.

Plan:
1. Write the new sections into temp files: s_unit2.txt, s_autocompact.txt, s_config.txt, s_scopegate.txt, s_direct.txt, s_header.txt (in the scratchpad C:/Users/Wasiejen/AppData/Local/Temp/opencode).
2. A node script splices the smoke file bottom-up by line ranges (0-indexed carefully) and writes it back.
3. Verify: node syntax check (import the .mjs? it's .mjs — node --check), grep for the anchors, run the smoke.

Line ranges (1-indexed, from the original read):
- Header: L4-7 (the UNIT 2 paragraph). Actual L3-7:
  L3: `// (.opencode/plugin/auto_resume.ts; approved 2026-09-21 auto-resume`
  L4: `// proposal). UNIT 1: skeleton logging plugin + v1 client surface probe.`
  L5: `// UNIT 2: the context-limit compaction trigger — a live session crossing`
  L6: `// its saturation threshold (configurable per tick, default 0.95 of the`
  L7: `// usable window) queues ONE self-compact instruction via promptAsync`
  L8: `// (queued, never synchronous), once per busy cycle.`
  So the UNIT 2 paragraph = L5-8. Replace with the new description.
- UNIT 2 section: L151-292 (from the `   // ============================================================` at 151 to the closing of the missing-provider check at 292). Let me verify the boundary: L292 is `     calls.length === cBeforeFail && !readLines().some((l) => l.includes("trigger= sid=ses_u2_noprov2")), `n=${calls.length}`);` and L293 is blank, L294 starts the autoCompact comment `   // ---- autoCompact toggle (maintainer priority #1): an OPTIONAL`. So replace 151-292 inclusive.
- autoCompact: L294-373: L294 `   // ---- autoCompact toggle (maintainer priority #1): an OPTIONAL` ... L373 `   fs.rmSync(budgetFile, { force: true }); // leave the sandbox clean`. L374 is blank, L375 is `   // ============================================================` (the config section header). So replace 294-373.
- config: L375-475: L375 `   // ============================================================` ... L475 `   fs.rmSync(budgetFile, { force: true }); // leave the sandbox clean` — wait, L475: from the read, L475: `   fs.rmSync(budgetFile, { force: true }); // leave the sandbox clean`? The read shows L475: `   fs.rmSync(budgetFile, { force: true }); // leave the sandbox clean` — hmm, actually the read shows L475 as `   fs.rmSync(budgetFile, { force: true }); // leave the sandbox clean` — let me re-verify: the read output around 474-476:
  ```
  474:     !sentD.includes("ses_u2_cfd_low"), JSON.stringify(sentD));
  475:    fs.rmSync(budgetFile, { force: true }); // leave the sandbox clean
  476: 
  ```
  Note: L475 has 3-space indentation (`   fs.rmSync`) — actually "   fs.rmSync" — the read shows `475:    fs.rmSync(budgetFile, { force: true }); // leave the sandbox clean` — 4 spaces? The read line prefix format is "N: content" — the content after "475: " is `   fs.rmSync...` (3 spaces, matching the surrounding 3-space indentation style in that region — this section has some 4-space lines (L477-488 are 4 spaces — the sandboxJsonc block). Well — with the node splice I don't need to match; I just cut by line numbers.
  So replace 375-475.
- scope gate (UNIT 2 #80): L818-886: L818 `   // ============================================================` (the one before "// #80 — agent retention in the injected promptAsync bodies"), L819 `   // #80 — agent retention in the injected promptAsync bodies (the`, ... L886 `     `n=${u2agCalls.length}`);`. L887 is blank, L888 `   // ============================================================` (the UNIT 4 #85 section header). So replace 818-886.
- Direct section: insert before L963 (the `   // ============================================================` that starts the "#85 part 2" section — L963-964: from the read, L963: `   // ============================================================`, L964: `   // #85 part 2 — the CURRENT session agent+modelID in the injected`). So insert my block before L963.
- smokeSids: L1110 — edit by string (append the new sids).

Let me write out the new section contents. I need to be careful with the indentation style (3 spaces for section comments — the file uses `   //` with 3 spaces in the main try block).

Also — important: the new UNIT 2 section references helpers defined later (hasSuffix) — no, I'll define them inside the section. And `u2Pairs`, `u2Script`, `TOG` — defined in the UNIT 2 section; the autoCompact/config sections reference `TOG`, `u2Pairs`, `tScript` (defined in the autoCompact section). The scope-gate section references `msgScript` (defined in the Unit-4 section, earlier). The Direct section references `PLANNER_A`, `MODEL`, `u4Session`, `hooksU4b`, `u4Sends`, `msgScript` — all defined earlier in the file (the Unit-4 section). ✓ All good as long as the ordering is preserved.

Also — the new UNIT 2 section no longer sends an idle for the scenario sessions (no Unit-4 routing) — but wait, the old Unit-2 section did send an idle for ses_u2_sat etc. In the old flow, the Unit-4 routing for them: v2Session had no messages → routeScopedIdle logs `err= sid=... messages missing`. The new v2Session has messages (scripted) → the idle would route: scope autorun (TOG), last assistant "Working." (no action line) → CONTINUE! That's why I must not send idle in the Unit-2 section. ✓ (my design: busy + tokens only).

But — hmm, wait: one more twist. In the old smoke, the Unit-4 batch A section and later sections depend on the module's watch state... The Unit-4 section re-factors with the u4Session client. The module-level `watches` map persists (module-level state). The old Unit-2 section's sessions (ses_u2_sat etc.) went through an idle → idlePending got consumed → no residual. In the new flow, they never go idle → idlePending stays false → no residual Unit-4 action on them. ✓ Clean.

Now — another twist: the old Unit-2 #80 section's scenarios went busy→tokens→idle on the u2ag client. The Unit-4 routed them (scope none → no route line). In my new scope-gate section: busy→tokens→toolAfter→idle (for the scope line). ✓ As designed.

Now — the UNIT 3 section (L490-601) is unchanged. The UNIT 4 section (L603-768) unchanged. The #80 cap section (L770-816) unchanged. The old agent-retention section L818-886 → replaced. The UNIT 4 #85 section L888-961 unchanged (its checks: does the scopeVerdict reordering break it? verified earlier — no). The #85 part 2 section L963-1093 unchanged. The live-log section L1095-1113 — the smokeSids update. The finally block unchanged.

Now, let me double-check the old smoke's L963 too — from the read:
```
961:      `n=${u4Sends.length}`);
962: 
963:    // ============================================================
964:    // #85 part 2 — the CURRENT session agent+modelID in the injected
```
Hmm — L963 shows `    // ====...` (4 spaces?) — the read output: `963:    // ============================================================` — the prefix "963: " + the content "   // ==..."? The display is `963:    // ============================================================` — that's "963: " + "   // ====" (3 spaces). The read format is `N: content` — so the content after "963: " is `   // ============================================================` — 3 spaces. OK — with the splice I'll insert before line 963 (1-indexed).

Now, one more decision — the old agent-retention section's header comment mentioned "#80 — agent retention in the injected promptAsync bodies". The equivalent pin in the new section is the scope gate. I'll write the new section with a clear #85 part 3 header.

Let me also reconsider the count of new checks vs. old checks per section:

Old UNIT 2 section (L151-292) checks: 14-31 = 18 checks (from my numbering):
14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31 → 18 checks.

My new UNIT 2 section checks:
1. re-factory returns the event hook (was check 14? no — the old "UNIT 2: re-factory..." was L188, before the arm block — part of the old section: yes, the old section started at L151 with the comment, L163 `const CONTEXT`, L167 `const calls`, L187 the factory, L188 the re-factory check.)

Let me enumerate my new UNIT 2 section's checks:
A. re-factory returns the event hook
B. the factory exposes the tool.execute.after hook (new)
C. 0.95 → the ctx-line suffix on the tool result
D. no promptAsync on the Unit-2 path (new DoD)
E. the nudge= log line with the ratio
F. 0.98 → the --maintainer line (new DoD)
G. per-session independent nudge (new DoD)
H. (c) Direct worker → no suffix (new DoD)
I. below threshold → no suffix (user-role update)
J. overwrite → no suffix
K. no model → no suffix
L. provider missing → no suffix
M. second tool result in the same cycle → the suffix again (per-step)
N. once-per-cycle nudge= dedup
O. fresh busy → dedup reset + suffix
P. string-shape busy dual acceptance
Q. throwing messages → no suffix, no throw, no send
R. provider missing (noprov2) → no suffix, count unchanged
S. stale armed → no fire (new DoD)

= 19 checks (old 18 → +1 net, plus the new DoD pins).

Old autoCompact section: 9 checks (32-40). New: 6 checks:
1. no file → the suffix (status quo)
2. autoCompact:false → no suffix (second tool result)
3. autoCompact:false → silent (no nudge= line)
4. flip ON → the suffix on the next tool result
5. autoCompact:true → the suffix
6. malformed → fail open
= 6 (old 9 → −3). Hmm. The old had separate pins for the "second idle skip" + "budget not consumed" + "trigger= line". The new design is simpler (silent suppression, per-call read). Coverage: suppression ✓, silence ✓, per-call flip ✓, explicit ON ✓, fail-open ✓, status quo ✓. The "budget retention" semantics are gone (no budget in the passive design) — intentionally.

Old config section: 13 checks (41-53). New:
(a) 3: cfa_hi suffix; cfa_low no suffix; the nudge= line pin
(b) 3: pre-edit silence; live-edit suffix (+ the lingering cfa_low crosses); the 0.655 text
(b2) 2: 0.655 suffix; 0.476 no suffix
(c) 3: 0.960 suffix; the 0.960 text; 0.820 no suffix
(d) 2: fail-open 0.952 suffix (+ the lingering cfc_no crosses); 0.940 no suffix
= 13. ✓ Same count.

Old Unit-3: 7 checks (54-60) unchanged.
Old Unit-4 batch A: 14 (61-74) unchanged.
#80 cap: 5 (75-79) unchanged.
Old agent-retention: 6 (80-85) → new scope gate: 2 checks (the no-suffix triple + the unit-4 scope none). = 2 (−4). Hmm — the old pinned the agent field in the send body (3 checks) + the re-factory (1) + the unit-4 (1). New: re-factory (1) + the no-suffix triple with the zero-promptAsync (1) + the unit-4 scope none (1) = 3. So new = 3 (old 6 → −3). The agent-retention behavior itself is still pinned in the Unit-4 section (the CONTINUE/spawn body carries the agent — checks 71, 89, 90, 96, 97, etc.). So the coverage is preserved.

Old UNIT 4 #85: 8 (86-93) unchanged.
New Direct section: 2 checks (c)+(d) (new DoD).
Old #85 part 2: 8 (94-101) unchanged.
Old live log: 2 (102-103) unchanged.

Old total: 18+9+13+7+14+5+6+8+8+2 = 90? That doesn't come out to 105. My numbering must be off somewhere (I probably undercounted the Unit-4 batch A or missed checks). The actual baseline run says 105. Rather than trust my count, after the edits I'll count the actual chk( occurrences: the final total should be ≥ 105, and all the old intents covered. I'll grep -c the `chk(` in the old and new files and reconcile.

Now, let me write the temp section files. I'll write each new section content carefully.

Section 1: the header UNIT 2 paragraph (replacing L5-8):

Old:
```
// UNIT 2: the context-limit compaction trigger — a live session crossing
// its saturation threshold (configurable per tick, default 0.95 of the
// usable window) queues ONE self-compact instruction via promptAsync
// (queued, never synchronous), once per busy cycle.
```
New:
```
// UNIT 2: #85 part 3 — the context-limit nudge as a PASSIVE ctx-line
// suffix: a live session crossing its saturation threshold (configurable
// per call, default 0.95 of the usable window) gets a nudge SUFFIX on
// its own TOOL-CALL RETURN (the gauge plugin's ctx: line channel — no
// promptAsync, no resume, no busy, no loop), per busy session, with a
// ladder (>= 0.95 "self-compact now"; >= 0.98 --maintainer-flagged);
// scope "none" (Direct) suppresses it.
```

Section 2: the new UNIT 2 main section (replacing L151-292). The full text:

```
   // ============================================================
   // UNIT 2 — #85 part 3: the passive ctx-line suffix (no resume)
   //
   // The factory is re-invoked with a SPYING client: promptAsync
   // records every call (it must stay ZERO on the Unit-2 path — the
   // nudge is passive), `messages` is scripted per sid (the nudge's
   // scope gate does a FRESH fetch per nudge-eligible tool result),
   // the provider mock supplies limit data in the LIVE SDK shape
   // (res.data.all[] → models[modelID].limit.{context,output}; the
   // installed SDK names the method `list`). Default config (no
   // budget file — fail-open): usable = 100000 - min(20000, 16000) =
   // 84000; threshold 0.95 → the suffix fires at >= 79800. The nudge
   // rides the TOOL-CALL RETURN (the gauge plugin's ctx: line channel)
   // — driven via the tool.execute.after hook (synchronous
   // observation — no 5s tick wait). The scenario sessions go busy →
   // tokens (NO idle — an idle would route Unit 4; the passive nudge
   // never needs the tick).
   // ============================================================
   const CONTEXT = 100000, OUTPUT = 16000;
   const USABLE = CONTEXT - Math.min(20000, OUTPUT); // 84000
   const RATIO_HI = (80000 / USABLE).toFixed(3); // 0.952
   const RATIO_98 = (83000 / USABLE).toFixed(3); // 0.988

   const calls = [];
   const TOG = "<|autonom|>";
   const OFF = "<|Direct|>";
   const u2Pairs = (entries) => entries.map(([role, text]) => ({ info: { role }, parts: [{ type: "text", text }] }));
   const u2Script = new Map();
   // The nudge's scope gate needs a FRESH verdict: every nudge-eligible
   // scenario session carries an own-line ON toggle (any agent type —
   // the #82 case) so the verdict is "autorun" (in scope).
   for (const s of ["ses_u2_sat", "ses_u2_low", "ses_u2_over", "ses_u2_nomodel", "ses_u2_noprov", "ses_u2_hi98", "ses_u2_two", "ses_u2_str"])
     u2Script.set(s, u2Pairs([["user", TOG], ["assistant", "Working."]]));

   const v2Session = {
     prompt: function () {},
     promptAsync: async (args) => { calls.push(args); return { data: { id: "queued" } }; },
     abort: function () {},
     list: function () {},
     get: function () {},
     message: function () {},
     messages: async (args) => u2Script.get(args?.path?.id) ?? [],
     todo: function () {},
     command: function () {},
     summarize: function () {},
   };
   const providerList = async () => ({
     data: {
       all: [{ id: "prov_x", name: "Prov X", models: { model_x: { id: "model_x", limit: { context: CONTEXT, output: OUTPUT } } } }],
       default: {},
       connected: ["prov_x"],
     },
     error: undefined,
   });
   const hooksU2 = await factory({ directory: proj, client: { session: v2Session, provider: { list: providerList }, app: { log: () => "log" } } });
   chk("UNIT 2: re-factory with the spying client returns the event hook", typeof hooksU2?.event === "function");
   chk("UNIT 2 #85 part 3: the factory exposes the tool.execute.after hook (the ctx-line channel)", typeof hooksU2?.["tool.execute.after"] === "function");

   const MODEL = { providerID: "prov_x", modelID: "model_x" };
   // Assistant-message event in the LIVE shape (role + top-level
   // providerID/modelID + tokens; sessionID on properties).
   const msgUpdated = (sid, role, tokens, model) => ({
     event: {
       type: "message.updated",
       properties: {
         sessionID: sid,
         message: { role, ...(tokens ? { tokens } : {}), ...(model ? { providerID: model.providerID, modelID: model.modelID } : {}) },
       },
     },
   });
   // session.status in the LIVE shape (measured 2026-09-21): `status` is
   // an OBJECT `{ type: <s> }`, not a bare string. The STRING-shape
   // acceptance is pinned separately below (dual-shape check).
   const statusEv = (sid, status) => ({ event: { type: "session.status", properties: { sessionID: sid, status: { type: status } } } });
   const fire = async (h, sid, evs) => { for (const e of evs) await h.event(e); };
   // The nudge channel: ONE tool result for the session — the hook
   // mutates the output object IN PLACE (the gauge plugin's ctx: line
   // channel — the same mutation as the `(NN% used, NNNK left)`
   // footer). The base output ends with a \n (the common real shape).
   const toolAfter = async (h, sid, base = `tool result for ${sid}\n`) => {
     const output = { title: "bash", output: base, metadata: {} };
     await h["tool.execute.after"]({ tool: "bash", sessionID: sid, callID: "call_x", args: {} }, output);
     return output.output;
   };
   const SUFFIX_95 = `self-compact now (ratio=${RATIO_HI})`;
   const SUFFIX_98 = `⚠⚠ --maintainer: context saturated at ratio=${RATIO_98} — self-compact NOW`;
   const hasSuffix = (s) => s.includes("self-compact now") || s.includes("--maintainer");
   const nudgeLine = (sid) => readLines().filter((l) => l.includes(`nudge= sid=${sid}`)).length;

   // Arm every scenario session: busy → assistant token update (NO
   // idle — the passive nudge never needs the tick; an idle would
   // route Unit 4).
   await fire(hooksU2, "ses_u2_sat", [statusEv("ses_u2_sat", "busy"), msgUpdated("ses_u2_sat", "assistant", { total: 80000 }, MODEL)]);
   await fire(hooksU2, "ses_u2_low", [
     statusEv("ses_u2_low", "busy"),
     msgUpdated("ses_u2_low", "assistant", { total: 50000 }, MODEL),
     // a user-role update must NOT overwrite lastTokenTotal
     msgUpdated("ses_u2_low", "user", { total: 1000000 }),
   ]);
   await fire(hooksU2, "ses_u2_over", [
     statusEv("ses_u2_over", "busy"),
     msgUpdated("ses_u2_over", "assistant", { total: 80000 }, MODEL),
     msgUpdated("ses_u2_over", "assistant", { total: 40000 }), // OVERWRITTEN — not accumulated
   ]);
   await fire(hooksU2, "ses_u2_nomodel", [statusEv("ses_u2_nomodel", "busy"), msgUpdated("ses_u2_nomodel", "assistant", { total: 80000 })]);
   await fire(hooksU2, "ses_u2_noprov", [statusEv("ses_u2_noprov", "busy"), msgUpdated("ses_u2_noprov", "assistant", { total: 80000 }, { providerID: "prov_x", modelID: "model_missing" })]);
   await fire(hooksU2, "ses_u2_hi98", [statusEv("ses_u2_hi98", "busy"), msgUpdated("ses_u2_hi98", "assistant", { total: 83000 }, MODEL)]);
   await fire(hooksU2, "ses_u2_two", [statusEv("ses_u2_two", "busy"), msgUpdated("ses_u2_two", "assistant", { total: 80000 }, MODEL)]);

   // ---- DoD: the ctx-line suffix on the tool-call return at 0.95 /
   // 0.98 (the nudge LADDER — the highest rung met fires)
   const out95 = await toolAfter(hooksU2, "ses_u2_sat");
   chk("UNIT 2 #85 part 3: busy session at ratio >= 0.95 (default) → the ctx-line suffix on the tool result (self-compact now)",
     out95.endsWith(SUFFIX_95), out95.slice(-120));
   chk("UNIT 2 #85 part 3: no promptAsync on the Unit-2 path (the nudge is passive — no resume, no queued turn)",
     calls.length === 0, `n=${calls.length}`);
   chk("UNIT 2 #85 part 3: nudge= log line present for the first suffix (with the ratio)",
     readLines().some((l) => l.includes(`nudge= sid=ses_u2_sat`) && l.includes(RATIO_HI)), "");
   const out98 = await toolAfter(hooksU2, "ses_u2_hi98");
   chk("UNIT 2 #85 part 3: busy session at ratio >= 0.98 → the --maintainer-flagged line on the tool result",
     out98.endsWith(SUFFIX_98), out98.slice(-120));

   // ---- DoD: per-session independent nudge — two active busy sessions
   // at the threshold → EACH gets its own suffix (independent)
   const outTwo = await toolAfter(hooksU2, "ses_u2_two");
   chk("UNIT 2 #85 part 3: two active busy sessions at the threshold → EACH gets its own nudge (independent)",
     out95.endsWith(SUFFIX_95) && outTwo.endsWith(SUFFIX_95) &&
       nudgeLine("ses_u2_sat") === 1 && nudgeLine("ses_u2_two") === 1,
     `sat=${nudgeLine("ses_u2_sat")} two=${nudgeLine("ses_u2_two")}`);

   // ---- (c) Direct suppresses the Unit-2 nudge: a saturated session
   // with a trailing own-line <Direct|> (last-toggle-wins) → verdict
   // "none" → no suffix (even while actively working)
   u2Script.set("ses_u2_direct", u2Pairs([["user", TOG], ["user", OFF], ["assistant", "Working."]]));
   await fire(hooksU2, "ses_u2_direct", [statusEv("ses_u2_direct", "busy"), msgUpdated("ses_u2_direct", "assistant", { total: 80000 }, MODEL)]);
   const outDirect = await toolAfter(hooksU2, "ses_u2_direct");
   chk("UNIT 2 #85 part 3 (c): Direct (scope none) → no ctx-line suffix on the tool result (Unit 2 suppressed while actively working)",
     !hasSuffix(outDirect) && calls.length === 0 && nudgeLine("ses_u2_direct") === 0, outDirect.slice(-80));

   // ---- sub-threshold / model-missing scenarios: no suffix, no send
   const outLow = await toolAfter(hooksU2, "ses_u2_low");
   chk("UNIT 2: sub-threshold session (ratio < 0.95 default) → no suffix (the user-role update did not overwrite — still not the saturation input)",
     !hasSuffix(outLow) && calls.length === 0, outLow.slice(-80));
   const outOver = await toolAfter(hooksU2, "ses_u2_over");
   chk("UNIT 2: lastTokenTotal OVERWRITTEN (80000 then 40000 → below threshold → no suffix)", !hasSuffix(outOver), outOver.slice(-80));
   const outNm = await toolAfter(hooksU2, "ses_u2_nomodel");
   chk("UNIT 2: no model info → no suffix (model limits null — fail-safe, no intervention)", !hasSuffix(outNm), outNm.slice(-80));
   const outNp = await toolAfter(hooksU2, "ses_u2_noprov");
   chk("UNIT 2: provider data missing (model not listed) → no suffix", !hasSuffix(outNp), outNp.slice(-80));

   // ---- a SECOND tool result in the SAME busy cycle → the suffix
   // appends AGAIN (the per-step reminder — unlike the old once-per-
   // cycle send) but only ONE nudge= log line for the cycle (the
   // dedup)
   const outSat2 = await toolAfter(hooksU2, "ses_u2_sat");
   chk("UNIT 2 #85 part 3: second tool result in the same busy cycle → the suffix appends again (the per-step reminder)",
     outSat2.endsWith(SUFFIX_95), outSat2.slice(-80));
   chk("UNIT 2 #85 part 3: once-per-cycle nudge= log line (dedup) — still exactly one for the cycle",
     nudgeLine("ses_u2_sat") === 1, `n=${nudgeLine("ses_u2_sat")}`);

   // ---- fresh busy cycle → the dedup resets → a new nudge= line (the
   // suffix was already per-step — the reset is observable in the log)
   await fire(hooksU2, "ses_u2_sat", [statusEv("ses_u2_sat", "busy")]);

  [step-finish] {"reason":"length","type":"step-finish","tokens":{"total":170238,"input":184,"output":23156,"reasoning":0,"cache":{"write":0,"read":146898}},"cost":0}

