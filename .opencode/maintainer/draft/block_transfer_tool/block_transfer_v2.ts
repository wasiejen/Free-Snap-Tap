import * as fs from "fs";
import * as path from "path";

// Persistent memory cache for named clipboards across tool invocations within the session
const clipboardBuffers: Record<string, string[]> = {};

export default {
  description: "Performs low-token line-range editing operations (MOVE, COPY, CUT, PASTE, DELETE, CLEAR) across files using unique anchor markers and internal named clipboards.",
  parameters: {
    type: "object",
    properties: {
      mode: {
        type: "string",
        enum: ["MOVE", "COPY", "CUT", "PASTE", "DELETE", "CLEAR"],
        description: "Operation mode: MOVE (immediate cut-and-paste), COPY (yank to buffer), CUT (yank to buffer and delete from source), PASTE (write buffer to target), DELETE (cut to null), CLEAR (empty buffer)."
      },
      srcFile: {
        type: "string",
        description: "Source file path. Required for MOVE, COPY, CUT, and DELETE."
      },
      dstFile: {
        type: "string",
        description: "Destination file path. Required for MOVE or PASTE."
      },
      startMarker: {
        type: "string",
        description: "Unique line anchor marking the beginning of the block (MOVE, COPY, CUT, DELETE)."
      },
      endMarker: {
        type: "string",
        description: "Unique line anchor marking the end of the block (MOVE, COPY, CUT, DELETE)."
      },
      targetMarker: {
        type: "string",
        description: "Unique line anchor in dstFile where the block should be inserted. If omitted in MOVE or PASTE, appends to EOF."
      },
      bufferName: {
        type: "string",
        description: "Name of the clipboard buffer (defaults to 'default'). Allows managing multiple clipboards."
      }
    },
    required: ["mode"]
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
};
