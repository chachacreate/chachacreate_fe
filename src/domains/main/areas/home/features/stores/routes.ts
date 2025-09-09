import { lazy, Suspense, createElement } from "react";
import type { RouteObject } from "react-router-dom";

// ✅ Lazy import
const MainStoresPage = lazy(() => import("./pages/MainStoresPage"));
const MainStoreDescription = lazy(() => import("./pages/MainStoreDescription"));

// ✅ Suspense wrapper
const withSuspense = (Comp: React.ComponentType<any>) =>
  createElement(
    Suspense,
    { fallback: createElement("div", { className: "p-6" }, "로딩중…") },
    createElement(Comp)
  );

// ✅ Routes export
export const storesRoutes: RouteObject[] = [
  {
    path: "/main/stores",
    element: withSuspense(MainStoresPage),
  },
  {
    path: "/main/store/description",
    element: withSuspense(MainStoreDescription),
  },
];
