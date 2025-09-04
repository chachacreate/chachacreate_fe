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
    },
  },
  plugins: [],
};
