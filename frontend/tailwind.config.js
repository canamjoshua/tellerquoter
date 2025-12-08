/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Source Sans Pro"', "sans-serif"],
      },
      colors: {
        teller: {
          // Neutrals
          charcoal: "#494D50",
          "dark-silver": "#A5A5A5",
          silver: "#E6E6E6",
          "light-silver": "#F7F8F9",
          // Complementary Colors
          "sky-blue": "#6FCBDC",
          "cool-blue": "#609bb0",
          "steel-blue": "#516B84",
          // Call-to-Action
          "cta-green": "#6BC153",
          "cta-green-hover": "#5ba845",
        },
      },
    },
  },
  plugins: [],
};
