// src/domains/main/areas/home/features/main-landing/MainClassesPage.tsx

import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';

import Header from '@src/shared/areas/layout/features/header/Header';
import Mainnavbar from '@src/shared/areas/navigation/features/navbar/main/Mainnavbar';
import ClassSubnavbar from '@src/shared/areas/navigation/features/subnavbar/class/ClassSubnavbar';
import Searchbar from '@src/shared/areas/navigation/features/searchbar/Searchbar';
import classVideo from '@src/domains/main/areas/home/features/main-landing/assets/class6.mp4';
import { get } from '@src/libs/request';

/** ====== 타입 ====== */
type ServerClassItem = {
  id: number;
  title: string;
  thumbnailUrl?: string;
  storeName: string;
  addressRoad: string;
  price: number;
  remainSeat: number;
  startDate: string;
  endDate: string;
};

type ClassItem = {
  id: number;
  title: string;
  storeName: string;
  price: number;
  thumbnail: string;
  addressRoad: string;
  remainSeat: number;
  startDate: string;
  endDate: string;
};

type ClassListPage = {
  content: ServerClassItem[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
};

/** 정렬 키 */
type SortKey = 'latest' | 'closing' | 'priceAsc' | 'priceDesc';

const SORT_MAP: Record<SortKey, string> = {
  latest: 'latest',
  closing: 'end_date',
  priceAsc: 'price_low',
  priceDesc: 'price_high',
};

const PAGE_SIZE = 16;

const PLACEHOLDER =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='240' height='160'>
      <rect width='100%' height='100%' fill='%23f3f4f6'/>
      <text x='50%' y='52%' dominant-baseline='middle' text-anchor='middle' font-size='14' fill='%239ca3af'>NO IMAGE</text>
    </svg>`
  );

const todayKST = () =>
  new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date()); // 예: 2025-09-26

function unwrapData<T>(response: any): T {
  const body = response?.data ?? response;
  if (body && typeof body === 'object' && 'data' in body) return body.data as T;
  return body as T;
}

/** ====== 페이지 컴포넌트 ====== */
export default function MainClassesPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(location.search);
  const view = params.get('view');

  // 브레이크포인트 상태 (SSR 안전)
  const [isDesktop, setIsDesktop] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.matchMedia('(min-width: 1024px)').matches : false
  );
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(min-width: 1024px)');
    const onChange = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    setIsDesktop(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  // 데이터 상태
  const [items, setItems] = useState<ClassItem[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  // 검색/정렬/페이지 상태
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState<SortKey>('latest');
  const [keyword, setKeyword] = useState('');

  // 마지막 사용자 액션 추적
  const lastActionRef = useRef<'pagination' | 'sort' | 'search' | null>(null);
  const fromSortRef = useRef(false);

  // 섹션 제어
  const [activeSection, setActiveSection] = useState<'home' | 'calendar' | 'search'>('home');

  // refs
  const heroSectionRef = useRef<HTMLDivElement | null>(null); // 전체 히어로+캘린더 래퍼
  const homePanelRef = useRef<HTMLDivElement | null>(null); // 히어로 패널(모바일 관찰용)
  const calendarSectionRef = useRef<HTMLDivElement | null>(null); // 캘린더 패널
  const searchSectionRef = useRef<HTMLDivElement | null>(null); // 검색 섹션

  // Searchbar 제어용
  const searchbarWrapRef = useRef<HTMLDivElement | null>(null);
  const [searchbarKey, setSearchbarKey] = useState(0);

  const scrollToAnchor = (id: string, offset = 80) => {
    const el = document.getElementById(id);
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const top = window.scrollY + rect.top - offset;
    window.scrollTo({ top, behavior: 'smooth' });
  };

  /** 클래스 목록 조회 */
  const fetchClasses = async (opts?: { page?: number; sortKey?: SortKey; keyword?: string }) => {
    try {
      setIsLoading(true);
      const pg = opts?.page ?? page;
      const sk = opts?.sortKey ?? sortKey;
      const kw = (opts?.keyword ?? keyword).trim();

      const res = await get('/main/classes', {
        page: pg - 1,
        size: PAGE_SIZE,
        sort: SORT_MAP[sk],
        keyword: kw || undefined,
      });

      const data = unwrapData<ClassListPage>(res);
      const mapped = (data?.content ?? []).map((cls) => ({
        id: cls.id,
        title: cls.title,
        storeName: cls.storeName,
        price: cls.price,
        thumbnail: cls.thumbnailUrl || PLACEHOLDER,
        addressRoad: (cls.addressRoad ?? '').split(' ').slice(0, 2).join(' '),
        remainSeat: cls.remainSeat,
        startDate: (cls.startDate ?? '').slice(0, 10),
        endDate: (cls.endDate ?? '').slice(0, 10),
      }));

      const today = todayKST();
      const visible = mapped.filter((c) => !c.endDate || c.endDate >= today);
      // 🔼🔼 추가 끝

      setItems(visible);
      setTotalPages(Math.max(1, data?.totalPages ?? 1)); // 서버 페이지 수는 그대로 유지
    } catch (e) {
      console.error('❌ 클래스 목록 조회 실패:', e);
      setItems([]);
      setTotalPages(1);
    } finally {
      setIsLoading(false);
    }
  };

  // 초기 + page/sort/keyword 변경 시 조회
  useEffect(() => {
    fetchClasses({ page, sortKey, keyword });
  }, [page, sortKey, keyword]);

  // URL 파라미터/해시 → 섹션 동기화
  useEffect(() => {
    if (location.hash === '#search') {
      setActiveSection('search');
    } else if (view === 'calendar') {
      setActiveSection('calendar');
    } else {
      setActiveSection('home');
    }
  }, [location.hash, view]);

  /** 스크롤 위치 감지
   * - 데스크톱: 기존 방식 유지 (히어로/캘린더 가로 슬라이드 레이아웃)
   * - 모바일: IntersectionObserver로 home/calendar/search 가시성 따라 activeSection 갱신
   */
  // 데스크톱 스크롤 감지
  useEffect(() => {
    if (!isDesktop) return;

    const handleScroll = () => {
      const hero = heroSectionRef.current;
      const search = searchSectionRef.current;
      if (!hero || !search) return;

      const scrollY = window.scrollY;
      const heroH = hero.offsetHeight;
      const searchTop = search.offsetTop;

      if (scrollY < heroH * 0.3) {
        if (view === 'calendar') {
          if (activeSection !== 'calendar') setActiveSection('calendar');
        } else {
          if (activeSection !== 'home') setActiveSection('home');
        }
      } else if (scrollY >= searchTop - 200) {
        if (activeSection !== 'search') setActiveSection('search');
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isDesktop, view, activeSection]);

  // 모바일 스크롤 감지 (네브바 미변경 오류 해결)
  useEffect(() => {
    if (isDesktop) return;

    const obsTargets: Array<{ el: Element | null; key: 'home' | 'calendar' | 'search' }> = [
      { el: homePanelRef.current, key: 'home' },
      { el: calendarSectionRef.current, key: 'calendar' },
      { el: searchSectionRef.current, key: 'search' },
    ];

    const observer = new IntersectionObserver(
      (entries) => {
        // 가장 크게 보이는 섹션을 active로
        const vis = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (!vis) return;

        if (vis.target === searchSectionRef.current && activeSection !== 'search') {
          setActiveSection('search');
        } else if (vis.target === calendarSectionRef.current && activeSection !== 'calendar') {
          setActiveSection('calendar');
        } else if (vis.target === homePanelRef.current && activeSection !== 'home') {
          setActiveSection('home');
        }
      },
      {
        // 화면의 중앙 근처를 기준으로 감지 (헤더 고정 보정 위해 bottom에 마진)
        root: null,
        rootMargin: '-20% 0px -40% 0px',
        threshold: [0.25, 0.5, 0.75],
      }
    );

    obsTargets.forEach(({ el }) => el && observer.observe(el));
    return () => observer.disconnect();
  }, [isDesktop, activeSection]);

  // URL 업데이트
  const [isUserTriggered, setIsUserTriggered] = useState(false);
  useEffect(() => {
    if (!isUserTriggered) return;
    if (activeSection === 'search') {
      navigate({ search: location.search, hash: '#search' }, { replace: true });
    } else if (activeSection === 'calendar') {
      navigate({ search: '?view=calendar', hash: '' }, { replace: true });
    } else {
      navigate({ search: '', hash: '' }, { replace: true });
    }
    setIsUserTriggered(false);
  }, [activeSection, navigate, isUserTriggered]);

  const isCalendar = view === 'calendar';

  const handleSetActiveSection = (section: 'home' | 'calendar' | 'search') => {
    setIsUserTriggered(true);
    setActiveSection(section);
  };

  // 정렬 변경
  const handleSortChange = (key: SortKey) => {
    lastActionRef.current = 'sort';
    fromSortRef.current = true;
    setSortKey(key);
    setPage(1);
    scrollToAnchor('sort-section', 80);
  };

  // 검색
  const onSearchbarSubmitCapture = (ev: React.FormEvent) => {
    ev.preventDefault();
    ev.stopPropagation();
    lastActionRef.current = 'search';
    fromSortRef.current = false;
    const input = searchbarWrapRef.current?.querySelector(
      'input[type="search"]'
    ) as HTMLInputElement | null;
    const kw = (input?.value ?? '').trim();
    setKeyword(kw);
    setPage(1);
    scrollToAnchor('search-section', 80);
  };

  // 검색 초기화
  const onResetAll = () => {
    setKeyword('');
    setSortKey('latest');
    setPage(1);
    setSearchbarKey((k) => k + 1);
    scrollToAnchor('search-section', 80);
  };

  const displayedItems = useMemo(() => items, [items]);

  return (
    <>
      <Header />
      <Mainnavbar />

      {/* 사이드바 - 웹에서만 표시되고 고정 */}
      <div className="hidden lg:block">
        <ClassSubnavbar activeSection={activeSection} setActiveSection={handleSetActiveSection} />
      </div>

      {/* 모바일 상단 네비게이션 */}
      <div className="lg:hidden sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100">
        <ClassSubnavbar activeSection={activeSection} setActiveSection={handleSetActiveSection} />
      </div>

      {/* ===== 히어로/캘린더 ===== */}
      <section
        ref={heroSectionRef}
        className="relative w-full overflow-hidden bg-white min-h-screen lg:min-h-[calc(100vh-98px)] isolation-auto"
        aria-label="클래스 상단 뷰(히어로/캘린더)"
      >
        <div
          className="
            flex flex-col lg:flex-row lg:w-[200%] h-full
            transition-transform duration-700 ease-out will-change-transform
          "
          style={{ transform: isDesktop && isCalendar ? 'translateX(-50%)' : 'translateX(0)' }}
        >
          {/* Panel 1: 히어로 */}
          <div id="home" ref={homePanelRef} className="w-full lg:w-1/2 min-h-screen lg:min-h-auto">
            <div className="h-full w-full max-w-[1920px] mx-auto bg-cover bg-center bg-no-repeat relative">
              {/* 배경 비디오 */}
              <video
                src={classVideo}
                autoPlay
                muted
                loop
                playsInline
                className="absolute inset-0 w-full h-full object-cover"
              />

              {/* 은은한 대비 오버레이 (가독성) */}
              <div className="absolute inset-0 bg-black/10"></div>
              <div className="absolute inset-0 bg-white/40"></div>

              <div className="h-full w-full flex items-start sm:items-center justify-center relative z-10">
                <div className="relative w-full flex items-start sm:items-center min-h-screen lg:min-h-[calc(100vh-98px)]">
                  <div className="w-full max-w-6xl mx-auto text-center px-4 sm:px-6 lg:px-8 pt-20 sm:pt-0">
                    {/* 메인 타이틀 */}
                    <div className="relative mb-8 sm:mb-10 lg:mb-12">
                      <div className="relative">
                        {/* 글로우 효과 배경 */}
                        <div className="absolute -inset-1 sm:-inset-2 bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-pink-500/20 blur-xl sm:blur-3xl rounded-2xl sm:rounded-3xl animate-pulse"></div>

                        <h1 className="relative text-5xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-9xl font-black leading-tight tracking-tight">
                          {/* 첫 줄 */}
                          <div className="mb-2 sm:mb-4 transition-transform duration-700">
                            <span
                              className="
                      inline-block bg-gradient-to-r from-blue-300 via-purple-300 to-pink-300
                      bg-clip-text text-transparent
                      drop-shadow-[0_6px_8px_rgba(0,0,0,0.4)] sm:drop-shadow-[0_10px_2px_rgba(0,0,0,0.55)]
                      motion-safe:animate-bounce
                      [animation-delay:800ms] [animation-duration:8s]
                      [animation-iteration-count:1]
                    "
                            >
                              Create
                            </span>
                            <span
                              className="
                      mx-2 sm:mx-4 text-white/95 font-light
                      drop-shadow-[0_6px_8px_rgba(0,0,0,0.7)] sm:drop-shadow-[0_10px_10px_rgba(0,0,0,0.85)]
                    "
                            >
                              your
                            </span>
                            <span
                              className="
                      inline-block bg-gradient-to-r from-pink-300 via-rose-300 to-orange-300
                      bg-clip-text text-transparent
                      drop-shadow-[0_6px_8px_rgba(0,0,0,0.4)] sm:drop-shadow-[0_10px_2px_rgba(0,0,0,0.55)]
                      motion-safe:animate-bounce
                      [animation-delay:800ms] [animation-duration:8s]
                      [animation-iteration-count:1]
                    "
                            >
                              Story
                            </span>
                          </div>

                          {/* 둘째 줄 */}
                          <div className="transition-transform duration-700">
                            <span
                              className="
                      text-white/90 font-light text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl
                      drop-shadow-[0_6px_8px_rgba(0,0,0,0.7)] sm:drop-shadow-[0_10px_20px_rgba(0,0,0,0.85)]
                    "
                            >
                              with
                            </span>
                            <span
                              className="
                      ml-2 sm:ml-4 md:ml-6 inline-block
                      bg-gradient-to-r from-emerald-300 via-teal-300 to-blue-300
                      bg-clip-text text-transparent
                      drop-shadow-[0_6px_8px_rgba(0,0,0,0.4)] sm:drop-shadow-[0_10px_2px_rgba(0,0,0,0.55)]
                    "
                            >
                              Professionals
                            </span>
                          </div>
                        </h1>
                      </div>
                    </div>

                    {/* 서브 타이틀 */}
                    <div className="relative mb-6 sm:mb-10 lg:mb-12 max-w-xs sm:max-w-md lg:max-w-3xl mx-auto px-2 sm:px-4">
                      <div className="bg-white/70 rounded-xl sm:rounded-2xl px-4 sm:px-6 py-3 sm:py-5 shadow-xl">
                        <p className="text-xs sm:text-sm md:text-base lg:text-lg text-[#2D4739] font-jua leading-relaxed text-center">
                          오늘 하루, <span className="font-semibold">원데이 클래스</span>로 새로운
                          경험을 시작해보세요.
                          <br className="hidden sm:block" />
                          재료와 공간이 모두 준비되어 있어{' '}
                          <span className="font-semibold">가볍게 배우고 즐길 수 있는 클래스</span>
                          입니다.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Panel 2: 캘린더 */}
          <div
            id="calendar"
            ref={calendarSectionRef}
            className="w-full lg:w-1/2 lg:min-h-auto flex justify-center bg-gradient-to-br from-gray-50 to-white relative z-10"
          >
            <div className="w-full h-full flex items-center justify-center mx-auto px-4 py-8 md:px-6 lg:px-8">
              <div className="w-full max-w-5xl animate-fade-in">
                <div className="text-center mb-5 sm:mb-6">
                  <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-1.5">
                    이번 달 일정
                  </h2>
                  <p className="text-sm sm:text-base text-gray-600">
                    다가오는 클래스들을 확인해보세요
                  </p>
                </div>
                <CalendarPreview items={items.slice(0, 12)} />
                <p className="mt-4 text-xs sm:text-sm text-gray-500 text-center bg-white/50 backdrop-blur-sm rounded-lg p-2">
                  {isDesktop
                    ? '아래로 스크롤하면 클래스 목록도 계속 볼 수 있어요'
                    : '아래로 스크롤하면 클래스 목록을 볼 수 있어요'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== 메인 콘텐츠 ===== */}
      <main className="relative">
        {/* 1920px 기준 양옆 240px 패딩, 내부 콘텐츠 1440px */}
        <div className="max-w-[1920px] mx-auto pt-16 px-4 sm:px-6 md:px-8 lg:px-16 xl:px-[240px]">
          <div className="max-w-[1440px] mx-auto">
            {/* ⬇⬇ 여백 축소: 모바일은 최소, 데스크톱은 넉넉 */}
            <div id="search-section" className="" ref={searchSectionRef} />

            {/* 검색바 + 초기화 */}
            <section
              className="mb-4 sm:mb-6 lg:mb-8 animate-fade-in-up"
              style={{ animationDelay: '0.1s' }}
            >
              <div className="mb-3 sm:mb-4 text-center">
                <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-1.5">
                  클래스 찾기
                </h2>
                <p className="text-sm sm:text-base text-gray-600">
                  원하는 클래스를 검색하고 정렬해보세요
                </p>
              </div>

              <div
                ref={searchbarWrapRef}
                onSubmitCapture={onSearchbarSubmitCapture}
                className="mx-auto w-full max-w-2xl flex items-center gap-2 sm:gap-3"
              >
                <div className="flex-1 relative group">
                  <Searchbar
                    key={searchbarKey}
                    placeholder="클래스 검색 (예: 뜨개, 가죽, 도자기)"
                    className="w-full transition-all duration-300 group-hover:shadow-lg focus-within:shadow-lg"
                  />
                </div>
                <button
                  type="button"
                  onClick={onResetAll}
                  className="h-11 px-3 sm:px-4 rounded-xl border border-gray-300 bg-white text-xs sm:text-sm font-medium hover:bg-gray-50 hover:shadow-md active:scale-95 transition-all duration-200"
                  aria-label="검색 초기화"
                >
                  초기화
                </button>
              </div>
            </section>

            {/* 정렬바 */}
            <section
              className="mb-5 sm:mb-7 lg:mb-9 animate-fade-in-up"
              style={{ animationDelay: '0.2s' }}
            >
              <div id="sort-section" className="w-full">
                <SortBar sortKey={sortKey} onChange={handleSortChange} />
              </div>
            </section>

            {/* 로딩 상태 */}
            {isLoading && (
              <div className="flex justify-center items-center py-14 sm:py-16">
                <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-gray-900"></div>
              </div>
            )}

            {/* 리스트 */}
            <div className="animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
              <ListView items={displayedItems} isLoading={isLoading} />
            </div>

            {/* 페이지네이션 */}
            <div className="animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
              <Pagination
                page={page}
                totalPages={totalPages}
                onChange={(p) => {
                  if (p < 1 || p > totalPages) return;
                  lastActionRef.current = 'pagination';
                  fromSortRef.current = false;
                  setPage(p);
                  window.scrollTo({ top: document.body.scrollHeight * 0.35, behavior: 'smooth' });
                }}
              />
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

/** ====== 하위 컴포넌트 ====== */

function SortBar({ sortKey, onChange }: { sortKey: SortKey; onChange: (key: SortKey) => void }) {
  const items: { key: SortKey; label: string }[] = [
    { key: 'latest', label: '최신순' },
    { key: 'closing', label: '마감임박순' },
    { key: 'priceAsc', label: '낮은가격순' },
    { key: 'priceDesc', label: '높은가격순' },
  ];

  return (
    <div className="w-full overflow-x-auto scrollbar-hide">
      <div className="inline-flex items-center gap-1 border border-gray-200 rounded-xl sm:rounded-2xl p-1 sm:p-1.5 bg-white shadow-sm hover:shadow-md transition-shadow duration-300 min-w-max mx-auto">
        {items.map((it, index) => {
          const active = it.key === sortKey;
          return (
            <button
              key={it.key}
              onClick={() => onChange(it.key)}
              className={[
                'h-9 sm:h-10 px-3 sm:px-4 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium transition-all duration-300 whitespace-nowrap',
                active
                  ? 'bg-gray-900 text-white shadow-lg transform scale-105'
                  : 'bg-transparent text-gray-700 hover:bg-gray-100 hover:shadow-sm active:scale-95',
              ].join(' ')}
              aria-pressed={active}
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              {it.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function CalendarPreview({ items }: { items: ClassItem[] }) {
  return (
    <div className="rounded-2xl sm:rounded-3xl border border-gray-200/60 p-4 sm:p-6 lg:p-8 bg-white/90 backdrop-blur-sm shadow-xl lg:shadow-2xl hover:shadow-3xl transition-all duration-500">
      <div className="max-h-[300px] sm:max-h-[400px] lg:max-h-[480px] overflow-auto scrollbar-hide">
        {items.length === 0 ? (
          <div className="text-center py-12 sm:py-16">
            <div className="w-16 sm:w-20 h-16 sm:h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 sm:w-10 h-8 sm:h-10 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
            <p className="text-gray-500 text-base sm:text-lg mb-2">예정된 클래스가 없습니다</p>
            <p className="text-gray-400 text-xs sm:text-sm">곧 새로운 클래스가 개설될 예정입니다</p>
          </div>
        ) : (
          <ul className="space-y-3 sm:space-y-4">
            {items.map((cls, index) => (
              <li
                key={cls.id}
                className="group bg-white/50 rounded-xl sm:rounded-2xl p-3 sm:p-5 hover:bg-white hover:shadow-lg transition-all duration-300 animate-fade-in-up border border-gray-100/50"
                style={{ animationDelay: `${index * 0.08}s` }}
              >
                <div className="grid grid-cols-1 sm:grid-cols-[120px_1fr_auto] lg:grid-cols-[140px_1fr_auto] items-center gap-3 sm:gap-4">
                  {/* 날짜 */}
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="w-10 sm:w-12 h-10 sm:h-12 bg-[#2d4730]/10 rounded-lg sm:rounded-xl flex items-center justify-center">
                      <svg
                        className="w-5 sm:w-6 h-5 sm:h-6 text-[#2d4730]"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                    </div>
                    <div className="text-left">
                      <div className="text-xs sm:text-sm font-semibold text-[#2d4730]">
                        {cls.startDate}
                      </div>
                      <div className="text-[10px] sm:text-xs text-gray-500">~ {cls.endDate}</div>
                    </div>
                  </div>

                  {/* 클래스 정보 */}
                  <div className="space-y-1 sm:space-y-2">
                    <h3 className="font-bold text-base sm:text-lg text-gray-900 group-hover:text-[#2d4730] transition-colors line-clamp-1">
                      {cls.title}
                    </h3>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-600">
                      <span className="flex items-center gap-1">
                        <svg
                          className="w-3 sm:w-4 h-3 sm:h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                          />
                        </svg>
                        {cls.storeName}
                      </span>
                      <span className="flex items-center gap-1">
                        <svg
                          className="w-3 sm:w-4 h-3 sm:h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
                          />
                        </svg>
                        {cls.price.toLocaleString()}원
                      </span>
                      {cls.remainSeat <= 3 && cls.remainSeat > 0 && (
                        <span className="text-[10px] sm:text-xs bg-red-100 text-red-600 px-2 py-1 rounded-full font-medium">
                          마감임박 {cls.remainSeat}석
                        </span>
                      )}
                    </div>
                  </div>

                  {/* 예약 버튼 */}
                  <Link
                    to={`/main/classes/${cls.id}`}
                    state={{ item: cls }}
                    className="inline-flex items-center justify-center h-9 sm:h-11 px-4 sm:px-6 rounded-lg sm:rounded-xl border-2 border-[#2d4730]/20 bg-white hover:border-[#2d4730] hover:bg-[#2d4730] hover:text-white transition-all duration-300 text-xs sm:text-sm font-semibold active:scale-95 group-hover:shadow-lg mt-2 sm:mt-0"
                  >
                    예약하기
                    <svg
                      className="w-3 sm:w-4 h-3 sm:h-4 ml-1 sm:ml-2 transform group-hover:translate-x-1 transition-transform duration-300"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function ListView({ items, isLoading }: { items: ClassItem[]; isLoading: boolean }) {
  if (isLoading) {
    return (
      <section className="mt-4 sm:mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="border border-gray-200 rounded-xl sm:rounded-2xl overflow-hidden bg-white">
              <div className="aspect-[4/3] bg-gray-200"></div>
              <div className="p-3 sm:p-4 space-y-2 sm:space-y-3">
                <div className="h-3 sm:h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-2 sm:h-3 bg-gray-200 rounded w-1/2"></div>
                <div className="h-2 sm:h-3 bg-gray-200 rounded w-2/3"></div>
                <div className="h-3 sm:h-4 bg-gray-200 rounded w-1/3"></div>
              </div>
            </div>
          </div>
        ))}
      </section>
    );
  }

  if (items.length === 0) {
    return (
      <div className="py-16 sm:py-20 text-center">
        <div className="mx-auto w-20 sm:w-24 h-20 sm:h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <svg
            className="w-10 sm:w-12 h-10 sm:h-12 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
            />
          </svg>
        </div>
        <p className="text-base sm:text-lg text-gray-500 mb-2">등록된 클래스가 없습니다</p>
        <p className="text-xs sm:text-sm text-gray-400">다른 검색어로 시도해보세요</p>
      </div>
    );
  }

  return (
    <section className="mt-4 sm:mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
      {items.map((cls, index) => (
        <Link
          key={cls.id}
          to={`/main/classes/${cls.id}`}
          state={{ item: cls }}
          className="block group focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#2d4730] rounded-xl sm:rounded-2xl animate-fade-in-up"
          style={{ animationDelay: `${index * 0.05}s` }}
        >
          <article className="border border-gray-200 rounded-xl sm:rounded-2xl overflow-hidden bg-white transition-all duration-500 group-hover:shadow-2xl group-hover:-translate-y-1 sm:group-hover:-translate-y-2 group-hover:border-[#2d4730]/30">
            <div className="aspect-[4/3] bg-gray-100 overflow-hidden relative">
              <img
                src={cls.thumbnail || PLACEHOLDER}
                alt={cls.title}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                loading="lazy"
              />
              {/* 오버레이 효과 */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#2d4730]/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

              {/* 남은 자리 배지 */}
              {cls.remainSeat <= 3 && cls.remainSeat > 0 && (
                <div className="absolute top-2 sm:top-3 right-2 sm:right-3 bg-red-500 text-white text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full font-bold animate-bounce-in">
                  마감임박 {cls.remainSeat}석
                </div>
              )}
            </div>

            <div className="p-3 sm:p-4 md:p-5">
              <h3 className="font-bold text-base sm:text-lg line-clamp-1 group-hover:text-[#2d4730] transition-colors duration-300 mb-2">
                {cls.title}
              </h3>

              <div className="space-y-1 sm:space-y-1.5 mb-3 sm:mb-4">
                <p className="text-xs sm:text-sm text-gray-600 flex items-center">
                  <svg
                    className="w-3 sm:w-4 h-3 sm:h-4 mr-1 sm:mr-1.5 text-gray-400 flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                  <span className="truncate">
                    {cls.storeName} · {cls.addressRoad}
                  </span>
                </p>

                <p className="text-xs sm:text-sm text-gray-600 flex items-center">
                  <svg
                    className="w-3 sm:w-4 h-3 sm:h-4 mr-1 sm:mr-1.5 text-gray-400 flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  <span className="truncate">
                    {cls.startDate} ~ {cls.endDate}
                  </span>
                </p>
              </div>

              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <p className="text-lg sm:text-xl font-bold text-gray-900 group-hover:text-[#2d4730] transition-colors">
                  {cls.price.toLocaleString()}원
                </p>
                {cls.remainSeat > 0 && (
                  <span className="text-[10px] sm:text-xs text-green-600 bg-green-50 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full font-medium">
                    {cls.remainSeat}석 남음
                  </span>
                )}
              </div>

              <div className="mt-3 sm:mt-4">
                <span className="inline-flex w-full h-9 sm:h-11 items-center justify-center rounded-lg sm:rounded-xl border border-gray-300 bg-white group-hover:bg-[#2d4730] group-hover:text-white group-hover:border-[#2d4730] transition-all duration-300 text-xs sm:text-sm font-semibold active:scale-95">
                  자세히 보기
                  <svg
                    className="w-3 sm:w-4 h-3 sm:h-4 ml-1 sm:ml-2 transform group-hover:translate-x-1 transition-transform duration-300"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </span>
              </div>
            </div>
          </article>
        </Link>
      ))}
    </section>
  );
}

function Pagination({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (p: number) => void;
}) {
  const canPrev = page > 1;
  const canNext = page < totalPages;

  const go = (p: number) => {
    if (p < 1 || p > totalPages) return;
    onChange(p);
  };

  // 페이지 번호 표시 로직
  const getVisiblePages = () => {
    const isMobile =
      typeof window !== 'undefined' ? window.matchMedia('(max-width: 640px)').matches : false;
    const delta = isMobile ? 1 : 2;
    const range: number[] = [];
    const rangeWithDots: (number | '...')[] = [];

    for (let i = Math.max(2, page - delta); i <= Math.min(totalPages - 1, page + delta); i++) {
      range.push(i);
    }

    if (page - delta > 2) {
      rangeWithDots.push(1, '...');
    } else {
      rangeWithDots.push(1);
    }

    rangeWithDots.push(...range);

    if (page + delta < totalPages - 1) {
      rangeWithDots.push('...', totalPages);
    } else if (totalPages > 1) {
      rangeWithDots.push(totalPages);
    }

    return rangeWithDots;
  };

  const visiblePages = totalPages > 1 ? getVisiblePages() : [1];

  return (
    <nav
      className="mt-8 sm:mt-12 mb-12 sm:mb-16 flex items-center justify-center"
      aria-label="클래스 페이지네이션"
    >
      <div className="flex items-center gap-1 sm:gap-2 bg-white rounded-xl sm:rounded-2xl border border-gray-200 p-1 sm:p-2 shadow-lg hover:shadow-xl transition-shadow duration-300">
        {/* 이전 버튼 */}
        <button
          onClick={() => go(page - 1)}
          disabled={!canPrev}
          className={[
            'h-9 sm:h-10 px-2 sm:px-4 rounded-lg sm:rounded-xl border transition-all duration-200 font-medium text-xs sm:text-sm',
            canPrev
              ? 'border-gray-300 hover:bg-gray-50 hover:shadow-md active:scale-95 text-gray-700'
              : 'border-gray-200 text-gray-400 cursor-not-allowed',
          ].join(' ')}
          aria-label="이전 페이지"
        >
          <svg
            className="w-3 sm:w-4 h-3 sm:h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>

        {/* 페이지 번호들 */}
        <div className="flex items-center gap-0.5 sm:gap-1">
          {visiblePages.map((p, index) => {
            if (p === '...') {
              return (
                <span
                  key={`dots-${index}`}
                  className="px-1 sm:px-2 text-gray-400 text-xs sm:text-sm"
                >
                  ...
                </span>
              );
            }

            const pageNum = p as number;
            const active = pageNum === page;

            return (
              <button
                key={pageNum}
                onClick={() => go(pageNum)}
                className={[
                  'h-9 sm:h-10 w-9 sm:w-10 rounded-lg sm:rounded-xl border text-xs sm:text-sm font-semibold transition-all duration-200',
                  active
                    ? 'border-[#2d4730] bg-[#2d4730] text-white shadow-lg transform scale-105'
                    : 'border-gray-300 hover:bg-gray-50 hover:shadow-md active:scale-95 text-gray-700',
                ].join(' ')}
                aria-current={active ? 'page' : undefined}
                aria-label={`페이지 ${pageNum}`}
              >
                {pageNum}
              </button>
            );
          })}
        </div>

        {/* 다음 버튼 */}
        <button
          onClick={() => go(page + 1)}
          disabled={!canNext}
          className={[
            'h-9 sm:h-10 px-2 sm:px-4 rounded-lg sm:rounded-xl border transition-all duration-200 font-medium text-xs sm:text-sm',
            canNext
              ? 'border-gray-300 hover:bg-gray-50 hover:shadow-md active:scale-95 text-gray-700'
              : 'border-gray-200 text-gray-400 cursor-not-allowed',
          ].join(' ')}
          aria-label="다음 페이지"
        >
          <svg
            className="w-3 sm:w-4 h-3 sm:h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </nav>
  );
}
