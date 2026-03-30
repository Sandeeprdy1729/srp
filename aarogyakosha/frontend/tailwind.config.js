/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        /* letters.app palette — soft blue accent, near-black text, light grays */
        brand: {
          50:  '#f0f6ff',
          100: '#dceaff',
          200: '#b8d5ff',
          300: '#85b8ff',
          400: '#5a9cf7',
          500: '#4a90e2',
          600: '#3b7dd4',
          700: '#2e66b3',
          800: '#264f8a',
          900: '#1e3d6d',
        },
        surface: '#f6f7f9',        /* page background – matches letters.app off-white */
        card:    '#ffffff',
        border:  '#e5e7eb',         /* card/input borders */
      },
      fontFamily: {
        sans: [
          'Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI',
          'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif',
        ],
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.25rem',
        '4xl': '1.75rem',
        'pill': '9999px',
      },
      boxShadow: {
        'xs':       '0 1px 2px rgba(0,0,0,0.04)',
        'card':     '0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)',
        'elevated': '0 4px 24px rgba(0,0,0,0.08)',
        'modal':    '0 24px 64px -12px rgba(0,0,0,0.2)',
      },
      animation: {
        'fade-in':   'fadeIn 0.25s ease-out',
        'slide-up':  'slideUp 0.3s ease-out',
        'scale-in':  'scaleIn 0.2s ease-out',
      },
      keyframes: {
        fadeIn:  { '0%': { opacity: '0' },          '100%': { opacity: '1' } },
        slideUp: { '0%': { opacity: '0', transform: 'translateY(10px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        scaleIn: { '0%': { opacity: '0', transform: 'scale(0.96)' },     '100%': { opacity: '1', transform: 'scale(1)' } },
      },
    },
  },
  plugins: [],
}
