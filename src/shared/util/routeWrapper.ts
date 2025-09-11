import type { RouteObject } from 'react-router-dom';
import ProtectedRoute from '@src/shared/routingGuard/components/ProtectedRoute';
import { type Role } from '@src/shared/routingGuard/types/role';
import { createElement } from 'react';

/**
 * 라우트 배열에 ProtectedRoute를 적용하는 헬퍼 함수
 */
export const wrapRoutesWithProtection = (
  routes: RouteObject[],
  allowedRoles?: Role[],
  redirectTo?: string
): RouteObject[] => {
  return routes.map((route: RouteObject): RouteObject => {
    const newRoute: RouteObject = { ...route };

    // element가 있는 경우에만 ProtectedRoute로 감싸기
    if (route.element) {
      newRoute.element = createElement(ProtectedRoute, {
        allowedRoles: allowedRoles || undefined,
        redirectTo: redirectTo || undefined,
        children: route.element,
      });
    }

    // children이 있는 경우 재귀적으로 처리
    if (route.children && Array.isArray(route.children) && route.children.length > 0) {
      newRoute.children = wrapRoutesWithProtection(route.children, allowedRoles, redirectTo);
    }

    return newRoute;
  });
};
