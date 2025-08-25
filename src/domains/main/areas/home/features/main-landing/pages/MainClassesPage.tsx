import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Header from "@src/shared/areas/layout/features/header/Header";
import ClassSubnavbar from "@src/shared/areas/navigation/features/subnavbar/class/ClassSubnavbar";
import Searchbar from "@src/shared/areas/navigation/features/searchbar/Searchbar";
import heroUrl from "@src/domains/main/areas/home/features/main-landing/assets/classbg.webp";
import Mainnavbar from "@src/shared/areas/navigation/features/navbar/main/Mainnavbar";

type ClassItem = {
  id: string;
  title: string;
  host: string;
  price: number;
  date: string;
  location?: string;
  thumbnail?: string;
};

// 더미 데이터 40개 (페이지네이션 데모용)
const MOCK: ClassItem[] = Array.from({ length: 40 }).map((_, i) => ({
  id: `c${i + 1}`,
  title: `수공예 원데이 클래스 #${i + 1}`,
  host: i % 3 === 0 ? "라임스튜디오" : i % 3 === 1 ? "소소공방" : "토분이네",
  price: 30000 + (i % 7) * 5000,
  date: `2025-09-${String((i % 27) + 1).padStart(2, "0")}`,
  location: ["서울 종로", "서울 성수", "경기 분당", "인천 부평"][i % 4],
}));

const PAGE_SIZE = 16; // 4x4

export default function MainClassesPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(location.search);
  const view = params.get("view"); // 'calendar' | null
  const [page, setPage] = useState(1);
  const [activeSection, setActiveSection] = useState<"home" | "calendar" | "search">("home");

  const totalPages = Math.max(1, Math.ceil(MOCK.length / PAGE_SIZE));
  const pagedItems = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return MOCK.slice(start, start + PAGE_SIZE);
  }, [page]);

  const gridAnchorRef = useRef<HTMLDivElement | null>(null);

  // URL 파라미터 및 해시 변경 감지
  useEffect(() => {
    if (location.hash === "#search") {
      setActiveSection("search");
    } else if (view === "calendar") {
      setActiveSection("calendar");
    } else {
      setActiveSection("home");
    }
  }, [location.hash, view]);

  // activeSection 상태에 따라 URL을 한 곳에서만 업데이트
  useEffect(() => {
    if (activeSection === "search") {
      navigate({ search: location.search, hash: "#search" }, { replace: true });
    } else if (activeSection === "calendar") {
      navigate({ search: "?view=calendar", hash: "" }, { replace: true });
    } else { // activeSection === "home"
      navigate({ search: "", hash: "" }, { replace: true });
    }
  }, [activeSection, navigate]);

  // 스크롤 위치에 따라 URL의 해시만 업데이트 (내비게이션에 영향을 주지 않음)
  useEffect(() => {
    const handleScroll = () => {
      // home, calendar 상태에서는 스크롤에 따른 해시 변경을 막음
      if (activeSection === "home" || activeSection === "calendar") {
        return;
      }

      const searchElem = gridAnchorRef.current;
      if (searchElem) {
        const searchTop = searchElem.getBoundingClientRect().top;
        const viewportHeight = window.innerHeight;

        if (searchTop <= viewportHeight / 2 && location.hash !== "#search") {
          navigate({ ...location, hash: "#search" }, { replace: true });
        } else if (searchTop > viewportHeight / 2 && location.hash === "#search") {
          navigate({ ...location, hash: "" }, { replace: true });
        }
      }
    };
    
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [location, navigate, activeSection]);

  const isCalendar = view === "calendar";

  return (
    <>
      <Header />
      <Mainnavbar />
      <ClassSubnavbar 
        activeSection={activeSection} 
        setActiveSection={setActiveSection}
      />

      {/* ===== 상단 히어로/캘린더 슬라이드 영역 ===== */}
      <section
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
            "flex w-[200%] h-full transition-transform duration-500 will-change-transform",
            isCalendar ? "-translate-x-1/2" : "translate-x-0",
          ].join(" ")}
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
                <div className=" relative w-full flex items-center
                  min-h-[calc(100vh-64px-64px)]   
                  lg:min-h-[calc(100vh-64px-34px)]">
                </div>
            </div>
            </div>
          </div>

          {/* Panel 2: 캘린더 상단 섹션 (폭 고정: 1/2) */}
          <div id="calendar" className="w-1/2 h-full flex justify-center bg-white relative z-10">
            <div className="container-1920 h-full flex items-center justify-center mx-auto px-6">
              <div className="w-full max-w-5xl">
                <h2 className="text-xl font-semibold mb-4">이번 달 일정</h2>
                <CalendarPreview items={MOCK.slice(0, 12)} />
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
        <div id="search-section" className="py-10 lg:py-14" ref={gridAnchorRef} />

        <section className="mb-6">
          <Searchbar placeholder="클래스 검색 (예: 뜨개, 가죽, 도자기)" />
        </section>

        <ListView items={pagedItems} />

        <Pagination page={page} totalPages={totalPages} onChange={setPage} />
      </main>
    </>
  );
}

function CalendarPreview({ items }: { items: ClassItem[] }) {
  return (
    <div className="rounded-2xl border border-gray-200 p-4">
      <ul className="space-y-2 max-h-[360px] overflow-auto pr-1">
        {items.map((c) => (
          <li key={c.id} className="grid grid-cols-[100px_1fr_auto] items-center gap-3">
            <span className="text-sm text-gray-600">{c.date}</span>
            <span className="font-medium truncate">{c.title}</span>
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
      {items.map((c) => (
        <article
          key={c.id}
          className="border border-gray-200 rounded-2xl overflow-hidden hover:shadow-sm transition-shadow bg-white"
        >
          <div className="aspect-[4/3] bg-gray-100" />
          <div className="p-4">
            <h3 className="font-semibold line-clamp-1">{c.title}</h3>
            <p className="text-sm text-gray-500 mt-1">
              {c.host} · {c.location}
            </p>
            <p className="text-sm text-gray-500">{c.date}</p>
            <p className="mt-2 font-bold">{c.price.toLocaleString()}원</p>
            <button className="mt-3 w-full h-10 rounded-xl border border-gray-300 hover:bg-gray-50">
              자세히 보기
            </button>
          </div>
        </article>
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
    window.scrollTo({ top: document.body.scrollHeight * 0.35, behavior: "smooth" });
  };

  const pages = Array.from({ length: totalPages }).map((_, i) => i + 1);

  return (
    <nav className="mt-8 mb-16 flex items-center justify-center gap-2" aria-label="클래스 페이지네이션">
      <button
        onClick={() => go(page - 1)}
        disabled={!canPrev}
        className={[
          "h-10 px-3 rounded-lg border",
          canPrev ? "border-gray-300 hover:bg-gray-50" : "border-gray-200 text-gray-400 cursor-not-allowed",
        ].join(" ")}
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
                  "h-10 w-10 rounded-lg border text-sm font-medium",
                  active ? "border-gray-900 bg-gray-900 text-white" : "border-gray-300 hover:bg-gray-50",
                ].join(" ")}
                aria-current={active ? "page" : undefined}
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
          "h-10 px-3 rounded-lg border",
          canNext ? "border-gray-300 hover:bg-gray-50" : "border-gray-200 text-gray-400 cursor-not-allowed",
        ].join(" ")}
      >
        다음
      </button>
    </nav>
  );
}