/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        tomato: '#e05c5c',
        darkBg: '#1a1a1a',
        darkCard: '#252525',
        darkBorder: '#2e2e2e',
      },
    },
  },
  plugins: [],
}
