import { ReactNode, useEffect, useRef, useState } from "react";

// ---------- icons (inline, no external requests) ----------
const paths: Record<string, string> = {
  check: "M5 12.5l4.5 4.5L19 7.5",
  x: "M6 6l12 12M18 6L6 18",
  left: "M15 18l-6-6 6-6",
  right: "M9 6l6 6-6 6",
  flag: "M5 21V4m0 0h11l-2 4 2 4H5",
  trash: "M4 7h16M9 7V4h6v3m-8 0l1 13h8l1-13",
  clock: "M12 7v5l3 2M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  grid: "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z",
  upload: "M12 16V4m0 0l-4.5 4.5M12 4l4.5 4.5M4 16v3a1 1 0 001 1h14a1 1 0 001-1v-3",
  play: "M7 5l12 7-12 7z",
  file: "M14 3H6a1 1 0 00-1 1v16a1 1 0 001 1h12a1 1 0 001-1V8l-5-5zm0 0v5h5",
  sun: "M12 4V2m0 20v-2m8-8h2M2 12h2m13.66-5.66l1.41-1.41M4.93 19.07l1.41-1.41m0-11.32L4.93 4.93m14.14 14.14l-1.41-1.41M16 12a4 4 0 11-8 0 4 4 0 018 0z",
  moon: "M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z",
  monitor: "M3 5h18v11H3zM8 21h8m-4-5v5",
  download: "M12 4v12m0 0l-4.5-4.5M12 16l4.5-4.5M4 20h16",
  print: "M7 9V3h10v6M7 17H4v-7h16v7h-3M7 14h10v7H7z",
  send: "M4 12l16-8-6 16-3-7-7-1z",
  info: "M12 8h.01M11 12h1v5h1M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  alert: "M12 9v4m0 4h.01M10.3 3.9L2.4 18a2 2 0 001.7 3h15.8a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z",
  user: "M12 12a4 4 0 100-8 4 4 0 000 8zm-7 9a7 7 0 0114 0",
  refresh: "M4 4v6h6M20 20v-6h-6M5.5 15a7 7 0 0012 2.5M18.5 9A7 7 0 006.5 6.5",
  zoomin: "M11 8v6m-3-3h6M20 20l-4.3-4.3M17 11a6 6 0 11-12 0 6 6 0 0112 0z",
  zoomout: "M8 11h6M20 20l-4.3-4.3M17 11a6 6 0 11-12 0 6 6 0 0112 0z",
  keyboard: "M3 7h18v10H3zM7 11h.01M11 11h.01M15 11h.01M7 14h10",
  wifi: "M2 9a15 15 0 0120 0M5.5 12.5a10 10 0 0113 0M9 16a5 5 0 016 0M12 19.5h.01",
  palette: "M12 3a9 9 0 100 18c1 0 1.5-.7 1.5-1.5 0-.4-.2-.8-.4-1.1-.3-.3-.4-.6-.4-1 0-.8.7-1.4 1.5-1.4H16a5 5 0 005-5c0-4.4-4-8-9-8zM7.5 12h.01M9.5 8h.01M14.5 8h.01",
  logout: "M15 4h4a1 1 0 011 1v14a1 1 0 01-1 1h-4M10 17l-5-5 5-5M5 12h11",
  terminal: "M4 5h16v14H4zM8 10l3 2-3 2M13 15h3",
};

export function Icon({ name, className = "h-5 w-5", strokeWidth = 1.9 }: { name: keyof typeof paths | string; className?: string; strokeWidth?: number }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={paths[name] ?? paths.info} />
    </svg>
  );
}

export function Logo({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <div className={`grid place-items-center rounded-xl bg-primary text-primary-fg ${className}`} aria-hidden="true">
      <svg viewBox="0 0 32 32" className="h-[62%] w-[62%]" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinejoin="round">
        <rect x="9" y="4" width="14" height="6" rx="3" />
        <path d="M16 10v4M8 14h16l-3.5 7h-9zM16 21v4" />
        <circle cx="16" cy="27" r="1.2" fill="currentColor" />
      </svg>
    </div>
  );
}

// ---------- dialog ----------
export function Dialog({ open, onClose, title, children, wide = false }: { open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.querySelector<HTMLElement>("button, [href], input, [tabindex]")?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      prev?.focus?.();
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/45 p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={ref} role="dialog" aria-modal="true" aria-label={title} className={`card anim-pop max-h-[90dvh] w-full overflow-y-auto p-5 sm:p-6 ${wide ? "max-w-2xl" : "max-w-md"}`}>
        <h2 className="mb-3 text-lg font-bold">{title}</h2>
        {children}
      </div>
    </div>
  );
}

// ---------- progress ring ----------
export function Ring({ value, size = 2.75, stroke = 0.3, children, color = "hsl(var(--primary))" }: { value: number; size?: number; stroke?: number; children?: ReactNode; color?: string }) {
  const r = 50 - (stroke / size) * 50;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative grid place-items-center" style={{ width: `${size}rem`, height: `${size}rem` }}>
      <svg viewBox="0 0 100 100" className="absolute inset-0 -rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" stroke="hsl(var(--border))" strokeWidth={(stroke / size) * 100} />
        <circle cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth={(stroke / size) * 100} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - Math.max(0, Math.min(1, value)))} style={{ transition: "stroke-dashoffset .6s ease" }} />
      </svg>
      <div className="relative text-center">{children}</div>
    </div>
  );
}

// ---------- press-and-hold button ----------
export function HoldButton({ onDone, disabled, children, ms = 1500 }: { onDone: () => void; disabled?: boolean; children: ReactNode; ms?: number }) {
  const [p, setP] = useState(0);
  const t = useRef<number | null>(null);
  const start = useRef(0);
  const fired = useRef(false);
  const stop = () => {
    if (t.current) cancelAnimationFrame(t.current);
    t.current = null;
    if (!fired.current) setP(0);
  };
  const tick = () => {
    const v = Math.min(1, (performance.now() - start.current) / ms);
    setP(v);
    if (v >= 1) {
      if (!fired.current) {
        fired.current = true;
        onDone();
      }
      return;
    }
    t.current = requestAnimationFrame(tick);
  };
  const begin = () => {
    if (disabled || fired.current) return;
    start.current = performance.now();
    t.current = requestAnimationFrame(tick);
  };
  return (
    <button
      type="button"
      disabled={disabled}
      onPointerDown={begin}
      onPointerUp={stop}
      onPointerLeave={stop}
      onKeyDown={(e) => (e.key === " " || e.key === "Enter") && !e.repeat && begin()}
      onKeyUp={(e) => (e.key === " " || e.key === "Enter") && stop()}
      className="btn-primary relative w-full overflow-hidden select-none"
      aria-label="Bosib turing: yakuniy topshirish"
    >
      <span className="absolute inset-y-0 left-0 bg-white/25" style={{ width: `${p * 100}%` }} />
      <span className="relative">{p > 0 && p < 1 ? "Ushlab turing…" : children}</span>
    </button>
  );
}

// ---------- verdict badge ----------
export const VERDICT: Record<string, { label: string; cls: string }> = {
  AC: { label: "Qabul qilindi", cls: "bg-success/15 text-success border-success/30" },
  WA: { label: "Notoʻgʻri javob", cls: "bg-danger/15 text-danger border-danger/30" },
  RE: { label: "Ishlash xatosi", cls: "bg-warning/15 text-warning border-warning/30" },
  TLE: { label: "Vaqt tugadi", cls: "bg-info/15 text-info border-info/30" },
  PE: { label: "Fayl xatosi", cls: "bg-muted/15 text-muted border-muted/30" },
  "—": { label: "Yuklanmagan", cls: "bg-surface2 text-muted border-border" },
};

export function Verdict({ v, short = false }: { v: string; short?: boolean }) {
  const d = VERDICT[v] ?? VERDICT["—"];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-bold ${d.cls}`}>
      <span className="font-mono">{v}</span>
      {!short && <span className="font-medium">{d.label}</span>}
    </span>
  );
}

// ---------- toast ----------
export function Toast({ children, onClose, tone = "info" }: { children: ReactNode; onClose: () => void; tone?: "info" | "success" | "warning" }) {
  useEffect(() => {
    const t = setTimeout(onClose, 7000);
    return () => clearTimeout(t);
  }, [onClose]);
  const cls = tone === "success" ? "border-success/40" : tone === "warning" ? "border-warning/50" : "border-primary/40";
  return (
    <div className="pointer-events-none fixed inset-x-0 top-[4.5rem] z-50 flex justify-center px-4">
    <div role="status" className={`card anim-enter pointer-events-auto flex w-full max-w-[34rem] items-start gap-3 border-l-4 p-3.5 text-sm ${cls}`}>
      <Icon name={tone === "warning" ? "alert" : "info"} className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
      <div className="flex-1">{children}</div>
      <button className="text-muted hover:text-fg" onClick={onClose} aria-label="Yopish">
        <Icon name="x" className="h-4 w-4" />
      </button>
    </div>
    </div>
  );
}

// ---------- theme ----------
type Prefs = { theme: "system" | "light" | "dark"; palette: "indigo" | "teal" | "plum" };
const PREFS_KEY = "fg-exam:prefs";
export function readPrefs(): Prefs {
  try {
    return { theme: "system", palette: "indigo", ...JSON.parse(localStorage.getItem(PREFS_KEY) || "{}") };
  } catch {
    return { theme: "system", palette: "indigo" };
  }
}
export function applyPrefs(p: Prefs) {
  const dark = p.theme === "dark" || (p.theme === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.dataset.theme = dark ? "dark" : "light";
  document.documentElement.dataset.palette = p.palette;
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(p));
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new Event("themechange"));
}

export function useIsDark() {
  const [d, setD] = useState(() => document.documentElement.dataset.theme === "dark");
  useEffect(() => {
    const f = () => setD(document.documentElement.dataset.theme === "dark");
    window.addEventListener("themechange", f);
    const mq = matchMedia("(prefers-color-scheme: dark)");
    const g = () => {
      if (readPrefs().theme === "system") applyPrefs(readPrefs());
    };
    mq.addEventListener("change", g);
    return () => {
      window.removeEventListener("themechange", f);
      mq.removeEventListener("change", g);
    };
  }, []);
  return d;
}

export function ThemeMenu() {
  const [open, setOpen] = useState(false);
  const [p, setP] = useState(readPrefs);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const f = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", f);
    return () => document.removeEventListener("mousedown", f);
  }, []);
  const set = (np: Prefs) => {
    setP(np);
    applyPrefs(np);
  };
  const dark = useIsDark();
  return (
    <div className="relative" ref={ref}>
      <button className="btn-ghost btn-sm !px-2.5" onClick={() => setOpen((o) => !o)} aria-label="Mavzu va rang" aria-expanded={open}>
        <Icon name={dark ? "moon" : "sun"} className="h-[1.15rem] w-[1.15rem]" />
      </button>
      {open && (
        <div className="card anim-pop absolute right-0 z-40 mt-2 w-56 p-2 text-sm">
          <div className="px-2 pb-1 pt-1 text-xs font-semibold uppercase tracking-wide text-muted">Mavzu</div>
          {(
            [
              ["system", "Tizim", "monitor"],
              ["light", "Yorugʻ", "sun"],
              ["dark", "Qorongʻi", "moon"],
            ] as const
          ).map(([v, l, ic]) => (
            <button key={v} onClick={() => set({ ...p, theme: v })} className={`flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left hover:bg-surface2 ${p.theme === v ? "font-semibold text-primary" : ""}`}>
              <Icon name={ic} className="h-4 w-4" /> {l}
            </button>
          ))}
          <div className="px-2 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-muted">Rang</div>
          <div className="flex gap-2 px-2 pb-1.5">
            {(
              [
                ["indigo", "hsl(238 52% 43%)"],
                ["teal", "hsl(186 72% 30%)"],
                ["plum", "hsl(292 46% 38%)"],
              ] as const
            ).map(([v, col]) => (
              <button key={v} onClick={() => set({ ...p, palette: v })} aria-label={`Rang: ${v}`} className={`h-8 w-8 rounded-full border-2 ${p.palette === v ? "border-fg" : "border-transparent"}`} style={{ background: col }} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted">{children}</div>;
}
