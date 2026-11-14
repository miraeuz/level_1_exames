import re, json
import sys
SRC = sys.argv[1] if len(sys.argv) > 1 else "it-241.md"
OUT = sys.argv[2] if len(sys.argv) > 2 else "parsed.json"
src = open(SRC, encoding="utf8").read()
sections = re.split(r"\n## ", src)
qs = []
for sec in sections[1:]:
    title = sec.split("\n",1)[0].strip()
    for m in re.finditer(r"\*\*Savol (\d+)\.\*\*\n(.*?)(?=\n\*\*Savol \d+\.\*\*|\n---|\Z)", sec, re.S):
        n = int(m.group(1)); body = m.group(2).strip("\n").split("\n")
        km = [re.match(r"^<!-- key: ([A-D]) \| (.*) -->$", l) for l in body]
        key = next(((x.group(1), x.group(2)) for x in km if x), None)
        body = [l for l in body if not l.startswith("<!--")]
        opts = [l for l in body if re.match(r"^[A-D]\) ", l)]
        rest = [l for l in body if not re.match(r"^[A-D]\) ", l)]
        table = [l for l in rest if l.startswith("|")]
        text = [l for l in rest if not l.startswith("|") and l.strip()]
        qs.append(dict(n=n, section=title, text=text, table=table, options=[o[3:].strip() for o in opts], key=key))
print(len(qs)); json.dump(qs, open(OUT,"w"), ensure_ascii=False, indent=1)
from collections import Counter; print(Counter(q["section"] for q in qs)); print([q["n"] for q in qs if len(q["options"])!=4])
