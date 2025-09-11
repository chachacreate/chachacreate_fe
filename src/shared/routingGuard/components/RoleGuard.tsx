import React from 'react';
import type { Role } from '@src/shared/routingGuard/types/role';
import { getCurrentUser } from '@src/shared/util/jwtUtils';

interface RoleGuardProps {
  allowedRoles: Role[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

const RoleGuard: React.FC<RoleGuardProps> = ({
  allowedRoles,
  children,
  fallback = <div>접근 권한이 없습니다.</div>,
}) => {
  const userInfo = getCurrentUser();

  if (!userInfo?.role || !allowedRoles.includes(userInfo.role as Role)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

export default RoleGuard;
