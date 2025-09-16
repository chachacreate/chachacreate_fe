import axios from 'axios';
import type { AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import type { JWTPayload } from './apiResponse';
import { logOut } from '@src/shared/util/LegacyNavigate';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ''; // 예: '/api'
const API_LEGACY_URL = import.meta.env.VITE_API_LEGACY_URL ?? ''; // Legacy URL
const fastApiUrl = import.meta.env.VITE_API_FASTAPI_URL ?? ''; // fastapi Url

// ====================== JWT helpers (Spring Boot용) ======================
export const decodeToken = (token: string): JWTPayload | null => {
  try {
    const cleanToken = token.replace(/^Bearer\s+/i, '');
    const parts = cleanToken.split('.');
    if (parts.length !== 3) return null;

    let base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) base64 += '=';

    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

    const json = new TextDecoder('utf-8').decode(bytes);
    return JSON.parse(json) as JWTPayload;
  } catch (error) {
    console.warn('토큰 디코드 실패:', error);
    return null;
  }
};

export const isTokenExpired = (token: string): boolean => {
  const decoded = decodeToken(token);
  if (!decoded || !decoded.exp) return true;
  return Date.now() >= decoded.exp * 1000;
};

// localStorage에서 Access Token을 가져올 때 만료 체크
const getAccessToken = async () => {
  const token = localStorage.getItem('accessToken');
  if (token && isTokenExpired(token)) {
    console.warn('Access Token이 만료되었습니다.');
    localStorage.removeItem('accessToken');
    await logOut();
    return null;
  }
  return token;
};

export const getUserInfoFromToken = async (token?: string): Promise<JWTPayload | null> => {
  const t = token || (await getAccessToken());
  if (!t) return null;
  if (isTokenExpired(t)) {
    localStorage.removeItem('accessToken');
    await logOut();
    return null;
  }
  return decodeToken(t);
};

// ====================== 공통 유틸 ======================
const isLikelyJwt = (t?: string | null) => !!t && t.split('.').length === 3 && t.trim().length > 20;

const isFormData = (data: unknown): data is FormData =>
  typeof FormData !== 'undefined' && data instanceof FormData;

// baseURL이 '/api'인데 요청 url이 '/api/...'로 오면 '/api/api' 중복 제거
const normalizeUrl = (url?: string) => {
  if (!url) return url;
  if (API_BASE_URL?.endsWith('/api') && url.startsWith('/api/')) {
    return url.replace(/^\/api\//, '/'); // '/api/foo' -> '/foo'
  }
  return url;
};

// ====================== Spring Boot API 인스턴스 (JWT 포함) ======================
const api = axios.create({
  baseURL: API_BASE_URL, // '/api'
  withCredentials: true,
});

// ---------------------- Request Interceptor (Boot용) ----------------------
api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    // 1) URL 정리
    if (config.url) config.url = normalizeUrl(config.url);

    // 2) Authorization (JWT처럼 보일 때만)
    const token = await getAccessToken();
    config.headers = config.headers ?? {};
    if (isLikelyJwt(token)) {
      (config.headers as any).Authorization = `Bearer ${token}`;
    } else {
      delete (config.headers as any).Authorization;
    }

    // 3) FormData면 Content-Type 제거 (브라우저가 boundary 포함해서 자동 설정)
    if (isFormData(config.data)) {
      delete (config.headers as any)['Content-Type'];
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ---------------------- Response Interceptor (Boot용) ----------------------
api.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error) => {
    const original = error.config as
      | (InternalAxiosRequestConfig & { _retry?: boolean })
      | undefined;

    if (error.response?.status === 401 && original && !original._retry) {
      original._retry = true;
      try {
        // refresh 호출 (email 필요 시 포함)
        const email = localStorage.getItem('email') || undefined;
        const refreshUrl = `${API_BASE_URL || ''}/auth/refresh`;

        const refreshRes = await axios.post(refreshUrl, email ? { email } : {}, {
          withCredentials: true,
        });

        // 응답 형태 유연 대응: {accessToken} 또는 {data: {accessToken}}
        const newAccessToken: string | undefined =
          refreshRes?.data?.data?.accessToken ?? refreshRes?.data?.accessToken;

        if (!newAccessToken) {
          logOut();
          throw new Error('새로운 Access Token을 받지 못했습니다.');
        }

        // 저장
        localStorage.setItem('accessToken', newAccessToken);

        // 토큰에서 유저정보 추출(있으면 email/userName 보강 저장)
        const userInfo = getUserInfoFromToken(newAccessToken);
        if (userInfo) {
          if ((userInfo as any).name) localStorage.setItem('userName', (userInfo as any).name);
        }

        // 원 요청 갱신
        original.headers = original.headers ?? {};
        if (isLikelyJwt(newAccessToken)) {
          (original.headers as any).Authorization = `Bearer ${newAccessToken}`;
        } else {
          delete (original.headers as any).Authorization;
        }
        if (original.url) original.url = normalizeUrl(original.url);
        if (isFormData(original.data)) {
          delete (original.headers as any)['Content-Type'];
        }

        // 인스턴스로 재시도
        return api(original);
      } catch (e) {
        await logOut();
        console.error('토큰 갱신 실패:', e);
        localStorage.removeItem('accessToken');
        localStorage.removeItem('email');
        localStorage.removeItem('userName');
        // 앱 라우팅 규칙에 맞게 경로 조정
        window.location.href = '/login'; // 또는 '/auth/login'
        return Promise.reject(e);
      }
    }

    return Promise.reject(error);
  }
);

// ====================== Legacy API 인스턴스 (세션 기반, JWT 없음) ======================
const legacyApi = axios.create({
  baseURL: API_LEGACY_URL, // 'http://localhost:9999/legacy'
  withCredentials: true, // 세션 쿠키 포함
});

// ---------------------- Request Interceptor (Legacy용) ----------------------
legacyApi.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Legacy는 JWT 없이 세션 기반이므로 Authorization 헤더 제거
    config.headers = config.headers ?? {};
    delete (config.headers as any).Authorization;

    // FormData면 Content-Type 제거
    if (isFormData(config.data)) {
      delete (config.headers as any)['Content-Type'];
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// ---------------------- Response Interceptor (Legacy용) ----------------------
legacyApi.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error) => {
    // Legacy는 401 시 토큰 갱신 없이 바로 로그인 페이지로
    if (error.response?.status === 401) {
      console.warn('Legacy 세션 만료, 로그인 페이지로 이동');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ====================== FASTAPI API 인스턴스 (세션 기반, JWT 없음) ======================
const fastApi = axios.create({
  baseURL: fastApiUrl, // 'http://localhost/ai/'
  withCredentials: false, // FastAPI는 토큰 불필요하므로 쿠키 포함 안 함
});

// ---------------------- Request Interceptor (FastAPI용) ----------------------
fastApi.interceptors.request.use(
  (config) => {
    // FormData면 Content-Type 제거 (브라우저가 boundary 포함해서 자동 설정)
    if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
      delete (config.headers as any)['Content-Type'];
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ---------------------- Response Interceptor (FastAPI용) ----------------------
fastApi.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('FastAPI 요청 오류:', error);
    return Promise.reject(error);
  }
);

// ====================== Export ======================
export default api; // Spring Boot API (기존 호환성 유지)
export { legacyApi }; // Legacy API
export { fastApi }; // Fast API
