/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        myzapp: {
          50: '#e8fff2',
          100: '#c5ffe1',
          200: '#8effc4',
          300: '#46fa9f',
          400: '#10e47d',
          500: '#00d06c',
          600: '#00a352',
          700: '#007f41',
          800: '#036436',
          900: '#05522e',
          950: '#002e17',
          dark: '#060D1F',
          darker: '#030712',
          navy: '#0A1128',
          card: '#0F172A',
          border: 'rgba(255, 255, 255, 0.08)',
        }
      },
      animation: {
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 6s ease-in-out infinite',
        'glow': 'glow 3s ease-in-out infinite alternate',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-12px)' },
        },
        glow: {
          '0%': { boxShadow: '0 0 15px rgba(0, 208, 108, 0.3)' },
          '100%': { boxShadow: '0 0 35px rgba(0, 208, 108, 0.8), 0 0 15px rgba(0, 230, 118, 0.5)' },
        }
      }
    },
  },
  plugins: [require("daisyui")],
  daisyui: {
    themes: [
      {
        myzapp: {
          "primary": "#00D06C",
          "primary-content": "#ffffff",
          "secondary": "#3B82F6",
          "accent": "#00E676",
          "neutral": "#0F172A",
          "base-100": "#060D1F",
          "base-200": "#0A1128",
          "base-300": "#0F172A",
          "info": "#38bdf8",
          "success": "#00D06C",
          "warning": "#fbbf24",
          "error": "#f43f5e",
        },
      },
      "dark",
    ],
  },
};
