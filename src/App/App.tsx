// src/app/App.tsx
import { Routes, Route, Navigate } from "react-router-dom";
import Header from "@src/shared/areas/layout/features/header/Header";

export default function App() {
  return (
    <>
      {/* 공통 헤더 */}
      <Header />

      {/* 라우팅 */}
      <Routes>
        {/* /를 /main으로 리다이렉트 */}
        <Route path="/" element={<Navigate to="/main" replace />} />

        {/* 메인 임시 페이지 */}
        <Route
          path="/main"
          element={
            <main style={{ padding: 16 }}>
              <h1>메인 페이지 (임시)</h1>
              <p>여기가 보여야 정상입니다.</p>
            </main>
          }
        />
      </Routes>
    </>
  );
}
