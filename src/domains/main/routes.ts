// src/domains/main/routes.ts
import React from "react";
import type { RouteObject } from "react-router-dom";
import MainLandingPage from "./areas/home/features/main-landing/pages/MainLandingPage";
import MainClassesPage from "./areas/home/features/main-landing/pages/MainClassesPage";

const routes: RouteObject[] = [
  {
    path: "main",
    children: [
      { index: true, element: React.createElement(MainLandingPage) },
      { path: "classes", element: React.createElement(MainClassesPage) },
    ],
  },
];

export default routes;
