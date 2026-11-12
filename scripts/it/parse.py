import re, json
src = open("it-241.md", encoding="utf8").read()
sections = re.split(r"\n## ", src)
qs = []
for sec in sections[1:]:
    title = sec.split("\n",1)[0].strip()
    for m in re.finditer(r"\*\*Savol (\d+)\.\*\*\n(.*?)(?=\n\*\*Savol \d+\.\*\*|\n---|\Z)", sec, re.S):
        n = int(m.group(1)); body = m.group(2).strip("\n").split("\n")
        opts = [l for l in body if re.match(r"^[A-D]\) ", l)]
        rest = [l for l in body if not re.match(r"^[A-D]\) ", l)]
        table = [l for l in rest if l.startswith("|")]
        text = [l for l in rest if not l.startswith("|") and l.strip()]
        qs.append(dict(n=n, section=title, text=text, table=table, options=[o[3:].strip() for o in opts]))
print(len(qs)); json.dump(qs, open("parsed.json","w"), ensure_ascii=False, indent=1)
from collections import Counter; print(Counter(q["section"] for q in qs)); print([q["n"] for q in qs if len(q["options"])!=4])
