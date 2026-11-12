// Compact builder used to author programs (bank + tests) and serialise them as real .fprg XML.
import { encodeAttr } from "./xml";
import type { FType } from "./ast";

export type B =
  | { k: "declare"; names: string; type: FType; array?: boolean; size?: string }
  | { k: "assign"; variable: string; expression: string }
  | { k: "input"; variable: string }
  | { k: "output"; expression: string; newline?: boolean }
  | { k: "if"; expression: string; then: B[]; else: B[] }
  | { k: "while"; expression: string; body: B[] }
  | { k: "for"; variable: string; start: string; end: string; dec?: boolean; step?: string; body: B[] }
  | { k: "comment"; text: string };

export const D = (names: string, type: FType = "Integer"): B => ({ k: "declare", names, type });
export const A = (variable: string, expression: string): B => ({ k: "assign", variable, expression });
export const I = (variable: string): B => ({ k: "input", variable });
export const O = (expression: string, newline = true): B => ({ k: "output", expression, newline });
export const IF = (expression: string, then: B[], els: B[] = []): B => ({ k: "if", expression, then, else: els });
export const W = (expression: string, body: B[]): B => ({ k: "while", expression, body });
export const F = (variable: string, start: string, end: string, body: B[], opts: { dec?: boolean; step?: string } = {}): B => ({
  k: "for",
  variable,
  start,
  end,
  body,
  ...opts,
});
export const C = (text: string): B => ({ k: "comment", text });

export function toFprg(body: B[], name = "Dastur", author = "Imtihon"): string {
  const ind = (n: number) => "    ".repeat(n);
  const lines: string[] = [];
  const emit = (b: B[], d: number) => {
    for (const s of b) {
      switch (s.k) {
        case "declare":
          lines.push(`${ind(d)}<declare name="${encodeAttr(s.names)}" type="${s.type}" array="${s.array ? "True" : "False"}" size="${encodeAttr(s.size ?? "")}"/>`);
          break;
        case "assign":
          lines.push(`${ind(d)}<assign variable="${encodeAttr(s.variable)}" expression="${encodeAttr(s.expression)}"/>`);
          break;
        case "input":
          lines.push(`${ind(d)}<input variable="${encodeAttr(s.variable)}"/>`);
          break;
        case "output":
          lines.push(`${ind(d)}<output expression="${encodeAttr(s.expression)}" newline="${s.newline === false ? "False" : "True"}"/>`);
          break;
        case "comment":
          lines.push(`${ind(d)}<comment text="${encodeAttr(s.text)}"/>`);
          break;
        case "if":
          lines.push(`${ind(d)}<if expression="${encodeAttr(s.expression)}">`);
          if (s.then.length) {
            lines.push(`${ind(d + 1)}<then>`);
            emit(s.then, d + 2);
            lines.push(`${ind(d + 1)}</then>`);
          } else lines.push(`${ind(d + 1)}<then/>`);
          if (s.else.length) {
            lines.push(`${ind(d + 1)}<else>`);
            emit(s.else, d + 2);
            lines.push(`${ind(d + 1)}</else>`);
          } else lines.push(`${ind(d + 1)}<else/>`);
          lines.push(`${ind(d)}</if>`);
          break;
        case "while":
          lines.push(`${ind(d)}<while expression="${encodeAttr(s.expression)}">`);
          emit(s.body, d + 1);
          lines.push(`${ind(d)}</while>`);
          break;
        case "for":
          lines.push(
            `${ind(d)}<for variable="${encodeAttr(s.variable)}" start="${encodeAttr(s.start)}" end="${encodeAttr(s.end)}" direction="${s.dec ? "dec" : "inc"}" step="${encodeAttr(s.step ?? "1")}">`,
          );
          emit(s.body, d + 1);
          lines.push(`${ind(d)}</for>`);
          break;
      }
    }
  };
  emit(body, 3);
  return [
    `<?xml version="1.0"?>`,
    `<flowgorithm fileversion="3.0">`,
    `    <attributes>`,
    `        <attribute name="name" value="${encodeAttr(name)}"/>`,
    `        <attribute name="authors" value="${encodeAttr(author)}"/>`,
    `        <attribute name="about" value=""/>`,
    `    </attributes>`,
    `    <function name="Main" type="None" variable="">`,
    `        <parameters/>`,
    `        <body>`,
    ...lines,
    `        </body>`,
    `    </function>`,
    `</flowgorithm>`,
    ``,
  ].join("\n");
}
