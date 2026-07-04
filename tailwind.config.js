/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "#07070D",
        surface: "#0E0E18",
        surface2: "#171724",
        line: "#2A2A3A",
        text: "#FFFFFF",
        muted: "#B6B8C8",
        muted2: "#6D7084",
        accent: "#A44BFF",
        accentLight: "#C878FF",
        pink: "#FF4FD8",
        accent2: "#4B7DFF",
        accent2Light: "#67B7FF",
      },
      fontFamily: {
        display: ["'Space Grotesk'", "sans-serif"],
        body: ["'Inter'", "sans-serif"],
        mono: ["'JetBrains Mono'", "monospace"],
      },
    },
  },
  plugins: [],
};
