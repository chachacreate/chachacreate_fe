// tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  // Vite는 index.html이 루트에 있으니 반드시 포함하세요.
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}', // src 전부 스캔
  ],
  theme: {
    extend: {
      // CSS 변수도 배열로 넣어두는 게 안전합니다.
      fontFamily: {
        jua: ['Jua', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        brand: {
          900: '#2D4739',
          100: '#F8F3E5',
          50:  '#FDFAF2',
        }
      },

      keyframes: {
        'fade-up': {
          '0%':   { opacity: 0, transform: 'translateY(18px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' }
        },
        'fade-left': {
          '0%':   { opacity: 0, transform: 'translateX(24px)' },
          '100%': { opacity: 1, transform: 'translateX(0)' }
        },
        'fade-right': {
          '0%':   { opacity: 0, transform: 'translateX(-24px)' },
          '100%': { opacity: 1, transform: 'translateX(0)' }
        },
      },
      animation: {
        'fade-up': 'fade-up 0.7s ease-out both',
        'fade-left': 'fade-left 0.7s ease-out both',
        'fade-right': 'fade-right 0.7s ease-out both',
      },

    },
  },
  plugins: [],
};
