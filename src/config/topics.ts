export interface Topic {
  id: string;
  name: string;
  part: number;
}

export const TOPICS: Topic[] = [
  { id: "S1", name: "Sanoq sistemalari", part: 1 },
  { id: "S2", name: "Kompyuter apparatlari", part: 1 },
  { id: "S3", name: "Excel formulalari", part: 2 },
  { id: "S4", name: "Flowgorithm (test)", part: 2 },
  { id: "S5", name: "Floor, Ceil, Round", part: 2 },
  // topics of the Flowgorithm problems (parts 3–4)
  { id: "T1", name: "Oʻzgaruvchilar va maʼlumot turlari", part: 3 },
  { id: "T2", name: "Input va Output", part: 3 },
  { id: "T3", name: "Assign va arifmetik amallar", part: 3 },
  { id: "T4", name: "Butun boʻlish va qoldiq (mod)", part: 3 },
  { id: "T5", name: "If (shart)", part: 3 },
  { id: "T6", name: "Ichma-ich If", part: 3 },
  { id: "T7", name: "For sikli", part: 3 },
  { id: "T8", name: "For va If birgalikda", part: 3 },
  { id: "T9", name: "Ichma-ich For (qiyin masalalar)", part: 4 },
];

const ARITH = ["+", "-", "*", "/", "%", "^", "&", "u-"];
const LOGIC = ["==", "!=", "<", "<=", ">", ">=", "&&", "||", "u!"];
const BASIC = ["declare", "assign", "input", "output", "comment"];

/** Allowed constructs per topic. While, Do, Call, arrays and intrinsic functions are not taught in this course. */
export const ALLOWED: Record<string, { stmts: string[]; ops: string[]; maxForDepth: number }> = {
  T1: { stmts: BASIC, ops: ARITH, maxForDepth: 0 },
  T2: { stmts: BASIC, ops: ARITH, maxForDepth: 0 },
  T3: { stmts: BASIC, ops: ARITH, maxForDepth: 0 },
  T4: { stmts: BASIC, ops: ARITH, maxForDepth: 0 },
  T5: { stmts: [...BASIC, "if"], ops: [...ARITH, ...LOGIC], maxForDepth: 0 },
  T6: { stmts: [...BASIC, "if"], ops: [...ARITH, ...LOGIC], maxForDepth: 0 },
  T7: { stmts: [...BASIC, "for"], ops: [...ARITH, ...LOGIC], maxForDepth: 1 },
  T8: { stmts: [...BASIC, "if", "for"], ops: [...ARITH, ...LOGIC], maxForDepth: 1 },
  T9: { stmts: [...BASIC, "if", "for"], ops: [...ARITH, ...LOGIC], maxForDepth: 2 },
};

export interface Concept {
  id: string;
  name: string;
  topics: string[];
  test: RegExp;
}

// Every concept taught in the lessons must be tested by at least one question (checked by npm run bank).
export const CONCEPTS: Concept[] = [
  { id: "s-digits", name: "Raqamlar va asos (2, 3, 10)", topics: ["S1"], test: /raqam|asosi/ },
  { id: "s-bit", name: "Bit va bayt", topics: ["S1"], test: /bit|bayt/ },
  { id: "s-2to10", name: "2-lik → 10-lik", topics: ["S1"], test: /₂ = \?₁₀/ },
  { id: "s-10to2", name: "10-lik → 2-lik", topics: ["S1"], test: /₁₀ = \?₂/ },
  { id: "s-3to10", name: "3-lik → 10-lik", topics: ["S1"], test: /₃ = \?₁₀/ },
  { id: "s-10to3", name: "10-lik → 3-lik", topics: ["S1"], test: /₁₀ = \?₃/ },
  { id: "s-2to3", name: "2-lik ↔ 3-lik", topics: ["S1"], test: /sonini/ },
  { id: "s-ops", name: "Turli asosdagi sonlar bilan amallar", topics: ["S1"], test: /[+−×] \d/ },
  { id: "s-cmp", name: "Sonlarni solishtirish", topics: ["S1"], test: /eng katta|eng kichik|tenglik/ },
  { id: "h-cpu", name: "CPU", topics: ["S2"], test: /cpu|protsessor/ },
  { id: "h-ram", name: "RAM", topics: ["S2"], test: /ram/ },
  { id: "h-ssd", name: "SSD / HDD", topics: ["S2"], test: /ssd|hdd/ },
  { id: "h-gpu", name: "GPU", topics: ["S2"], test: /gpu/ },
  { id: "h-io", name: "Kiritish / chiqarish qurilmalari", topics: ["S2"], test: /kiritish|chiqarish/ },
  { id: "e-basic", name: "Excel: formula, manzil, diapazon", topics: ["S3"], test: /manzil|diapazon|boshlanadi/ },
  { id: "e-arith", name: "Excel: arifmetik formulalar", topics: ["S3"], test: /=a1[+\-*/]/ },
  { id: "e-sum", name: "SUM / AVERAGE", topics: ["S3"], test: /sum\(|average/ },
  { id: "e-maxmin", name: "MAX / MIN", topics: ["S3"], test: /max|min/ },
  { id: "e-count", name: "COUNT va COUNTA farqi", topics: ["S3"], test: /counta/ },
  { id: "e-if", name: "IF va ichma-ich formulalar", topics: ["S3"], test: /if\(/ },
  { id: "e-abs", name: "Nisbiy / absolyut manzil", topics: ["S3"], test: /\$a\$1/ },
  { id: "e-menu", name: "Filter / Sort menyusi", topics: ["S3"], test: /filter|sort/ },
  { id: "e-err", name: "Xato qiymatlar (#VALUE!, #DIV/0!)", topics: ["S3"], test: /#value|#div/ },
  { id: "f-input", name: "Input / Output elementlari", topics: ["S4"], test: /input|output/ },
  { id: "f-declare", name: "Declare va maʼlumot turlari", topics: ["S4"], test: /declare|integer|string|real/ },
  { id: "f-assign", name: "Assign", topics: ["S4"], test: /assign/ },
  { id: "f-if", name: "If", topics: ["S4"], test: /\bif\b/ },
  { id: "f-for", name: "For sikli", topics: ["S4"], test: /\bfor\b/ },
  { id: "r-floor", name: "floor", topics: ["S5"], test: /floor/ },
  { id: "r-ceil", name: "ceil", topics: ["S5"], test: /ceil/ },
  { id: "r-round", name: "round", topics: ["S5"], test: /round/ },
  { id: "r-neg", name: "Manfiy sonlar bilan yaxlitlash", topics: ["S5"], test: /\(−/ },
  { id: "r-life", name: "Hayotiy masalalar (yuqoriga / pastga yaxlitlash)", topics: ["S5"], test: /sotib|kerak|sig‘adi|qatnov/ },
];
