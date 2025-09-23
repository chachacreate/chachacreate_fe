// shared/areas/navigation/features/navbar/store/Storenavbar.tsx
import { useParams, useLocation } from 'react-router-dom';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Home, ShoppingCart, User, Store, Settings } from 'lucide-react';
import { getCurrentUser } from '@src/shared/util/jwtUtils';
import { legacyGet } from '@src/libs/request';
import type { ApiResponse } from '@src/libs/apiResponse';

/** ===== Types ===== */
type MenuItem = { label: string; href: string };

type StoreInfo = {
  storeName: string;
  logoImg: string;
  storeOwnerId: string | number;
  storeUrl: string;
};

type StorenavbarProps = {
  /** (선택) 외부에서 사용자 ID를 넘겨주고 싶을 때 */
  currentUserId?: string | number;
  /** API/앱 기본 경로 접두 (예: "/create") */
  cpath?: string;
};

/** ===== Utils ===== */
function resolveCpath(explicit?: string) {
  if (explicit) return explicit;
  const meta = document.querySelector('meta[name="cpath"]') as HTMLMetaElement | null;
  return meta?.content || '';
}

function stripCpath(pathname: string, cpath: string) {
  const normalizedCpath = (cpath || '').replace(/\/+$/, '');
  if (normalizedCpath && pathname.startsWith(normalizedCpath + '/')) {
    return pathname.slice(normalizedCpath.length) || '/';
  }
  return pathname || '/';
}

/** ===== Component ===== */
export default function Storenavbar({ cpath: cpathProp }: StorenavbarProps) {
  const location = useLocation();
  const params = useParams<{ store?: string; storeSlug?: string }>();

  /** cpath 보정 */
  const cpath = useMemo(() => resolveCpath(cpathProp), [cpathProp]);

  /** 스토어 슬러그 계산 */
  const store = useMemo(() => {
    const byParam = params.store ?? params.storeSlug;
    if (byParam) return byParam;

    const path = stripCpath(location.pathname, cpath);
    const segs = path.split('/').filter(Boolean);

    const RESERVED = new Set([
      'main',
      'seller',
      'admin',
      'resources',
      'static',
      'assets',
      'legacy',
      'create',
      'api',
    ]);

    if (segs.length >= 2 && RESERVED.has(segs[0]) && !RESERVED.has(segs[1])) {
      return segs[1];
    }
    if (segs[0] && !RESERVED.has(segs[0])) return segs[0];
    return 'store';
  }, [params.store, params.storeSlug, location.pathname, cpath]);

  const [storeInfo, setStoreInfo] = useState<StoreInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [safeBottom, setSafeBottom] = useState(0);
  const [scrolled, setScrolled] = useState(false);

  /** 링크 생성: 항상 cpath 접두 */
  const base = (sub: string = '') => `${cpath}/${store}${sub}`.replace(/\/{2,}/g, '/');

  /** 오너 여부: 아이디 비교만(역할 체크 X) */
  const isStoreOwner = useMemo(() => {
    const currentUser = getCurrentUser();
    const id = currentUser?.memberId;
    return !!(id && storeInfo?.storeOwnerId && String(id) === String(storeInfo.storeOwnerId));
  }, [storeInfo?.storeOwnerId]);

  // 스토어 정보 로드 (store/cpath 변경 시마다)
  useEffect(() => {
    const controller = new AbortController();

    const load = async () => {
      try {
        if (!store) return;

        setLoading(true);
        setErrorMsg(null);

        const url = `/${store}/seller`.replace(/\/{2,}/g, '/');

        const res: ApiResponse<StoreInfo> = await legacyGet(url);
        const storeData: StoreInfo = res.data;

        setStoreInfo({
          storeName: storeData.storeName,
          logoImg: storeData.logoImg,
          storeOwnerId: storeData.storeOwnerId,
          storeUrl: storeData.storeUrl,
        });
      } catch (e: any) {
        if (e?.name === 'AbortError') return;
        console.error('[Storenavbar] fetch error:', e);
        setErrorMsg(String(e?.message || e));
        setStoreInfo(
          (prev) => prev ?? { storeName: store, logoImg: '', storeOwnerId: '', storeUrl: 'main' }
        );
      } finally {
        setLoading(false);
      }
    };
    load();
    return () => controller.abort();
  }, [store, cpath]);

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

  /** 활성 메뉴 비교용 현재 경로(cpath 제거) */
  const currentPath = useMemo(
    () => stripCpath(location.pathname, cpath),
    [location.pathname, cpath]
  );

  // 메뉴 구성 (데스크톱용은 메인 홈 포함 유지)
  const DESKTOP_MENU = useMemo<MenuItem[]>(() => {
    const items: MenuItem[] = [
      { label: '전체상품', href: base('/products') },
      { label: '스토어정보', href: base('/info') },
      { label: '클래스', href: base('/classes') },
      { label: '공지/소식', href: base('/notices') },
      { label: '마이페이지', href: base('/mypage') },
      { label: '장바구니', href: base('/mypage/cart') },
    ];
    if (isStoreOwner) items.push({ label: '스토어 관리', href: `${cpath}/seller/${store}/main` });
    items.push({ label: '메인 홈', href: `${cpath}/main` });
    return items;
  }, [isStoreOwner, store, cpath]);

  // ✅ 모바일 상단 메뉴: "메인 홈" 제거 + 균등 분할(Grid 4)
  const MOBILE_TOP_MENU = useMemo<MenuItem[]>(() => {
    return [
      { label: '전체상품', href: base('/products') },
      { label: '스토어정보', href: base('/info') },
      { label: '클래스', href: base('/classes') },
      { label: '공지/소식', href: base('/notices') },
    ];
  }, [store, cpath]); // 굳이 isStoreOwner 필요X

  return (
    <div className="font-jua">
      {/* 상단 네비게이션 */}
      <header
        data-scrolled={scrolled ? 'true' : 'false'}
        className="
          sticky top-0 z-40 w-full
          bg-white shadow-[0_4px_8px_rgba(0,0,0,0.08)]
          transition-[background-color,backdrop-filter,box-shadow] duration-200
          data-[scrolled=true]:bg-white/70
          data-[scrolled=true]:backdrop-blur
          data-[scrolled=true]:supports-[backdrop-filter]:bg-white/50
          data-[scrolled=true]:shadow
        "
      >
        <div className="mx-auto w-full max-w-[1920px] px-4 md:px-6 xl:px-20 2xl:px-[240px]">
          {/* 데스크톱 헤더 */}
          <div className="hidden md:flex h-20 items-center justify-between">
            {/* 좌측: 로고 & 스토어명 */}
            <div className="flex items-center gap-3 md:gap-6 min-w-0">
              <a
                href={`${cpath}/${store}`}
                className="flex-shrink-0 hover:opacity-90"
                aria-label="스토어 홈"
              >
                {loading ? (
                  <div className="h-12 md:h-16 w-16 bg-gray-200 animate-pulse rounded" />
                ) : storeInfo?.logoImg ? (
                  <img
                    src={storeInfo.logoImg}
                    alt={`${storeInfo.storeName} 로고`}
                    className="h-12 md:h-16 w-auto object-contain"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="h-12 md:h-16 w-16 bg-gray-100 rounded flex items-center justify-center">
                    <Store className="h-6 w-6 text-gray-400" />
                  </div>
                )}
              </a>
              <div className="min-w-0">
                <h1 className="text-lg md:text-2xl font-bold text-[#1b2e23] truncate leading-tight">
                  {(storeInfo?.storeName || store) + (errorMsg ? ' (정보 로드 실패)' : '')}
                </h1>
              </div>
            </div>

            {/* 데스크톱 메뉴 */}
            <nav className="col-start-2 flex items-center w-full md:w-auto justify-between md:justify-start gap-0 md:gap-8">
              {DESKTOP_MENU.map((m) => {
                const normalizedHref = stripCpath(m.href, cpath);
                const active = currentPath === normalizedHref || currentPath === m.href;

                return (
                  <a
                    key={m.href}
                    href={m.href}
                    className={[
                      'leading-none pb-1 text-[18px] transition-colors border-b-2',
                      active
                        ? 'font-bold text-[#2D4739] border-transparent'
                        : 'text-[#2D4739] hover:text-[#1b2e23] border-transparent hover:border-[#2D4739]',
                    ].join(' ')}
                  >
                    {m.label}
                  </a>
                );
              })}
            </nav>
          </div>

          {/* ✅ 모바일 상단 메뉴: 균등 그리드 4, 스크롤 제거 */}
          <nav className="md:hidden">
            <ul className="grid grid-cols-4">
              {MOBILE_TOP_MENU.map((m) => {
                const normalizedHref = stripCpath(m.href, cpath);
                const active = currentPath === normalizedHref || currentPath === m.href;
                return (
                  <li key={m.href} className="col-span-1">
                    <a
                      href={m.href}
                      className={[
                        'flex h-12 items-center justify-center text-[14px] border-b-2',
                        active
                          ? 'font-bold text-[#2D4739] border-transparent'
                          : 'text-[#2D4739] hover:text-[#1b2e23] border-transparent hover:border-[#2D4739]',
                      ].join(' ')}
                    >
                      {m.label}
                    </a>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>
      </header>

      {/* 모바일 하단 고정 네비 */}
      <nav
        className="md:hidden fixed left-1/2 bottom-0 z-50 w-full -translate-x-1/2 border-t bg-white"
        style={{ paddingBottom: safeBottom }}
        aria-label="모바일 하단 내비게이션"
      >
        <div className="mx-auto w-full max-w-[1920px] px-4">
          <ul className={`grid h-14 ${isStoreOwner ? 'grid-cols-4' : 'grid-cols-3'}`}>
            <li className="flex items-center justify-center">
              <HomeExpander store={store} cpath={cpath} />
            </li>
            <li className="flex items-center justify-center">
              <BottomItem
                href={base('/mypage/cart')}
                label="장바구니"
                Icon={ShoppingCart}
                currentPath={currentPath}
                cpath={cpath}
              />
            </li>
            <li className="flex items-center justify-center">
              <BottomItem
                href={base('/mypage')}
                label="마이페이지"
                Icon={User}
                currentPath={currentPath}
                cpath={cpath}
              />
            </li>
            {isStoreOwner && (
              <li className="flex items-center justify-center">
                <BottomItem
                  href={`${cpath}/seller/${store}/main`}
                  label="스토어 관리"
                  Icon={Settings}
                  currentPath={currentPath}
                  cpath={cpath}
                />
              </li>
            )}
          </ul>
        </div>
      </nav>

      {/* 하단바 가려짐 방지 여백이 필요하면 주석 해제 */}
      {/* <div className="md:hidden h-14" style={{ marginBottom: safeBottom }} /> */}
    </div>
  );
}

/** ===== Sub Components ===== */
function HomeExpander({ store, cpath }: { store: string; cpath: string }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  const storeBase = `${cpath}/${store}`.replace(/\/{2,}/g, '/');

  return (
    <div ref={rootRef} className="relative">
      {/* ✅ 배경 오버레이 */}
      {open && (
        <button
          aria-hidden
          tabIndex={-1}
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-40 bg-black/25 backdrop-blur-[2px]"
        />
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="home-expander-panel"
        className={[
          'relative z-50',
          'flex flex-col items-center justify-center gap-1 w-20 h-14',
          open ? 'text-[#2D4739]' : 'text-[#2D4739] opacity-90 hover:opacity-100',
          'active:scale-95 transition-transform',
        ].join(' ')}
      >
        <Home className="h-5 w-5" aria-hidden />
        <span className="text-[12px] leading-none">홈</span>
      </button>

      <div
        id="home-expander-panel"
        className={[
          'absolute top-1/2 -translate-y-1/2 left-full ml-2 z-50',
          'rounded-full bg-white/85 backdrop-blur px-2',
          'overflow-hidden shadow-sm border border-[#e5e7eb]',
          'transition-all duration-200',
          open ? 'w-56 opacity-100' : 'w-0 opacity-0 pointer-events-none',
        ].join(' ')}
        role="menu"
        aria-hidden={!open}
      >
        <div className="flex items-center gap-2 h-10">
          <a
            href={`${cpath}/main`.replace(/\/{2,}/g, '/')}
            className="flex items-center gap-2 px-3 py-1 rounded-full bg-white text-[#2D4739] text-sm font-medium hover:bg-white/90"
            onClick={() => setOpen(false)}
          >
            <Home className="h-4 w-4" />
            <span>뜨락상회</span>
          </a>

          <a
            href={storeBase}
            className="flex items-center gap-2 px-3 py-1 rounded-full bg-white text-[#2D4739] text-sm font-medium hover:bg-white/90"
            onClick={() => setOpen(false)}
          >
            <Store className="h-4 w-4" />
            <span>{store}</span>
          </a>
        </div>
      </div>
    </div>
  );
}

function BottomItem({
  href,
  label,
  Icon,
  currentPath,
  cpath,
}: {
  href: string;
  label: string;
  Icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  currentPath: string;
  cpath: string;
}) {
  const normalizedHref = stripCpath(href, cpath);
  const active = currentPath === normalizedHref || currentPath === href;

  return (
    <a
      href={href}
      className={[
        'flex flex-col items-center justify-center gap-1 w-full h-full',
        active ? 'text-[#2D4739]' : 'text-[#2D4739] opacity-90 hover:opacity-100',
      ].join(' ')}
    >
      <Icon className="h-5 w-5" aria-hidden />
      <span className="text-[12px] leading-none">{label}</span>
    </a>
  );
}
