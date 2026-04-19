/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // ============================================
        // BRAND COLORS
        // ============================================
        brand: {
          DEFAULT: '#E8486C',
          light: '#FF6B8A',
          dark: '#D13A5C',
          glow: 'rgba(232, 72, 108, 0.4)',
          subtle: 'rgba(232, 72, 108, 0.1)',
          ring: 'rgba(232, 72, 108, 0.3)',
        },
        // ============================================
        // BACKGROUND COLORS - Warm with Pink Undertones
        // ============================================
        parchment: '#faf7f5',
        ivory: '#fdf8f7',
        'rose-white': '#f5eeec',
        'blush-cream': '#f0e8e6',
        // ============================================
        // NEUTRAL COLORS - Warm Grays
        // ============================================
        neutral: {
          'soft-black': '#1a1a1a',
          'warm-gray': '#6b6565',
          'muted-gray': '#9a9191',
          'light-gray': '#b8b0b0',
          'cream': '#e8e0de',
          'light-cream': '#f0ebe9',
        },
        // ============================================
        // SEMANTIC COLORS - Light Theme
        // ============================================
        surface: {
          primary: '#faf7f5',      // parchment
          secondary: '#fdf8f7',    // ivory
          tertiary: '#f5eeec',     // rose-white
          hover: '#f0e8e6',        // blush-cream
        },
        content: {
          primary: '#1a1a1a',      // soft black
          secondary: '#6b6565',    // warm gray
          tertiary: '#9a9191',     // muted gray
          muted: '#b8b0b0',        // light gray
        },
        border: {
          DEFAULT: '#e8e0de',
          light: '#f0ebe9',
          accent: '#E8486C',
          focus: '#E8486C',
        },
        // ============================================
        // STATE COLORS
        // ============================================
        state: {
          error: '#b53333',
          'error-bg': 'rgba(181, 51, 51, 0.08)',
          success: '#4a7c59',
        },
      },
      // ============================================
      // SPACING - 8px base scale
      // ============================================
      spacing: {
        'xs': '4px',
        'sm': '8px',
        'md': '12px',
        'lg': '16px',
        'xl': '24px',
        '2xl': '32px',
        '3xl': '48px',
        '4xl': '64px',
      },
      // ============================================
      // BORDER RADIUS - Soft, generous rounding
      // ============================================
      borderRadius: {
        'sm': '6px',
        'md': '8px',
        'lg': '12px',
        'xl': '16px',
        '2xl': '24px',
        'full': '9999px',
      },
      // ============================================
      // TYPOGRAPHY - Serif for headlines, Sans for UI
      // ============================================
      fontFamily: {
        serif: ['Georgia', 'Times New Roman', 'serif'],
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
      lineHeight: {
        'tight': '1.2',
        'normal': '1.6',
        'relaxed': '1.75',
      },
      // ============================================
      // SHADOWS - Ring shadows (Claude-style)
      // ============================================
      boxShadow: {
        'ring': '0 0 0 1px #e8e0de',
        'ring-hover': '0 0 0 1px rgba(232, 72, 108, 0.3)',
        'ring-focus': '0 0 0 2px rgba(232, 72, 108, 0.3)',
        'whisper': '0 4px 24px rgba(0, 0, 0, 0.05)',
        'elevated': '0 2px 8px rgba(0, 0, 0, 0.06), 0 4px 24px rgba(0, 0, 0, 0.04)',
        'glow': '0 0 20px rgba(232, 72, 108, 0.4)',
        'glow-strong': '0 0 40px rgba(232, 72, 108, 0.4)',
      },
      // ============================================
      // TRANSITIONS
      // ============================================
      transitionTimingFunction: {
        'smooth': 'cubic-bezier(0.4, 0, 0.2, 1)',
        'bounce-custom': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
      },
      transitionDuration: {
        'fast': '150ms',
        'normal': '250ms',
        'slow': '350ms',
        'bounce': '500ms',
      },
      // ============================================
      // ANIMATIONS
      // ============================================
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
