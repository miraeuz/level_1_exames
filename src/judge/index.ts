import { parseFprg, FprgError } from "./parse";
import { run, RunLimits, RunResult } from "./runtime";
import { compareOutput, canonical, sha256, Checker } from "./compare";

export type Verdict = "AC" | "WA" | "RE" | "TLE" | "PE";

export interface TestCase {
  input: string;
  output?: string; // visible expected output
  hash?: string; // hidden: sha256(canonical(expected))
}

export interface TestResult {
  verdict: Verdict;
  input: string;
  expected?: string;
  actual: string;
  error?: string;
  diffLine?: number;
}

export function judgeSource(src: string, tests: TestCase[], checker: Checker = "numeric", limits?: Partial<RunLimits>): TestResult[] {
  let prog;
  try {
    prog = parseFprg(src);
  } catch (e) {
    const msg = e instanceof FprgError ? e.message : String(e);
    return tests.map((t) => ({ verdict: "PE", input: t.input, expected: t.output, actual: "", error: msg }));
  }
  return tests.map((t) => {
    const r: RunResult = run(prog!, t.input, limits);
    if (r.status === "TLE") return { verdict: "TLE", input: t.input, expected: t.output, actual: r.output, error: r.error };
    if (r.status === "RE" || r.status === "OLE") return { verdict: "RE", input: t.input, expected: t.output, actual: r.output, error: r.error };
    if (t.output !== undefined) {
      const c = compareOutput(r.output, t.output, checker);
      return { verdict: c.ok ? "AC" : "WA", input: t.input, expected: t.output, actual: r.output, diffLine: c.line };
    }
    const ok = sha256(canonical(r.output)) === t.hash;
    return { verdict: ok ? "AC" : "WA", input: t.input, actual: r.output };
  });
}

export function runSource(src: string, stdin: string, limits?: Partial<RunLimits>): RunResult & { parseError?: string } {
  try {
    return run(parseFprg(src), stdin, limits);
  } catch (e) {
    return { status: "RE", output: "", steps: 0, parseError: e instanceof FprgError ? e.message : String(e), error: String((e as Error).message) };
  }
}

export { parseFprg, run, compareOutput, canonical, sha256 };
