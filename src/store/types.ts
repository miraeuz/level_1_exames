import type { TestResult } from "../judge";

export type Phase = "transition" | "exam" | "review" | "judging" | "results";
export type PartStatus = "locked" | "ready" | "active" | "submitted";

export interface PartState {
  id: string;
  status: PartStatus;
  items: number[];
  remainingMs: number;
  activeSince: number | null;
  index: number;
  visited: number[];
  marked: number[];
  timeSpentMs: number;
  startedAt?: number;
  submittedAt?: number;
  autoSubmitted?: boolean;
}

export interface Student {
  firstName: string;
  lastName: string;
  group: string;
}

export interface UploadMeta {
  name: string;
  size: number;
  uploadedAt: number;
  key: string; // IndexedDB key of the file text
}

export interface ProblemResult {
  problemId: number;
  part: string;
  verdict: "AC" | "WA" | "RE" | "TLE" | "PE" | "—";
  passed: number;
  total: number;
  points: number;
  maxPoints: number;
  tests: (TestResult & { hidden: boolean })[];
  fileName?: string;
}

export interface QuestionResult {
  questionId: number;
  part: string;
  answer: unknown;
  correct: boolean;
  points: number;
}

export interface PartResult {
  id: string;
  title: string;
  counted: boolean;
  score: number;
  max: number;
  timeSpentMs: number;
  answered: number;
  total: number;
}

export interface AttemptResult {
  total: number;
  max: number;
  percent: number;
  passed: boolean;
  grade: string;
  parts: PartResult[];
  questions: QuestionResult[];
  problems: ProblemResult[];
  topics: { id: string; name: string; score: number; max: number }[];
  bonus?: { score: number; max: number };
  computedAt: number;
}

export interface DeliveryState {
  status: "idle" | "pending" | "sending" | "sent" | "offline" | "error";
  steps: { message?: boolean; pdf?: boolean; zip?: boolean; start?: boolean };
  attempts: number;
  lastError?: string;
  sentAt?: number;
}

export interface Attempt {
  id: string;
  version: 1;
  bankVersion: string;
  createdAt: number;
  updatedAt: number;
  student: Student;
  seed: number;
  phase: Phase;
  current: number;
  parts: PartState[];
  answers: Record<number, unknown>;
  optionOrder: Record<number, number[]>;
  uploads: Record<number, UploadMeta>;
  sampleRuns: Record<number, TestResult[]>;
  judgeProgress?: { done: number; total: number };
  result?: AttemptResult;
  finishedAt?: number;
  delivery: DeliveryState;
  restoredNotice?: boolean;
}

export interface AttemptSummary {
  id: string;
  student: Student;
  createdAt: number;
  updatedAt: number;
  phase: Phase;
  percent?: number;
  passed?: boolean;
  abandoned?: boolean;
}
