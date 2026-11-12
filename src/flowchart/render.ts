// Renders a parsed .fprg program as an SVG flowchart string (used in the app and in the PDF).
import type { Program, Stmt, FFunction } from "../judge/ast";

export type ChartTheme = "light" | "dark" | "pdf";

interface Palette {
  bg: string;
  line: string;
  text: string;
  label: string;
  fill: Record<string, string>;
  stroke: Record<string, string>;
}

const PAL: Record<ChartTheme, Palette> = {
  light: {
    bg: "transparent",
    line: "#475569",
    text: "#0f172a",
    label: "#64748b",
    fill: { term: "#e2e8f0", declare: "#fef3c7", assign: "#ffedd5", io: "#dbeafe", if: "#fce7f3", loop: "#dcfce7", comment: "#f5f5f4", call: "#ede9fe" },
    stroke: { term: "#64748b", declare: "#d97706", assign: "#ea580c", io: "#2563eb", if: "#db2777", loop: "#16a34a", comment: "#a8a29e", call: "#7c3aed" },
  },
  dark: {
    bg: "transparent",
    line: "#94a3b8",
    text: "#e2e8f0",
    label: "#94a3b8",
    fill: { term: "#1e293b", declare: "#3b2f0b", assign: "#3b1d0b", io: "#0c2547", if: "#3b0c2a", loop: "#0b3320", comment: "#262626", call: "#2a1b4d" },
    stroke: { term: "#94a3b8", declare: "#fbbf24", assign: "#fb923c", io: "#60a5fa", if: "#f472b6", loop: "#4ade80", comment: "#a8a29e", call: "#a78bfa" },
  },
  pdf: {
    bg: "#ffffff",
    line: "#475569",
    text: "#0f172a",
    label: "#64748b",
    fill: { term: "#e2e8f0", declare: "#fef3c7", assign: "#ffedd5", io: "#dbeafe", if: "#fce7f3", loop: "#dcfce7", comment: "#f5f5f4", call: "#ede9fe" },
    stroke: { term: "#64748b", declare: "#d97706", assign: "#ea580c", io: "#2563eb", if: "#db2777", loop: "#16a34a", comment: "#a8a29e", call: "#7c3aed" },
  },
};

const CH = 7.3; // char width for 12px monospace
const FONT = 12;
const H = 34;
const GAP = 20;
const MAXCH = 46;

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const clip = (s: string) => (s.length > MAXCH ? s.slice(0, MAXCH - 1) + "…" : s);
const tw = (s: string) => clip(s).length * CH;

interface Block {
  w: number;
  h: number;
  cx: number;
  draw(x: number, y: number, out: string[]): void;
}

export function renderFlowchart(prog: Program, theme: ChartTheme = "light", fnName = "Main"): { svg: string; width: number; height: number } {
  const P = PAL[theme];
  const mono = theme === "pdf" ? "JetBrainsMono" : "JetBrains Mono, ui-monospace, monospace";
  const fn: FFunction = prog.functions.find((f) => f.name.toLowerCase() === fnName.toLowerCase()) ?? prog.functions[0];

  const text = (x: number, y: number, s: string, color = P.text, size = FONT, anchor = "middle") =>
    `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" font-family="${mono}" font-size="${size}" fill="${color}" text-anchor="${anchor}" dominant-baseline="central" style="font-variant-ligatures:none;font-feature-settings:'liga' 0,'calt' 0">${esc(clip(s))}</text>`;
  const line = (pts: [number, number][], arrow = false) => {
    const d = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
    let s = `<path d="${d}" fill="none" stroke="${P.line}" stroke-width="1.4"/>`;
    if (arrow) {
      const [x2, y2] = pts[pts.length - 1];
      const [x1, y1] = pts[pts.length - 2];
      const ang = Math.atan2(y2 - y1, x2 - x1);
      const a = 6;
      const p1 = [x2 - a * Math.cos(ang - 0.45), y2 - a * Math.sin(ang - 0.45)];
      const p2 = [x2 - a * Math.cos(ang + 0.45), y2 - a * Math.sin(ang + 0.45)];
      s += `<path d="M${x2.toFixed(1)},${y2.toFixed(1)} L${p1[0].toFixed(1)},${p1[1].toFixed(1)} L${p2[0].toFixed(1)},${p2[1].toFixed(1)} Z" fill="${P.line}"/>`;
    }
    return s;
  };

  const shapeBlock = (kind: string, label: string): Block => {
    const extra = kind === "io" ? 26 : kind === "term" ? 24 : kind === "loop" ? 28 : 0;
    const w = Math.max(104, tw(label) + 26 + extra);
    return {
      w,
      h: H,
      cx: w / 2,
      draw(x, y, out) {
        const f = P.fill[kind],
          st = P.stroke[kind];
        const sw = `stroke="${st}" stroke-width="1.6" fill="${f}"`;
        if (kind === "term") out.push(`<rect x="${x}" y="${y}" width="${w}" height="${H}" rx="${H / 2}" ${sw}/>`);
        else if (kind === "io") {
          const k = 12;
          out.push(`<path d="M${x + k},${y} L${x + w},${y} L${x + w - k},${y + H} L${x},${y + H} Z" ${sw}/>`);
        } else if (kind === "loop") {
          const k = 14;
          out.push(`<path d="M${x + k},${y} L${x + w - k},${y} L${x + w},${y + H / 2} L${x + w - k},${y + H} L${x + k},${y + H} L${x},${y + H / 2} Z" ${sw}/>`);
        } else if (kind === "declare") {
          out.push(`<rect x="${x}" y="${y}" width="${w}" height="${H}" ${sw}/>`);
          out.push(`<path d="M${x + 7},${y} L${x + 7},${y + H} M${x},${y + 7} L${x + w},${y + 7}" stroke="${st}" stroke-width="1"/>`);
        } else if (kind === "call") {
          out.push(`<rect x="${x}" y="${y}" width="${w}" height="${H}" ${sw}/>`);
          out.push(`<path d="M${x + 7},${y} L${x + 7},${y + H} M${x + w - 7},${y} L${x + w - 7},${y + H}" stroke="${st}" stroke-width="1"/>`);
        } else if (kind === "comment") {
          out.push(`<path d="M${x},${y} L${x + w - 10},${y} L${x + w},${y + 10} L${x + w},${y + H} L${x},${y + H} Z" ${sw} stroke-dasharray="4 3"/>`);
        } else out.push(`<rect x="${x}" y="${y}" width="${w}" height="${H}" rx="3" ${sw}/>`);
        out.push(text(x + w / 2 + (kind === "declare" ? 3 : 0), y + H / 2 + (kind === "declare" ? 3 : 0), label));
      },
    };
  };

  const seq = (stmts: Stmt[]): Block => {
    const kids = stmts.map(block);
    if (!kids.length) return { w: 40, h: 0, cx: 20, draw() {} };
    const L = Math.max(...kids.map((k) => k.cx));
    const R = Math.max(...kids.map((k) => k.w - k.cx));
    const h = kids.reduce((a, k) => a + k.h, 0) + GAP * (kids.length - 1);
    return {
      w: L + R,
      h,
      cx: L,
      draw(x, y, out) {
        let yy = y;
        kids.forEach((k, i) => {
          if (i) {
            out.push(line([[x + L, yy - GAP], [x + L, yy]], true));
          }
          k.draw(x + L - k.cx, yy, out);
          yy += k.h + GAP;
        });
      },
    };
  };

  const ifBlock = (s: Extract<Stmt, { k: "if" }>): Block => {
    const label = s.expression;
    const dw = Math.max(120, tw(label) + 56);
    const dh = 46;
    const T = seq(s.then);
    const F = seq(s.else);
    const need = dw / 2 + 18;
    let gap = 30;
    const half = () => (F.w - F.cx + gap + T.cx) / 2;
    if (half() < need) gap += 2 * (need - half());
    const w = F.w + gap + T.w;
    const fC = F.cx;
    const tC = F.w + gap + T.cx;
    const cx = (fC + tC) / 2;
    const bh = Math.max(T.h, F.h);
    const h = dh + 18 + bh + 22;
    return {
      w,
      h,
      cx,
      draw(x, y, out) {
        const X = x + cx;
        out.push(`<path d="M${X},${y} L${X + dw / 2},${y + dh / 2} L${X},${y + dh} L${X - dw / 2},${y + dh / 2} Z" fill="${P.fill.if}" stroke="${P.stroke.if}" stroke-width="1.6"/>`);
        out.push(text(X, y + dh / 2, label));
        const yb = y + dh + 18;
        const xf = x + fC,
          xt = x + tC;
        out.push(line([[X - dw / 2, y + dh / 2], [xf, y + dh / 2], [xf, yb]], F.h > 0));
        out.push(line([[X + dw / 2, y + dh / 2], [xt, y + dh / 2], [xt, yb]], T.h > 0));
        out.push(text(X - dw / 2 - 6, y + dh / 2 - 9, "False", P.label, 10, "end"));
        out.push(text(X + dw / 2 + 6, y + dh / 2 - 9, "True", P.label, 10, "start"));
        F.draw(x, yb, out);
        T.draw(x + F.w + gap, yb, out);
        const ym = y + h - 4;
        out.push(line([[xf, yb + F.h], [xf, ym], [X - 4, ym]]));
        out.push(line([[xt, yb + T.h], [xt, ym], [X + 4, ym]]));
        out.push(`<circle cx="${X}" cy="${ym}" r="4" fill="${P.line}"/>`);
      },
    };
  };

  const loopBlock = (label: string, body: Stmt[]): Block => {
    const head = shapeBlock("loop", label);
    const B = seq(body);
    const m = 34;
    const L = Math.max(head.cx, B.cx) + m;
    const R = Math.max(head.w - head.cx, B.w - B.cx) + m;
    const h = H + GAP + Math.max(B.h, 4) + 16 + 16;
    return {
      w: L + R,
      h,
      cx: L,
      draw(x, y, out) {
        const X = x + L;
        head.draw(X - head.cx, y, out);
        const yb = y + H + GAP;
        out.push(line([[X, y + H], [X, yb]], B.h > 0));
        B.draw(X - B.cx, yb, out);
        const yEnd = yb + Math.max(B.h, 4);
        const yl = yEnd + 12;
        // back edge (left)
        out.push(line([[X, yEnd], [X, yl], [x + 6, yl], [x + 6, y + H / 2], [X - head.cx, y + H / 2]], true));
        // exit (right)
        out.push(line([[X + head.w - head.cx, y + H / 2], [x + L + R - 6, y + H / 2], [x + L + R - 6, y + h], [X, y + h]]));
        out.push(text(x + L + R - 2, y + H / 2 + 10, "Tugadi", P.label, 9, "end"));
      },
    };
  };

  function block(s: Stmt): Block {
    switch (s.k) {
      case "declare":
        return shapeBlock("declare", `${s.type}${s.array ? "[]" : ""} ${s.names.join(", ")}`);
      case "assign":
        return shapeBlock("assign", `${s.variable} = ${s.expression}`);
      case "input":
        return shapeBlock("io", `Input ${s.variable}`);
      case "output":
        return shapeBlock("io", `Output ${s.expression}`);
      case "call":
        return shapeBlock("call", `Call ${s.expression}`);
      case "comment":
        return shapeBlock("comment", s.text);
      case "if":
        return ifBlock(s);
      case "while":
        return loopBlock(`While ${s.expression}`, s.body);
      case "do":
        return loopBlock(`Do … While ${s.expression}`, s.body);
      case "for": {
        const st = s.step.trim() !== "1" ? ` (qadam ${s.step})` : "";
        return loopBlock(`${s.variable} = ${s.start} ${s.dec ? "downto" : "to"} ${s.end}${st}`, s.body);
      }
    }
  }

  const all: Stmt[] = fn.body;
  const start = shapeBlock("term", fn.name);
  const end = shapeBlock("term", fn.type === "None" ? "End" : `Return ${fn.variable}`);
  const body = seq(all);
  const L = Math.max(start.cx, body.cx, end.cx) + 14;
  const R = Math.max(start.w - start.cx, body.w - body.cx, end.w - end.cx) + 14;
  const W = L + R;
  const out: string[] = [];
  let y = 12;
  start.draw(L - start.cx, y, out);
  y += H;
  out.push(line([[L, y], [L, y + GAP]], true));
  y += GAP;
  if (body.h) {
    body.draw(L - body.cx, y, out);
    y += body.h;
    out.push(line([[L, y], [L, y + GAP]], true));
    y += GAP;
  }
  end.draw(L - end.cx, y, out);
  y += H + 12;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W.toFixed(0)}" height="${y.toFixed(0)}" viewBox="0 0 ${W.toFixed(0)} ${y.toFixed(0)}">${P.bg !== "transparent" ? `<rect width="100%" height="100%" fill="${P.bg}"/>` : ""}${out.join("")}</svg>`;
  return { svg, width: W, height: y };
}

export function pseudocode(prog: Program): string {
  const lines: string[] = [];
  const ind = (d: number) => "    ".repeat(d);
  const emit = (stmts: Stmt[], d: number) => {
    for (const s of stmts) {
      switch (s.k) {
        case "declare":
          lines.push(`${ind(d)}Declare ${s.type} ${s.names.join(", ")}${s.array ? `[${s.size}]` : ""}`);
          break;
        case "assign":
          lines.push(`${ind(d)}${s.variable} = ${s.expression}`);
          break;
        case "input":
          lines.push(`${ind(d)}Input ${s.variable}`);
          break;
        case "output":
          lines.push(`${ind(d)}Output ${s.expression}${s.newline ? "" : "   // yangi qatorsiz"}`);
          break;
        case "comment":
          lines.push(`${ind(d)}// ${s.text}`);
          break;
        case "call":
          lines.push(`${ind(d)}Call ${s.expression}`);
          break;
        case "if":
          lines.push(`${ind(d)}If ${s.expression} Then`);
          emit(s.then, d + 1);
          if (s.else.length) {
            lines.push(`${ind(d)}Else`);
            emit(s.else, d + 1);
          }
          lines.push(`${ind(d)}End If`);
          break;
        case "while":
          lines.push(`${ind(d)}While ${s.expression}`);
          emit(s.body, d + 1);
          lines.push(`${ind(d)}End While`);
          break;
        case "do":
          lines.push(`${ind(d)}Do`);
          emit(s.body, d + 1);
          lines.push(`${ind(d)}Loop While ${s.expression}`);
          break;
        case "for":
          lines.push(`${ind(d)}For ${s.variable} = ${s.start} ${s.dec ? "DownTo" : "To"} ${s.end}${s.step.trim() !== "1" ? ` Step ${s.step}` : ""}`);
          emit(s.body, d + 1);
          lines.push(`${ind(d)}End For`);
          break;
      }
    }
  };
  for (const f of prog.functions) {
    const params = f.params.map((p) => `${p.type} ${p.name}${p.array ? "[]" : ""}`).join(", ");
    lines.push(`Function ${f.name}(${params})${f.type !== "None" ? ` As ${f.type}` : ""}`);
    emit(f.body, 1);
    if (f.type !== "None") lines.push(`    Return ${f.variable}`);
    lines.push(`End Function`);
    lines.push("");
  }
  return lines.join("\n").trim();
}
