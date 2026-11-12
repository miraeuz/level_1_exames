import { bank, questionById, problemById, topicName, Question } from "./bank";
import { examConfig } from "../config/exam.config";
import { normAnswer } from "./util";
import type { Attempt, AttemptResult, ProblemResult, QuestionResult } from "../store/types";

export function isAnswered(q: Question, a: unknown): boolean {
  if (a === undefined || a === null) return false;
  if (Array.isArray(a)) return a.length > 0;
  if (typeof a === "string") return a.trim() !== "";
  return true;
}

export function checkQuestion(q: Question, a: unknown): boolean {
  if (!isAnswered(q, a)) return false;
  switch (q.type) {
    case "single_choice":
    case "true_false":
      return a === q.correct_answer;
    case "multiple_choice": {
      const want = [...(q.correct_answer as string[])].sort().join(",");
      return [...(a as string[])].sort().join(",") === want;
    }
    case "fill_blank":
      return (q.correct_answer as string[]).some((c) => normAnswer(c) === normAnswer(String(a)));
    case "output":
      return normAnswer(String(q.correct_answer)) === normAnswer(String(a));
  }
}

export function roundHalf(x: number) {
  return Math.round(x * 2) / 2;
}

export function grade(percent: number): string {
  if (percent >= 86) return "5 (aʼlo)";
  if (percent >= 71) return "4 (yaxshi)";
  if (percent >= examConfig.passPercent) return "3 (qoniqarli)";
  return "2 (qoniqarsiz)";
}

export function problemPoints(passed: number, total: number, max: number) {
  if (!total) return 0;
  if (examConfig.judge.allOrNothing || !examConfig.judge.partialScoring) return passed === total ? max : 0;
  return roundHalf((max * passed) / total);
}

export function computeResult(att: Attempt, problems: ProblemResult[]): AttemptResult {
  const questions: QuestionResult[] = [];
  const parts = examConfig.parts.map((pc, i) => {
    const ps = att.parts[i];
    let score = 0,
      max = 0,
      answered = 0;
    if (pc.kind === "questions") {
      for (const id of ps.items) {
        const q = questionById.get(id);
        if (!q) continue;
        const a = att.answers[id];
        const ok = checkQuestion(q, a);
        if (isAnswered(q, a)) answered++;
        const pts = ok ? pc.points : 0;
        questions.push({ questionId: id, part: pc.id, answer: a, correct: ok, points: pts });
        score += pts;
        max += pc.points;
      }
    } else {
      for (const id of ps.items) {
        const pr = problems.find((p) => p.problemId === id && p.part === pc.id);
        if (att.uploads[id]) answered++;
        score += pr?.points ?? 0;
        max += pc.points;
      }
    }
    return { id: pc.id, title: pc.title, counted: pc.counted, score, max, timeSpentMs: ps.timeSpentMs, answered, total: ps.items.length };
  });
  const counted = parts.filter((p) => p.counted);
  const total = counted.reduce((a, p) => a + p.score, 0);
  const max = counted.reduce((a, p) => a + p.max, 0);
  const percent = max ? Math.round((1000 * total) / max) / 10 : 0;
  const bonusParts = parts.filter((p) => !p.counted);
  // per-topic (counted parts only)
  const topicMap = new Map<string, { score: number; max: number }>();
  for (const qr of questions) {
    const q = questionById.get(qr.questionId)!;
    const t = topicMap.get(q.topic) ?? { score: 0, max: 0 };
    t.score += qr.points;
    t.max += examConfig.parts.find((p) => p.id === qr.part)!.points;
    topicMap.set(q.topic, t);
  }
  for (const pr of problems) {
    const pc = examConfig.parts.find((p) => p.id === pr.part)!;
    if (!pc.counted) continue;
    const p = problemById.get(pr.problemId)!;
    const key = p.topics[p.topics.length - 1];
    const t = topicMap.get(key) ?? { score: 0, max: 0 };
    t.score += pr.points;
    t.max += pr.maxPoints;
    topicMap.set(key, t);
  }
  const topics = bank.topics
    .filter((t) => topicMap.has(t.id))
    .map((t) => ({ id: t.id, name: topicName(t.id), ...topicMap.get(t.id)! }));
  return {
    total,
    max,
    percent,
    passed: percent >= examConfig.passPercent,
    grade: grade(percent),
    parts,
    questions,
    problems,
    topics,
    bonus: bonusParts.length ? { score: bonusParts.reduce((a, p) => a + p.score, 0), max: bonusParts.reduce((a, p) => a + p.max, 0) } : undefined,
    computedAt: Date.now(),
  };
}
