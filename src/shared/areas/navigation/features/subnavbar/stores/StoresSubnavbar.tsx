import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Store, Info } from 'lucide-react';

type Item = {
  label: string;
  to: string;
  exact?: boolean;
  icon?: React.ReactNode;
};

type StoresSubnavbarProps = {
  items?: Item[];
  className?: string;
  sticky?: boolean;
  stickyOffsetPx?: number;
  onItemClick?: (to: string) => void;
};

/**
 * StoresSubnavbar (active: rounded background)
 * - /main/stores 진입 시 "스토어 목록"만 활성(end 매칭)
 * - 활성 스타일: 둥근 배경 박스
 * - 1920 기준 좌우 240px → max-w-[1440px] 컨테이너
 */
export default function StoresSubnavbar({
  items = [
    {
      label: '스토어 목록',
      to: '/main/stores',
      exact: true,
      icon: <Store className="h-4 w-4" />,
    },
    {
      label: '스토어 개설 설명',
      to: '/main/store/description',
      icon: <Info className="h-4 w-4" />,
    },
  ],
  className = '',
  sticky = false,
  stickyOffsetPx = 0,
  onItemClick,
}: StoresSubnavbarProps) {
  const { pathname } = useLocation();

  /** 현재 경로 확인 함수 */
  const isActivePath = (item: Item) => {
    if (item.to === '/main/stores') {
      return pathname.startsWith('/main/stores');
    }
    if (item.exact) {
      return pathname === item.to;
    }
    return pathname.startsWith(item.to);
  };

  /** 링크 클릭 핸들러 */
  const handleClick = (to: string) => {
    onItemClick?.(to);
  };

  return (
    <div
      className={[
        'w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/75 font-jua',
        'py-3 md:py-4 mb-6 md:mb-8',
        sticky ? 'sticky z-30' : '',
        className,
      ].join(' ')}
      style={sticky ? { top: stickyOffsetPx } : undefined}
    >
      {/* 1920 기준 좌우 패딩 240px -> 중앙 컨테이너 max-w-[1440px] */}
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6">
        <nav
          className="flex items-center gap-3 md:gap-4 overflow-x-auto"
          aria-label="Stores sub navigation"
        >
          {items.map((item) => {
            const active = isActivePath(item);
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => handleClick(item.to)}
                className={[
                  'group inline-flex items-center gap-2 px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors',
                  active
                    ? 'bg-[#2d4739] text-white rounded-lg'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg',
                ].join(' ')}
              >
                {item.icon && <span className="shrink-0">{item.icon}</span>}
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
