// Stratified random selection: each topic gets a share proportional to its pool size.
import { bank } from "./bank";
import { mulberry, shuffle } from "./util";
import type { PartConfig } from "../config/exam.config";

export function drawItems(part: PartConfig, seed: number, stratify: boolean, shuffleOrder: boolean): number[] {
  const rnd = mulberry(seed);
  const pool =
    part.kind === "questions"
      ? bank.questions.filter((q) => q.part === part.pool.part).map((q) => ({ id: q.id, group: q.topic }))
      : bank.problems.filter((p) => p.part === part.pool.part).map((p) => ({ id: p.id, group: p.topics[0] }));
  const n = Math.min(part.count, pool.length);
  let chosen: number[];
  if (!stratify) chosen = shuffle(pool, rnd).slice(0, n).map((x) => x.id);
  else {
    const groups = new Map<string, number[]>();
    for (const x of pool) groups.set(x.group, [...(groups.get(x.group) ?? []), x.id]);
    const keys = [...groups.keys()].sort();
    const exact = keys.map((k) => (groups.get(k)!.length / pool.length) * n);
    const take = exact.map(Math.floor);
    let left = n - take.reduce((a, b) => a + b, 0);
    const order = keys.map((_, i) => i).sort((a, b) => exact[b] - take[b] - (exact[a] - take[a]) || rnd() - 0.5);
    for (const i of order) {
      if (left <= 0) break;
      if (take[i] < groups.get(keys[i])!.length) {
        take[i]++;
        left--;
      }
    }
    chosen = keys.flatMap((k, i) => shuffle(groups.get(k)!, rnd).slice(0, take[i]));
  }
  if (shuffleOrder) chosen = shuffle(chosen, rnd);
  else chosen.sort((a, b) => a - b);
  return chosen;
}
