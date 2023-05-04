/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./views/**/*.ejs", "./views/*.ejs"],
  theme: {
    fontFamily: {
      sans: ["'Signika Negative'"],
    },
    extend: {},
  },
  plugins: [require("daisyui")],
};
