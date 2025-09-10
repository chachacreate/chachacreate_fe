// src/domains/main/routes.ts
import React from "react";
import type { RouteObject } from "react-router-dom";

import MainLandingPage from "@src/domains/main/areas/home/features/main-landing/pages/MainLandingPage";
import MainClassesPage from "@src/domains/main/areas/home/features/main-landing/pages/MainClassesPage";
import ClassesDetailPage from "@src/domains/main/areas/home/features/class-detail/pages/ClassesDetailPage";
import MainClassOrderPage from "@src/domains/main/areas/home/features/class-order/pages/MainClassOrderPage";
import MainClassOrderResultPage from "@src/domains/main/areas/home/features/class-order/pages/MainClassOrderResultPage";

import { productsRoutes } from "@src/domains/main/areas/home/features/products/routes";
import { storesRoutes } from "./areas/home/features/stores/routes";
import { sellRoutes } from "./areas/home/features/sell/routes";
import { mypageRoutes } from "@src/domains/main/areas/mypage/routes";

const mainRoutes: RouteObject[] = [
  {
    path: "main",
    children: [
      { index: true, element: React.createElement(MainLandingPage) },

      // classes
      { path: "classes", element: React.createElement(MainClassesPage) },
      { path: "classes/:classId", element: React.createElement(ClassesDetailPage) },
      { path: "classes/order", element: React.createElement(MainClassOrderPage) },
      { path: "classes/order/result", element: React.createElement(MainClassOrderResultPage) },

      // ✅ products (스프레드로 합침)
      ...productsRoutes,
      ...storesRoutes,
      ...sellRoutes,
      ...mypageRoutes, // 🟢 여기서 스프레드로 합치면 자동으로 /main/mypage 연결됨
    ],
  },
];

export default mainRoutes;
