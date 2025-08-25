// src/main.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import App from "./app/App";

// 페이지들
import MainLandingPage from "./domains/main/areas/home/features/main-landing/pages/MainLandingPage";
import MainClassesPage from "./domains/main/areas/home/features/main-landing/pages/MainClassesPage";

// 스타일 (Tailwind)
import "./routes/index.css";

// 라우터 설정
const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      { index: true, element: <MainLandingPage /> }, // /
      { path: "main", element: <MainLandingPage /> }, // /main
      { path: "main/classes", element: <MainClassesPage /> }, // /main/classes
    ],
  },
]);

// 렌더링
ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
