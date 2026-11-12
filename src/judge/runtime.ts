import type { FFunction, FType, Program, Stmt } from "./ast";
import { SHAPE_UZ } from "./ast";
import { Expr, ExprError, parseExpr } from "./expr";

export type Value =
  | { t: "Integer"; v: number }
  | { t: "Real"; v: number }
  | { t: "String"; v: string }
  | { t: "Boolean"; v: boolean };

export interface RunLimits {
  maxSteps: number;
  maxOutputChars: number;
  wallMs: number;
}

export const DEFAULT_LIMITS: RunLimits = { maxSteps: 2_000_000, maxOutputChars: 64 * 1024, wallMs: 5000 };

export type RunStatus = "ok" | "RE" | "TLE" | "OLE";

export interface RunResult {
  status: RunStatus;
  output: string;
  error?: string;
  steps: number;
}

class RunError extends Error {}
class StepLimit extends Error {}
class OutputLimit extends Error {}

interface Slot {
  type: FType;
  array: boolean;
  value?: Value;
  items?: (Value | undefined)[];
}

type Scope = Map<string, Slot>;

const exprCache = new Map<string, Expr>();
function compile(src: string): Expr {
  let e = exprCache.get(src);
  if (!e) {
    e = parseExpr(src);
    if (exprCache.size > 5000) exprCache.clear();
    exprCache.set(src, e);
  }
  return e;
}

export function formatReal(v: number): string {
  if (!Number.isFinite(v)) return Number.isNaN(v) ? "NaN" : v > 0 ? "Infinity" : "-Infinity";
  const r = Number(v.toPrecision(15));
  if (Object.is(r, -0)) return "0";
  if (Math.abs(r) >= 1e15 || (Math.abs(r) < 1e-5 && r !== 0)) return r.toExponential().replace("e+", "E+").replace("e-", "E-");
  return String(r);
}

export function show(v: Value): string {
  switch (v.t) {
    case "Integer":
      return String(v.v);
    case "Real":
      return formatReal(v.v);
    case "String":
      return v.v;
    case "Boolean":
      return v.v ? "true" : "false";
  }
}

const INT = (v: number): Value => ({ t: "Integer", v });
const REAL = (v: number): Value => ({ t: "Real", v });
const STR = (v: string): Value => ({ t: "String", v });
const BOOL = (v: boolean): Value => ({ t: "Boolean", v });

function isNum(v: Value): v is { t: "Integer" | "Real"; v: number } {
  return v.t === "Integer" || v.t === "Real";
}

function defaultValue(t: FType): Value {
  return t === "Integer" ? INT(0) : t === "Real" ? REAL(0) : t === "String" ? STR("") : BOOL(false);
}

// Deterministic PRNG for Random(n) so judging is reproducible
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function run(prog: Program, stdin: string, limits: Partial<RunLimits> = {}): RunResult {
  const L = { ...DEFAULT_LIMITS, ...limits };
  const lines = stdin.replace(/\r\n?/g, "\n").split("\n");
  // drop a single trailing empty line produced by a final newline
  if (lines.length && lines[lines.length - 1] === "") lines.pop();
  let lineIdx = 0;
  let out = "";
  let steps = 0;
  const t0 = Date.now();
  const rnd = mulberry32(12345);
  const funcs = new Map<string, FFunction>();
  for (const f of prog.functions) funcs.set(f.name.toLowerCase(), f);
  let where = "";
  let depth = 0;

  const fail = (msg: string): never => {
    throw new RunError(msg);
  };

  const tick = () => {
    steps++;
    if (steps > L.maxSteps) throw new StepLimit();
    if ((steps & 0x3fff) === 0 && Date.now() - t0 > L.wallMs) throw new StepLimit();
  };

  const write = (s: string) => {
    out += s;
    if (out.length > L.maxOutputChars) throw new OutputLimit();
  };

  function slotOf(scope: Scope, name: string): Slot {
    const s = scope.get(name.toLowerCase());
    if (!s) fail(`«${name}» o‘zgaruvchisi e’lon qilinmagan (Declare yo‘q)`);
    return s!;
  }

  function coerce(v: Value, t: FType, name: string): Value {
    if (t === "Integer") {
      if (v.t === "Integer") return v;
      if (v.t === "Real") {
        if (!Number.isFinite(v.v)) fail(`«${name}» ga butun bo‘lmagan qiymat yozilmoqda`);
        return INT(Math.trunc(v.v));
      }
      fail(`Integer turidagi «${name}» o‘zgaruvchisiga ${v.t} qiymat yozib bo‘lmaydi`);
    }
    if (t === "Real") {
      if (isNum(v)) return REAL(v.v);
      fail(`Real turidagi «${name}» o‘zgaruvchisiga ${v.t} qiymat yozib bo‘lmaydi`);
    }
    if (t === "String") {
      if (v.t === "String") return v;
      fail(`String turidagi «${name}» o‘zgaruvchisiga ${v.t} qiymat yozib bo‘lmaydi`);
    }
    if (v.t === "Boolean") return v;
    return fail(`Boolean turidagi «${name}» o‘zgaruvchisiga ${v.t} qiymat yozib bo‘lmaydi`);
  }

  function num(v: Value, op: string): number {
    if (!isNum(v)) fail(`«${op}» amali son talab qiladi, lekin ${v.t} berildi`);
    return (v as { v: number }).v;
  }
  function bool(v: Value, op: string): boolean {
    if (v.t !== "Boolean") fail(`«${op}» amali mantiqiy (Boolean) qiymat talab qiladi, lekin ${v.t} berildi`);
    return (v as { v: boolean }).v;
  }

  function evalE(e: Expr, scope: Scope): Value {
    switch (e.e) {
      case "num":
        return e.int ? INT(e.v) : REAL(e.v);
      case "str":
        return STR(e.v);
      case "bool":
        return BOOL(e.v);
      case "var": {
        if (e.name.toLowerCase() === "pi") {
          if (!scope.has("pi")) return REAL(Math.PI);
        }
        const s = slotOf(scope, e.name);
        if (s.array) fail(`«${e.name}» massiv, indeks kerak`);
        if (!s.value) fail(`«${e.name}» o‘zgaruvchisida hali qiymat yo‘q (avval Assign yoki Input qiling)`);
        return s.value!;
      }
      case "index": {
        const s = slotOf(scope, e.name);
        if (!s.array) fail(`«${e.name}» massiv emas`);
        const ix = indexOf(s, evalE(e.index, scope), e.name);
        const v = s.items![ix];
        if (!v) fail(`«${e.name}[${ix}]» elementida hali qiymat yo‘q`);
        return v!;
      }
      case "un": {
        const a = evalE(e.a, scope);
        if (e.op === "-") return a.t === "Integer" ? INT(-a.v) : REAL(-num(a, "-"));
        return BOOL(!bool(a, "not"));
      }
      case "bin":
        return binop(e.op, e, scope);
      case "call":
        return callFn(e.name, e.args, scope, true)!;
    }
  }

  function binop(op: string, e: Extract<Expr, { e: "bin" }>, scope: Scope): Value {
    if (op === "&&") {
      const a = bool(evalE(e.a, scope), "and");
      if (!a) return BOOL(false);
      return BOOL(bool(evalE(e.b, scope), "and"));
    }
    if (op === "||") {
      const a = bool(evalE(e.a, scope), "or");
      if (a) return BOOL(true);
      return BOOL(bool(evalE(e.b, scope), "or"));
    }
    const a = evalE(e.a, scope);
    const b = evalE(e.b, scope);
    switch (op) {
      case "&":
        return STR(show(a) + show(b));
      case "+":
        if (a.t === "String" && b.t === "String") return STR(a.v + b.v);
        return a.t === "Integer" && b.t === "Integer" ? INT(a.v + b.v) : REAL(num(a, "+") + num(b, "+"));
      case "-":
        return a.t === "Integer" && b.t === "Integer" ? INT(a.v - b.v) : REAL(num(a, "-") - num(b, "-"));
      case "*":
        return a.t === "Integer" && b.t === "Integer" ? INT(a.v * b.v) : REAL(num(a, "*") * num(b, "*"));
      case "/": {
        const x = num(a, "/"),
          y = num(b, "/");
        if (y === 0) fail("Nolga bo‘lish (/) mumkin emas");
        return REAL(x / y);
      }
      case "%": {
        const x = num(a, "mod"),
          y = num(b, "mod");
        if (y === 0) fail("Nolga bo‘lishdagi qoldiq (mod 0) mumkin emas");
        return a.t === "Integer" && b.t === "Integer" ? INT(x % y) : REAL(x % y);
      }
      case "^":
        return REAL(Math.pow(num(a, "^"), num(b, "^")));
      case "==":
      case "!=":
      case "<":
      case "<=":
      case ">":
      case ">=": {
        let c: number;
        if (isNum(a) && isNum(b)) c = a.v < b.v ? -1 : a.v > b.v ? 1 : 0;
        else if (a.t === "String" && b.t === "String") c = a.v < b.v ? -1 : a.v > b.v ? 1 : 0;
        else if (a.t === "Boolean" && b.t === "Boolean" && (op === "==" || op === "!=")) c = a.v === b.v ? 0 : 1;
        else return fail(`${a.t} va ${b.t} qiymatlarini solishtirib bo‘lmaydi`);
        const r =
          op === "==" ? c === 0 : op === "!=" ? c !== 0 : op === "<" ? c < 0 : op === "<=" ? c <= 0 : op === ">" ? c > 0 : c >= 0;
        return BOOL(r);
      }
    }
    return fail(`Noma’lum amal ${op}`);
  }

  function indexOf(s: Slot, v: Value, name: string): number {
    if (v.t !== "Integer") fail(`«${name}» indeksi butun son bo‘lishi kerak`);
    const ix = (v as { v: number }).v;
    if (ix < 0 || ix >= s.items!.length) fail(`«${name}[${ix}]»: indeks chegaradan tashqarida (0..${s.items!.length - 1})`);
    return ix;
  }

  function intrinsic(name: string, args: Value[]): Value | undefined {
    const need = (n: number) => {
      if (args.length !== n) fail(`${name}() funksiyasi ${n} ta argument oladi`);
    };
    const n0 = () => num(args[0], name);
    switch (name) {
      case "abs":
        need(1);
        return args[0].t === "Integer" ? INT(Math.abs(args[0].v)) : REAL(Math.abs(n0()));
      case "int":
        need(1);
        return INT(Math.trunc(n0()));
      case "sqrt":
        need(1);
        if (n0() < 0) fail("Sqrt() manfiy sondan olinmaydi");
        return REAL(Math.sqrt(n0()));
      case "sin":
        need(1);
        return REAL(Math.sin(n0()));
      case "cos":
        need(1);
        return REAL(Math.cos(n0()));
      case "tan":
        need(1);
        return REAL(Math.tan(n0()));
      case "arcsin":
        need(1);
        return REAL(Math.asin(n0()));
      case "arccos":
        need(1);
        return REAL(Math.acos(n0()));
      case "arctan":
        need(1);
        return REAL(Math.atan(n0()));
      case "log":
        need(1);
        if (n0() <= 0) fail("Log() faqat musbat son uchun");
        return REAL(Math.log(n0()));
      case "log10":
        need(1);
        if (n0() <= 0) fail("Log10() faqat musbat son uchun");
        return REAL(Math.log10(n0()));
      case "sgn":
        need(1);
        return INT(Math.sign(n0()));
      case "random": {
        need(1);
        const n = Math.trunc(n0());
        if (n <= 0) fail("Random(n) uchun n musbat bo‘lishi kerak");
        return INT(Math.floor(rnd() * n));
      }
      case "len":
        need(1);
        if (args[0].t !== "String") fail("Len() matn (String) oladi");
        return INT((args[0].v as string).length);
      case "char": {
        need(2);
        if (args[0].t !== "String") fail("Char() birinchi argumenti matn bo‘lishi kerak");
        const s = args[0].v as string;
        const i = Math.trunc(num(args[1], "Char"));
        if (i < 0 || i >= s.length) fail(`Char(): indeks ${i} matn chegarasidan tashqarida`);
        return STR(s[i]);
      }
      case "tochar":
        need(1);
        return STR(String.fromCharCode(Math.trunc(n0())));
      case "tocode":
        need(1);
        if (args[0].t !== "String" || (args[0].v as string).length === 0) fail("ToCode() bitta belgi oladi");
        return INT((args[0].v as string).charCodeAt(0));
      case "tofixed": {
        need(2);
        return STR(num(args[0], "ToFixed").toFixed(Math.max(0, Math.trunc(num(args[1], "ToFixed")))));
      }
      case "tointeger": {
        need(1);
        if (isNum(args[0])) return INT(Math.trunc(args[0].v));
        const s = String(args[0].v).trim();
        if (!/^[+-]?\d+$/.test(s)) fail(`ToInteger(): «${s}» butun son emas`);
        return INT(parseInt(s, 10));
      }
      case "toreal": {
        need(1);
        if (isNum(args[0])) return REAL(args[0].v);
        const s = String(args[0].v).trim();
        if (!/^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/.test(s)) fail(`ToReal(): «${s}» son emas`);
        return REAL(parseFloat(s));
      }
      case "tostring":
        need(1);
        return STR(show(args[0]));
    }
    return undefined;
  }

  function callFn(name: string, argEx: Expr[], scope: Scope, needValue: boolean): Value | undefined {
    const lw = name.toLowerCase();
    if (lw === "size") {
      if (argEx.length !== 1 || (argEx[0].e !== "var" && argEx[0].e !== "index")) fail("Size() massiv nomini oladi");
      const s = slotOf(scope, (argEx[0] as { name: string }).name);
      if (!s.array) fail("Size() faqat massiv uchun");
      return INT(s.items!.length);
    }
    const f = funcs.get(lw);
    if (!f) {
      const args = argEx.map((a) => evalE(a, scope));
      const r = intrinsic(lw, args);
      if (r === undefined) fail(`«${name}» funksiyasi mavjud emas`);
      return r;
    }
    if (f.params.length !== argEx.length) fail(`${f.name}() ${f.params.length} ta argument oladi`);
    const local: Scope = new Map();
    f.params.forEach((p, i) => {
      const a = argEx[i];
      if (p.array) {
        if (a.e !== "var") fail(`${f.name}(): ${p.name} uchun massiv berilishi kerak`);
        const s = slotOf(scope, (a as { name: string }).name);
        if (!s.array) fail(`${f.name}(): ${p.name} uchun massiv berilishi kerak`);
        local.set(p.name.toLowerCase(), s); // arrays by reference
      } else {
        local.set(p.name.toLowerCase(), { type: p.type, array: false, value: coerce(evalE(a, scope), p.type, p.name) });
      }
    });
    depth++;
    if (depth > 500) fail("Juda chuqur rekursiya");
    execBlock(f.body, local, f.name);
    depth--;
    if (f.type === "None") {
      if (needValue) fail(`${f.name}() qiymat qaytarmaydi`);
      return undefined;
    }
    const rv = local.get(f.variable.toLowerCase());
    if (!rv || !rv.value) fail(`${f.name}() qaytariladigan «${f.variable}» qiymatiga ega emas`);
    return rv!.value;
  }

  function assignTo(target: string, v: Value, scope: Scope) {
    const m = /^\s*([A-Za-z_À-￿][\wÀ-￿]*)\s*(?:\[(.*)\])?\s*$/.exec(target);
    if (!m) fail(`Noto‘g‘ri o‘zgaruvchi nomi: «${target}»`);
    const [, name, idx] = m!;
    const s = slotOf(scope, name);
    if (idx !== undefined) {
      if (!s.array) fail(`«${name}» massiv emas`);
      const ix = indexOf(s, evalE(compile(idx), scope), name);
      s.items![ix] = coerce(v, s.type, name);
    } else {
      if (s.array) fail(`«${name}» massiv, indeks kerak`);
      s.value = coerce(v, s.type, name);
    }
  }

  function parseInputLine(line: string, t: FType, name: string): Value {
    const s = line.trim();
    switch (t) {
      case "Integer":
        if (!/^[+-]?\d+$/.test(s)) fail(`Input: «${name}» (Integer) uchun «${line}» butun son emas`);
        return INT(parseInt(s, 10));
      case "Real":
        if (!/^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/.test(s)) fail(`Input: «${name}» (Real) uchun «${line}» son emas`);
        return REAL(parseFloat(s));
      case "Boolean":
        if (/^true$/i.test(s)) return BOOL(true);
        if (/^false$/i.test(s)) return BOOL(false);
        return fail(`Input: «${name}» (Boolean) uchun true yoki false kerak`);
      default:
        return STR(line);
    }
  }

  function cond(src: string, scope: Scope, what: string): boolean {
    const v = evalE(compile(src), scope);
    if (v.t !== "Boolean") fail(`${what} sharti mantiqiy (true/false) bo‘lishi kerak`);
    return v.v as boolean;
  }

  function execBlock(stmts: Stmt[], scope: Scope, fname: string) {
    for (const s of stmts) exec(s, scope, fname);
  }

  function exec(s: Stmt, scope: Scope, fname: string) {
    tick();
    where = `${fname} → ${SHAPE_UZ[s.k]} (#${s.id})`;
    try {
      switch (s.k) {
        case "comment":
          return;
        case "declare": {
          for (const n of s.names) {
            if (!/^[A-Za-z_À-￿][\wÀ-￿]*$/.test(n)) fail(`Noto‘g‘ri o‘zgaruvchi nomi: «${n}»`);
            if (scope.has(n.toLowerCase())) fail(`«${n}» allaqachon e’lon qilingan`);
            if (s.array) {
              const sz = evalE(compile(s.size), scope);
              if (sz.t !== "Integer" || (sz.v as number) < 0) fail(`«${n}» massiv o‘lchami musbat butun son bo‘lishi kerak`);
              scope.set(n.toLowerCase(), { type: s.type, array: true, items: new Array(sz.v as number).fill(undefined) });
            } else scope.set(n.toLowerCase(), { type: s.type, array: false });
          }
          return;
        }
        case "assign":
          return assignTo(s.variable, evalE(compile(s.expression), scope), scope);
        case "input": {
          const m = /^\s*([A-Za-z_À-￿][\wÀ-￿]*)/.exec(s.variable);
          if (!m) fail(`Input: noto‘g‘ri o‘zgaruvchi «${s.variable}»`);
          const slot = slotOf(scope, m![1]);
          if (lineIdx >= lines.length) fail("Input: kiritish ma’lumotlari tugadi (qiymat yetishmadi)");
          assignTo(s.variable, parseInputLine(lines[lineIdx++], slot.type, s.variable), scope);
          return;
        }
        case "output": {
          const v = evalE(compile(s.expression), scope);
          write(show(v) + (s.newline ? "\n" : ""));
          return;
        }
        case "if":
          if (cond(s.expression, scope, "If")) execBlock(s.then, scope, fname);
          else execBlock(s.else, scope, fname);
          return;
        case "while":
          while (cond(s.expression, scope, "While")) {
            tick();
            execBlock(s.body, scope, fname);
          }
          return;
        case "do":
          do {
            tick();
            execBlock(s.body, scope, fname);
          } while (cond(s.expression, scope, "Do"));
          return;
        case "for": {
          const slot = slotOf(scope, s.variable);
          if (slot.array || (slot.type !== "Integer" && slot.type !== "Real"))
            fail(`For o‘zgaruvchisi «${s.variable}» Integer yoki Real bo‘lishi kerak`);
          const start = num(evalE(compile(s.start), scope), "For");
          const end = num(evalE(compile(s.end), scope), "For");
          const step = num(evalE(compile(s.step), scope), "For");
          if (step <= 0) fail("For qadami (step) musbat bo‘lishi kerak");
          let i = start;
          for (;;) {
            if (s.dec ? i < end : i > end) break;
            assignTo(s.variable, slot.type === "Integer" ? INT(Math.trunc(i)) : REAL(i), scope);
            tick();
            execBlock(s.body, scope, fname);
            where = `${fname} → For (#${s.id})`;
            const cur = num(slot.value!, "For");
            i = s.dec ? cur - step : cur + step;
          }
          return;
        }
        case "call": {
          const e = compile(s.expression);
          if (e.e !== "call") fail("Call elementida funksiya chaqiruvi bo‘lishi kerak, masalan: Hisobla(5)");
          callFn((e as { name: string }).name, (e as { args: Expr[] }).args, scope, false);
          return;
        }
      }
    } catch (err) {
      if (err instanceof ExprError) throw new RunError(`Ifodada xato: ${err.message}`);
      throw err;
    }
  }

  try {
    const main = funcs.get("main")!;
    execBlock(main.body, new Map(), main.name);
    return { status: "ok", output: out, steps };
  } catch (err) {
    if (err instanceof StepLimit) return { status: "TLE", output: out, steps, error: "Vaqt yoki qadamlar chegarasi oshib ketdi (cheksiz sikl bo‘lishi mumkin)" };
    if (err instanceof OutputLimit) return { status: "OLE", output: out.slice(0, L.maxOutputChars), steps, error: "Chiqish hajmi juda katta" };
    if (err instanceof RunError) return { status: "RE", output: out, steps, error: `${where}: ${err.message}` };
    if (err instanceof RangeError) return { status: "RE", output: out, steps, error: `${where}: juda chuqur chaqiriq` };
    return { status: "RE", output: out, steps, error: `${where}: ${(err as Error).message}` };
  }
}
