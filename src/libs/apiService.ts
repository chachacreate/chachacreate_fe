import axios from 'axios';
import type { AxiosResponse, InternalAxiosRequestConfig } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ''; // 예: '/api'

// --- helpers ----------------------------------------------------
const getAccessToken = () => localStorage.getItem('accessToken');

// x.y.z 형태 대충 검사해서 JWT처럼 보일 때만 Authorization 헤더 주입
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
// ----------------------------------------------------------------

const api = axios.create({
  baseURL: API_BASE_URL, // '/api'
  withCredentials: true,
});

api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // 1) URL 정리
    if (config.url) config.url = normalizeUrl(config.url);

    // 2) Authorization (JWT처럼 보일 때만)
    const token = getAccessToken();
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

api.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error) => {
    const original = error.config as
      | (InternalAxiosRequestConfig & { _retry?: boolean })
      | undefined;

    if (error.response?.status === 401 && original && !original._retry) {
      original._retry = true;
      try {
        const email = localStorage.getItem('email');
        if (!email) throw new Error('이메일 정보 없음');

        // refresh 엔드포인트가 '/api/auth/refresh' 라는 가정
        const refreshRes = await axios.post(
          `${API_BASE_URL || ''}/auth/refresh`, // baseURL이 '/api'니까 '/api/auth/refresh'
          { email },
          { withCredentials: true }
        );

        const newAccessToken: string = refreshRes.data.accessToken;
        localStorage.setItem('accessToken', newAccessToken);

        // 재시도 요청 재설정
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
        localStorage.removeItem('accessToken');
        localStorage.removeItem('email');
        window.location.href = '/login';
        return Promise.reject(e);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
