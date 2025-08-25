// src/routes/index.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import App from "@src/app/App";

// 페이지
import MainLandingPage from "@src/domains/main/areas/home/features/main-landing/pages/MainLandingPage";
import MainClassesPage from "@src/domains/main/areas/home/features/main-landing/pages/MainClassesPage";

import "./index.css";

// 라우트 트리
const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      { index: true, element: <MainLandingPage /> }, // GET /
      { path: "main", element: <MainLandingPage /> }, // GET /main
      { path: "main/classes", element: <MainClassesPage /> }, // GET /main/classes
    ],
  },
]);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
