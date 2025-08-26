import { Outlet } from "react-router-dom";

export default function App() {
  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1">
        {/* 자식 라우트가 여기 렌더링됩니다 */}
        <Outlet />
      </main>
    </div>
  );
}
