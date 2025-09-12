import { ROLES, type Role } from '@src/shared/routingGuard/types/role';
import { getCurrentUser, isLoggedIn } from '@src/shared/util/jwtUtils';

/**
 * 사용자가 특정 역할들 중 하나를 가지고 있는지 확인
 */
export function hasAnyRole(allowedRoles: Role[]): boolean {
  const userInfo = getCurrentUser();
  if (!userInfo?.role || !isLoggedIn()) {
    return false;
  }
  return allowedRoles.includes(userInfo.role as Role);
}

/**
 * 관리자인지 확인
 */
export function isAdmin(): boolean {
  const userInfo = getCurrentUser();
  return userInfo?.role === ROLES.ADMIN;
}

/**
 * 판매자인지 확인 (SELLER, PERSONAL_SELLER)
 */
export function isSeller(): boolean {
  const userInfo = getCurrentUser();
  return userInfo?.role === ROLES.SELLER;
}

export function isPersonalSeller(): boolean {
  const userInfo = getCurrentUser();
  return userInfo?.role === ROLES.PERSONAL_SELLER;
}

/**
 * 유저인지 확인
 */
export function isUser(): boolean {
  const userInfo = getCurrentUser();
  return userInfo?.role === ROLES.USER;
}

/**
 * 현재 사용자의 역할 가져오기
 */
export function getCurrentUserRole(): Role | null {
  const userInfo = getCurrentUser();
  return (userInfo?.role as Role) || null;
}
