# Generates Variant 2 of the 241-question test (same sections, counts and question patterns as
# it-241.md, new numbers and wording). Computable questions are re-solved by solve.py; questions that
# the solver cannot compute carry an embedded key: <!-- key: B | explanation -->.
import random, math

R = random.Random(20261114)
out = []
num = [0]
SUB = str.maketrans("0123456789", "₀₁₂₃₄₅₆₇₈₉")
s = lambda b: str(b).translate(SUB)

def to_base(n, b):
    if n == 0: return "0"
    r = ""
    while n: r = str(n % b) + r; n //= b
    return r

def q(text, options, key=None, expl=None, table=None):
    num[0] += 1
    assert len(options) == 4 and len(set(options)) == 4, (num[0], text, options)
    lines = [f"**Savol {num[0]}.**", text]
    if table:
        lines += [""] + table + [""]
    lines += [f"{'ABCD'[i]}) {o}" for i, o in enumerate(options)]
    if key:
        lines.append(f"<!-- key: {key} | {expl} -->")
    out.append("\n".join(lines) + "\n")

def place(correct, wrong, fixed=None):
    """returns options list with correct at a random position; wrong = candidate distractors"""
    w = []
    for x in wrong:
        if x != correct and x not in w: w.append(x)
    assert len(w) >= 3, (correct, wrong)
    w = w[:3]
    pos = R.randrange(4) if fixed is None else fixed
    opts = w[:pos] + [correct] + w[pos:]
    return opts, "ABCD"[pos]

def section(title):
    out.append(f"---\n\n## {title}\n")

# ======================= I. Sanoq sistemalari (70) =======================
section("I bo‘lim. Sanoq sistemalari")
o, k = place("2-lik", ["3-lik", "8-lik", "10-lik"]); q("Qaysi sanoq sistemasida faqat ikkita raqam ishlatiladi?", o, k, "Ikkilik (2-lik) sistemada faqat 0 va 1 ishlatiladi.")
o, k = place("2", ["3", "1", "9"]); q("Uchlik (3-lik) sanoq sistemasidagi eng katta raqam qaysi?", o, k, "3-lik sistemada 0, 1, 2 raqamlari bor, eng kattasi 2.")
o, k = place("2", ["1", "3", "10"]); q("Ikkilik sanoq sistemasining asosi nechaga teng?", o, k, "Ikkilik sistemaning asosi 2.")
o, k = place("10 ta", ["9 ta", "8 ta", "11 ta"]); q("O‘nlik sanoq sistemasida nechta turli raqam bor?", o, k, "0 dan 9 gacha — 10 ta raqam.")
o, k = place("1201₂", ["1011₂", "1110₂", "1001₂"]); q("Quyidagi yozuvlardan qaysi biri 2-lik sanoq sistemasida noto‘g‘ri yozilgan?", o, k, "1201₂ da «2» raqami bor, 2-lik sistemada faqat 0 va 1 bo‘ladi.")
o, k = place("2120", ["1023", "3012", "1403"]); q("Quyidagi sonlardan qaysi biri 3-lik sanoq sistemasida yozilishi mumkin?", o, k, "2120 faqat 0, 1, 2 dan iborat; qolganlarida 3 yoki 4 bor.")
o, k = place("Bit", ["Bayt", "Kilobayt", "Megabayt"]); q("Axborotning eng kichik o‘lchov birligi qaysi?", o, k, "Eng kichik birlik — bit (0 yoki 1).")
o, k = place("4", ["2", "3", "8"]); q("2 ta bit yordamida nechta turli qiymatni ifodalash mumkin?", o, k, "00, 01, 10, 11 — 4 ta qiymat (2² = 4).")
o, k = place("1024", ["8", "100", "512"]); q("1 kilobayt (KB) necha baytga teng?", o, k, "1 KB = 1024 bayt.")
q("4₁₀ soni ikkilik sanoq sistemasida qanday yoziladi?", place("100₂", ["10₂", "110₂", "11₂"])[0])
q("5₁₀ soni uchlik sanoq sistemasida qanday yoziladi?", place("12₃", ["11₃", "21₃", "20₃"])[0])

def dist_int(v, extra=()):
    c = list(extra) + [v + 1, v - 1, v + 2, v - 2, v * 2, v + 3]
    return [str(x) for x in c if x > 0]

for b in ["1101", "1110", "10001", "10010", "10011", "10100", "10110", "10111", "11000", "11001", "11011", "11100", "11110", "100000", "101010"]:
    v = int(b, 2)
    o, _ = place(str(v), dist_int(v, [int(b[::-1], 2)] if int(b[::-1], 2) != v else []))
    q(f"{b}₂ = ?₁₀", o)

for n in [4, 7, 10, 11, 13, 14, 20, 24]:
    c = to_base(n, 2)
    cand = [to_base(n + d, 2) for d in (1, -1, 2, -2, 4)] + [c[::-1]]
    o, _ = place(c, [x for x in cand if x != c])
    q(f"{n}₁₀ = ?₂", o)

for t in ["101", "110", "111", "112", "121", "122", "200", "201", "202", "210"]:
    v = int(t, 3)
    o, _ = place(str(v), dist_int(v, [int(t, 2)] if set(t) <= {"0", "1"} else []))
    q(f"{t}₃ = ?₁₀", o)

for n in [3, 6, 8, 9, 11, 13]:
    c = to_base(n, 3)
    cand = [to_base(n + d, 3) for d in (1, -1, 2, -2, 3)]
    o, _ = place(c, [x for x in cand if x != c])
    q(f"{n}₁₀ = ?₃", o)

q("111₂ sonini 3-lik sanoq sistemasiga o‘tkazing.", place("21₃", ["12₃", "20₃", "111₃"])[0])
q("12₃ sonini 2-lik sanoq sistemasiga o‘tkazing.", place("101₂", ["110₂", "1100₂", "11₂"])[0])
q("1000₂ sonini 3-lik sanoq sistemasiga o‘tkazing.", place("22₃", ["21₃", "100₃", "202₃"])[0])
q("102₃ sonini 2-lik sanoq sistemasiga o‘tkazing.", place("1011₂", ["1010₂", "1101₂", "102₂"])[0])

q("10₂ + 1₂ = ?₂", place("11", ["10", "100", "12"])[0])
q("11₂ + 1₂ = ?₁₀", place("4", ["3", "12", "5"])[0])
q("101₂ + 11₂ = ?₁₀", place("8", ["7", "112", "9"])[0])
q("110₂ + 1₂ = ?₂", place("111", ["110", "1000", "112"])[0])
q("12₃ + 10₂ = ?₁₀", place("7", ["22", "6", "8"])[0])
q("1100₂ + 21₃ = ?₁₀", place("19", ["17", "33", "20"])[0])
q("1010₂ − 11₂ = ?₁₀", place("7", ["8", "999", "6"])[0])
q("120₃ − 101₂ = ?₁₀", place("10", ["19", "11", "9"])[0])
q("12₃ + 10₁₀ = ?₂", place("1111", ["1110", "10000", "1101"])[0])
q("101₂ × 10₂ = ?₁₀", place("10", ["8", "12", "1010"])[0])
q("11₃ + 110₂ = ?₃", place("101", ["100", "110", "102"])[0])
q("111₂ + 1₂ = ?₂", place("1000", ["1110", "112", "1111"])[0])
q("Quyidagi sonlardan qaysi biri eng katta?", place("112₃", ["1101₂", "12₁₀", "1011₂"])[0])
q("Quyidagi sonlardan qaysi biri eng kichik?", place("111₃", ["1110₂", "15₁₀", "120₃"])[0])
q("Qaysi tenglik to‘g‘ri?", place("111₂ = 7₁₀", ["12₃ = 6₁₀", "1000₂ = 16₁₀", "21₃ = 8₁₀"])[0])
o, k = place("7", ["6", "8", "15"]); q("Uch xonali eng katta ikkilik son 10-lik sistemada nechaga teng?", o, k, "Uch xonali eng katta ikkilik son 111₂ = 4 + 2 + 1 = 7.")

# ======================= II. Kompyuter apparatlari (15) =======================
section("II bo‘lim. Kompyuter apparatlari")
HW = [
 ("Kompyuterning «miyasi» deb qaysi qurilma ataladi?", "Markaziy protsessor (CPU)", ["Monitor", "Klaviatura", "Quvvat bloki"], "CPU barcha buyruqlarni bajaradi, shuning uchun uni kompyuterning «miyasi» deyishadi."),
 ("Quyidagi xotiralardan qaysi biri eng tez ishlaydi?", "RAM", ["HDD", "Fleshka", "DVD disk"], "RAM — tezkor xotira; disklar va fleshkadan ancha tez."),
 ("Elektr o‘chganda ham ma’lumotni saqlab qoladigan qurilma qaysi?", "HDD", ["RAM", "CPU", "GPU"], "HDD ma’lumotni doimiy saqlaydi; RAM esa tozalanadi."),
 ("3D o‘yinlarda tasvir sifatiga eng ko‘p ta’sir qiladigan qurilma qaysi?", "GPU (videokarta)", ["Printer", "Sichqoncha", "Karnay"], "GPU grafik tasvirlarni hisoblaydi."),
 ("Quyidagilardan qaysi biri saqlash qurilmasi?", "SSD", ["Monitor", "Klaviatura", "Karnay"], "SSD fayllarni doimiy saqlaydi."),
 ("Sichqoncha qanday qurilma hisoblanadi?", "Kiritish qurilmasi", ["Chiqarish qurilmasi", "Saqlash qurilmasi", "Hisoblash qurilmasi"], "Sichqoncha orqali kompyuterga buyruq kiritiladi."),
 ("Karnay qanday qurilma hisoblanadi?", "Chiqarish qurilmasi", ["Kiritish qurilmasi", "Saqlash qurilmasi", "Hisoblash qurilmasi"], "Karnay ovozni chiqaradi."),
 ("Skaner nima vazifani bajaradi?", "Qog‘ozdagi tasvirni kompyuterga kiritadi", ["Hujjatni qog‘ozga chop etadi", "Ovozni yozib oladi", "Ma’lumotni doimiy saqlaydi"], "Skaner — kiritish qurilmasi: qog‘ozdagi matn yoki rasmni kompyuterga o‘tkazadi."),
 ("Quyidagilardan qaysi biri chiqarish qurilmasi EMAS?", "Mikrofon", ["Monitor", "Printer", "Karnay"], "Mikrofon ovozni kiritadi — u kiritish qurilmasi."),
 ("Kompyuterning barcha qurilmalarini o‘zaro bog‘laydigan asosiy plata qanday ataladi?", "Ona plata", ["Videokarta", "Quvvat bloki", "Tarmoq kartasi"], "Ona plata (motherboard) CPU, RAM, disklar va boshqa qurilmalarni bog‘laydi."),
 ("HDD ichida ma’lumotlar nimaga yoziladi?", "Aylanuvchi magnit disklarga", ["Mikrosxemalarga, harakatlanuvchi qismsiz", "Protsessor ichiga", "Monitor xotirasiga"], "HDD da aylanuvchi magnit disklar bor; SSD esa mikrosxemalardan iborat."),
 ("Kompyuter tavsifidagi «512 GB SSD» yozuvi nimani bildiradi?", "Doimiy xotira (disk) hajmi 512 GB", ["Tezkor xotira hajmi 512 GB", "Protsessor chastotasi 512 GHz", "Ekran o‘lchami 512 piksel"], "SSD — disk, 512 GB uning hajmi."),
 ("Protsessorning ishlash tezligi (chastotasi) qaysi birlikda o‘lchanadi?", "GHz", ["GB", "Vatt", "Dyuym"], "Chastota gigagersda (GHz) o‘lchanadi."),
 ("Kompyuterda bir vaqtda ko‘p dastur ochilganda sekinlashsa, qaysi qurilmani kattalashtirish ko‘proq yordam beradi?", "RAM", ["Monitor", "Klaviatura", "Karnay"], "Ochiq dasturlar RAM da turadi; RAM ko‘paysa, kompyuter tezroq ishlaydi."),
 ("Qaysi juftlik to‘g‘ri moslashtirilgan?", "GPU — grafika; SSD — doimiy saqlash", ["RAM — doimiy saqlash; CPU — tasvir chiqarish", "Monitor — kiritish; Sichqoncha — chiqarish", "HDD — hisoblash; GPU — ovoz yozish"], "GPU grafikani hisoblaydi, SSD ma’lumotni doimiy saqlaydi."),
]
for t, c, w, e in HW:
    o, k = place(c, w); q(t, o, k, e)

# ======================= III. Excel formulalari (79) =======================
section("III bo‘lim. Excel formulalari")
EXC = [
 ("Excel faylining odatiy kengaytmasi qaysi?", ".xlsx", [".docx", ".pptx", ".txt"], "Excel ish kitobi .xlsx kengaytmasi bilan saqlanadi."),
 ("B3 manzili nimani bildiradi?", "B ustun va 3-qator kesishmasidagi katakni", ["3-ustun va B qatorni", "B ustunini to‘liq", "3-qatorni to‘liq"], "Manzil: avval ustun harfi (B), keyin qator raqami (3)."),
 ("Excelda ustun va qatorning kesishmasi nima deb ataladi?", "Katak", ["Varaq", "Diapazon", "Formula"], "Ustun va qator kesishgan joy — katak (yacheyka)."),
 ("Excelda darajaga ko‘tarish (masalan, 5²) qaysi belgi bilan yoziladi?", "^", ["*", "#", "%"], "Daraja ^ belgisi bilan: =5^2 → 25."),
 ("Formulada qavslar nima uchun ishlatiladi?", "Amallar tartibini o‘zgartirish uchun", ["Matn yozish uchun", "Katakni bo‘yash uchun", "Formulani o‘chirish uchun"], "Qavs ichidagi amal birinchi bajariladi: =(2+3)*4."),
 ("B2:D4 diapazonida nechta katak bor?", "9", ["6", "8", "12"], "B, C, D — 3 ta ustun, 2–4 — 3 ta qator: 3 × 3 = 9."),
 ("A1:A5 yozuvi nimani bildiradi?", "A ustunidagi 1-dan 5-qatorgacha bo‘lgan kataklarni", ["Faqat A1 va A5 kataklarini", "1-qatordagi 5 ta katakni", "A dan E gacha ustunlarni"], "A1:A5 — A1, A2, A3, A4, A5 kataklari."),
 ("SUM, AVERAGE kabi funksiyalar kutubxonasi Excelning qaysi menyusida joylashgan?", "Formulas", ["View", "Review", "Page Layout"], "Funksiyalar kutubxonasi Formulas menyusida."),
 ("Excelda diagramma qo‘shish qaysi menyuda joylashgan?", "Insert", ["Data", "Formulas", "View"], "Diagramma Insert menyusi orqali qo‘shiladi."),
 ("Matnli ustunni «A dan Z gacha» saralash (Sort) nima qiladi?", "Qatorlarni alifbo tartibida joylashtiradi", ["Faqat bo‘sh kataklarni o‘chiradi", "Sonlarni yig‘adi", "Ustun rangini o‘zgartiradi"], "Sort A→Z matnlarni alifbo tartibida joylaydi."),
 ("MIN funksiyasi nimani topadi?", "Eng kichik qiymatni", ["Eng katta qiymatni", "Yig‘indini", "Kataklar sonini"], "MIN — eng kichik qiymat."),
 ("COUNT va COUNTA farqi qaysi javobda to‘g‘ri?", "COUNT faqat sonlarni, COUNTA bo‘sh bo‘lmagan barcha kataklarni sanaydi", ["COUNT matnlarni, COUNTA sonlarni sanaydi", "Ikkalasi ham faqat bo‘sh kataklarni sanaydi", "Ular o‘rtasida farq yo‘q"], "COUNT — faqat son, COUNTA — son ham, matn ham (bo‘sh bo‘lmasa)."),
 ("=SUM(A1:A3) va =A1+A2+A3 formulalari haqida qaysi gap to‘g‘ri? (A1:A3 da sonlar bor)", "Ikkalasi bir xil natija beradi", ["Birinchisi xato beradi", "Ikkinchisi faqat A1 ni qo‘shadi", "Birinchisi o‘rtachani topadi"], "Ikkalasi ham uchta katakdagi sonlarni qo‘shadi."),
 ("IF funksiyasi nechta argument oladi?", "3 ta: shart; rost bo‘lsa qiymat; yolg‘on bo‘lsa qiymat", ["1 ta: faqat shart", "2 ta: shart va natija", "4 ta"], "=IF(shart; rost bo‘lsa; yolg‘on bo‘lsa)."),
 ("Katakda sonning o‘rniga «#####» belgilari chiqdi. Sababi nima?", "Ustun eni son sig‘ishi uchun tor", ["Formula noto‘g‘ri yozilgan", "Nolga bo‘lingan", "Katak bo‘sh"], "Son ustunga sig‘masa, #### ko‘rinadi; ustunni kengaytirish kerak."),
 ("B1 katakka =A1 formulasi yozildi. U nima qiladi?", "A1 katakdagi qiymatni B1 da ko‘rsatadi", ["A1 ni o‘chiradi", "A1 ga 1 qo‘shadi", "Xato beradi"], "=A1 — A1 dagi qiymatni ko‘rsatadi."),
 ("Qaysi formula noto‘g‘ri yozilgan?", "SUM(A1:A3)", ["=SUM(A1:A3)", "=A1*2", "=MAX(B1:B4)"], "Formula = belgisi bilan boshlanishi kerak; SUM(A1:A3) — oddiy matn bo‘lib qoladi."),
 ("A$1 manzili nimani bildiradi?", "Faqat qator (1) qotirilgan", ["Faqat ustun (A) qotirilgan", "Ustun ham, qator ham qotirilgan", "Hech narsa qotirilmagan"], "$ qator raqami oldida — faqat qator qotirilgan."),
]
for t, c, w, e in EXC:
    o, k = place(c, w); q(t, o, k, e)

COLS = "ABC"
def tbl(cols, rows, data):
    lines = ["|   | " + " | ".join(cols) + " |", "|---" * (len(cols) + 1) + "|"]
    for r in range(rows):
        lines.append(f"| {r+1} | " + " | ".join(str(data.get(f"{c}{r+1}", "")).replace("-", "−") for c in cols) + " |")
    return lines

def fv(x):
    return (str(int(x)) if float(x) == int(x) else str(x)).replace("-", "−")

def numq(formula, cols, rows, data, val, wrong, note=""):
    o, _ = place(fv(val), [fv(w) for w in wrong if w is not None and fv(w) != fv(val)])
    q(f"**{formula}** natijasi nechaga teng?{note}", o, table=tbl(cols, rows, data))

def txtq(formula, cols, rows, data, val, wrong, note=""):
    o, _ = place(val, wrong)
    q(f"**{formula}** natijasi nima?{note}", o, table=tbl(cols, rows, data))

# simple arithmetic (17)
numq("=A1+A2", "A", 2, {"A1": 6, "A2": 8}, 14, [48, 2, 68])
numq("=A1+B1", "AB", 1, {"A1": 9, "B1": 4}, 13, [5, 36, 94])
numq("=A1-B1", "AB", 1, {"A1": 25, "B1": 9}, 16, [34, -16, 225])
numq("=B1-A1", "AB", 1, {"A1": 7, "B1": 15}, 8, [22, -8, 105])
numq("=A1*B1", "AB", 1, {"A1": 8, "B1": 4}, 32, [12, 2, 84])
numq("=A1/B1", "AB", 1, {"A1": 24, "B1": 6}, 4, [18, 30, 144])
numq("=A1*3", "A", 1, {"A1": 7}, 21, [10, 73, 4])
numq("=A1+B1+C1", "ABC", 1, {"A1": 3, "B1": 6, "C1": 5}, 14, [9, 11, 90])
numq("=A2*B1", "AB", 2, {"A1": 2, "B1": 7, "A2": 4, "B2": 3}, 28, [12, 14, 21])
numq("=B2/A1", "AB", 2, {"A1": 5, "B1": 2, "A2": 3, "B2": 30}, 6, [15, 10, 2.5])
numq("=A1+B1*C1", "ABC", 1, {"A1": 3, "B1": 2, "C1": 5}, 13, [25, 10, 30])
numq("=(A1+B1)*C1", "ABC", 1, {"A1": 4, "B1": 2, "C1": 3}, 18, [10, 9, 24])
numq("=A1-B1/C1", "ABC", 1, {"A1": 20, "B1": 8, "C1": 4}, 18, [3, 12, 16])
numq("=A2+B2*3", "AB", 2, {"A1": 2, "B1": 6, "A2": 5, "B2": 2}, 11, [21, 15, 10])
numq("=A1*A1+B1", "AB", 1, {"A1": 3, "B1": 4}, 13, [21, 10, 49])
numq("=C1-A2+B2", "ABC", 2, {"A1": 4, "B1": 1, "C1": 30, "A2": 8, "B2": 3, "C2": 6}, 25, [19, 35, 26])
numq("=A1/B1-C1", "ABC", 1, {"A1": 28, "B1": 4, "C1": 2}, 5, [14, 9, 3.5])
# SUM / MAX / MIN / AVERAGE (16)
numq("=SUM(A1:A3)", "A", 3, {"A1": 5, "A2": 8, "A3": 12}, 25, [3, 20, 12])
numq("=SUM(A1:B2)", "AB", 2, {"A1": 2, "B1": 3, "A2": 5, "B2": 6}, 16, [5, 11, 4])
numq("=MAX(A1:A3)", "A", 3, {"A1": 4, "A2": 11, "A3": 7}, 11, [4, 7, 22])
numq("=MIN(A1:A3)", "A", 3, {"A1": 9, "A2": 6, "A3": 8}, 6, [9, 8, 23])
numq("=MAX(A1:A4)", "A", 4, {"A1": 13, "A2": 6, "A3": 17, "A4": 2}, 17, [13, 2, 38])
numq("=MIN(B1:B4)", "B", 4, {"B1": 12, "B2": 7, "B3": 20, "B4": 9}, 7, [9, 12, 20])
numq("=AVERAGE(A1:A2)", "A", 2, {"A1": 6, "A2": 12}, 9, [18, 6, 12])
numq("=AVERAGE(A1:A3)", "A", 3, {"A1": 4, "A2": 10, "A3": 13}, 9, [27, 10, 13])
numq("=AVERAGE(A1:A4)", "A", 4, {"A1": 2, "A2": 4, "A3": 6, "A4": 8}, 5, [20, 4, 6])
numq("=MAX(A1:B2)", "AB", 2, {"A1": 9, "B1": 3, "A2": 5, "B2": 14}, 14, [9, 23, 31])
numq("=MIN(A1:B2)", "AB", 2, {"A1": 4, "B1": -3, "A2": 1, "B2": 7}, -3, [1, 4, 3])
numq("=AVERAGE(A1:B2)", "AB", 2, {"A1": 3, "B1": 5, "A2": 7, "B2": 9}, 6, [24, 12, 8])
numq("=MAX(A1:A4)-MIN(A1:A4)", "A", 4, {"A1": 10, "A2": 4, "A3": 18, "A4": 7}, 14, [4, 18, 8])
numq("=MAX(A1:A3)+MIN(B1:B3)", "AB", 3, {"A1": 6, "B1": 8, "A2": 12, "B2": 3, "A3": 5, "B3": 10}, 15, [9, 22, 20])
numq("=AVERAGE(A1:A2)*B1", "AB", 2, {"A1": 6, "B1": 4, "A2": 10}, 32, [40, 20, 16])
numq("=MAX(A1:A3)/MIN(A1:A3)", "A", 3, {"A1": 6, "A2": 24, "A3": 8}, 4, [3, 18, 30])
# COUNT / COUNTA (5)
numq("=COUNT(A1:A4)", "A", 4, {"A1": 3, "A2": 8, "A3": 1, "A4": 6}, 4, [18, 1, 3])
numq("=COUNT(A1:A5)", "A", 5, {"A1": 5, "A2": "nok", "A3": "", "A4": 9, "A5": 2}, 3, [4, 5, 2], " (A3 katak bo‘sh)")
numq("=COUNTA(A1:A5)", "A", 5, {"A1": "Olim", "A2": 4, "A3": "Zarina", "A4": "", "A5": 7}, 4, [2, 5, 3], " (A4 katak bo‘sh)")
numq("=COUNT(A1:B3)", "AB", 3, {"A1": 6, "B1": "", "A2": "y", "B2": 5, "A3": 3, "B3": "5 dona"}, 3, [4, 5, 6], " (B1 katak bo‘sh, B3 katakda «5 dona» matni yozilgan)")
numq("=COUNTA(A1:A4)-COUNT(A1:A4)", "A", 4, {"A1": "bor", "A2": 7, "A3": 2, "A4": ""}, 1, [2, 3, 0], " (A4 katak bo‘sh)")
o, k = place("4", ["2", "5", "6"]); q("A1:A6 diapazonida 2 ta son, 2 ta matn bor va 2 ta katak bo‘sh. **=COUNTA(A1:A6)** natijasi nechaga teng?", o, k, "COUNTA bo‘sh bo‘lmagan kataklarni sanaydi: 2 ta son + 2 ta matn = 4.")
# IF (11)
txtq('=IF(A1>0; "Musbat"; "Musbat emas")', "A", 1, {"A1": -4}, "Musbat emas", ["Musbat", "-4", "0"])
txtq('=IF(A1>=18; "Katta"; "Kichik")', "A", 1, {"A1": 18}, "Katta", ["Kichik", "18", "Xato"])
txtq('=IF(A1<60; "Qayta"; "O‘tdi")', "A", 1, {"A1": 72}, "O‘tdi", ["Qayta", "72", "60"])
txtq('=IF(A1<>B1; "Farqli"; "Bir xil")', "AB", 1, {"A1": 5, "B1": 5}, "Bir xil", ["Farqli", "10", "5"])
numq("=IF(A1<B1; A1*3; B1)", "AB", 1, {"A1": 4, "B1": 10}, 12, [10, 4, 30])
numq("=IF(A1>B1; A1-B1; B1-A1)", "AB", 1, {"A1": 6, "B1": 15}, 9, [-9, 21, 6])
numq("=IF(A1<0; A1*B1; A1+B1)", "AB", 1, {"A1": 5, "B1": 3}, 8, [15, 2, 5])
txtq('=IF(A1<50; "Past"; IF(A1<80; "O‘rta"; "Yuqori"))', "A", 1, {"A1": 50}, "O‘rta", ["Past", "Yuqori", "50"])
txtq('=IF(MIN(A1:A3)<5; "Bor"; "Yo‘q")', "A", 3, {"A1": 8, "A2": 5, "A3": 12}, "Yo‘q", ["Bor", "5", "25"])
txtq('=IF(SUM(A1:A3)>=20; "Yetadi"; "Yetmaydi")', "A", 3, {"A1": 7, "A2": 6, "A3": 7}, "Yetadi", ["Yetmaydi", "20", "7"])
txtq('=IF(COUNTA(A1:A3)=3; "To‘la"; "Bo‘sh joy bor")', "A", 3, {"A1": "Ali", "A2": "", "A3": 4}, "Bo‘sh joy bor", ["To‘la", "2", "3"], " (A2 katak bo‘sh)")
# nested (7)
numq("=AVERAGE(MAX(A1:A3); MIN(B1:B3))", "AB", 3, {"A1": 4, "B1": 6, "A2": 9, "B2": 3, "A3": 7, "B3": 8}, 6, [5, 7, 12])
numq("=MAX(A1:A3)*MIN(B1:B2)", "AB", 3, {"A1": 3, "B1": 5, "A2": 8, "B2": 2, "A3": 6}, 16, [40, 6, 24])
numq("=MIN(MAX(A1:A2); MAX(B1:B2))", "AB", 2, {"A1": 7, "B1": 4, "A2": 3, "B2": 9}, 7, [9, 3, 4])
numq("=MAX(MIN(A1:A3); 6)", "A", 3, {"A1": 9, "A2": 4, "A3": 12}, 6, [4, 9, 12])
numq("=SUM(A1:A3)-COUNT(B1:B3)", "AB", 3, {"A1": 5, "B1": 2, "A2": 3, "B2": "z", "A3": 4, "B3": 1}, 10, [9, 12, 11])
numq("=IF(AVERAGE(A1:A3)>5; MAX(A1:A3); MIN(A1:A3))", "A", 3, {"A1": 2, "A2": 7, "A3": 9}, 9, [2, 6, 18])
numq("=MIN(A1:A3)+MAX(A1:A3)*2", "A", 3, {"A1": 6, "A2": 3, "A3": 5}, 15, [18, 12, 9])

EX2 = [
 ("C1 katakdagi **=A1+B1** formulasi D1 katakka (bitta o‘ngga) nusxalansa, D1 da qanday formula hosil bo‘ladi?", "=B1+C1", ["=A1+B1", "=A2+B2", "=B2+C2"], "Bir ustun o‘ngga surilganda ustun harflari ham bittaga suriladi: A→B, B→C."),
 ("C1 katakdagi **=A$1*B1** formulasi C3 katakka nusxalansa, C3 da qanday formula hosil bo‘ladi?", "=A$1*B3", ["=A$3*B3", "=A$1*B1", "=A3*B3"], "A$1 da qator qotirilgan — o‘zgarmaydi; B1 ikki qator pastga surilib B3 bo‘ladi."),
 ("A1 katakda 12 soni bor, B1 katak bo‘sh. **=A1/B1** formulasi qanday natija beradi?", "#DIV/0!", ["12", "0", "#VALUE!"], "Bo‘sh katak 0 deb olinadi, nolga bo‘lish — #DIV/0!."),
 ("A1 = 5, A2 katakda «abc» matni, A3 = 7. **=SUM(A1:A3)** natijasi nima?", "12", ["#VALUE!", "5", "0"], "SUM matnli kataklarni hisobga olmaydi: 5 + 7 = 12."),
]
for t, c, w, e in EX2:
    o, k = place(c, w); q(t, o, k, e)

# ======================= IV. Flowgorithm (32) =======================
section("IV bo‘lim. Flowgorithm")
FG = [
 ("Flowgorithmda dastur qaysi blok bilan tugaydi?", "End", ["Main", "Output", "Stop"], "Dastur Main bilan boshlanib, End bilan tugaydi."),
 ("Flowgorithmda dasturga izoh yozish uchun qaysi element ishlatiladi?", "Comment", ["Output", "Assign", "Declare"], "Comment — izoh; dastur bajarilishiga ta’sir qilmaydi."),
 ("Boolean turidagi o‘zgaruvchi qanday qiymatlar oladi?", "true yoki false", ["Faqat butun sonlar", "Istalgan matn", "Kasr sonlar"], "Boolean — mantiqiy tur: true yoki false."),
 ("Flowgorithmda For elementi qanday shaklda tasvirlanadi?", "Olti burchak", ["Romb", "Oval", "Parallelogramm"], "For sikli olti burchakli shaklda chiziladi."),
 ("Flowgorithmda Assign elementi qanday shaklda tasvirlanadi?", "To‘g‘ri to‘rtburchak", ["Romb", "Parallelogramm", "Oval"], "Qiymat berish (Assign) to‘g‘ri to‘rtburchakda."),
 ("Declare elementining vazifasi nima?", "O‘zgaruvchining nomi va turini e’lon qilish", ["Ekranga natija chiqarish", "Shartni tekshirish", "Foydalanuvchidan qiymat olish"], "Declare o‘zgaruvchini yaratadi (nom va tur)."),
 ("«a mod 2 = 0» sharti nimani tekshiradi?", "a juft son ekanini", ["a toq son ekanini", "a musbat ekanini", "a 2 dan katta ekanini"], "2 ga bo‘lishdagi qoldiq 0 bo‘lsa, son juft."),
 ("Output elementida matn (masalan, Salom) qanday yoziladi?", "Qo‘shtirnoq ichida: \"Salom\"", ["Qavs ichida: (Salom)", "Hech qanday belgisiz: Salom", "Kvadrat qavsda: [Salom]"], "Matn har doim qo‘shtirnoq ichida yoziladi."),
 ("Flowgorithmda «teng emas» amali qanday yoziladi?", "<>", ["=<", "><", "=!"], "Teng emas: <> (yoki !=)."),
 ("Flowgorithmda 7 / 2 ifodasining natijasi nechaga teng?", "3.5", ["3", "4", "1"], "Flowgorithmda / bo‘lish har doim kasr natija beradi: 3.5."),
 ("Integer turidagi o‘zgaruvchiga 9.8 qiymati yozilsa, unda qanday qiymat saqlanadi?", "9", ["10", "9.8", "Xato"], "Integer kasr qismini tashlab yuboradi: 9.8 → 9."),
 ("For siklidagi «step» (qadam) nimani bildiradi?", "Har takrorda o‘zgaruvchi qanchaga o‘zgarishini", ["Sikl necha marta takrorlanishini", "O‘zgaruvchining turini", "Sikl qachon to‘xtashini"], "step — har aylanishda i ga qo‘shiladigan (yoki ayiriladigan) qiymat."),
 ("If elementining False yo‘li bo‘sh qolishi mumkinmi?", "Ha, unda shart yolg‘on bo‘lsa hech narsa bajarilmaydi", ["Yo‘q, dastur xato beradi", "Yo‘q, ikkala yo‘l ham to‘ldirilishi shart", "Faqat For ichida mumkin"], "False yo‘li bo‘sh bo‘lishi mumkin."),
 ("«and» amali qachon true natija beradi?", "Ikkala shart ham rost bo‘lganda", ["Kamida bittasi rost bo‘lganda", "Ikkalasi ham yolg‘on bo‘lganda", "Har doim"], "and — ikkala shart birga rost bo‘lishi kerak."),
 ("«or» amali qachon true natija beradi?", "Kamida bitta shart rost bo‘lganda", ["Faqat ikkalasi rost bo‘lganda", "Ikkalasi yolg‘on bo‘lganda", "Hech qachon"], "or — kamida bittasi rost bo‘lsa yetarli."),
 ("Flowgorithmda ko‘paytirish amali qaysi belgi bilan yoziladi?", "*", ["x", "·", "&"], "Ko‘paytirish * bilan: a * b."),
]
for t, c, w, e in FG:
    o, k = place(c, w); q(t, o, k, e)

ALG = [
 ("Algoritm natijasida ekranga nima chiqadi?\nDeclare Integer a\nAssign a = 5\nAssign a = a * 2\nOutput a", "10", ["5", "7", "25"], "a = 5, keyin a = 5 × 2 = 10."),
 ("Algoritm natijasida ekranga nima chiqadi?\nDeclare Integer x, y\nAssign x = 3\nAssign y = x + 4\nAssign x = y * 2\nOutput x", "14", ["7", "6", "11"], "y = 3 + 4 = 7, x = 7 × 2 = 14."),
 ("Algoritm natijasida ekranga nima chiqadi?\nDeclare Integer a, b\nAssign a = 6\nAssign b = 2\nAssign a = a + b\nAssign b = a − b\nAssign a = a − b\nOutput a", "2", ["6", "8", "4"], "a = 8, b = 8 − 2 = 6, a = 8 − 6 = 2 (qiymatlar almashdi)."),
 ("Foydalanuvchi 4 sonini kiritdi. Ekranga nima chiqadi?\nDeclare Integer a\nInput a\nOutput a * 3 − 2", "10", ["12", "4", "14"], "4 × 3 − 2 = 10."),
 ("a = 7 bo‘lsa, ekranga nima chiqadi?\nIf a >= 7\n  True: Output \"Katta\"\n  False: Output \"Kichik\"", "Katta", ["Kichik", "7", "Hech narsa chiqmaydi"], "7 ≥ 7 rost → Katta."),
 ("a = 12 bo‘lsa, ekranga nima chiqadi?\nIf a mod 3 = 0\n  True: Output \"Ha\"\n  False: Output \"Yo‘q\"", "Ha", ["Yo‘q", "4", "0"], "12 mod 3 = 0 → Ha."),
 ("a = 4 bo‘lsa, ekranga nima chiqadi?\nIf a > 5 or a < 2\n  True: Output \"Ha\"\n  False: Output \"Yo‘q\"", "Yo‘q", ["Ha", "4", "Xato"], "4 > 5 yolg‘on, 4 < 2 yolg‘on — or ham yolg‘on → Yo‘q."),
 ("Quyidagi siklda Output elementi necha marta bajariladi?\nFor i = 2 to 6\n  Output i", "5", ["4", "6", "2"], "i = 2, 3, 4, 5, 6 — 5 marta."),
 ("Algoritm natijasida ekranga nima chiqadi?\nAssign s = 0\nFor i = 2 to 5\n  Assign s = s + i\nOutput s", "14", ["15", "9", "5"], "2 + 3 + 4 + 5 = 14."),
 ("Algoritm natijasida ekranga nima chiqadi?\nAssign p = 1\nFor i = 1 to 5, qadam 2\n  Assign p = p * i\nOutput p", "15", ["120", "9", "5"], "i = 1, 3, 5: 1 × 1 × 3 × 5 = 15."),
 ("Algoritm natijasida ekranga nima chiqadi?\nAssign s = 0\nFor i = 2 to 10, qadam 2\n  Assign s = s + i\nOutput s", "30", ["55", "20", "25"], "2 + 4 + 6 + 8 + 10 = 30."),
 ("Algoritm natijasida ekranga nima chiqadi?\nAssign k = 0\nFor i = 1 to 12\n  If i mod 4 = 0\n    True: Assign k = k + 1\nOutput k", "3", ["4", "2", "12"], "4, 8, 12 — 3 ta."),
 ("Quyidagi sikl ekranga nimani chiqaradi?\nFor i = 4 dan 2 gacha (kamayish tartibida, qadam 1)\n  Output i", "4 3 2", ["2 3 4", "4 3 2 1", "4"], "i 4 dan 2 gacha kamayadi: 4 3 2."),
 ("Algoritm natijasida ekranga nima chiqadi?\nDeclare Real r\nAssign r = 9 / 4\nOutput r", "2.25", ["2", "2.5", "3"], "r Real: 9 / 4 = 2.25."),
 ("Algoritm natijasida ekranga nima chiqadi?\nDeclare Integer n\nAssign n = 23\nOutput (n mod 6) * 2", "10", ["6", "5", "46"], "23 mod 6 = 5, 5 × 2 = 10."),
 ("Algoritm natijasida ekranga nima chiqadi?\nAssign x = 1\nFor i = 1 to 4\n  Assign x = x * 3\nOutput x", "81", ["12", "27", "64"], "x: 1 → 3 → 9 → 27 → 81."),
]
for t, c, w, e in ALG:
    o, k = place(c, w); q(t, o, k, e)

# ======================= V. Floor, Ceil, Round (45) =======================
section("V bo‘lim. Floor, Ceil, Round")
FC = [
 ("floor(4.8) sonni qaysi tomonga yaxlitlaydi?", "Pastga: 4", ["Yuqoriga: 5", "Eng yaqiniga: 5", "Yaxlitlamaydi: 4.8"], "floor har doim pastga (kichik butunga) yaxlitlaydi: 4."),
 ("ceil(x) sonni qaysi tomonga yaxlitlaydi?", "Yuqoriga (katta yoki teng butun songa)", ["Pastga (kichik butun songa)", "Eng yaqin butun songa", "Nolga qarab"], "ceil — yuqoriga yaxlitlash."),
 ("x butun son bo‘lsa (masalan, 6), qaysi gap to‘g‘ri?", "floor(x), ceil(x) va round(x) uchalasi ham x ga teng", ["Faqat floor(x) = x", "Faqat ceil(x) = x", "round(x) = x + 1"], "Butun sonda yaxlitlash kerak emas: hammasi 6."),
]
for t, c, w, e in FC:
    o, k = place(c, w); q(t, o, k, e)

def rnd(x): return math.floor(abs(x) + 0.5) * (1 if x >= 0 else -1)
def m(x): return f"{x}".replace("-", "−")
NOTE = " (0.5 bo‘lsa, noldan uzoqqa yaxlitlanadi)"
for fn, x in [("floor", 1.5), ("ceil", 1.5), ("floor", 5.6), ("ceil", 5.2), ("floor", 7.3), ("ceil", 7.9), ("floor", 0.8), ("ceil", 0.8),
              ("round", 5.3), ("round", 5.7), ("round", 2.4), ("round", 4.5), ("round", 0.5), ("round", 8.5), ("floor", 9), ("ceil", 4),
              ("floor", 3.01), ("ceil", 6.99), ("round", 9.49), ("floor", -2.5), ("ceil", -2.5), ("ceil", -4.2), ("floor", -4.7),
              ("round", -3.2), ("round", -1.7), ("round", -4.5), ("ceil", -0.9), ("floor", -0.2)]:
    f = {"floor": math.floor, "ceil": math.ceil, "round": rnd}[fn]
    v = f(x)
    cand = [math.floor(x), math.ceil(x), rnd(x), v + 1, v - 1, x if x != int(x) else v + 2, -v if v != 0 else 2]
    opts = []
    for c in cand:
        sc = m(int(c) if float(c) == int(c) else c)
        if sc != m(v) and sc not in opts: opts.append(sc)
    o, _ = place(m(v), opts)
    note = NOTE if fn == "round" and abs(x - int(x)) == 0.5 else ""
    q(f"{fn}({m(x)}) = ?{note}", o)

WORD = [
 ("Devorni bo‘yash uchun 5.4 litr bo‘yoq kerak. Bo‘yoq faqat 1 litrli bankalarda sotiladi. Nechta banka sotib olish kerak?", "6", ["5", "7", "4"], "5 ta banka yetmaydi, ceil(5.4) = 6."),
 ("Sinfda 31 o‘quvchi bor. Har bir stolga 4 kishi o‘tiradi. Kamida nechta stol kerak?", "8", ["7", "9", "31"], "31 / 4 = 7.75 → ceil = 8."),
 ("Sizda 20 ming so‘m bor. Bitta ruchka 6 ming so‘m turadi. Ko‘pi bilan nechta ruchka sotib olish mumkin?", "3", ["4", "2", "14"], "20 / 6 = 3.33… → floor = 3."),
 ("50 yo‘lovchini tashish kerak. Har bir avtobusga 15 kishi sig‘adi. Kamida nechta avtobus kerak?", "4", ["3", "5", "35"], "50 / 15 = 3.33… → ceil = 4."),
 ("Lentaning uzunligi 100 sm. Undan 7 sm lik bo‘laklar kesiladi. Nechta to‘liq bo‘lak chiqadi?", "14", ["15", "13", "93"], "100 / 7 = 14.28… → floor = 14."),
 ("Lift bir martada 400 kg yuk ko‘taradi. 1500 kg yukni ko‘tarish uchun kamida necha marta qatnash kerak?", "4", ["3", "5", "1100"], "1500 / 400 = 3.75 → ceil = 4."),
]
for t, c, w, e in WORD:
    o, k = place(c, w); q(t, o, k, e)

for expr, wrong in [("floor(3.9) + ceil(−2.1)", ["2", "0", "3"]), ("ceil(6.2) − floor(4.9)", ["2", "1", "4"]),
                    ("round(1.5) − round(−1.5)", ["0", "2", "3"]), ("floor(−5.5) + ceil(−5.5)", ["−10", "−12", "0"])]:
    e = expr.replace("−", "-").replace("round", "rnd")
    v = eval(e, {"floor": math.floor, "ceil": math.ceil, "rnd": rnd})
    note = NOTE if "round" in expr else ""
    o, _ = place(m(v), wrong); q(f"{expr} = ?{note}", o)

q("Qaysi tenglik noto‘g‘ri?", place("floor(−2.1) = −2", ["floor(2.9) = 2", "ceil(−2.9) = −2", "ceil(2.1) = 3"])[0])
o, k = place("2.7", ["4", "−2", "0"]); q("x ning qaysi qiymatida ceil(x) − floor(x) = 1 bo‘ladi?", o, k, "Butun sonlarda ceil(x) = floor(x), farq 0. Faqat 2.7 da: ceil = 3, floor = 2, farq 1.")
o, k = place("3.4", ["4.2", "2.9", "5"]); q("ceil(x) = 4 bo‘lsa, x qaysi son bo‘lishi mumkin?", o, k, "ceil(3.4) = 4; ceil(4.2) = 5, ceil(2.9) = 3, ceil(5) = 5.")
q(f"round(x) = −2 bo‘lsa{NOTE[:-1]}), x qaysi son bo‘lishi mumkin?", place("−1.5", ["−2.6", "−1.4", "−2.5"])[0])

assert num[0] == 241, num[0]
open("it-241-v2.md", "w", encoding="utf8").write("# Boshlang‘ich informatika: test savollari (2-variant, 241 ta)\n\n" + "\n".join(out))
print("written", num[0])
