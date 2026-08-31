import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0B0E14",
        surface: "#121826",
        "surface-2": "#1A2233",
        border: "#263043",
        text: "#F5F7FA",
        muted: "#98A2B3",
        primary: "#F0B90B",
        "primary-contrast": "#0B0E14",
        gold: "#F0B90B",
        amber: "#F59E0B",
        success: "#2EBD85",
        warning: "#F59E0B",
        danger: "#EF4444",
        info: "#6C8CFF",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "Inter", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      opacity: {
        8: "0.08",
        12: "0.12",
      },
      borderRadius: {
        card: "16px",
        btn: "10px",
        input: "10px",
      },
      boxShadow: {
        panel: "0 12px 40px -12px rgba(0,0,0,0.55)",
        "panel-soft": "0 4px 20px -8px rgba(0,0,0,0.4)",
        glow: "0 0 0 1px rgba(240,185,11,0.25), 0 0 24px -6px rgba(240,185,11,0.35)",
        "glow-lg":
          "0 0 0 1px rgba(240,185,11,0.30), 0 24px 80px -20px rgba(240,185,11,0.35), 0 8px 40px -12px rgba(0,0,0,0.6)",
      },
      keyframes: {
        "fade-in-up": {
          from: { opacity: "0", transform: "translateY(10px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in-right": {
          from: { transform: "translateX(100%)" },
          to: { transform: "translateX(0)" },
        },
        aurora: {
          "0%, 100%": { transform: "translate(0, 0) scale(1)", opacity: "0.55" },
          "33%": { transform: "translate(6%, -8%) scale(1.15)", opacity: "0.8" },
          "66%": { transform: "translate(-6%, 6%) scale(0.95)", opacity: "0.5" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-8px)" },
        },
        "pulse-glow": {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(240,185,11,0.0)" },
          "50%": { boxShadow: "0 0 0 6px rgba(240,185,11,0.10)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      animation: {
        "fade-in-up": "fade-in-up .35s ease-out both",
        "slide-in-right": "slide-in-right .25s ease-out both",
        aurora: "aurora 14s ease-in-out infinite",
        float: "float 6s ease-in-out infinite",
        "pulse-glow": "pulse-glow 3s ease-in-out infinite",
        shimmer: "shimmer 6s linear infinite",
      },
    },
  },
  plugins: [],
};
export default config;
