import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  safelist: [
    { 
      pattern: /(bg|text|border)-terminal-(green|cyan|yellow|magenta|red|black|gray)/,
      variants: ['hover']
    }
  ],
  theme: {
    extend: {
      colors: {
        terminal: {
          black: "#000000",
          green: "#00FF41",
          cyan: "#00FFFF",
          yellow: "#FFFF00",
          magenta: "#FF00FF",
          red: "#FF003C",
          gray: "#333333"
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
