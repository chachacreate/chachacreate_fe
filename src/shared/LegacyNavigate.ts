import { post } from '@src/libs/request';

// 환경 변수, 추후 필요시 추가
const API_LEGACY_URL = import.meta.env.VITE_API_LEGACY_URL;
const PAGE_LEGACY_URL = import.meta.env.VITE_PAGE_LEGACY_URL;

// 로그아웃 처리 - 레거시 시스템 세션도 함께 정리
export const logOut = async () => {
  try {
    // 레거시 시스템의 /auth/logout 엔드포인트 호출하여 세션 무효화
    // get 함수는 apiService를 사용하므로 JWT 토큰도 함께 전송됨
    await post(`${API_LEGACY_URL}/auth/logout`);
    console.log('레거시 시스템 로그아웃 성공');
  } catch (error) {
    console.error('레거시 시스템 로그아웃 요청 실패:', error);
    // 네트워크 오류가 있어도 로그아웃 프로세스는 계속 진행
  }
};

// 페이지 이동 함수들
export const goToMain = () => {
  window.location.href = `/main`;
};

export const goToLogin = () => {
  window.location.href = `/auth/login`;
};

export const goToSignup = () => {
  window.location.href = `/auth/join/agree`;
};

// 메시지 이동 함수
export const goToMessage = (storeSlug?: string | null) => {
  const messageHref = storeSlug ? `/${storeSlug}/mypage/message` : `/main/mypage/message`;

  window.location.href = messageHref;
};
