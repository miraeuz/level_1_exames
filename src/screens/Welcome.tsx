import { FormEvent, useMemo, useState } from "react";
import { examConfig } from "../config/exam.config";
import { loadIndex, useExam } from "../store/exam";
import { Icon, Logo, ThemeMenu, Dialog } from "../components/ui";
import { fmtDateTime, uzLetters } from "../lib/util";
import { bank } from "../lib/bank";

export default function Welcome() {
  const start = useExam((s) => s.start);
  const resume = useExam((s) => s.resume);
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [group, setGroup] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmNew, setConfirmNew] = useState(false);
  const index = useMemo(() => loadIndex(), []);
  const unfinished = index.filter((a) => a.phase !== "results" && !a.abandoned);
  const finished = index.filter((a) => a.phase === "results").slice(0, 5);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    const f = uzLetters(first.trim()),
      l = uzLetters(last.trim()),
      g = group.trim();
    if (f.length < 2 || l.length < 2) return setErr("Ism va familiyani toʻliq kiriting.");
    if (!g) return setErr("Guruhni kiriting.");
    if (unfinished.length && !confirmNew) return setConfirmNew(true);
    setBusy(true);
    start({ firstName: f, lastName: l, group: g });
  };

  const totalMin = examConfig.parts.reduce((a, p) => a + p.durationMinutes, 0);

  return (
    <div className="relative min-h-dvh overflow-hidden">
      {/* animated background */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-0">
        <div className="absolute -left-24 -top-24 h-[28rem] w-[28rem] rounded-full bg-primary/20 blur-3xl" style={{ animation: "float 14s ease-in-out infinite" }} />
        <div className="absolute -bottom-32 right-[-6rem] h-[30rem] w-[30rem] rounded-full bg-accent/20 blur-3xl" style={{ animation: "float 18s ease-in-out infinite reverse" }} />
      </div>
      <header className="safe-t relative z-10 mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <div className="flex items-center gap-3">
          <Logo />
          <div>
            <div className="text-sm font-semibold text-muted">{examConfig.brand.academy}</div>
            <div className="font-bold leading-tight">{examConfig.brand.title}</div>
          </div>
        </div>
        <ThemeMenu />
      </header>

      <main className="relative z-10 mx-auto grid max-w-6xl gap-6 px-4 pb-10 sm:px-6 lg:grid-cols-[1.25fr_1fr]">
        <section className="anim-enter">
          <span className="chip mb-3">
            <Icon name="clock" className="h-3.5 w-3.5" /> Jami ~{Math.round(totalMin / 6) / 10} soat · {examConfig.parts.length} qism
          </span>
          <h1 className="text-[clamp(1.8rem,1.3rem+2vw,2.8rem)] font-extrabold leading-tight tracking-tight">
            {examConfig.brand.tagline}: <span className="text-primary">informatika</span>
          </h1>
          <p className="mt-3 max-w-xl text-muted">
            Sanoq sistemalari, kompyuter apparatlari, Excel va floor/ceil/round boʻyicha test savollariga javob bering, amaliy masalalarni esa Flowgorithm dasturida yechib, <span className="font-mono">.fprg</span> faylini yuklang. Natijalar avtomatik
            tekshiriladi.
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {examConfig.parts.map((p, i) => (
              <div key={p.id} className="card p-4" style={{ animationDelay: `${i * 60}ms` }}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-primary">{p.title}</span>
                  <span className="chip">
                    <Icon name="clock" className="h-3.5 w-3.5" />
                    {p.durationMinutes} daq
                  </span>
                </div>
                <div className="mt-1.5 font-semibold">{p.kind === "questions" ? `${p.count} ta test savoli` : `${p.count} ta masala`}</div>
                <div className="mt-0.5 text-sm text-muted">{p.subtitle}</div>
                <div className="mt-2 text-xs text-muted">
                  {p.counted ? `Har biri ${p.points} ball` : "Baholanmaydi (bonus)"}
                </div>
              </div>
            ))}
          </div>

          <details className="card mt-4 p-4 text-sm">
            <summary className="cursor-pointer font-semibold">Imtihon qoidalari</summary>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-muted">
              <li>Har bir qismning oʻz taymeri bor. Vaqt tugasa qism avtomatik topshiriladi.</li>
              <li>Sahifa yopilsa yoki yangilansa, imtihon shu joydan davom etadi — vaqt toʻxtamaydi.</li>
              <li>Amaliy masalalarni Flowgorithm’da yeching va .fprg faylni yuklang. «Sinab koʻrish» faqat namunaviy testlarda ishlaydi; yashirin testlar oxirida tekshiriladi.</li>
              <li>Butun boʻlish uchun natijani Integer oʻzgaruvchiga yozing (masalan, a = n / 10).</li>
              <li>Klaviatura: ← → savollar, A–D / 1–4 javob, M belgilash, N navigator, ? yordam.</li>
            </ul>
          </details>
        </section>

        <section className="anim-enter space-y-4" style={{ animationDelay: "80ms" }}>
          {unfinished.length > 0 && (
            <div className="card border-warning/50 p-5">
              <div className="flex items-center gap-2 font-bold">
                <Icon name="refresh" className="h-5 w-5 text-warning" /> Tugallanmagan imtihon
              </div>
              <p className="mt-1 text-sm text-muted">Javoblaringiz saqlangan. Davom ettiring — savollar oʻsha-oʻsha boʻladi.</p>
              <div className="mt-3 space-y-2">
                {unfinished.map((u) => (
                  <button
                    key={u.id}
                    className="flex w-full items-center justify-between gap-3 rounded-xl border border-border bg-surface2 px-3.5 py-3 text-left hover:border-primary"
                    onClick={async () => {
                      const ok = await resume(u.id);
                      if (!ok) setErr("Bu urinish maʼlumotlari topilmadi.");
                    }}
                  >
                    <span>
                      <span className="block font-semibold">
                        {u.student.lastName} {u.student.firstName} · {u.student.group}
                      </span>
                      <span className="text-xs text-muted">Boshlangan: {fmtDateTime(u.createdAt)}</span>
                    </span>
                    <span className="btn-primary btn-sm">Davom ettirish</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <form onSubmit={submit} className="card p-5 sm:p-6" noValidate>
            <h2 className="text-lg font-bold">Imtihonga kirish</h2>
            <div className="mt-4 grid gap-3">
              <label className="grid gap-1.5 text-sm font-medium">
                Familiya
                <input className="input" value={last} onChange={(e) => setLast(e.target.value)} autoComplete="family-name" placeholder="Karimova" />
              </label>
              <label className="grid gap-1.5 text-sm font-medium">
                Ism
                <input className="input" value={first} onChange={(e) => setFirst(e.target.value)} autoComplete="given-name" placeholder="Malika" />
              </label>
              <label className="grid gap-1.5 text-sm font-medium">
                Guruh
                <input className="input" value={group} onChange={(e) => setGroup(e.target.value)} placeholder="8-A" />
              </label>
            </div>
            {err && <p className="mt-3 text-sm font-medium text-danger">{err}</p>}
            <button type="submit" disabled={busy} className="btn-primary group mt-5 w-full text-base">
              Imtihonni boshlash <Icon name="right" className="h-5 w-5 transition-transform group-hover:translate-x-0.5" />
            </button>
            <p className="mt-3 text-center text-xs text-muted">
              Savollar banki: {bank.questions.length} ta savol, {bank.problems.length} ta masala
            </p>
          </form>

          {finished.length > 0 && (
            <div className="card p-5">
              <div className="mb-2 text-sm font-bold">Soʻnggi natijalar</div>
              <div className="space-y-1.5">
                {finished.map((f) => (
                  <button key={f.id} onClick={() => resume(f.id)} className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-left text-sm hover:bg-surface2">
                    <span>
                      {f.student.lastName} {f.student.firstName} <span className="text-muted">· {fmtDateTime(f.updatedAt)}</span>
                    </span>
                    <span className={`font-bold ${f.passed ? "text-success" : "text-danger"}`}>{f.percent ?? 0}%</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>
      </main>

      <Dialog open={confirmNew} onClose={() => setConfirmNew(false)} title="Yangi imtihon boshlansinmi?">
        <p className="text-sm text-muted">Sizda tugallanmagan imtihon bor. Uni davom ettirishingiz mumkin. Yangisini boshlasangiz, eski urinish «tashlab ketilgan» deb belgilanadi.</p>
        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <button className="btn-ghost" onClick={() => setConfirmNew(false)}>
            Bekor qilish
          </button>
          <button
            className="btn-danger"
            onClick={() => {
              setConfirmNew(false);
              setBusy(true);
              start({ firstName: uzLetters(first.trim()), lastName: uzLetters(last.trim()), group: group.trim() });
            }}
          >
            Yangisini boshlash
          </button>
        </div>
      </Dialog>
    </div>
  );
}
