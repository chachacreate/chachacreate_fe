// src/shared/areas/navigation/features/sidenavbar/seller/SellerSidenavbar.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Home,
  ChevronDown,
  PackagePlus,
  ListChecks,
  Star,
  ShoppingCart,
  Truck,
  Wallet,
  Settings,
  Palette,
  MessageSquareText,
  Megaphone,
  GraduationCap,
  NotebookPen,
  CalendarCheck,
  Plus,
  ExternalLink,
} from 'lucide-react';
import { goToStoreMain } from '@src/shared/util/LegacyNavigate';

type SellerSidenavbarProps = {
  /** 헤더 높이 보정(top sticky) */
  stickyOffsetPx?: number;
  /** 강제 스토어 세그먼트 (없으면 URL :storeUrl 사용) */
  storeSegmentOverride?: string;
  /** 우측 콘텐츠 (선택) */
  children?: React.ReactNode;
  /** 임시 개인 스토어 로고 URL */
  storeLogoUrl?: string;
};

export default function SellerSidenavbar({
  stickyOffsetPx = 0,
  storeSegmentOverride,
  children,
  storeLogoUrl,
}: SellerSidenavbarProps) {
  // ✅ :storeUrl(신규) 또는 :store(레거시) 모두 대응
  const { storeUrl, store } = useParams<{ storeUrl?: string; store?: string }>();
  const storeSegment = storeSegmentOverride ?? storeUrl ?? store ?? 'main';
  const base = `/seller/${storeSegment}`;

  /** 모바일 전용 확장 토글 (>> / <<) */
  const [expanded, setExpanded] = useState(false);

  /** 섹션(아코디언) 펼침 상태 저장 */
  const [openMap, setOpenMap] = useState<Record<string, boolean>>(() => {
    try {
      const raw = localStorage.getItem('seller-sidenav-open');
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });
  useEffect(() => {
    localStorage.setItem('seller-sidenav-open', JSON.stringify(openMap));
  }, [openMap]);

  /** 현재 경로 확인 함수 */
  const isActivePath = (path: string) => {
    if (typeof window !== 'undefined') {
      return window.location.pathname === path;
    }
    return false;
  };

  /** 모바일에서 메뉴 클릭 시 자동 접힘 */
  const handleNavClick = () => {
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setExpanded(false);
    }
  };

  /** 스토어 메인으로 이동 */
  const handleGoToStoreMain = () => {
    goToStoreMain(storeSegment);
    handleNavClick(); // 모바일에서 사이드바 접기
  };

  const sections = useMemo(
    () => [
      {
        key: 'home',
        label: `${storeSegment} 관리자 홈`,
        type: 'link' as const,
        to: `${base}/main`, // 필요에 따라 `/settlement` 등으로 변경 가능
      },
      {
        key: 'product',
        label: '상품 관리',
        icon: PackagePlus,
        items: [
          { label: '상품 등록', to: `${base}/product/insert`, icon: Plus },
          { label: '상품 리스트', to: `${base}/product/list` },
          { label: '상품 리뷰', to: `${base}/product/review`, icon: Star },
        ],
      },
      {
        key: 'order',
        label: '주문 · 정산 관리',
        icon: ShoppingCart,
        items: [
          { label: '주문/발송 상태 확인', to: `${base}/product/order`, icon: Truck },
          { label: '상품 & 클래스 정산', to: `${base}/settlement`, icon: Wallet },
        ],
      },
      {
        key: 'store',
        label: '스토어 관리',
        icon: Settings,
        items: [
          { label: '스토어 정보', to: `${base}/storeinfo` },
          { label: '나의 스토어 커스텀', to: `${base}/store/custom`, icon: Palette },
          { label: '문의 메시지', to: `${base}/message`, icon: MessageSquareText },
          { label: '공지사항', to: `${base}/store/notice`, icon: Megaphone },
        ],
      },
      {
        key: 'class',
        label: '클래스 관리',
        icon: GraduationCap,
        items: [
          { label: '클래스 등록', to: `${base}/class/insert`, icon: NotebookPen },
          { label: '클래스 리스트', to: `${base}/class/list` },
          { label: '클래스 예약 확인', to: `${base}/class/reservation`, icon: CalendarCheck },
        ],
      },
      {
        key: 'storeMain',
        label: '스토어 메인으로 이동',
        type: 'external' as const,
        onClick: handleGoToStoreMain,
      },
    ],
    [storeSegment, base]
  );

  const toggleSection = (key: string) => setOpenMap((prev) => ({ ...prev, [key]: !prev[key] }));

  const linkBase = 'flex items-center gap-3 rounded-lg px-3 py-2 transition-colors';
  const linkInactive = 'text-gray-600 hover:bg-gray-100 hover:text-gray-900';
  const linkActive = 'bg-gray-900 text-white hover:bg-gray-900';
  const labelClass = 'text-sm font-medium truncate';

  // 플레이스홀더 로고 (연회색 박스에 LOGO 텍스트)
  const logoSrc =
    storeLogoUrl ||
    'data:image/svg+xml;utf8,' +
      encodeURIComponent(
        `<svg xmlns='http://www.w3.org/2000/svg' width='64' height='64'>
          <rect width='100%' height='100%' rx='12' ry='12' fill='%23e5e7eb'/>
          <text x='50%' y='52%' dominant-baseline='middle' text-anchor='middle' font-size='18' fill='%239ca3af'>LOGO</text>
        </svg>`
      );

  return (
    <div className="w-full">
      {/* 1920 기준 좌우 패딩 240, 내부 max 1440, 좌측 정렬 */}
      <div className="mx-auto w-full max-w-[1920px] px-0 md:px-[24px] xl:px-[240px]">
        <div className="mx-auto w-full max-w-[1440px]">
          <div className="grid grid-cols-[auto,1fr] gap-6" style={{ position: 'relative' }}>
            {/* 사이드바 */}
            <aside className="sticky" style={{ top: stickyOffsetPx }}>
              <nav
                className={[
                  'rounded-2xl border bg-white shadow-sm',
                  'transition-all duration-200 ease-in-out overflow-hidden',
                  // 모바일: 64 ↔ 260, 웹: 280 고정
                  expanded ? 'w-[260px]' : 'w-[64px]',
                  'lg:w-[280px]',
                ].join(' ')}
                aria-label="Seller sidenav"
              >
                {/* ===== 헤더: 임시 로고 + 스토어명, 화살표(모바일만) ===== */}
                <div className="border-b px-3 py-3">
                  <div className="flex items-center gap-2 min-w-0">
                    {/* 로고: 모바일 h-5 w-5, 웹 lg:h-7 w-7 */}
                    <img
                      src={logoSrc}
                      alt="store logo"
                      className="h-5 w-5 lg:h-7 lg:w-7 rounded-md object-cover"
                    />
                    {/* 스토어명: 모바일에선 expanded일 때만, 웹에선 항상 보임 */}
                    <div
                      className={[expanded ? 'block' : 'hidden', 'lg:block', 'min-w-0'].join(' ')}
                    >
                      <Link
                        to={`${base}/main`}
                        className="block text-sm font-semibold text-gray-900 hover:underline truncate"
                        title={`${storeSegment} 관리자 홈`}
                        onClick={handleNavClick}
                      >
                        {storeSegment}
                      </Link>
                    </div>
                  </div>

                  {/* 화살표 토글: 모바일에서만 노출(로고 아래). 웹에서는 숨김 */}
                  <div className="mt-2 lg:hidden">
                    <button
                      type="button"
                      aria-label="사이드바 토글"
                      aria-pressed={expanded}
                      onClick={() => setExpanded((v) => !v)}
                      className="inline-flex items-center justify-center w-full rounded-md border px-2 py-1 text-sm"
                      title="toggle"
                    >
                      <span className="leading-none">{expanded ? '<<' : '>>'}</span>
                    </button>
                  </div>
                </div>
                {/* ===== /헤더 ===== */}

                {/* 메뉴 목록 */}
                <ul className="p-2">
                  {sections.map((sec) => {
                    if ((sec as any).type === 'link') {
                      const isActive = isActivePath((sec as any).to);
                      return (
                        <li key={sec.key} className="mb-1">
                          <Link
                            to={(sec as any).to}
                            onClick={handleNavClick}
                            className={[linkBase, isActive ? linkActive : linkInactive].join(' ')}
                          >
                            <Home className="h-5 w-5 shrink-0" />
                            <span
                              className={[
                                labelClass,
                                expanded ? 'block' : 'hidden',
                                'lg:block',
                              ].join(' ')}
                            >
                              {sec.label}
                            </span>
                          </Link>
                        </li>
                      );
                    }

                    if ((sec as any).type === 'external') {
                      return (
                        <li key={sec.key} className="mb-1">
                          <a
                            href={(sec as any).href}
                            onClick={(sec as any).onClick}
                            className={[linkBase, 'w-full', linkInactive].join(' ')}
                          >
                            <ExternalLink className="h-5 w-5 shrink-0" />
                            <span
                              className={[
                                labelClass,
                                expanded ? 'block' : 'hidden',
                                'lg:block',
                              ].join(' ')}
                            >
                              {sec.label}
                            </span>
                          </a>
                        </li>
                      );
                    }

                    const isOpen = !!openMap[sec.key];

                    return (
                      <li key={sec.key} className="mb-1">
                        <button
                          type="button"
                          onClick={() => toggleSection(sec.key)}
                          aria-expanded={isOpen}
                          className={[
                            linkBase,
                            'w-full justify-between',
                            'text-gray-700 hover:bg-gray-100',
                          ].join(' ')}
                        >
                          <div className="flex items-center gap-3">
                            {sec.icon && <sec.icon className="h-5 w-5 shrink-0" />}
                            <span
                              className={[
                                labelClass,
                                expanded ? 'block' : 'hidden',
                                'lg:block',
                              ].join(' ')}
                            >
                              {sec.label}
                            </span>
                          </div>
                          <ChevronDown
                            className={[
                              'h-4 w-4 transition-transform',
                              isOpen ? 'rotate-180' : '',
                              expanded ? 'block' : 'hidden',
                              'lg:block',
                            ].join(' ')}
                          />
                        </button>

                        {/* 드롭다운 아이템들 */}
                        <div
                          className={[
                            'overflow-hidden transition-all',
                            isOpen ? 'max-h-[480px] opacity-100' : 'max-h-0 opacity-0',
                            expanded ? 'pl-2' : 'pl-0',
                            'lg:pl-2',
                          ].join(' ')}
                          aria-hidden={!isOpen}
                        >
                          <ul className="mt-1 mb-2">
                            {sec.items?.map((item, idx) => {
                              const ItemIcon =
                                item.icon ??
                                (sec.key === 'product'
                                  ? ListChecks
                                  : sec.key === 'order'
                                    ? Wallet
                                    : sec.key === 'store'
                                      ? Settings
                                      : GraduationCap);
                              const isActive = isActivePath(item.to);
                              return (
                                <li key={idx}>
                                  <Link
                                    to={item.to}
                                    onClick={handleNavClick}
                                    className={[
                                      'ml-2',
                                      linkBase,
                                      isActive ? linkActive : linkInactive,
                                    ].join(' ')}
                                  >
                                    <ItemIcon className="h-4 w-4 shrink-0" />
                                    <span
                                      className={[
                                        'text-sm',
                                        expanded ? 'block' : 'hidden',
                                        'lg:block',
                                      ].join(' ')}
                                    >
                                      {item.label}
                                    </span>
                                  </Link>
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </nav>
            </aside>

            {/* 우측 콘텐츠 */}
            <main className="min-w-0">{children}</main>
          </div>
        </div>
      </div>
    </div>
  );
}
