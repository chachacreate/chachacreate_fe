// shared/areas/navigation/features/navbar/store/Storenavbar.tsx
import { NavLink, useParams, useLocation } from "react-router-dom";
import { useEffect, useState, useRef, useMemo } from "react";
import { Home, ShoppingCart, User, Store } from "lucide-react";

type MenuItem = { label: string; to: string };

export default function Storenavbar() {
  // ✅ :store 를 1순위로 사용, 옛날(:storeSlug)도 대비, 마지막으로 URL 1세그먼트 fallback
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
    { label: "전체상품", to: base("/products") },
    { label: "스토어정보", to: base("/info") },
    { label: "클래스", to: base("/classes") },
    { label: "공지/소식", to: base("/notices") },
    { label: "마이페이지", to: base("/mypage") },
    { label: "장바구니", to: base("/mypage/cart") },
    { label: "메인 홈 가기", to: "/main" },
  ];

  const MOBILE_TOP_MENU: MenuItem[] = [
    { label: "전체상품", to: base("/products") },
    { label: "스토어정보", to: base("/info") },
    { label: "클래스", to: base("/classes") },
    { label: "공지/소식", to: base("/notices") },
    { label: "메인 홈 가기", to: "/main" },
  ];

  const [safeBottom, setSafeBottom] = useState(0);
  useEffect(() => {
    const div = document.createElement("div");
    div.style.cssText =
      "position:fixed;bottom:0;height:0;padding-bottom:env(safe-area-inset-bottom)";
    document.body.appendChild(div);
    const pb = parseFloat(getComputedStyle(div).paddingBottom || "0");
    setSafeBottom(pb);
    document.body.removeChild(div);
  }, []);

  return (
    <>
      {/* 상단 네비게이션 */}
      <header className="sticky top-0 z-40 w-full border-b bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="mx-auto w-full max-w-[1920px] px-4 md:px-6 xl:px-20 2xl:px-[240px]">
          <div className="flex h-16 items-center justify-between">
            {/* 로고: 모바일 hidden */}
            <div className="items-center hidden md:flex">
              <NavLink to={base()} className="inline-flex items-center gap-2">
                <span className="text-xl font-bold tracking-tight">
                  {storeSlug ? `${storeSlug}` : "뜨락상회 스토어"}
                </span>
              </NavLink>
            </div>

            {/* 데스크톱 메뉴 */}
            <nav className="hidden md:flex items-center gap-6">
              {DESKTOP_MENU.map((m) => (
                <NavLink
                  key={m.to}
                  to={m.to}
                  className={({ isActive }) =>
                    [
                      "text-sm transition-colors",
                      isActive
                        ? "font-semibold text-gray-900"
                        : "text-gray-600 hover:text-gray-900",
                    ].join(" ")
                  }
                >
                  {m.label}
                </NavLink>
              ))}
            </nav>
          </div>

          {/* 모바일 상단 탭 */}
          <nav className="md:hidden flex h-11 items-center justify-between">
            {MOBILE_TOP_MENU.map((m) => (
              <NavLink
                key={m.to}
                to={m.to}
                className={({ isActive }) =>
                  [
                    "flex-1 text-center text-[13px] py-2",
                    isActive
                      ? "font-semibold text-gray-900"
                      : "text-gray-600 hover:text-gray-900",
                  ].join(" ")
                }
              >
                {m.label}
              </NavLink>
            ))}
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
          <ul className="grid grid-cols-3 h-14 relative">
            <li className="relative flex items-center justify-center">
              <HomeExpander storeSlug={storeSlug} />
            </li>
            <li className="flex items-center justify-center">
              <BottomItem to={base("/mypage/cart")} label="장바구니" Icon={ShoppingCart} />
            </li>
            <li className="flex items-center justify-center">
              <BottomItem to={base("/mypage")} label="마이페이지" Icon={User} />
            </li>
          </ul>
        </div>
      </nav>

      {/* 하단바 가려짐 방지 */}
      <div className="md:hidden h-14" style={{ marginBottom: safeBottom }} />
    </>
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
          open ? "text-gray-900" : "text-gray-700",
          "active:scale-95 transition-transform",
        ].join(" ")}
      >
        <Home className="h-5 w-5" aria-hidden />
        <span className="text-[11px]">홈</span>
      </button>

      <div
        id="home-expander-panel"
        className={[
          "absolute top-1/2 -translate-y-1/2 left-full ml-2",
          "rounded-full bg-gray-300/60 backdrop-blur px-2",
          "overflow-hidden shadow-sm border border-gray-200",
          "transition-all duration-200",
          open ? "w-56 opacity-100" : "w-0 opacity-0 pointer-events-none",
        ].join(" ")}
        role="menu"
        aria-hidden={!open}
      >
        <div className="flex items-center gap-2 h-10">
          <NavLink
            to="/main"
            className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/90 text-gray-900 text-sm font-medium hover:bg-white"
            onClick={() => setOpen(false)}
            role="menuitem"
          >
            <Home className="h-4 w-4" />
            <span>뜨락상회</span>
          </NavLink>

          <NavLink
            to={storeBase}
            className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/90 text-gray-900 text-sm font-medium hover:bg-white"
            onClick={() => setOpen(false)}
            role="menuitem"
          >
            <Store className="h-4 w-4" />
            <span>{storeSlug}</span>
          </NavLink>
        </div>
      </div>
    </div>
  );
}

function BottomItem({
  to,
  label,
  Icon,
}: {
  to: string;
  label: string;
  Icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
}) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        [
          "flex flex-col items-center justify-center gap-1 w-full h-full",
          isActive ? "text-gray-900" : "text-gray-600",
        ].join(" ")
      }
    >
      <Icon className="h-5 w-5" aria-hidden />
      <span className="text-[11px]">{label}</span>
    </NavLink>
  );
}
