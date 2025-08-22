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
        bold: [
          'var(--bold-font-family)',
          'jua',
          'Afacad',
          'Helvetica',
          'ui-sans-serif',
          'system-ui',
          'sans-serif',
        ],
        jua: ['Jua', 'sans-serif'],
        poppins: ['Poppins', 'sans-serif'],
        roboto: ['Roboto', 'sans-serif'],
      },
      colors: {
        brand: '#2d4739', // 헤더 색상 별칭(선택)
        'custom-bg': '#F3F4F0',
        'custom-green': '#2A3E34',
        'custom-green-light': '#F3F7E8',
        'custom-gray': '#464C53',
        'custom-border': '#58616A',
        'naver-green': '#1DC800',
        'kakao-yellow': '#FDE500',
        'divider-gray': '#63715F',
      },
    },
  },
  plugins: [],
};
