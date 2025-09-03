// 환경 변수, 추후 필요시 추가
// const API_LEGACY_URL = import.meta.env.VITE_API_LEGACY_URL;
// const PAGE_LEGACY_URL = import.meta.env.VITE_PAGE_LEGACY_URL;

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
