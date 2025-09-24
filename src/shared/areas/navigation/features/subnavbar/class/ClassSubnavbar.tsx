import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, Search, Calendar, UserRound } from 'lucide-react';
import { useEffect, useState } from 'react';

type ClassSubnavbarProps = {
  fixed?: boolean;
  className?: string;
  /** 오른쪽 고정으로 쓰고 싶으면 'right'로 변경 */
  align?: 'left' | 'right';
  activeSection?: 'home' | 'calendar' | 'search';
  setActiveSection: (section: 'home' | 'calendar' | 'search') => void;
};

export default function ClassSubnavbar({
  fixed = true,
  className = '',
  align = 'left',
  activeSection = 'home',
  setActiveSection,
}: ClassSubnavbarProps) {
  const navigate = useNavigate();
  const location = useLocation();

  // 현재 화면 크기 감지
  const [isMobile, setIsMobile] = useState(() => 
    typeof window !== 'undefined' ? window.matchMedia('(max-width: 1023px)').matches : false
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(max-width: 1023px)');
    const onChange = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    setIsMobile(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const isHomeActive = activeSection === 'home';
  const isCalendarActive = activeSection === 'calendar';
  const isSearchActive = activeSection === 'search';

  /** 현재 경로 확인 함수 */
  const isActivePath = (path: string) => {
    return location.pathname === path;
  };

  // Navigation handlers with improved mobile support
  const goHome = () => {
    setActiveSection('home');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goSearch = () => {
    setActiveSection('search');
    const searchElem = document.getElementById('search-section');
    if (searchElem) {
      const y = searchElem.getBoundingClientRect().top + window.scrollY - 10;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  const goCalendar = () => {
    setActiveSection('calendar');
    
    if (isMobile) {
      // 모바일: 캘린더 섹션으로 스크롤
      const calendarElem = document.getElementById('calendar');
      if (calendarElem) {
        const rect = calendarElem.getBoundingClientRect();
        const y = window.scrollY + rect.top - 80; // 헤더 높이 고려
        window.scrollTo({ top: y, behavior: 'smooth' });
      }
    } else {
      // 데스크톱: 기존 방식 (맨 위로 이동)
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // 색상/스타일 토큰
  const base = 'bg-white text-[#2D4739] shadow-[0_4px_10px_rgba(0,0,0,0.12)]';
  const active = '!bg-[#2D4739] !text-white shadow-[0_6px_14px_rgba(0,0,0,0.18)]';
  const hover = 'hover:bg-[#2D4739] hover:text-white';
  const pill =
    'relative flex items-center h-16 w-16 rounded-full transition-all duration-300 ease-out group-hover:w-56 group-hover:rounded-full';
  const label =
    'pointer-events-none opacity-0 translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 ease-out text-[15px] font-semibold tracking-wide ml-3';

  // 아이콘 색상을 상태별로 강제 (상속 의존 X)
  const iconCls = (on: boolean) =>
    on ? 'h-5 w-5 !text-white' : 'h-5 w-5 !text-[#2D4739] group-hover:!text-white';

  // 정렬(왼/오) 위치
  const sideClass =
    align === 'right'
      ? 'fixed right-6 top-1/2 -translate-y-1/2'
      : 'fixed left-12 top-1/2 -translate-y-1/2';

  const mypageActive =
    isActivePath('/main/mypage/classes') || isActivePath('/main/mypage/classreserve');

  return (
    <>
      {/* Desktop */}
      <nav
        className={['hidden md:flex flex-col gap-8 z-40', fixed ? sideClass : '', className].join(
          ' '
        )}
        aria-label="Class sub navigation — desktop"
      >
        {/* 홈 */}
        <div className="group">
          <button
            onClick={goHome}
            className={[pill, base, hover, isHomeActive ? active : ''].join(' ')}
          >
            <span className="grid place-items-center h-16 w-16 shrink-0">
              <Home className={iconCls(isHomeActive)} />
            </span>
            <span className={label}>홈</span>
          </button>
        </div>

        {/* 찾기 */}
        <div className="group">
          <button
            onClick={goSearch}
            className={[pill, base, hover, isSearchActive ? active : ''].join(' ')}
          >
            <span className="grid place-items-center h-16 w-16 shrink-0">
              <Search className={iconCls(isSearchActive)} />
            </span>
            <span className={label}>찾기</span>
          </button>
        </div>

        {/* 캘린더 */}
        <div className="group">
          <button
            type="button"
            onClick={goCalendar}
            className={[pill, base, hover, isCalendarActive ? active : ''].join(' ')}
          >
            <span className="grid place-items-center h-16 w-16 shrink-0">
              <Calendar className={iconCls(isCalendarActive)} />
            </span>
            <span className={label}>캘린더</span>
          </button>
        </div>

        {/* 마이페이지 */}
        <div className="group">
          <Link
            to="/main/mypage/classes"
            className={[pill, base, hover, mypageActive ? active : ''].join(' ')}
          >
            <span className="grid place-items-center h-16 w-16 shrink-0">
              <UserRound className={iconCls(mypageActive)} />
            </span>
            <span className={label}>마이페이지</span>
          </Link>
        </div>
      </nav>

      {/* Mobile: 가로 메뉴 */}
      <nav className="md:hidden w-full px-4 py-2" aria-label="Class sub navigation — mobile">
        <ul className="flex items-center justify-between w-full gap-1.5">
          <li>
            <button
              onClick={goHome}
              className={[
                'inline-flex items-center gap-1.5 rounded-xl px-2.5 py-2.5 text-[13px] font-medium transition-colors whitespace-nowrap',
                isHomeActive
                  ? 'bg-[#2D4739] text-white'
                  : 'bg-white text-[#2D4739] shadow-sm hover:bg-gray-50',
              ].join(' ')}
            >
              <Home className={iconCls(isHomeActive)} />
              <span>홈</span>
            </button>
          </li>

          <li>
            <button
              onClick={goSearch}
              className={[
                'inline-flex items-center gap-1.5 rounded-xl px-2.5 py-2.5 text-[13px] font-medium transition-colors whitespace-nowrap',
                isSearchActive
                  ? 'bg-[#2D4739] text-white'
                  : 'bg-white text-[#2D4739] shadow-sm hover:bg-gray-50',
              ].join(' ')}
            >
              <Search className={iconCls(isSearchActive)} />
              <span>찾기</span>
            </button>
          </li>

          <li>
            <button
              type="button"
              onClick={goCalendar}
              className={[
                'inline-flex items-center gap-1.5 rounded-xl px-2.5 py-2.5 text-[13px] font-medium transition-colors whitespace-nowrap',
                isCalendarActive
                  ? 'bg-[#2D4739] text-white'
                  : 'bg-white text-[#2D4739] shadow-sm hover:bg-gray-50',
              ].join(' ')}
            >
              <Calendar className={iconCls(isCalendarActive)} />
              <span>캘린더</span>
            </button>
          </li>

          <li>
            <Link
              to="/main/mypage/classes"
              className={[
                'inline-flex items-center gap-1.5 rounded-2xl px-2.5 py-2.5 text-[13px] font-medium transition-colors whitespace-nowrap',
                isActivePath('/main/mypage/classreserve')
                  ? 'bg-[#2D4739] text-white'
                  : 'bg-white text-[#2D4739] shadow-sm hover:bg-gray-50',
              ].join(' ')}
            >
              <UserRound className={iconCls(isActivePath('/main/mypage/classreserve'))} />
              <span>마이페이지</span>
            </Link>
          </li>
        </ul>
      </nav>
    </>
  );
}