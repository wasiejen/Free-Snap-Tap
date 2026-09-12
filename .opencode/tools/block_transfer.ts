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

export default tool({
  description: `Move, copy, cut, paste, delete, or clear multi-line blocks in files using short unique line-prefix anchors and named clipboard buffers. Housekeeping rule: use this tool to move/copy/delete multi-line blocks (TODO sections, log sections, etc.) instead of write/edit.

MODES — MOVE: immediate cut-and-paste, extracts a block from srcFile and inserts it into dstFile in one call. COPY: extract a block from srcFile into a buffer, leaving the source untouched. CUT: extract into a buffer AND delete from the source. PASTE: write a buffer into dstFile. DELETE: extract a block and discard it (purge without outputting). CLEAR: empty a buffer. Use MOVE for a single direct transfer; use COPY/CUT + PASTE for multi-buffer work across files (one buffer can be pasted several times).

ANCHORS — startMarker and endMarker are short UNIQUE line prefixes; the block spans the start line through the end line INCLUSIVE. For MOVE/PASTE, an optional targetMarker (a unique line prefix in dstFile) sets the insertion point right after that line; omit it to append at EOF.

BUFFERS — bufferName selects a named clipboard buffer (default 'default'); multiple buffers can coexist in one session; CLEAR empties one.

SANDBOX — all file access (reads AND writes) is confined to the working directory and the Windows temp directory; any path outside is rejected with an error.`,
  args: {
    mode: tool.schema.enum(["MOVE", "COPY", "CUT", "PASTE", "DELETE", "CLEAR"]).describe("Operation mode: MOVE (immediate cut-and-paste), COPY (yank to buffer), CUT (yank to buffer and delete from source), PASTE (write buffer to target), DELETE (cut to null), CLEAR (empty buffer)."),
    srcFile: tool.schema.string().optional().describe("Source file path. Required for MOVE, COPY, CUT, and DELETE."),
    dstFile: tool.schema.string().optional().describe("Destination file path. Required for MOVE or PASTE."),
    startMarker: tool.schema.string().optional().describe("Unique line anchor marking the beginning of the block (MOVE, COPY, CUT, DELETE)."),
    endMarker: tool.schema.string().optional().describe("Unique line anchor marking the end of the block (MOVE, COPY, CUT, DELETE)."),
    targetMarker: tool.schema.string().optional().describe("Unique line anchor in dstFile where the block should be inserted. If omitted in MOVE or PASTE, appends to EOF."),
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
        let dstLines: string[] = [];
        if (fs.existsSync(dstPath)) {
          dstLines = fs.readFileSync(dstPath, "utf-8").split(/\r?\n/);
        } else {
          fs.mkdirSync(path.dirname(dstPath), { recursive: true });
        }

        let insertIdx = dstLines.length;
        if (args.targetMarker) {
          const foundIdx = dstLines.findIndex(line => line.includes(args.targetMarker));
          if (foundIdx !== -1) insertIdx = foundIdx + 1;
        }

        dstLines.splice(insertIdx, 0, ...buffer);
        fs.writeFileSync(dstPath, dstLines.join("\n"), "utf-8");

        return `Pasted ${buffer.length} lines from buffer '${bufferKey}' into '${args.dstFile}'.`;
      }

      // 3. ANCHOR EXTRACTION (MOVE, COPY, CUT, DELETE)
      if (!args.srcFile || !args.startMarker || !args.endMarker) {
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

      const srcRaw = fs.readFileSync(srcPath, "utf-8");
      const srcLines = srcRaw.split(/\r?\n/);

      const startIdx = srcLines.findIndex(line => line.includes(args.startMarker));
      if (startIdx === -1) return `Error: Start marker '${args.startMarker}' not found in ${args.srcFile}.`;

      const relativeEndIdx = srcLines.slice(startIdx).findIndex(line => line.includes(args.endMarker));
      if (relativeEndIdx === -1) return `Error: End marker '${args.endMarker}' not found after start marker.`;
      const endIdx = startIdx + relativeEndIdx;

      const extractedBlock = srcLines.slice(startIdx, endIdx + 1);

      // Save to named clipboard buffer for COPY or CUT
      if (mode === "COPY" || mode === "CUT") {
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
      if (mode === "COPY") {
        return `Copied ${extractedBlock.length} lines from '${args.srcFile}' into buffer '${bufferKey}'.`;
      }
      if (mode === "CUT") {
        return `Cut ${extractedBlock.length} lines from '${args.srcFile}' into buffer '${bufferKey}'.`;
      }

      // 4. IMMEDIATE MOVE (CUT + PASTE IN ONE STEP)
      if (mode === "MOVE") {
        if (!args.dstFile) return "Error: 'dstFile' is required for MOVE mode.";
        const dstPath = path.resolve(cwd, args.dstFile);
        let dstLines: string[] = [];
        if (fs.existsSync(dstPath)) {
          dstLines = fs.readFileSync(dstPath, "utf-8").split(/\r?\n/);
        } else {
          fs.mkdirSync(path.dirname(dstPath), { recursive: true });
        }

        let insertIdx = dstLines.length;
        if (args.targetMarker) {
          const foundIdx = dstLines.findIndex(line => line.includes(args.targetMarker));
          if (foundIdx !== -1) insertIdx = foundIdx + 1;
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
