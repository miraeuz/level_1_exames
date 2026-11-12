import { useCallback, useEffect, useRef, useState } from "react";
import { examConfig } from "../config/exam.config";
import { remainingOf, useExam } from "../store/exam";
import { questionById, problemById } from "../lib/bank";
import { isAnswered } from "../lib/scoring";
import { fmtClock } from "../lib/util";
import { Dialog, Icon, Logo, Ring, ThemeMenu } from "../components/ui";
import QuestionView from "./QuestionView";
import ProblemWorkspace from "./ProblemWorkspace";

export function useNow(ms = 500) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}

export default function Exam() {
  const a = useExam((s) => s.attempt)!;
  const savedAt = useExam((s) => s.savedAt);
  const { goto, submitPart, toggleMark, clearAnswer, answer } = useExam.getState();
  const pc = examConfig.parts[a.current];
  const ps = a.parts[a.current];
  const now = useNow(500);
  const remaining = remainingOf(ps, now);
  const [confirm, setConfirm] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [help, setHelp] = useState(false);
  const autoDone = useRef(false);

  // auto-submit when time runs out
  useEffect(() => {
    if (remaining <= 0 && !autoDone.current) {
      autoDone.current = true;
      submitPart(true);
    }
  }, [remaining, submitPart]);

  const id = ps.items[ps.index];
  const isQ = pc.kind === "questions";
  const done = (x: number) => (isQ ? isAnswered(questionById.get(x)!, a.answers[x]) : !!a.uploads[x]);
  const answeredCount = ps.items.filter(done).length;
  const unanswered = ps.items.map((x, i) => ({ x, i })).filter(({ x }) => !done(x));
  const marked = ps.items.map((x, i) => ({ x, i })).filter(({ x }) => ps.marked.includes(x));

  // focus moves to each new question
  const mainRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    mainRef.current?.focus({ preventScroll: true });
    window.scrollTo({ top: 0 });
  }, [ps.index]);

  const onKey = useCallback(
    (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      if (confirm || e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key;
      if (k === "ArrowRight") goto(ps.index + 1);
      else if (k === "ArrowLeft") goto(ps.index - 1);
      else if (k === "m" || k === "M") toggleMark(id);
      else if (k === "n" || k === "N") setSheet((s) => !s);
      else if (k === "?") setHelp(true);
      else if (k === "Delete" && isQ) clearAnswer(id);
      else if (isQ) {
        const q = questionById.get(id)!;
        if (q.type === "true_false") {
          if (k === "t" || k === "T") answer(id, "True");
          if (k === "f" || k === "F") answer(id, "False");
        } else if (q.type === "single_choice" || q.type === "multiple_choice") {
          const idx = "abcde".indexOf(k.toLowerCase()) >= 0 ? "abcde".indexOf(k.toLowerCase()) : "12345".indexOf(k);
          const order = a.optionOrder[id] ?? q.options!.map((_, i) => i);
          if (idx >= 0 && idx < order.length) {
            const letter = "ABCDE"[order[idx]];
            if (q.type === "single_choice") answer(id, letter);
            else {
              const cur = (a.answers[id] as string[]) ?? [];
              answer(id, cur.includes(letter) ? cur.filter((x) => x !== letter) : [...cur, letter]);
            }
          }
        }
      }
    },
    [a, id, ps.index, isQ, confirm, goto, toggleMark, clearAnswer, answer],
  );
  useEffect(() => {
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onKey]);

  const low = remaining < 5 * 60_000;
  const total = pc.durationMinutes * 60_000;

  return (
    <div className="min-h-dvh pb-24">
      {/* header */}
      <header className="glass safe-t sticky top-0 z-30">
        <div className="mx-auto flex max-w-[110rem] items-center gap-3 px-3 py-2.5 sm:px-5">
          <Logo className="hidden h-9 w-9 sm:grid" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="font-bold">{pc.title}</span>
              {!pc.counted && <span className="chip border-warning/50 text-warning">bonus</span>}
            </div>
            <div className="truncate text-xs text-muted">
              {a.student.lastName} {a.student.firstName} · {a.student.group} · <SaveStatus savedAt={savedAt} />
            </div>
          </div>
          <div className={`flex items-center gap-2 rounded-xl border px-3 py-1.5 font-mono text-lg font-semibold tabular-nums ${low ? "border-danger/50 bg-danger/10 text-danger" : "border-border bg-surface"}`} aria-live="polite" aria-label="Qolgan vaqt">
            <Icon name="clock" className="h-4 w-4" />
            {fmtClock(remaining)}
          </div>
          <Ring value={answeredCount / ps.items.length} size={2.6}>
            <span className="text-[0.7rem] font-bold tabular-nums">
              {answeredCount}/{ps.items.length}
            </span>
          </Ring>
          <button className="btn-ghost btn-sm !px-2.5 lg:hidden" onClick={() => setSheet(true)} aria-label="Savollar xaritasi">
            <Icon name="grid" className="h-[1.15rem] w-[1.15rem]" />
          </button>
          <ThemeMenu />
        </div>
        <div className="h-1 bg-border/60">
          <div className={`h-full ${low ? "bg-danger" : "bg-primary"}`} style={{ width: `${Math.max(0, (remaining / total) * 100)}%`, transition: "width .5s linear" }} />
        </div>
      </header>

      <div className="mx-auto flex max-w-[110rem] gap-5 px-3 pt-4 sm:px-5">
        {/* desktop map */}
        <aside className="sticky top-[5.25rem] hidden h-fit w-[15.5rem] shrink-0 lg:block">
          <QuestionMap a={a} onPick={(i) => goto(i)} done={done} />
          <div className="mt-3 text-xs text-muted">
            Qolgan: <b className="text-fg">{ps.items.length - answeredCount}</b> · Belgilangan: <b className="text-fg">{ps.marked.length}</b>
          </div>
          <button className="mt-2 text-xs text-muted underline-offset-2 hover:underline" onClick={() => setHelp(true)}>
            Klaviatura yorliqlari (?)
          </button>
        </aside>

        <main ref={mainRef} tabIndex={-1} className="min-w-0 flex-1 outline-none" aria-live="polite">
          <div key={id} className="anim-enter">
            {isQ ? <QuestionView qid={id} index={ps.index} total={ps.items.length} /> : <ProblemWorkspace pid={id} index={ps.index} total={ps.items.length} />}
          </div>
        </main>
      </div>

      {/* bottom bar */}
      <nav className="glass safe-b fixed inset-x-0 bottom-0 z-30 border-t">
        <div className="mx-auto flex max-w-[110rem] items-center gap-2 px-3 pt-2.5 sm:px-5">
          <button className="btn-ghost" onClick={() => goto(ps.index - 1)} disabled={ps.index === 0} aria-label="Oldingi">
            <Icon name="left" />
            <span className="hidden sm:inline">Oldingi</span>
          </button>
          <button className={`btn-ghost ${ps.marked.includes(id) ? "!border-warning !text-warning" : ""}`} onClick={() => toggleMark(id)} aria-pressed={ps.marked.includes(id)}>
            <Icon name="flag" />
            <span className="hidden sm:inline">{ps.marked.includes(id) ? "Belgilangan" : "Belgilash"}</span>
          </button>
          {isQ && (
            <button className="btn-ghost" onClick={() => clearAnswer(id)} disabled={!(id in a.answers)}>
              <Icon name="trash" />
              <span className="hidden sm:inline">Tozalash</span>
            </button>
          )}
          <div className="flex-1" />
          <button className="btn-ghost !border-primary/40 !text-primary" onClick={() => setConfirm(true)}>
            <span className="hidden sm:inline">Qismni topshirish</span>
            <span className="sm:hidden">Topshirish</span>
          </button>
          <button className="btn-primary" onClick={() => goto(ps.index + 1)} disabled={ps.index === ps.items.length - 1} aria-label="Keyingi">
            <span className="hidden sm:inline">Keyingi</span>
            <Icon name="right" />
          </button>
        </div>
      </nav>

      {/* mobile bottom sheet */}
      {sheet && <BottomSheet onClose={() => setSheet(false)}><QuestionMap a={a} onPick={(i) => (goto(i), setSheet(false))} done={done} /></BottomSheet>}

      <Dialog open={confirm} onClose={() => setConfirm(false)} title={`${pc.title}ni topshirasizmi?`}>
        <div className="grid grid-cols-3 gap-2 text-center text-sm">
          <Box n={answeredCount} l="Javob berilgan" cls="text-success" />
          <Box n={unanswered.length} l="Javobsiz" cls={unanswered.length ? "text-danger" : ""} />
          <Box n={marked.length} l="Belgilangan" cls={marked.length ? "text-warning" : ""} />
        </div>
        {(unanswered.length > 0 || marked.length > 0) && (
          <div className="mt-3 text-sm">
            {unanswered.length > 0 && <JumpList label="Javobsiz:" items={unanswered} onPick={(i) => (goto(i), setConfirm(false))} />}
            {marked.length > 0 && <JumpList label="Belgilangan:" items={marked} onPick={(i) => (goto(i), setConfirm(false))} />}
          </div>
        )}
        <p className="mt-3 text-sm text-muted">Qolgan vaqt: {fmtClock(remaining)}. {examConfig.allowReturnToSubmittedParts ? "Vaqt qolgan boʻlsa, keyinroq bu qismga qaytishingiz mumkin." : ""}</p>
        <div className="mt-4 flex justify-end gap-2">
          <button className="btn-ghost" onClick={() => setConfirm(false)}>
            Davom etish
          </button>
          <button
            className="btn-primary"
            onClick={() => {
              setConfirm(false);
              submitPart(false);
            }}
          >
            Topshirish
          </button>
        </div>
      </Dialog>

      <Dialog open={help} onClose={() => setHelp(false)} title="Klaviatura yorliqlari">
        <ul className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
          {[
            ["← →", "Oldingi / keyingi savol"],
            ["A–D, 1–4", "Variantni tanlash"],
            ["T / F", "Toʻgʻri / Notoʻgʻri"],
            ["M", "Belgilash"],
            ["Del", "Javobni tozalash"],
            ["N", "Savollar xaritasi"],
            ["?", "Shu oyna"],
          ].map(([k, d]) => (
            <li key={k} className="contents">
              <kbd className="rounded-md border border-border bg-surface2 px-2 py-0.5 text-center font-mono text-xs">{k}</kbd>
              <span>{d}</span>
            </li>
          ))}
        </ul>
        <div className="mt-4 text-right">
          <button className="btn-primary btn-sm" onClick={() => setHelp(false)}>
            Yopish
          </button>
        </div>
      </Dialog>
    </div>
  );
}

function SaveStatus({ savedAt }: { savedAt: number }) {
  const now = useNow(1000);
  const err = useExam((s) => s.saveError);
  if (err) return <span className="text-danger">saqlanmadi!</span>;
  if (!savedAt) return <span>saqlanmoqda…</span>;
  const s = Math.round((now - savedAt) / 1000);
  return <span className="text-success">✓ saqlandi{s > 5 ? ` (${s} s oldin)` : ""}</span>;
}

function Box({ n, l, cls = "" }: { n: number; l: string; cls?: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface2 p-2.5">
      <div className={`text-2xl font-bold ${cls}`}>{n}</div>
      <div className="text-xs text-muted">{l}</div>
    </div>
  );
}

function JumpList({ label, items, onPick }: { label: string; items: { i: number }[]; onPick: (i: number) => void }) {
  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
      <span className="text-muted">{label}</span>
      {items.map(({ i }) => (
        <button key={i} className="rounded-md border border-border px-2 py-0.5 font-mono text-xs hover:border-primary hover:text-primary" onClick={() => onPick(i)}>
          {i + 1}
        </button>
      ))}
    </div>
  );
}

function QuestionMap({ a, onPick, done }: { a: ReturnType<typeof useExam.getState>["attempt"] & {}; onPick: (i: number) => void; done: (id: number) => boolean }) {
  const ps = a.parts[a.current];
  const pc = examConfig.parts[a.current];
  return (
    <div className="card p-3">
      <div className="mb-2 flex items-center justify-between text-xs font-semibold text-muted">
        <span>{pc.kind === "questions" ? "Savollar" : "Masalalar"}</span>
        <span>
          {ps.items.filter(done).length}/{ps.items.length}
        </span>
      </div>
      <div className="grid grid-cols-6 gap-1.5">
        {ps.items.map((x, i) => {
          const cur = i === ps.index;
          const ans = done(x);
          const mk = ps.marked.includes(x);
          const vis = ps.visited.includes(x);
          const cls = cur
            ? "border-primary bg-primary text-primary-fg"
            : ans
              ? "border-success/40 bg-success/15 text-success"
              : vis
                ? "border-border bg-surface2 text-fg"
                : "border-dashed border-border text-muted";
          const title = pc.kind === "problems" ? problemById.get(x)?.title : undefined;
          return (
            <button
              key={x}
              onClick={() => onPick(i)}
              title={title}
              aria-label={`${i + 1}-${pc.kind === "questions" ? "savol" : "masala"}${ans ? ", javob berilgan" : ""}${mk ? ", belgilangan" : ""}${cur ? ", joriy" : ""}`}
              aria-current={cur}
              className={`relative grid aspect-square min-h-[2.25rem] place-items-center rounded-lg border text-xs font-bold tabular-nums ${cls}`}
            >
              {i + 1}
              {mk && <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-surface bg-warning" />}
            </button>
          );
        })}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-1 text-[0.68rem] text-muted">
        <Legend cls="border-dashed border-border" l="Koʻrilmagan" />
        <Legend cls="border-border bg-surface2" l="Koʻrilgan" />
        <Legend cls="border-success/40 bg-success/15" l="Javob berilgan" />
        <Legend cls="border-primary bg-primary" l="Joriy" />
        <span className="col-span-2 flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-warning" /> Belgilangan
        </span>
      </div>
    </div>
  );
}

function Legend({ cls, l }: { cls: string; l: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`h-3 w-3 rounded border ${cls}`} /> {l}
    </span>
  );
}

function BottomSheet({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  const [dy, setDy] = useState(0);
  const start = useRef<number | null>(null);
  useEffect(() => {
    const f = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", f);
    return () => window.removeEventListener("keydown", f);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        className="anim-enter safe-b absolute inset-x-0 bottom-0 max-h-[80dvh] overflow-y-auto rounded-t-2xl bg-surface p-3"
        style={{ transform: `translateY(${dy}px)` }}
        role="dialog"
        aria-label="Savollar xaritasi"
      >
        <div
          className="mx-auto mb-2 h-6 w-full cursor-grab touch-none"
          onPointerDown={(e) => ((start.current = e.clientY), (e.target as Element).setPointerCapture(e.pointerId))}
          onPointerMove={(e) => start.current !== null && setDy(Math.max(0, e.clientY - start.current))}
          onPointerUp={() => {
            if (dy > 80) onClose();
            setDy(0);
            start.current = null;
          }}
        >
          <div className="mx-auto mt-2 h-1.5 w-12 rounded-full bg-border" />
        </div>
        {children}
      </div>
    </div>
  );
}


