export type Checker = "exact" | "tokens" | "numeric" | `float:${string}`;

export function normalizeOutput(s: string): string {
  const lines = s.replace(/\r\n?/g, "\n").split("\n").map((l) => l.replace(/[ \t]+$/, ""));
  while (lines.length && lines[lines.length - 1] === "") lines.pop();
  return lines.join("\n");
}

const NUM = /^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/;

function tokEq(a: string, b: string, eps: number | null): boolean {
  if (a === b) return true;
  if (eps !== null && NUM.test(a) && NUM.test(b)) {
    const x = parseFloat(a),
      y = parseFloat(b);
    return Math.abs(x - y) <= eps * Math.max(1, Math.abs(y));
  }
  return false;
}

/** Compare actual vs expected. Returns null when equal, otherwise the 1-based first differing line. */
export function compareOutput(actual: string, expected: string, checker: Checker = "numeric"): { ok: boolean; line?: number } {
  const A = normalizeOutput(actual);
  const E = normalizeOutput(expected);
  if (checker === "exact") return A === E ? { ok: true } : { ok: false, line: firstDiff(A, E) };
  const eps = checker === "tokens" ? null : checker === "numeric" ? 1e-9 : parseFloat(checker.slice(6)) || 1e-6;
  const al = A.split("\n"),
    el = E.split("\n");
  if (checker === "tokens" || checker === "numeric" || checker.startsWith("float:")) {
    // line-structured token comparison: same number of lines, same tokens per line
    const n = Math.max(al.length, el.length);
    for (let i = 0; i < n; i++) {
      const at = (al[i] ?? "").trim().split(/\s+/).filter(Boolean);
      const et = (el[i] ?? "").trim().split(/\s+/).filter(Boolean);
      if (at.length !== et.length || at.some((t, j) => !tokEq(t, et[j], eps))) return { ok: false, line: i + 1 };
    }
    return { ok: true };
  }
  return A === E ? { ok: true } : { ok: false, line: firstDiff(A, E) };
}

function firstDiff(a: string, b: string): number {
  const x = a.split("\n"),
    y = b.split("\n");
  for (let i = 0; i < Math.max(x.length, y.length); i++) if (x[i] !== y[i]) return i + 1;
  return 1;
}

// Small, synchronous SHA-256 (used to ship hidden expected outputs as hashes only)
export function sha256(msg: string): string {
  const K = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01,
    0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc,
    0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147,
    0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070, 0x19a4c116, 0x1e376c08,
    0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
    0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ];
  const bytes = new TextEncoder().encode(msg);
  const l = bytes.length;
  const withPad = new Uint8Array(((l + 9 + 63) >> 6) << 6);
  withPad.set(bytes);
  withPad[l] = 0x80;
  const bits = l * 8;
  const dv = new DataView(withPad.buffer);
  dv.setUint32(withPad.length - 4, bits >>> 0);
  dv.setUint32(withPad.length - 8, Math.floor(bits / 2 ** 32));
  let h = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
  const w = new Uint32Array(64);
  for (let o = 0; o < withPad.length; o += 64) {
    for (let i = 0; i < 16; i++) w[i] = dv.getUint32(o + i * 4);
    for (let i = 16; i < 64; i++) {
      const s0 = ror(w[i - 15], 7) ^ ror(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      const s1 = ror(w[i - 2], 17) ^ ror(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }
    let [a, b, c, d, e, f, g, hh] = h;
    for (let i = 0; i < 64; i++) {
      const S1 = ror(e, 6) ^ ror(e, 11) ^ ror(e, 25);
      const ch = (e & f) ^ (~e & g);
      const t1 = (hh + S1 + ch + K[i] + w[i]) >>> 0;
      const S0 = ror(a, 2) ^ ror(a, 13) ^ ror(a, 22);
      const mj = (a & b) ^ (a & c) ^ (b & c);
      const t2 = (S0 + mj) >>> 0;
      hh = g;
      g = f;
      f = e;
      e = (d + t1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (t1 + t2) >>> 0;
    }
    h = h.map((x, i) => (x + [a, b, c, d, e, f, g, hh][i]) >>> 0);
  }
  return h.map((x) => x.toString(16).padStart(8, "0")).join("");
  function ror(x: number, n: number) {
    return (x >>> n) | (x << (32 - n));
  }
}

/** Canonical form used for hashing hidden outputs: tokens per line, numbers normalised. */
export function canonical(s: string): string {
  return normalizeOutput(s)
    .split("\n")
    .map((l) =>
      l
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .map((t) => (NUM.test(t) ? String(Number(parseFloat(t).toPrecision(12))) : t))
        .join(" "),
    )
    .join("\n");
}
