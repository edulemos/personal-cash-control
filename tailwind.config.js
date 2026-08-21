/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/renderer/index.html",
    "./src/renderer/src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'bg-main': '#0f172a',
        'bg-card': '#1e293b',
        'accent': '#10b981',
        'accent-hover': '#059669',
      }
    },
  },
  plugins: [],
}
