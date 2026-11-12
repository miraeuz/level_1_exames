/// <reference lib="webworker" />
import { judgeSource, runSource, TestCase } from "./index";
import type { Checker } from "./compare";

type Msg =
  | { id: number; kind: "judge"; src: string; tests: TestCase[]; checker: Checker; limits?: Record<string, number> }
  | { id: number; kind: "run"; src: string; stdin: string; limits?: Record<string, number> };

self.onmessage = (ev: MessageEvent<Msg>) => {
  const m = ev.data;
  try {
    if (m.kind === "judge") {
      const results = judgeSource(m.src, m.tests, m.checker, m.limits);
      (self as unknown as Worker).postMessage({ id: m.id, ok: true, results });
    } else {
      const r = runSource(m.src, m.stdin, m.limits);
      (self as unknown as Worker).postMessage({ id: m.id, ok: true, run: r });
    }
  } catch (e) {
    (self as unknown as Worker).postMessage({ id: m.id, ok: false, error: String((e as Error).message ?? e) });
  }
};
