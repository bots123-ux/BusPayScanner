/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: { DEFAULT: "#f97316", dark: "#ea6c0a" },
        surface: { DEFAULT: "#0f0f1a", card: "#1a1a2e", border: "rgba(255,255,255,0.08)" },
      },
    },
  },
  plugins: [],
};
