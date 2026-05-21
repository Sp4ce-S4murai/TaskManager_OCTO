import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        terminal: {
          black: "#000000",
          green: "#00FF41"
        }
      },
      fontFamily: {
        mono: ['"Courier New"', '"Fira Code"', "ui-monospace", "monospace"]
      }
    }
  },
  plugins: []
};

export default config;
