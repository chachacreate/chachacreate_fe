// Axios 인스턴스와 인터셉터 설정
import axios from 'axios';
import type { AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import type { JWTPayload } from './apiResponse';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// JWT 토큰 디코드 함수
export const decodeToken = (token: string): JWTPayload | null => {
  try {
    // Bearer 접두사 제거
    const cleanToken = token.replace(/^Bearer\s+/i, '');

    const parts = cleanToken.split('.');
    if (parts.length !== 3) return null;

    const payload = parts[1];
    if (!payload) return null;

    // Base64 URL 디코딩 (패딩 추가)
    let base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }

    // Base64 → Uint8Array
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    // UTF-8로 디코딩 후 JSON 파싱
    const json = new TextDecoder('utf-8').decode(bytes);
    return JSON.parse(json) as JWTPayload;
  } catch (error) {
    console.warn('토큰 디코드 실패:', error);
    return null;
  }
};

// 토큰 만료 체크 함수
export const isTokenExpired = (token: string): boolean => {
  const decoded = decodeToken(token);
  if (!decoded || !decoded.exp) return true;

  return Date.now() >= decoded.exp * 1000;
};

// localStorage에서 Access Token을 가져오는 함수
const getAccessToken = () => {
  const token = localStorage.getItem('accessToken');

  // 토큰이 있으면 만료 체크
  if (token && isTokenExpired(token)) {
    console.warn('Access Token이 만료되었습니다.');
    localStorage.removeItem('accessToken');
    return null;
  }

  return token;
};

// 토큰에서 사용자 정보 추출
export const getUserInfoFromToken = (token?: string): JWTPayload | null => {
  const accessToken = token || getAccessToken();
  if (!accessToken) return null;

  const decoded = decodeToken(accessToken);
  if (!decoded) return null;

  // 만료 체크
  if (isTokenExpired(accessToken)) {
    localStorage.removeItem('accessToken');
    return null;
  }

  return decoded;
};

// Axios 인스턴스 생성
const api = axios.create({
  baseURL: API_BASE_URL, // 기본 URL 설정
  headers: { 'Content-Type': 'application/json' }, // 기본 헤더 설정
  withCredentials: true, // 쿠키 포함 요청 허용 (Refresh Token용)
});

// 요청 인터셉터: 모든 요청에 Access Token 자동 삽입
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getAccessToken();

    // headers가 undefined일 경우 빈 객체로 초기화
    config.headers = config.headers || {};

    // 토큰이 존재하면 Authorization 헤더에 삽입
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error) // 요청 에러 처리
);

// 응답 인터셉터: 401 Unauthorized 시 Access Token 자동 갱신
api.interceptors.response.use(
  (response: AxiosResponse) => response, // 정상 응답 그대로 반환
  async (error) => {
    // 원래 요청 객체
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // 401이고, 아직 재시도하지 않았다면
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const email = localStorage.getItem('email');
        if (!email) throw new Error('이메일 정보 없음');

        // 서버에 Refresh Token으로 새로운 Access Token 요청
        const res = await axios.post(
          `${API_BASE_URL}/api/auth/refresh`,
          { email },
          { withCredentials: true } // 쿠키 자동 전송
        );

        // 백엔드 응답 구조에 맞게 수정
        const newAccessToken = res.data.data?.accessToken || res.data.accessToken;
        if (!newAccessToken) {
          throw new Error('새로운 Access Token을 받지 못했습니다.');
        }

        localStorage.setItem('accessToken', newAccessToken);

        // 토큰에서 사용자 정보 추출하여 localStorage에 저장
        const userInfo = getUserInfoFromToken(newAccessToken);
        if (userInfo) {
          localStorage.setItem('email', userInfo.email);
          localStorage.setItem('userName', userInfo.name);
        }

        // 원래 요청에 새 Access Token 적용 후 재시도
        originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
        return axios(originalRequest);
      } catch (refreshError) {
        console.error('토큰 갱신 실패:', refreshError);

        // 갱신 실패 시 로그아웃 처리
        localStorage.removeItem('accessToken');
        localStorage.removeItem('email');
        localStorage.removeItem('userName');

        // 로그인 페이지로 리다이렉트
        window.location.href = '/auth/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api; // 다른 모듈에서 api 인스턴스를 재사용 가능
