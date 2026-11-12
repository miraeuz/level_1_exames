// Flowgorithm expression tokenizer + precedence parser (no eval).
// Precedence (docs): unary - ! not (8) > ^ (7) > * / % mod (6) > + - (5) > & (4)
// > relational (3) > and && (2) > or || (1)

export type Tok =
  | { t: "num"; v: number; int: boolean; p: number }
  | { t: "str"; v: string; p: number }
  | { t: "id"; v: string; p: number }
  | { t: "op"; v: string; p: number };

export type Expr =
  | { e: "num"; v: number; int: boolean }
  | { e: "str"; v: string }
  | { e: "bool"; v: boolean }
  | { e: "var"; name: string }
  | { e: "index"; name: string; index: Expr }
  | { e: "call"; name: string; args: Expr[] }
  | { e: "un"; op: string; a: Expr }
  | { e: "bin"; op: string; a: Expr; b: Expr };

export class ExprError extends Error {}

const OPS = ["==", "!=", "<>", "<=", ">=", "&&", "||", "+", "-", "*", "/", "%", "^", "&", "(", ")", ",", "[", "]", "<", ">", "=", "!"];

export function tokenize(src: string): Tok[] {
  const out: Tok[] = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (/\s/.test(c)) {
      i++;
      continue;
    }
    if (/[0-9]/.test(c) || (c === "." && /[0-9]/.test(src[i + 1] ?? ""))) {
      const s = i;
      while (/[0-9]/.test(src[i] ?? "")) i++;
      let int = true;
      if (src[i] === "." && /[0-9]/.test(src[i + 1] ?? "")) {
        int = false;
        i++;
        while (/[0-9]/.test(src[i] ?? "")) i++;
      }
      out.push({ t: "num", v: Number(src.slice(s, i)), int, p: s });
      continue;
    }
    if (c === '"' || c === "'") {
      const e = src.indexOf(c, i + 1);
      if (e < 0) throw new ExprError("Matn qo‘shtirnog‘i yopilmagan");
      out.push({ t: "str", v: src.slice(i + 1, e), p: i });
      i = e + 1;
      continue;
    }
    if (/[A-Za-z_À-￿]/.test(c)) {
      const s = i;
      while (/[A-Za-z0-9_À-￿]/.test(src[i] ?? "")) i++;
      out.push({ t: "id", v: src.slice(s, i), p: s });
      continue;
    }
    const op = OPS.find((o) => src.startsWith(o, i));
    if (!op) throw new ExprError(`Noma’lum belgi: «${c}»`);
    out.push({ t: "op", v: op, p: i });
    i += op.length;
  }
  return out;
}

const KW_OP: Record<string, string> = { and: "&&", or: "||", not: "!", mod: "%" };

export function parseExpr(src: string): Expr {
  if (src.trim() === "") throw new ExprError("Ifoda bo‘sh");
  const toks = tokenize(src).map((t) =>
    t.t === "id" && KW_OP[t.v.toLowerCase()] ? ({ t: "op", v: KW_OP[t.v.toLowerCase()], p: t.p } as Tok) : t,
  );
  let i = 0;
  const peek = () => toks[i];
  const isOp = (v: string) => peek()?.t === "op" && peek()!.v === v;
  const expect = (v: string) => {
    if (!isOp(v)) throw new ExprError(`«${v}» kutilgan`);
    i++;
  };

  const bin = (next: () => Expr, ops: string[], norm: (o: string) => string = (o) => o) => (): Expr => {
    let a = next();
    while (peek()?.t === "op" && ops.includes(String(peek()!.v))) {
      const op = norm((toks[i++] as Tok).v as string);
      a = { e: "bin", op, a, b: next() };
    }
    return a;
  };

  const primary = (): Expr => {
    const t = toks[i++];
    if (!t) throw new ExprError("Ifoda to‘liq emas");
    if (t.t === "num") return { e: "num", v: t.v, int: t.int };
    if (t.t === "str") return { e: "str", v: t.v };
    if (t.t === "id") {
      const lw = t.v.toLowerCase();
      if (lw === "true") return { e: "bool", v: true };
      if (lw === "false") return { e: "bool", v: false };
      if (isOp("(")) {
        i++;
        const args: Expr[] = [];
        if (!isOp(")")) {
          for (;;) {
            args.push(orE());
            if (isOp(",")) {
              i++;
              continue;
            }
            break;
          }
        }
        expect(")");
        return { e: "call", name: t.v, args };
      }
      if (isOp("[")) {
        i++;
        const index = orE();
        expect("]");
        return { e: "index", name: t.v, index };
      }
      return { e: "var", name: t.v };
    }
    if (t.v === "(") {
      const x = orE();
      expect(")");
      return x;
    }
    throw new ExprError(`Kutilmagan belgi: «${t.v}»`);
  };

  const unary = (): Expr => {
    if (isOp("-") || isOp("!") || isOp("+")) {
      const op = (toks[i++] as Tok).v as string;
      const a = unary();
      return op === "+" ? a : { e: "un", op, a };
    }
    return primary();
  };
  const pow = (): Expr => {
    const a = unary();
    if (isOp("^")) {
      i++;
      return { e: "bin", op: "^", a, b: pow() };
    }
    return a;
  };
  const mul = bin(pow, ["*", "/", "%"]);
  const add = bin(mul, ["+", "-"]);
  const cat = bin(add, ["&"]);
  const rel = bin(cat, ["==", "=", "!=", "<>", "<", "<=", ">", ">="], (o) => (o === "=" ? "==" : o === "<>" ? "!=" : o));
  const andE = bin(rel, ["&&"]);
  const orE = bin(andE, ["||"]);

  const r = orE();
  if (i < toks.length) throw new ExprError(`Ortiqcha belgi: «${(toks[i] as Tok).v}»`);
  return r;
}

export function collectNames(e: Expr, out = new Set<string>()): Set<string> {
  switch (e.e) {
    case "var":
      out.add(e.name.toLowerCase());
      break;
    case "index":
      out.add(e.name.toLowerCase());
      collectNames(e.index, out);
      break;
    case "call":
      e.args.forEach((a) => collectNames(a, out));
      break;
    case "un":
      collectNames(e.a, out);
      break;
    case "bin":
      collectNames(e.a, out);
      collectNames(e.b, out);
      break;
  }
  return out;
}

export function collectOps(e: Expr, out = new Set<string>()): Set<string> {
  if (e.e === "bin") {
    out.add(e.op);
    collectOps(e.a, out);
    collectOps(e.b, out);
  } else if (e.e === "un") {
    out.add("u" + e.op);
    collectOps(e.a, out);
  } else if (e.e === "call") {
    out.add("fn:" + e.name.toLowerCase());
    e.args.forEach((a) => collectOps(a, out));
  } else if (e.e === "index") {
    out.add("index");
    collectOps(e.index, out);
  }
  return out;
}
