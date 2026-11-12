import raw from "../data/bank.json";
import type { Topic } from "../config/topics";

export type QType = "single_choice" | "multiple_choice" | "true_false" | "fill_blank" | "output";

export interface Question {
  id: number;
  topic: string;
  part: number;
  type: QType;
  difficulty: "easy" | "medium" | "hard";
  question: string;
  program?: string;
  stdin?: string;
  inputs?: string[];
  options?: string[];
  correct_answer: string | string[];
  explanation: string;
}

export interface Problem {
  id: number;
  part: number;
  key: string;
  title: string;
  difficulty: string;
  topics: string[];
  story: string;
  input: string[];
  output: string[];
  constraints: string;
  explanation?: string;
  samples: { input: string; output: string }[];
  tests: { input: string; hash: string }[];
  checker: "numeric" | "exact" | "tokens";
}

export interface Bank {
  meta: { course: string; version: number; generatedAt: string };
  topics: Topic[];
  questions: Question[];
  problems: Problem[];
}

export const bank = raw as unknown as Bank;
export const questionById = new Map(bank.questions.map((q) => [q.id, q]));
export const problemById = new Map(bank.problems.map((p) => [p.id, p]));
export const topicName = (id: string) => bank.topics.find((t) => t.id === id)?.name ?? id;

/** Option text without the "A) " prefix */
export const optText = (o: string) => o.replace(/^[A-E]\)\s*/, "");
