const tailwindcss = require('tailwindcss')
const autoprefixer = require('autoprefixer')
const reactHotReloadPlugin = require('craco-plugin-react-hot-reload')

module.exports = {
  plugins: [
    {
      plugin: reactHotReloadPlugin,
    },
  ],
  style: {
    postcss: {
      plugins: [tailwindcss, autoprefixer],
    },
  },
}
