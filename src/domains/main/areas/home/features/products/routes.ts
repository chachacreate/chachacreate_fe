// src/domains/main/areas/home/features/products/routes.ts
import React, { lazy, Suspense, createElement } from "react";
import type { RouteObject } from "react-router-dom";

const MainProductsPage = lazy(
  () => import("./pages/MainProductsPage")
);
const MainProductsDetail = lazy(
  () => import("./pages/MainProductsDetail")
);

const withSuspense = (Comp: React.ComponentType<any>) =>
  createElement(
    Suspense,
    { fallback: createElement("div", { className: "p-6" }, "로딩…") },
    createElement(Comp)
  );

export const productsRoutes: RouteObject[] = [
  { path: "products", element: withSuspense(MainProductsPage) },
  { path: "products/:productId", element: withSuspense(MainProductsDetail) },
];

export default productsRoutes;
