export type FType = "Integer" | "Real" | "String" | "Boolean";

export type Stmt =
  | { k: "declare"; id: number; names: string[]; type: FType; array: boolean; size: string }
  | { k: "assign"; id: number; variable: string; expression: string }
  | { k: "input"; id: number; variable: string }
  | { k: "output"; id: number; expression: string; newline: boolean }
  | { k: "if"; id: number; expression: string; then: Stmt[]; else: Stmt[] }
  | { k: "while"; id: number; expression: string; body: Stmt[] }
  | { k: "do"; id: number; expression: string; body: Stmt[] }
  | { k: "for"; id: number; variable: string; start: string; end: string; dec: boolean; step: string; body: Stmt[] }
  | { k: "call"; id: number; expression: string }
  | { k: "comment"; id: number; text: string };

export interface Param {
  name: string;
  type: FType;
  array: boolean;
}

export interface FFunction {
  name: string;
  type: FType | "None";
  variable: string; // return variable
  params: Param[];
  body: Stmt[];
}

export interface Program {
  fileversion: string;
  attributes: Record<string, string>;
  functions: FFunction[];
}

export const SHAPE_UZ: Record<Stmt["k"], string> = {
  declare: "Declare",
  assign: "Assign",
  input: "Input",
  output: "Output",
  if: "If",
  while: "While",
  do: "Do",
  for: "For",
  call: "Call",
  comment: "Comment",
};

export function walk(stmts: Stmt[], fn: (s: Stmt, depth: number) => void, depth = 0) {
  for (const s of stmts) {
    fn(s, depth);
    if (s.k === "if") {
      walk(s.then, fn, depth + 1);
      walk(s.else, fn, depth + 1);
    } else if (s.k === "while" || s.k === "do" || s.k === "for") walk(s.body, fn, depth + 1);
  }
}
