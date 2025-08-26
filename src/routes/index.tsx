import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import App from "@src/app/App";

// 페이지
import MainLandingPage from "@src/domains/main/areas/home/features/main-landing/pages/MainLandingPage";
import MainClassesPage from "@src/domains/main/areas/home/features/main-landing/pages/MainClassesPage";
import ClassesDetailPage from "@src/domains/main/areas/home/features/class-detail/pages/ClassesDetailPage";

import "./index.css";

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      { index: true, element: <MainLandingPage /> },
      { path: "main", element: <MainLandingPage /> },
      { path: "main/classes", element: <MainClassesPage /> },
      { path: "main/classes/:classId", element: <ClassesDetailPage /> },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);