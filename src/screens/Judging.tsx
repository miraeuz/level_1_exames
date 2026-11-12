import { useEffect } from "react";
import { examConfig } from "../config/exam.config";
import { useExam } from "../store/exam";
import { problemById } from "../lib/bank";
import { idb } from "../lib/idb";
import { judge } from "../lib/judgeClient";
import { computeResult, problemPoints } from "../lib/scoring";
import { Logo, Ring } from "../components/ui";
import type { ProblemResult } from "../store/types";
import { enqueueDelivery } from "../delivery/queue";

let running: string | null = null;

async function runJudging() {
  const a0 = useExam.getState().attempt;
  if (!a0 || a0.phase !== "judging" || running === a0.id) return;
  running = a0.id;
  try {
    const jobs: { pid: number; part: string; points: number }[] = [];
    examConfig.parts.forEach((pc, i) => {
      if (pc.kind !== "problems") return;
      for (const pid of a0.parts[i].items) jobs.push({ pid, part: pc.id, points: pc.points });
    });
    const totalTests = jobs.reduce((s, j) => s + (problemById.get(j.pid)!.samples.length + problemById.get(j.pid)!.tests.length), 0);
    let done = 0;
    const results: ProblemResult[] = [];
    for (const j of jobs) {
      const p = problemById.get(j.pid)!;
      const meta = a0.uploads[j.pid];
      const nTests = p.samples.length + p.tests.length;
      if (!meta) {
        results.push({ problemId: j.pid, part: j.part, verdict: "—", passed: 0, total: nTests, points: 0, maxPoints: j.points, tests: [] });
        done += nTests;
      } else {
        const src = (await idb.get<string>(meta.key)) ?? "";
        const tests = [...p.samples.map((s) => ({ input: s.input, output: s.output })), ...p.tests.map((t) => ({ input: t.input, hash: t.hash }))];
        const base = done;
        const r = await judge(src, tests, p.checker, (d) => {
          useExam.getState().patch((a) => ({ ...a, judgeProgress: { done: base + d, total: totalTests } }));
        });
        done += nTests;
        const passed = r.filter((x) => x.verdict === "AC").length;
        const firstBad = r.find((x) => x.verdict !== "AC");
        results.push({
          problemId: j.pid,
          part: j.part,
          verdict: (passed === r.length ? "AC" : firstBad!.verdict) as ProblemResult["verdict"],
          passed,
          total: r.length,
          points: problemPoints(passed, r.length, j.points),
          maxPoints: j.points,
          tests: r.map((x, i) => ({ ...x, hidden: i >= p.samples.length })),
          fileName: meta.name,
        });
      }
      useExam.getState().patch((a) => ({ ...a, judgeProgress: { done, total: totalTests } }));
    }
    const a1 = useExam.getState().attempt!;
    const result = computeResult(a1, results);
    useExam.getState().patch((a) => (a.phase === "judging" ? { ...a, result, phase: "results" } : a));
    enqueueDelivery(useExam.getState().attempt!);
  } finally {
    running = null;
  }
}

export default function Judging() {
  const a = useExam((s) => s.attempt)!;
  useEffect(() => {
    runJudging();
  }, []);
  const pr = a.judgeProgress;
  const v = pr && pr.total ? pr.done / pr.total : 0;
  return (
    <div className="grid min-h-dvh place-items-center p-6">
      <div className="card anim-pop w-full max-w-md p-8 text-center">
        <Logo className="mx-auto h-10 w-10" />
        <h1 className="mt-4 text-xl font-bold">Natijalar hisoblanmoqda…</h1>
        <p className="mt-1 text-sm text-muted">Yuklangan dasturlar barcha testlarda ishga tushirilmoqda. Sahifani yopmang.</p>
        <div className="mt-6 flex justify-center">
          <Ring value={v} size={7} stroke={0.55}>
            <span className="text-xl font-bold tabular-nums">{Math.round(v * 100)}%</span>
          </Ring>
        </div>
        {pr && pr.total > 0 && (
          <p className="mt-3 text-sm text-muted tabular-nums">
            {pr.done} / {pr.total} test
          </p>
        )}
      </div>
    </div>
  );
}
