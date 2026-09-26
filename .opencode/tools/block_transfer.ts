import * as fs from "fs";
import * as path from "path";
import { tool } from "@opencode-ai/plugin"

// Persistent memory cache for named clipboards across tool invocations within the session
const clipboardBuffers: Record<string, string[]> = {};

// Path guard: every file-path argument (src and dst, all modes) must resolve inside the
// working directory or the Windows temp directory. Returns null if allowed, an error
// string if not. Called BEFORE any fs access — no partial writes on rejection.
function sandboxCheck(cwd: string, givenPath: string): string | null {
  const roots = [cwd, process.env.TEMP ?? process.env.TMP].filter(
    (r): r is string => typeof r === "string" && r.length > 0
  );
  const resolved = path.resolve(cwd, givenPath).toLowerCase();
  const allowed = roots.some((root) => {
    const r = path.resolve(root).toLowerCase();
    return resolved === r || resolved.startsWith(r + path.sep);
  });
  if (allowed) return null;
  return `Error: '${givenPath}' is outside the sandbox (allowed: ${roots.join(", ")})`;
}

// ===== THE UNIFIED ANCHOR RULE (approved proposal 2026-09-25_block_transfer-v2, Part A) =====
// Every mode's startMarker / endMarker / targetMarker lookup routes through
// resolveAnchor — ONE rule for ALL modes. This replaces the old per-mode
// matching: COPY's mid-line substring tolerance is GONE (a flagged, approved
// decision), and REPLACE now trims the line's leading whitespace before the
// prefix match (the old bare startsWith did not).
//
// The matching rule itself lives in matchAnchorLines, and ONLY there:
// swapping the general behavior (prefix -> substring / case-insensitive /
// fuzzy) is a change in this one place, not in the modes.
//
// Rule (exactly as approved, Part A):
//   - the file is split into lines on `\n`; a trailing `\r` on a line is
//     ignored for matching (CRLF-tolerant);
//   - an anchor A matches line L if L, after removing LEADING spaces/tabs,
//     BEGINS with A verbatim (case-sensitive; A is used as typed — no
//     trimming of the anchor itself);
//   - the line's remainder after A is irrelevant (a longer line still
//     matches — that's the prefix);
//   - the anchor must match EXACTLY ONE line.

// The 1-based line numbers of ALL matching lines (empty array = no match).
export function matchAnchorLines(fileText: string, anchor: string): number[] {
  if (!anchor) return [];
  const out: number[] = [];
  const lines = fileText.split("\n");
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    if (line.endsWith("\r")) line = line.slice(0, -1);
    if (line.replace(/^[ \t]+/, "").startsWith(anchor)) out.push(i + 1);
  }
  return out;
}

// The EXACTLY-ONE contract: the 1-based line number of the EXACT ONE match,
// else null. The single entry point every mode's anchor lookup resolves
// through.
export function resolveAnchor(fileText: string, anchor: string): number | null {
  const matches = matchAnchorLines(fileText, anchor);
  return matches.length === 1 ? matches[0] : null;
}

// The teaching error taxonomy (Part A), one line each:
//  - not-found: the anchor quoted (with the file);
//  - non-unique: the anchor quoted (with the file) — the legacy byte form,
//    probe-pinned (probe 263); the match count + the first match line numbers
//    land with the v2 probe-section re-pin (S3);
//  - empty-buffer: the existing message, kept verbatim (probe-pinned, 116);
//  - ref-out-of-range: PREPARED for the Part B/C line-number refs (they do
//    not exist yet) — the text exists now; the wiring lands with the refs.
// Out-of-sandbox is NOT in this taxonomy — the intercept plugin handles it
// upstream; sandboxCheck above stays the defense-in-depth backstop.
function notFoundError(fileRef: string, label: string, anchor: string): string {
  return `Error: ${label} '${anchor}' not found in ${fileRef}.`;
}
function nonUniqueError(fileRef: string, label: string, anchor: string): string {
  return `Error: ${label} '${anchor}' is not unique in ${fileRef}.`;
}
// A 1-based line number beyond the file's line count, with the count.
export function refOutOfRangeError(fileRef: string, lineNo: number, lineCount: number): string {
  const word = lineCount === 1 ? "line" : "lines";
  return `Error: line ${lineNo} is out of range in ${fileRef} (the file has ${lineCount} ${word}).`;
}

// The single routing entry for every mode's anchor lookup: resolves through
// resolveAnchor; on failure builds the teaching error from the same matcher
// (not-found / non-unique).
type AnchorResolution = { line: number } | { error: string };
function resolveAnchorOrError(fileRef: string, label: string, fileText: string, anchor: string): AnchorResolution {
  const line = resolveAnchor(fileText, anchor);
  if (line !== null) return { line };
  const matches = matchAnchorLines(fileText, anchor);
  return { error: matches.length === 0 ? notFoundError(fileRef, label, anchor) : nonUniqueError(fileRef, label, anchor) };
}

// ===== LINE-NUMBER REFS + ASSEMBLY (approved proposal 2026-09-25_block_transfer-v2, Parts B+C) =====
//
// Part B: EVERY ref side (startMarker / endMarker / targetMarker, and each
// item of the Part C 'refs' lists) is a marker string OR an integer line
// number (1-based, absolute). The disambiguation is at the SCHEMA level
// (poka-yoke): the schema carries string | integer, so the runtime reads
// the TYPE — no string sniffing (the string "42" is a prefix MARKER that
// must match a line beginning with "42"; the number 42 is line 42, full
// stop). A numeric ref resolves to that exact line of the PRE-call file
// state (no marker lookup); beyond the file's line count -> the S1
// ref-out-of-range error (with the count).
type Ref = string | number;

// The presence test for a ref: absent = null / undefined / "" (the S1 falsy
// forms — byte-compatible); 0 IS present (it then fails the 1-based check
// with the teaching error instead of a silent skip).
function refPresent(ref: Ref | undefined): boolean {
  return ref !== undefined && ref !== null && ref !== "";
}

// The file's conceptual line count: the SAME /\r?\n/ split the rest of the
// tool uses, minus the empty tail element a trailing newline produces
// ("a\nb\n" = 2 lines; "" = 0 lines).
export function countLines(fileText: string): number {
  if (fileText === "") return 0;
  const n = fileText.split(/\r?\n/).length;
  return fileText.endsWith("\n") ? n - 1 : n;
}

// The single routing entry for a REF (marker string OR line number): a
// number resolves directly (range-checked against the PRE-call state), a
// string routes through the S1 anchor rule (resolveAnchor — untouched).
export function resolveRef(fileRef: string, label: string, fileText: string, ref: Ref): AnchorResolution {
  if (typeof ref === "number") {
    if (!Number.isInteger(ref) || ref < 1) {
      return { error: `Error: ${label} ${ref} is not a 1-based line number in ${fileRef}.` };
    }
    const lineCount = countLines(fileText);
    if (ref > lineCount) return { error: refOutOfRangeError(fileRef, ref, lineCount) };
    return { line: ref };
  }
  return resolveAnchorOrError(fileRef, label, fileText, ref);
}

// Part C: a 'text' form -> lines (split on \r?\n; a trailing newline does
// NOT add a blank line — the same convention as the file handling).
function textToLines(text: string): string[] {
  if (text === "") return [];
  const lines = text.split(/\r?\n/);
  return text.endsWith("\n") ? lines.slice(0, -1) : lines;
}

type AssemblyResolved = { fileRef: string | null; lines: string[]; rangeText: string };
type AssemblyResult = { error: string } | AssemblyResolved;

// Part C: the shared input resolution for COPY (replace-into-buffer) and
// APPEND (append-to-buffer). EXACTLY ONE of three forms:
//   single-ref: srcFile + startMarker..endMarker (each a marker-or-number —
//     the S1 form, byte-compatible);
//   refs list:  srcFile + refs (each ref selects ONE line of srcFile; the
//     sections go into the buffer joined by EXACTLY ONE \n — the documented
//     default, no parameter);
//   text:       the text's lines directly (no file).
// ALL refs resolve against the PRE-call src state; every check runs before
// any buffer change (no partial state on rejection).
function resolveAssembly(mode: string, args: any, cwd: string): AssemblyResult {
  const hasText = typeof args.text === "string";
  const hasRefs = Array.isArray(args.refs);
  const hasSingle = args.startMarker !== undefined || args.endMarker !== undefined;
  if (hasText && (hasRefs || hasSingle)) {
    return { error: "Error: the 'text' form takes the input alone (no 'refs', no markers)." };
  }
  if (hasRefs && hasSingle) {
    return { error: "Error: the 'refs' list takes the input alone (no markers)." };
  }
  if (hasText) {
    const lines = textToLines(args.text);
    return { fileRef: null, lines, rangeText: lines.length > 0 ? `1..${lines.length}` : "" };
  }
  if (hasRefs) {
    if (!args.srcFile) return { error: `Error: 'srcFile' is required for the 'refs' form of ${mode} mode.` };
    const srcPath = path.resolve(cwd, args.srcFile);
    const violation = sandboxCheck(cwd, args.srcFile);
    if (violation) return { error: violation };
    if (!fs.existsSync(srcPath)) return { error: `Error: Source file '${args.srcFile}' not found.` };
    const srcRaw = fs.readFileSync(srcPath, "utf-8");
    const srcLines = srcRaw.split(/\r?\n/);
    const resolved: number[] = [];
    for (const ref of args.refs) {
      const r = resolveRef(args.srcFile, "List ref", srcRaw, ref);
      if ("error" in r) return { error: r.error };
      resolved.push(r.line);
    }
    return { fileRef: args.srcFile, lines: resolved.map((l) => srcLines[l - 1]), rangeText: resolved.join(", ") };
  }
  // single-ref form (including the bare call) — the S1 required-error covers
  // every missing part, byte-compatible.
  if (!args.srcFile || !refPresent(args.startMarker) || !refPresent(args.endMarker)) {
    if (mode === "APPEND" && args.srcFile === undefined && args.startMarker === undefined && args.endMarker === undefined) {
      return { error: "Error: APPEND needs one input form: a 'refs' list, 'startMarker'+'endMarker' (with srcFile), or 'text'." };
    }
    return { error: `Error: 'srcFile', 'startMarker', and 'endMarker' are required for mode ${mode}.` };
  }
  const srcPath = path.resolve(cwd, args.srcFile);
  const violation = sandboxCheck(cwd, args.srcFile);
  if (violation) return { error: violation };
  if (!fs.existsSync(srcPath)) return { error: `Error: Source file '${args.srcFile}' not found.` };
  const srcRaw = fs.readFileSync(srcPath, "utf-8");
  const srcLines = srcRaw.split(/\r?\n/);
  const start = resolveRef(args.srcFile, "Start marker", srcRaw, args.startMarker);
  if ("error" in start) return { error: start.error };
  const end = resolveRef(args.srcFile, "End marker", srcRaw, args.endMarker);
  if ("error" in end) return { error: end.error };
  // The unified rule resolves both refs file-wide; an end resolved
  // BEFORE the start keeps the pinned legacy error (probe 115).
  if (end.line < start.line) {
    return { error: `Error: End marker '${args.endMarker}' not found after start marker.` };
  }
  return { fileRef: args.srcFile, lines: srcLines.slice(start.line - 1, end.line), rangeText: `${start.line}..${end.line}` };
}

// Part F feedback (one line per op — the ops S2 adds/touches = COPY/APPEND):
// resolved line range + line count + truncated first-line echo (capped at
// 40 chars, '...' marker); buffer ops add the buffer's line count AFTER
// the op.
function assemblyFeedback(verb: string, prep: string, a: AssemblyResolved, bufferKey: string, bufferAfter: number): string {
  const lw = (m: number) => `${m} line${m === 1 ? "" : "s"}`;
  const first = a.lines[0] ?? "";
  const echo = first.length > 40 ? first.slice(0, 40) + "..." : first;
  const srcLabel = a.fileRef === null ? "text" : `'${a.fileRef}'`;
  const mid = a.rangeText !== "" ? ` (lines ${a.rangeText}, first: '${echo}')` : "";
  return `${verb} ${lw(a.lines.length)} from ${srcLabel} ${prep} buffer '${bufferKey}'${mid} - buffer: ${lw(bufferAfter)}.`;
}

export default tool({
   description: `Move, copy, cut, paste, delete, or clear multi-line blocks in files using short unique line-prefix anchors and named clipboard buffers.

MODES — MOVE: immediate cut-and-paste, extracts a block from srcFile and inserts it into dstFile in one call. COPY: extract a block from srcFile into a buffer, leaving the source untouched — input forms: a single-ref pair (startMarker..endMarker), a 'refs' LIST, or a 'text' key (direct text -> buffer). APPEND: append to the named buffer, created if absent — the SAME input forms as COPY (stepwise assembly, no flags). CUT: extract into a buffer AND delete from the source. PASTE: write a buffer into dstFile. REPLACE: replace the line-anchored span (startMarker..endMarker inclusive) of dstFile with the contents of a named buffer — edit-like region replacement WITHOUT an exact oldString match (REPLACE never creates a file). DELETE: extract a block and discard it (purge without outputting). CLEAR: empty a buffer. Use MOVE for a single direct transfer; use COPY/CUT + PASTE for multi-buffer work across files (one buffer can be pasted several times); use COPY/APPEND to assemble a buffer without a scratchpad round-trip; use REPLACE to swap a region in place (PASTE inserts, it does not replace).

REFS — every ref (startMarker / endMarker / targetMarker, and each item of a COPY/APPEND 'refs' list) is a marker string OR an integer line number (1-based, absolute, resolved against the PRE-call file state). The TYPE decides (schema poka-yoke — no string sniffing: the string "42" is a prefix MARKER, the number 42 is line 42). A line number beyond the file's line count returns the ref-out-of-range error (with the count).

ANCHORS — a marker ref is a short UNIQUE line prefix; the block spans the start line through the end line INCLUSIVE. For MOVE/PASTE, an optional targetMarker (marker or line number in dstFile) sets the insertion point right after that line; omit it to append at EOF. For REPLACE, startMarker/endMarker are the span in dstFile itself (no targetMarker).

ASSEMBLY — COPY 'refs' LIST form: each ref selects ONE line of srcFile; the sections go into the buffer joined by EXACTLY ONE \\n (documented default — no parameter). COPY 'text' form: the text is split into lines (a trailing newline adds no blank line). COPY keeps the REPLACE-into-buffer semantics (the buffer is replaced, never appended); APPEND appends (creates the buffer if absent). Feedback for COPY/APPEND: one line — resolved line range + line count + truncated first-line echo (~40 chars, '...' when cut) — plus the buffer's line count AFTER the op.

BUFFERS — bufferName selects a named clipboard buffer (default 'default'); multiple buffers can coexist in one session; CLEAR empties one. For REPLACE the buffer supplies the replacement content (and is preserved afterwards, like PASTE).

SANDBOX — all file access (reads AND writes) is confined to the working directory and the Windows temp directory; any path outside is rejected with an error.

EDGE — a non-unique anchor, a missing required path, an out-of-range line-number ref, an empty PASTE or REPLACE buffer, or an out-of-sandbox path each return an error naming the cause — read the error, fix the input, re-issue (a non-unique anchor: widen the prefix, do not guess).

EXAMPLE — move the block spanning "## TODO" .. "## Notes" (inclusive) from TODO.md into BACKLOG.md, right after its "# Backlog" header line:
  { "mode": "MOVE", "srcFile": "TODO.md", "dstFile": "BACKLOG.md", "startMarker": "## TODO", "endMarker": "## Notes", "targetMarker": "# Backlog" }`,
    args: {
    mode: tool.schema.enum(["MOVE", "COPY", "APPEND", "CUT", "PASTE", "REPLACE", "DELETE", "CLEAR"]).describe("Operation mode: MOVE (immediate cut-and-paste), COPY (yank to buffer — single-ref pair, 'refs' list, or 'text'), APPEND (append to the named buffer, created if absent — the same forms as COPY), CUT (yank to buffer and delete from source), PASTE (write buffer to target), REPLACE (replace the line-anchored span of dstFile with a named buffer), DELETE (cut to null), CLEAR (empty buffer)."),
    srcFile: tool.schema.string().optional().describe("Source file path. Required for MOVE, CUT, DELETE, and the single-ref and 'refs' forms of COPY/APPEND."),
    dstFile: tool.schema.string().optional().describe("Destination file path. Required for MOVE, PASTE, or REPLACE. For REPLACE the file must exist (REPLACE never creates a file)."),
    startMarker: tool.schema.union([tool.schema.string(), tool.schema.number().int()]).optional().describe("Block start: a marker string (short UNIQUE line prefix) OR an integer line number (1-based, absolute) — the type decides (no string sniffing). Required for the single-ref form (MOVE, COPY, CUT, DELETE; for REPLACE: the span start in dstFile)."),
    endMarker: tool.schema.union([tool.schema.string(), tool.schema.number().int()]).optional().describe("Block end: a marker string (short UNIQUE line prefix) OR an integer line number (1-based, absolute) — the type decides (no string sniffing). Required for the single-ref form (MOVE, COPY, CUT, DELETE; for REPLACE: the span end in dstFile)."),
    targetMarker: tool.schema.union([tool.schema.string(), tool.schema.number().int()]).optional().describe("Insertion point in dstFile: a marker string (short UNIQUE line prefix) OR an integer line number (1-based, absolute); the block goes right after that line. If omitted in MOVE or PASTE, appends to EOF."),
    refs: tool.schema.array(tool.schema.union([tool.schema.string(), tool.schema.number().int()])).optional().describe("COPY/APPEND list form: a LIST of refs (marker string or integer line number each); each ref selects ONE line of srcFile, and the sections go into the buffer joined by EXACTLY ONE \\n. Mutually exclusive with 'text' and the markers."),
    text: tool.schema.string().optional().describe("COPY/APPEND direct-text form: the text goes into the buffer (split into lines; a trailing newline adds no blank line). Mutually exclusive with 'refs' and the markers."),
    bufferName: tool.schema.string().optional().describe("Name of the clipboard buffer (defaults to 'default'). Allows managing multiple clipboards.")
  },

  execute: async (args: any, context: any) => {
    try {
      const mode = (args.mode || "MOVE").toUpperCase();
      const bufferKey = args.bufferName || "default";
      const cwd = context.directory || process.cwd();

      // 1. CLEAR BUFFER
      if (mode === "CLEAR") {
        delete clipboardBuffers[bufferKey];
        return `Clipboard buffer '${bufferKey}' cleared.`;
      }

      // 2. PASTE FROM BUFFER
      if (mode === "PASTE") {
        if (!args.dstFile) return "Error: 'dstFile' is required for PASTE mode.";
        const buffer = clipboardBuffers[bufferKey];
        if (!buffer || buffer.length === 0) {
          return `Error: Clipboard buffer '${bufferKey}' is empty. Perform a COPY or CUT first.`;
        }

        const dstPath = path.resolve(cwd, args.dstFile);
        const dstViolation = sandboxCheck(cwd, args.dstFile);
        if (dstViolation) return dstViolation;
        let dstText = "";
        let dstLines: string[] = [];
        if (fs.existsSync(dstPath)) {
          dstText = fs.readFileSync(dstPath, "utf-8");
          dstLines = dstText.split(/\r?\n/);
        } else {
          fs.mkdirSync(path.dirname(dstPath), { recursive: true });
        }

        let insertIdx = dstLines.length;
        if (refPresent(args.targetMarker)) {
          const target = resolveRef(args.dstFile, "Target marker", dstText, args.targetMarker);
          if ("error" in target) return target.error;
          insertIdx = target.line; // 1-based line number: insert right AFTER that line
        }

        dstLines.splice(insertIdx, 0, ...buffer);
        fs.writeFileSync(dstPath, dstLines.join("\n"), "utf-8");

        return `Pasted ${buffer.length} lines from buffer '${bufferKey}' into '${args.dstFile}'.`;
      }

      // 2b. REPLACE SPAN IN DST — the line-anchored span (start..end inclusive) of
      // an EXISTING dstFile is replaced by the named buffer's content. PASTE-like
      // buffer semantics: the buffer is PRESERVED (not consumed). All checks run
      // BEFORE any fs write — no partial writes on rejection.
      if (mode === "REPLACE") {
        if (!args.dstFile) return "Error: 'dstFile' is required for REPLACE mode.";
        if (!refPresent(args.startMarker)) return "Error: 'startMarker' is required for REPLACE mode.";
        if (!refPresent(args.endMarker)) return "Error: 'endMarker' is required for REPLACE mode.";

        const dstPath = path.resolve(cwd, args.dstFile);
        const dstViolation = sandboxCheck(cwd, args.dstFile);
        if (dstViolation) return dstViolation;
        // REPLACE never creates a file — there is no span to replace in a nonexistent file.
        if (!fs.existsSync(dstPath)) return `Error: File '${args.dstFile}' not found.`;

        const buffer = clipboardBuffers[bufferKey];
        if (!buffer || buffer.length === 0) {
          return `Error: Clipboard buffer '${bufferKey}' is empty. Perform a COPY or CUT first.`;
        }

        const dstText = fs.readFileSync(dstPath, "utf-8");
        const dstLines = dstText.split(/\r?\n/);
        const start = resolveRef(args.dstFile, "Start marker", dstText, args.startMarker);
        if ("error" in start) return start.error;
        const end = resolveRef(args.dstFile, "End marker", dstText, args.endMarker);
        if ("error" in end) return end.error;
        const startIdx = start.line - 1;
        const endIdx = end.line - 1;
        if (startIdx > endIdx) {
          return `Error: Start marker '${args.startMarker}' is after end marker '${args.endMarker}' in ${args.dstFile}.`;
        }

        const replacedCount = endIdx - startIdx + 1;
        dstLines.splice(startIdx, replacedCount, ...buffer);
        fs.writeFileSync(dstPath, dstLines.join("\n"), "utf-8");

        const lineWord = (n: number) => `${n} line${n === 1 ? "" : "s"}`;
        return `REPLACED lines ${startIdx + 1}..${endIdx + 1} (${lineWord(replacedCount)}) in '${args.dstFile}' with buffer '${bufferKey}' (${lineWord(buffer.length)}).`;
      }

      // 2c. COPY — yank to buffer (Part C). THREE input forms, exactly one:
      // a single-ref pair (startMarker..endMarker — the S1 form, byte-
      // compatible), a 'refs' LIST (each ref selects ONE line), or a 'text'
      // key (direct text -> buffer). COPY keeps the REPLACE-into-buffer
      // semantics: the buffer is REPLACED in every form (never appended —
      // that is APPEND). Part F feedback (one line): resolved line range +
      // line count + truncated first-line echo; the buffer's line count
      // AFTER the op (buffer op).
      if (mode === "COPY") {
        const a = resolveAssembly("COPY", args, cwd);
        if ("error" in a) return a.error;
        clipboardBuffers[bufferKey] = a.lines;
        return assemblyFeedback("Copied", "into", a, bufferKey, a.lines.length);
      }

      // 2d. APPEND (Part C) — append to the named buffer, created if absent:
      // stepwise assembly without flags. The SAME input forms as COPY.
      if (mode === "APPEND") {
        const a = resolveAssembly("APPEND", args, cwd);
        if ("error" in a) return a.error;
        const before = clipboardBuffers[bufferKey] ?? [];
        clipboardBuffers[bufferKey] = [...before, ...a.lines];
        return assemblyFeedback("Appended", "to", a, bufferKey, before.length + a.lines.length);
      }

      // 3. ANCHOR EXTRACTION (MOVE, CUT, DELETE)
      if (!args.srcFile || !refPresent(args.startMarker) || !refPresent(args.endMarker)) {
        return `Error: 'srcFile', 'startMarker', and 'endMarker' are required for mode ${mode}.`;
      }

      const srcPath = path.resolve(cwd, args.srcFile);
      const srcViolation = sandboxCheck(cwd, args.srcFile);
      if (srcViolation) return srcViolation;
      // MOVE: guard the destination BEFORE any write — a rejected dst must not leave the
      // source already cut (no partial writes on rejection).
      if (mode === "MOVE" && args.dstFile) {
        const moveViolation = sandboxCheck(cwd, args.dstFile);
        if (moveViolation) return moveViolation;
      }
      if (!fs.existsSync(srcPath)) return `Error: Source file '${args.srcFile}' not found.`;
      // MOVE: the missing-dst check runs BEFORE any write too — a missing dst must not
      // leave the source already cut (no partial writes on rejection).
      if (mode === "MOVE" && !args.dstFile) {
        return "Error: 'dstFile' is required for MOVE mode.";
      }

      const srcRaw = fs.readFileSync(srcPath, "utf-8");
      const srcLines = srcRaw.split(/\r?\n/);

      const start = resolveRef(args.srcFile, "Start marker", srcRaw, args.startMarker);
      if ("error" in start) return start.error;
      const end = resolveRef(args.srcFile, "End marker", srcRaw, args.endMarker);
      if ("error" in end) return end.error;
      // The unified rule resolves both refs file-wide; an end resolved
      // BEFORE the start keeps the pinned legacy error (probe 115).
      if (end.line < start.line) {
        return `Error: End marker '${args.endMarker}' not found after start marker.`;
      }
      const startIdx = start.line - 1;
      const endIdx = end.line - 1;

      const extractedBlock = srcLines.slice(startIdx, endIdx + 1);

      // Save to named clipboard buffer for CUT
      if (mode === "CUT") {
        clipboardBuffers[bufferKey] = extractedBlock;
      }

      // Cut out lines from source file for MOVE, CUT, or DELETE
      if (mode === "MOVE" || mode === "CUT" || mode === "DELETE") {
        const remainingLines = [
          ...srcLines.slice(0, startIdx),
          ...srcLines.slice(endIdx + 1)
        ];
        fs.writeFileSync(srcPath, remainingLines.join("\n"), "utf-8");
      }

      // Return immediate feedback
      if (mode === "DELETE") {
        return `Deleted ${extractedBlock.length} lines from '${args.srcFile}'.`;
      }
      if (mode === "CUT") {
        return `Cut ${extractedBlock.length} lines from '${args.srcFile}' into buffer '${bufferKey}'.`;
      }

      // 4. IMMEDIATE MOVE (CUT + PASTE IN ONE STEP)
      if (mode === "MOVE") {
        const dstPath = path.resolve(cwd, args.dstFile);
        let dstText = "";
        let dstLines: string[] = [];
        if (fs.existsSync(dstPath)) {
          dstText = fs.readFileSync(dstPath, "utf-8");
          dstLines = dstText.split(/\r?\n/);
        } else {
          fs.mkdirSync(path.dirname(dstPath), { recursive: true });
        }

        let insertIdx = dstLines.length;
        if (refPresent(args.targetMarker)) {
          const target = resolveRef(args.dstFile, "Target marker", dstText, args.targetMarker);
          if ("error" in target) return target.error;
          insertIdx = target.line; // 1-based line number: insert right AFTER that line
        }

        dstLines.splice(insertIdx, 0, ...extractedBlock);
        fs.writeFileSync(dstPath, dstLines.join("\n"), "utf-8");

        return `Moved ${extractedBlock.length} lines from '${args.srcFile}' to '${args.dstFile}'.`;
      }

      return "Operation completed.";
    } catch (err: any) {
      return `block_transfer failed: ${err.message}`;
    }
  }
});
