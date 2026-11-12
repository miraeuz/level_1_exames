import { Fragment, useEffect, useMemo, useState } from "react";
import { examConfig } from "../config/exam.config";
import { useExam } from "../store/exam";
import { questionById, problemById, topicName, optText } from "../lib/bank";
import { Icon, Logo, Ring, ThemeMenu, Verdict, Dialog } from "../components/ui";
import { ProgramView } from "../components/Program";
import { RichText, SheetTable, CodeBlock } from "../components/Rich";
import { fmtDateTime, fmtDuration } from "../lib/util";
import { enqueueDelivery, kick } from "../delivery/queue";
import { fileBase } from "../delivery/summary";
import { idb } from "../lib/idb";

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

function Confetti() {
  const pieces = useMemo(
    () =>
      Array.from({ length: 70 }, (_, i) => ({
        left: Math.random() * 100,
        delay: Math.random() * 0.8,
        dur: 2.2 + Math.random() * 1.6,
        color: ["hsl(var(--primary))", "hsl(var(--accent))", "hsl(var(--success))", "hsl(var(--warning))"][i % 4],
        rot: Math.random() * 360,
      })),
    [],
  );
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-40 overflow-hidden motion-reduce:hidden">
      <style>{`@keyframes fall{from{transform:translateY(-10vh) rotate(0)}to{transform:translateY(110vh) rotate(720deg)}}`}</style>
      {pieces.map((p, i) => (
        <span key={i} className="absolute top-0 h-3 w-2 rounded-sm" style={{ left: `${p.left}%`, background: p.color, animation: `fall ${p.dur}s ${p.delay}s ease-in forwards`, transform: `rotate(${p.rot}deg)` }} />
      ))}
    </div>
  );
}

function useCountUp(target: number, ms = 1100) {
  const [v, setV] = useState(0);
  useEffect(() => {
    const t0 = performance.now();
    let raf = 0;
    const step = () => {
      const k = Math.min(1, (performance.now() - t0) / ms);
      setV(target * (1 - Math.pow(1 - k, 3)));
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return v;
}

export default function Results() {
  const a = useExam((s) => s.attempt)!;
  const closeResults = useExam((s) => s.closeResults);
  const r = a.result!;
  const pct = useCountUp(r.percent);
  const [busy, setBusy] = useState<string | null>(null);
  const [leave, setLeave] = useState(false);
  const [openQ, setOpenQ] = useState<number | null>(null);
  const [openP, setOpenP] = useState<number | null>(null);
  const { date, person } = fileBase(a);

  // make sure delivery is queued (also after a reload on this screen)
  useEffect(() => {
    if (a.delivery.status !== "sent") enqueueDelivery(a);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const pdf = async (print = false) => {
    setBusy(print ? "print" : "pdf");
    try {
      const cacheKey = `pdf:${a.id}:${r.computedAt}`;
      let blob = await idb.get<Blob>(cacheKey);
      if (!blob) {
        const { buildPdf } = await import("../pdf/report");
        blob = await buildPdf(a);
        idb.set(cacheKey, blob);
      }
      if (print) {
        const url = URL.createObjectURL(blob);
        const w = window.open(url, "_blank");
        if (!w) download(blob, `${date}_${person}_${examConfig.brand.examName}.pdf`);
      } else download(blob, `${date}_${person}_${examConfig.brand.examName}.pdf`);
    } finally {
      setBusy(null);
    }
  };
  const zip = async () => {
    setBusy("zip");
    try {
      const { buildZip } = await import("../delivery/zip");
      const z = await buildZip(a);
      download(z.blob, z.name);
    } finally {
      setBusy(null);
    }
  };

  const d = a.delivery;
  const delivery =
    d.status === "sent"
      ? { t: "Natija Telegramga yuborildi", cls: "text-success border-success/40 bg-success/10", ic: "check" }
      : d.status === "offline"
        ? { t: "Internet yoʻq — keyinroq avtomatik yuboriladi", cls: "text-warning border-warning/40 bg-warning/10", ic: "wifi" }
        : d.status === "error"
          ? { t: `Yuborilmadi, qayta urinilmoqda… (${d.lastError ?? ""})`, cls: "text-warning border-warning/40 bg-warning/10", ic: "alert" }
          : { t: "Yuborilmoqda…", cls: "text-info border-info/40 bg-info/10", ic: "send" };

  return (
    <div className="min-h-dvh pb-16">
      {r.passed && <Confetti />}
      <header className="glass safe-t sticky top-0 z-30">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3">
            <Logo className="h-8 w-8" />
            <span className="font-semibold">Natijalar</span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeMenu />
            <button className="btn-ghost btn-sm" onClick={() => setLeave(true)}>
              <Icon name="logout" className="h-4 w-4" /> <span className="hidden sm:inline">Bosh sahifa</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-5 px-4 py-6">
        <section className="card anim-enter grid gap-6 p-6 sm:grid-cols-[auto_1fr] sm:p-8">
          <div className="flex justify-center">
            <Ring value={pct / 100} size={9.5} stroke={0.8} color={r.passed ? "hsl(var(--success))" : "hsl(var(--danger))"}>
              <div className="text-3xl font-extrabold tabular-nums">{pct.toFixed(1)}%</div>
              <div className="text-xs text-muted">
                {r.total} / {r.max} ball
              </div>
            </Ring>
          </div>
          <div>
            <div className={`inline-flex rounded-lg px-3 py-1 text-sm font-bold ${r.passed ? "bg-success/15 text-success" : "bg-danger/15 text-danger"}`}>{r.passed ? "Imtihondan oʻtdingiz" : "Imtihondan oʻtmadingiz"}</div>
            <h1 className="mt-2 text-2xl font-extrabold">
              {a.student.lastName} {a.student.firstName}
            </h1>
            <div className="text-muted">
              {a.student.group} · {fmtDateTime(a.finishedAt ?? Date.now())} · Baho: <b className="text-fg">{r.grade}</b>
            </div>
            {r.bonus && (
              <div className="mt-1 text-sm text-warning">
                4-qism (bonus): {r.bonus.score} / {r.bonus.max} — umumiy ballga qoʻshilmagan
              </div>
            )}
            <div className={`mt-4 inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium ${delivery.cls}`} role="status">
              <Icon name={delivery.ic} className="h-4 w-4" /> {delivery.t}
              {(d.status === "error" || d.status === "offline") && (
                <button className="ml-2 underline" onClick={() => kick(0)}>
                  hozir urinish
                </button>
              )}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button className="btn-primary" disabled={!!busy} onClick={() => pdf(false)}>
                <Icon name="download" /> {busy === "pdf" ? "Tayyorlanmoqda…" : "PDF yuklab olish"}
              </button>
              <button className="btn-ghost" disabled={!!busy} onClick={zip}>
                <Icon name="download" /> {busy === "zip" ? "Tayyorlanmoqda…" : "ZIP yuklab olish"}
              </button>
              <button className="btn-ghost" disabled={!!busy} onClick={() => pdf(true)}>
                <Icon name="print" /> Chop etish
              </button>
            </div>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <div className="card p-5">
            <h2 className="mb-3 font-bold">Qismlar boʻyicha</h2>
            <div className="space-y-3">
              {r.parts.map((p) => (
                <div key={p.id}>
                  <div className="flex justify-between text-sm">
                    <span className="font-semibold">
                      {p.title} {!p.counted && <span className="chip ml-1 text-warning">bonus</span>}
                    </span>
                    <span className="tabular-nums">
                      {p.score} / {p.max} · <span className="text-muted">{fmtDuration(p.timeSpentMs)}</span>
                    </span>
                  </div>
                  <Bar v={p.max ? p.score / p.max : 0} />
                </div>
              ))}
            </div>
          </div>
          <div className="card p-5">
            <h2 className="mb-3 font-bold">Mavzular boʻyicha</h2>
            <div className="space-y-3">
              {r.topics.map((t) => (
                <div key={t.id}>
                  <div className="flex justify-between text-sm">
                    <span>{t.name}</span>
                    <span className="tabular-nums">
                      {t.score} / {t.max}
                    </span>
                  </div>
                  <Bar v={t.max ? t.score / t.max : 0} />
                </div>
              ))}
            </div>
          </div>
        </section>

        {examConfig.parts.map((pc, pi) =>
          pc.kind === "questions" ? (
            <section key={pc.id} className="card p-5">
              <h2 className="mb-3 font-bold">{pc.title}: savollar</h2>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(2.6rem,1fr))] gap-1.5">
                {a.parts[pi].items.map((qid, i) => {
                  const qr = r.questions.find((x) => x.questionId === qid && x.part === pc.id);
                  return (
                    <button
                      key={qid}
                      onClick={() => setOpenQ(openQ === qid ? null : qid)}
                      className={`grid h-10 place-items-center rounded-lg border text-sm font-bold ${qr?.correct ? "border-success/40 bg-success/15 text-success" : "border-danger/40 bg-danger/10 text-danger"} ${openQ === qid ? "ring-2 ring-primary" : ""}`}
                      aria-label={`${i + 1}-savol, ${qr?.correct ? "toʻgʻri" : "notoʻgʻri"}`}
                    >
                      {i + 1}
                    </button>
                  );
                })}
              </div>
              {openQ !== null && a.parts[pi].items.includes(openQ) && <QuestionReview qid={openQ} answer={a.answers[openQ]} />}
            </section>
          ) : (
            <section key={pc.id} className="card p-5">
              <h2 className="mb-3 font-bold">
                {pc.title}: masalalar {!pc.counted && <span className="chip ml-1 text-warning">bonus</span>}
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs uppercase text-muted">
                      <th className="py-2 pr-2">#</th>
                      <th className="py-2 pr-2">Masala</th>
                      <th className="py-2 pr-2">Hukm</th>
                      <th className="py-2 pr-2 text-right">Testlar</th>
                      <th className="py-2 text-right">Ball</th>
                    </tr>
                  </thead>
                  <tbody>
                    {a.parts[pi].items.map((pid, i) => {
                      const pr = r.problems.find((x) => x.problemId === pid && x.part === pc.id);
                      const open = openP === pid;
                      return (
                        <Fragment key={pid}>
                          <tr className="cursor-pointer border-b border-border/60 hover:bg-surface2" onClick={() => setOpenP(open ? null : pid)}>
                            <td className="py-2 pr-2 font-mono text-muted">P{String(i + 1).padStart(2, "0")}</td>
                            <td className="py-2 pr-2 font-medium">{problemById.get(pid)?.title}</td>
                            <td className="py-2 pr-2">
                              <Verdict v={pr?.verdict ?? "—"} />
                            </td>
                            <td className="py-2 pr-2 text-right tabular-nums">{pr && pr.verdict !== "—" ? `${pr.passed}/${pr.total}` : "—"}</td>
                            <td className="py-2 text-right font-bold tabular-nums">
                              {pr?.points ?? 0}/{pc.points}
                            </td>
                          </tr>
                          {open && pr && pr.tests.length > 0 && (
                            <tr>
                              <td colSpan={5} className="bg-surface2/60 p-3">
                                <div className="space-y-1.5">
                                  {pr.tests.map((t, k) => (
                                    <div key={k} className="grid gap-2 rounded-lg border border-border bg-surface p-2 text-xs sm:grid-cols-[5rem_1fr_1fr_1fr]">
                                      <div className="flex items-center gap-1.5">
                                        <Verdict v={t.verdict} short /> <span className="text-muted">{t.hidden ? "yashirin" : `misol ${k + 1}`}</span>
                                      </div>
                                      <pre className="overflow-auto font-mono">{t.hidden && examConfig.revealAnswersInResults === false ? "•••" : t.input}</pre>
                                      <pre className="overflow-auto font-mono text-muted">{t.expected ?? (t.verdict === "AC" ? "✓ mos" : "(yashirin)")}</pre>
                                      <pre className="overflow-auto font-mono">{t.error ? `${t.error}\n` : ""}{t.actual}</pre>
                                    </div>
                                  ))}
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          ),
        )}
      </main>

      <Dialog open={leave} onClose={() => setLeave(false)} title="Bosh sahifaga qaytish">
        <p className="text-sm text-muted">Natija saqlanadi — bosh sahifadagi «Soʻnggi natijalar» roʻyxatidan qayta ochish mumkin. {d.status !== "sent" && "Telegramga yuborish fonda davom etadi."}</p>
        <div className="mt-4 flex justify-end gap-2">
          <button className="btn-ghost" onClick={() => setLeave(false)}>
            Qolish
          </button>
          <button className="btn-primary" onClick={closeResults}>
            Bosh sahifa
          </button>
        </div>
      </Dialog>
    </div>
  );
}

function Bar({ v }: { v: number }) {
  return (
    <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-surface2">
      <div className={`h-full rounded-full ${v >= 0.6 ? "bg-success" : v >= 0.4 ? "bg-warning" : "bg-danger"}`} style={{ width: `${Math.round(v * 100)}%`, transition: "width .8s ease" }} />
    </div>
  );
}

function QuestionReview({ qid, answer }: { qid: number; answer: unknown }) {
  const q = questionById.get(qid)!;
  const reveal = examConfig.revealAnswersInResults;
  const show = (x: unknown) => (x === undefined || x === "" || (Array.isArray(x) && !x.length) ? "— javob yoʻq" : q.type === "true_false" ? (x === "True" ? "Toʻgʻri" : "Notoʻgʻri") : Array.isArray(x) ? x.slice().sort().join(", ") : String(x));
  return (
    <div className="anim-enter mt-4 rounded-xl border border-border p-4">
      <div className="text-xs text-muted">{topicName(q.topic)}</div>
      <div className="mt-1 font-semibold">
        <RichText text={q.question} />
      </div>
      {q.table && <SheetTable rows={q.table} />}
      {q.code && <CodeBlock lines={q.code} />}
      {q.program && (
        <div className="mt-3">
          <ProgramView src={q.program} compact />
        </div>
      )}
      {q.options && (
        <ul className="mt-3 space-y-1 text-sm">
          {q.options.map((o, i) => {
            const L = "ABCDE"[i];
            const corr = (Array.isArray(q.correct_answer) ? q.correct_answer : [q.correct_answer]).includes(L);
            const sel = (Array.isArray(answer) ? answer : [answer]).includes(L);
            return (
              <li key={i} className={`rounded-lg border px-3 py-1.5 font-mono ${reveal && corr ? "border-success/40 bg-success/10" : sel ? "border-danger/40 bg-danger/10" : "border-border"}`}>
                <b>{L})</b> {optText(o)} {sel && <span className="font-sans text-xs text-muted">(siz tanlagan)</span>}
              </li>
            );
          })}
        </ul>
      )}
      {!q.options && (
        <div className="mt-3 text-sm">
          Sizning javobingiz: <code className="font-mono">{show(answer)}</code>
          {reveal && (
            <>
              <br />
              Toʻgʻri javob: <code className="font-mono text-success">{Array.isArray(q.correct_answer) ? q.correct_answer.join(" / ") : show(q.correct_answer)}</code>
            </>
          )}
        </div>
      )}
      {reveal && <p className="mt-3 rounded-lg bg-info/10 p-3 text-sm">{q.explanation}</p>}
    </div>
  );
}
