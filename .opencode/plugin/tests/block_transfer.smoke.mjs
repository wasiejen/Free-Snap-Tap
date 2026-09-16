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
fs.rmSync(dir, { recursive: true, force: true });

finish();
