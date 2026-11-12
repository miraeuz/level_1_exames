# Builds the answer key for the 241-question set. Computable questions (number systems, Excel formulas,
# floor/ceil/round, small algorithms) are SOLVED by code; conceptual ones use the manual key below.
# Fails if a question has zero or more than one correct option.
import json, re, math
from fractions import Fraction

Q = json.load(open("parsed.json", encoding="utf8"))
SUB = str.maketrans("₀₁₂₃₄₅₆₇₈₉", "0123456789")
SUP = str.maketrans("0123456789", "⁰¹²³⁴⁵⁶⁷⁸⁹")
issues = []

def num_in(s, base):
    s = s.strip()
    if not s or any(int(c) >= base for c in s if c.isdigit()) or not s.isdigit(): return None
    return int(s, base)

def term(t, default_base=None):
    t = t.strip().replace("−", "-")
    m = re.fullmatch(r"(-?[0-9]+)([₀-₉]+)?", t)
    if not m: return None
    b = int(m.group(2).translate(SUB)) if m.group(2) else default_base
    if b is None: return None
    neg = m.group(1).startswith("-")
    v = num_in(m.group(1).lstrip("-"), b)
    return None if v is None else (-v if neg else v)

def expand(t):
    m = re.fullmatch(r"([0-9]+)([₀-₉]+)", t.strip())
    d, b = m.group(1), m.group(2).translate(SUB)
    if b == "10": return f"{d}"
    parts = [f"{c}·{b}{str(len(d)-1-i).translate(SUP)}" for i, c in enumerate(d)]
    return f"{t.strip()} = " + " + ".join(parts) + f" = {int(d, int(b))}"

def to_base(n, b):
    if n == 0: return "0"
    s = ""
    while n: s = str(n % b) + s; n //= b
    return s

MANUAL = {
 1:("A","Ikkilik sistemada faqat 0 va 1 raqamlari bor."), 2:("C","Uchlik sistemada 0, 1 va 2 raqamlari ishlatiladi (asosdan kichik raqamlar)."),
 3:("D","Oʻnlik sistemada 10 ta raqam bor (0–9), asosi 10."), 4:("C","Uchlik sistemaning asosi 3."),
 5:("C","213₃ da «3» raqami bor, lekin 3-lik sistemada faqat 0, 1, 2 boʻladi."), 6:("B","1101 faqat 0 va 1 dan iborat; qolganlarida 2 yoki 3 bor."),
 7:("C","Kompyuter maʼlumotlarni ikkilik (0 va 1) koʻrinishda saqlaydi."), 8:("B","Bit 0 yoki 1 — ikkita qiymat."), 9:("C","1 bayt = 8 bit."),
 70:("B","Toʻrt xonali eng katta ikkilik son 1111₂ = 8 + 4 + 2 + 1 = 15."),
 71:("A","CPU buyruqlarni bajaradi va hisoblaydi."), 72:("B","RAM — tezkor, vaqtinchalik xotira; kompyuter oʻchsa tozalanadi."),
 73:("C","Ishlayotgan dasturlar RAM da turadi."), 74:("D","RAM elektr oʻchganda tozalanadi; HDD, SSD, fleshka maʼlumotni saqlab qoladi."),
 75:("C","SSD maʼlumotni doimiy saqlaydi."), 76:("B","GPU (videokarta) tasvir va grafikani qayta ishlaydi."),
 77:("C","Klaviatura orqali maʼlumot kiritiladi."), 78:("B","Monitor natijani koʻrsatadi — chiqarish qurilmasi."),
 79:("B","Printer natijani qogʻozga chiqaradi — chiqarish qurilmasi."), 80:("A","Monitor tasvirni ekranda koʻrsatadi."),
 81:("A","SSD da harakatlanuvchi qism yoʻq, odatda HDD dan ancha tez."), 82:("D","«8 GB RAM» — tezkor xotira hajmi."),
 83:("C","Quvvat bloki barcha qurilmalarni elektr bilan taʼminlaydi."), 84:("A","Xotira va disk hajmi GB (gigabayt) da oʻlchanadi."),
 85:("C","CPU — hisoblash, RAM — vaqtinchalik xotira."),
 86:("B","Excelda formula = belgisi bilan boshlanadi."), 87:("A","Manzil: avval ustun harfi, keyin qator raqami — A1."),
 88:("B","Ustunlar harflar bilan belgilanadi (A, B, C…)."), 89:("C","Qatorlar raqamlar bilan belgilanadi (1, 2, 3…)."),
 90:("D","Koʻpaytirish * belgisi bilan yoziladi."), 91:("A","Boʻlish / belgisi bilan yoziladi."),
 92:("C","A1:B3 — A1 dan B3 gacha boʻlgan toʻrtburchak diapazon."), 93:("C","A1:B3: 2 ta ustun × 3 ta qator = 6 ta katak."),
 94:("D","Filter Data menyusida joylashgan."), 95:("A","Sort ham Data menyusida."), 96:("A","Filter yoqilganda sarlavhalarda ochiluvchi roʻyxat strelkasi paydo boʻladi."),
 97:("B","SUM sonlar yigʻindisini hisoblaydi."), 98:("B","COUNT faqat son yozilgan kataklarni sanaydi."),
 99:("C","COUNTA boʻsh boʻlmagan barcha kataklarni (son ham, matn ham) sanaydi."), 100:("A","AVERAGE — oʻrta arifmetik qiymat."),
 101:("C","MAX eng katta qiymatni topadi."), 102:("B","Formula = bilan boshlanadi: =A1+B1."), 103:("C","$A$1 — ustun ham, qator ham qotirilgan (absolyut manzil)."),
 142:("C","COUNTA boʻsh boʻlmagan kataklarni sanaydi: 4 ta son + 1 ta matn = 5."),
 161:("B","Nisbiy manzillar bir qator pastga surilsa, qator raqamlari 1 ga oshadi: =A2*B2."),
 162:("D","$A$1 oʻzgarmaydi, B1 esa 2 qator pastga surilib B3 boʻladi: =$A$1*B3."),
 163:("C","Matnga son qoʻshib boʻlmaydi — #VALUE! xatosi chiqadi."), 164:("B","Nolga boʻlish — #DIV/0! xatosi."),
 165:("C","Input — foydalanuvchidan qiymat kiritish."), 166:("A","Output — natijani ekranga chiqarish."), 167:("B","Declare — oʻzgaruvchini eʼlon qilish."),
 168:("D","Assign — oʻzgaruvchiga qiymat berish."), 169:("B","If shartni tekshirib, ikki yoʻldan birini tanlaydi."), 170:("A","For — belgilangan marta takrorlash."),
 171:("B","If dan 2 ta yoʻl chiqadi: True va False."), 172:("C","Butun sonlar — Integer."), 173:("D","Matn — String."), 174:("A","Kasr son — Real."),
 175:("B","Input dan oldin oʻzgaruvchi Declare orqali eʼlon qilinishi kerak."), 176:("C","Dastur Main blokidan boshlanadi."),
 177:("A","If — romb shaklida."), 178:("B","Input va Output — parallelogramm."), 179:("C","Qoldiq — mod."), 180:("B","Matnlarni birlashtirish — &."),
 181:("C","a = 4, keyin a = 4 + 3 = 7."), 182:("C","x = 10, y = 20, x = 20 − 5 = 15."), 183:("C","t = 3, a = 8, b = 3. Chiqadi a = 8."),
 184:("C","6 × 6 + 1 = 37."), 185:("B","10 > 10 yolgʻon, False yoʻli: Kichik."), 186:("D","15 mod 2 = 1, shart yolgʻon: Toq."),
 187:("A","9 ≥ 5 va 9 ≤ 9 — ikkalasi rost: Ha."), 188:("C","i = 1, 2, 3, 4, 5 — 5 marta."), 189:("C","0 + 1 + 2 + 3 + 4 = 10."),
 190:("C","1 × 1 × 2 × 3 × 4 = 24."), 191:("C","1 + 3 + 5 + 7 + 9 = 25."), 192:("A","1..10 orasida 3 ga boʻlinadiganlar: 3, 6, 9 — 3 ta."),
 193:("C","i 3 dan 1 gacha kamayadi: 3 2 1."), 194:("B","r Real: 7 / 2 = 3.5."), 195:("C","17 mod 5 = 2, 2 × 3 = 6."), 196:("D","x: 2 → 4 → 16 → 256."),
 197:("A","floor(x) — x dan katta boʻlmagan eng katta butun son (pastga)."), 198:("C","ceil(x) — x dan kichik boʻlmagan eng kichik butun son (yuqoriga)."),
 199:("B","round(x) — x ga eng yaqin butun son."),
 228:("C","3.2 kg uchun ceil(3.2) = 4 ta qop kerak (3 ta qop yetmaydi)."), 229:("B","25 / 2 = 12.5 → ceil = 13 ta parta."),
 230:("B","10 / 3 = 3.33… → floor = 3 ta daftar."), 231:("B","45 / 12 = 3.75 → ceil = 4 ta mikroavtobus."),
 232:("B","48 / 2.5 = 19.2 → floor = 19 ta kitob."), 233:("B","10.5 / 3 = 3.5 → ceil = 4 ta qatnov."),
 239:("D","floor(x) = ceil(x) faqat x butun son boʻlganda: x = 3."),
}

def floor_ceil_round(expr):
    e = expr.replace("−", "-")
    e = re.sub(r"round\(", "rnd(", e)
    def rnd(x): return math.floor(abs(x) + 0.5) * (1 if x >= 0 else -1)
    return eval(e, {"floor": math.floor, "ceil": math.ceil, "rnd": rnd})

# ---------------- Excel ----------------
def parse_table(lines):
    rows = [[c.strip() for c in l.strip().strip("|").split("|")] for l in lines]
    header = rows[0][1:]
    cells = {}
    for r in rows[2:]:
        for col, v in zip(header, r[1:]):
            cells[f"{col}{r[0]}"] = v
    return cells

def cell_val(v):
    if v == "" or v is None: return None
    try: return float(v.replace("−", "-"))
    except ValueError: return v

def excel(formula, cells):
    f = formula.strip().lstrip("=")
    toks = re.findall(r'"[^"]*"|[A-Z]+\d+:[A-Z]+\d+|[A-Z]+\(|[A-Z]+\d+|\d+(?:\.\d+)?|<=|>=|<>|[-+*/();<>=]', f)
    pos = [0]
    def peek(): return toks[pos[0]] if pos[0] < len(toks) else None
    def take(): pos[0] += 1; return toks[pos[0]-1]
    def rng(r):
        a, b = r.split(":")
        c1, r1 = re.match(r"([A-Z]+)(\d+)", a).groups(); c2, r2 = re.match(r"([A-Z]+)(\d+)", b).groups()
        return [cell_val(cells.get(f"{chr(c)}{r}")) for c in range(ord(c1), ord(c2)+1) for r in range(int(r1), int(r2)+1)]
    def args():
        out = []
        while True:
            t = peek()
            if t and re.fullmatch(r"[A-Z]+\d+:[A-Z]+\d+", t): take(); out.append(rng(t))
            else: out.append(cmp())
            if peek() == ";": take(); continue
            assert take() == ")"; return out
    def flat(a): return [x for v in a for x in (v if isinstance(v, list) else [v])]
    def prim():
        t = take()
        if t == "(":
            v = cmp(); assert take() == ")"; return v
        if t == "-": return -prim()
        if t.startswith('"'): return t[1:-1]
        if re.fullmatch(r"\d+(\.\d+)?", t): return float(t)
        if re.fullmatch(r"[A-Z]+\d+", t):
            v = cell_val(cells.get(t)); return 0.0 if v is None else v
        fn = t[:-1]
        if fn == "IF":
            a = args(); return a[1] if a[0] else a[2]
        a = flat(args()); nums = [x for x in a if isinstance(x, float)]
        if fn == "SUM": return sum(nums)
        if fn == "MAX": return max(nums)
        if fn == "MIN": return min(nums)
        if fn == "AVERAGE": return sum(nums) / len(nums)
        if fn == "COUNT": return float(len(nums))
        if fn == "COUNTA": return float(len([x for x in a if x is not None and x != ""]))
        raise ValueError(fn)
    def mul():
        v = prim()
        while peek() in ("*", "/"):
            op = take(); w = prim()
            if isinstance(v, str) or isinstance(w, str): return "#VALUE!"
            v = v * w if op == "*" else ("#DIV/0!" if w == 0 else v / w)
        return v
    def add():
        v = mul()
        while peek() in ("+", "-"):
            op = take(); w = mul()
            if isinstance(v, str) or isinstance(w, str): return "#VALUE!"
            v = v + w if op == "+" else v - w
        return v
    def cmp():
        v = add()
        if peek() in ("<", ">", "=", "<=", ">=", "<>"):
            op = take(); w = add()
            return {"<": v < w, ">": v > w, "=": v == w, "<=": v <= w, ">=": v >= w, "<>": v != w}[op]
        return v
    r = cmp(); assert pos[0] == len(toks), (formula, toks[pos[0]:])
    return r

def fmt(x):
    if isinstance(x, float): return str(int(x)) if x == int(x) else str(round(x, 6))
    return str(x)

def eq_opt(o, v):
    o = o.replace("−", "-").strip()
    if isinstance(v, str): return o == v
    try: return abs(float(o) - v) < 1e-9
    except ValueError: return False

key = {}
for q in Q:
    n, opts, text = q["n"], q["options"], " ".join(q["text"])
    correct, expl = None, None
    sec = q["section"]
    if n in MANUAL:
        letter, expl = MANUAL[n]; correct = [letter]
    elif sec.startswith("I bo"):
        m = re.match(r"^(.*?)\s*=\s*\?([₀-₉]+)$", text)
        if m:
            lhs, tb = m.group(1), int(m.group(2).translate(SUB))
            parts = re.split(r"\s*([+−×:])\s*", lhs)
            vals = [term(p) for p in parts[0::2]]; ops = parts[1::2]
            v = vals[0]
            for op, w in zip(ops, vals[1:]): v = v + w if op == "+" else v - w if op == "−" else v * w if op == "×" else Fraction(v, w)
            correct = ["ABCD"[i] for i, o in enumerate(opts) if term(o, tb) == v]
            terms = [p for p in parts[0::2] if not p.endswith("₁₀")]
            pre = "; ".join(expand(t) for t in terms)
            if len(parts) > 1: pre += ("; " if pre else "") + f"amal natijasi: {v}"
            if tb == 10: expl = pre + f". Javob: {v}."
            else:
                steps, x = [], int(v)
                while x: steps.append(f"{x} : {tb} = {x // tb} (qoldiq {x % tb})"); x //= tb
                expl = (pre + ". " if pre else "") + f"{v} ni {tb} ga ketma-ket boʻlamiz: " + "; ".join(steps) + f". Qoldiqlarni pastdan yuqoriga oʻqiymiz: {to_base(int(v), tb)}{str(tb).translate(str.maketrans('0123456789','₀₁₂₃₄₅₆₇₈₉'))}."
        elif "sonini" in text:
            mm = re.match(r"^(\S+) sonini (\d)-lik", text); v = term(mm.group(1)); tb = int(mm.group(2))
            correct = ["ABCD"[i] for i, o in enumerate(opts) if term(o) == v]
            expl = f"{expand(mm.group(1))}₁₀ = {to_base(v, tb)} ({tb}-lik)."
        elif "qanday yoziladi" in text:
            mm = re.match(r"^(\S+) soni", text); v = term(mm.group(1))
            correct = ["ABCD"[i] for i, o in enumerate(opts) if term(o) == v]
            expl = f"{v} ni yozamiz: " + ", ".join(f"{o} = {term(o)}" for o in opts if term(o) is not None) + "."
        elif "eng katta" in text or "eng kichik" in text:
            vs = [term(o) for o in opts]; t = max(vs) if "eng katta" in text else min(vs)
            correct = ["ABCD"[i] for i, x in enumerate(vs) if x == t]
            expl = "Hammasini 10-likka oʻtkazamiz: " + ", ".join(f"{o} = {x}" for o, x in zip(opts, vs)) + "."
        elif "tenglik" in text:
            ok = []
            for i, o in enumerate(opts):
                a, b = [s.strip() for s in o.split("=")]
                if term(a) == term(b): ok.append("ABCD"[i])
            correct = ok
            expl = "Tekshiramiz: " + ", ".join(f"{o.split('=')[0].strip()} = {term(o.split('=')[0])}" for o in opts) + "."
    elif sec.startswith("III"):
        fm = re.search(r"\*\*(=.*?)\*\*(?=\s|$)", text)
        if fm and q["table"]:
            cells = parse_table(q["table"]); v = excel(fm.group(1), cells)
            correct = ["ABCD"[i] for i, o in enumerate(opts) if eq_opt(o, v)]
            used = sorted(set(re.findall(r"[A-Z]+\d+(?::[A-Z]+\d+)?", fm.group(1))))
            expl = f"Kataklar: " + ", ".join(f"{k} = {cells[k] or 'boʻsh'}" for k in sorted(cells) if any(k == u or (':' in u) for u in used)) + f". {fm.group(1)} → {fmt(v)}."
    elif sec.startswith("V bo"):
        mm = re.match(r"^(.*?)\s*=\s*\?", text)
        if mm and ("floor" in text or "ceil" in text or "round" in text) and "bo‘lsa" not in text.split("=")[0]:
            v = floor_ceil_round(mm.group(1))
            correct = ["ABCD"[i] for i, o in enumerate(opts) if eq_opt(o, v)]
            expl = f"{mm.group(1)} = {fmt(float(v))}. (floor — pastga, ceil — yuqoriga, round — eng yaqin butunga; 0.5 da noldan uzoqqa.)"
        elif "noto‘g‘ri" in text:
            ok = []
            for i, o in enumerate(opts):
                a, b = o.split("=");
                if floor_ceil_round(a) != float(b.replace("−", "-")): ok.append("ABCD"[i])
            correct = ok; expl = "Tekshiramiz: " + "; ".join(f"{o.split('=')[0].strip()} = {floor_ceil_round(o.split('=')[0])}" for o in opts) + "."
        elif text.startswith("floor(x) ="):
            t = float(re.search(r"= (\S+)", text).group(1).replace("−", "-"))
            correct = ["ABCD"[i] for i, o in enumerate(opts) if math.floor(float(o.replace("−", "-"))) == t]
            expl = "Har bir variant uchun floor: " + ", ".join(f"floor({o}) = {math.floor(float(o.replace('−','-')))}" for o in opts) + "."
        elif text.startswith("round(x) ="):
            t = 5
            r = lambda x: math.floor(abs(x) + 0.5) * (1 if x >= 0 else -1)
            correct = ["ABCD"[i] for i, o in enumerate(opts) if r(float(o)) == t]
            expl = "Har bir variant uchun round: " + ", ".join(f"round({o}) = {r(float(o))}" for o in opts) + "."
    if not correct or len(correct) != 1:
        issues.append(f"Savol {n}: toʻgʻri javoblar {correct} — {text[:70]}")
    key[n] = dict(correct=correct[0] if correct and len(correct) == 1 else None, explanation=expl)

for k in key.values():
    if k["explanation"]: k["explanation"] = re.sub(r"(?<![\w])-(\d)", r"−\1", k["explanation"])
json.dump(key, open("key.json", "w"), ensure_ascii=False, indent=1)
TOP = {"I bo": "S1", "II b": "S2", "III ": "S3", "IV b": "S4", "V bo": "S5"}
out = []
for q in Q:
    n = q["n"]; sid = TOP[q["section"][:4]]
    text, code = q["text"], None
    if sid == "S4" and len(text) > 1: text, code = text[:1], text[1:]
    rows = None
    if q["table"]:
        rows = [[c.strip() for c in l.strip().strip("|").split("|")] for l in q["table"]]
        rows = [rows[0]] + rows[2:]
    out.append(dict(n=n, topic=sid, question=" ".join(text), code=code, table=rows, options=q["options"], correct=key[n]["correct"], explanation=key[n]["explanation"]))
json.dump(out, open("../src/it-questions.json", "w"), ensure_ascii=False, indent=1)
from collections import Counter
print("letters:", Counter(v["correct"] for v in key.values()))
print("\n".join(issues) or "OK: har bir savolda aynan bitta toʻgʻri javob")
