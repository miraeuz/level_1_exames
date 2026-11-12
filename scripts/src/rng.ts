export interface Rng {
  int(a: number, b: number): number;
  pick<T>(xs: T[]): T;
  chance(p: number): boolean;
  step(a: number, b: number, s: number): number;
}

export function rng(seed: number): Rng {
  let s = seed >>> 0;
  const next = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const int = (a: number, b: number) => a + Math.floor(next() * (b - a + 1));
  return {
    int,
    pick: (xs) => xs[Math.floor(next() * xs.length)],
    chance: (p) => next() < p,
    step: (a, b, st) => a + st * int(0, Math.floor((b - a) / st)),
  };
}

export function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}
