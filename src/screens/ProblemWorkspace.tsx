import { DragEvent, useEffect, useRef, useState } from "react";
import { useExam } from "../store/exam";
import { problemById, topicName } from "../lib/bank";
import { idb } from "../lib/idb";
import { judge, runOnce } from "../lib/judgeClient";
import { parseFprg } from "../judge/parse";
import { examConfig } from "../config/exam.config";
import { ProgramView } from "../components/Program";
import { Icon, Verdict } from "../components/ui";
import { fmtDateTime } from "../lib/util";
import type { TestResult } from "../judge";

export function fileKey(attemptId: string, pid: number) {
  return `file:${attemptId}:${pid}`;
}

export default function ProblemWorkspace({ pid, index, total }: { pid: number; index: number; total: number }) {
  const p = problemById.get(pid)!;
  const a = useExam((s) => s.attempt)!;
  const setUpload = useExam((s) => s.setUpload);
  const setSampleRun = useExam((s) => s.setSampleRun);
  const meta = a.uploads[pid];
  const [src, setSrc] = useState<string | null>(null);
  const [err, setErr] = useState("");
  const [running, setRunning] = useState(false);
  const [drag, setDrag] = useState(false);
  const [stdin, setStdin] = useState("");
  const [custom, setCustom] = useState<{ out: string; status: string; error?: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const runs = a.sampleRuns[pid];
  const pc = examConfig.parts[a.current];

  useEffect(() => {
    setSrc(null);
    setErr("");
    setCustom(null);
    if (meta) idb.get<string>(meta.key).then((s) => setSrc(s ?? null));
  }, [pid, meta?.key, meta?.uploadedAt]); // eslint-disable-line react-hooks/exhaustive-deps

  const accept = async (f: File) => {
    setErr("");
    if (!/\.fprg$/i.test(f.name)) return setErr("Faqat .fprg kengaytmali Flowgorithm fayli qabul qilinadi.");
    if (f.size > examConfig.judge.uploadMaxKb * 1024) return setErr(`Fayl juda katta (ko‘pi bilan ${examConfig.judge.uploadMaxKb} KB).`);
    const text = await f.text();
    try {
      parseFprg(text);
    } catch (e) {
      return setErr("Fayl Flowgorithm dasturi sifatida oʻqilmadi: " + (e as Error).message);
    }
    const key = fileKey(a.id, pid);
    await idb.set(key, text);
    setSrc(text);
    setUpload(pid, { name: f.name, size: f.size, uploadedAt: Date.now(), key });
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDrag(false);
    const f = e.dataTransfer.files?.[0];
    if (f) accept(f);
  };

  const runSamples = async () => {
    if (!src || running) return;
    setRunning(true);
    try {
      const r = await judge(src, p.samples, p.checker);
      setSampleRun(pid, r);
    } finally {
      setRunning(false);
    }
  };

  const runCustom = async () => {
    if (!src || running) return;
    setRunning(true);
    try {
      const r = await runOnce(src, stdin);
      setCustom({ out: r.output, status: r.status, error: r.error ?? r.parseError });
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
      {/* statement */}
      <section className="card p-5 sm:p-6">
        <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-md bg-primary px-2 py-0.5 font-bold text-primary-fg">
            {index + 1} / {total}
          </span>
          {p.topics.map((t) => (
            <span key={t} className="chip">
              {topicName(t)}
            </span>
          ))}
          <span className="chip">{pc.counted ? `${pc.points} ball` : "bonus"}</span>
        </div>
        <h2 className="text-xl font-bold">{p.title}</h2>
        <p className="mt-3 leading-relaxed">{p.story}</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-border bg-surface2 p-3.5">
            <div className="mb-1 text-xs font-bold uppercase tracking-wide text-muted">Kirish</div>
            <ul className="list-disc space-y-1 pl-4 text-sm">
              {p.input.map((x, i) => (
                <li key={i}>{x}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl border border-border bg-surface2 p-3.5">
            <div className="mb-1 text-xs font-bold uppercase tracking-wide text-muted">Chiqish</div>
            <ul className="list-disc space-y-1 pl-4 text-sm">
              {p.output.map((x, i) => (
                <li key={i}>{x}</li>
              ))}
            </ul>
          </div>
        </div>
        <p className="mt-3 text-sm">
          <b>Cheklovlar:</b> <span className="text-muted">{p.constraints}</span>
        </p>
        <p className="mt-2 text-xs text-muted">Har bir qiymat alohida Input bilan, yuqoridagi tartibda kiritiladi. Har bir Output alohida qatorda chiqadi.</p>
        <div className="mt-4 space-y-3">
          {p.samples.map((s, i) => (
            <div key={i} className="overflow-hidden rounded-xl border border-border">
              <div className="flex items-center justify-between bg-surface2 px-3 py-1.5 text-xs font-bold text-muted">
                <span>Misol {i + 1}</span>
                {runs?.[i] && <Verdict v={runs[i].verdict} short />}
              </div>
              <div className="grid grid-cols-2 divide-x divide-border">
                <pre className="scrollbar-thin overflow-auto p-3 font-mono text-[0.85rem]">
                  <span className="mb-1 block font-sans text-[0.7rem] font-semibold uppercase text-muted">Kirish</span>
                  {s.input}
                </pre>
                <pre className="scrollbar-thin overflow-auto p-3 font-mono text-[0.85rem]">
                  <span className="mb-1 block font-sans text-[0.7rem] font-semibold uppercase text-muted">Chiqish</span>
                  {s.output}
                </pre>
              </div>
            </div>
          ))}
        </div>
        {p.explanation && (
          <div className="mt-3 rounded-xl border border-info/30 bg-info/10 p-3.5 text-sm">
            <b>Tushuntirish (1-misol):</b> {p.explanation}
          </div>
        )}
      </section>

      {/* workspace */}
      <section className="space-y-4">
        <div
          className={`card border-2 border-dashed p-5 text-center transition-colors ${drag ? "border-primary bg-primary/5" : "border-border"}`}
          onDragOver={(e) => (e.preventDefault(), setDrag(true))}
          onDragLeave={() => setDrag(false)}
          onDrop={onDrop}
        >
          <input ref={inputRef} type="file" accept=".fprg" className="hidden" onChange={(e) => (e.target.files?.[0] && accept(e.target.files[0]), (e.target.value = ""))} />
          {!meta ? (
            <>
              <Icon name="upload" className="mx-auto h-9 w-9 text-primary" />
              <div className="mt-2 font-semibold">.fprg faylni shu yerga tashlang</div>
              <div className="text-sm text-muted">yoki</div>
              <button className="btn-primary mt-2" onClick={() => inputRef.current?.click()}>
                Faylni tanlash
              </button>
              <div className="mt-2 text-xs text-muted">Ko‘pi bilan {examConfig.judge.uploadMaxKb} KB</div>
            </>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3 text-left">
              <div className="flex min-w-0 items-center gap-3">
                <Icon name="file" className="h-8 w-8 shrink-0 text-primary" />
                <div className="min-w-0">
                  <div className="truncate font-semibold">{meta.name}</div>
                  <div className="text-xs text-muted">
                    {(meta.size / 1024).toFixed(1)} KB · {fmtDateTime(meta.uploadedAt)}
                  </div>
                </div>
              </div>
              <button className="btn-ghost btn-sm" onClick={() => inputRef.current?.click()}>
                <Icon name="refresh" className="h-4 w-4" /> Yangi fayl yuklash
              </button>
            </div>
          )}
          {err && <p className="mt-3 rounded-lg bg-danger/10 p-2 text-left text-sm text-danger">{err}</p>}
        </div>

        {src && (
          <>
            <ProgramView src={src} compact />
            <div className="card p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="font-semibold">Namunaviy testlar</div>
                <button className="btn-primary btn-sm" disabled={running} onClick={runSamples}>
                  <Icon name="play" className="h-4 w-4" /> {running ? "Tekshirilmoqda…" : "Sinab koʻrish"}
                </button>
              </div>
              {runs && (
                <div className="mt-3 space-y-2">
                  {runs.map((r, i) => (
                    <SampleResult key={i} i={i} r={r} />
                  ))}
                </div>
              )}
              {!runs && <p className="mt-2 text-sm text-muted">Faylingiz misollarda toʻgʻri ishlashini tekshiring. Yashirin testlar imtihon oxirida ishga tushadi.</p>}
            </div>
            <details className="card p-4">
              <summary className="cursor-pointer font-semibold">Oʻz kiritishingiz bilan ishga tushirish</summary>
              <textarea className="input mt-3 min-h-[5rem] py-2 font-mono text-sm" placeholder={"Har bir qiymat alohida qatorda\nmasalan:\n5\n3"} value={stdin} onChange={(e) => setStdin(e.target.value)} />
              <button className="btn-ghost btn-sm mt-2" disabled={running} onClick={runCustom}>
                <Icon name="terminal" className="h-4 w-4" /> Ishga tushirish
              </button>
              {custom && (
                <div className="mt-3">
                  {custom.status !== "ok" && <div className="mb-1 text-sm text-danger">{custom.error}</div>}
                  <pre className="scrollbar-thin max-h-60 overflow-auto rounded-lg bg-surface2 p-3 font-mono text-sm">{custom.out || "(chiqish yoʻq)"}</pre>
                </div>
              )}
            </details>
          </>
        )}
      </section>
    </div>
  );
}

function SampleResult({ i, r }: { i: number; r: TestResult }) {
  const exp = (r.expected ?? "").split("\n");
  const act = r.actual.replace(/\n$/, "").split("\n");
  return (
    <details className="rounded-xl border border-border" open={r.verdict !== "AC"}>
      <summary className="flex cursor-pointer items-center justify-between px-3 py-2 text-sm">
        <span className="font-semibold">Misol {i + 1}</span>
        <Verdict v={r.verdict} />
      </summary>
      <div className="border-t border-border p-3 text-sm">
        {r.error && <div className="mb-2 rounded-lg bg-warning/10 p-2 text-warning">{r.error}</div>}
        <div className="grid gap-2 sm:grid-cols-2">
          <div>
            <div className="mb-1 text-xs font-semibold uppercase text-muted">Kutilgan</div>
            <pre className="rounded-lg bg-surface2 p-2 font-mono text-[0.8rem]">{exp.join("\n")}</pre>
          </div>
          <div>
            <div className="mb-1 text-xs font-semibold uppercase text-muted">Sizning natijangiz</div>
            <pre className="rounded-lg bg-surface2 p-2 font-mono text-[0.8rem]">
              {act.map((l, j) => (
                <span key={j} className={r.diffLine === j + 1 ? "block bg-danger/20 text-danger" : "block"}>
                  {l || " "}
                </span>
              ))}
            </pre>
          </div>
        </div>
        {r.diffLine && <div className="mt-1.5 text-xs text-danger">Birinchi farq: {r.diffLine}-qatorda</div>}
      </div>
    </details>
  );
}
