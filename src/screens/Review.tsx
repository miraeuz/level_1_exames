import { useState } from "react";
import { examConfig } from "../config/exam.config";
import { useExam } from "../store/exam";
import { questionById } from "../lib/bank";
import { isAnswered } from "../lib/scoring";
import { fmtClock } from "../lib/util";
import { HoldButton, Icon, Logo, ThemeMenu } from "../components/ui";

export default function Review() {
  const a = useExam((s) => s.attempt)!;
  const reopen = useExam((s) => s.reopenPart);
  const beginJudging = useExam((s) => s.beginJudging);
  const [ok, setOk] = useState(false);

  return (
    <div className="min-h-dvh">
      <header className="glass safe-t sticky top-0 z-30">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Logo className="h-8 w-8" />
            <span className="font-semibold">Yakuniy koʻrib chiqish</span>
          </div>
          <ThemeMenu />
        </div>
      </header>
      <main className="mx-auto max-w-3xl space-y-4 px-4 py-8">
        <p className="text-muted">Barcha qismlar topshirildi. Vaqti qolgan qismga qaytib, javoblarni tekshirishingiz mumkin.</p>
        {examConfig.parts.map((pc, i) => {
          const ps = a.parts[i];
          const done = (x: number) => (pc.kind === "questions" ? isAnswered(questionById.get(x)!, a.answers[x]) : !!a.uploads[x]);
          const un = ps.items.map((x, j) => ({ x, j })).filter(({ x }) => !done(x));
          const mk = ps.items.map((x, j) => ({ x, j })).filter(({ x }) => ps.marked.includes(x));
          const canReturn = examConfig.allowReturnToSubmittedParts && ps.remainingMs > 1000;
          return (
            <div key={pc.id} className="card anim-enter p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="font-bold">
                    {pc.title} {!pc.counted && <span className="chip ml-1 border-warning/50 text-warning">bonus</span>}
                  </div>
                  <div className="text-sm text-muted">
                    {ps.items.length - un.length}/{ps.items.length} {pc.kind === "questions" ? "javob berilgan" : "fayl yuklangan"}
                    {ps.autoSubmitted && " · vaqt tugab avtomatik topshirilgan"}
                  </div>
                </div>
                {canReturn ? (
                  <button className="btn-ghost btn-sm" onClick={() => reopen(i)}>
                    <Icon name="left" className="h-4 w-4" /> Qaytish · {fmtClock(ps.remainingMs)}
                  </button>
                ) : (
                  <span className="chip">vaqt qolmagan</span>
                )}
              </div>
              {(un.length > 0 || mk.length > 0) && (
                <div className="mt-3 space-y-1.5 text-sm">
                  {un.length > 0 && (
                    <div>
                      <span className="text-danger">Javobsiz:</span> <span className="font-mono">{un.map(({ j }) => j + 1).join(", ")}</span>
                    </div>
                  )}
                  {mk.length > 0 && (
                    <div>
                      <span className="text-warning">Belgilangan:</span> <span className="font-mono">{mk.map(({ j }) => j + 1).join(", ")}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
        <div className="card p-5">
          <label className="flex cursor-pointer items-start gap-3 text-sm">
            <input type="checkbox" className="mt-0.5 h-5 w-5 accent-[hsl(var(--primary))]" checked={ok} onChange={(e) => setOk(e.target.checked)} />
            <span>Barcha javoblarimni tekshirdim. Yakuniy topshirishdan keyin javoblarni oʻzgartirib boʻlmasligini tushunaman.</span>
          </label>
          <div className="mt-4">
            <HoldButton disabled={!ok} onDone={() => beginJudging()}>
              <Icon name="send" className="h-5 w-5" /> Bosib turing — yakuniy topshirish
            </HoldButton>
          </div>
        </div>
      </main>
    </div>
  );
}
