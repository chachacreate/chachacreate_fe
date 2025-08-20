// Axios 인스턴스와 인터셉터 설정
import axios from 'axios';
import type { AxiosResponse, InternalAxiosRequestConfig } from 'axios';

const API_BASE_URL = process.env.VITE_API_BASE_URL;

// localStorage에서 Access Token을 가져오는 함수
const getAccessToken = () => localStorage.getItem('accessToken');

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

        const newAccessToken = res.data.accessToken;
        localStorage.setItem('accessToken', newAccessToken);

        // 원래 요청에 새 Access Token 적용 후 재시도
        originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
        return axios(originalRequest);
      } catch (refreshError) {
        // 갱신 실패 시 로그아웃 처리
        localStorage.removeItem('accessToken');
        localStorage.removeItem('email');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api; // 다른 모듈에서 api 인스턴스를 재사용 가능
