import React from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Store, Info } from "lucide-react";

type Item = {
  label: string;
  to: string;
  /** 기본 탭에만 exact 활성화(end 매칭) */
  exact?: boolean;
  icon?: React.ReactNode;
};

type StoresSubnavbarProps = {
  items?: Item[];
  className?: string;
  sticky?: boolean;
  stickyOffsetPx?: number;
};

/**
 * StoresSubnavbar (underline active)
 * - /main/stores 진입 시 "스토어 목록"만 활성
 * - 중복 활성화 방지: 기본 탭에 end(exact) 매칭 적용
 * - 활성 스타일: 밑줄(border-b-2)만
 * - 1920 기준 좌우 240px → max-w-[1440px] 컨테이너
 */
export default function StoresSubnavbar({
  items = [
    {
      label: "스토어 목록",
      to: "/main/stores",
      exact: true,
      icon: <Store className="h-4 w-4" />,
    },
    {
      label: "스토어 개설 설명",
      to: "/main/stores/open-guide",
      icon: <Info className="h-4 w-4" />,
    },
  ],
  className = "",
  sticky = false,
  stickyOffsetPx = 0,
}: StoresSubnavbarProps) {
  const { pathname } = useLocation();

  return (
    <div
      className={[
        "w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/75",
        sticky ? "sticky z-30" : "",
        className,
      ].join(" ")}
      style={sticky ? { top: stickyOffsetPx } : undefined}
    >
      {/* 1920 기준 좌우 패딩 240px -> 중앙 컨테이너 max-w-[1440px] */}
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 md:px-8">
        <nav
          className="flex items-center gap-4 overflow-x-auto py-0"
          aria-label="Stores sub navigation"
        >
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              // 기본 탭에만 end 매칭으로 exact 활성화
              end={item.exact}
              className={({ isActive }) => {
                const active = item.exact ? pathname === item.to : isActive;
                return [
                  "group inline-flex items-center gap-2 px-1.5 py-2 text-sm font-medium whitespace-nowrap",
                  active ? "text-gray-900" : "text-gray-600 hover:text-gray-900",
                  "border-b-2",
                  active ? "border-gray-900" : "border-transparent hover:border-gray-300",
                  "transition-colors",
                ].join(" ");
              }}
            >
              {item.icon && <span className="shrink-0">{item.icon}</span>}
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}
