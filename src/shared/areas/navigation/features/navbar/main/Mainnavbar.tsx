// shared/areas/navigation/features/navbar/main/Mainnavbar.tsx
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Home, ShoppingCart, User } from 'lucide-react';

type MenuItem = { label: string; href: string };

const DESKTOP_MENU: MenuItem[] = [
  { label: '전체상품', href: '/main/products' },
  { label: '스토어', href: '/main/stores' },
  { label: '개인판매', href: '/main/sell/sellguide' },
  { label: '클래스', href: '/main/classes' },
  { label: '마이페이지', href: '/main/mypage' },
  { label: '장바구니', href: '/main/mypage/cart' },
];

const MOBILE_TOP_MENU: MenuItem[] = [
  { label: '전체상품', href: '/main/products' },
  { label: '스토어', href: '/main/stores' },
  { label: '개인판매', href: '/main/sell/sellguide' },
  { label: '클래스', href: '/main/classes' },
];

const BOTTOM_MENU_ITEMS = [
  { href: '/main', label: '홈', Icon: Home },
  { href: '/main/mypage/cart', label: '장바구니', Icon: ShoppingCart },
  { href: '/main/mypage', label: '마이페이지', Icon: User },
] as const;

// ✅ 네비게이션 함수 메모이제이션
const navigateToPage = (href: string) => {
  window.location.href = href;
};

// ✅ 현재 경로 체크 함수 메모이제이션
const isActivePath = (href: string) => window.location.pathname === href;

// ✅ 메모이제이션된 네비게이션 아이템 컴포넌트
const DesktopNavItem = React.memo(({ item }: { item: MenuItem }) => {
  const active = isActivePath(item.href);

  const handleClick = useCallback(() => {
    navigateToPage(item.href);
  }, [item.href]);

  return (
    <button
      onClick={handleClick}
      className={[
        'font-jua leading-none pb-1 transition-colors',
        'text-[18px]',
        active
          ? 'font-bold text-[#2D4739] border-b-1 border-[#2D4739]'
          : 'text-[#2D4739] hover:text-[#1b2e23] border-b-2 border-transparent hover:border-[#2D4739]',
      ].join(' ')}
    >
      {item.label}
    </button>
  );
});

const MobileTopNavItem = React.memo(({ item }: { item: MenuItem }) => {
  const active = isActivePath(item.href);

  const handleClick = useCallback(() => {
    navigateToPage(item.href);
  }, [item.href]);

  return (
    <button
      onClick={handleClick}
      className={[
        'flex-1 text-center text-[14px] py-2 leading-none border-b-2',
        active
          ? 'font-bold text-[#2D4739] border-[#2D4739]'
          : 'text-[#2D4739] hover:text-[#1b2e23] border-transparent hover:border-[#2D4739]',
      ].join(' ')}
    >
      {item.label}
    </button>
  );
});

const BottomNavItem = React.memo(
  ({
    href,
    label,
    Icon,
  }: {
    href: string;
    label: string;
    Icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  }) => {
    const active = isActivePath(href);

    const handleClick = useCallback(() => {
      navigateToPage(href);
    }, [href]);

    return (
      <button
        onClick={handleClick}
        className={[
          'flex flex-col items-center justify-center gap-1 w-full h-full font-jua',
          active ? 'text-[#2D4739]' : 'text-[#2D4739] opacity-90 hover:opacity-100',
        ].join(' ')}
      >
        <Icon className="h-5 w-5" aria-hidden="true" />
        <span className="text-[12px] leading-none">{label}</span>
      </button>
    );
  }
);

export default function Mainnavbar() {
  const [safeBottom, setSafeBottom] = useState(0);
  const [scrolled, setScrolled] = useState(false);

  // ✅ iOS safe-area bottom 계산 최적화
  useEffect(() => {
    const calculateSafeBottom = () => {
      const div = document.createElement('div');
      div.style.cssText =
        'position:fixed;bottom:0;height:0;padding-bottom:env(safe-area-inset-bottom)';
      document.body.appendChild(div);
      const pb = parseFloat(getComputedStyle(div).paddingBottom || '0');
      setSafeBottom(pb);
      document.body.removeChild(div);
    };

    calculateSafeBottom();
  }, []);

  // ✅ 스크롤 이벤트 최적화
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);

    // 초기값 설정
    onScroll();

    // 스크롤 이벤트 리스너 추가
    window.addEventListener('scroll', onScroll, { passive: true });

    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // ✅ 메인 로고 클릭 핸들러 메모이제이션
  const handleLogoClick = useCallback(() => {
    navigateToPage('/main');
  }, []);

  // ✅ 메모이제이션된 데스크톱 네비게이션
  const desktopNavigation = useMemo(
    () => (
      <nav className="col-start-2 flex items-center w-full md:w-auto justify-between md:justify-start gap-0 md:gap-8">
        {DESKTOP_MENU.map((item) => (
          <DesktopNavItem key={item.href} item={item} />
        ))}
      </nav>
    ),
    []
  );

  // ✅ 메모이제이션된 모바일 상단 네비게이션
  const mobileTopNavigation = useMemo(
    () => (
      <nav className="md:hidden flex h-12 items-center justify-between font-jua">
        {MOBILE_TOP_MENU.map((item) => (
          <MobileTopNavItem key={item.href} item={item} />
        ))}
      </nav>
    ),
    []
  );

  // ✅ 메모이제이션된 모바일 하단 네비게이션
  const mobileBottomNavigation = useMemo(
    () => (
      <nav
        className="md:hidden fixed left-1/2 bottom-0 z-50 w-full -translate-x-1/2 border-t bg-white font-jua"
        style={{ paddingBottom: safeBottom }}
        aria-label="모바일 하단 내비게이션"
      >
        <div className="mx-auto w-full max-w-[1920px] px-4">
          <ul className="grid grid-cols-3 h-14">
            {BOTTOM_MENU_ITEMS.map(({ href, label, Icon }) => (
              <li key={href} className="flex items-center justify-center">
                <BottomNavItem href={href} label={label} Icon={Icon} />
              </li>
            ))}
          </ul>
        </div>
      </nav>
    ),
    [safeBottom]
  );

  // ✅ 메모이제이션된 헤더 스타일
  const headerClassName = useMemo(
    () =>
      [
        'sticky top-0 z-40 w-full font-jua',
        'bg-white shadow-[0_4px_8px_rgba(0,0,0,0.08)]',
        'transition-[background-color,backdrop-filter,box-shadow] duration-200',
        scrolled &&
          ['bg-white/70 backdrop-blur', 'supports-[backdrop-filter]:bg-white/50', 'shadow'].filter(
            Boolean
          ),
      ]
        .flat()
        .filter(Boolean)
        .join(' '),
    [scrolled]
  );

  return (
    <>
      {/* 상단 네비 */}
      <header className={headerClassName}>
        <div className="mx-auto w-full max-w-[1920px] px-4 md:px-6 xl:px-20 2xl:px-[240px]">
          {/* 데스크톱 */}
          <div className="hidden md:flex h-20 items-center justify-between">
            <div className="flex items-center">
              <button
                onClick={handleLogoClick}
                className="inline-flex items-center gap-2 hover:opacity-90 appearance-none bg-transparent p-0 border-0"
              >
                <img
                  src="/resources/images/logo/logohorizon_green.png"
                  alt="뜨락상회 로고"
                  className="h-9 md:h-20 w-auto"
                />
              </button>
            </div>
            {desktopNavigation}
          </div>

          {/* 모바일 상단 4-탭 */}
          {mobileTopNavigation}
        </div>
      </header>

      {/* 모바일 하단 고정 네비 */}
      {mobileBottomNavigation}
    </>
  );
}
