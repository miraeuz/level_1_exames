// npm run bank — builds src/data/bank.json. Every answer and expected output comes from RUNNING the
// program with our Flowgorithm interpreter. Fails (exit 1) on any issue.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { toFprg, B } from "../src/judge/build";
import { parseFprg } from "../src/judge/parse";
import { run } from "../src/judge/runtime";
import { canonical, compareOutput, normalizeOutput, sha256 } from "../src/judge/compare";
import { parseExpr, collectOps } from "../src/judge/expr";
import { walk, Stmt } from "../src/judge/ast";
import { QUESTIONS, QDef } from "./src/questions";
import { PART3, PART4, ProblemDef } from "./src/problems";
import { rng, hashStr } from "./src/rng";
import { TOPICS, ALLOWED, CONCEPTS } from "../src/config/topics";

const issues: string[] = [];
const fail = (m: string) => issues.push(m);

// ---------- text normalisation: proper Uzbek letters ----------
export function uz(s: string): string {
  return s
    .replace(/([oOgG])[‘'’`ʼ]/g, "$1ʻ")
    .replace(/[’]/g, "ʼ")
    .replace(/([A-Za-z])'([a-z])/g, "$1ʼ$2");
}

// ---------- scope scanner ----------
function scan(body: B[], topic: string, where: string) {
  const allowed = ALLOWED[topic];
  if (!allowed) return fail(`${where}: noma'lum mavzu ${topic}`);
  const prog = parseFprg(toFprg(body));
  const exprs: string[] = [];
  let maxForDepth = 0;
  const visit = (stmts: Stmt[], forDepth: number) => {
    for (const s of stmts) {
      if (!allowed.stmts.includes(s.k)) fail(`${where}: «${s.k}» bu mavzuda hali o'tilmagan (${topic})`);
      if (s.k === "declare" && s.array) fail(`${where}: massiv o'tilmagan`);
      if (s.k === "assign") exprs.push(s.expression);
      if (s.k === "output") exprs.push(s.expression);
      if (s.k === "if") {
        exprs.push(s.expression);
        visit(s.then, forDepth);
        visit(s.else, forDepth);
      }
      if (s.k === "for") {
        exprs.push(s.start, s.end, s.step);
        maxForDepth = Math.max(maxForDepth, forDepth + 1);
        visit(s.body, forDepth + 1);
      }
    }
  };
  visit(prog.functions[0].body, 0);
  if (maxForDepth > allowed.maxForDepth) fail(`${where}: ichma-ich For bu mavzuda o'tilmagan`);
  for (const e of exprs) {
    for (const op of collectOps(parseExpr(e))) {
      if (op.startsWith("fn:") || op === "index") fail(`${where}: funksiya/massiv ishlatilgan (${op})`);
      if (!allowed.ops.includes(op)) fail(`${where}: «${op}» amali bu mavzuda o'tilmagan (${topic})`);
    }
  }
}

const runProg = (body: B[], stdin = "") => {
  const r = run(parseFprg(toFprg(body)), stdin);
  return r;
};
const oneLine = (out: string) => normalizeOutput(out).split("\n").join("; ");

// ---------- questions ----------
const letterCount = [0, 0, 0, 0];
let qid = 0;
const questions: any[] = [];
const conceptHits: Record<string, number[]> = Object.fromEntries(CONCEPTS.map((c) => [c.id, []]));

for (const q of QUESTIONS) {
  qid++;
  const where = `Savol ${qid} (${q.topic})`;
  const topic = TOPICS.find((t) => t.id === q.topic);
  if (!topic) {
    fail(`${where}: mavzu yo'q`);
    continue;
  }
  const out: any = {
    id: qid,
    topic: q.topic,
    part: topic.part,
    type: q.type,
    difficulty: q.diff,
    question: uz(q.q),
    explanation: uz(q.expl),
  };
  let realOut: string | null = null;
  if (q.prog) {
    scan(q.prog, q.topic, where);
    out.program = toFprg(q.prog, `Savol ${qid}`);
    if (q.stdin !== undefined) out.stdin = q.stdin;
    const hasInput = out.program.includes("<input");
    const r = q.cases || (hasInput && q.stdin === undefined) ? { status: "skip", output: "", error: "" } : runProg(q.prog, q.stdin ?? "");
    if (r.status === "skip") realOut = null;
    else if (r.status === "ok") realOut = normalizeOutput(r.output);
    else if (!(q.opts && /xato/i.test(q.opts[0]))) fail(`${where}: dastur xato berdi: ${r.error}`);
    if (r.status === "skip" && !q.cases && !q.opts) fail(`${where}: kiritish (stdin) berilmagan`);
  }

  const placeCorrect = (correct: string, others: string[]) => {
    // choose least used letter for balance, deterministic
    let pos = letterCount.indexOf(Math.min(...letterCount));
    letterCount[pos]++;
    const r = rng(hashStr(q.q));
    const rest = [...others];
    for (let i = rest.length - 1; i > 0; i--) {
      const j = r.int(0, i);
      [rest[i], rest[j]] = [rest[j], rest[i]];
    }
    const opts = [...rest];
    opts.splice(pos, 0, correct);
    return { opts, pos };
  };

  if (q.type === "single_choice") {
    let correct: string, others: string[];
    if (q.prog && q.distract) {
      if (realOut === null) {
        fail(`${where}: natija yo'q`);
        continue;
      }
      correct = oneLine(realOut);
      others = q.distract;
      if (others.some((d) => normalizeOutput(d) === correct)) fail(`${where}: chalg'ituvchi javob haqiqiy natijaga teng: ${correct}`);
      const toks = correct.split(/\s+|;/).filter(Boolean);
      const ex = q.expl.toLowerCase();
      for (const t of toks) if (!ex.includes(t.toLowerCase())) fail(`${where}: izohda natija «${correct}» ko'rsatilmagan («${t}» yo'q)`);
    } else if (q.opts) {
      [correct, ...others] = q.opts;
    } else {
      fail(`${where}: variantlar yo'q`);
      continue;
    }
    if (others.length !== 3) fail(`${where}: 4 ta variant bo'lishi kerak`);
    const all = [correct, ...others].map((x) => x.trim().toLowerCase());
    if (new Set(all).size !== all.length) fail(`${where}: bir xil variantlar bor`);
    const { opts, pos } = placeCorrect(correct, others);
    out.options = opts.map((o, i) => `${"ABCD"[i]}) ${uz(o)}`);
    out.correct_answer = "ABCD"[pos];
  } else if (q.type === "multiple_choice") {
    if (q.cases && q.prog) {
      const correctIdx: number[] = [];
      q.cases.forEach((c, i) => {
        const r = runProg(q.prog!, c.stdin);
        if (r.status !== "ok") fail(`${where}: holat ${c.label} xato: ${r.error}`);
        if (normalizeOutput(r.output) === q.target) correctIdx.push(i);
      });
      out.options = q.cases.map((c, i) => `${"ABCDE"[i]}) ${uz(c.label)}`);
      out.correct_answer = correctIdx.map((i) => "ABCDE"[i]);
      if (correctIdx.length < 2) fail(`${where}: kamida 2 ta to'g'ri javob kerak (topildi ${correctIdx.length})`);
      out.inputs = q.cases.map((c) => c.stdin);
    } else {
      out.options = q.opts!.map((o, i) => `${"ABCDE"[i]}) ${uz(o)}`);
      out.correct_answer = q.correctIdx!.map((i) => "ABCDE"[i]);
      if (q.correctIdx!.length < 2) fail(`${where}: kamida 2 ta to'g'ri javob kerak`);
    }
  } else if (q.type === "true_false") {
    let truth = q.tf;
    if (q.claim !== undefined) {
      if (realOut === null) {
        fail(`${where}: natija yo'q`);
        continue;
      }
      truth = realOut === q.claim;
      const says = /noto/i.test(q.expl);
      if (says === truth) fail(`${where}: izoh haqiqiy natijaga mos emas (to'g'ri=${truth})`);
    }
    if (truth === undefined) fail(`${where}: tf qiymati yo'q`);
    out.correct_answer = truth ? "True" : "False";
  } else if (q.type === "output") {
    if (realOut === null) {
      fail(`${where}: natija yo'q`);
      continue;
    }
    out.correct_answer = realOut;
    const ex = q.expl.toLowerCase();
    for (const t of realOut.split(/\s+/).filter(Boolean)) if (!ex.includes(t.toLowerCase())) fail(`${where}: izohda «${t}» yo'q (natija: ${realOut})`);
  } else if (q.type === "fill_blank") {
    out.correct_answer = q.blanks;
  }

  // concepts
  const hay = (q.q + " " + (out.program ?? "") + " " + q.expl).toLowerCase();
  for (const c of CONCEPTS) if (c.topics.includes(q.topic) && c.test.test(hay)) conceptHits[c.id].push(qid);
  questions.push(out);
}

// duplicates
const seen = new Map<string, number>();
for (const q of questions) {
  const k = (q.question + "|" + (q.program ?? "") + "|" + (q.stdin ?? "")).replace(/\s+/g, " ");
  if (seen.has(k)) fail(`Takroriy savol: ${seen.get(k)} va ${q.id}`);
  seen.set(k, q.id);
  if (q.program) {
    const pk = q.program.replace(/<attribute name="name"[^>]*>/, "") + "|" + (q.stdin ?? "") + "|" + q.type;
    if (seen.has(pk)) fail(`Takroriy dastur: ${seen.get(pk)} va ${q.id}`);
    seen.set(pk, q.id);
  }
}

// ---------- problems ----------
const p3text = JSON.parse(readFileSync(new URL("./src/problems-text.json", import.meta.url), "utf8"));
const p4text = JSON.parse(readFileSync(new URL("./src/hard-text.json", import.meta.url), "utf8"));
mkdirSync(new URL("./out/reference/", import.meta.url), { recursive: true });

function mutants(body: B[]): B[][] {
  const res: B[][] = [];
  const json = JSON.stringify(body);
  const swaps: [RegExp, string][] = [
    [/>=/g, ">"],
    [/<=/g, "<"],
    [/(?<![<>=!])>(?!=)/g, ">="],
    [/(?<![<>=!])<(?![=>])/g, "<="],
    [/ \+ /g, " - "],
    [/ - /g, " + "],
    [/ \* /g, " + "],
    [/ mod /g, " / "],
    [/\b(\d+)\b/g, "N+1"],
  ];
  for (const [re, rep] of swaps) {
    let idx = 0;
    const matches = [...json.matchAll(new RegExp(re.source, "g"))];
    for (const m of matches.slice(0, 4)) {
      const at = m.index!;
      const r = rep === "N+1" ? String(Number(m[1]) + 1) : rep;
      const mutated = json.slice(0, at) + r + json.slice(at + m[0].length);
      try {
        const b = JSON.parse(mutated);
        res.push(b);
      } catch {
        /* ignore */
      }
      idx++;
    }
  }
  // for end - 1 mutation
  const forEnd = JSON.parse(json);
  let done = false;
  const mut = (bs: any[]) => {
    for (const b of bs) {
      if (done) return;
      if (b.k === "for") {
        b.end = `(${b.end}) - 1`;
        done = true;
        return;
      }
      if (b.then) mut(b.then);
      if (b.else) mut(b.else);
      if (b.body) mut(b.body);
    }
  };
  mut(forEnd);
  if (done) res.push(forEnd);
  return res;
}

let pid = 0;
const problems: any[] = [];
const buildProblem = (def: ProblemDef, text: any, part: 3 | 4, key: string) => {
  pid++;
  const where = `Masala ${part}.${key} «${text.title}»`;
  for (const t of def.topics) scan(def.ref, t === "T9" ? "T9" : part === 4 ? "T9" : maxTopic(def.topics), where);
  const prog = parseFprg(toFprg(def.ref));
  const samples = (text.samples as (number | string)[][]).map((inp, i) => {
    const input = inp.join("\n");
    const r = run(prog, input);
    if (r.status !== "ok") fail(`${where}: namuna ${i + 1} xato: ${r.error}`);
    const o = normalizeOutput(r.output);
    const py = text.sampleOutputs?.[i];
    if (py !== undefined && !compareOutput(o, py).ok) fail(`${where}: namuna ${i + 1} chiqishi matndagi bilan mos emas:\n  fprg: ${JSON.stringify(o)}\n  matn: ${JSON.stringify(py)}`);
    return { input, output: o };
  });
  const r = rng(hashStr(text.title + part));
  const sampleSet = new Set(samples.map((s) => s.input));
  const tests: { input: string; output: string }[] = [];
  let guard = 0;
  while (tests.length < 12 && guard++ < 400) {
    const inp = def.gen(r).join("\n");
    if (sampleSet.has(inp) || tests.some((t) => t.input === inp)) continue;
    const rr = run(prog, inp);
    if (rr.status !== "ok") {
      fail(`${where}: yashirin test xato: ${rr.error} (kirish: ${JSON.stringify(inp)})`);
      break;
    }
    tests.push({ input: inp, output: normalizeOutput(rr.output) });
  }
  if (tests.length < (guard >= 400 ? 5 : 8)) fail(`${where}: yashirin testlar kam (${tests.length})`);
  // weak-test detection
  const ms = mutants(def.ref);
  let killed = 0;
  for (const m of ms) {
    let pm;
    try {
      pm = parseFprg(toFprg(m));
    } catch {
      killed++;
      continue;
    }
    const all = [...samples, ...tests];
    if (all.some((t) => {
      const x = run(pm, t.input, { maxSteps: 200000 });
      return x.status !== "ok" || !compareOutput(x.output, t.output).ok;
    })) killed++;
  }
  if (killed < 2) fail(`${where}: testlar kuchsiz — ${ms.length} ta noto'g'ri yechimdan faqat ${killed} tasi yiqildi`);
  writeFileSync(new URL(`./out/reference/P${part}_${String(key).padStart(2, "0")}.fprg`, import.meta.url), toFprg(def.ref, text.title, "Reference"));
  const fixText = (s: string) => uz((def as any).statementFix ? (def as any).statementFix(s) : s);
  problems.push({
    id: pid,
    part,
    key: `P${part}-${String(key).padStart(2, "0")}`,
    title: uz(text.title),
    difficulty: def.difficulty ?? (part === 4 ? "hard" : "medium"),
    topics: def.topics,
    story: fixText(text.story),
    input: (text.kirish as string[]).map(fixText),
    output: (text.chiqish as string[]).map(fixText),
    constraints: Array.isArray(text.cheklov) ? text.cheklov.map(fixText).join("; ") : fixText(text.cheklov),
    explanation: def.izoh ? uz(def.izoh) : text.izoh ? uz(text.izoh) : undefined,
    samples,
    tests: tests.map((t) => ({ input: t.input, hash: sha256(canonical(t.output)) })),
    _testOutputs: tests.map((t) => t.output), // stripped before shipping
    checker: "numeric",
    mutantsKilled: `${killed}/${ms.length}`,
  });
};
function maxTopic(ts: string[]) {
  return ts.slice().sort().reverse()[0];
}

PART3.forEach((d, i) => buildProblem(d, p3text[i], 3, String(i + 1)));
PART4.forEach((d, i) => buildProblem(d, p4text[d.idx], 4, String(i + 1)));

// ---------- coverage ----------
const missing = CONCEPTS.filter((c) => conceptHits[c.id].length === 0);
for (const c of missing) fail(`Qamrov: «${c.name}» tushunchasi bo'yicha savol yo'q`);
const cov = [
  "# Qamrov hisoboti (coverage)",
  "",
  "| Mavzu | Tushuncha | Savollar |",
  "|---|---|---|",
  ...CONCEPTS.map((c) => `| ${c.topics.join(", ")} | ${c.name} | ${conceptHits[c.id].join(", ") || "**YO'Q**"} |`),
  "",
];
writeFileSync(new URL("../coverage.md", import.meta.url), cov.join("\n"));

// ---------- summary ----------
const by = (f: (q: any) => string) => questions.reduce((m: any, q) => ((m[f(q)] = (m[f(q)] ?? 0) + 1), m), {});
const p1 = questions.filter((q) => q.part === 1).length;
const p2 = questions.filter((q) => q.part === 2).length;
if (p1 < 60) fail(`1-qism savollari kam: ${p1}`);
if (p2 < 70) fail(`2-qism savollari kam: ${p2}`);
const p3n = problems.filter((p) => p.part === 3).length;
if (p3n < 25) fail(`Masalalar kam: ${p3n}`);
const diff = by((q) => q.difficulty);
console.log("Mavzular:", by((q) => q.topic));
console.log("Turlar:", by((q) => q.type));
console.log("Qiyinlik:", diff, `(easy ${Math.round((100 * diff.easy) / questions.length)}%, medium ${Math.round((100 * diff.medium) / questions.length)}%, hard ${Math.round((100 * diff.hard) / questions.length)}%)`);
console.log("Javob harflari (single_choice):", { A: letterCount[0], B: letterCount[1], C: letterCount[2], D: letterCount[3] });
console.log(`1-qism: ${p1} savol, 2-qism: ${p2} savol, 3-qism: ${p3n} masala, 4-qism: ${problems.length - p3n} qiyin masala`);
console.log("Mutantlar:", problems.map((p) => `${p.key}:${p.mutantsKilled}`).join(" "));

// teacher copy with hidden outputs (NOT shipped), and the shipped bank without them
writeFileSync(new URL("./out/bank-teacher.json", import.meta.url), JSON.stringify({ questions, problems }, null, 1));
const shipped = {
  meta: { course: "Flowgorithm: boshlang‘ich dasturlash", version: 1, generatedAt: new Date().toISOString(), rules: ALLOWED },
  topics: TOPICS,
  questions,
  problems: problems.map(({ _testOutputs, mutantsKilled, ...p }) => p),
};
writeFileSync(new URL("../src/data/bank.json", import.meta.url), JSON.stringify(shipped));

if (issues.length) {
  console.error(`\n${issues.length} ta muammo:\n- ` + issues.join("\n- "));
  process.exit(1);
}
console.log("\nBank tayyor: 0 ta muammo.");
