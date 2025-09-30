# chachacreate_fe

## 📌 소개
`chachacreate_fe`는 **React + TypeScript + Vite** 기반의 프론트엔드 프로젝트입니다.  
수공예 커뮤니티/커머스 플랫폼의 프론트엔드 역할을 담당하며, 판매자와 구매자 모두를 위한 UI/UX를 제공합니다.

---

## 🚀 주요 기능
- 🔑 회원가입 / 로그인 / JWT 기반 인증
- 🏪 개인 판매자 / 스토어 판매자 구분 및 관리
- 🛍️ 상품 등록, 수정, 삭제 및 조회
- 📦 장바구니, 주문, 결제 연동
- 💬 메시지/채팅 기능
- 👤 마이페이지 (회원 정보, 주문 내역, 판매 관리)
- 🎨 반응형 UI (TailwindCSS)

---

## 🛠 기술 스택
- **Framework**: [React](https://reactjs.org/) + [TypeScript](https://www.typescriptlang.org/)
- **Bundler**: [Vite](https://vitejs.dev/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **State Management**: React Hooks, Context API
- **Lint & Format**:
  - [ESLint](https://eslint.org/)
  - [Prettier](https://prettier.io/)

---

## 📂 폴더 구조

chachacreate_fe/
├─ src/
│ ├─ domains/ # 주요 도메인별 페이지
│ ├─ shared/ # 공용 컴포넌트 및 UI
│ ├─ libs/ # API 요청 유틸 등
│ ├─ assets/ # 이미지, 폰트 등 정적 리소스
│ └─ App.tsx # 라우팅 및 전역 레이아웃
├─ public/ # 정적 파일
├─ index.html # 앱 진입점
├─ vite.config.ts # Vite 설정
├─ tsconfig.json # TypeScript 설정
└─ eslint.config.js # ESLint 설정


---

## ⚙️ 실행 방법

### 1. 설치
```bash
git clone https://github.com/your-repo/chachacreate_fe.git
cd chachacreate_fe
npm install

2. 개발 서버 실행
npm run dev


➡ http://localhost:5173
 에서 확인 가능

3. 빌드
npm run build

4. 프리뷰
npm run preview

✅ 코드 컨벤션

Linting: ESLint + Prettier 적용

Type Checking: strict 모드 적용

React ESLint Rules:

import reactX from "eslint-plugin-react-x";
import reactDom from "eslint-plugin-react-dom";

export default tseslint.config([
  globalIgnores(["dist"]),
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      reactX.configs["recommended-typescript"],
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ["./tsconfig.node.json", "./tsconfig.app.json"],
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
]);

📌 추가 예정

관리자 페이지 UI/UX

접근성(Barrier-free) 개선

반응형 모바일 최적화

SEO 대응


👥 팀 소개

차민건: PM, 로그인/채팅 구현, 서비스 배포 및 관리
천희찬: 주문 상태 처리 구현, 상품 판매 통계 그래프 구현
안세현: 상품 정산/매출 구현, 클래스 예약 조회/ 통계 구현
김지민: 반응형 디자인, React 페이지 제작 및 라우팅
최윤정: 가격추천 인공지능 학습, 상품/클래스 등록/수정/삭제 구현
이재희: RDBMS/NoSQL/S3 배포 및 관리, 상품/스토어 결제 및 주문 구현

