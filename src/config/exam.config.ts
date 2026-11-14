import { TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID } from "./secrets";

/** Exam variant ("v1", "v2"); set at build time with VARIANT=v2. Each variant has its own bank and saved sessions. */
export const VARIANT: string = ((import.meta as any).env?.VITE_VARIANT as string) || "v1";
export const VARIANT_NO = VARIANT.replace(/^v/, "");
const NS = VARIANT === "v1" ? "fg-exam" : `fg-exam:${VARIANT}`;

export type PartKind = "questions" | "problems";

export interface PartConfig {
  id: string;
  title: string;
  subtitle: string;
  kind: PartKind;
  count: number;
  durationMinutes: number;
  pool: { part: number };
  points: number;
  /** false = shown and judged, but NOT added to the total score (bonus / practice part) */
  counted: boolean;
}

export const examConfig = {
  brand: {
    academy: "MIRAE Academy",
    title: "Boshlangʻich informatika (1-daraja)",
    tagline: `Yakuniy imtihon · ${VARIANT_NO}-variant`,
    examName: `1-daraja-imtihon-${VARIANT_NO}-variant`,
  },
  parts: [
    { id: "p1", title: "1-qism", subtitle: "Test: sanoq sistemalari, kompyuter apparatlari", kind: "questions", count: 25, durationMinutes: 35, pool: { part: 1 }, points: 1, counted: true },
    { id: "p2", title: "2-qism", subtitle: "Test: Excel formulalari, Flowgorithm, floor / ceil / round", kind: "questions", count: 30, durationMinutes: 40, pool: { part: 2 }, points: 1, counted: true },
    { id: "p3", title: "3-qism", subtitle: "Amaliy masalalar (Flowgorithm .fprg)", kind: "problems", count: 20, durationMinutes: 120, pool: { part: 3 }, points: 3, counted: true },
    { id: "p4", title: "4-qism", subtitle: "Qiyin masalalar — bonus, umumiy ballga qoʻshilmaydi", kind: "problems", count: 5, durationMinutes: 60, pool: { part: 4 }, points: 3, counted: false },
  ] as PartConfig[],
  shuffleQuestions: true,
  shuffleOptions: true,
  stratifyByTopic: true,
  allowReturnToSubmittedParts: true,
  passPercent: 60,
  autosaveIntervalMs: 3000,
  revealAnswersInResults: true,
  judge: { maxSteps: 2_000_000, wallMs: 5000, maxOutputKb: 64, partialScoring: true, allOrNothing: false, uploadMaxKb: 512 },
  delivery: {
    mode: "direct" as "direct" | "proxy",
    proxyUrl: "",
    botToken: TELEGRAM_BOT_TOKEN,
    chatId: TELEGRAM_CHAT_ID,
    notifyOnStart: true,
    dateFormat: "DD-MM-YYYY",
  },
  storageKeys: { attempt: `${NS}:attempt:v1`, attempts: `${NS}:attempts:v1`, prefs: "fg-exam:prefs", db: VARIANT === "v1" ? "fg-exam" : `fg-exam-${VARIANT}` },
};

export type ExamConfig = typeof examConfig;
