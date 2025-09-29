import { lazy, Suspense, createElement } from 'react';
import type { RouteObject } from 'react-router-dom';
import { ROLES } from '@src/shared/routingGuard/types/role';
import { wrapRoutesWithProtection } from '@src/shared/util/routeWrapper';
import Loading  from '@src/shared/areas/loading/loading';

// ✅ Suspense wrapper
const withSuspense = (Comp: React.ComponentType<any>) =>
  createElement(
    Suspense,
    { fallback: createElement(Loading) },
    createElement(Comp)
  );

// ✅ Lazy import
const MainStoresPage = lazy(() => import('./pages/MainStoresPage'));
const MainStoreDescription = lazy(() => import('./pages/MainStoreDescription'));
const MainStoreOepnnForm = lazy(() => import('./pages/MainStoreOpenform'));



// ✅ 기본 라우트 정의
const baseRoutes: RouteObject[] = [
  {
    path: '/main/stores',
    element: withSuspense(MainStoresPage),
  },
  {
    path: '/main/store/description',
    element: withSuspense(MainStoreDescription),
  },
];

// ✅ 보호가 필요한 라우트 (PERSONAL_SELLER, ADMIN만 접근 가능)
const protectedRoutes: RouteObject[] = [
  {
    path: '/main/store/openform',
    element: withSuspense(MainStoreOepnnForm),
  },
];

// ✅ 보호된 라우트에 가드 적용
const guardedRoutes = wrapRoutesWithProtection(
  protectedRoutes,
  [ROLES.PERSONAL_SELLER, ROLES.ADMIN],
  '/main' // 권한이 없을 경우 리다이렉트할 경로
);

// ✅ 최종 라우트 내보내기
export const storesRoutes: RouteObject[] = [...baseRoutes, ...guardedRoutes];
