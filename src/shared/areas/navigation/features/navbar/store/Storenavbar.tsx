// shared/areas/navigation/features/navbar/store/Storenavbar.tsx
import { useParams, useLocation } from "react-router-dom";
import { useEffect, useState, useRef, useMemo } from "react";
import { Home, ShoppingCart, User, Store } from "lucide-react";

type MenuItem = { label: string; href: string };

const isActivePath = (href: string) => window.location.pathname === href;

export default function Storenavbar() {
  const params = useParams<{ store?: string; storeSlug?: string }>();
  const location = useLocation();
  const storeSlug = useMemo(() => {
    return (
      params.store ??
      params.storeSlug ??
      (location.pathname.split("/")[1] || "store")
    );
  }, [params.store, params.storeSlug, location.pathname]);

  const base = (sub: string = "") => `/${storeSlug}${sub}`;

  const DESKTOP_MENU: MenuItem[] = [
    { label: "전체상품", href: base("/products") },
    { label: "스토어정보", href: base("/info") },
    { label: "클래스", href: base("/classes") },
    { label: "공지/소식", href: base("/notices") },
    { label: "마이페이지", href: base("/mypage") },
    { label: "장바구니", href: base("/mypage/cart") },
    { label: "메인 홈", href: "/main" },
  ];

  const MOBILE_TOP_MENU: MenuItem[] = [
    { label: "전체상품", href: base("/products") },
    { label: "스토어정보", href: base("/info") },
    { label: "클래스", href: base("/classes") },
    { label: "공지/소식", href: base("/notices") },
    { label: "메인 홈", href: "/main" },
  ];

  const [safeBottom, setSafeBottom] = useState(0);
  const [scrolled, setScrolled] = useState(false);

  // iOS safe-area bottom
  useEffect(() => {
    const div = document.createElement("div");
    div.style.cssText =
      "position:fixed;bottom:0;height:0;padding-bottom:env(safe-area-inset-bottom)";
    document.body.appendChild(div);
    const pb = parseFloat(getComputedStyle(div).paddingBottom || "0");
    setSafeBottom(pb);
    document.body.removeChild(div);
  }, []);

  // 스크롤 시 반투명/블러 토글
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="font-jua">
      {/* 상단 네비게이션 */}
      <header
        data-scrolled={scrolled ? "true" : "false"}
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
            {/* 좌측: 스토어명/로고 */}
            <div className="flex items-center">
              <a
                href={`/${storeSlug}`}
                className="inline-flex items-center gap-2 hover:opacity-90"
              >
                <span className="text-xl leading-none tracking-tight text-[#2D4739]">
                  {storeSlug ? `${storeSlug}` : "뜨락상회 스토어"}
                </span>
              </a>
            </div>

            {/* 데스크톱 메뉴 (Mainnavbar 스타일 매칭) */}
            <nav className="col-start-2 flex items-center w-full md:w-auto justify-between md:justify-start gap-0 md:gap-8">
              {DESKTOP_MENU.map((m) => {
                const active = isActivePath(m.href);
                return (
                  <a
                    key={m.href}
                    href={m.href}
                    className={[
                      "leading-none pb-1 text-[18px] transition-colors border-b-2",
                      active
                        ? "font-bold text-[#2D4739] border-transparent"
                        : "text-[#2D4739] hover:text-[#1b2e23] border-transparent hover:border-[#2D4739]",
                    ].join(" ")}
                  >
                    {m.label}
                  </a>
                );
              })}
            </nav>
          </div>

          {/* 모바일 상단 4-탭 */}
          <nav className="md:hidden flex h-12 items-center justify-between">
            {MOBILE_TOP_MENU.map((m) => {
              const active = isActivePath(m.href);
              return (
                <a
                  key={m.href}
                  href={m.href}
                  className={[
                    "flex-1 text-center text-[14px] py-2 leading-none border-b-2",
                    active
                      ? "font-bold text-[#2D4739] border-transparent"
                      : "text-[#2D4739] hover:text-[#1b2e23] border-transparent hover:border-[#2D4739]",
                  ].join(" ")}
                >
                  {m.label}
                </a>
              );
            })}
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
          <ul className="grid grid-cols-3 h-14">
            <li className="flex items-center justify-center">
              <HomeExpander storeSlug={storeSlug} />
            </li>
            <li className="flex items-center justify-center">
              <BottomItem href={base("/mypage/cart")} label="장바구니" Icon={ShoppingCart} />
            </li>
            <li className="flex items-center justify-center">
              <BottomItem href={base("/mypage")} label="마이페이지" Icon={User} />
            </li>
          </ul>
        </div>
      </nav>

      {/* 하단바 가려짐 방지 */}
      <div className="md:hidden h-14" style={{ marginBottom: safeBottom }} />
    </div>
  );
}

function HomeExpander({ storeSlug }: { storeSlug: string }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const storeBase = `/${storeSlug}`;

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="home-expander-panel"
        className={[
          "flex flex-col items-center justify-center gap-1 w-20 h-14",
          open ? "text-[#2D4739]" : "text-[#2D4739] opacity-90 hover:opacity-100",
          "active:scale-95 transition-transform",
        ].join(" ")}
      >
        <Home className="h-5 w-5" aria-hidden />
        <span className="text-[12px] leading-none">홈</span>
      </button>

      <div
        id="home-expander-panel"
        className={[
          "absolute top-1/2 -translate-y-1/2 left-full ml-2",
          "rounded-full bg-white/80 backdrop-blur px-2",
          "overflow-hidden shadow-sm border border-[#e5e7eb]",
          "transition-all duration-200",
          open ? "w-56 opacity-100" : "w-0 opacity-0 pointer-events-none",
        ].join(" ")}
        role="menu"
        aria-hidden={!open}
      >
        <div className="flex items-center gap-2 h-10">
          <a
            href="/main"
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
            <span>{storeSlug}</span>
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
}: {
  href: string;
  label: string;
  Icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
}) {
  const active = isActivePath(href);
  return (
    <a
      href={href}
      className={[
        "flex flex-col items-center justify-center gap-1 w-full h-full",
        active ? "text-[#2D4739]" : "text-[#2D4739] opacity-90 hover:opacity-100",
      ].join(" ")}
    >
      <Icon className="h-5 w-5" aria-hidden />
      <span className="text-[12px] leading-none">{label}</span>
    </a>
  );
}
