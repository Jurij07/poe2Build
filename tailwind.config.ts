import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Dark "PoE / Mobalytics" palette
        ink: {
          950: "#0a0a0f",
          900: "#10101a",
          850: "#15151f",
          800: "#1b1b27",
          700: "#252533",
          600: "#33333f",
        },
        gold: {
          DEFAULT: "#c9a227",
          400: "#e2c044",
          300: "#f0d770",
        },
        poe: {
          life: "#e0383a",
          mana: "#3a76e0",
          str: "#e0383a",
          dex: "#5fb04b",
          int: "#4a8fe0",
          notable: "#c9a227",
          keystone: "#e2c044",
        },
        rarity: {
          normal: "#c8c8c8",
          magic: "#8888ff",
          rare: "#ffff77",
          unique: "#af6025",
          gem: "#1ba29b",
        },
      },
      fontFamily: {
        sans: ["ui-sans-serif", "system-ui", "Segoe UI", "Roboto", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
