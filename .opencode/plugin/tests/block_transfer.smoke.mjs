// block_transfer.smoke.mjs — the block_transfer tool() translation
// (scratchpad origin: bt_smoke.mjs, iter-4 verification; moved per the
// 2026-09-15_smoke-harness-home proposal). Functional round-trips run in a
// scratchpad sandbox subdir.
// Run: node .opencode/plugin/tests/block_transfer.smoke.mjs (plain node, exit 0 iff green).
import fs from "node:fs";
import path from "node:path";
import { loadRepo, freshSandbox, makeChecker } from "./_smoke_base.mjs";

const dir = freshSandbox("block_transfer");
const { chk, finish } = makeChecker("BLOCK_TRANSFER_SMOKE");

const mod = await loadRepo(".opencode/tools/block_transfer.ts");
const t = mod.default;
chk("default export = tool() result (object with description string)", t != null && typeof t === "object" && typeof t.description === "string");
chk("no stale 'name'/'parameters' keys", t && !("name" in t) && !("parameters" in t));
chk("execute is async fn", typeof t.execute === "function" && t.execute.constructor.name === "AsyncFunction");
const args = t.args;
chk("mode is required (rejects undefined)", args && args.mode && !args.mode.safeParse(undefined).success);
chk("mode accepts MOVE", args.mode.safeParse("MOVE").success);
chk("mode rejects bogus value", !args.mode.safeParse("BOGUS").success);
for (const k of ["srcFile", "dstFile", "startMarker", "endMarker", "targetMarker", "bufferName"]) {
  chk(`args.${k} is optional (accepts undefined)`, args[k] && args[k].safeParse(undefined).success);
}

// Functional smoke in the sandbox
const src = path.join(dir, "bt_src.txt");
const dst = path.join(dir, "bt_dst.txt");
fs.writeFileSync(src, "AAA start\nline1\nline2\nZZZ end\ntail\n");
fs.writeFileSync(dst, "head\n");
const ctx = { directory: dir };
const r1 = await t.execute({ mode: "COPY", srcFile: src, startMarker: "AAA", endMarker: "ZZZ", bufferName: "b4" }, ctx);
const r2 = await t.execute({ mode: "PASTE", dstFile: dst, bufferName: "b4", targetMarker: "head" }, ctx);
chk("COPY reported 4 lines (markers inclusive)", /Copied 4 lines/.test(r1));
chk("PASTE reported 4 lines", /Pasted 4 lines/.test(r2));
chk("src untouched by COPY", fs.readFileSync(src, "utf-8") === "AAA start\nline1\nline2\nZZZ end\ntail\n");
chk("dst gained block after target marker", fs.readFileSync(dst, "utf-8") === "head\nAAA start\nline1\nline2\nZZZ end\n");
fs.writeFileSync(dst, "only-head");
const r3 = await t.execute({ mode: "MOVE", srcFile: src, startMarker: "AAA", endMarker: "ZZZ", dstFile: dst }, ctx);
chk("MOVE reported 4 lines", /Moved 4 lines/.test(r3));
chk("src lost the block", fs.readFileSync(src, "utf-8") === "tail\n");
chk("dst gained block at EOF (no target marker)", fs.readFileSync(dst, "utf-8") === "only-head\nAAA start\nline1\nline2\nZZZ end");
const r4 = await t.execute({ mode: "PASTE", dstFile: dst, bufferName: "nope" }, ctx);
chk("PASTE from empty buffer returns error note", /empty/.test(r4));
// #57: MOVE with missing dstFile must error and leave the source byte-identical (no partial cut)
fs.writeFileSync(src, "AAA start\nline1\nline2\nZZZ end\ntail\n");
const r5 = await t.execute({ mode: "MOVE", srcFile: src, startMarker: "AAA", endMarker: "ZZZ" }, ctx);
chk("MOVE without dstFile returns the exact error string", r5 === "Error: 'dstFile' is required for MOVE mode.");
chk("MOVE without dstFile leaves source byte-identical", fs.readFileSync(src, "utf-8") === "AAA start\nline1\nline2\nZZZ end\ntail\n");
// ---- REPLACE (TODO #94): line-anchored span replacement from a buffer
// The content channel stays buffers-only — COPY fills the buffer first.
fs.writeFileSync(src, "AAA start\nline1\nline2\nZZZ end\ntail\n");
const rep = "bt_rep.txt"; // relative to dir — the return string embeds it verbatim
fs.writeFileSync(path.join(dir, rep), "head\nOLD one\nOLD two\nfoot");
await t.execute({ mode: "COPY", srcFile: src, startMarker: "line1", endMarker: "line2", bufferName: "repbuf" }, ctx);
const r6 = await t.execute({ mode: "REPLACE", dstFile: rep, startMarker: "OLD one", endMarker: "OLD two", bufferName: "repbuf" }, ctx);
chk("REPLACE happy path: exact return string + the span replaced in place (byte-exact dst)", r6 === "REPLACED lines 2..3 (2 lines) in 'bt_rep.txt' with buffer 'repbuf' (2 lines)." && fs.readFileSync(path.join(dir, rep), "utf-8") === "head\nline1\nline2\nfoot");
const r7 = await t.execute({ mode: "PASTE", dstFile: dst, bufferName: "repbuf" }, ctx);
chk("REPLACE preserved the buffer (a later PASTE reports 2 lines)", /Pasted 2 lines/.test(r7));
const r8 = await t.execute({ mode: "REPLACE", startMarker: "OLD one", endMarker: "OLD two", bufferName: "repbuf" }, ctx);
chk("REPLACE without dstFile returns the exact error string", r8 === "Error: 'dstFile' is required for REPLACE mode.");
const r9 = await t.execute({ mode: "REPLACE", dstFile: rep, endMarker: "OLD two", bufferName: "repbuf" }, ctx);
chk("REPLACE without startMarker returns the exact error string", r9 === "Error: 'startMarker' is required for REPLACE mode.");
const r10 = await t.execute({ mode: "REPLACE", dstFile: rep, startMarker: "NOPE", endMarker: "OLD two", bufferName: "repbuf" }, ctx);
chk("REPLACE with a missing anchor returns the exact not-found error", r10 === "Error: Start marker 'NOPE' not found in bt_rep.txt.");
const rep2 = "bt_rep2.txt";
fs.writeFileSync(path.join(dir, rep2), "head\nDUP a\nDUP b\nfoot");
const r11 = await t.execute({ mode: "REPLACE", dstFile: rep2, startMarker: "DUP", endMarker: "DUP b", bufferName: "repbuf" }, ctx);
chk("REPLACE with a non-unique start anchor returns the exact error", r11 === "Error: Start marker 'DUP' is not unique in bt_rep2.txt.");
const rep3 = "bt_rep3.txt";
fs.writeFileSync(path.join(dir, rep3), "head\nZZ endline\nAA startline\nfoot");
const r12 = await t.execute({ mode: "REPLACE", dstFile: rep3, startMarker: "AA startline", endMarker: "ZZ endline", bufferName: "repbuf" }, ctx);
chk("REPLACE with start after end returns the exact error", r12 === "Error: Start marker 'AA startline' is after end marker 'ZZ endline' in bt_rep3.txt.");
const rep4 = "bt_rep4.txt";
fs.writeFileSync(path.join(dir, rep4), "head\nONLY line\nfoot");
const r13 = await t.execute({ mode: "REPLACE", dstFile: rep4, startMarker: "ONLY line", endMarker: "ONLY line", bufferName: "repbuf" }, ctx);
chk("REPLACE single-line span (start == end): exact return string + the one line became the 2-line buffer", r13 === "REPLACED lines 2..2 (1 line) in 'bt_rep4.txt' with buffer 'repbuf' (2 lines)." && fs.readFileSync(path.join(dir, rep4), "utf-8") === "head\nline1\nline2\nfoot");

// ---- Part A: the unified anchor rule (2026-09-25_block_transfer-v2 Part A)
// resolveAnchor is exported and pure — the rule lives in ONE place (own pins).
const ra = mod.resolveAnchor;
chk("resolveAnchor is exported (pure fn)", typeof ra === "function");
chk("resolveAnchor: 1-based line number of the EXACT ONE prefix match", ra("one\nTWO line\nthree", "TWO") === 2);
chk("resolveAnchor: leading spaces/tabs on the line are trimmed before the prefix match", ra("\tTWO indented\nx", "TWO indented") === 1);
chk("resolveAnchor: an anchor WITH leading whitespace never matches (used as typed)", ra("TWO x\n   TWO y", " TWO") === null);
chk("resolveAnchor: case-sensitive (no case fold)", ra("TWO line\nx", "two") === null && ra("TWO line\nx", "TWO") === 1);
chk("resolveAnchor: CRLF-tolerant (a trailing \\r on the line is ignored for matching)", ra("TWO cr\r\nrest", "TWO cr") === 1);
chk("resolveAnchor: a LONGER line still matches (the prefix — the remainder is irrelevant)", ra("TWO prefix and more\nx", "TWO") === 1);
chk("resolveAnchor: a mid-line substring does NOT match (the old COPY substring tolerance is gone)", ra("xx TWO mid\nx", "TWO") === null);
chk("resolveAnchor: zero matches -> null (not-found)", ra("a\nb", "nope") === null);
chk("resolveAnchor: two matches -> null (non-unique)", ra("TWO a\nTWO b", "TWO") === null);

// Part A pins — the teaching error taxonomy (one line each), via execute()
const errFile = "bt_err.txt";
fs.writeFileSync(path.join(dir, errFile), "head\nDUP one\nmid\nDUP two\nfoot");
const rA1 = await t.execute({ mode: "COPY", srcFile: errFile, startMarker: "NOPE", endMarker: "mid", bufferName: "errA" }, ctx);
chk("taxonomy not-found (the anchor quoted, with the file)", rA1 === "Error: Start marker 'NOPE' not found in bt_err.txt.");
const rA2 = await t.execute({ mode: "COPY", srcFile: errFile, startMarker: "DUP", endMarker: "mid", bufferName: "errA" }, ctx);
chk("taxonomy non-unique: start marker (the one shared form)", rA2 === "Error: Start marker 'DUP' is not unique in bt_err.txt.");
const rA3 = await t.execute({ mode: "COPY", srcFile: errFile, startMarker: "head", endMarker: "DUP", bufferName: "errA" }, ctx);
chk("taxonomy non-unique: end marker — the SAME one rule for every marker", rA3 === "Error: End marker 'DUP' is not unique in bt_err.txt.");
const rA4 = await t.execute({ mode: "COPY", srcFile: errFile, startMarker: "mid", endMarker: "head", bufferName: "errA" }, ctx);
chk("extraction: an end resolved before the start -> the pinned legacy error (probe 115)", rA4 === "Error: End marker 'head' not found after start marker.");
fs.writeFileSync(dst, "head\nmid\nfoot");
const rA5 = await t.execute({ mode: "PASTE", dstFile: dst, bufferName: "repbuf", targetMarker: "NOPE" }, ctx);
chk("PASTE: an unresolvable targetMarker -> the not-found error (no silent EOF append), dst untouched", rA5 === `Error: Target marker 'NOPE' not found in ${dst}.` && fs.readFileSync(dst, "utf-8") === "head\nmid\nfoot");

// ---- Part B+C: line-number refs + assembly (2026-09-25_block_transfer-v2)
// Schema level: each ref arg is string | integer (type-disambiguated — no
// runtime string sniffing) + the new 'refs' list and 'text' forms.
chk("schema: mode accepts APPEND", args.mode.safeParse("APPEND").success);
for (const k of ["startMarker", "endMarker", "targetMarker"]) {
  chk(`schema: args.${k} accepts a marker string`, args[k].safeParse("AAA").success);
  chk(`schema: args.${k} accepts an integer line number`, args[k].safeParse(2).success);
  chk(`schema: args.${k} rejects a float`, !args[k].safeParse(2.5).success);
  chk(`schema: args.${k} rejects a bool`, !args[k].safeParse(true).success);
}
chk("schema: args.refs is optional (accepts undefined)", args.refs && args.refs.safeParse(undefined).success);
chk("schema: args.refs accepts a list of marker-or-number refs", args.refs.safeParse([2, "ZZZ"]).success);
chk("schema: args.refs rejects a float item", !args.refs.safeParse([2.5]).success);
chk("schema: args.refs rejects a bare string (a list is required)", !args.refs.safeParse("nope").success);
chk("schema: args.text is an optional string", args.text && args.text.safeParse(undefined).success && args.text.safeParse("x").success);

// B: number refs (1-based, absolute, PRE-call file state)
const numFile = "bt_num.txt"; // 5 lines: 1 "AAA start" ... 5 "tail"
fs.writeFileSync(path.join(dir, numFile), "AAA start\nline1\nline2\nZZZ end\ntail\n");
const rB1 = await t.execute({ mode: "COPY", srcFile: numFile, startMarker: 2, endMarker: 4, bufferName: "nb1" }, ctx);
chk("B: number refs (single form): exact Part F feedback line", rB1 === "Copied 3 lines from 'bt_num.txt' into buffer 'nb1' (lines 2..4, first: 'line1') - buffer: 3 lines.");
const nbDst = "bt_nb.txt";
fs.writeFileSync(path.join(dir, nbDst), "head");
await t.execute({ mode: "PASTE", dstFile: nbDst, bufferName: "nb1" }, ctx);
chk("B: the buffer from number refs holds exactly lines 2..4 (src untouched)", fs.readFileSync(path.join(dir, nbDst), "utf-8") === "head\nline1\nline2\nZZZ end" && fs.readFileSync(path.join(dir, numFile), "utf-8") === "AAA start\nline1\nline2\nZZZ end\ntail\n");
const rB2 = await t.execute({ mode: "PASTE", dstFile: nbDst, bufferName: "nb1", targetMarker: 1 }, ctx);
chk("B: number targetMarker inserts right after line 1 (PASTE keeps the S1 feedback shape)", rB2 === "Pasted 3 lines from buffer 'nb1' into 'bt_nb.txt'." && fs.readFileSync(path.join(dir, nbDst), "utf-8") === "head\nline1\nline2\nZZZ end\nline1\nline2\nZZZ end");
const rB3 = await t.execute({ mode: "COPY", srcFile: numFile, startMarker: "AAA", endMarker: 4, bufferName: "nb2" }, ctx);
chk("B: mixed marker + number refs (1-based, absolute)", rB3 === "Copied 4 lines from 'bt_num.txt' into buffer 'nb2' (lines 1..4, first: 'AAA start') - buffer: 4 lines.");
const rB4 = await t.execute({ mode: "COPY", srcFile: numFile, startMarker: 9, endMarker: 4, bufferName: "nb3" }, ctx);
chk("B: ref-out-of-range on the start ref (the S1 error wired in, with the count)", rB4 === "Error: line 9 is out of range in bt_num.txt (the file has 5 lines).");
const rB5 = await t.execute({ mode: "COPY", srcFile: numFile, startMarker: 1, endMarker: 6, bufferName: "nb3" }, ctx);
chk("B: ref-out-of-range on the end ref", rB5 === "Error: line 6 is out of range in bt_num.txt (the file has 5 lines).");
fs.writeFileSync(path.join(dir, nbDst), "one\ntwo");
const rB6 = await t.execute({ mode: "PASTE", dstFile: nbDst, bufferName: "nb1", targetMarker: 99 }, ctx);
chk("B: ref-out-of-range on the targetMarker side", rB6 === "Error: line 99 is out of range in bt_nb.txt (the file has 2 lines).");
const rB7 = await t.execute({ mode: "DELETE", srcFile: numFile, startMarker: 2, endMarker: 3 }, ctx);
chk("B: number refs in DELETE (S1 feedback shape kept, block purged)", rB7 === "Deleted 2 lines from 'bt_num.txt'." && fs.readFileSync(path.join(dir, numFile), "utf-8") === "AAA start\nZZZ end\ntail\n");
// number refs on the REPLACE side (the untouched op keeps its S1 feedback shape)
const repN = "bt_repnum.txt";
fs.writeFileSync(path.join(dir, repN), "head\nOLD one\nOLD two\nfoot");
await t.execute({ mode: "APPEND", text: "NEW", bufferName: "repN" }, ctx);
const rR1 = await t.execute({ mode: "REPLACE", dstFile: repN, startMarker: 2, endMarker: 3, bufferName: "repN" }, ctx);
chk("B: number refs in REPLACE (S1 feedback shape kept)", rR1 === "REPLACED lines 2..3 (2 lines) in 'bt_repnum.txt' with buffer 'repN' (1 line)." && fs.readFileSync(path.join(dir, repN), "utf-8") === "head\nNEW\nfoot");

// C: assembly (COPY-list / COPY-text / APPEND)
fs.writeFileSync(path.join(dir, numFile), "AAA start\nline1\nline2\nZZZ end\ntail\n"); // restore (DELETE above cut 2 lines)
const rC1 = await t.execute({ mode: "COPY", srcFile: numFile, refs: [2, "ZZZ", 5], bufferName: "lb" }, ctx);
chk("C: COPY-list (mixed marker + number refs): exact Part F feedback", rC1 === "Copied 3 lines from 'bt_num.txt' into buffer 'lb' (lines 2, 4, 5, first: 'line1') - buffer: 3 lines.");
const cDst = "bt_c.txt";
fs.writeFileSync(path.join(dir, cDst), "top");
await t.execute({ mode: "PASTE", dstFile: cDst, bufferName: "lb" }, ctx);
chk("C: COPY-list join is EXACTLY ONE \\n between sections (no blanks, no merge)", fs.readFileSync(path.join(dir, cDst), "utf-8") === "top\nline1\nZZZ end\ntail");
const rC2 = await t.execute({ mode: "COPY", srcFile: numFile, refs: [1, 8], bufferName: "lb" }, ctx);
chk("C: COPY-list: an out-of-range item -> the ref-out-of-range error", rC2 === "Error: line 8 is out of range in bt_num.txt (the file has 5 lines).");
const cDst2 = "bt_c2.txt";
fs.writeFileSync(path.join(dir, cDst2), "top");
await t.execute({ mode: "PASTE", dstFile: cDst2, bufferName: "lb" }, ctx);
chk("C: the failed COPY-list left the buffer untouched (no partial state)", fs.readFileSync(path.join(dir, cDst2), "utf-8") === "top\nline1\nZZZ end\ntail");
const rC3 = await t.execute({ mode: "COPY", text: "hello\nworld", bufferName: "tb" }, ctx);
chk("C: COPY text key: direct text -> buffer (exact Part F feedback)", rC3 === "Copied 2 lines from text into buffer 'tb' (lines 1..2, first: 'hello') - buffer: 2 lines.");
const tDst = "bt_t.txt";
fs.writeFileSync(path.join(dir, tDst), "top");
await t.execute({ mode: "PASTE", dstFile: tDst, bufferName: "tb" }, ctx);
chk("C: COPY text: the buffer holds exactly the text's lines", fs.readFileSync(path.join(dir, tDst), "utf-8") === "top\nhello\nworld");
const rC4 = await t.execute({ mode: "COPY", text: "a\nb\n", bufferName: "tb2" }, ctx);
chk("C: COPY text: a trailing newline adds no blank line", rC4 === "Copied 2 lines from text into buffer 'tb2' (lines 1..2, first: 'a') - buffer: 2 lines.");
const rC5 = await t.execute({ mode: "COPY", text: "x", srcFile: numFile, startMarker: 1, endMarker: 2, bufferName: "ex" }, ctx);
chk("C: 'text' + markers is rejected (mutually exclusive forms)", /alone/.test(rC5));
const rC6 = await t.execute({ mode: "COPY", refs: [1], startMarker: 1, endMarker: 2, srcFile: numFile, bufferName: "ex" }, ctx);
chk("C: 'refs' + markers is rejected (mutually exclusive forms)", /alone/.test(rC6));
const rP1 = await t.execute({ mode: "APPEND", srcFile: numFile, refs: [1, 3], bufferName: "ab" }, ctx);
chk("C: APPEND creates an absent buffer (exact Part F feedback)", rP1 === "Appended 2 lines from 'bt_num.txt' to buffer 'ab' (lines 1, 3, first: 'AAA start') - buffer: 2 lines.");
const rP2 = await t.execute({ mode: "APPEND", text: "x\ny", bufferName: "ab" }, ctx);
chk("C: APPEND appends text (buffer count AFTER the op)", rP2 === "Appended 2 lines from text to buffer 'ab' (lines 1..2, first: 'x') - buffer: 4 lines.");
const rP3 = await t.execute({ mode: "APPEND", srcFile: numFile, startMarker: 4, endMarker: 5, bufferName: "ab" }, ctx);
chk("C: APPEND single-ref pair appends the span", rP3 === "Appended 2 lines from 'bt_num.txt' to buffer 'ab' (lines 4..5, first: 'ZZZ end') - buffer: 6 lines.");
const aDst = "bt_a.txt";
fs.writeFileSync(path.join(dir, aDst), "top");
await t.execute({ mode: "PASTE", dstFile: aDst, bufferName: "ab" }, ctx);
chk("C: APPEND = stepwise assembly (AAA start, line2, x, y, ZZZ end, tail)", fs.readFileSync(path.join(dir, aDst), "utf-8") === "top\nAAA start\nline2\nx\ny\nZZZ end\ntail");
const rP4 = await t.execute({ mode: "APPEND" }, ctx);
chk("C: bare APPEND teaches the input forms", rP4 === "Error: APPEND needs one input form: a 'refs' list, 'startMarker'+'endMarker' (with srcFile), or 'text'.");
// feedback truncation: the first-line echo is capped at 40 chars ('...' marker)
const longFile = "bt_long.txt";
const longLine = "A".repeat(50);
fs.writeFileSync(path.join(dir, longFile), longLine + "\nshort\n");
const rF1 = await t.execute({ mode: "COPY", srcFile: longFile, startMarker: 1, endMarker: 1, bufferName: "lg" }, ctx);
chk("C: feedback first-line echo capped at 40 chars ('...' marker) + singular form", rF1 === `Copied 1 line from 'bt_long.txt' into buffer 'lg' (lines 1..1, first: '${"A".repeat(40)}...') - buffer: 1 line.`);

fs.rmSync(dir, { recursive: true, force: true });

finish();
