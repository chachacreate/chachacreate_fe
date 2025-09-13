// shared/areas/navigation/features/navbar/store/Storenavbar.tsx
import { NavLink, useParams, useLocation } from 'react-router-dom';
import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { Home, ShoppingCart, User, Store } from 'lucide-react';

type MenuItem = { label: string; to: string };

// ✅ 메모이제이션된 하위 컴포넌트들
const DesktopNavItem = React.memo(({ item }: { item: MenuItem }) => (
  <NavLink
    key={item.to}
    to={item.to}
    className={({ isActive }) =>
      [
        'text-sm transition-colors',
        isActive ? 'font-semibold text-gray-900' : 'text-gray-600 hover:text-gray-900',
      ].join(' ')
    }
  >
    {item.label}
  </NavLink>
));

const MobileTopNavItem = React.memo(({ item }: { item: MenuItem }) => (
  <NavLink
    key={item.to}
    to={item.to}
    className={({ isActive }) =>
      [
        'flex-1 text-center text-[13px] py-2',
        isActive ? 'font-semibold text-gray-900' : 'text-gray-600 hover:text-gray-900',
      ].join(' ')
    }
  >
    {item.label}
  </NavLink>
));

const BottomNavItem = React.memo(
  ({
    to,
    label,
    Icon,
  }: {
    to: string;
    label: string;
    Icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  }) => (
    <NavLink
      to={to}
      className={({ isActive }) =>
        [
          'flex flex-col items-center justify-center gap-1 w-full h-full',
          isActive ? 'text-gray-900' : 'text-gray-600',
        ].join(' ')
      }
    >
      <Icon className="h-5 w-5" aria-hidden />
      <span className="text-[11px]">{label}</span>
    </NavLink>
  )
);

// ✅ 메모이제이션된 HomeExpander 컴포넌트
const HomeExpander = React.memo(({ storeSlug }: { storeSlug: string }) => {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const toggleOpen = useCallback(() => {
    setOpen((prev) => !prev);
  }, []);

  const closeMenu = useCallback(() => {
    setOpen(false);
  }, []);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);

    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  const storeBase = useMemo(() => `/${storeSlug}`, [storeSlug]);

  const buttonClassName = useMemo(
    () =>
      [
        'flex flex-col items-center justify-center gap-1 w-20 h-14',
        open ? 'text-gray-900' : 'text-gray-700',
        'active:scale-95 transition-transform',
      ].join(' '),
    [open]
  );

  const panelClassName = useMemo(
    () =>
      [
        'absolute top-1/2 -translate-y-1/2 left-full ml-2',
        'rounded-full bg-gray-300/60 backdrop-blur px-2',
        'overflow-hidden shadow-sm border border-gray-200',
        'transition-all duration-200',
        open ? 'w-56 opacity-100' : 'w-0 opacity-0 pointer-events-none',
      ].join(' '),
    [open]
  );

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={toggleOpen}
        aria-expanded={open}
        aria-controls="home-expander-panel"
        className={buttonClassName}
      >
        <Home className="h-5 w-5" aria-hidden />
        <span className="text-[11px]">홈</span>
      </button>

      <div id="home-expander-panel" className={panelClassName} role="menu" aria-hidden={!open}>
        <div className="flex items-center gap-2 h-10">
          <NavLink
            to="/main"
            className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/90 text-gray-900 text-sm font-medium hover:bg-white"
            onClick={closeMenu}
            role="menuitem"
          >
            <Home className="h-4 w-4" />
            <span>뜨락상회</span>
          </NavLink>

          <NavLink
            to={storeBase}
            className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/90 text-gray-900 text-sm font-medium hover:bg-white"
            onClick={closeMenu}
            role="menuitem"
          >
            <Store className="h-4 w-4" />
            <span>{storeSlug}</span>
          </NavLink>
        </div>
      </div>
    </div>
  );
});

export default function Storenavbar() {
  // ✅ 파라미터와 경로 정보 메모이제이션
  const params = useParams<{ store?: string; storeSlug?: string }>();
  const location = useLocation();

  const storeSlug = useMemo(() => {
    return params.store ?? params.storeSlug ?? (location.pathname.split('/')[1] || 'store');
  }, [params.store, params.storeSlug, location.pathname]);

  const base = useCallback((sub: string = '') => `/${storeSlug}${sub}`, [storeSlug]);

  // ✅ 메뉴 아이템들 메모이제이션
  const DESKTOP_MENU: MenuItem[] = useMemo(
    () => [
      { label: '전체상품', to: base('/products') },
      { label: '스토어정보', to: base('/info') },
      { label: '클래스', to: base('/classes') },
      { label: '공지/소식', to: base('/notices') },
      { label: '마이페이지', to: base('/mypage') },
      { label: '장바구니', to: base('/mypage/cart') },
      { label: '메인 홈 가기', to: '/main' },
    ],
    [base]
  );

  const MOBILE_TOP_MENU: MenuItem[] = useMemo(
    () => [
      { label: '전체상품', to: base('/products') },
      { label: '스토어정보', to: base('/info') },
      { label: '클래스', to: base('/classes') },
      { label: '공지/소식', to: base('/notices') },
      { label: '메인 홈 가기', to: '/main' },
    ],
    [base]
  );

  // ✅ Safe bottom 계산 최적화
  const [safeBottom, setSafeBottom] = useState(0);

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

  // ✅ 메모이제이션된 네비게이션 요소들
  const logoSection = useMemo(
    () => (
      <div className="items-center hidden md:flex">
        <NavLink to={base()} className="inline-flex items-center gap-2">
          <span className="text-xl font-bold tracking-tight">
            {storeSlug ? `${storeSlug}` : '뜨락상회 스토어'}
          </span>
        </NavLink>
      </div>
    ),
    [base, storeSlug]
  );

  const desktopNavigation = useMemo(
    () => (
      <nav className="hidden md:flex items-center gap-6">
        {DESKTOP_MENU.map((item) => (
          <DesktopNavItem key={item.to} item={item} />
        ))}
      </nav>
    ),
    [DESKTOP_MENU]
  );

  const mobileTopNavigation = useMemo(
    () => (
      <nav className="md:hidden flex h-11 items-center justify-between">
        {MOBILE_TOP_MENU.map((item) => (
          <MobileTopNavItem key={item.to} item={item} />
        ))}
      </nav>
    ),
    [MOBILE_TOP_MENU]
  );

  const mobileBottomNavigation = useMemo(
    () => (
      <nav
        className="md:hidden fixed left-1/2 bottom-0 z-50 w-full -translate-x-1/2 border-t bg-white"
        style={{ paddingBottom: safeBottom }}
        aria-label="모바일 하단 내비게이션"
      >
        <div className="mx-auto w-full max-w-[1920px] px-4">
          <ul className="grid grid-cols-3 h-14 relative">
            <li className="relative flex items-center justify-center">
              <HomeExpander storeSlug={storeSlug} />
            </li>
            <li className="flex items-center justify-center">
              <BottomNavItem to={base('/mypage/cart')} label="장바구니" Icon={ShoppingCart} />
            </li>
            <li className="flex items-center justify-center">
              <BottomNavItem to={base('/mypage')} label="마이페이지" Icon={User} />
            </li>
          </ul>
        </div>
      </nav>
    ),
    [safeBottom, storeSlug, base]
  );

  const spacerDiv = useMemo(
    () => <div className="md:hidden h-14" style={{ marginBottom: safeBottom }} />,
    [safeBottom]
  );

  return (
    <>
      {/* 상단 네비게이션 */}
      <header className="sticky top-0 z-40 w-full border-b bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="mx-auto w-full max-w-[1920px] px-4 md:px-6 xl:px-20 2xl:px-[240px]">
          <div className="flex h-16 items-center justify-between">
            {logoSection}
            {desktopNavigation}
          </div>
          {mobileTopNavigation}
        </div>
      </header>

      {/* 모바일 하단 고정 네비 */}
      {mobileBottomNavigation}

      {/* 하단바 가려짐 방지 */}
      {spacerDiv}
    </>
  );
}
