// src/domains/auth/areas/authentication/features/login/pages/LoginPage.tsx
import { Link } from 'react-router-dom';
import { useState } from 'react';
import { loginService } from '../services/loginService';
import { useNavigate } from 'react-router-dom';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await loginService.login({
        email,
        password,
        rememberMe,
      });

      // 토큰을 로컬 스토리지에 저장
      localStorage.setItem('accessToken', response.accessToken);
      localStorage.setItem('refreshToken', response.refreshToken);
      localStorage.setItem('email', email); // 토큰 갱신용 이메일 저장

      // 아이디 기억하기 설정
      if (rememberMe) {
        localStorage.setItem('rememberedEmail', email);
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

  const handleSocialLogin = async (provider: 'naver' | 'kakao') => {
    try {
      await loginService.socialLogin(provider);
    } catch (err) {
      setError(`${provider} 로그인에 실패했습니다.`);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      alert('비밀번호를 찾으려면 이메일을 입력해주세요.');
      return;
    }

    try {
      await loginService.forgotPassword(email);
      alert('비밀번호 재설정 링크가 이메일로 전송되었습니다.');
    } catch (err) {
      setError(err instanceof Error ? err.message : '비밀번호 재설정 요청에 실패했습니다.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-5">
      <div className="flex flex-col items-center gap-6 w-full max-w-md">
        {/* 로고 */}
        <div className="w-32 h-32 bg-green-600 rounded-lg flex items-center justify-center text-white text-xl font-bold">
          로고
        </div>

        {/* 로그인 폼 */}
        <div className="flex flex-col gap-4 w-full max-w-md bg-white p-6 rounded-lg shadow-md">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <input
              type="email"
              placeholder="이메일"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              required
            />

            <input
              type="password"
              placeholder="비밀번호"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              required
            />

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="remember"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              <label htmlFor="remember" className="text-gray-600 text-sm">
                아이디 기억하기
              </label>
            </div>

            <button
              type="submit"
              disabled={isLoading || !email || !password}
              className={`py-3 text-white rounded-md font-semibold transition-colors ${
                isLoading || !email || !password
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-green-600 hover:bg-green-700'
              }`}
            >
              {isLoading ? '로그인 중...' : '로그인'}
            </button>
          </form>

          {/* 에러 메시지 */}
          {error && (
            <div className="text-red-500 text-sm text-center bg-red-50 p-2 rounded">{error}</div>
          )}

          <div className="flex justify-between text-sm">
            <button onClick={handleForgotPassword} className="text-gray-600 hover:underline">
              비밀번호를 잊으셨나요?
            </button>
            <Link to="/auth/join/agree" className="text-gray-600 hover:underline">
              회원가입
            </Link>
          </div>

          <div className="text-center text-sm text-gray-500 my-2">또는</div>

          <div className="flex flex-col gap-2">
            <button
              onClick={() => handleSocialLogin('naver')}
              className="py-3 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors"
            >
              네이버 로그인
            </button>
            <button
              onClick={() => handleSocialLogin('kakao')}
              className="py-3 bg-yellow-400 text-black rounded-md hover:bg-yellow-500 transition-colors"
            >
              카카오 로그인
            </button>
          </div>
        </div>

        {/* 홈으로 돌아가기 */}
        <Link to="/main" className="text-gray-500 text-sm hover:underline">
          ← 홈으로
        </Link>
      </div>
    </div>
  );
}
