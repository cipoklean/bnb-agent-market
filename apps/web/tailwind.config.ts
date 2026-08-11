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
        success: "#22C55E",
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
      },
      animation: {
        "fade-in-up": "fade-in-up .35s ease-out both",
        "slide-in-right": "slide-in-right .25s ease-out both",
      },
    },
  },
  plugins: [],
};
export default config;
