// shared/areas/navigaiton/features/subnavbar/class/ClassSubnavbar.tsx
import React from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { Home, Search, Calendar, UserRound } from "lucide-react";

type ClassSubnavbarProps = {
  fixed?: boolean;
  className?: string;
};

export default function ClassSubnavbar({
  fixed = true,
  className = "",
}: ClassSubnavbarProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const params = new URLSearchParams(location.search);
  const isCalendarActive = params.get("view") === "calendar";

  // 커스텀 active 조건
  const isHomeActive =
    location.pathname === "/main/classes" &&
    location.hash === "" &&
    !isCalendarActive;

  const isSearchActive =
    location.pathname === "/main/classes" && location.hash === "#search";

  const goCalendar = () => {
  const p = new URLSearchParams(); // ← 새로 생성해서 기존 쿼리/해시 싹 비움
  p.set("view", "calendar");

  // 해시 없이 ?view=calendar 로만 이동
  navigate(`${location.pathname}?${p.toString()}`, { replace: false });

  // (선택) 모달 트리거 이벤트
  window.dispatchEvent(new CustomEvent("open-calendar-view"));
};

  // 공통 스타일
  const base = "bg-white text-gray-900 shadow-[0_4px_10px_rgba(0,0,0,0.12)]";
  const active =
    "bg-[#2D4739] text-white shadow-[0_6px_14px_rgba(0,0,0,0.18)]";
  const pill =
    "relative flex items-center h-16 w-16 rounded-full transition-all duration-300 ease-out group-hover:w-56 group-hover:rounded-full";
  const label =
    "pointer-events-none opacity-0 translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 ease-out text-[15px] font-semibold tracking-wide";

  return (
    <>
      {/* Desktop */}
      <nav
        className={[
          "hidden md:flex flex-col gap-8 z-40",
          fixed ? "fixed left-6 top-1/2 -translate-y-1/2" : "",
          className,
        ].join(" ")}
        aria-label="Class sub navigation — desktop"
      >
        {/* 홈 */}
        <div className="group">
          <Link
            to="/main/classes"
            className={[pill, base, isHomeActive ? active : "hover:bg-[#2D4739] hover:text-white"].join(" ")}
          >
            <span className="grid place-items-center h-16 w-16 shrink-0">
              <Home className="h-5 w-5" />
            </span>
            <span className={label}>홈</span>
          </Link>
        </div>

        {/* 찾기 (해시로 섹션 이동) */}
        <div className="group">
          <Link
            to="/main/classes#search"
            className={[pill, base, isSearchActive ? active : "hover:bg-[#2D4739] hover:text-white"].join(" ")}
          >
            <span className="grid place-items-center h-16 w-16 shrink-0">
              <Search className="h-5 w-5" />
            </span>
            <span className={label}>찾기</span>
          </Link>
        </div>

        {/* 캘린더 (쿼리 파라미터로 모달 트리거) */}
        <div className="group">
          <button
            type="button"
            onClick={goCalendar}
            className={[pill, base, isCalendarActive ? active : "hover:bg-[#2D4739] hover:text-white"].join(" ")}
          >
            <span className="grid place-items-center h-16 w-16 shrink-0">
              <Calendar className="h-5 w-5" />
            </span>
            <span className={label}>캘린더</span>
          </button>
        </div>

        {/* 마이페이지 (경로 다르므로 NavLink 기본 active 사용) */}
        <div className="group">
          <NavLink
            to="/main/mypage/classreserve"
            end
            className={({ isActive }) =>
              [pill, base, isActive ? active : "hover:bg-[#2D4739] hover:text-white"].join(" ")
            }
          >
            <span className="grid place-items-center h-16 w-16 shrink-0">
              <UserRound className="h-5 w-5" />
            </span>
            <span className={label}>마이페이지</span>
          </NavLink>
        </div>
      </nav>

      
    {/* Mobile: 가로 메뉴 */}
        <nav
        className="md:hidden w-full px-4 py-2"
        aria-label="Class sub navigation — mobile"
        >
        <ul className="flex items-center justify-between w-full gap-1.5">
            <li>
            <Link
                to="/main/classes"
                className={[
                "inline-flex items-center gap-1.5 rounded-2xl px-2.5 py-2.5",
                "text-[13px] font-medium transition-colors whitespace-nowrap",
                isHomeActive
                    ? "bg-[#2D4739] text-white"
                    : "bg-white text-gray-800 shadow-sm hover:bg-gray-50",
                ].join(" ")}
            >
                <Home className="h-4 w-4" />
                <span>홈</span>
            </Link>
            </li>

            <li>
            <Link
                to="/main/classes#search"
                className={[
                "inline-flex items-center gap-1.5 rounded-2xl px-2.5 py-2.5",
                "text-[13px] font-medium transition-colors whitespace-nowrap",
                isSearchActive
                    ? "bg-[#2D4739] text-white"
                    : "bg-white text-gray-800 shadow-sm hover:bg-gray-50",
                ].join(" ")}
            >
                <Search className="h-4 w-4" />
                <span>찾기</span>
            </Link>
            </li>

            <li>
            <button
                type="button"
                onClick={goCalendar}
                className={[
                "inline-flex items-center gap-1.5 rounded-2xl px-2.5 py-2.5",
                "text-[13px] font-medium transition-colors whitespace-nowrap",
                isCalendarActive
                    ? "bg-[#2D4739] text-white"
                    : "bg-white text-gray-800 shadow-sm hover:bg-gray-50",
                ].join(" ")}
            >
                <Calendar className="h-4 w-4" />
                <span>캘린더</span>
            </button>
            </li>

            <li>
            <NavLink
                to="/main/mypage/classreserve"
                end
                className={({ isActive }) =>
                [
                    "inline-flex items-center gap-1.5 rounded-2xl px-2.5 py-2.5",
                    "text-[13px] font-medium transition-colors whitespace-nowrap",
                    isActive
                    ? "bg-[#2D4739] text-white"
                    : "bg-white text-gray-800 shadow-sm hover:bg-gray-50",
                ].join(" ")
                }
            >
                <UserRound className="h-4 w-4" />
                <span>마이페이지</span>
            </NavLink>
            </li>
        </ul>
        </nav>


    </>
  );
}
