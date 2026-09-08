import type { Config } from "tailwindcss";

export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-body)", "system-ui", "sans-serif"],
        mono: ["monospace"],
        display: ["var(--font-display)", "sans-serif"],
        body: ["var(--font-body)", "sans-serif"],
      },
      colors: {
        // ── Sistema de temas /empresa ─────────────────────────────────────
        // Los valores viven en globals.css bajo [data-theme]. Se declaran como
        // canales RGB para que los modificadores de opacidad (bg-brand/10) sigan
        // funcionando. Ver "Sistema de color" en globals.css.
        canvas: "rgb(var(--c-canvas) / <alpha-value>)",
        panel: "rgb(var(--c-panel) / <alpha-value>)",
        "panel-2": "rgb(var(--c-panel-2) / <alpha-value>)",
        "panel-3": "rgb(var(--c-panel-3) / <alpha-value>)",
        pop: "rgb(var(--c-pop) / <alpha-value>)",

        fg: "rgb(var(--c-fg) / <alpha-value>)",
        "fg-soft": "rgb(var(--c-fg-soft) / <alpha-value>)",
        "fg-mute": "rgb(var(--c-fg-mute) / <alpha-value>)",
        "fg-dim": "rgb(var(--c-fg-dim) / <alpha-value>)",
        "fg-faint": "rgb(var(--c-fg-faint) / <alpha-value>)",
        "fg-ghost": "rgb(var(--c-fg-ghost) / <alpha-value>)",
        "fg-trace": "rgb(var(--c-fg-trace) / <alpha-value>)",

        line: "rgb(var(--c-line) / <alpha-value>)",
        "line-mid": "rgb(var(--c-line-mid) / <alpha-value>)",
        "line-loud": "rgb(var(--c-line-loud) / <alpha-value>)",

        fill: "rgb(var(--c-fill) / <alpha-value>)",
        "fill-2": "rgb(var(--c-fill-2) / <alpha-value>)",
        "fill-3": "rgb(var(--c-fill-3) / <alpha-value>)",

        brand: "rgb(var(--c-brand) / <alpha-value>)",
        "brand-hi": "rgb(var(--c-brand-hi) / <alpha-value>)",
        "brand-fg": "rgb(var(--c-brand-fg) / <alpha-value>)",
        "on-brand": "rgb(var(--c-on-brand) / <alpha-value>)",
        "on-accent": "rgb(var(--c-on-accent) / <alpha-value>)",

        sand: "rgb(var(--c-sand) / <alpha-value>)",
        "sand-lt": "rgb(var(--c-sand-lt) / <alpha-value>)",
        "sand-fg": "rgb(var(--c-sand-fg) / <alpha-value>)",
        iris: "rgb(var(--c-iris) / <alpha-value>)",
        "iris-fg": "rgb(var(--c-iris-fg) / <alpha-value>)",
        azure: "rgb(var(--c-azure) / <alpha-value>)",
        sky: "rgb(var(--c-sky) / <alpha-value>)",

        // Estados — el tono cambia por tema para no perder contraste en claro.
        ok: "rgb(var(--c-ok) / <alpha-value>)",
        "ok-soft": "rgb(var(--c-ok-soft) / <alpha-value>)",
        warn: "rgb(var(--c-warn) / <alpha-value>)",
        "warn-soft": "rgb(var(--c-warn-soft) / <alpha-value>)",
        danger: "rgb(var(--c-danger) / <alpha-value>)",
        "danger-soft": "rgb(var(--c-danger-soft) / <alpha-value>)",
        info: "rgb(var(--c-info) / <alpha-value>)",
        "info-soft": "rgb(var(--c-info-soft) / <alpha-value>)",
        grape: "rgb(var(--c-grape) / <alpha-value>)",
        "grape-soft": "rgb(var(--c-grape-soft) / <alpha-value>)",
        emerald2: "rgb(var(--c-emerald2) / <alpha-value>)",
        mint: "rgb(var(--c-mint) / <alpha-value>)",
        amber2: "rgb(var(--c-amber2) / <alpha-value>)",
        flame: "rgb(var(--c-flame) / <alpha-value>)",
        tangerine: "rgb(var(--c-tangerine) / <alpha-value>)",

        // Premium blue palette (primary)
        navy: {
          950: "#020511",
          900: "#030611",
          800: "#050a17",
          700: "#080e20",
          600: "#0c1530",
        },
        sapphire: {
          accent: "#4F46E5",
          mid: "#2563EB",
          light: "#3B82F6",
          glow: "#60A5FA",
          sky: "#38BDF8",
        },
        // Secondary accent (luxury signals)
        gold: {
          400: "#D4B483",
          500: "#C8A96E",
          600: "#A07830",
          700: "#7A5A1E",
        },
        // Forest (kept for non-landing use if needed)
        forest: {
          950: "#060F0A",
          900: "#0D1F18",
          800: "#112419",
          700: "#1A3326",
          600: "#1C3D2E",
        },
        surface: {
          50: "#F9F9F7",
          100: "#F5F5F3",
          200: "#EEEEE8",
        },
        ink: {
          900: "#1C1C1C",
          700: "#3A3A3A",
          500: "#6B7B72",
          300: "#B4B2A8",
          100: "#EEEEE8",
        },
      },
      boxShadow: {
        glow: "0 20px 50px -30px rgba(37, 99, 235, 0.6)",
        "glow-sm": "0 10px 30px -15px rgba(37, 99, 235, 0.5)",
        "glow-lg": "0 30px 70px -30px rgba(37, 99, 235, 0.8)",
      },
      animation: {
        "gradient-shift": "gradientShift 8s ease infinite",
      },
      keyframes: {
        gradientShift: {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
