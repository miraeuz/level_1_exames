// One A4 PDF per attempt: cover, every question (flowchart + pseudocode), every problem with all tests.
import interR from "@expo-google-fonts/inter/Inter_400Regular.ttf?url";
import interB from "@expo-google-fonts/inter/Inter_700Bold.ttf?url";
import interSB from "@expo-google-fonts/inter/Inter_600SemiBold.ttf?url";
import monoR from "@expo-google-fonts/jetbrains-mono/JetBrainsMono_400Regular.ttf?url";
import monoB from "@expo-google-fonts/jetbrains-mono/JetBrainsMono_700Bold.ttf?url";
import { examConfig } from "../config/exam.config";
import { questionById, problemById, topicName, optText } from "../lib/bank";
import { parseFprg } from "../judge/parse";
import { renderFlowchart, pseudocode } from "../flowchart/render";
import { idb } from "../lib/idb";
import { fmtDateTime, fmtDuration } from "../lib/util";
import type { Attempt } from "../store/types";

let fontsReady: Promise<Record<string, string>> | null = null;
async function b64(url: string) {
  const buf = new Uint8Array(await (await fetch(url)).arrayBuffer());
  let s = "";
  for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode(...buf.subarray(i, i + 0x8000));
  return btoa(s);
}
function loadFonts() {
  if (!fontsReady)
    fontsReady = (async () => ({
      "Inter-R.ttf": await b64(interR),
      "Inter-B.ttf": await b64(interB),
      "Inter-SB.ttf": await b64(interSB),
      "Mono-R.ttf": await b64(monoR),
      "Mono-B.ttf": await b64(monoB),
    }))();
  return fontsReady;
}

const C = { primary: "#3b3f9e", muted: "#64748b", border: "#e2e8f0", ok: "#15803d", bad: "#dc2626", warn: "#b45309", soft: "#f1f5f9" };
const VERD: Record<string, [string, string]> = {
  AC: ["Qabul qilindi", C.ok],
  WA: ["Notoʻgʻri javob", C.bad],
  RE: ["Ishlash xatosi", C.warn],
  TLE: ["Vaqt tugadi", "#2563eb"],
  PE: ["Fayl xatosi", C.muted],
  "—": ["Yuklanmagan", C.muted],
};

function chart(src: string, maxW = 300, maxH = 360): any[] {
  try {
    const p = parseFprg(src);
    const { svg, width, height } = renderFlowchart(p, "pdf");
    const scale = Math.min(1, maxW / width, maxH / height);
    return [
      {
        columns: [
          { svg, width: width * scale, height: height * scale },
          { text: clipLines(pseudocode(p), 60), font: "Mono", fontSize: 7.5, color: "#0f172a", margin: [10, 0, 0, 0], width: "*" },
        ],
        columnGap: 8,
        margin: [0, 4, 0, 6],
      },
    ];
  } catch (e) {
    return [{ text: "Faylni oʻqib boʻlmadi: " + (e as Error).message, color: C.bad, fontSize: 9 }];
  }
}

function clipLines(s: string, max: number) {
  const l = s.split("\n");
  return l.length > max ? [...l.slice(0, max), `… (+${l.length - max} qator)`].join("\n") : s;
}
const clip = (s: string, n = 400) => (s.length > n ? s.slice(0, n) + "…" : s);

function ringSvg(pct: number, passed: boolean) {
  const r = 46,
    c = 2 * Math.PI * r;
  const col = passed ? C.ok : C.bad;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120"><circle cx="60" cy="60" r="${r}" fill="none" stroke="#e2e8f0" stroke-width="12"/><circle cx="60" cy="60" r="${r}" fill="none" stroke="${col}" stroke-width="12" stroke-linecap="round" stroke-dasharray="${(c * pct) / 100} ${c}" transform="rotate(-90 60 60)"/></svg>`;
}

function answerText(q: ReturnType<typeof questionById.get> & {}, a: unknown): string {
  if (a === undefined || a === null || (Array.isArray(a) && !a.length) || a === "") return "— (javob berilmagan)";
  if (q.type === "true_false") return a === "True" ? "Toʻgʻri" : "Notoʻgʻri";
  if (Array.isArray(a)) return a.slice().sort().join(", ");
  return String(a);
}
function correctText(q: ReturnType<typeof questionById.get> & {}): string {
  const c = q.correct_answer;
  if (q.type === "true_false") return c === "True" ? "Toʻgʻri" : "Notoʻgʻri";
  if (Array.isArray(c)) return q.type === "fill_blank" ? c.join(" / ") : c.join(", ");
  return String(c);
}

export async function buildPdf(a: Attempt): Promise<Blob> {
  const [{ default: pdfMake }, vfs] = await Promise.all([import("pdfmake/build/pdfmake"), loadFonts()]);
  const pm: any = pdfMake;
  pm.vfs = vfs;
  pm.fonts = {
    Inter: { normal: "Inter-R.ttf", bold: "Inter-B.ttf", italics: "Inter-R.ttf", bolditalics: "Inter-B.ttf" },
    InterSB: { normal: "Inter-SB.ttf", bold: "Inter-B.ttf", italics: "Inter-SB.ttf", bolditalics: "Inter-B.ttf" },
    Mono: { normal: "Mono-R.ttf", bold: "Mono-B.ttf", italics: "Mono-R.ttf", bolditalics: "Mono-B.ttf" },
    JetBrainsMono: { normal: "Mono-R.ttf", bold: "Mono-B.ttf", italics: "Mono-R.ttf", bolditalics: "Mono-B.ttf" },
  };
  const r = a.result!;
  const student = `${a.student.lastName} ${a.student.firstName}`;
  const content: any[] = [];

  // ---------- cover ----------
  content.push(
    { text: examConfig.brand.academy.toUpperCase(), color: C.muted, fontSize: 9, bold: true, characterSpacing: 1 },
    { text: `${examConfig.brand.title} — ${examConfig.brand.tagline}`, fontSize: 18, bold: true, margin: [0, 2, 0, 14] },
    {
      columns: [
        {
          width: "*",
          stack: [
            { text: student, fontSize: 16, bold: true },
            { text: `Guruh: ${a.student.group}`, margin: [0, 2, 0, 0] },
            { text: `Sana: ${fmtDateTime(a.finishedAt ?? Date.now())}`, color: C.muted, margin: [0, 2, 0, 0] },
            { text: `Urinish ID: ${a.id}`, font: "Mono", fontSize: 8, color: C.muted, margin: [0, 2, 0, 0] },
            {
              text: r.passed ? "OʻTDI" : "OʻTMADI",
              color: "#fff",
              background: r.passed ? C.ok : C.bad,
              bold: true,
              fontSize: 11,
              margin: [0, 10, 0, 0],
            },
            { text: `Baho: ${r.grade}`, bold: true, margin: [0, 6, 0, 0] },
            r.bonus ? { text: `Bonus (4-qism, hisoblanmaydi): ${r.bonus.score} / ${r.bonus.max}`, color: C.warn, margin: [0, 4, 0, 0] } : {},
          ],
        },
        {
          width: 130,
          stack: [
            { svg: ringSvg(r.percent, r.passed), width: 120, alignment: "center" },
            { text: `${r.percent}%`, fontSize: 22, bold: true, alignment: "center", margin: [0, -78, 0, 0] },
            { text: `${r.total} / ${r.max} ball`, alignment: "center", color: C.muted, fontSize: 9, margin: [0, 2, 0, 44] },
          ],
        },
      ],
    },
    { text: "Qismlar", style: "h2" },
    {
      table: {
        headerRows: 1,
        widths: ["*", 60, 60, 80, 70],
        body: [
          ["Qism", "Ball", "Maks.", "Javob/fayl", "Vaqt"].map((t) => ({ text: t, bold: true, fillColor: C.soft })),
          ...r.parts.map((p) => [
            p.title + (p.counted ? "" : " (bonus)"),
            String(p.score),
            String(p.max),
            `${p.answered}/${p.total}`,
            fmtDuration(p.timeSpentMs),
          ]),
        ],
      },
      layout: "lightHorizontalLines",
      fontSize: 9.5,
    },
    { text: "Mavzular boʻyicha", style: "h2" },
    ...r.topics.map((t) => {
      const pct = t.max ? t.score / t.max : 0;
      return {
        columns: [
          { text: t.name, width: 190, fontSize: 9 },
          {
            canvas: [
              { type: "rect", x: 0, y: 2, w: 240, h: 8, r: 4, color: C.border },
              { type: "rect", x: 0, y: 2, w: Math.max(2, 240 * pct), h: 8, r: 4, color: pct >= 0.6 ? C.ok : pct >= 0.4 ? C.warn : C.bad },
            ],
            width: 250,
          },
          { text: `${t.score}/${t.max}`, fontSize: 9, alignment: "right" },
        ],
        margin: [0, 2, 0, 2],
      };
    }),
  );

  // ---------- questions ----------
  for (const [pi, pc] of examConfig.parts.entries()) {
    if (pc.kind !== "questions") continue;
    content.push({ text: `${pc.title}: test savollari`, style: "h1", pageBreak: "before" });
    a.parts[pi].items.forEach((qid, i) => {
      const q = questionById.get(qid);
      if (!q) return;
      const qr = r.questions.find((x) => x.questionId === qid);
      const ok = !!qr?.correct;
      const block: any[] = [
        {
          columns: [
            { text: `${i + 1}. `, bold: true, width: 18 },
            { text: q.question.replace(/\*\*/g, ""), bold: true, width: "*" },
            { text: ok ? "✓ toʻgʻri" : "✗ notoʻgʻri", color: ok ? C.ok : C.bad, bold: true, width: 70, alignment: "right" },
          ],
        },
        { text: `${topicName(q.topic)} · ${q.type}${q.stdin ? ` · kiritish: ${q.stdin.replace(/\n/g, ", ")}` : ""}`, color: C.muted, fontSize: 8, margin: [18, 1, 0, 2] },
      ];
      if (q.program) block.push({ stack: chart(q.program, 230, 260), margin: [18, 0, 0, 0] });
      if (q.table)
        block.push({
          table: { body: q.table.map((r, ri) => r.map((c, ci) => ({ text: c || " ", font: "Mono", fontSize: 8.5, alignment: ci === 0 || ri === 0 ? "center" : "right", fillColor: ci === 0 || ri === 0 ? C.soft : undefined, color: ci === 0 || ri === 0 ? C.muted : "#0f172a" }))) },
          margin: [18, 2, 0, 4],
        });
      if (q.code) block.push({ text: q.code.join("\n"), font: "Mono", fontSize: 8.5, margin: [18, 2, 0, 4], background: C.soft });
      if (q.options) {
        const chosen = Array.isArray(qr?.answer) ? (qr!.answer as string[]) : [qr?.answer];
        const correct = Array.isArray(q.correct_answer) ? q.correct_answer : [q.correct_answer];
        block.push({
          ul: q.options.map((o, k) => {
            const L = "ABCDE"[k];
            const isC = correct.includes(L),
              isS = chosen.includes(L);
            return {
              text: [{ text: `${L}) `, bold: true }, { text: optText(o), font: "Mono", fontSize: 8.5 }, isC ? { text: "  ← toʻgʻri", color: C.ok, bold: true } : "", isS && !isC ? { text: "  ← tanlangan", color: C.bad, bold: true } : isS ? { text: " (tanlangan)", color: C.ok } : ""],
              color: isC ? C.ok : isS ? C.bad : "#0f172a",
            };
          }),
          margin: [18, 0, 0, 2],
          fontSize: 9,
        });
      } else {
        block.push({
          text: [{ text: "Javob: ", bold: true }, { text: answerText(q, qr?.answer), font: "Mono", color: ok ? C.ok : C.bad }, { text: "   Toʻgʻri javob: ", bold: true }, { text: correctText(q), font: "Mono", color: C.ok }],
          fontSize: 9,
          margin: [18, 2, 0, 2],
        });
      }
      block.push({ text: [{ text: "Izoh: ", bold: true }, q.explanation], fontSize: 8.5, color: "#334155", margin: [18, 2, 0, 0] });
      content.push({ stack: block, unbreakable: !q.program, margin: [0, 6, 0, 6] });
      content.push({ canvas: [{ type: "line", x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 0.5, lineColor: C.border }] });
    });
  }

  // ---------- problems ----------
  for (const [pi, pc] of examConfig.parts.entries()) {
    if (pc.kind !== "problems") continue;
    content.push({ text: `${pc.title}: amaliy masalalar${pc.counted ? "" : " (bonus — hisoblanmaydi)"}`, style: "h1", pageBreak: "before" });
    for (const [i, pid] of a.parts[pi].items.entries()) {
      const p = problemById.get(pid);
      if (!p) continue;
      const pr = r.problems.find((x) => x.problemId === pid && x.part === pc.id);
      const v = VERD[pr?.verdict ?? "—"];
      content.push({
        columns: [
          { text: `P${String(i + 1).padStart(2, "0")}. ${p.title}`, bold: true, fontSize: 11, width: "*" },
          { text: `${v[0]}  ${pr?.points ?? 0}/${pc.points}`, color: v[1], bold: true, width: 160, alignment: "right" },
        ],
        margin: [0, 10, 0, 2],
      });
      content.push({ text: clip(p.story, 500), fontSize: 8.5, color: "#334155" });
      const meta = a.uploads[pid];
      if (!meta) {
        content.push({ text: "Yuklanmagan", color: C.muted, italics: true, margin: [0, 4, 0, 4] });
        continue;
      }
      content.push({ text: `Fayl: ${meta.name} (${(meta.size / 1024).toFixed(1)} KB) · ${pr?.passed ?? 0}/${pr?.total ?? 0} test`, fontSize: 8, color: C.muted, margin: [0, 3, 0, 0] });
      const src = await idb.get<string>(meta.key);
      if (src) content.push(...chart(src, 250, 330));
      if (pr?.tests.length) {
        content.push({
          table: {
            headerRows: 1,
            widths: [22, 34, "*", "*", "*"],
            body: [
              ["#", "Hukm", "Kirish", "Kutilgan", "Natija"].map((t) => ({ text: t, bold: true, fillColor: C.soft, fontSize: 8 })),
              ...pr.tests.map((t, k) => [
                { text: `${k + 1}${t.hidden ? "*" : ""}`, fontSize: 7.5 },
                { text: t.verdict, color: VERD[t.verdict]?.[1] ?? C.muted, bold: true, fontSize: 7.5 },
                { text: clip(t.input.replace(/\n/g, " ⏎ "), 160), font: "Mono", fontSize: 6.8 },
                { text: t.expected !== undefined ? clip(t.expected.replace(/\n/g, " ⏎ "), 160) : t.verdict === "AC" ? "(yashirin — mos keldi)" : "(yashirin)", font: "Mono", fontSize: 6.8, color: t.expected === undefined ? C.muted : "#0f172a" },
                { text: clip((t.error ? `[${t.error}] ` : "") + t.actual.replace(/\n$/, "").replace(/\n/g, " ⏎ "), 200), font: "Mono", fontSize: 6.8 },
              ]),
            ],
          },
          layout: "lightHorizontalLines",
          margin: [0, 2, 0, 2],
        });
        content.push({ text: "* — yashirin test. Yashirin testlarning kutilgan natijasi brauzerda faqat xesh koʻrinishida saqlanadi.", fontSize: 7, color: C.muted });
      }
    }
  }

  const doc = {
    pageSize: "A4",
    pageMargins: [40, 56, 40, 48],
    defaultStyle: { font: "Inter", fontSize: 10, lineHeight: 1.2 },
    styles: { h1: { fontSize: 15, bold: true, color: C.primary, margin: [0, 0, 0, 8] }, h2: { fontSize: 12, bold: true, margin: [0, 16, 0, 6] } },
    header: (page: number) =>
      page === 1
        ? null
        : { columns: [{ text: `${examConfig.brand.academy} · ${examConfig.brand.title}`, color: C.muted, fontSize: 8 }, { text: student, alignment: "right", color: C.muted, fontSize: 8 }], margin: [40, 24, 40, 0] },
    footer: (page: number, pages: number) => ({
      columns: [
        { text: `${student} · ${a.student.group} · ${fmtDateTime(a.finishedAt ?? Date.now())}`, fontSize: 8, color: C.muted },
        { text: `${page} / ${pages}`, alignment: "right", fontSize: 8, color: C.muted },
      ],
      margin: [40, 16, 40, 0],
    }),
    info: { title: `${student} — ${examConfig.brand.title}`, author: examConfig.brand.academy },
    content,
  };
  return new Promise<Blob>((res, rej) => {
    try {
      pm.createPdf(doc).getBlob((b: Blob) => res(b));
    } catch (e) {
      rej(e);
    }
  });
}
