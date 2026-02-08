/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        dark: {
          900: '#0b0f1a',
          800: '#111827',
          700: '#1a2332',
          600: '#243044',
          500: '#334155',
        }
      }
    },
  },
  plugins: [],
}
