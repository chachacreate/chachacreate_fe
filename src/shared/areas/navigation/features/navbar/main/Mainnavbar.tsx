// shared/areas/navigation/features/navbar/main/Mainnavbar.tsx
import { NavLink } from "react-router-dom";
import { useEffect, useState } from "react";
import { Home, ShoppingCart, User } from "lucide-react";

type MenuItem = {
  label: string;
  to: string;
};

const DESKTOP_MENU: MenuItem[] = [
  { label: "전체상품", to: "/main/products" },
  { label: "스토어", to: "/main/stores" },
  { label: "개인판매", to: "/main/personal" },
  { label: "클래스", to: "/main/classes" },
  { label: "마이페이지", to: "/main/mypage" },
  { label: "장바구니", to: "/main/mypage/cart" },
];

const MOBILE_TOP_MENU: MenuItem[] = [
  { label: "전체상품", to: "/main/products" },
  { label: "스토어", to: "/main/stores" },
  { label: "개인판매", to: "/main/personal" },
  { label: "클래스", to: "/main/classes" },
];

export default function Mainnavbar() {
  // iOS safe-area 대응(하단 바)
  const [safeBottom, setSafeBottom] = useState(0);
  useEffect(() => {
    const div = document.createElement("div");
    div.style.cssText = "position:fixed;bottom:0;height:0;padding-bottom:env(safe-area-inset-bottom)";
    document.body.appendChild(div);
    const pb = parseFloat(getComputedStyle(div).paddingBottom || "0");
    setSafeBottom(pb);
    document.body.removeChild(div);
  }, []);

  return (
    <>
      {/* 상단 네비게이션 (모든 페이지 공통 포함) */}
      <header className="sticky top-0 z-40 w-full border-b bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div
          className="
            mx-auto w-full max-w-[1920px]
            px-4 md:px-6 xl:px-20 2xl:px-[240px]
          "
        >
          {/* 데스크톱: 로고 + 메뉴 */}
          <div className="hidden md:flex h-16 items-center justify-between">
            {/* 로고 (좌측 고정) */}
            <div className="flex items-center">
              <NavLink to="/" className="inline-flex items-center gap-2">
                {/* 로고 이미지가 있다면 <img .../> 로 교체 */}
                <span className="text-xl font-bold tracking-tight">
                  뜨락상회
                </span>
              </NavLink>
            </div>

            {/* 데스크톱 메뉴 (우측 정렬) */}
            <nav className="flex items-center gap-6">
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

          {/* 모바일 상단 4-탭 (스크롤 없이 한 줄) */}
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

      {/* 모바일 하단 고정 네비 (푸터 아님) */}
      <nav
        className="md:hidden fixed left-1/2 bottom-0 z-50 w-full -translate-x-1/2 border-t bg-white"
        style={{ paddingBottom: safeBottom }}
        aria-label="모바일 하단 내비게이션"
      >
        <div
          className="
            mx-auto w-full max-w-[1920px]
            px-4
          "
        >
          <ul className="grid grid-cols-3 h-14">
            <li className="flex items-center justify-center">
              <BottomItem to="/main" label="홈" Icon={Home} />
            </li>
            <li className="flex items-center justify-center">
              <BottomItem to="/main/mypage/cart" label="장바구니" Icon={ShoppingCart} />
            </li>
            <li className="flex items-center justify-center">
              <BottomItem to="/main/mypage" label="마이페이지" Icon={User} />
            </li>
          </ul>
        </div>
      </nav>
    </>
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
      <Icon className="h-5 w-5" aria-hidden="true" />
      <span className="text-[11px]">{label}</span>
    </NavLink>
  );
}