/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          bg: '#0a0f1e',
          card: '#131929',
          green: '#00d4aa',
          amber: '#f59e0b',
          red: '#ef4444',
          blue: '#3b82f6',
        },
        surface: {
          DEFAULT: '#131929',
          raised: '#1a2238',
          overlay: '#0d1525',
        },
      },
      fontFamily: {
        sans: ['"DM Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
};
