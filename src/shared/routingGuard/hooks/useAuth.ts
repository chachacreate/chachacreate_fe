import { getCurrentUser, isLoggedIn, type UserInfo } from '@src/shared/util/jwtUtils';
import { useState, useEffect } from 'react';
import type { Role } from '@src/shared/routingGuard/types/role';
import { getCurrentUserRole } from '@src/shared/util/roleAuth';

interface UseAuthReturn {
  user: UserInfo | null;
  role: Role | null;
  isAuthenticated: boolean;
  loading: boolean;
  logout: () => void;
  checkRole: (allowedRoles: Role[]) => boolean;
  isAdmin: boolean;
  isSeller: boolean;
}

export const useAuth = (): UseAuthReturn => {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  const checkAuth = () => {
    const isValid = isLoggedIn();
    const userInfo = getCurrentUser();
    const userRole = getCurrentUserRole();

    setIsAuthenticated(isValid);
    setUser(userInfo);
    setRole(userRole);
    setLoading(false);
  };

  useEffect(() => {
    checkAuth();

    // 토큰 변경 감지를 위한 storage 이벤트 리스너
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'accessToken') {
        checkAuth();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const logout = () => {
    // 기존 clearTokens 함수 사용
    import('@src/shared/util/jwtUtils').then(({ clearTokens }) => {
      clearTokens();
      setUser(null);
      setRole(null);
      setIsAuthenticated(false);
    });
  };

  const checkRole = (allowedRoles: Role[]): boolean => {
    return role ? allowedRoles.includes(role) : false;
  };

  return {
    user,
    role,
    isAuthenticated,
    loading,
    logout,
    checkRole,
    isAdmin: role === 'ADMIN',
    isSeller: role === 'SELLER' || role === 'PERSONAL_SELLER',
  };
};
