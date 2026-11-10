/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
        },
        sakura: {
          50: '#fff1f2',
          100: '#ffe4e6',
          500: '#f43f5e',
          600: '#e11d48',
        },
        matcha: {
          50: '#f0fdf4',
          100: '#dcfce7',
          500: '#22c55e',
          600: '#16a34a',
        }
      },
      fontFamily: {
        sans: ['"Be Vietnam Pro"', '"Inter"', '"Noto Sans JP"', 'system-ui', 'sans-serif'],
        japanese: ['"Noto Sans JP"', '"Hiragino Kaku Gothic ProN"', '"Yu Gothic UI"', '"Meiryo"', '"Be Vietnam Pro"', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
