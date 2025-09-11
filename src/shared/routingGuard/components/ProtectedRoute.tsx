import { getCurrentUser, isLoggedIn } from '@src/shared/util/jwtUtils';
import { useEffect } from 'react';
import { type Role } from '@src/shared/routingGuard/types/role';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: Role[];
  redirectTo?: string;
  fallbackComponent?: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles = [],
  redirectTo = '/auth/login',
  fallbackComponent = null,
}) => {
  const userInfo = getCurrentUser();
  const isAuthenticated = isLoggedIn();

  useEffect(() => {
    // 로그인되지 않은 경우 JSP 페이지로 리다이렉트
    if (!isAuthenticated || !userInfo) {
      // 현재 페이지 정보를 쿼리 파라미터로 전달 (선택사항)
      const currentPath = encodeURIComponent(window.location.pathname + window.location.search);
      window.location.href = `${redirectTo}?returnUrl=${currentPath}`;
      return;
    }

    // 역할 권한 체크
    if (allowedRoles.length > 0 && userInfo.role && !allowedRoles.includes(userInfo.role as Role)) {
      // 권한이 없는 경우 역할별 기본 JSP 페이지로 리다이렉트
      const roleRedirectMap: Record<string, string> = {
        USER: '/main',
        SELLER: '/main',
        PERSONAL_SELLER: '/main',
        ADMIN: '/main',
      };

      window.location.href = roleRedirectMap[userInfo.role] || '/auth/login';
      return;
    }
  }, [isAuthenticated, userInfo, allowedRoles, redirectTo]);

  // 로딩 중이거나 리다이렉트 대기 중일 때
  if (!isAuthenticated || !userInfo) {
    return <div>로그인 페이지로 이동 중...</div>;
  }

  // 권한이 없는 경우
  if (allowedRoles.length > 0 && userInfo.role && !allowedRoles.includes(userInfo.role as Role)) {
    if (fallbackComponent) {
      return <>{fallbackComponent}</>;
    }
    return <div>페이지 이동 중...</div>;
  }

  return <>{children}</>;
};

export default ProtectedRoute;

// 사용 예시
/*
// 기본 사용
<ProtectedRoute>
  <MyComponent />
</ProtectedRoute>

// 특정 역할만 허용
<ProtectedRoute allowedRoles={['ADMIN', 'SELLER']}>
  <AdminPanel />
</ProtectedRoute>

// 커스텀 리다이렉트 페이지
<ProtectedRoute 
  allowedRoles={['ADMIN']} 
  redirectTo="/custom-login.jsp"
>
  <AdminComponent />
</ProtectedRoute>

// Fallback 컴포넌트 사용 (JSP 리다이렉트 대신)
<ProtectedRoute 
  allowedRoles={['ADMIN']} 
  fallbackComponent={<div>접근 권한이 없습니다.</div>}
>
  <AdminComponent />
</ProtectedRoute>
*/
