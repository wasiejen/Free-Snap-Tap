# ready made special file analysing programs that help speed up file analysing by not needing to rewrite every time:

- proposal for different useful tools to analyse big and/or small and/or many and/or folder 
  - ready made scripts that are tested and usage is decumented
  - sitting in agent/scripts folder? usage for agent as meaning of folder hierachy? possible. has nothing to do with tool or plugin scripts.
  - can be in many programming languages
- look in the opencode/Temp folder and analyse the scripts there and collect the ideas in these to find common usage cases


e.g. copied from a planner that looked for documentation very efficiently:

Wrote ~\AppData\Local\Temp\opencode\binwin.cjs
// Window-extractor: find strings in the opencode binary, print a small
// context window around each hit (keeps the agent's context out of the
// 180MB binary swamp).
const fs = require("fs");
const exe = process.argv[2];
const needles = process.argv.slice(3);
const buf = fs.readFileSync(exe);
let out = `scanned ${buf.length} bytes\n`;
for (const n of needles) {
  const nb = Buffer.from(n, "latin1");
  let idx = buf.indexOf(nb, 0), count = 0;
  while (idx !== -1 && count < 3) {
    const start = Math.max(0, idx - 200);
    const end = Math.min(buf.length, idx + nb.length + 250);
    out += `\n--- ${JSON.stringify(n)} hit ${count + 1} @${idx} ---\n`;
    out += buf.toString("latin1", start, end).replace(/[^\x20-\x7e]/g, ".") + "\n";
    count++;
    idx = buf.indexOf(nb, idx + nb.length);
  }
  if (count === 0) out += `\n--- ${JSON.stringify(n)}: NO HITS ---\n`;
}
process.stdout.write(out);


# Wrote ~\AppData\Local\Temp\opencode\binoff.cjs
// Offset-window extractor for the opencode binary.
const fs = require("fs");
const buf = fs.readFileSync(process.argv[2]);
const off = parseInt(process.argv[3], 10);
const before = parseInt(process.argv[4] || "100", 10);
const after = parseInt(process.argv[5] || "1500", 10);
const start = Math.max(0, off - before);
const end = Math.min(buf.length, off + after);
process.stdout.write(buf.toString("latin1", start, end).replace(/[^\x20-\x7e]/g, "."));


# Wrote ~\AppData\Local\Temp\opencode\binhits.cjs
// List ALL hit offsets (+ a tiny 60-char context) for one needle.
const fs = require("fs");
const buf = fs.readFileSync(process.argv[2]);
const nb = Buffer.from(process.argv[3], "latin1");
let idx = buf.indexOf(nb, 0), count = 0;
while (idx !== -1) {
  const start = Math.max(0, idx - 40);
  const end = Math.min(buf.length, idx + nb.length + 60);
  process.stdout.write(`${count} @${idx}: ` + buf.toString("latin1", start, end).replace(/[^\x20-\x7e]/g, ".") + "\n");
  count++;
  if (count > 60) break;
  idx = buf.indexOf(nb, idx + nb.length);
}
process.stdout.write(`TOTAL shown: ${count}\n`);


# Wrote ~\AppData\Local\Temp\opencode\sesinspect.cjs
// Read-only DB inspector for the live-test session (compact_memory debug).
const { DatabaseSync } = require("node:sqlite");
const db = new DatabaseSync("C:/Users/Wasiejen/.local/share/opencode/opencode.db", { readOnly: true });
const cols = db.prepare("PRAGMA table_info(message)").all().map(c => c.name);
console.log("message cols: " + cols.join(","));
const scols = db.prepare("PRAGMA table_info(session)").all().map(c => c.name);
console.log("session cols: " + scols.join(","));
const sid = process.argv[2];
if (!sid) {
  const rows = db.prepare("SELECT id, time_updated FROM session ORDER BY time_updated DESC LIMIT 10").all();
  for (const r of rows) console.log(JSON.stringify(r));
  process.exit(0);
}
const s = db.prepare("SELECT * FROM session WHERE id = ?").get(sid);
if (s) console.log("SESSION: " + JSON.stringify(s).slice(0, 600));
const rows = db.prepare("SELECT * FROM message WHERE session_id = ? ORDER BY rowid ASC").all(sid);
console.log("message count: " + rows.length);
const last = rows.slice(-14);
for (const m of last) {
  const slim = {};
  for (const k of ["id", "role", "time_created", "time_updated", "mode", "summary", "finish", "error"]) if (k in m) slim[k] = m[k];
  console.log(JSON.stringify(slim).slice(0, 500));
}

Wrote ~\AppData\Local\Temp\opencode\sesdata.cjs
// Read-only: message data JSON slim dump for one session.
const { DatabaseSync } = require("node:sqlite");
const db = new DatabaseSync("C:/Users/Wasiejen/.local/share/opencode/opencode.db", { readOnly: true });
const sid = process.argv[2];
const s = db.prepare("SELECT id, time_compacting, time_archived, agent, model, title FROM session WHERE id = ?").get(sid);
console.log("SESSION: " + JSON.stringify(s));
const rows = db.prepare("SELECT id, time_created, data FROM message WHERE session_id = ? ORDER BY time_created ASC, rowid ASC").all(sid);
console.log("message count: " + rows.length);
for (const m of rows) {
  let info = {};
  try { info = JSON.parse(m.data); } catch (e) { info = { parseError: String(e) }; }
  const slim = {};
  for (const k of ["role", "mode", "agent", "summary", "finish", "error", "tokens", "modelID", "providerID"]) if (k in info) slim[k] = info[k];
  if (info.error) slim.error = JSON.stringify(info.error).slice(0, 300);
  console.log(m.time_created + " | " + JSON.stringify(slim).slice(0, 420));
}

# Wrote ~\AppData\Local\Temp\opencode\logctx.cjs
// Read-only: print context around every "schema rejection" line in the opencode log.
const fs = require("fs");
const p = "C:/Users/Wasiejen/.local/share/opencode/log/opencode.log";
const lines = fs.readFileSync(p, "utf8").split(/\r?\n/);
let hits = 0;
for (let i = 0; i < lines.length; i++) {
  if (!lines[i].includes("schema rejection")) continue;
  hits++;
  const lo = Math.max(0, i - 3), hi = Math.min(lines.length - 1, i + 3);
  console.log(`=== WARN at line ${i} (hit ${hits}) ===`);
  for (let j = lo; j <= hi; j++) {
    console.log((j === i ? ">> " : "   ") + lines[j].slice(0, 380));
  }
  console.log("");
}
console.log("total schema-rejection lines: " + hits + " of " + lines.length);
