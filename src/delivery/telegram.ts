import { examConfig } from "../config/exam.config";
import { sleep } from "../lib/util";

export class TgError extends Error {
  constructor(
    msg: string,
    public retryAfter?: number,
    public fatal = false,
  ) {
    super(msg);
  }
}

const api = (method: string) => `https://api.telegram.org/bot${examConfig.delivery.botToken}/${method}`;

/**
 * All calls use multipart/form-data so the browser sends a "simple" CORS request (no preflight).
 * If the response cannot be read (network / CORS), we retry once in no-cors mode: the request still
 * reaches Telegram, and the step is marked done so that it is never sent twice.
 */
async function call(method: string, form: FormData): Promise<void> {
  let res: Response;
  try {
    res = await fetch(api(method), { method: "POST", body: form });
  } catch (e) {
    if (!navigator.onLine) throw new TgError("Internet yoʻq");
    try {
      await fetch(api(method), { method: "POST", body: form, mode: "no-cors" });
      return;
    } catch {
      throw new TgError("Tarmoq xatosi: " + (e as Error).message);
    }
  }
  let body: { ok?: boolean; description?: string; parameters?: { retry_after?: number } } = {};
  try {
    body = await res.json();
  } catch {
    /* ignore */
  }
  if (res.ok && body.ok !== false) return;
  if (res.status === 429) throw new TgError("Telegram cheklovi (429)", body.parameters?.retry_after ?? 5);
  if (res.status === 400 || res.status === 401 || res.status === 403 || res.status === 404)
    throw new TgError(`Telegram: ${body.description ?? res.status}`, undefined, true);
  throw new TgError(`Telegram: ${body.description ?? res.status}`);
}

export async function sendMessage(html: string) {
  const f = new FormData();
  f.append("chat_id", examConfig.delivery.chatId);
  f.append("text", html.slice(0, 4096));
  f.append("parse_mode", "HTML");
  f.append("disable_web_page_preview", "true");
  await call("sendMessage", f);
}

export async function sendDocument(blob: Blob, filename: string, caption: string) {
  const f = new FormData();
  f.append("chat_id", examConfig.delivery.chatId);
  f.append("document", blob, filename);
  f.append("caption", caption.slice(0, 1024));
  f.append("parse_mode", "HTML");
  await call("sendDocument", f);
}

export async function withRetry<T>(fn: () => Promise<T>, tries = 3): Promise<T> {
  let last: unknown;
  for (let i = 0; i < tries; i++) {
    try {
      return await fn();
    } catch (e) {
      last = e;
      if (e instanceof TgError && e.fatal) throw e;
      const wait = e instanceof TgError && e.retryAfter ? e.retryAfter * 1000 : [2000, 5000, 15000][i] ?? 15000;
      await sleep(wait);
    }
  }
  throw last;
}
