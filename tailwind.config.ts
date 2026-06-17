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
