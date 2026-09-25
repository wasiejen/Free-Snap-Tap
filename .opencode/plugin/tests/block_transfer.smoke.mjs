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

fs.rmSync(dir, { recursive: true, force: true });

finish();
