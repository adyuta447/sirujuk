import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: { DEFAULT: "#24446d", dark: "#1d3b61" },
        canvas: "#f4f7fb",
        ink: "#172b43",
        muted: "#77869a",
        line: "#e4eaf1",
        risk: { green: "#319568", yellow: "#c58a23", red: "#c85555" },
      },
      borderRadius: { panel: "18px", control: "12px", "4xl": "2rem" },
    },
  },
  plugins: [],
};

export default config;
