// src/domains/seller/areas/resume/routes.ts
import { lazy, Suspense, createElement } from 'react';
import type { RouteObject } from 'react-router-dom';
import Loading  from '@src/shared/areas/loading/loading';

// ✅ 절대경로로 수정
const SellerResume = lazy(
  () => import('@src/domains/seller/areas/resume/pages/ResumeVerification')
);


// ✅ Suspense wrapper
const withSuspense = (Comp: React.ComponentType<any>) =>
  createElement(
    Suspense,
    { fallback: createElement(Loading) },
    createElement(Comp)
  );

export const resumeRoutes: RouteObject[] = [
  {
    path: 'resume', // /seller/:storeUrl/resume
    element: withSuspense(SellerResume),
  },
];
