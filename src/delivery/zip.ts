import JSZip from "jszip";
import { examConfig } from "../config/exam.config";
import { idb } from "../lib/idb";
import type { Attempt } from "../store/types";
import { fileBase, problemFileName } from "./summary";

/** 12-11-2026_Karimova_Malika.zip → 12-11-2026/Karimova_Malika/[3-qism/]P01_….fprg */
export async function buildZip(a: Attempt): Promise<{ blob: Blob; name: string; count: number }> {
  const { date, person } = fileBase(a);
  const zip = new JSZip();
  const root = zip.folder(date)!.folder(person)!;
  let count = 0;
  const original: Record<string, string> = {};
  for (const [i, pc] of examConfig.parts.entries()) {
    if (pc.kind !== "problems") continue;
    const folder = root.folder(pc.title.replace(/\s+/g, "-"))!;
    for (const [j, pid] of a.parts[i].items.entries()) {
      const meta = a.uploads[pid];
      if (!meta) continue;
      const text = await idb.get<string>(meta.key);
      if (text == null) continue;
      const fname = problemFileName(j, pid);
      folder.file(fname, text);
      original[`${pc.title}/${fname}`] = meta.name;
      count++;
    }
  }
  root.file(
    "result.json",
    JSON.stringify({ attemptId: a.id, student: a.student, finishedAt: a.finishedAt, result: a.result, originalFileNames: original }, null, 2),
  );
  const blob = await zip.generateAsync({ type: "blob", compression: "DEFLATE" });
  return { blob, name: `${date}_${person}.zip`, count };
}
