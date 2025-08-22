export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe: boolean;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    name: string;
  };
}

export interface SocialLoginProvider {
  name: 'naver' | 'kakao';
  displayName: string;
  backgroundColor: string;
  textColor: string;
  icon: string;
}
