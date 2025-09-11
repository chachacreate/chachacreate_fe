// src/domains/main/areas/home/features/sell/routes.ts
import React, { Suspense, createElement } from 'react';
import type { RouteObject } from 'react-router-dom';
import MainSellSellguide from '@src/domains/main/areas/home/features/sell/pages/MainSellSellguide';
import MainSellSellregister from '@src/domains/main/areas/home/features/sell/pages/MainSellSellregister';
import MainSellProducts from '@src/domains/main/areas/home/features/sell/pages/MainSellProducts';
import MainSellManagement from '@src/domains/main/areas/home/features/sell/pages/MainSellManagement';
import { wrapRoutesWithProtection } from '@src/shared/util/routeWrapper';
import { ROLES } from '@src/shared/routingGuard/types/role';

// Suspense 헬퍼
const withSuspense = (Comp: React.ComponentType<any>) =>
  createElement(
    Suspense,
    { fallback: createElement('div', { className: 'p-6' }, '로딩…') },
    createElement(Comp)
  );

const protectedSellRoutes = [
  { path: 'sellregister', element: withSuspense(MainSellSellregister) },
  { path: 'products', element: withSuspense(MainSellProducts) },
  { path: 'management', element: withSuspense(MainSellManagement) },
];

// /main/sell/* 라우트
export const sellRoutes: RouteObject[] = [
  {
    path: '/main/sell',
    children: [
      // /main/sell/sellguide
      { path: 'sellguide', element: withSuspense(MainSellSellguide) },

      ...wrapRoutesWithProtection(protectedSellRoutes, [ROLES.PERSONAL_SELLER, ROLES.ADMIN]), // 보호
    ],
  },
];
