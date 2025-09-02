// src/domains/seller/areas/product/routes.ts
import React, { lazy, Suspense, createElement, type ComponentType } from "react";
import type { RouteObject } from "react-router-dom";
import { Navigate } from "react-router-dom";

// 절대경로 import
const ProductListPage   = lazy(() => import("@src/domains/seller/areas/product/features/list/pages/ProductList"));
const ProductInsertPage = lazy(() => import("@src/domains/seller/areas/product/features/insert/pages/ProductInsert"));
const ProductReviewPage = lazy(() => import("@src/domains/seller/areas/product/features/review/pages/ProductReview"));
const ProductOrderPage  = lazy(() => import("@src/domains/seller/areas/product/features/order/pages/ProductOrder"));

/** Suspense wrapper */
const withSuspense = (Comp: ComponentType<any>) =>
  createElement(
    Suspense,
    { fallback: createElement("div", { className: "p-6" }, "로딩…") },
    createElement(Comp)
  );

/**
 * /seller/:storeUrl/product/*
 */
export const productRoutes: RouteObject[] = [
  {
    path: "/seller/:storeUrl/product",
    children: [
      // JSX <Navigate /> 대신 createElement 사용
      { index: true, element: createElement(Navigate, { to: "list", replace: true }) },
      { path: "list", element: withSuspense(ProductListPage) },
      { path: "insert", element: withSuspense(ProductInsertPage) },
      { path: "review", element: withSuspense(ProductReviewPage) },
      { path: "order", element: withSuspense(ProductOrderPage) },
    ],
  },
];
