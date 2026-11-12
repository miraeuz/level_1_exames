import { useState } from "react";
import { examConfig } from "../config/exam.config";
import { useExam } from "../store/exam";
import { Icon, Logo, ThemeMenu } from "../components/ui";
import { fmtClock } from "../lib/util";

export default function Transition() {
  const a = useExam((s) => s.attempt)!;
  const startPart = useExam((s) => s.startPart);
  const reopen = useExam((s) => s.reopenPart);
  const [pressed, setPressed] = useState(false);
  const pc = examConfig.parts[a.current];
  const ps = a.parts[a.current];
  const prev = a.parts.map((p, i) => ({ p, i })).filter(({ p }) => p.status === "submitted");

  return (
    <div className="min-h-dvh">
      <header className="glass safe-t sticky top-0 z-30">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Logo className="h-8 w-8" />
            <span className="font-semibold">
              {a.student.lastName} {a.student.firstName} <span className="text-muted">· {a.student.group}</span>
            </span>
          </div>
          <ThemeMenu />
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
        <div className="mb-6 flex flex-wrap gap-2">
          {examConfig.parts.map((p, i) => (
            <span key={p.id} className={`chip ${i === a.current ? "border-primary bg-primary/10 text-primary" : a.parts[i].status === "submitted" ? "text-success" : ""}`}>
              {a.parts[i].status === "submitted" && <Icon name="check" className="h-3.5 w-3.5" />}
              {p.title}
            </span>
          ))}
        </div>
        <div className="card anim-enter p-6 sm:p-8">
          <div className="text-sm font-bold uppercase tracking-wide text-primary">Keyingi qism</div>
          <h1 className="mt-1 text-3xl font-extrabold">{pc.title}</h1>
          <p className="mt-1 text-muted">{pc.subtitle}</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <Stat label={pc.kind === "questions" ? "Savollar" : "Masalalar"} value={String(ps.items.length)} />
            <Stat label="Vaqt" value={fmtClock(ps.remainingMs)} />
            <Stat label="Ball" value={pc.counted ? `${ps.items.length * pc.points}` : "Bonus"} />
          </div>
          {pc.kind === "problems" && (
            <div className="mt-5 rounded-xl border border-border bg-surface2 p-4 text-sm text-muted">
              Har bir masalani <b className="text-fg">Flowgorithm</b> dasturida yeching, <span className="font-mono">.fprg</span> faylini saqlang va shu yerga yuklang. «Sinab koʻrish» tugmasi
              faylingizni namunaviy testlarda tekshiradi. Yashirin testlar imtihon oxirida ishlaydi.
              {!pc.counted && <div className="mt-2 font-semibold text-warning">Bu qism natijasi umumiy ballga qoʻshilmaydi — oʻzingizni sinab koʻrish uchun.</div>}
            </div>
          )}
          <p className="mt-5 text-sm text-muted">Taymer faqat «Boshlash» tugmasini bosganingizdan keyin ishga tushadi.</p>
          <button
            className="btn-primary mt-4 w-full text-base sm:w-auto sm:px-8"
            disabled={pressed}
            onClick={() => {
              if (pressed) return;
              setPressed(true);
              startPart();
            }}
          >
            Boshlash <Icon name="play" className="h-4 w-4" />
          </button>
        </div>
        {examConfig.allowReturnToSubmittedParts && prev.some(({ p }) => p.remainingMs > 1000) && (
          <div className="mt-6 text-sm text-muted">
            Oldingi qismga qaytish (vaqti qolgan boʻlsa):{" "}
            {prev
              .filter(({ p }) => p.remainingMs > 1000)
              .map(({ i, p }) => (
                <button key={i} className="btn-ghost btn-sm ml-2" onClick={() => reopen(i)}>
                  {examConfig.parts[i].title} · {fmtClock(p.remainingMs)}
                </button>
              ))}
          </div>
        )}
      </main>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface2 p-3">
      <div className="text-xs text-muted">{label}</div>
      <div className="mt-0.5 text-xl font-bold tabular-nums">{value}</div>
    </div>
  );
}
