// Runs the judge in a Web Worker; a hung worker (wall-clock limit) is terminated and reported as TLE.
import type { TestCase, TestResult } from "../judge";
import type { RunResult } from "../judge/runtime";
import { examConfig } from "../config/exam.config";
// Inlined worker (blob URL): judging also works when the internet is off during final submission.
import JudgeWorker from "../judge/worker?worker&inline";

const LIMITS = { maxSteps: examConfig.judge.maxSteps, wallMs: examConfig.judge.wallMs, maxOutputChars: examConfig.judge.maxOutputKb * 1024 };

function spawn() {
  return new JudgeWorker();
}

let seq = 0;

function call<T>(msg: Record<string, unknown>, hardTimeoutMs: number): Promise<T | "timeout"> {
  return new Promise((resolve, reject) => {
    const w = spawn();
    const id = ++seq;
    const timer = setTimeout(() => {
      w.terminate();
      resolve("timeout");
    }, hardTimeoutMs);
    w.onmessage = (ev) => {
      if (ev.data.id !== id) return;
      clearTimeout(timer);
      w.terminate();
      if (ev.data.ok) resolve(ev.data as T);
      else reject(new Error(ev.data.error));
    };
    w.onerror = (e) => {
      clearTimeout(timer);
      w.terminate();
      reject(new Error(e.message || "Worker xatosi"));
    };
    w.postMessage({ ...msg, id, limits: LIMITS });
  });
}

/** Judge each test in its own worker call so one infinite loop cannot block the rest. */
export async function judge(src: string, tests: TestCase[], checker: "numeric" | "exact" | "tokens" = "numeric", onProgress?: (done: number) => void): Promise<TestResult[]> {
  const out: TestResult[] = [];
  // batch: try all at once first (fast path), fall back to one-by-one on timeout
  const all = await call<{ results: TestResult[] }>({ kind: "judge", src, tests, checker }, LIMITS.wallMs * tests.length + 2000).catch(() => "timeout" as const);
  if (all !== "timeout") {
    onProgress?.(tests.length);
    return all.results;
  }
  for (let i = 0; i < tests.length; i++) {
    const r = await call<{ results: TestResult[] }>({ kind: "judge", src, tests: [tests[i]], checker }, LIMITS.wallMs + 1500).catch((e) => ({ results: [{ verdict: "RE", input: tests[i].input, actual: "", error: String(e.message) } as TestResult] }));
    out.push(r === "timeout" ? { verdict: "TLE", input: tests[i].input, expected: tests[i].output, actual: "", error: "Vaqt chegarasi (5 s) oshib ketdi" } : r.results[0]);
    onProgress?.(i + 1);
  }
  return out;
}

export async function runOnce(src: string, stdin: string): Promise<RunResult & { parseError?: string }> {
  const r = await call<{ run: RunResult & { parseError?: string } }>({ kind: "run", src, stdin }, LIMITS.wallMs + 1500);
  if (r === "timeout") return { status: "TLE", output: "", steps: 0, error: "Vaqt chegarasi oshib ketdi (cheksiz sikl bo‘lishi mumkin)" };
  return r.run;
}
