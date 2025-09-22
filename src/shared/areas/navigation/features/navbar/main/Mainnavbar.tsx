// shared/areas/navigation/features/navbar/main/Mainnavbar.tsx
import { useEffect, useState } from 'react';
import { Home, ShoppingCart, User } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

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

export default function Mainnavbar() {
  const location = useLocation();
  const [safeBottom, setSafeBottom] = useState(0);
  const [scrolled, setScrolled] = useState(false);

  const isActivePath = (href: string) => location.pathname === href;

  // iOS safe-area bottom
  useEffect(() => {
    const div = document.createElement('div');
    div.style.cssText =
      'position:fixed;bottom:0;height:0;padding-bottom:env(safe-area-inset-bottom)';
    document.body.appendChild(div);
    const pb = parseFloat(getComputedStyle(div).paddingBottom || '0');
    setSafeBottom(pb);
    document.body.removeChild(div);
  }, []);

  // 스크롤 시 반투명/블러 토글
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <>
      {/* 상단 네비 */}
      <header
        data-scrolled={scrolled ? 'true' : 'false'}
        className="
          sticky top-0 z-40 w-full font-jua
          bg-white shadow-[0_4px_8px_rgba(0,0,0,0.08)]
          transition-[background-color,backdrop-filter,box-shadow] duration-200
          data-[scrolled=true]:bg-white/70
          data-[scrolled=true]:backdrop-blur
          data-[scrolled=true]:supports-[backdrop-filter]:bg-white/50
          data-[scrolled=true]:shadow
        "
      >
        <div className="mx-auto w-full max-w-[1920px] px-4 md:px-6 xl:px-20 2xl:px-[240px]">
          {/* 데스크톱 */}
          <div className="hidden md:flex h-20 items-center justify-between">
            <div className="flex items-center">
              <Link to="/main" className="inline-flex items-center gap-2 hover:opacity-90">
                <img
                  src="/resources/images/logo/logohorizon_green.png"
                  alt="뜨락상회 로고"
                  className="h-9 md:h-20 w-auto"
                />
              </Link>
            </div>

            {/* 데스크톱 메뉴: 레거시 간격(≈20px) 매칭 */}
            <nav className="col-start-2 flex items-center w-full md:w-auto justify-between md:justify-start gap-0 md:gap-8">
              {DESKTOP_MENU.map((m) => {
                const active = isActivePath(m.href);
                return (
                  <Link
                    key={m.href}
                    to={m.href}
                    className={[
                      'font-jua leading-none pb-1 transition-colors',
                      'text-[18px]',
                      active
                        ? 'font-bold text-[#2D4739] border-b-1 border-[#2D4739]'
                        : 'text-[#2D4739] hover:text-[#1b2e23] border-b-2 border-transparent hover:border-[#2D4739]',
                    ].join(' ')}
                  >
                    {m.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* 모바일 상단 4-탭 */}
          <nav className="md:hidden flex h-12 items-center justify-between font-jua">
            {MOBILE_TOP_MENU.map((m) => {
              const active = isActivePath(m.href);
              return (
                <Link
                  key={m.href}
                  to={m.href}
                  className={[
                    'flex-1 text-center text-[14px] py-2 leading-none border-b-2',
                    active
                      ? 'font-bold text-[#2D4739] border-[#2D4739]'
                      : 'text-[#2D4739] hover:text-[#1b2e23] border-transparent hover:border-[#2D4739]',
                  ].join(' ')}
                >
                  {m.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      {/* 모바일 하단 고정 네비 */}
      <nav
        className="md:hidden fixed left-1/2 bottom-0 z-50 w-full -translate-x-1/2 border-t bg-white font-jua"
        style={{ paddingBottom: safeBottom }}
        aria-label="모바일 하단 내비게이션"
      >
        <div className="mx-auto w-full max-w-[1920px] px-4">
          <ul className="grid grid-cols-3 h-14">
            <li className="flex items-center justify-center">
              <BottomItem href="/main" label="홈" Icon={Home} useHref />
            </li>
            <li className="flex items-center justify-center">
              <BottomItem href="/main/mypage/cart" label="장바구니" Icon={ShoppingCart} />
            </li>
            <li className="flex items-center justify-center">
              <BottomItem href="/main/mypage" label="마이페이지" Icon={User} />
            </li>
          </ul>
        </div>
      </nav>
    </>
  );
}

function BottomItem({
  href,
  label,
  Icon,
  useHref = false,
}: {
  href: string;
  label: string;
  Icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  useHref?: boolean;
}) {
  const location = useLocation();
  const active = location.pathname === href;

  const className = [
    'flex flex-col items-center justify-center gap-1 w-full h-full font-jua',
    active ? 'text-[#2D4739]' : 'text-[#2D4739] opacity-90 hover:opacity-100',
  ].join(' ');

  if (useHref) {
    return (
      <a href={href} className={className}>
        <Icon className="h-5 w-5" aria-hidden="true" />
        <span className="text-[12px] leading-none">{label}</span>
      </a>
    );
  }

  return (
    <Link to={href} className={className}>
      <Icon className="h-5 w-5" aria-hidden="true" />
      <span className="text-[12px] leading-none">{label}</span>
    </Link>
  );
}
