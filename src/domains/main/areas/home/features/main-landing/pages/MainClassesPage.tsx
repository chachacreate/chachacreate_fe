// src/domains/main/areas/home/features/main-landing/MainClassesPage.tsx

import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';

import Header from '@src/shared/areas/layout/features/header/Header';
import Mainnavbar from '@src/shared/areas/navigation/features/navbar/main/Mainnavbar';
import ClassSubnavbar from '@src/shared/areas/navigation/features/subnavbar/class/ClassSubnavbar';
import Searchbar from '@src/shared/areas/navigation/features/searchbar/Searchbar';
import heroUrl from '@src/domains/main/areas/home/features/main-landing/assets/classbg.webp';
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

  // 데이터 상태
  const [items, setItems] = useState<ClassItem[]>([]);
  const [totalPages, setTotalPages] = useState(1);

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
  const heroSectionRef = useRef<HTMLDivElement | null>(null);
  const calendarSectionRef = useRef<HTMLDivElement | null>(null);
  const searchSectionRef = useRef<HTMLDivElement | null>(null);

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
      })) as ClassItem[];

      setItems(mapped);
      setTotalPages(Math.max(1, data?.totalPages ?? 1));
    } catch (e) {
      console.error('❌ 클래스 목록 조회 실패:', e);
      setItems([]);
      setTotalPages(1);
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

  // 스크롤 위치 감지
  useEffect(() => {
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

    window.addEventListener('scroll', handleScroll);
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, [view, activeSection]);

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
      <ClassSubnavbar activeSection={activeSection} setActiveSection={handleSetActiveSection} />

      {/* ===== 히어로/캘린더 ===== */}
      <section
        ref={heroSectionRef}
        className="relative w-full overflow-hidden bg-white min-h-[calc(100vh-64px-34px)] isolation-auto"
        aria-label="클래스 상단 뷰(히어로/캘린더)"
      >
        <div
          className={[
            'flex w-[200%] h-full transition-transform duration-500 will-change-transform',
            isCalendar ? '-translate-x-1/2' : 'translate-x-0',
          ].join(' ')}
        >
          {/* Panel 1: 히어로 */}
          <div id="home" className="w-1/2 h-full">
            <div
              className="h-full w-full max-w-[1920px] mx-auto bg-cover bg-center bg-no-repeat"
              style={{ backgroundImage: `url("${heroUrl}")` }}
            >
              <div className="h-full w-full flex items-center justify-center">
                <div className="relative w-full flex items-center min-h-[calc(100vh-64px-64px)] lg:min-h-[calc(100vh-64px-34px)]"></div>
              </div>
            </div>
          </div>

          {/* Panel 2: 캘린더 (→ 기존처럼 목록 일부만 표시) */}
          <div
            id="calendar"
            ref={calendarSectionRef}
            className="w-1/2 h-full flex justify-center bg-white relative z-10"
          >
            <div className="container-1920 h-full flex items-center justify-center mx-auto px-6">
              <div className="w-full max-w-5xl">
                <h2 className="text-xl font-semibold mb-4">이번 달 일정</h2>
                <CalendarPreview items={items.slice(0, 12)} />
                <p className="mt-4 text-sm text-gray-500">
                  아래로 스크롤하면 클래스 목록(4×4 그리드)도 계속 볼 수 있어요.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== 메인 콘텐츠 ===== */}
      <main className="container-1920">
        <div id="search-section" className="py-10 lg:py-14" ref={searchSectionRef} />

        {/* 검색바 + 초기화 */}
        <section className="mb-4">
          <div
            ref={searchbarWrapRef}
            onSubmitCapture={onSearchbarSubmitCapture}
            className="mx-auto w-full xl:max-w-[720px] flex items-center gap-2"
          >
            <Searchbar
              key={searchbarKey}
              placeholder="클래스 검색 (예: 뜨개, 가죽, 도자기)"
              className="flex-1"
            />
            <button
              type="button"
              onClick={onResetAll}
              className="h-9 px-3 rounded-full border border-gray-300 bg-white text-sm hover:bg-gray-50"
              aria-label="검색 초기화"
            >
              초기화
            </button>
          </div>
        </section>

        {/* 정렬바 */}
        <section className="mb-6">
          <div id="sort-section" className="w-full xl:max-w-[720px]">
            <SortBar sortKey={sortKey} onChange={handleSortChange} />
          </div>
        </section>

        {/* 리스트 */}
        <ListView items={displayedItems} />

        {/* 페이지네이션 */}
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
      </main>
    </>
  );
}

/** ====== 하위 컴포넌트 ====== */

function SortBar({
  sortKey,
  onChange,
}: {
  sortKey: SortKey;
  onChange: (key: SortKey) => void;
}) {
  const items: { key: SortKey; label: string }[] = [
    { key: 'latest', label: '최신순' },
    { key: 'closing', label: '마감임박순' },
    { key: 'priceAsc', label: '낮은가격순' },
    { key: 'priceDesc', label: '높은가격순' },
  ];
  return (
    <div className="w-full overflow-x-auto">
      <div className="inline-flex items-center gap-2 border border-gray-200 rounded-full p-1 bg-white">
        {items.map((it) => {
          const active = it.key === sortKey;
          return (
            <button
              key={it.key}
              onClick={() => onChange(it.key)}
              className={[
                'h-9 px-3 rounded-full text-sm font-medium transition-colors',
                active ? 'bg-gray-900 text-white' : 'bg-transparent text-gray-700 hover:bg-gray-100',
              ].join(' ')}
              aria-pressed={active}
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
    <div className="rounded-2xl border border-gray-200 p-4">
      <ul className="space-y-2 max-h-[360px] overflow-auto pr-1">
        {items.map((cls) => (
          <li key={cls.id} className="grid grid-cols-[100px_1fr_auto] items-center gap-3">
            <span className="text-sm text-gray-600">
              {cls.startDate}~{cls.endDate}
            </span>
            <span className="font-medium truncate">{cls.title}</span>
            <button className="h-9 px-3 rounded-lg border border-gray-300 hover:bg-gray-50">
              예약
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ListView({ items }: { items: ClassItem[] }) {
  if (items.length === 0) {
    return <div className="py-20 text-center text-gray-500">등록된 클래스가 없습니다.</div>;
  }
  return (
    <section className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {items.map((cls) => (
        <Link
          key={cls.id}
          to={`/main/classes/${cls.id}`}
          state={{ item: cls }}
          className="block group focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-gray-900 rounded-2xl"
        >
          <article className="border border-gray-200 rounded-2xl overflow-hidden bg-white transition-shadow group-hover:shadow-md">
            <div className="aspect-[4/3] bg-gray-100">
              <img
                src={cls.thumbnail || PLACEHOLDER}
                alt={cls.title}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
            <div className="p-4">
              <h3 className="font-semibold line-clamp-1">{cls.title}</h3>
              <p className="text-sm text-gray-500 mt-1">
                {cls.storeName} · {cls.addressRoad}
              </p>
              <p className="text-sm text-gray-500">
                {cls.startDate} ~ {cls.endDate}
              </p>
              <p className="mt-2 font-bold">{cls.price.toLocaleString()}원</p>
              <span className="mt-3 inline-flex h-9 px-3 items-center justify-center rounded-xl border border-gray-300 bg-white group-hover:bg-gray-50">
                자세히 보기
              </span>
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
  const pages = Array.from({ length: totalPages }).map((_, i) => i + 1);

  return (
    <nav className="mt-8 mb-16 flex items-center justify-center gap-2" aria-label="클래스 페이지네이션">
      <button
        onClick={() => go(page - 1)}
        disabled={!canPrev}
        className={[
          'h-10 px-3 rounded-lg border',
          canPrev ? 'border-gray-300 hover:bg-gray-50' : 'border-gray-200 text-gray-400 cursor-not-allowed',
        ].join(' ')}
      >
        이전
      </button>
      <ul className="flex items-center gap-1">
        {pages.map((p) => {
          const active = p === page;
          return (
            <li key={p}>
              <button
                onClick={() => go(p)}
                className={[
                  'h-10 w-10 rounded-lg border text-sm font-medium',
                  active ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-300 hover:bg-gray-50',
                ].join(' ')}
                aria-current={active ? 'page' : undefined}
              >
                {p}
              </button>
            </li>
          );
        })}
      </ul>
      <button
        onClick={() => go(page + 1)}
        disabled={!canNext}
        className={[
          'h-10 px-3 rounded-lg border',
          canNext ? 'border-gray-300 hover:bg-gray-50' : 'border-gray-200 text-gray-400 cursor-not-allowed',
        ].join(' ')}
      >
        다음
      </button>
    </nav>
  );
}
