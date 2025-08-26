// src/domains/main/routes.ts
import React from "react";
import type { RouteObject } from "react-router-dom";
import MainLandingPage from "./areas/home/features/main-landing/pages/MainLandingPage";
import MainClassesPage from "./areas/home/features/main-landing/pages/MainClassesPage";
import ClassesDetailPage from "@src/domains/main/areas/home/features/class-detail/pages/ClassesDetailPage";


const routes: RouteObject[] = [
  {
    path: "main",
    children: [
      { index: true, element: React.createElement(MainLandingPage) },
      { path: "classes", element: React.createElement(MainClassesPage) },
      { path: "classes/:classId", element: React.createElement(ClassesDetailPage) },
      { path: "stores", element: React.createElement(MainLandingPage) },
    ],
  },
];

export default routes;
