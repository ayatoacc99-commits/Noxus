/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        noxus: {
          bg: '#0B0E14',
          surface: '#131A24',
          card: '#1A2230',
          border: '#243044',
          primary: '#6D5DFE',
          'primary-hover': '#5B4FE8',
          secondary: '#00D4FF',
          success: '#10B981',
          warning: '#F59E0B',
          danger: '#EF4444',
          muted: '#64748B',
          text: '#F1F5F9',
          'text-secondary': '#94A3B8',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      boxShadow: {
        glow: '0 0 20px rgba(79, 70, 229, 0.15)',
        'glow-sm': '0 0 12px rgba(79, 70, 229, 0.1)',
        card: '0 1px 3px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.03)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'noxus-gradient': 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)',
      },
    },
  },
  plugins: [],
};
