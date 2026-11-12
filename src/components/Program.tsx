import { useMemo, useRef, useState, WheelEvent, PointerEvent } from "react";
import { parseFprg } from "../judge/parse";
import { renderFlowchart, pseudocode } from "../flowchart/render";
import { Icon, useIsDark } from "./ui";

/** Shows a Flowgorithm program as flowchart (zoom + pan) or pseudocode, with a tab switch. */
export function ProgramView({ src, compact = false, defaultTab = "chart" }: { src: string; compact?: boolean; defaultTab?: "chart" | "code" }) {
  const dark = useIsDark();
  const [tab, setTab] = useState<"chart" | "code">(defaultTab);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number; px: number; py: number } | null>(null);
  const parsed = useMemo(() => {
    try {
      const p = parseFprg(src);
      return { chart: renderFlowchart(p, dark ? "dark" : "light"), code: pseudocode(p), error: null as string | null };
    } catch (e) {
      return { chart: null, code: "", error: (e as Error).message };
    }
  }, [src, dark]);

  if (parsed.error) return <div className="rounded-xl border border-danger/40 bg-danger/10 p-3 text-sm text-danger">{parsed.error}</div>;

  const onWheel = (e: WheelEvent) => {
    if (!e.ctrlKey) return;
    e.preventDefault();
    setZoom((z) => Math.min(2.5, Math.max(0.4, z * (e.deltaY < 0 ? 1.1 : 0.9))));
  };
  const down = (e: PointerEvent) => {
    drag.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y };
    (e.target as Element).setPointerCapture?.(e.pointerId);
  };
  const move = (e: PointerEvent) => {
    if (!drag.current) return;
    setPan({ x: drag.current.px + e.clientX - drag.current.x, y: drag.current.py + e.clientY - drag.current.y });
  };
  const up = () => (drag.current = null);

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface2/50">
      <div className="flex items-center justify-between gap-2 border-b border-border bg-surface px-2 py-1.5">
        <div role="tablist" className="flex gap-1">
          {(
            [
              ["chart", "Blok-sxema"],
              ["code", "Psevdokod"],
            ] as const
          ).map(([v, l]) => (
            <button key={v} role="tab" aria-selected={tab === v} onClick={() => setTab(v)} className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${tab === v ? "bg-primary/10 text-primary" : "text-muted hover:text-fg"}`}>
              {l}
            </button>
          ))}
        </div>
        {tab === "chart" && (
          <div className="flex items-center gap-1 text-muted">
            <button className="rounded-md p-1.5 hover:bg-surface2 hover:text-fg" onClick={() => setZoom((z) => Math.max(0.4, z / 1.2))} aria-label="Kichiklashtirish">
              <Icon name="zoomout" className="h-4 w-4" />
            </button>
            <span className="w-10 text-center font-mono text-xs">{Math.round(zoom * 100)}%</span>
            <button className="rounded-md p-1.5 hover:bg-surface2 hover:text-fg" onClick={() => setZoom((z) => Math.min(2.5, z * 1.2))} aria-label="Kattalashtirish">
              <Icon name="zoomin" className="h-4 w-4" />
            </button>
            <button className="rounded-md px-2 py-1 text-xs hover:bg-surface2 hover:text-fg" onClick={() => (setZoom(1), setPan({ x: 0, y: 0 }))}>
              Asl
            </button>
          </div>
        )}
      </div>
      {tab === "chart" ? (
        <div
          className={`chart relative cursor-grab touch-none overflow-hidden active:cursor-grabbing ${compact ? "max-h-[24rem]" : "max-h-[34rem]"}`}
          style={{ height: `${Math.min((parsed.chart!.height * zoom) / 16 + 1.5, compact ? 24 : 34)}rem` }}
          onWheel={onWheel}
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={up}
          aria-label="Blok-sxema"
          role="img"
        >
          <div
            className="absolute left-1/2 top-3 origin-top"
            style={{ transform: `translate(calc(-50% + ${pan.x}px), ${pan.y}px) scale(${zoom})` }}
            dangerouslySetInnerHTML={{ __html: parsed.chart!.svg }}
          />
        </div>
      ) : (
        <pre className="scrollbar-thin max-h-[30rem] overflow-auto p-4 font-mono text-[0.85rem] leading-relaxed">{parsed.code}</pre>
      )}
    </div>
  );
}
