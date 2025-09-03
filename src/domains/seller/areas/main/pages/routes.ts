// src/domains/seller/areas/main/routes.ts
import { lazy, Suspense, createElement } from "react";
import type { RouteObject } from "react-router-dom";

// ✅ 절대경로로 수정
const SellerMain = lazy(() =>
  import("@src/domains/seller/areas/main/pages/SellerMain")
);

const suspense = (C: React.ComponentType<any>) =>
  createElement(
    Suspense,
    { fallback: createElement("div", { className: "p-6" }, "로딩…") },
    createElement(C)
  );

export const mainRoutes: RouteObject[] = [
  {
    path: "main", // /seller/:storeUrl/main
    element: suspense(SellerMain),
  },
];
