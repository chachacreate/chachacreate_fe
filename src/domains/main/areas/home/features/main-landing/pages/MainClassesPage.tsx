import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Header from '@src/shared/areas/layout/features/header/Header';
import ClassSubnavbar from '@src/shared/areas/navigation/features/subnavbar/class/ClassSubnavbar';
import Searchbar from '@src/shared/areas/navigation/features/searchbar/Searchbar';
import heroUrl from '@src/domains/main/areas/home/features/main-landing/assets/classbg.webp';
import Mainnavbar from '@src/shared/areas/navigation/features/navbar/main/Mainnavbar';
import { Link } from 'react-router-dom';
import { get } from '@src/libs/request';

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

const PAGE_SIZE = 16; // 4x4

export default function MainClassesPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(location.search);
  const view = params.get('view'); // 'calendar' | null
  const [page, setPage] = useState(1);
  const [activeSection, setActiveSection] = useState<'home' | 'calendar' | 'search'>('home');

  // 스크롤 감지를 위한 refs
  const heroSectionRef = useRef<HTMLDivElement | null>(null);
  const calendarSectionRef = useRef<HTMLDivElement | null>(null);
  const searchSectionRef = useRef<HTMLDivElement | null>(null);

  // API 데이터 상태 관리
  const [items, setItems] = useState<ClassItem[]>([]);
  const [totalPages, setTotalPages] = useState(1);

  // axios 호출 대신 src/libs/request에 담긴 함수 사용으로 통일성 제공
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const response = await get<{ content: any[]; totalPages: number }>('/main/classes', {
          page: page - 1,
          size: PAGE_SIZE,
        });

        if (response.status === 200) {
          console.log('클래스 데이터:', response.data);
          console.log(response);

          const classItems = response.data.content.map((cls) => ({
            id: cls.id,
            title: cls.title,
            storeName: cls.storeName,
            price: cls.price,
            thumbnail: cls.thumbnailUrl,
            addressRoad: cls.addressRoad?.split(' ').slice(0, 2).join(' '), // 앞 두 단어만
            remainSeat: cls.remainSeat,
            startDate: cls.startDate?.slice(0, 10), // YYYY-MM-DD
            endDate: cls.endDate?.slice(0, 10), // YYYY-MM-DD
          }));

          setItems(classItems);
          setTotalPages(response.data.totalPages);
        } else {
          console.error('클래스 조회 실패:', response.message);
        }
      } catch (error) {
        console.error('API 요청 실패:', error);
      }
    };

    fetchClasses();
  }, [page]);

  // URL 파라미터 및 해시 변경 감지
  useEffect(() => {
    if (location.hash === '#search') {
      setActiveSection('search');
    } else if (view === 'calendar') {
      setActiveSection('calendar');
    } else {
      setActiveSection('home');
    }
  }, [location.hash, view]);

  // 스크롤 위치에 따라 activeSection 자동 업데이트
  useEffect(() => {
    const handleScroll = () => {
      const heroSection = heroSectionRef.current;
      const calendarSection = calendarSectionRef.current;
      const searchSection = searchSectionRef.current;

      if (!heroSection || !calendarSection || !searchSection) return;

      const scrollY = window.scrollY;
      const heroHeight = heroSection.offsetHeight;
      const searchTop = searchSection.offsetTop;

      // 각 섹션의 경계를 기준으로 activeSection 결정
      if (scrollY < heroHeight * 0.3) {
        // 상단 30% 이내면 현재 보이는 패널 (home/calendar) 유지
        if (view === 'calendar') {
          if (activeSection !== 'calendar') {
            setActiveSection('calendar');
          }
        } else {
          if (activeSection !== 'home') {
            setActiveSection('home');
          }
        }
      } else if (scrollY >= searchTop - 200) {
        // 검색 섹션에 가까우면 search로 변경
        if (activeSection !== 'search') {
          setActiveSection('search');
        }
      }
    };

    // 스크롤 이벤트 리스너 등록
    window.addEventListener('scroll', handleScroll);

    // 초기 실행
    handleScroll();

    return () => window.removeEventListener('scroll', handleScroll);
  }, [view, activeSection]);

  // activeSection 변경 시 URL 업데이트 (사용자 클릭에 의한 변경만)
  const [isUserTriggered, setIsUserTriggered] = useState(false);

  useEffect(() => {
    if (!isUserTriggered) return;

    if (activeSection === 'search') {
      navigate({ search: location.search, hash: '#search' }, { replace: true });
    } else if (activeSection === 'calendar') {
      navigate({ search: '?view=calendar', hash: '' }, { replace: true });
    } else {
      // activeSection === "home"
      navigate({ search: '', hash: '' }, { replace: true });
    }

    setIsUserTriggered(false);
  }, [activeSection, navigate, isUserTriggered]);

  const isCalendar = view === 'calendar';

  // navbar에서 사용할 섹션 변경 핸들러
  const handleSetActiveSection = (section: 'home' | 'calendar' | 'search') => {
    setIsUserTriggered(true);
    setActiveSection(section);
  };

  return (
    <>
      <Header />
      <Mainnavbar />
      <ClassSubnavbar activeSection={activeSection} setActiveSection={handleSetActiveSection} />

      {/* ===== 상단 히어로/캘린더 슬라이드 영역 ===== */}
      <section
        ref={heroSectionRef}
        className="
          relative w-full overflow-hidden bg-white
          min-h-[calc(100vh-64px-34px)]
          isolation-auto
        "
        aria-label="클래스 상단 뷰(히어로/캘린더)"
      >
        {/* 트랙: 두 패널(히어로/캘린더) 가로 배치 */}
        <div
          className={[
            'flex w-[200%] h-full transition-transform duration-500 will-change-transform',
            isCalendar ? '-translate-x-1/2' : 'translate-x-0',
          ].join(' ')}
        >
          {/* Panel 1: 히어로 (폭 고정: 1/2) */}
          <div id="home" className="w-1/2 h-full">
            {/* 1920 안에서만 배경 표시 (가로 넘침 방지) */}
            <div
              className="h-full w-full max-w-[1920px] mx-auto bg-cover bg-center bg-no-repeat"
              style={{
                backgroundImage: `url("${heroUrl}")`,
              }}
            >
              {/* 히어로 오버레이/카피가 필요하면 이 안에 배치 */}
              <div className="h-full w-full flex items-center justify-center">
                <div
                  className=" relative w-full flex items-center
                  min-h-[calc(100vh-64px-64px)]   
                  lg:min-h-[calc(100vh-64px-34px)]"
                ></div>
              </div>
            </div>
          </div>

          {/* Panel 2: 캘린더 상단 섹션 (폭 고정: 1/2) */}
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

      {/* ===== 아래 메인 콘텐츠: Searchbar + 그리드 + 페이지네이션 ===== */}
      <main className="container-1920">
        <div id="search-section" className="py-10 lg:py-14" ref={searchSectionRef} />

        <section className="mb-6">
          <Searchbar placeholder="클래스 검색 (예: 뜨개, 가죽, 도자기)" />
        </section>

        <ListView items={items} />

        <Pagination page={page} totalPages={totalPages} onChange={setPage} />
      </main>
    </>
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
            <img src={cls.thumbnail} alt={cls.title} className="w-full h-full object-cover" />
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
    window.scrollTo({ top: document.body.scrollHeight * 0.35, behavior: 'smooth' });
  };

  const pages = Array.from({ length: totalPages }).map((_, i) => i + 1);

  return (
    <nav
      className="mt-8 mb-16 flex items-center justify-center gap-2"
      aria-label="클래스 페이지네이션"
    >
      <button
        onClick={() => go(page - 1)}
        disabled={!canPrev}
        className={[
          'h-10 px-3 rounded-lg border',
          canPrev
            ? 'border-gray-300 hover:bg-gray-50'
            : 'border-gray-200 text-gray-400 cursor-not-allowed',
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
                  active
                    ? 'border-gray-900 bg-gray-900 text-white'
                    : 'border-gray-300 hover:bg-gray-50',
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
          canNext
            ? 'border-gray-300 hover:bg-gray-50'
            : 'border-gray-200 text-gray-400 cursor-not-allowed',
        ].join(' ')}
      >
        다음
      </button>
    </nav>
  );
}
