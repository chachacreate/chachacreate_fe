// domains/auth/areas/authentication/features/login/components/SocialLoginSection.tsx

import React from 'react';
import type { SocialLoginProvider } from '../model/types';

interface SocialLoginSectionProps {
  onSocialLogin: (provider: 'naver' | 'kakao') => void;
}

const socialProviders: SocialLoginProvider[] = [
  {
    name: 'naver',
    displayName: '네이버 로그인',
    backgroundColor: '#1DC800',
    textColor: '#464C53',
    icon: '/assets/naver-logo.png',
  },
  {
    name: 'kakao',
    displayName: '카카오 로그인',
    backgroundColor: '#FDE500',
    textColor: '#464C53',
    icon: '/assets/kakao-logo.png',
  },
];

export const SocialLoginSection: React.FC<SocialLoginSectionProps> = ({ onSocialLogin }) => {
  return (
    <>
      {/* 소셜로그인 구분선 */}
      <div className="flex items-center gap-6 w-[792px]">
        <div className="flex-1 h-0 border-t-2 border-divider-gray" />
        <span className="text-custom-green text-base font-semibold tracking-wide font-roboto">
          소셜로그인
        </span>
        <div className="flex-1 h-0 border-t-2 border-divider-gray" />
      </div>

      {/* 소셜 로그인 버튼들 */}
      <div className="flex flex-col gap-4">
        {socialProviders.map((provider) => (
          <button
            key={provider.name}
            className={`
              flex items-center gap-[120px] px-2.5 w-[440px] h-14 rounded-[5px]
              border-none text-lg cursor-pointer transition-opacity hover:opacity-90 font-jua
              ${
                provider.name === 'naver'
                  ? 'bg-naver-green text-custom-gray'
                  : 'bg-kakao-yellow text-custom-gray'
              }
            `}
            onClick={() => onSocialLogin(provider.name)}
          >
            <img
              src={provider.icon}
              alt={`${provider.displayName} 아이콘`}
              className="w-[46px] h-[46px] rounded"
            />
            {provider.displayName}
          </button>
        ))}
      </div>
    </>
  );
};
