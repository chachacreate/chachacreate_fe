// src/domains/seller/areas/main/routes.ts
import { lazy, Suspense, createElement } from "react";
import type { RouteObject } from "react-router-dom";
import Loading  from '@src/shared/areas/loading/loading';

// ✅ 절대경로로 수정
const SellerMain = lazy(() =>
  import("@src/domains/seller/areas/main/pages/SellerMain")
);


// ✅ Suspense wrapper
const withSuspense = (Comp: React.ComponentType<any>) =>
  createElement(
    Suspense,
    { fallback: createElement(Loading) },
    createElement(Comp)
  );

export const mainRoutes: RouteObject[] = [
  {
    path: "main", // /seller/:storeUrl/main
    element: withSuspense(SellerMain),
  },
];
