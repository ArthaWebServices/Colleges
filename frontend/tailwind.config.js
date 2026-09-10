/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        college: {
          navy: '#002147',     // Deep Academic Navy
          navyLight: '#003366',
          gold: '#D4AF37',     // Royal Gold Accent
          goldHover: '#B89628',
          maroon: '#800020',   // Heritage Maroon
          lightBg: '#F8FAFC',
          card: '#FFFFFF',
          textDark: '#0F172A',
          textMuted: '#475569',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        heading: ['Outfit', 'Inter', 'sans-serif'],
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(0, 33, 71, 0.08)',
        'card-hover': '0 12px 24px -4px rgba(0, 33, 71, 0.12), 0 4px 6px -2px rgba(0, 33, 71, 0.04)',
      }
    },
  },
  plugins: [],
}

