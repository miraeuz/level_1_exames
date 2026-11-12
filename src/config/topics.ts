export interface Topic {
  id: string;
  name: string;
  part: number;
}

export const TOPICS: Topic[] = [
  { id: "T1", name: "Oʻzgaruvchilar va maʼlumot turlari", part: 1 },
  { id: "T2", name: "Input va Output", part: 1 },
  { id: "T3", name: "Assign va arifmetik amallar", part: 1 },
  { id: "T4", name: "Butun boʻlish va qoldiq (mod)", part: 1 },
  { id: "T5", name: "If (shart)", part: 2 },
  { id: "T6", name: "Ichma-ich If", part: 2 },
  { id: "T7", name: "For sikli", part: 2 },
  { id: "T8", name: "For va If birgalikda", part: 2 },
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
  { id: "c-int", name: "Integer turi", topics: ["T1"], test: /integer/ },
  { id: "c-real", name: "Real turi", topics: ["T1"], test: /real/ },
  { id: "c-str", name: "String turi", topics: ["T1", "T2"], test: /string/ },
  { id: "c-bool", name: "Boolean turi", topics: ["T1"], test: /boolean/ },
  { id: "c-decl", name: "Declare (eʼlon qilish)", topics: ["T1"], test: /declare/ },
  { id: "c-names", name: "Oʻzgaruvchi nomlari", topics: ["T1"], test: /nom/ },
  { id: "c-trunc", name: "Integer ga kasr yozilganda kasr qismi tashlanishi", topics: ["T1", "T3", "T4"], test: /tashlan/ },
  { id: "c-input", name: "Input", topics: ["T2"], test: /<input/ },
  { id: "c-output", name: "Output", topics: ["T2"], test: /<output/ },
  { id: "c-newline", name: "Output: yangi qatorsiz chiqarish", topics: ["T2"], test: /newline="false"|yangi qator/ },
  { id: "c-concat", name: "& — birlashtirish", topics: ["T2", "T3"], test: /&amp;|&/ },
  { id: "c-assign", name: "Assign", topics: ["T3"], test: /<assign/ },
  { id: "c-prec", name: "Amallar ketma-ketligi va qavslar", topics: ["T3"], test: /qavs|oldin/ },
  { id: "c-div", name: "/ bo‘lish har doim kasr natija beradi", topics: ["T3"], test: /kasr natija/ },
  { id: "c-pow", name: "^ — daraja", topics: ["T3"], test: /\^/ },
  { id: "c-swap", name: "Qiymatlarni almashtirish", topics: ["T3"], test: /almashtir/ },
  { id: "c-mod", name: "mod — qoldiq", topics: ["T4"], test: /mod/ },
  { id: "c-digits", name: "Raqamlarga ajratish", topics: ["T4"], test: /raqam/ },
  { id: "c-time", name: "Vaqtni aylantirish (soat/daqiqa/sekund)", topics: ["T4"], test: /sekund|daqiqa/ },
  { id: "c-if", name: "If: True / False yoʻllari", topics: ["T5"], test: /<if/ },
  { id: "c-rel", name: "Solishtirish amallari (>, >=, =, <>)", topics: ["T5"], test: /&gt;|&lt;|<>|!=/ },
  { id: "c-and", name: "and", topics: ["T5", "T6"], test: / and / },
  { id: "c-or", name: "or", topics: ["T5", "T6"], test: / or / },
  { id: "c-not", name: "not", topics: ["T5"], test: /not/ },
  { id: "c-nested", name: "Ichma-ich If", topics: ["T6"], test: /ichma-ich|<else>\s*<if/ },
  { id: "c-for", name: "For sikli (oʻsish)", topics: ["T7"], test: /direction="inc"/ },
  { id: "c-fordec", name: "For: kamayish yoʻnalishi", topics: ["T7"], test: /direction="dec"|kamay/ },
  { id: "c-step", name: "For: qadam (step)", topics: ["T7", "T8"], test: /step="2"|qadam/ },
  { id: "c-sum", name: "Yigʻindi / koʻpaytma hisoblash", topics: ["T7", "T8"], test: /yig‘indi|yigʻindi|ko‘paytma|s \+ / },
  { id: "c-forinput", name: "Sikl ichida Input", topics: ["T7", "T8"], test: /<for[^]*<input/ },
  { id: "c-forif", name: "For ichida If", topics: ["T8"], test: /<for[^]*<if/ },
  { id: "c-iffor", name: "If ichida For", topics: ["T8"], test: /<if[^]*<then>[^]*<for|if ichida for/ },
  { id: "c-count", name: "Sanash (hisoblagich)", topics: ["T8"], test: /k \+ 1|c \+ 1|nechta/ },
  { id: "c-max", name: "Eng katta / eng kichik qiymat", topics: ["T8"], test: /eng katta|eng kichik/ },
];
