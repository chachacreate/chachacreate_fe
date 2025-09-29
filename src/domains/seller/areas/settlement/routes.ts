// src/domains/seller/areas/settlement/routes.ts
import { lazy, Suspense, createElement } from "react";
import type { RouteObject } from "react-router-dom";
import Loading  from '@src/shared/areas/loading/loading';

const SellerSettlementMain = lazy(() => import("./features/main/pages/SellerSettlementMain"));
const SellerSettlementProductPage = lazy(() => import("./features/product/pages/SellerSettlementProduct"));
const SellerSettlementClassPage = lazy(() => import("./features/class/pages/SellerSettlementClass"));


// ✅ Suspense wrapper
const withSuspense = (Comp: React.ComponentType<any>) =>
  createElement(
    Suspense,
    { fallback: createElement(Loading) },
    createElement(Comp)
  );

export const settlementRoutes: RouteObject[] = [
  {
    path: "/seller/:storeUrl/settlement",
    children: [
      { index: true, element: withSuspense(SellerSettlementMain) },
      { path: "product", element: withSuspense(SellerSettlementProductPage) },
      { path: "class", element: withSuspense(SellerSettlementClassPage) },
    ],
  },
];
