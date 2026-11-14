import { examConfig } from "../config/exam.config";
import { problemById } from "../lib/bank";
import { escapeHtml, fmtDate, fmtDateTime, fmtDuration, safeName } from "../lib/util";
import type { Attempt } from "../store/types";

export function fileBase(a: Attempt) {
  const d = fmtDate(new Date(a.finishedAt ?? a.updatedAt), examConfig.delivery.dateFormat);
  return { date: d, person: `${safeName(a.student.lastName)}_${safeName(a.student.firstName)}` };
}

export function resultMessage(a: Attempt): string {
  const r = a.result!;
  const e = escapeHtml;
  const spent = a.parts.reduce((s, p) => s + p.timeSpentMs, 0);
  const lines = [
    `<b>📋 ${e(examConfig.brand.title)} — ${e(examConfig.brand.tagline)}</b>`,
    `👤 <b>${e(a.student.lastName)} ${e(a.student.firstName)}</b> · ${e(a.student.group)}`,
    `🕒 ${fmtDateTime(a.finishedAt ?? Date.now())}`,
    ``,
    `<b>Natija: ${r.total} / ${r.max} (${r.percent}%) — ${r.passed ? "✅ OʻTDI" : "❌ OʻTMADI"}</b>`,
    `Baho: ${e(r.grade)}`,
    ...r.parts.map((p) => `• ${e(p.title)}: ${p.score}/${p.max}${p.counted ? "" : " (bonus, hisoblanmaydi)"} · ${fmtDuration(p.timeSpentMs)}`),
  ];
  const probs = r.problems;
  for (const pc of examConfig.parts.filter((x) => x.kind === "problems")) {
    const list = probs.filter((x) => x.part === pc.id);
    if (!list.length) continue;
    lines.push(``, `<b>${e(pc.title)} hukmlari:</b>`);
    const cells = list.map((x, i) => `P${String(i + 1).padStart(2, "0")} ${x.verdict === "—" ? "—" : x.verdict} ${x.points}/${x.maxPoints}`);
    for (let i = 0; i < cells.length; i += 4) lines.push(`<code>${e(cells.slice(i, i + 4).join(" · "))}</code>`);
  }
  lines.push(``, `⏱ Sarflangan vaqt: ${fmtDuration(spent)}`, `🆔 <code>${a.id}</code>`);
  return lines.join("\n");
}

export function startMessage(a: Attempt): string {
  return `▶️ <b>${escapeHtml(a.student.lastName)} ${escapeHtml(a.student.firstName)}</b> (${escapeHtml(a.student.group)}) imtihonni boshladi (${escapeHtml(examConfig.brand.tagline)}) · ${fmtDateTime(a.createdAt)}\n🆔 <code>${a.id}</code>`;
}

export function problemFileName(index: number, pid: number) {
  const p = problemById.get(pid);
  return `P${String(index + 1).padStart(2, "0")}_${safeName(p?.title ?? String(pid))}.fprg`;
}
