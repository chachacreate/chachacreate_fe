// src/shared/areas/navigation/features/subnavbar/sell/SellSubnavbar.tsx
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Info, PackagePlus, ClipboardList, Wallet } from 'lucide-react';

type Item = {
  label: string;
  to: string;
  exact?: boolean;
  icon?: React.ReactNode;
  mobileLabel?: string; // 모바일용 짧은 라벨
};

type SellSubnavbarProps = {
  items?: Item[];
  className?: string;
  sticky?: boolean;
  stickyOffsetPx?: number;
};

/**
 * SellSubnavbar (StoresSubnavbar 스타일 매칭)
 * - 활성 스타일: 둥근 배경 박스 (pill)
 * - 컨테이너: max-w-[1440px], 좌우 패딩은 부모에서 240px 처리 (여긴 공통 컨테이너 폭만 유지)
 * - 데스크톱: 가로 스크롤 가능
 * - 모바일: 2x2 그리드
 */
export default function SellSubnavbar({
  items = [
    {
      label: '개인 판매 설명',
      mobileLabel: '판매 설명',
      to: '/main/sell/sellguide',
      exact: true,
      icon: <Info className="h-4 w-4" />,
    },
    {
      label: '개인 판매 상품 등록&관리',
      mobileLabel: '상품 등록&관리',
      to: '/main/sell/sellregister',
      icon: <PackagePlus className="h-4 w-4" />,
    },
    {
      label: '개인 판매 상품 주문 관리',
      mobileLabel: '주문 관리',
      to: '/main/sell/products',
      icon: <ClipboardList className="h-4 w-4" />,
    },
    {
      label: '개인 판매 상품 정산 관리',
      mobileLabel: '정산 관리',
      to: '/main/sell/management',
      icon: <Wallet className="h-4 w-4" />,
    },
  ],
  className = '',
  sticky = false,
  stickyOffsetPx = 0,
}: SellSubnavbarProps) {
  const { pathname } = useLocation();

  /** 현재 경로 확인 함수 */
  const isActivePath = (item: Item) => {
    if (item.exact) {
      return pathname === item.to;
    }
    return pathname.startsWith(item.to);
  };

  return (
    <div
      className={[
        'w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/75 font-jua',
        'py-3 sm:py-3 md:py-4 mb-6 md:mb-8',
        sticky ? 'sticky z-30' : '',
        className,
      ].join(' ')}
      style={sticky ? { top: stickyOffsetPx } : undefined}
    >
      {/* 중앙 컨테이너 - max-w 1440 */}
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6">
        {/* 데스크톱: 가로 스크롤 네비게이션 */}
        <nav
          className="hidden sm:flex items-center gap-3 md:gap-4 overflow-x-auto"
          aria-label="Sell sub navigation"
        >
          {items.map((item) => {
            const active = isActivePath(item);
            return (
              <Link
                key={item.to}
                to={item.to}
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

        {/* 모바일: 2x2 그리드 네비게이션 */}
        <nav
          className="sm:hidden grid grid-cols-2 gap-2"
          aria-label="Sell sub navigation"
        >
          {items.map((item) => {
            const active = isActivePath(item);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={[
                  'group flex items-center gap-2 px-3 py-3 text-sm font-medium transition-colors rounded-lg',
                  active
                    ? 'bg-[#2d4739] text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100',
                ].join(' ')}
              >
                {item.icon && (
                  <span className="shrink-0 flex items-center justify-center">
                    <span className="h-5 w-5">
                      {item.icon}
                    </span>
                  </span>
                )}
                <span className="leading-tight break-keep flex-1">
                  {item.mobileLabel || item.label}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}