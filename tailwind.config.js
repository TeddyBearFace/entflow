/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: {
          50: "#f0f3f9",
          100: "#d9e0ef",
          500: "#3d5a99",
          700: "#243b6a",
          900: "#1B2A4A",
        },
        brand: {
          blue: "#2E75B6",
          light: "#D5E8F0",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
