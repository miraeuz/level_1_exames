import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: process.env.BASE_PATH ?? "./",
  plugins: [react()],
  worker: { format: "es" },
  build: { chunkSizeWarningLimit: 4000, target: "es2020" },
  test: { include: ["tests/**/*.test.ts"], environment: "node" },
} as any);
