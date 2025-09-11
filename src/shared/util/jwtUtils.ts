import { jwtDecode } from 'jwt-decode';
import CryptoJS from 'crypto-js';

// JWT 토큰에서 추출할 수 있는 사용자 정보 타입
export interface DecodedUserInfo {
  email: string;
  name: string;
  phone?: string;
  id?: number;
  role?: string;
  exp?: number;
  iat?: number;
  [key: string]: any; // 추가 필드들을 위한 확장성
}

// 사용자 정보만 추출한 간소화된 타입
export interface UserInfo {
  email: string;
  name: string;
  phone?: string;
  memberId?: number;
  role?: string;
}

/**
 * localStorage에서 액세스 토큰을 안전하게 가져오기
 */
export function getAccessToken(): string | null {
  try {
    return localStorage.getItem('accessToken');
  } catch (error) {
    console.warn('localStorage 접근 실패:', error);
    return null;
  }
}

/**
 * JWT 토큰이 만료되었는지 확인
 */
export function isTokenExpired(token: string): boolean {
  try {
    const decoded = jwtDecode<DecodedUserInfo>(token);
    if (!decoded.exp) return true;

    const currentTime = Math.floor(Date.now() / 1000);
    return decoded.exp < currentTime;
  } catch (error) {
    console.warn('토큰 만료 확인 실패:', error);
    return true; // 디코드 실패 시 만료된 것으로 간주
  }
}

/**
 * JWT 토큰에서 사용자 정보 추출
 */
export function getUserInfoFromToken(token?: string): UserInfo | null {
  try {
    const accessToken = token || getAccessToken();

    if (!accessToken) {
      console.warn('액세스 토큰이 없습니다.');
      return null;
    }

    // 토큰 만료 확인
    if (isTokenExpired(accessToken)) {
      console.warn('토큰이 만료되었습니다.');
      // 만료된 토큰은 localStorage에서 제거
      localStorage.removeItem('accessToken');
      return null;
    }

    const decoded = jwtDecode<DecodedUserInfo>(accessToken);

    // 필수 정보 확인
    if (!decoded.email || !decoded.name) {
      console.warn('토큰에 필수 사용자 정보가 없습니다.');
      return null;
    }

    return {
      email: decoded.email,
      name: decoded.name,
      phone: decoded.phone,
      memberId: decoded.id,
      role: decoded.role,
    };
  } catch (error) {
    console.error('사용자 정보 추출 실패:', error);
    return null;
  }
}

/**
 * 현재 로그인된 사용자 정보 가져오기 (localStorage 토큰 기반)
 */
export function getCurrentUser(): UserInfo | null {
  return getUserInfoFromToken();
}

/**
 * 사용자가 로그인되어 있는지 확인
 */
export function isLoggedIn(): boolean {
  const token = getAccessToken();
  return token !== null && !isTokenExpired(token);
}

/**
 * 특정 역할을 가진 사용자인지 확인
 */
export function hasRole(requiredRole: string): boolean {
  const userInfo = getCurrentUser();
  return userInfo?.role === requiredRole;
}

/**
 * 관리자인지 확인
 */
export function isAdmin(): boolean {
  return hasRole('ADMIN');
}

/**
 * 판매자인지 확인
 */
export function isSeller(): boolean {
  return hasRole('SELLER');
}

export const formatPhoneForPayment = (phone?: string): string => {
  return phone?.replace(/-/g, '') || '';
};

/**
 * 이메일로 Toss Payments용 고객 키 생성
 */
export function generateCustomerKey(email: string): string {
  const salt = 'mySecretSalt_';
  const hash = CryptoJS.SHA256(salt + email).toString();
  return `ck_${hash.slice(0, 30)}`; // Toss 정책 50자 이하
}

/**
 * 현재 사용자의 Toss Payments 고객 키 생성
 */
export function getCurrentUserCustomerKey(): string | null {
  const userInfo = getCurrentUser();
  if (!userInfo?.email) {
    console.warn('사용자 이메일이 없어서 고객 키를 생성할 수 없습니다.');
    return null;
  }
  return generateCustomerKey(userInfo.email);
}

/**
 * 토큰 정리 (로그아웃 시 사용)
 */
export function clearTokens(): void {
  try {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('email');
    localStorage.removeItem('userName');
  } catch (error) {
    console.warn('토큰 정리 실패:', error);
  }
}

/**
 * 사용자 정보를 localStorage에 저장 (토큰 갱신 시 사용)
 */
export function saveUserInfoToStorage(userInfo: UserInfo): void {
  try {
    if (userInfo.email) {
      localStorage.setItem('email', userInfo.email);
    }
    if (userInfo.name) {
      localStorage.setItem('userName', userInfo.name);
    }
  } catch (error) {
    console.warn('사용자 정보 저장 실패:', error);
  }
}
