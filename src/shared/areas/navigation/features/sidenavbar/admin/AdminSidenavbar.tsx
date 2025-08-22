// shared/areas/navigation/features/sidenavbar/admin/AdminSidenavbar.tsx
import React, { useEffect, useMemo, useState } from "react";
import { NavLink } from "react-router-dom";
import {
  Home,
  ChevronDown,
  Wallet,
  Store,
  UserCog,
  GraduationCap,
  ClipboardList,
  Ban,
  MessageSquareText,
  ShieldAlert,
  Users,
  FileText,
  Package,
  NotebookPen,
  CalendarX2,
  CalendarX,
} from "lucide-react";

type AdminSidenavbarProps = {
  /** 헤더 높이 보정(top sticky) */
  stickyOffsetPx?: number;
  /** 우측 콘텐츠 (선택) */
  children?: React.ReactNode;
  /** 임시 관리자 로고 URL */
  adminLogoUrl?: string;
  /** 관리자 표기 이름(기본: 'Admin') */
  adminName?: string;
};

export default function AdminSidenavbar({
  stickyOffsetPx = 0,
  children,
  adminLogoUrl,
  adminName = "Admin",
}: AdminSidenavbarProps) {
  const base = `/admin`;

  /** 모바일 전용 확장 토글 (>> / <<) */
  const [expanded, setExpanded] = useState(false);

  /** 섹션(아코디언) 펼침 상태 저장 */
  const [openMap, setOpenMap] = useState<Record<string, boolean>>(() => {
    try {
      const raw = localStorage.getItem("admin-sidenav-open");
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });
  useEffect(() => {
    localStorage.setItem("admin-sidenav-open", JSON.stringify(openMap));
  }, [openMap]);

  /** 모바일에서 메뉴 클릭 시 자동 접힘 */
  const handleNavClick = () => {
    if (window.innerWidth < 1024) setExpanded(false);
  };

  const sections = useMemo(
    () => [
      {
        key: "home",
        label: `관리자 메인 홈`,
        type: "link" as const,
        to: `${base}/main`,
        icon: Home,
      },
      {
        key: "settlement-by-seller",
        label: "판매자별 정산 관리",
        icon: Wallet,
        items: [
          { label: "스토어 판매자 정산 관리", to: `${base}/settlement/store`, icon: Store },
          { label: "개인 판매자 정산 관리", to: `${base}/settlement/personal`, icon: UserCog },
        ],
      },
      {
        key: "reports",
        label: "신고 관리",
        icon: ShieldAlert,
        to: `${base}/reports`,
        type: "link" as const,
      },
      {
        key: "store",
        label: "스토어 관리",
        icon: Store,
        to: `${base}/stores`,
        type: "link" as const,
      },
      {
        key: "users",
        label: "회원 관리",
        icon: Users,
        to: `${base}/users`,
        type: "link" as const,
      },
      {
        key: "classes",
        label: "클래스 관리",
        icon: GraduationCap,
        to: `${base}/classes`,
        type: "link" as const,
      },
      {
        key: "resumes",
        label: "이력서 관리",
        icon: FileText,
        to: `${base}/resumes`,
        type: "link" as const,
      },
      {
        key: "cancellations",
        label: "취소 관리",
        icon: Ban,
        items: [
          { label: "클래스", to: `${base}/cancellations/classes`, icon: CalendarX },
          { label: "상품", to: `${base}/cancellations/products`, icon: Package },
        ],
      },
      {
        key: "messages",
        label: "메시지 관리",
        icon: MessageSquareText,
        to: `${base}/messages`,
        type: "link" as const,
      },
    ],
    [base]
  );

  const toggleSection = (key: string) =>
    setOpenMap((prev) => ({ ...prev, [key]: !prev[key] }));

  const linkBase =
    "flex items-center gap-3 rounded-lg px-3 py-2 transition-colors";
  const linkInactive =
    "text-gray-600 hover:bg-gray-100 hover:text-gray-900";
  const linkActive = "bg-gray-900 text-white hover:bg-gray-900";
  const labelClass = "text-sm font-medium truncate";

  // 플레이스홀더 로고 (연회색 박스에 ADMIN)
  const logoSrc =
    adminLogoUrl ||
    "data:image/svg+xml;utf8," +
      encodeURIComponent(
        `<svg xmlns='http://www.w3.org/2000/svg' width='64' height='64'>
          <rect width='100%' height='100%' rx='12' ry='12' fill='%23e5e7eb'/>
          <text x='50%' y='52%' dominant-baseline='middle' text-anchor='middle' font-size='16' fill='%239ca3af'>ADMIN</text>
        </svg>`
      );

  return (
    <div className="w-full">
      {/* 모바일은 왼쪽 패딩 0, md↑ 부터 패딩 적용 */}
      <div className="mx-auto w-full max-w-[1920px] px-0 md:px-[48px] xl:px-[240px]">
        <div className="mx-auto w-full max-w-[1440px]">
          <div
            className="grid grid-cols-[auto,1fr] gap-6"
            style={{ position: "relative" }}
          >
            {/* 사이드바 */}
            <aside className="sticky" style={{ top: stickyOffsetPx }}>
              <nav
                className={[
                  "rounded-2xl border bg-white shadow-sm",
                  "transition-all duration-200 ease-in-out overflow-hidden",
                  // 모바일: 64 ↔ 260, 데스크톱: 280 고정
                  expanded ? "w-[260px]" : "w-[64px]",
                  "lg:w-[280px]",
                ].join(" ")}
                aria-label="Admin sidenav"
              >
                {/* ===== 헤더: 로고 + 관리자명, 화살표(모바일만) ===== */}
                <div className="border-b px-3 py-3">
                  <div className="flex items-center gap-2 min-w-0">
                    {/* 로고: 모바일 h-5 w-5, 웹 lg:h-7 w-7 */}
                    <img
                      src={logoSrc}
                      alt="admin logo"
                      className="h-5 w-5 lg:h-7 lg:w-7 rounded-md object-cover"
                    />
                    {/* 관리자명: 모바일 expanded일 때만, 웹 항상 */}
                    <div
                      className={[
                        expanded ? "block" : "hidden",
                        "lg:block",
                        "min-w-0",
                      ].join(" ")}
                    >
                      <span className="block text-sm font-semibold text-gray-900 truncate">
                        {adminName}
                      </span>
                    </div>
                  </div>

                  {/* 화살표 토글: 모바일만 노출 */}
                  <div className="mt-2 lg:hidden">
                    <button
                      type="button"
                      aria-label="사이드바 토글"
                      aria-pressed={expanded}
                      onClick={() => setExpanded((v) => !v)}
                      className="inline-flex items-center justify-center w-full rounded-md border px-2 py-1 text-sm"
                      title="toggle"
                    >
                      <span className="leading-none">
                        {expanded ? "<<" : ">>"}
                      </span>
                    </button>
                  </div>
                </div>
                {/* ===== /헤더 ===== */}

                {/* 메뉴 목록 */}
                <ul className="p-2">
                  {sections.map((sec) => {
                    const isLink = (sec as any).type === "link";
                    if (isLink) {
                      const Icon = (sec as any).icon || Home;
                      return (
                        <li key={sec.key} className="mb-1">
                          <NavLink
                            to={(sec as any).to}
                            onClick={handleNavClick}
                            className={({ isActive }) =>
                              [
                                linkBase,
                                isActive ? linkActive : linkInactive,
                              ].join(" ")
                            }
                          >
                            <Icon className="h-5 w-5 shrink-0" />
                            <span
                              className={[
                                labelClass,
                                expanded ? "block" : "hidden",
                                "lg:block",
                              ].join(" ")}
                            >
                              {sec.label}
                            </span>
                          </NavLink>
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
                            "w-full justify-between",
                            "text-gray-700 hover:bg-gray-100",
                          ].join(" ")}
                        >
                          <div className="flex items-center gap-3">
                            {sec.icon && (
                              <sec.icon className="h-5 w-5 shrink-0" />
                            )}
                            <span
                              className={[
                                labelClass,
                                expanded ? "block" : "hidden",
                                "lg:block",
                              ].join(" ")}
                            >
                              {sec.label}
                            </span>
                          </div>
                          <ChevronDown
                            className={[
                              "h-4 w-4 transition-transform",
                              isOpen ? "rotate-180" : "",
                              expanded ? "block" : "hidden",
                              "lg:block",
                            ].join(" ")}
                          />
                        </button>

                        {/* 드롭다운 */}
                        <div
                          className={[
                            "overflow-hidden transition-all",
                            isOpen
                              ? "max-h-[480px] opacity-100"
                              : "max-h-0 opacity-0",
                            expanded ? "pl-2" : "pl-0",
                            "lg:pl-2",
                          ].join(" ")}
                          aria-hidden={!isOpen}
                        >
                          <ul className="mt-1 mb-2">
                            {sec.items?.map((item, idx) => {
                              const ItemIcon = item.icon ?? ClipboardList;
                              return (
                                <li key={idx}>
                                  <NavLink
                                    to={item.to}
                                    onClick={handleNavClick}
                                    className={({ isActive }) =>
                                      [
                                        "ml-2",
                                        linkBase,
                                        isActive ? linkActive : linkInactive,
                                      ].join(" ")
                                    }
                                  >
                                    <ItemIcon className="h-4 w-4 shrink-0" />
                                    <span
                                      className={[
                                        "text-sm",
                                        expanded ? "block" : "hidden",
                                        "lg:block",
                                      ].join(" ")}
                                    >
                                      {item.label}
                                    </span>
                                  </NavLink>
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
