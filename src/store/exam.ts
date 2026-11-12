import { create } from "zustand";
import { examConfig } from "../config/exam.config";
import { bank, questionById, problemById } from "../lib/bank";
import { drawItems } from "../lib/draw";
import { mulberry, shuffle, uid } from "../lib/util";
import { idb } from "../lib/idb";
import type { Attempt, AttemptSummary, PartState, Student, UploadMeta } from "./types";
import type { TestResult } from "../judge";

const KEY = examConfig.storageKeys.attempt;
const INDEX = examConfig.storageKeys.attempts;
const BANK_VERSION = bank.meta.generatedAt;

// ---------------- persistence ----------------
function readJSON<T>(k: string): T | null {
  try {
    const s = localStorage.getItem(k);
    return s ? (JSON.parse(s) as T) : null;
  } catch {
    return null;
  }
}

export function loadIndex(): AttemptSummary[] {
  return readJSON<AttemptSummary[]>(INDEX) ?? [];
}

function saveIndex(list: AttemptSummary[]) {
  try {
    localStorage.setItem(INDEX, JSON.stringify(list.slice(0, 30)));
  } catch {
    /* quota */
  }
}

function summarize(a: Attempt, extra: Partial<AttemptSummary> = {}): AttemptSummary {
  return {
    id: a.id,
    student: a.student,
    createdAt: a.createdAt,
    updatedAt: a.updatedAt,
    phase: a.phase,
    percent: a.result?.percent,
    passed: a.result?.passed,
    ...extra,
  };
}

function upsertIndex(a: Attempt, extra: Partial<AttemptSummary> = {}) {
  const list = loadIndex().filter((x) => x.id !== a.id);
  list.unshift(summarize(a, extra));
  saveIndex(list);
}

let lastSaved = 0;
export function persistNow(a: Attempt | null) {
  try {
    if (a) {
      localStorage.setItem(KEY, JSON.stringify(a));
      idb.set(`attempt:${a.id}`, a);
      upsertIndex(a);
    } else localStorage.removeItem(KEY);
    lastSaved = Date.now();
    useExam.setState({ savedAt: lastSaved });
  } catch {
    useExam.setState({ saveError: true });
  }
}

/** Repair an attempt loaded from storage so that it always matches the current bank and is consistent. */
function sanitize(a: Attempt): Attempt {
  const parts = examConfig.parts.map((pc, i) => {
    const old = a.parts[i];
    if (old) {
      const valid = old.items.filter((id) => (pc.kind === "questions" ? questionById.has(id) : problemById.has(id)));
      return { ...old, items: valid, index: Math.min(old.index, Math.max(0, valid.length - 1)) };
    }
    return newPart(pc.id, i, a.seed, "locked");
  });
  // exactly one active part at most; phase must match part state
  const activeIdx = parts.findIndex((p) => p.status === "active");
  let phase = a.phase;
  let current = Math.min(a.current, parts.length - 1);
  if (phase === "exam" && activeIdx < 0) {
    const ready = parts.findIndex((p) => p.status === "ready");
    phase = ready >= 0 ? "transition" : "review";
    current = ready >= 0 ? ready : current;
  }
  if (activeIdx >= 0 && phase !== "exam") {
    phase = "exam";
    current = activeIdx;
  }
  return { ...a, parts, phase, current, delivery: a.delivery ?? { status: "idle", steps: {}, attempts: 0 } };
}

function newPart(id: string, i: number, seed: number, status: PartState["status"]): PartState {
  const pc = examConfig.parts[i];
  return {
    id,
    status,
    items: drawItems(pc, seed + i * 7919, examConfig.stratifyByTopic, examConfig.shuffleQuestions),
    remainingMs: pc.durationMinutes * 60_000,
    activeSince: null,
    index: 0,
    visited: [],
    marked: [],
    timeSpentMs: 0,
  };
}

export function remainingOf(p: PartState, now = Date.now()): number {
  return p.activeSince ? p.remainingMs - (now - p.activeSince) : p.remainingMs;
}

// ---------------- store ----------------
interface State {
  attempt: Attempt | null;
  savedAt: number;
  saveError: boolean;
  busy: boolean;
  start(student: Student): void;
  resume(id: string): Promise<boolean>;
  abandon(): void;
  closeResults(): void;
  startPart(): void;
  submitPart(auto?: boolean): void;
  reopenPart(i: number): void;
  goto(index: number): void;
  answer(qid: number, value: unknown): void;
  clearAnswer(qid: number): void;
  toggleMark(id: number): void;
  setUpload(pid: number, meta: UploadMeta | null): void;
  setSampleRun(pid: number, r: TestResult[] | null): void;
  beginJudging(): boolean;
  patch(fn: (a: Attempt) => Attempt): void;
  dismissRestored(): void;
}

const mutate = (set: (p: Partial<State>) => void, get: () => State, fn: (a: Attempt) => Attempt | null) => {
  const a = get().attempt;
  if (!a) return;
  const next = fn(a);
  if (!next || next === a) return;
  next.updatedAt = Date.now();
  set({ attempt: next });
  persistNow(next);
};

function boot(): Attempt | null {
  const a = readJSON<Attempt>(KEY);
  if (!a || a.version !== 1) return null;
  const s = sanitize(a);
  if (s.phase !== "results") s.restoredNotice = true;
  return s;
}

export const useExam = create<State>((set, get) => ({
  attempt: boot(),
  savedAt: 0,
  saveError: false,
  busy: false,

  start(student) {
    if (get().attempt && get().attempt!.phase !== "results") return; // never overwrite a running exam silently
    // any other unfinished attempt in the index becomes "abandoned" (still viewable, never resumed by accident)
    saveIndex(loadIndex().map((x) => (x.phase !== "results" ? { ...x, abandoned: true } : x)));
    const seed = (Math.random() * 2 ** 31) >>> 0;
    const parts = examConfig.parts.map((pc, i) => newPart(pc.id, i, seed, i === 0 ? "ready" : "locked"));
    const rnd = mulberry(seed ^ 0x9e3779b9);
    const optionOrder: Record<number, number[]> = {};
    for (const p of parts)
      for (const id of p.items) {
        const q = questionById.get(id);
        if (q?.options && examConfig.shuffleOptions && (q.type === "single_choice" || q.type === "multiple_choice"))
          optionOrder[id] = shuffle(q.options.map((_, i) => i), rnd);
      }
    const a: Attempt = {
      id: uid(),
      version: 1,
      bankVersion: BANK_VERSION,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      student,
      seed,
      phase: "transition",
      current: 0,
      parts,
      answers: {},
      optionOrder,
      uploads: {},
      sampleRuns: {},
      delivery: { status: "idle", steps: {}, attempts: 0 },
    };
    set({ attempt: a });
    persistNow(a);
  },

  async resume(id) {
    const cur = get().attempt;
    if (cur && cur.id === id) {
      set({ attempt: { ...cur, restoredNotice: cur.phase !== "results" } });
      return true;
    }
    const stored = await idb.get<Attempt>(`attempt:${id}`);
    if (!stored) return false;
    if (cur && cur.phase !== "results") upsertIndex(cur, { abandoned: true });
    const s = sanitize(stored);
    s.restoredNotice = s.phase !== "results";
    set({ attempt: s });
    persistNow(s);
    return true;
  },

  abandon() {
    const a = get().attempt;
    if (a) upsertIndex(a, { abandoned: a.phase !== "results" });
    set({ attempt: null });
    persistNow(null);
  },

  closeResults() {
    const a = get().attempt;
    if (!a || a.phase !== "results") return;
    set({ attempt: null });
    persistNow(null);
  },

  startPart() {
    mutate(set, get, (a) => {
      if (a.phase !== "transition") return null;
      const p = a.parts[a.current];
      if (!p || p.status !== "ready") return null;
      const parts = a.parts.map((x, i) =>
        i === a.current ? { ...x, status: "active" as const, activeSince: Date.now(), startedAt: x.startedAt ?? Date.now(), visited: x.visited.length ? x.visited : [x.items[0]] } : x,
      );
      return { ...a, parts, phase: "exam" };
    });
  },

  submitPart(auto = false) {
    mutate(set, get, (a) => {
      if (a.phase !== "exam") return null;
      const i = a.current;
      const p = a.parts[i];
      if (!p || p.status !== "active") return null;
      const now = Date.now();
      const used = p.activeSince ? now - p.activeSince : 0;
      const parts = a.parts.map((x, j) =>
        j === i
          ? { ...x, status: "submitted" as const, remainingMs: Math.max(0, x.remainingMs - used), activeSince: null, timeSpentMs: x.timeSpentMs + Math.min(used, x.remainingMs), submittedAt: now, autoSubmitted: auto }
          : x,
      );
      const next = parts.findIndex((x) => x.status === "locked" || x.status === "ready");
      if (next >= 0) {
        parts[next] = { ...parts[next], status: "ready" };
        return { ...a, parts, phase: "transition", current: next };
      }
      return { ...a, parts, phase: "review" };
    });
  },

  reopenPart(i) {
    mutate(set, get, (a) => {
      if (!examConfig.allowReturnToSubmittedParts) return null;
      if (a.phase !== "review" && a.phase !== "transition") return null;
      const p = a.parts[i];
      if (!p || p.status !== "submitted" || p.remainingMs <= 1000) return null;
      if (a.parts.some((x) => x.status === "active")) return null;
      const parts = a.parts.map((x, j) => (j === i ? { ...x, status: "active" as const, activeSince: Date.now() } : x));
      // a part that was 'ready' (not started) goes back to waiting so the transition screen shows again later
      return { ...a, parts, phase: "exam", current: i };
    });
  },

  goto(index) {
    mutate(set, get, (a) => {
      if (a.phase !== "exam") return null;
      const p = a.parts[a.current];
      if (index < 0 || index >= p.items.length || index === p.index) return null;
      const id = p.items[index];
      const parts = a.parts.map((x, j) => (j === a.current ? { ...x, index, visited: x.visited.includes(id) ? x.visited : [...x.visited, id] } : x));
      return { ...a, parts };
    });
  },

  answer(qid, value) {
    mutate(set, get, (a) => (a.phase === "exam" && a.parts[a.current].items.includes(qid) ? { ...a, answers: { ...a.answers, [qid]: value } } : null));
  },

  clearAnswer(qid) {
    mutate(set, get, (a) => {
      if (a.phase !== "exam" || !(qid in a.answers)) return null;
      const answers = { ...a.answers };
      delete answers[qid];
      return { ...a, answers };
    });
  },

  toggleMark(id) {
    mutate(set, get, (a) => {
      if (a.phase !== "exam") return null;
      const parts = a.parts.map((x, j) =>
        j === a.current ? { ...x, marked: x.marked.includes(id) ? x.marked.filter((m) => m !== id) : [...x.marked, id] } : x,
      );
      return { ...a, parts };
    });
  },

  setUpload(pid, meta) {
    mutate(set, get, (a) => {
      if (a.phase !== "exam") return null;
      const uploads = { ...a.uploads };
      const sampleRuns = { ...a.sampleRuns };
      delete sampleRuns[pid];
      if (meta) uploads[pid] = meta;
      else delete uploads[pid];
      return { ...a, uploads, sampleRuns };
    });
  },

  setSampleRun(pid, r) {
    mutate(set, get, (a) => {
      const sampleRuns = { ...a.sampleRuns };
      if (r) sampleRuns[pid] = r;
      else delete sampleRuns[pid];
      return { ...a, sampleRuns };
    });
  },

  beginJudging() {
    let ok = false;
    mutate(set, get, (a) => {
      if (a.phase !== "review") return null;
      if (a.parts.some((p) => p.status === "active")) return null;
      ok = true;
      return { ...a, phase: "judging", finishedAt: Date.now(), judgeProgress: { done: 0, total: 0 } };
    });
    return ok;
  },

  patch(fn) {
    mutate(set, get, fn);
  },

  dismissRestored() {
    const a = get().attempt;
    if (a?.restoredNotice) set({ attempt: { ...a, restoredNotice: false } });
  },
}));

// Save immediately when the page is hidden / closed
if (typeof window !== "undefined") {
  const flush = () => persistNow(useExam.getState().attempt);
  document.addEventListener("visibilitychange", () => document.visibilityState === "hidden" && flush());
  window.addEventListener("pagehide", flush);
  setInterval(() => {
    const a = useExam.getState().attempt;
    if (a && a.phase !== "results" && Date.now() - lastSaved >= examConfig.autosaveIntervalMs) persistNow(a);
  }, examConfig.autosaveIntervalMs);
  // another tab changed the attempt → follow it (prevents two tabs fighting over one exam)
  window.addEventListener("storage", (e) => {
    if (e.key !== KEY) return;
    const a = e.newValue ? sanitize(JSON.parse(e.newValue)) : null;
    useExam.setState({ attempt: a });
  });
}
