import json, re, sqlite3
con = sqlite3.connect("file:C:/Users/Wasiejen/.local/share/opencode/opencode.db?mode=ro", uri=True)
row = con.execute(
    "select s.model, m.data from message m join session s on s.id=m.session_id "
    "where s.id=(select id from session order by time_updated desc limit 1) "
    "and m.data like '%\"finish\"%' order by m.time_created desc limit 1"
).fetchone()
model, data = row
t = json.loads(data)["tokens"]
ctx = t.get("total", 0) - t.get("output", 0)
m = re.search(r"-(\d+(?:\.\d+)?)(K|M)(?![0-9])", model)
win = int(m.group(1) + ("000" if m.group(2) == "K" else "000000")) if m else 120000
print(f"CTX={ctx} ({ctx*100//win}%) REM={win-ctx}")
