import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

// VARIANT=v2 builds the second exam variant (own question bank, own saved sessions).
const variant = process.env.VARIANT ?? "v1";
process.env.VITE_VARIANT = variant;
const basePath = process.env.BASE_PATH;
const base = basePath ? (variant === "v1" ? basePath : `${basePath}${variant}/`) : "./";

export default defineConfig({
  base,
  plugins: [react()],
  worker: { format: "es" },
  resolve: {
    alias:
      variant === "v1"
        ? []
        : [{ find: /^.*\/data\/bank\.json$/, replacement: fileURLToPath(new URL(`./src/data/bank-${variant}.json`, import.meta.url)) }],
  },
  build: { chunkSizeWarningLimit: 4000, target: "es2020", outDir: variant === "v1" ? "dist" : `dist/${variant}` },
  test: { include: ["tests/**/*.test.ts"], environment: "node" },
} as any);
