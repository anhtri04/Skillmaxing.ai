/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Brand Colors
        brand: {
          DEFAULT: '#E8486C',
          light: '#FF6B8A',
          dark: '#D13A5C',
          glow: 'rgba(232, 72, 108, 0.4)',
          subtle: 'rgba(232, 72, 108, 0.1)',
        },
        // Neutral Colors - Dark Theme
        neutral: {
          black: '#0a0a0a',
          'black-soft': '#141414',
          'black-elevated': '#1a1a1a',
          'black-hover': '#252525',
          white: '#ffffff',
          'white-soft': '#f5f5f5',
          'white-muted': '#e0e0e0',
          gray: '#888888',
          'gray-dark': '#444444',
        },
        // Semantic Colors
        surface: {
          primary: '#0a0a0a',
          secondary: '#141414',
          tertiary: '#1a1a1a',
          hover: '#252525',
        },
        content: {
          primary: '#ffffff',
          secondary: '#e0e0e0',
          tertiary: '#888888',
        },
        border: {
          DEFAULT: 'rgba(255, 255, 255, 0.1)',
          accent: '#E8486C',
          focus: '#E8486C',
        },
      },
      spacing: {
        'xs': '4px',
        'sm': '8px',
        'md': '16px',
        'lg': '24px',
        'xl': '32px',
        '2xl': '48px',
        '3xl': '64px',
      },
      borderRadius: {
        'sm': '6px',
        'md': '12px',
        'lg': '16px',
        'xl': '24px',
        'full': '9999px',
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
        mono: ['SF Mono', 'Monaco', 'Cascadia Code', 'Roboto Mono', 'Consolas', 'monospace'],
      },
      fontSize: {
        'xs': '12px',
        'sm': '14px',
        'base': '16px',
        'lg': '18px',
        'xl': '20px',
        '2xl': '24px',
        '3xl': '32px',
      },
      boxShadow: {
        'sm': '0 1px 2px rgba(0, 0, 0, 0.3)',
        'md': '0 4px 12px rgba(0, 0, 0, 0.4)',
        'lg': '0 8px 24px rgba(0, 0, 0, 0.5)',
        'elevated': '0 2px 4px rgba(0, 0, 0, 0.2), 0 8px 24px rgba(0, 0, 0, 0.4)',
        'glow': '0 0 20px rgba(232, 72, 108, 0.4)',
        'glow-strong': '0 0 40px rgba(232, 72, 108, 0.4)',
      },
      transitionTimingFunction: {
        'bounce-custom': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
      },
      transitionDuration: {
        'fast': '150ms',
        'normal': '250ms',
        'slow': '350ms',
        'bounce': '500ms',
      },
      animation: {
        'pulse-glow': 'pulse-glow 2s infinite',
        'typing-bounce': 'typing-bounce 1.4s infinite ease-in-out both',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
        'typing-bounce': {
          '0%, 80%, 100%': { transform: 'scale(0)' },
          '40%': { transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [],
}
