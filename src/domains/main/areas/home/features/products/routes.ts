// src/domains/main/areas/home/features/products/routes.ts
import React, { lazy, Suspense, createElement } from 'react';
import type { RouteObject } from 'react-router-dom';
import Loading  from '@src/shared/areas/loading/loading';

// ✅ Suspense wrapper
const withSuspense = (Comp: React.ComponentType<any>) =>
  createElement(
    Suspense,
    { fallback: createElement(Loading) },
    createElement(Comp)
  );

const MainProductsPage = lazy(() => import('./pages/MainProductsPage'));
const MainProductsDetail = lazy(() => import('./pages/MainProductsDetail'));


export const productsRoutes: RouteObject[] = [
  { index: true, element: withSuspense(MainProductsPage) },
  { path: ':productId', element: withSuspense(MainProductsDetail) },
];

export default productsRoutes;
