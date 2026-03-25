import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        // Noto Sans supports Devanagari (Hindi) + Latin
        sans: ['Noto Sans', 'Noto Sans Devanagari', 'system-ui', 'sans-serif'],
        // Space Mono for numbers, data, invoice amounts
        mono: ['Space Mono', 'Courier New', 'monospace'],
        // Display heading font
        display: ['Syne', 'Noto Sans', 'sans-serif'],
      },
      colors: {
        // Saffron-orange primary — India, trust, tax
        saffron: {
          50: '#fff7ed',
          100: '#ffedd5',
          200: '#fed7aa',
          300: '#fdba74',
          400: '#fb923c',
          500: '#f97316',
          600: '#ea580c',
          700: '#c2410c',
          800: '#9a3412',
          900: '#7c2d12',
          950: '#431407',
        },
        // Deep charcoal surface
        surface: {
          50: '#f8f7f4',
          100: '#f0ede8',
          200: '#e0dbd2',
          300: '#ccc4b8',
          400: '#b0a594',
          500: '#968879',
          600: '#7d6f62',
          700: '#655a50',
          800: '#534a44',
          900: '#463f3a',
          950: '#1a1614',
        },
        // Emerald for success/eligible ITC
        emerald: {
          400: '#34d399',
          500: '#10b981',
          600: '#059669',
        },
        // Rose for blocked/ineligible
        rose: {
          400: '#fb7185',
          500: '#f43f5e',
          600: '#e11d48',
        },
      },
      animation: {
        'slide-up': 'slideUp 0.3s ease-out',
        'fade-in': 'fadeIn 0.2s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'shimmer': 'shimmer 1.5s infinite',
      },
      keyframes: {
        slideUp: {
          '0%': { transform: 'translateY(8px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
    },
  },
  plugins: [],
}

export default config
