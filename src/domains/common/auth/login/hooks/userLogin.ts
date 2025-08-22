// domains/auth/areas/authentication/features/login/hooks/useLogin.ts

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { LoginCredentials } from '../model/types';
import { loginService } from '../services/loginService';

export const useLogin = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const login = async (credentials: LoginCredentials) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await loginService.login(credentials);

      // 토큰을 로컬 스토리지에 저장
      localStorage.setItem('accessToken', response.accessToken);
      localStorage.setItem('refreshToken', response.refreshToken);

      // 아이디 기억하기 설정
      if (credentials.rememberMe) {
        localStorage.setItem('rememberedEmail', credentials.email);
      } else {
        localStorage.removeItem('rememberedEmail');
      }

      // 홈으로 리다이렉트
      navigate('/main');
    } catch (err) {
      setError(err instanceof Error ? err.message : '로그인에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const socialLogin = async (provider: 'naver' | 'kakao') => {
    try {
      await loginService.socialLogin(provider);
    } catch (err) {
      setError(`${provider} 로그인에 실패했습니다.`);
    }
  };

  const forgotPassword = async (email: string) => {
    try {
      await loginService.forgotPassword(email);
      alert('비밀번호 재설정 링크가 이메일로 전송되었습니다.');
    } catch (err) {
      setError(err instanceof Error ? err.message : '비밀번호 재설정 요청에 실패했습니다.');
    }
  };

  return {
    login,
    socialLogin,
    forgotPassword,
    isLoading,
    error,
  };
};
