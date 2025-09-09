// src/domains/main/areas/home/features/sell/routes.ts
import React, { lazy, Suspense, createElement } from "react";
import type { RouteObject } from "react-router-dom";
import MainSellSellguide from "@src/domains/main/areas/home/features/sell/pages/MainSellSellguide";
import MainSellSellregister from "@src/domains/main/areas/home/features/sell/pages/MainSellSellregister";
import MainSellProducts from "@src/domains/main/areas/home/features/sell/pages/MainSellProducts";
import MainSellManagement from "@src/domains/main/areas/home/features/sell/pages/MainSellManagement";

// Suspense 헬퍼
const withSuspense = (Comp: React.ComponentType<any>) =>
  createElement(
    Suspense,
    { fallback: createElement("div", { className: "p-6" }, "로딩…") },
    createElement(Comp)
  );


// /main/sell/* 라우트
export const sellRoutes: RouteObject[] = [
  {
    path: "/main/sell",
    children: [
      // /main/sell/sellguide
      { path: "sellguide", element: withSuspense(MainSellSellguide) },

      // /main/sell/sellregister
      {
        path: "sellregister", element: withSuspense(MainSellSellregister),
      },

    //   // /main/sell/order/products
      {
        path: "products", element: withSuspense(MainSellProducts),
      },

    //   // /main/sell/adjustment/management 
      {
        path: "management", element: withSuspense(MainSellManagement)
      },
    ],
  },
];
