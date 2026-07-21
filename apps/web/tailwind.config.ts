import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Aligned to ibtechintl.com (#44b86b / #48bb78 / #38a169 / #2f855a)
        brand: {
          50: "#e1f1e3",
          100: "#dbeede",
          200: "#b7debd",
          300: "#7ddea0",
          400: "#48bb78",
          500: "#44b86b",
          600: "#38a169",
          700: "#2f855a",
          800: "#276749",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      boxShadow: {
        soft: "0 18px 50px -28px rgba(15, 23, 42, 0.28)",
        card: "0 1px 2px rgba(15, 23, 42, 0.04), 0 8px 24px -12px rgba(15, 23, 42, 0.12)",
      },
    },
  },
  plugins: [],
};

export default config;
