// domains/auth/areas/authentication/features/login/components/RememberMeCheckbox.tsx

import React from 'react';

interface RememberMeCheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export const RememberMeCheckbox: React.FC<RememberMeCheckboxProps> = ({ checked, onChange }) => {
  return (
    <div className="flex items-center gap-2 mt-2">
      <div
        className={`
          w-6 h-6 border rounded flex items-center justify-center cursor-pointer
          ${checked ? 'bg-custom-green border-custom-green' : 'bg-white border-custom-border'}
        `}
        onClick={() => onChange(!checked)}
      >
        {checked && (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M13.5 4.5L6 12L2.5 8.5"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </div>
      <label
        className="text-[#131416] text-lg cursor-pointer font-poppins"
        onClick={() => onChange(!checked)}
      >
        아이디 기억하기
      </label>
    </div>
  );
};
