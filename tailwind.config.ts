import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0B0B0B",
        coal: "#171717",
        ash: "#2A2A2A",
        mist: "#A3A3A3",
        blaze: { DEFAULT: "#FF6B00", soft: "#FF8A33" },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        display: ["Anton", "Impact", "sans-serif"],
      },
      letterSpacing: { tightest: "-0.04em" },
      keyframes: {
        fadeUp: { "0%": { opacity: "0", transform: "translateY(12px)" }, "100%": { opacity: "1", transform: "none" } },
        fadeIn: { "0%": { opacity: "0" }, "100%": { opacity: "1" } },
        marquee: { "0%": { transform: "translateX(0)" }, "100%": { transform: "translateX(-50%)" } },
      },
      animation: {
        fadeUp: "fadeUp .6s cubic-bezier(.2,.7,.2,1) both",
        fadeIn: "fadeIn .45s ease both",
        marquee: "marquee 40s linear infinite",
      },
    },
  },
  plugins: [],
} satisfies Config;
