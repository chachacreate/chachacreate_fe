import { legacyPost } from '@src/libs/request';

// 로그아웃 처리 - 레거시 시스템 세션도 함께 정리
export const logOut = async () => {
  try {
    // 레거시 시스템의 /auth/logout 엔드포인트 호출하여 세션 무효화
    // get 함수는 apiService를 사용하므로 JWT 토큰도 함께 전송됨
    await legacyPost(`/auth/logout`);
    console.log('레거시 시스템 로그아웃 성공');
  } catch (error) {
    console.error('레거시 시스템 로그아웃 요청 실패:', error);
    // 네트워크 오류가 있어도 로그아웃 프로세스는 계속 진행
  }
};

export const goToLogin = () => {
  window.location.href = `/auth/login`;
};

export const goToSignup = () => {
  window.location.href = `/auth/join/agree`;
};
