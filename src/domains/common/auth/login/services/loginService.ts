// domains/auth/areas/authentication/features/login/services/loginService.ts

import { post } from '@src/libs/request';
import type { ApiResponse } from '@src/libs/apiResponse';
import type { LoginCredentials, LoginResponse } from '../model/types';

class LoginService {
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    try {
      const response: ApiResponse<LoginResponse> = await post<LoginResponse>(
        '/auth/login',
        credentials
      );

      if (response.status !== 200) {
        throw new Error('로그인에 실패했습니다.');
      }

      return response.data;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(error.message);
      }
      throw new Error('로그인 중 오류가 발생했습니다.');
    }
  }

  async socialLogin(provider: 'naver' | 'kakao'): Promise<void> {
    // 소셜 로그인은 일반적으로 리다이렉트 방식이므로 기존 방식 유지
    window.location.href = `/auth/${provider}`;
  }

  async forgotPassword(email: string): Promise<void> {
    try {
      const response: ApiResponse<{ message: string }> = await post<{ message: string }>(
        '/auth/forgot-password',
        { email }
      );

      if (response.status !== 200) {
        throw new Error('비밀번호 재설정 요청에 실패했습니다.');
      }
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(error.message);
      }
      throw new Error('비밀번호 재설정 요청 중 오류가 발생했습니다.');
    }
  }
}

export const loginService = new LoginService();
