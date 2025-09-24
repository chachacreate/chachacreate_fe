// src/shared/areas/navigation/features/sidenavbar/seller/SellerSidenavbar.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
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
  Menu,
} from 'lucide-react';
import { legacyGet } from '@src/libs/request';

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
}: SellerSidenavbarProps) {
  // ✅ :storeUrl(신규) 또는 :store(레거시) 모두 대응
  const { storeUrl, store } = useParams<{ storeUrl?: string; store?: string }>();
  const storeSegment = storeSegmentOverride ?? storeUrl ?? store ?? 'main';
  const base = `/seller/${storeSegment}`;
  const navigate = useNavigate();

  /** 모바일 전용 확장 토글 */
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

  /** 배경 클릭 시 사이드바 닫기 (모바일) */
  const handleBackdropClick = () => {
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setExpanded(false);
    }
  };

  /** 스토어 메인으로 이동 */
  const handleGoToStoreMain = () => {
    navigate(`/${storeSegment}`);
    handleNavClick();
  };

  type StoreInfo = {
    name: string;
    logoUrl: string;
  };

  const [storeInfo, setStoreInfo] = useState<StoreInfo | null>(null);

  useEffect(() => {
    async function loadStoreInfo() {
      try {
        const res = await legacyGet<any>(`/info/store/${storeSegment}`);
        const data = res.data;
        setStoreInfo({
          name: data.storeName,
          logoUrl: data.logoImg,
        });
      } catch (err) {
        console.error('스토어 정보 로딩 실패', err);
        setStoreInfo(null);
      }
    }

    loadStoreInfo();
  }, [storeSegment]);

  const sections = useMemo(
    () => [
      {
        key: 'home',
        label: '관리자 홈',
        type: 'link' as const,
        to: `${base}/main`,
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

  // 플레이스홀더 로고
  const logoSrc =
    storeInfo?.logoUrl ||
    'data:image/svg+xml;utf8,' +
      encodeURIComponent(
        `<svg xmlns='http://www.w3.org/2000/svg' width='64' height='64'>
          <rect width='100%' height='100%' rx='12' ry='12' fill='%23e5e7eb'/>
          <text x='50%' y='52%' dominant-baseline='middle' text-anchor='middle' font-size='18' fill='%239ca3af'>LOGO</text>
        </svg>`
      );

  return (
    <div className="w-full">
      {/* 헤더 하단 컨테이너 - 10px 패딩 */}
      <div className="pt-[10px] px-4 lg:px-0">
        {/* 1920 기준 좌우 패딩 240, 내부 max 1440 */}
        <div className="mx-auto w-full max-w-[1920px] lg:px-[24px] xl:px-[240px]">
          <div className="mx-auto w-full max-w-[1440px]">
            <div className="relative">
              {/* 모바일 햄버거 버튼 컨테이너 */}
              <div className="lg:hidden mb-4">
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setExpanded(true)}
                    className="flex items-center gap-2 p-2 rounded-lg border bg-white shadow-sm hover:bg-gray-50 transition-colors"
                    aria-label="메뉴 열기"
                  >
                    <Menu className="w-5 h-5" />
                    <span className="text-sm font-medium">메뉴</span>
                  </button>
                  
                  {/* 스토어 정보 (모바일) */}
                  <div className="flex items-center gap-2">
                    <img
                      src={logoSrc}
                      alt="store logo"
                      className="h-6 w-6 rounded-md object-cover"
                    />
                    <span className="text-sm font-medium text-gray-900 truncate max-w-[120px]">
                      {storeInfo?.name}
                    </span>
                  </div>
                </div>
              </div>

              {/* 모바일 오버레이 배경 */}
              {expanded && (
                <div
                  className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
                  onClick={handleBackdropClick}
                  aria-hidden="true"
                />
              )}

              <div className="grid lg:grid-cols-[auto,1fr] lg:gap-6">
                {/* 사이드바 */}
                <aside className={[
                  'fixed lg:sticky z-50 lg:z-auto',
                  'top-0 left-0 lg:top-auto lg:left-auto',
                  'transition-all duration-300 ease-in-out',
                  expanded ? 'opacity-100 visible' : 'opacity-0 invisible lg:opacity-100 lg:visible',
                ].join(' ')} 
                style={{ 
                  top: stickyOffsetPx + 10,
                }}>
                  <nav
                    className={[
                      'rounded-2xl border bg-white shadow-lg lg:shadow-sm',
                      'overflow-hidden',
                      'w-[280px]',
                      'max-h-[calc(100vh-80px)] overflow-y-auto'
                    ].join(' ')}
                    aria-label="Seller sidenav"
                  >
                    {/* 헤더: 로고 + 스토어명, 닫기 버튼(모바일만) */}
                    <div className="border-b px-3 py-3">
                      <div className="flex items-center justify-between gap-2 min-w-0">
                        {/* 로고 + 스토어명 */}
                        <div className="flex items-center gap-2 min-w-0">
                          <img
                            src={logoSrc}
                            alt="store logo"
                            className="h-7 w-7 rounded-md object-cover"
                          />
                          <Link
                            to={`${base}/main`}
                            className="block text-sm font-semibold text-gray-900 hover:underline truncate"
                            title={storeInfo?.name + ' 관리자 홈'}
                            onClick={handleNavClick}
                          >
                            {storeInfo?.name}
                          </Link>
                        </div>

                        {/* 닫기 버튼: 모바일에서만 */}
                        <button
                          type="button"
                          onClick={() => setExpanded(false)}
                          className="lg:hidden p-1 rounded-md hover:bg-gray-100"
                          aria-label="사이드바 닫기"
                        >
                          <span className="text-xl leading-none">×</span>
                        </button>
                      </div>
                    </div>

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
                                <span className={labelClass}>{sec.label}</span>
                              </Link>
                            </li>
                          );
                        }

                        if ((sec as any).type === 'external') {
                          return (
                            <li key={sec.key} className="mb-1">
                              <button
                                type="button"
                                onClick={(sec as any).onClick}
                                className={[linkBase, 'w-full', linkInactive].join(' ')}
                              >
                                <ExternalLink className="h-5 w-5 shrink-0" />
                                <span className={labelClass}>{sec.label}</span>
                              </button>
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
                                <span className={labelClass}>{sec.label}</span>
                              </div>
                              <ChevronDown
                                className={[
                                  'h-4 w-4 transition-transform',
                                  isOpen ? 'rotate-180' : '',
                                ].join(' ')}
                              />
                            </button>

                            {/* 드롭다운 아이템들 */}
                            <div
                              className={[
                                'overflow-hidden transition-all pl-2',
                                isOpen ? 'max-h-[480px] opacity-100' : 'max-h-0 opacity-0',
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
                                        <span className="text-sm">{item.label}</span>
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
                <main className="min-w-0 w-full">{children}</main>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}