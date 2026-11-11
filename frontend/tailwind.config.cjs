/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class', // Enable class-based dark mode
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#0ea5e9', // cyan-500
          light: '#7dd3fc', // cyan-300
          dark: '#0284c7', // cyan-600
        },
        accent: {
          DEFAULT: '#10b981', // emerald-500
          light: '#6ee7b7', // emerald-300
          dark: '#059669', // emerald-600
        },
        glass: 'rgba(15, 23, 42, 0.8)', // bg-slate-900/80 equivalent
      },
      backdropBlur: {
        xs: '2px',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 8px 2px rgba(14,165,233,0.6)' },
          '50%': { boxShadow: '0 0 12px 4px rgba(14,165,233,0.9)' },
        },
        'toast-slide-in': {
          '0%': { transform: 'translateY(100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
      animation: {
        'pulse-glow': 'pulse-glow 2s infinite',
        'toast-slide-in': 'toast-slide-in 0.3s ease-out forwards',
      },
    },
  },
  plugins: [],
};

