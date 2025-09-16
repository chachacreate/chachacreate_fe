import React from 'react';
import { useLocation, useParams, Link } from 'react-router-dom';
import {
  UserCog,
  ShoppingCart,
  Receipt,
  MessageSquareText,
  Star,
  CalendarCheck,
} from 'lucide-react';

type MypageSidenavbarProps = {
  stickyOffsetPx?: number;
  marginTopClass?: string;
  /** (선택) 스토어 세그먼트 강제 지정. 없으면 URL :store → 기본 'main' */
  storeSegmentOverride?: string;
  children?: React.ReactNode;
};

export default function MypageSidenavbar({
  stickyOffsetPx = 80,
  marginTopClass = 'mt-4',
  storeSegmentOverride,
  children,
}: MypageSidenavbarProps) {
  const { store } = useParams();
  const location = useLocation();

  const storeSegment = (storeSegmentOverride ?? store ?? 'main').replace(/^\/+|\/+$/g, '');
  const basePath = `/${storeSegment}/mypage`;

  // 아이템 정의
  const items = [
    { label: '마이정보', to: `${basePath}`, icon: UserCog },
    { label: '장바구니', to: `${basePath}/cart`, icon: ShoppingCart },
    { label: '주문내역', to: `${basePath}/orders`, icon: Receipt },
    { label: '클래스 예약 조회', to: `${basePath}/classes`, icon: CalendarCheck },
    { label: '문의', to: `${basePath}/message`, icon: MessageSquareText },
    { label: '내 리뷰', to: `${basePath}/myreview`, icon: Star },
  ] as const;

  // 현재 경로가 루트인지 판단
  const path = location.pathname.replace(/\/+$/, '');
  const rootPath = basePath.replace(/\/+$/, '');
  const isRoot = path === rootPath;

  // 정확한 active 체크 함수
  const isActive = (itemPath: string): boolean => {
    const cleanItemPath = itemPath.replace(/\/+$/, '');
    const cleanCurrentPath = path.replace(/\/+$/, '');

    if (cleanItemPath === basePath.replace(/\/+$/, '')) {
      // 마이정보수정: 정확히 루트 경로이고 다른 하위 경로가 아닐 때만
      return cleanCurrentPath === cleanItemPath;
    }

    // 다른 메뉴들: 해당 경로로 시작하는 경우
    return cleanCurrentPath.startsWith(cleanItemPath);
  };

  // 공통 컨테이너
  const Container: React.FC<React.PropsWithChildren> = ({ children }) => (
    <div className={`w-full ${marginTopClass}`}>
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8 2xl:px-0">{children}</div>
    </div>
  );

  return (
    <Container>
      {/* ✅ 레이아웃 래퍼: lg 이상에서 가로 배치 */}
      <div className="lg:flex lg:items-start lg:gap-6">
        {/* 좌측 사이드바: 고정폭 + sticky */}
        <aside
          className="font-jua w-full lg:w-60 lg:sticky lg:top-0"
          style={{ top: stickyOffsetPx }} // ← props값 사용
        >
          {/* 📱 Mobile: 아이콘 그리드 */}
          <nav className="lg:hidden bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden mb-4">
            <div className="bg-white border-b px-5 py-4">
              <h2 className="text-lg font-bold text-brand-900">마이페이지</h2>
            </div>

            <ul className="grid grid-cols-3 sm:grid-cols-5 gap-2 p-4">
              {/* 마이정보수정 */}
              <li>
                <Link
                  to={isRoot ? '#myinfo' : `${basePath}#myinfo`}
                  className={`group flex flex-col items-center justify-center gap-2 rounded-xl border h-24 px-3 py-4 transition ${
                    isActive(basePath)
                      ? 'border-brand-900 text-brand-900'
                      : 'border-gray-200 text-gray-700 hover:border-brand-300 hover:bg-brand-100/50'
                  }`}
                  aria-current={isActive(basePath) ? 'page' : 'false'}
                >
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="8" r="3.25" stroke="currentColor" strokeWidth="1.6" />
                    <path
                      d="M5 20a7 7 0 0 1 14 0"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                    />
                  </svg>
                  <span className="text-xs w-full text-center whitespace-nowrap truncate">
                    마이정보
                  </span>
                </Link>
              </li>

              {/* 장바구니 */}
              <li>
                <Link
                  to={`${basePath}/cart`}
                  className={`group flex flex-col items-center justify-center gap-2 rounded-xl border h-24 px-3 py-4 transition ${
                    isActive(`${basePath}/cart`)
                      ? 'border-brand-900 text-brand-900'
                      : 'border-gray-200 text-gray-700 hover:border-brand-300 hover:bg-brand-100/50'
                  }`}
                  aria-current={isActive(`${basePath}/cart`) ? 'page' : 'false'}
                >
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M3 3h2l2 12h10l2-8H7"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <circle cx="9" cy="20" r="1.5" stroke="currentColor" strokeWidth="1.6" />
                    <circle cx="17" cy="20" r="1.5" stroke="currentColor" strokeWidth="1.6" />
                  </svg>
                  <span className="text-xs w-full text-center whitespace-nowrap truncate">
                    장바구니
                  </span>
                </Link>
              </li>

              {/* 주문내역 */}
              <li>
                <Link
                  to={`${basePath}/orders`}
                  className={`group flex flex-col items-center justify-center gap-2 rounded-xl border h-24 px-3 py-4 transition ${
                    isActive(`${basePath}/orders`)
                      ? 'border-brand-900 text-brand-900'
                      : 'border-gray-200 text-gray-700 hover:border-brand-300 hover:bg-brand-100/50'
                  }`}
                >
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M6 2h9l3 3v15a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z"
                      stroke="currentColor"
                      strokeWidth="1.6"
                    />
                    <path
                      d="M8 7h8M8 11h8M8 15h6"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                    />
                  </svg>
                  <span className="text-xs w-full text-center whitespace-nowrap truncate">
                    주문내역
                  </span>
                </Link>
              </li>

              {/* 클래스 예약 조회 */}
              <li>
                <Link
                  to={`${basePath}/classes`}
                  className={`group flex flex-col items-center justify-center gap-2 rounded-xl border h-24 px-3 py-4 transition ${
                    isActive(`${basePath}/classes`)
                      ? 'border-brand-900 text-brand-900'
                      : 'border-gray-200 text-gray-700 hover:border-brand-300 hover:bg-brand-100/50'
                  }`}
                  aria-current={isActive(`${basePath}/classes`) ? 'page' : 'false'}
                >
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M7 3v3M17 3v3M3 9h18"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                    />
                    <rect
                      x="3"
                      y="6"
                      width="18"
                      height="15"
                      rx="2"
                      stroke="currentColor"
                      strokeWidth="1.6"
                    />
                    <path
                      d="M9 15l2 2 4-4"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <span className="text-xs w-full text-center whitespace-nowrap truncate">
                    클래스 예약 조회
                  </span>
                </Link>
              </li>

              {/* 문의 메시지 */}
              <li>
                <Link
                  to={`${basePath}/message`}
                  className={`group flex flex-col items-center justify-center gap-2 rounded-xl border h-24 px-3 py-4 transition ${
                    isActive(`${basePath}/message`)
                      ? 'border-brand-900 text-brand-900'
                      : 'border-gray-200 text-gray-700 hover:border-brand-300 hover:bg-brand-100/50'
                  }`}
                >
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M3 6a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3H10l-5 4v-4H6a3 3 0 0 1-3-3V6z"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <span className="text-xs w-full text-center whitespace-nowrap truncate">
                    문의
                  </span>
                </Link>
              </li>

              {/* 작성 리뷰 확인 */}
              <li>
                <Link
                  to={`${basePath}/myreview`}
                  className={`group flex flex-col items-center justify-center gap-2 rounded-xl border h-24 px-3 py-4 transition ${
                    isActive(`${basePath}/myreview`)
                      ? 'border-brand-900 text-brand-900'
                      : 'border-gray-200 text-gray-700 hover:border-brand-300 hover:bg-brand-100/50'
                  }`}
                >
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none">
                    <path
                      d="m12 17 5.196 3.09-1.382-5.9L20 9.91l-6-.51L12 4l-2 5.4-6 .51 4.186 4.28-1.382 5.9z"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <span className="text-xs w-full text-center whitespace-nowrap truncate">
                    내 리뷰
                  </span>
                </Link>
              </li>
            </ul>
          </nav>

          {/* 🖥️ Desktop: 세로 리스트 */}
          <nav className="hidden lg:block bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="bg-white border-b px-6 py-4">
              <h2 className="text-lg font-bold text-brand-900">마이페이지</h2>
            </div>
            <ul className="p-4 space-y-2">
              <li>
                <Link
                  to={basePath}
                  className={`group flex items-center justify-between w-full px-4 py-3 rounded-xl transition ${
                    isActive(basePath)
                      ? 'bg-brand-900 text-white'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-brand-900'
                  }`}
                >
                  <span>마이정보수정</span>
                  <svg
                    className={`w-4 h-4 ${
                      isActive(basePath) ? 'text-white' : 'text-gray-400 group-hover:text-brand-900'
                    }`}
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M7.293 14.707a1 1 0 0 1 0-1.414L10.586 10 7.293 6.707a1 1 0 0 1 1.414-1.414l4 4a1 1 0 0 1 0 1.414l-4 4a1 1 0 0 1-1.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </Link>
              </li>

              <li>
                <Link
                  to={`${basePath}/cart`}
                  className={`group flex items-center justify-between w-full px-4 py-3 rounded-xl transition ${
                    isActive(`${basePath}/cart`)
                      ? 'bg-brand-900 text-white'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-brand-900'
                  }`}
                >
                  <span>장바구니</span>
                  <svg
                    className={`w-4 h-4 ${
                      isActive(`${basePath}/cart`)
                        ? 'text-white'
                        : 'text-gray-400 group-hover:text-brand-900'
                    }`}
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M7.293 14.707a1 1 0 0 1 0-1.414L10.586 10 7.293 6.707a1 1 0 0 1 1.414-1.414l4 4a1 1 0 0 1 0 1.414l-4 4a1 1 0 0 1-1.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </Link>
              </li>

              <li>
                <Link
                  to={`${basePath}/orders`}
                  className={`group flex items-center justify-between w-full px-4 py-3 rounded-xl transition ${
                    isActive(`${basePath}/orders`)
                      ? 'bg-brand-900 text-white'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-brand-900'
                  }`}
                >
                  <span>주문내역</span>
                  <svg
                    className={`w-4 h-4 ${
                      isActive(`${basePath}/orders`)
                        ? 'text-white'
                        : 'text-gray-400 group-hover:text-brand-900'
                    }`}
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M7.293 14.707a1 1 0 0 1 0-1.414L10.586 10 7.293 6.707a1 1 0 0 1 1.414-1.414l4 4a1 1 0 0 1 0 1.414l-4 4a1 1 0 0 1-1.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </Link>
              </li>

              {/* 클래스 예약 조회 */}
              <li>
                <Link
                  to={`${basePath}/classes`}
                  className={`group flex items-center justify-between w-full px-4 py-3 rounded-xl transition ${
                    isActive(`${basePath}/classes`)
                      ? 'bg-brand-900 text-white'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-brand-900'
                  }`}
                >
                  <span>클래스 예약 조회</span>
                  <svg
                    className={`w-4 h-4 ${
                      isActive(`${basePath}/classes`)
                        ? 'text-white'
                        : 'text-gray-400 group-hover:text-brand-900'
                    }`}
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M7.293 14.707a1 1 0 0 1 0-1.414L10.586 10 7.293 6.707a1 1 0 0 1 1.414-1.414l4 4a1 1 0 0 1 0 1.414l-4 4a1 1 0 0 1-1.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </Link>
              </li>

              <li>
                <Link
                  to={`${basePath}/message`}
                  className={`group flex items-center justify-between w-full px-4 py-3 rounded-xl transition ${
                    isActive(`${basePath}/message`)
                      ? 'bg-brand-900 text-white'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-brand-900'
                  }`}
                >
                  <span>문의 메시지</span>
                  <svg
                    className={`w-4 h-4 ${
                      isActive(`${basePath}/message`)
                        ? 'text-white'
                        : 'text-gray-400 group-hover:text-brand-900'
                    }`}
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M7.293 14.707a1 1 0 0 1 0-1.414L10.586 10 7.293 6.707a1 1 0 0 1 1.414-1.414l4 4a1 1 0 0 1 0 1.414l-4 4a1 1 0 0 1-1.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </Link>
              </li>

              <li>
                <Link
                  to={`${basePath}/myreview`}
                  className={`group flex items-center justify-between w-full px-4 py-3 rounded-xl transition ${
                    isActive(`${basePath}/myreview`)
                      ? 'bg-brand-900 text-white'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-brand-900'
                  }`}
                >
                  <span>작성 리뷰 확인</span>
                  <svg
                    className={`w-4 h-4 ${
                      isActive(`${basePath}/myreview`)
                        ? 'text-white'
                        : 'text-gray-400 group-hover:text-brand-900'
                    }`}
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M7.293 14.707a1 1 0 0 1 0-1.414L10.586 10 7.293 6.707a1 1 0 0 1 1.414-1.414l4 4a1 1 0 0 1 0 1.414l-4 4a1 1 0 0 1-1.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </Link>
              </li>
            </ul>
          </nav>
        </aside>

        {/* 우측 콘텐츠: flex-1 + min-w-0 (줄내림/넘침 방지), 간격 보정 */}
        <div className="flex-1 min-w-0 mt-6 lg:mt-0">{children}</div>
      </div>
    </Container>
  );
}
