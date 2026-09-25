// block_transfer.sandbox.smoke.mjs — the block_transfer sandbox guard +
// description rewrite (scratchpad origin: bt_sandbox_smoke.mjs, iter-10 T1
// verification; moved per the 2026-09-15_smoke-harness-home proposal).
// The REJECT fixtures aim at paths OUTSIDE the sandbox — computed from the
// repo root (parent dir + a Windows system file); none of them is ever
// written (the guard must fire first; the smoke asserts that).
// Run: node .opencode/plugin/tests/block_transfer.sandbox.smoke.mjs (plain node, exit 0 iff green).
import fs from "node:fs";
import path from "node:path";
import { REPO_ROOT, SCRATCHPAD, loadRepo, freshSandbox, makeChecker } from "./_smoke_base.mjs";

const workDir = freshSandbox("block_transfer_sandbox");
const tempRoot = process.env.TEMP || process.env.TMP;
const tempFile = path.join(tempRoot, "bt_sandbox_tmp.txt");
const tempFile2 = path.join(tempRoot, "bt_sandbox_tmp2.txt");
const tempSubFile = path.join(tempRoot, "bt_sandbox_tmpsub", "f.txt");
const outsideDir = path.dirname(REPO_ROOT); // parent of the repo root (outside the sandbox when cwd = repo root)
const outsideDst1 = path.join(outsideDir, "smoke_outside_paste.txt");
const outsideDst2 = path.join(outsideDir, "smoke_outside_move.txt");
const outsideDstRel = path.join(outsideDir, "smoke_outside_rel.txt");
const outsideDstRep = path.join(outsideDir, "smoke_outside_replace.txt");
const outsideAbs = "C:\\Windows\\System32\\drivers\\etc\\hosts"; // existing file OUTSIDE both allowed roots (reject fixture)

const { chk, finish } = makeChecker("BT-SANDBOX-SMOKE");

// ---- setup: clean slate
for (const p of [tempFile, tempFile2, path.join(tempRoot, "bt_sandbox_tmpsub"), outsideDst1, outsideDst2, outsideDstRel, outsideDstRep]) {
  try { fs.rmSync(p, { recursive: true, force: true }); } catch {}
}
fs.mkdirSync(path.join(workDir, "sub"), { recursive: true });
const write = (rel, content) => fs.writeFileSync(path.join(workDir, rel), content, "utf-8");
const readW = (rel) => fs.readFileSync(path.join(workDir, rel), "utf-8");
write("a_cwd.txt", "AAA start\nline1\nline2\nZZZ end\ntail");
write("sub/in.txt", "BBB start\nx1\nx2\nYYY end");

const mod = await loadRepo(".opencode/tools/block_transfer.ts");
const t = mod.default;
const ctx = { directory: workDir };   // working dir = scratchpad subdir (allowed root 1)
const ctxRepo = { directory: REPO_ROOT };  // working dir = repo root (allowed root 1 for reject matrix)

try {
  // ---- shape checks
  chk("default export = tool() result (object with description string)", t != null && typeof t === "object" && typeof t.description === "string");
  chk("no stale 'name'/'parameters' keys", t && !("name" in t) && !("parameters" in t));
  chk("execute is async fn", typeof t.execute === "function" && t.execute.constructor.name === "AsyncFunction");

  // ---- description = agent-facing usage guide
  const d = t.description;
  for (const m of ["MOVE", "COPY", "CUT", "PASTE", "DELETE", "CLEAR"]) chk(`description names mode ${m}`, d.includes(m));
  chk("description: anchors span INCLUSIVE", d.includes("INCLUSIVE"));
  chk("description: targetMarker sets insertion, else append at EOF", d.includes("targetMarker") && /append at EOF/.test(d));
  chk("description: named buffers, default 'default', multiple per session", d.includes("bufferName") && d.includes("'default'") && /multiple buffers/i.test(d));
  chk("description: sandbox boundary covers reads AND writes (working dir + temp)", /reads AND writes/i.test(d) && /temp/i.test(d));
  chk("description: leads with the one-liner (housekeeping rule dropped per ff4c2fc)", d.includes("Move, copy, cut, paste, delete, or clear multi-line blocks in files using short unique line-prefix anchors and named clipboard buffers."));

  // ---- args shape
  const args = t.args;
  chk("mode is required (rejects undefined)", args.mode && !args.mode.safeParse(undefined).success);
  chk("mode accepts MOVE", args.mode.safeParse("MOVE").success);
  chk("mode rejects bogus value", !args.mode.safeParse("BOGUS").success);
  for (const k of ["srcFile", "dstFile", "startMarker", "endMarker", "targetMarker", "bufferName"]) {
    chk(`args.${k} is optional (accepts undefined)`, args[k] && args[k].safeParse(undefined).success);
  }

  // ---- sandbox ALLOW matrix (reads AND writes)
  let r;
  r = await t.execute({ mode: "COPY", srcFile: "a_cwd.txt", startMarker: "AAA", endMarker: "ZZZ", bufferName: "allow1" }, ctx);
  chk("ALLOW read: file in cwd (COPY)", /Copied 4 lines/.test(r) && readW("a_cwd.txt") === "AAA start\nline1\nline2\nZZZ end\ntail");
  r = await t.execute({ mode: "PASTE", dstFile: "a_cwd.txt", bufferName: "allow1", targetMarker: "tail" }, ctx);
  chk("ALLOW write: file in cwd (PASTE)", /Pasted 4 lines/.test(r) && readW("a_cwd.txt") === "AAA start\nline1\nline2\nZZZ end\ntail\nAAA start\nline1\nline2\nZZZ end");
  r = await t.execute({ mode: "COPY", srcFile: "sub/in.txt", startMarker: "BBB", endMarker: "YYY", bufferName: "allow2" }, ctx);
  chk("ALLOW read: file in cwd subdir (COPY)", /Copied 4 lines/.test(r));
  r = await t.execute({ mode: "PASTE", dstFile: "sub/deep/out.txt", bufferName: "allow2" }, ctx);
  chk("ALLOW write: NEW subdir inside sandbox (PASTE creates dir)", /Pasted 4 lines/.test(r) && fs.readFileSync(path.join(workDir, "sub/deep/out.txt"), "utf-8") === "BBB start\nx1\nx2\nYYY end");
  fs.writeFileSync(tempFile, "TTT start\nm1\nMMM end\nrest");
  r = await t.execute({ mode: "COPY", srcFile: tempFile, startMarker: "TTT", endMarker: "MMM", bufferName: "allow3" }, ctx);
  chk("ALLOW read: file in temp dir (COPY)", /Copied 3 lines/.test(r));
  r = await t.execute({ mode: "PASTE", dstFile: tempFile, bufferName: "allow3" }, ctx);
  chk("ALLOW write: file in temp dir (PASTE)", /Pasted 3 lines/.test(r) && fs.readFileSync(tempFile, "utf-8") === "TTT start\nm1\nMMM end\nrest\nTTT start\nm1\nMMM end");
  fs.writeFileSync(tempFile, "SSS start\nn1\nNNN end\ntailx");
  r = await t.execute({ mode: "MOVE", srcFile: tempFile, startMarker: "SSS", endMarker: "NNN", dstFile: tempSubFile }, ctx);
  chk("ALLOW write: NEW temp subdir (MOVE creates dir)", /Moved 3 lines/.test(r) && fs.readFileSync(tempSubFile, "utf-8") === "SSS start\nn1\nNNN end" && fs.readFileSync(tempFile, "utf-8") === "tailx");

  // ---- functional round-trips, all six modes (allowed paths)
  fs.writeFileSync(tempFile, "AAA start\nline1\nline2\nZZZ end\ntail");
  fs.writeFileSync(tempFile2, "head\nmarker-line\nfoot");
  r = await t.execute({ mode: "MOVE", srcFile: tempFile, startMarker: "AAA", endMarker: "ZZZ", dstFile: tempFile2, targetMarker: "marker-line" }, ctx);
  chk("MOVE round-trip (targetMarker)", /Moved 4 lines/.test(r) && fs.readFileSync(tempFile, "utf-8") === "tail" && fs.readFileSync(tempFile2, "utf-8") === "head\nmarker-line\nAAA start\nline1\nline2\nZZZ end\nfoot");
  fs.writeFileSync(tempFile, "AAA start\nline1\nline2\nZZZ end\ntail");
  fs.writeFileSync(tempFile2, "head");
  r = await t.execute({ mode: "MOVE", srcFile: tempFile, startMarker: "AAA", endMarker: "ZZZ", dstFile: tempFile2 }, ctx);
  chk("MOVE round-trip (append EOF)", /Moved 4 lines/.test(r) && fs.readFileSync(tempFile, "utf-8") === "tail" && fs.readFileSync(tempFile2, "utf-8") === "head\nAAA start\nline1\nline2\nZZZ end");
  fs.writeFileSync(tempFile, "AAA start\nline1\nline2\nZZZ end\ntail");
  r = await t.execute({ mode: "COPY", srcFile: tempFile, startMarker: "AAA", endMarker: "ZZZ", bufferName: "rt_copy" }, ctx);
  chk("COPY round-trip (src untouched, buffer filled)", /Copied 4 lines/.test(r) && fs.readFileSync(tempFile, "utf-8") === "AAA start\nline1\nline2\nZZZ end\ntail");
  r = await t.execute({ mode: "CUT", srcFile: tempFile, startMarker: "AAA", endMarker: "ZZZ", bufferName: "rt_cut" }, ctx);
  chk("CUT round-trip (src cut, buffer filled)", /Cut 4 lines/.test(r) && fs.readFileSync(tempFile, "utf-8") === "tail");
  fs.writeFileSync(tempFile2, "head\nmarker-line\nfoot");
  r = await t.execute({ mode: "PASTE", dstFile: tempFile2, bufferName: "rt_copy", targetMarker: "marker-line" }, ctx);
  chk("PASTE round-trip (targetMarker)", /Pasted 4 lines/.test(r) && fs.readFileSync(tempFile2, "utf-8") === "head\nmarker-line\nAAA start\nline1\nline2\nZZZ end\nfoot");
  fs.writeFileSync(tempFile2, "head");
  r = await t.execute({ mode: "PASTE", dstFile: tempFile2, bufferName: "rt_cut" }, ctx);
  chk("PASTE round-trip (append EOF)", /Pasted 4 lines/.test(r) && fs.readFileSync(tempFile2, "utf-8") === "head\nAAA start\nline1\nline2\nZZZ end");
  fs.writeFileSync(tempFile, "AAA start\nline1\nline2\nZZZ end\ntail");
  r = await t.execute({ mode: "DELETE", srcFile: tempFile, startMarker: "AAA", endMarker: "ZZZ" }, ctx);
  chk("DELETE round-trip (block purged)", /Deleted 4 lines/.test(r) && fs.readFileSync(tempFile, "utf-8") === "tail");
  fs.writeFileSync(tempFile, "AAA start\nZZZ end");
  await t.execute({ mode: "COPY", srcFile: tempFile, startMarker: "AAA", endMarker: "ZZZ", bufferName: "rt_clear" }, ctx);
  r = await t.execute({ mode: "CLEAR", bufferName: "rt_clear" }, ctx);
  chk("CLEAR reports buffer cleared", /cleared/.test(r));
  r = await t.execute({ mode: "PASTE", dstFile: tempFile2, bufferName: "rt_clear" }, ctx);
  chk("PASTE from cleared buffer -> empty-buffer error", /is empty/.test(r));

  // ---- buffer isolation (two names, no cross-talk)
  fs.writeFileSync(tempFile, "AAA one\nZZZ one");
  fs.writeFileSync(tempFile2, "BBB two\nYYY two");
  await t.execute({ mode: "COPY", srcFile: tempFile, startMarker: "AAA", endMarker: "ZZZ", bufferName: "iso_a" }, ctx);
  await t.execute({ mode: "COPY", srcFile: tempFile2, startMarker: "BBB", endMarker: "YYY", bufferName: "iso_b" }, ctx);
  fs.writeFileSync(tempFile2, "head");
  await t.execute({ mode: "PASTE", dstFile: tempFile2, bufferName: "iso_a" }, ctx);
  await t.execute({ mode: "PASTE", dstFile: tempFile2, bufferName: "iso_b" }, ctx);
  chk("buffer isolation (two names, no cross-talk)", fs.readFileSync(tempFile2, "utf-8") === "head\nAAA one\nZZZ one\nBBB two\nYYY two" && fs.readFileSync(tempFile, "utf-8") === "AAA one\nZZZ one");

  // ---- error paths (allowed paths)
  r = await t.execute({ mode: "COPY", srcFile: "no_such_file.txt", startMarker: "AAA", endMarker: "ZZZ" }, ctx);
  chk("error: missing src file (guard passes, not-found)", /not found/.test(r) && !/outside the sandbox/.test(r));
  r = await t.execute({ mode: "COPY", srcFile: tempFile, startMarker: "NOPE", endMarker: "ZZZ" }, ctx);
  chk("error: missing start marker", /Start marker 'NOPE' not found/.test(r));
  r = await t.execute({ mode: "COPY", srcFile: tempFile, startMarker: "AAA", endMarker: "MISSING" }, ctx);
  chk("error: missing end marker", /End marker 'MISSING' not found after start marker/.test(r));
  r = await t.execute({ mode: "PASTE", dstFile: tempFile2, bufferName: "never_used" }, ctx);
  chk("error: PASTE from never-used empty buffer", /is empty/.test(r));

  // ---- sandbox REJECT matrix (cwd = repo root; temp root still allowed)
  const REJ = /outside the sandbox/;
  // fill a buffer for the PASTE-reject cases (COPY from an allowed temp file)
  fs.writeFileSync(tempFile, "RRR start\nzz1\nZZZ end");
  await t.execute({ mode: "COPY", srcFile: tempFile, startMarker: "RRR", endMarker: "ZZZ", bufferName: "rej_buf" }, ctxRepo);
  r = await t.execute({ mode: "COPY", srcFile: "..\\definitely_outside.txt", startMarker: "AAA", endMarker: "ZZZ" }, ctxRepo);
  chk("REJECT src: '..' traversal out of cwd", REJ.test(r));
  r = await t.execute({ mode: "COPY", srcFile: outsideAbs, startMarker: "AAA", endMarker: "ZZZ" }, ctxRepo);
  chk("REJECT src: absolute C:\\Windows path (guard fires before read of an EXISTING file)", REJ.test(r) && !/marker.*not found/i.test(r));
  r = await t.execute({ mode: "COPY", srcFile: path.join(outsideDir, "sibling_probe.txt"), startMarker: "AAA", endMarker: "ZZZ" }, ctxRepo);
  chk("REJECT src: sibling dir of repo root", REJ.test(r));
  r = await t.execute({ mode: "PASTE", dstFile: outsideDst1, bufferName: "rej_buf" }, ctxRepo);
  chk("REJECT dst: PASTE into outside (absolute)", REJ.test(r) && !fs.existsSync(outsideDst1));
  r = await t.execute({ mode: "PASTE", dstFile: "..\\smoke_outside_rel.txt", bufferName: "rej_buf" }, ctxRepo);
  chk("REJECT dst: PASTE into '..' (relative)", REJ.test(r) && !fs.existsSync(outsideDstRel));
  const moveSrcBefore = fs.readFileSync(tempFile, "utf-8");
  r = await t.execute({ mode: "MOVE", srcFile: tempFile, startMarker: "RRR", endMarker: "ZZZ", dstFile: outsideDst2 }, ctxRepo);
  chk("REJECT MOVE: dst outside (no partial cut: src unchanged, dst not created)", REJ.test(r) && fs.readFileSync(tempFile, "utf-8") === moveSrcBefore && !fs.existsSync(outsideDst2));
  r = await t.execute({ mode: "DELETE", srcFile: outsideAbs, startMarker: "AAA", endMarker: "ZZZ" }, ctxRepo);
  chk("REJECT DELETE: src outside", REJ.test(r));
  // TODO #94: REPLACE into an outside dst — the guard fires BEFORE any fs access
  // (no read, no write, no file created); the buffer stays untouched for later use.
  const repRoots = [REPO_ROOT, process.env.TEMP ?? process.env.TMP].filter((rr) => typeof rr === "string" && rr.length > 0);
  r = await t.execute({ mode: "REPLACE", dstFile: outsideDstRep, startMarker: "AAA", endMarker: "ZZZ", bufferName: "rej_buf" }, ctxRepo);
  chk("REJECT dst: REPLACE into outside (byte-exact error form, no write)", r === `Error: '${outsideDstRep}' is outside the sandbox (allowed: ${repRoots.join(", ")})` && !fs.existsSync(outsideDstRep));
  chk("reject error form: Error: '<path>' is outside the sandbox (allowed: <roots>)", /^Error: '.*' is outside the sandbox \(allowed: [^)]+\)$/.test(r));
} finally {
  for (const p of [workDir, tempFile, tempFile2, path.join(tempRoot, "bt_sandbox_tmpsub"), outsideDst1, outsideDst2, outsideDstRel, outsideDstRep]) {
    try { fs.rmSync(p, { recursive: true, force: true }); } catch {}
  }
}

finish();
