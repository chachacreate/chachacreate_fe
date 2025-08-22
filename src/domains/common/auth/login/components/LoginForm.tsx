import React, { useState, useEffect } from 'react';
import { RememberMeCheckbox } from './RememberMeCheckbox';
import { SocialLoginSection } from './SocialLoginSection';
import { useLogin } from '../hooks/userLogin';

export const LoginForm: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const { login, socialLogin, forgotPassword, isLoading, error } = useLogin();

  // 컴포넌트 마운트 시 기억된 이메일 불러오기
  useEffect(() => {
    const rememberedEmail = localStorage.getItem('rememberedEmail');
    if (rememberedEmail) {
      setEmail(rememberedEmail);
      setRememberMe(true);
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email && password) {
      login({ email, password, rememberMe });
    }
  };

  const handleForgotPassword = () => {
    if (email) {
      forgotPassword(email);
    } else {
      alert('비밀번호를 찾으려면 이메일을 입력해주세요.');
    }
  };

  return (
    <div className="flex flex-col gap-4 h-[282px]">
      {/* 폼 섹션 */}
      <div className="flex flex-col items-center gap-2.5">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* 이메일 입력 */}
          <div className="flex flex-col justify-between gap-2 px-2.5 w-[440px] h-14 bg-[#F3F7E8] border border-[#2A3E34] rounded-[5px] box-border">
            <input
              type="email"
              placeholder="이메일"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="border-none bg-transparent outline-none text-[#464C53] py-4 flex-1 text-lg placeholder:text-[#464C53]"
              style={{ fontFamily: 'Jua, sans-serif' }}
              required
            />
          </div>

          {/* 비밀번호 입력 */}
          <div className="flex flex-col justify-between gap-2 px-2.5 w-[440px] h-14 bg-[#F3F7E8] border border-[#2A3E34] rounded-[5px] box-border">
            <input
              type="password"
              placeholder="비밀번호"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="border-none bg-transparent outline-none text-[#464C53] py-4 flex-1 text-lg placeholder:text-[#464C53]"
              style={{ fontFamily: 'Jua, sans-serif' }}
              required
            />
          </div>

          {/* 아이디 기억하기 체크박스 */}
          <RememberMeCheckbox checked={rememberMe} onChange={setRememberMe} />
        </form>

        {/* 버튼 섹션 */}
        <div className="flex flex-col gap-4 w-[440px]">
          {/* 로그인 버튼 */}
          <button
            type="submit"
            className={`
              flex items-center justify-center gap-2 px-2.5 w-full h-14 
              border-none rounded-[5px] text-white text-lg cursor-pointer 
              transition-colors
              ${
                isLoading || !email || !password
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-[#2A3E34] hover:bg-[#1e2d26]'
              }
            `}
            style={{ fontFamily: 'Jua, sans-serif' }}
            onClick={handleSubmit}
            disabled={isLoading || !email || !password}
          >
            {isLoading ? '로그인 중...' : '로그인'}
          </button>

          {/* 링크 섹션 */}
          <div className="flex justify-center items-center gap-[200px] w-full">
            <button
              type="button"
              className="text-[#464C53] no-underline cursor-pointer hover:underline"
              style={{ fontFamily: 'Jua, sans-serif', fontSize: '17px' }}
              onClick={handleForgotPassword}
            >
              비밀번호를 잊으셨나요?
            </button>
            <a
              href="/signup"
              className="text-[#464C53] no-underline cursor-pointer hover:underline"
              style={{ fontFamily: 'Jua, sans-serif', fontSize: '17px' }}
            >
              회원가입
            </a>
          </div>
        </div>

        {/* 에러 메시지 */}
        {error && <div className="text-red-500 text-sm mt-2 text-center">{error}</div>}
      </div>

      {/* 소셜 로그인 섹션 */}
      <SocialLoginSection onSocialLogin={socialLogin} />
    </div>
  );
};
