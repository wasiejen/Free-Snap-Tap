import json, re, sqlite3
con = sqlite3.connect("file:C:/Users/Wasiejen/.local/share/opencode/opencode.db?mode=ro", uri=True)
row = con.execute(
    "select s.model, m.data from message m join session s on s.id=m.session_id "
    "where s.id=(select id from session order by time_updated desc limit 1) "
    "and m.data like '%\"finish\"%' order by m.time_created desc limit 1"
).fetchone()
if row is None:  # newest session still in-flight (no finished message yet) — TODO #21
    # fall back to the latest FINISHED message overall (accepted stale-neighboring call,
    # TODO #18); if none exists at all, print the deterministic empty readout.
    row = con.execute(
        "select s.model, m.data from message m join session s on s.id=m.session_id "
        "where m.data like '%\"finish\"%' order by m.time_created desc limit 1"
    ).fetchone()
model, data = row if row else ("", "{}")
# opencode 1.18.29: session.model is a JSON column ({"id":...}); the old regex matched
# the id inside the raw JSON by accident — parse the id explicitly (TODO #21 note).
try:
    mid = json.loads(model).get("id", "") if isinstance(model, str) and model.startswith("{") else (model or "")
except json.JSONDecodeError:
    mid = model or ""
t = json.loads(data).get("tokens", {})
ctx = t.get("total", 0) - t.get("output", 0)
m = re.search(r"-(\d+(?:\.\d+)?)(K|M)(?![0-9])", mid)
win = int(m.group(1) + ("000" if m.group(2) == "K" else "000000")) if m else 120000
print(f"CTX={ctx} ({ctx*100//win}%) REM={win-ctx}")
