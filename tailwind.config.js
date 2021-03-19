const colors = require('tailwindcss/colors')

module.exports = {
  purge: ['./src/**/*.{js,jsx,ts,tsx}', './public/index.html'],
  darkMode: false, // or 'media' or 'class'
  theme: {
    extend: {},
    colors: {
      white: colors.white,
      black: colors.black,
      teal: colors.teal,
      gray: colors.gray,
    },
  },
  variants: {
    extend: {},
  },
  plugins: [],
}
