// errorRoutes.ts
import { lazy, createElement, Suspense } from 'react';
import type { RouteObject } from 'react-router-dom';

const NotFoundPage = lazy(() => import('@src/shared/areas/error/NotFoundPage'));
const BadRequestPage = lazy(() => import('@src/shared/areas/error/BadRequestPage'));
const UnauthorizedPage = lazy(() => import('@src/shared/areas/error/UnauthorizedPage'));
const ServerErrorPage = lazy(() => import('@src/shared/areas/error/ServerErrorPage'));

const withSuspense = (Component: React.ComponentType<any>) =>
  createElement(
    Suspense,
    { fallback: createElement('div', { className: 'p-6' }, '로딩중…') },
    createElement(Component)
  );

export const errorRoutes: RouteObject[] = [
  {
    path: '/error/400',
    element: withSuspense(BadRequestPage),
  },
  {
    path: '/error/401',
    element: withSuspense(UnauthorizedPage),
  },
  {
    path: '/error/404',
    element: withSuspense(NotFoundPage),
  },
  {
    path: '/error/500',
    element: withSuspense(ServerErrorPage),
  },
];
