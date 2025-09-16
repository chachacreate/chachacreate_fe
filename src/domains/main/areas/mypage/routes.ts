// src/domains/main/areas/mypage/routes.ts
import { lazy, Suspense, createElement } from 'react';
import type { RouteObject } from 'react-router-dom';
import MainMypageOrderdetail from './pages/MainMypageOrderdetail';
import { ROLES } from '@src/shared/routingGuard/types/role';
import { wrapRoutesWithProtection } from '@src/shared/util/routeWrapper';

// ✅ lazy import (실제 파일 경로는 프로젝트 구조에 맞게 수정)
const MainMypagePage = lazy(() => import('./pages/MainMypagePage'));
const MainMypageCartPage = lazy(() => import('./pages/MainMypageCart'));
const MainMypageOrdersPage = lazy(() => import('./pages/MainMypageOrders'));
const MainMypageClassesPage = lazy(() => import('./pages/MainMypageclasses'));
const MainMypageMessagePage = lazy(() => import('./pages/MainMypageMessage'));
const MainMypageMyreviewPage = lazy(() => import('./pages/MainMypageMyreviews'));

// Suspense 래퍼
const withSuspense = (Comp: React.ComponentType<any>) =>
  createElement(
    Suspense,
    { fallback: createElement('div', { className: 'p-6' }, '로딩 중…') },
    createElement(Comp)
  );

// ✅ 라우트 정의 - 상대 경로로 재사용 가능하게 수정
export const mypageRoutes: RouteObject[] = [
  {
    path: 'mypage',
    children: wrapRoutesWithProtection(
      [
        { index: true, element: withSuspense(MainMypagePage) },
        { path: 'cart', element: withSuspense(MainMypageCartPage) },
        { path: 'orders', element: withSuspense(MainMypageOrdersPage) },
        { path: 'classes', element: withSuspense(MainMypageClassesPage) },
        { path: 'message', element: withSuspense(MainMypageMessagePage) },
        { path: 'myreview', element: withSuspense(MainMypageMyreviewPage) },
        { path: 'orders/:orderId', element: withSuspense(MainMypageOrderdetail) },
      ],
      [ROLES.USER, ROLES.PERSONAL_SELLER, ROLES.SELLER, ROLES.ADMIN]
    ),
  },
];
