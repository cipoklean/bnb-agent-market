import type { Config } from "tailwindcss";

// The Gilded Grimoire — obsidian & candlelight. Legacy class names (bg,
// surface, text, primary, …) are aliases onto the grimoire tokens so every
// existing surface reskins centrally; the named tokens (ink, umber, gold,
// bronze, verdigris, ember, brass) are the canonical palette.
const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // canonical tokens
        ink: "#100D0A",
        umber: "#241C15",
        parchment: "#EDE3CC",
        gold: "#F0B90B",
        bronze: "#A9720C",
        verdigris: "#4E8C6E",
        ember: "#B84A2E",
        brass: "#C89B55",
        // legacy aliases (used across the app)
        bg: "#100D0A",
        surface: "#241C15",
        "surface-2": "#2C221A",
        border: "#A9720C",
        text: "#EDE3CC",
        muted: "#B5A98E",
        primary: "#F0B90B",
        "primary-contrast": "#100D0A",
        amber: "#E0855F",
        // text-safe tints (small text stays WCAG AA on umber/ink)
        success: "#5FA07E",
        warning: "#E0855F",
        danger: "#E0855F",
        info: "#C89B55",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "IBM Plex Sans", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
        display: ["var(--font-display)", "Georgia", "serif"],
      },
      opacity: {
        8: "0.08",
        12: "0.12",
      },
      borderRadius: {
        card: "4px",
        btn: "3px",
        input: "3px",
      },
      boxShadow: {
        panel: "0 0 0 1px rgba(169,114,12,0.18), 0 12px 32px -20px rgba(0,0,0,0.9)",
        "panel-soft": "0 0 0 1px rgba(169,114,12,0.14)",
        glow: "0 0 0 1px rgba(240,185,11,0.22), 0 0 18px -6px rgba(240,185,11,0.3)",
        "glow-lg":
          "0 0 0 1px rgba(240,185,11,0.28), 0 18px 60px -24px rgba(240,185,11,0.3)",
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
