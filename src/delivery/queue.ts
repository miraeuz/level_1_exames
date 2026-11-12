// Delivery queue: unsent results live in IndexedDB and are retried with backoff, on the next page load
// and when the browser comes back online. Each step (message / pdf / zip) is sent once per attempt.
import { examConfig } from "../config/exam.config";
import { idb } from "../lib/idb";
import { useExam } from "../store/exam";
import type { Attempt, DeliveryState } from "../store/types";
import { sendDocument, sendMessage, TgError } from "./telegram";
import { fileBase, resultMessage, startMessage } from "./summary";
import { buildZip } from "./zip";

interface Job {
  id: string; // attempt id = idempotency key
  kind: "result" | "start";
  attempt: Attempt;
  steps: DeliveryState["steps"];
  tries: number;
  nextAt: number;
  lastError?: string;
}

const BACKOFF = [2000, 5000, 15000, 60000, 120000, 300000];
const key = (j: { kind: string; id: string }) => `queue:${j.kind}:${j.id}`;
let busy = false;
let timer: number | undefined;

function setStatus(id: string, d: Partial<DeliveryState>) {
  const a = useExam.getState().attempt;
  if (a && a.id === id) useExam.getState().patch((x) => ({ ...x, delivery: { ...x.delivery, ...d } }));
}

export async function enqueueDelivery(a: Attempt) {
  const k = key({ kind: "result", id: a.id });
  const existing = await idb.get<Job>(k);
  const done = await idb.get<boolean>(`sent:result:${a.id}`);
  if (done) return setStatus(a.id, { status: "sent" });
  if (!existing) await idb.set(k, { id: a.id, kind: "result", attempt: a, steps: {}, tries: 0, nextAt: 0 } satisfies Job);
  setStatus(a.id, { status: "pending" });
  kick();
}

export async function enqueueStart(a: Attempt) {
  if (!examConfig.delivery.notifyOnStart) return;
  if (await idb.get(`sent:start:${a.id}`)) return;
  const k = key({ kind: "start", id: a.id });
  if (!(await idb.get(k))) await idb.set(k, { id: a.id, kind: "start", attempt: a, steps: {}, tries: 0, nextAt: 0 } satisfies Job);
  kick();
}

export function kick(delay = 0) {
  clearTimeout(timer);
  timer = window.setTimeout(process, delay);
}

async function process() {
  if (busy) return;
  busy = true;
  try {
    const keys = (await idb.keys()).map(String).filter((k) => k.startsWith("queue:"));
    let soonest = Infinity;
    for (const k of keys) {
      const job = await idb.get<Job>(k);
      if (!job) continue;
      if (job.nextAt > Date.now()) {
        soonest = Math.min(soonest, job.nextAt);
        continue;
      }
      if (!navigator.onLine) {
        setStatus(job.id, { status: "offline" });
        continue;
      }
      try {
        if (job.kind === "result") setStatus(job.id, { status: "sending" });
        await runJob(job, k);
        await idb.del(k);
        await idb.set(`sent:${job.kind}:${job.id}`, true);
        if (job.kind === "result") setStatus(job.id, { status: "sent", sentAt: Date.now(), steps: job.steps });
      } catch (e) {
        const err = e as TgError;
        job.tries++;
        job.lastError = err.message;
        job.nextAt = Date.now() + (err.retryAfter ? err.retryAfter * 1000 : BACKOFF[Math.min(job.tries - 1, BACKOFF.length - 1)]);
        if (err.fatal && job.tries > 3) job.nextAt = Date.now() + 10 * 60_000;
        await idb.set(k, job);
        soonest = Math.min(soonest, job.nextAt);
        if (job.kind === "result") setStatus(job.id, { status: navigator.onLine ? "error" : "offline", lastError: err.message, attempts: job.tries });
      }
    }
    if (soonest < Infinity) kick(Math.max(500, soonest - Date.now()));
  } finally {
    busy = false;
  }
}

async function runJob(job: Job, k: string) {
  const a = job.attempt;
  const save = async () => idb.set(k, job);
  if (job.kind === "start") {
    await sendMessage(startMessage(a));
    return;
  }
  const { date, person } = fileBase(a);
  const caption = `${a.student.lastName} ${a.student.firstName} · ${a.student.group} · ${a.result?.percent ?? 0}%`;
  if (!job.steps.message) {
    await sendMessage(resultMessage(a));
    job.steps.message = true;
    await save();
  }
  if (!job.steps.pdf) {
    const { buildPdf } = await import("../pdf/report");
    const pdf = await buildPdf(a);
    await sendDocument(pdf, `${date}_${person}_${examConfig.brand.examName}.pdf`, `📄 ${caption}`);
    job.steps.pdf = true;
    await save();
  }
  if (!job.steps.zip) {
    const z = await buildZip(a);
    if (z.count > 0) await sendDocument(z.blob, z.name, `🗂 ${caption} · ${z.count} ta .fprg fayl`);
    job.steps.zip = true;
    await save();
  }
}

let started = false;
export function startDeliveryLoop() {
  if (started) return;
  started = true;
  window.addEventListener("online", () => kick(300));
  kick(1500);
  // notify on start (once per attempt)
  useExam.subscribe((s, prev) => {
    const a = s.attempt;
    if (a && a.parts[0]?.status === "active" && prev.attempt?.parts[0]?.status !== "active") enqueueStart(a);
  });
}
