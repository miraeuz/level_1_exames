export function mulberry(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle<T>(xs: T[], rnd: () => number): T[] {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function uid(): string {
  const a = new Uint8Array(8);
  crypto.getRandomValues(a);
  return [...a].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function fmtClock(ms: number): string {
  const t = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(t / 3600),
    m = Math.floor((t % 3600) / 60),
    s = t % 60;
  const p = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${p(m)}:${p(s)}` : `${p(m)}:${p(s)}`;
}

export function fmtDuration(ms: number): string {
  const t = Math.round(ms / 1000);
  const m = Math.floor(t / 60),
    s = t % 60;
  return m ? `${m} daq ${s} s` : `${s} s`;
}

export function fmtDate(d: Date, format = "DD-MM-YYYY"): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return format
    .replace("DD", p(d.getDate()))
    .replace("MM", p(d.getMonth() + 1))
    .replace("YYYY", String(d.getFullYear()));
}

export function fmtDateTime(ts: number): string {
  const d = new Date(ts);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}.${p(d.getMonth() + 1)}.${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** Safe file-name part: transliterate Uzbek apostrophes, spaces → "-" */
export function safeName(s: string): string {
  return s
    .normalize("NFKD")
    .replace(/[ʻʼ‘’'`ʻʼ]/g, "")
    .replace(/[^\w\-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60) || "fayl";
}

/** Proper Uzbek letters in user-typed names */
export function uzLetters(s: string): string {
  return s.replace(/([oOgG])['‘’`]/g, "$1ʻ").replace(/['’]/g, "ʼ");
}

/** Normalisation for typed answers (fill_blank / output) */
export function normAnswer(s: string): string {
  return s
    .replace(/[ʻʼ‘’`ʻʼ]/g, "'")
    .replace(/\r\n?/g, "\n")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
