import { useEffect, useState } from "react";
import { useExam } from "../store/exam";
import { questionById, topicName, optText } from "../lib/bank";
import { ProgramView } from "../components/Program";
import { Icon } from "../components/ui";
import { RichText, SheetTable, CodeBlock } from "../components/Rich";

const TYPE_LABEL: Record<string, string> = {
  single_choice: "Bitta javob",
  multiple_choice: "Bir nechta javob",
  true_false: "Toʻgʻri / Notoʻgʻri",
  fill_blank: "Boʻsh joyni toʻldiring",
  output: "Natijani yozing",
};
const DIFF: Record<string, string> = { easy: "oson", medium: "oʻrtacha", hard: "qiyin" };

export default function QuestionView({ qid, index, total }: { qid: number; index: number; total: number }) {
  const q = questionById.get(qid)!;
  const a = useExam((s) => s.attempt)!;
  const answer = useExam((s) => s.answer);
  const value = a.answers[qid];
  const order = a.optionOrder[qid] ?? q.options?.map((_, i) => i) ?? [];
  const hasProg = !!q.program;

  const head = (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
        <span className="rounded-md bg-primary px-2 py-0.5 font-bold text-primary-fg">
          {index + 1} / {total}
        </span>
        <span className="chip">{topicName(q.topic)}</span>
        <span className="chip">{TYPE_LABEL[q.type]}</span>
        <span className="chip">{DIFF[q.difficulty]}</span>
      </div>
      <h2 className="text-[1.15rem] font-semibold leading-relaxed sm:text-[1.25rem]">
        <RichText text={q.question} />
      </h2>
      {q.table && <SheetTable rows={q.table} />}
      {q.code && <CodeBlock lines={q.code} />}
      {q.stdin !== undefined && (
        <div className="mt-3 inline-flex flex-wrap items-center gap-2 rounded-lg border border-border bg-surface2 px-3 py-1.5 text-sm">
          <Icon name="keyboard" className="h-4 w-4 text-muted" /> Kiritiladi:
          {q.stdin.split("\n").map((l, i) => (
            <code key={i} className="rounded bg-surface px-1.5 py-0.5 font-mono text-[0.85rem]">
              {l}
            </code>
          ))}
        </div>
      )}
    </div>
  );

  const answers = (
    <div className="space-y-2.5">
      {(q.type === "single_choice" || q.type === "multiple_choice") &&
        order.map((oi, pos) => {
          const letter = "ABCDE"[oi];
          const shown = "ABCDE"[pos];
          const selected = q.type === "single_choice" ? value === letter : ((value as string[]) ?? []).includes(letter);
          const toggle = () => {
            if (q.type === "single_choice") answer(qid, letter);
            else {
              const cur = (value as string[]) ?? [];
              answer(qid, cur.includes(letter) ? cur.filter((x) => x !== letter) : [...cur, letter]);
            }
          };
          return (
            <button
              key={oi}
              role={q.type === "single_choice" ? "radio" : "checkbox"}
              aria-checked={selected}
              onClick={toggle}
              className={`flex min-h-[3rem] w-full items-start gap-3 rounded-xl border px-3.5 py-3 text-left transition-colors ${selected ? "border-primary bg-primary/10" : "border-border bg-surface hover:border-primary/50"}`}
            >
              <span className={`grid h-7 w-7 shrink-0 place-items-center ${q.type === "single_choice" ? "rounded-full" : "rounded-md"} border text-sm font-bold ${selected ? "border-primary bg-primary text-primary-fg" : "border-border text-muted"}`}>
                {selected && q.type === "multiple_choice" ? <Icon name="check" className="h-4 w-4" /> : shown}
              </span>
              <span className="pt-0.5 font-mono text-[0.95rem] leading-snug [overflow-wrap:anywhere]">{optText(q.options![oi])}</span>
            </button>
          );
        })}
      {q.type === "multiple_choice" && <p className="text-xs text-muted">Bir nechta toʻgʻri javob bor — barchasini belgilang.</p>}
      {q.type === "true_false" && (
        <div className="grid grid-cols-2 gap-3">
          {(
            [
              ["True", "Toʻgʻri", "T"],
              ["False", "Notoʻgʻri", "F"],
            ] as const
          ).map(([v, l, k]) => (
            <button
              key={v}
              role="radio"
              aria-checked={value === v}
              onClick={() => answer(qid, v)}
              className={`flex min-h-[3.25rem] items-center justify-center gap-2 rounded-xl border text-base font-semibold ${value === v ? "border-primary bg-primary/10 text-primary" : "border-border bg-surface hover:border-primary/50"}`}
            >
              <Icon name={v === "True" ? "check" : "x"} /> {l} <kbd className="ml-1 rounded border border-border px-1.5 font-mono text-xs text-muted">{k}</kbd>
            </button>
          ))}
        </div>
      )}
      {(q.type === "fill_blank" || q.type === "output") && <TextAnswer qid={qid} multiline={q.type === "output"} value={(value as string) ?? ""} />}
    </div>
  );

  if (!hasProg)
    return (
      <div className="card mx-auto max-w-3xl p-5 sm:p-7">
        {head}
        <div className="mt-6">{answers}</div>
      </div>
    );

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
      <div className="card p-5 sm:p-6">
        {head}
        <div className="mt-4">
          <ProgramView src={q.program!} />
        </div>
      </div>
      <div className="card h-fit p-5 sm:p-6 xl:sticky xl:top-[5.5rem]">
        <div className="mb-3 text-sm font-semibold text-muted">Javobingiz</div>
        {answers}
      </div>
    </div>
  );
}

function TextAnswer({ qid, multiline, value }: { qid: number; multiline: boolean; value: string }) {
  const answer = useExam((s) => s.answer);
  const [v, setV] = useState(value);
  useEffect(() => setV(value), [qid]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const t = setTimeout(() => v !== value && answer(qid, v), 300);
    return () => clearTimeout(t);
  }, [v]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div>
      {multiline ? (
        <textarea className="input min-h-[7rem] py-3 font-mono" value={v} onChange={(e) => setV(e.target.value)} onBlur={() => answer(qid, v)} placeholder="Ekranga chiqadigan natijani yozing" aria-label="Javob" />
      ) : (
        <input className="input font-mono" value={v} onChange={(e) => setV(e.target.value)} onBlur={() => answer(qid, v)} placeholder="Javobni yozing" aria-label="Javob" />
      )}
      <p className="mt-1.5 text-xs text-muted">{multiline ? "Har bir chiqish qatorini alohida qatorga yozing. Katta-kichik harf va ortiqcha boʻsh joylar hisobga olinmaydi." : "Katta-kichik harf hisobga olinmaydi."}</p>
    </div>
  );
}
