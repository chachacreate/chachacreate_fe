// src/domains/seller/areas/class/routes.ts
import { lazy, Suspense, createElement } from "react";
import type { RouteObject } from "react-router-dom";

// lazy imports
const ClassInsertPage = lazy(() => import("./features/insert/pages/ClassInsert"));
const ClassListPage = lazy(() => import("./features/list/pages/ClassList"));
const ClassReservationPage = lazy(() => import("./features/reservation/pages/ClassReservation"));
const ClassEditPage = lazy(() => import("./features/edit/pages/ClassEdit"));

const withSuspense = (Comp: React.ComponentType<any>) =>
  createElement(
    Suspense,
    { fallback: createElement("div", { className: "p-6" }, "로딩…") },
    createElement(Comp)
  );

export const classRoutes: RouteObject[] = [
  {
    path: "/seller/:storeUrl/class",
    children: [
      { path: "insert", element: withSuspense(ClassInsertPage) },
      { path: "list", element: withSuspense(ClassListPage) },
      { path: "reservation", element: withSuspense(ClassReservationPage) },
      { path: ":classId/edit", element: withSuspense(ClassEditPage) },
    ],
  },
];
