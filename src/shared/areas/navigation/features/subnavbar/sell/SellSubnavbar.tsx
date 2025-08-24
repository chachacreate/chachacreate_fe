import React from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Info, PackagePlus, ClipboardList, Wallet } from "lucide-react";

type Item = {
  label: string;
  to: string;
  exact?: boolean;
  icon?: React.ReactNode;
};

type SellSubnavbarProps = {
  items?: Item[];
  className?: string;
  sticky?: boolean;
  stickyOffsetPx?: number;
};

export default function SellSubnavbar({
  items = [
    { label: "개인 판매 설명", to: "/main/sell", exact: true, icon: <Info className="h-4 w-4" /> },
    { label: "개인 판매 상품 등록&관리", to: "/main/sell/manage", icon: <PackagePlus className="h-4 w-4" /> },
    { label: "개인 판매 상품 주문 관리", to: "/main/sell/orders", icon: <ClipboardList className="h-4 w-4" /> },
    { label: "개인 판매 상품 정산 관리", to: "/main/sell/settlement", icon: <Wallet className="h-4 w-4" /> },
  ],
  className = "",
  sticky = false,
  stickyOffsetPx = 0,
}: SellSubnavbarProps) {
  const { pathname } = useLocation();

  return (
    <div
      className={[
        "w-full bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/75",
        "border-b mt-0 -mt-px leading-none",
        className,
        sticky ? "sticky z-30" : "",
      ].join(" ")}
      style={sticky ? { top: stickyOffsetPx } : undefined}
    >
      {/* 1920 기준 좌우 패딩 240px → max-w-[1440px] */}
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 md:px-8">
        {/* 데스크톱: 가로 탭(밑줄), 줄어들면 자동 줄바꿈. 스크롤/화살표 없음 */}
        <nav
          className="hidden sm:flex flex-wrap items-center gap-x-4 gap-y-2 py-2"
          aria-label="Sell sub navigation — desktop"
        >
          {items.map((item) => {
            const active = item.exact ? pathname === item.to : pathname.startsWith(item.to);
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.exact}
                className={[
                  "group inline-flex items-center gap-2 px-1.5 py-2 text-sm font-medium whitespace-nowrap",
                  "border-b-2 transition-colors",
                  active
                    ? "border-gray-900 text-gray-900"
                    : "border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300",
                ].join(" ")}
              >
                {item.icon && <span className="shrink-0">{item.icon}</span>}
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* 모바일: 세로 리스트(아래로 배치). 활성: 왼쪽 보더 강조 */}
        {/* 모바일: 2x2 그리드 배치 */}
        <nav
          className="sm:hidden py-2"
          aria-label="Sell sub navigation — mobile"
        >
          <ul className="grid grid-cols-2 gap-2">
            {items.map((item) => {
              const active = item.exact ? pathname === item.to : pathname.startsWith(item.to);
              return (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.exact}
                    className={[
                      "flex items-center gap-2 py-3 px-3 text-[15px] font-medium rounded-md",
                      ,
                      active
                        ? "text-gray-900 border-gray-900 bg-gray-50"
                        : "text-gray-700 border-gray-200 hover:bg-gray-50 hover:text-gray-900",
                    ].join(" ")}
                  >
                    {item.icon && <span className="shrink-0">{item.icon}</span>}
                    <span className="leading-tight">{item.label}</span>
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </nav>

      </div>
    </div>
  );
}
