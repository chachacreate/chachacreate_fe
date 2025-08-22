// shared/areas/navigation/features/sidenavbar/MypageSidenavbar.tsx
import React from "react";
import { NavLink, useLocation, useNavigate, useParams } from "react-router-dom";
import {
  UserCog,
  ShoppingCart,
  Receipt,
  MessageSquareText,
  Star,
  CalendarCheck,
  ChevronLeft,
} from "lucide-react";

type MypageSidenavbarProps = {
  stickyOffsetPx?: number;
  marginTopClass?: string;
  /** (선택) 스토어 세그먼트 강제 지정. 없으면 URL :store → 기본 'main' */
  storeSegmentOverride?: string;
  children?: React.ReactNode;
};

export default function MypageSidenavbar({
  stickyOffsetPx = 80,
  marginTopClass = "mt-4",
  storeSegmentOverride,
  children,
}: MypageSidenavbarProps) {
  const { store } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const storeSegment = (storeSegmentOverride ?? store ?? "main").replace(
    /^\/+|\/+$/g,
    ""
  );
  const basePath = `/${storeSegment}/mypage`;

  // 아이템 정의
  const items = [
    { label: "마이정보수정", to: `${basePath}`, icon: UserCog },
    { label: "장바구니", to: `${basePath}/cart`, icon: ShoppingCart },
    { label: "주문내역", to: `${basePath}/orders`, icon: Receipt },
    { label: "문의 메시지", to: `${basePath}/message`, icon: MessageSquareText },
    { label: "작성 리뷰 확인", to: `${basePath}/myreview`, icon: Star },
    { label: "클래스 예약 조회", to: `${basePath}/class-reservations`, icon: CalendarCheck },
  ] as const;

  // 현재 경로가 루트인지 판단 (트레일링 슬래시 허용)
  const path = location.pathname.replace(/\/+$/, "");
  const rootPath = basePath.replace(/\/+$/, "");
  const isRoot = path === rootPath;

  // 현재 페이지 라벨 (탑바 타이틀)
  const activeItem =
    items.find((it) => path === it.to.replace(/\/+$/, "")) ??
    // orders 상세 등 하위 경로일 때 대응(contains)
    items.find((it) => path.startsWith(it.to)) ??
    items[0];

  const brand = "#2d4739";
  const active = "bg-[#2d4739]/10 text-[#2d4739] border-[#2d4739]";
  const idle = "bg-white text-gray-700 border-gray-200 hover:bg-gray-50";

  // 공통 컨테이너 (1920 기준 좌우 240px → 1440 영역)
  const Container: React.FC<React.PropsWithChildren> = ({ children }) => (
    <div className={`w-full ${marginTopClass}`}>
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8 2xl:px-0">
        {children}
      </div>
    </div>
  );

  return (
    <Container>
      {/* ===== 모바일 공통 탑바 (루트에도 노출, 루트에서는 <- 숨김) ===== */}
      <div className="md:hidden sticky top-0 z-30 w-full bg-white/95 backdrop-blur border-b border-gray-200">
        <div className="mx-auto max-w-[1440px] px-4 py-3">
          <div className="flex items-center gap-3">
            {/* 뒤로가기: 루트가 아닐 때만 */}
            {isRoot ? (
              <div className="w-6" />
            ) : (
              <button
                onClick={() => navigate(rootPath)}
                aria-label="뒤로가기"
                className="p-1 -ml-1 rounded-md active:scale-95"
              >
                <ChevronLeft className="w-6 h-6" style={{ color: brand }} />
              </button>
            )}

            <div className="flex-1 min-w-0">
              {/* <div className="text-xs text-gray-500 leading-none">{storeSegment}</div> //스토어, 메인 세그먼트 테스트용 코드 */}
              <div className="text-base font-semibold truncate" style={{ color: brand }}>
                {activeItem.label}
              </div>
            </div>

            <div className="w-6" />
          </div>
        </div>
      </div>

      {/* ===== 모바일: 루트에만 3열 아이콘 그리드 표시 ===== */}
      {isRoot && (
        <nav className="md:hidden mt-3">
          <ul className="grid grid-cols-3 gap-3 px-2">
            {items.map(({ to, label, icon: Icon }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  end
                  className={({ isActive }) =>
                    [
                      "flex flex-col items-center justify-center gap-2",
                      "rounded-2xl p-4 aspect-square text-center text-xs leading-tight border transition",
                      isActive ? active : idle,
                    ].join(" ")
                  }
                >
                  <Icon className="w-6 h-6 stroke-[1.6]" style={{ color: brand }} />
                  <span className="mt-1">{label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      )}

      {/* ===== 데스크톱: 좌측 사이드바 + 우측 콘텐츠 ===== */}
      <div className="hidden md:grid md:grid-cols-12 md:gap-8">
        <aside
          className="md:col-span-3 lg:col-span-2"
          style={{ position: "sticky", top: `${stickyOffsetPx}px` }}
        >
          <div className="rounded-2xl border border-gray-200 bg-white p-3">
            <ul className="space-y-1">
              {items.map(({ to, label }) => (
                <li key={to}>
                  <NavLink
                    to={to}
                    end
                    className={({ isActive }) =>
                      [
                        "block rounded-xl px-4 py-3 text-sm border transition",
                        isActive ? active : idle,
                      ].join(" ")
                    }
                  >
                    {label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        </aside>
        <section className="md:col-span-9 lg:col-span-10">{children}</section>
      </div>
    </Container>
  );
}
