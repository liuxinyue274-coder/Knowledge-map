import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))"
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))"
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))"
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))"
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))"
        }
      },
      boxShadow: {
        glow: "0 0 44px rgba(124, 211, 232, 0.18)",
        danger: "0 0 46px rgba(248, 113, 113, 0.45)"
      },
      animation: {
        "soft-pulse": "softPulse 2.4s ease-in-out infinite",
        "trace-in": "traceIn 0.45s ease-out both",
        "spin-slow": "spin 1.4s linear infinite"
      },
      keyframes: {
        softPulse: {
          "0%, 100%": { boxShadow: "0 0 18px rgba(248, 113, 113, 0.32)" },
          "50%": { boxShadow: "0 0 46px rgba(248, 113, 113, 0.58)" }
        },
        traceIn: {
          "0%": { opacity: "0", transform: "translateY(10px) scale(0.98)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" }
        }
      }
    }
  },
  plugins: []
};

export default config;
