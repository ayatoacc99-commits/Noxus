/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        noxus: {
          bg: '#0a0b0f',
          surface: '#12141c',
          card: '#181b26',
          border: '#252836',
          accent: '#6c5ce7',
          accentHover: '#5b4cdb',
          success: '#00b894',
          warning: '#fdcb6e',
          danger: '#ff6b6b',
          muted: '#8b8fa3',
          text: '#e8e9ed',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
