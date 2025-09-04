// src/domains/seller/areas/resume/routes.ts
import { lazy, Suspense, createElement } from 'react';
import type { RouteObject } from 'react-router-dom';

// ✅ 절대경로로 수정
const SellerResume = lazy(
  () => import('@src/domains/seller/areas/resume/pages/ResumeVerification')
);

const suspense = (C: React.ComponentType<any>) =>
  createElement(
    Suspense,
    { fallback: createElement('div', { className: 'p-6' }, '로딩…') },
    createElement(C)
  );

export const resumeRoutes: RouteObject[] = [
  {
    path: 'resume', // /seller/:storeUrl/resume
    element: suspense(SellerResume),
  },
];
