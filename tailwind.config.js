/** @type {import('tailwindcss').Config} */
const c = (v) => `hsl(var(--${v}) / <alpha-value>)`;
export default {
  darkMode: ["class", '[data-theme="dark"]'],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: { sans: ["Inter", "system-ui", "sans-serif"], mono: ["JetBrains Mono", "ui-monospace", "monospace"] },
      colors: {
        bg: c("bg"), surface: c("surface"), surface2: c("surface-2"), border: c("border"),
        fg: c("fg"), muted: c("muted"), primary: c("primary"), "primary-fg": c("primary-fg"),
        accent: c("accent"), success: c("success"), danger: c("danger"), warning: c("warning"), info: c("info"),
      },
      borderRadius: { xl: "0.875rem", "2xl": "1.125rem" },
      boxShadow: { soft: "0 0.0625rem 0.125rem hsl(var(--shadow) / .06), 0 0.5rem 1.5rem -0.5rem hsl(var(--shadow) / .18)" },
    },
  },
  plugins: [],
};
