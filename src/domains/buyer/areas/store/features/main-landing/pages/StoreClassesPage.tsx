// src/domains/buyer/areas/store/features/main-landing/StoreClassesPage.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Header from "@src/shared/areas/layout/features/header/Header";
import Storenavbar from "@src/shared/areas/navigation/features/navbar/store/Storenavbar";
import Searchbar from "@src/shared/areas/navigation/features/searchbar/Searchbar";

type ClassItem = {
  id: string;
  title: string;
  host: string;
  price: number;
  date: string;        // "YYYY-MM-DD"
  location?: string;
  thumbnail?: string;
};

const PAGE_SIZE = 16;

// 더미 데이터 (해당 store 기준)
const buildMock = (storeName: string): ClassItem[] =>
  Array.from({ length: 40 }).map((_, i) => ({
    id: `c${i + 1}`,
    title: `${storeName} · 수공예 원데이 클래스 #${i + 1}`,
    host: storeName,
    price: 30000 + (i % 7) * 5000,
    date: `2025-09-${String((i % 27) + 1).padStart(2, "0")}`,
    location: ["서울 종로", "서울 성수", "경기 분당", "인천 부평"][i % 4],
  }));

// 정렬 키
type SortKey = "latest" | "closing" | "priceAsc" | "priceDesc";

export default function StoreClassesPage() {
  const { store } = useParams<{ store: string }>();
  const storeName = store ?? "store";

  // 페이지/정렬
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState<SortKey>("latest");

  const MOCK = useMemo(() => buildMock(storeName), [storeName]);

  // 정렬 로직
  const sortedItems = useMemo(() => {
    const arr = [...MOCK];

    const byDateAsc = (a: ClassItem, b: ClassItem) =>
      new Date(a.date).getTime() - new Date(b.date).getTime();
    const byDateDesc = (a: ClassItem, b: ClassItem) =>
      new Date(b.date).getTime() - new Date(a.date).getTime();
    const byPriceAsc = (a: ClassItem, b: ClassItem) => a.price - b.price;
    const byPriceDesc = (a: ClassItem, b: ClassItem) => b.price - a.price;

    switch (sortKey) {
      case "latest":     // 최신순 = 날짜 내림차순
        return arr.sort(byDateDesc);
      case "closing":    // 마감임박순 = 날짜 오름차순
        return arr.sort(byDateAsc);
      case "priceAsc":   // 낮은가격순
        return arr.sort(byPriceAsc);
      case "priceDesc":  // 높은가격순
        return arr.sort(byPriceDesc);
      default:
        return arr;
    }
  }, [MOCK, sortKey]);

  // 페이지네이션용 슬라이스
  const totalPages = Math.max(1, Math.ceil(sortedItems.length / PAGE_SIZE));
  const pagedItems = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return sortedItems.slice(start, start + PAGE_SIZE);
  }, [page, sortedItems]);

  // 검색 섹션 ref (스크롤용)
  const searchSectionRef = useRef<HTMLDivElement | null>(null);

  // 스토어/정렬 바뀌면 페이지 리셋
  useEffect(() => setPage(1), [storeName, sortKey]);

  return (
    <>
      <Header />
      <Storenavbar />

      {/* 1920 x 400 임시 배너 */}
      <section className="w-full bg-white">
        <div className="mx-auto w-full max-w-[1920px] h-[400px] bg-gray-100 grid place-items-center">
          <span className="text-gray-500 text-sm sm:text-base">
            (임시 배너) 1920 × 400 영역 — 나중에 디자인 교체
          </span>
        </div>
      </section>

      {/* 본문: 서치바 + 정렬바 + 그리드 + 페이지네이션 */}
      <main className="w-full">
        <div className="mx-auto max-w-[1920px] px-4 sm:px-8 lg:px-12 xl:px-20 2xl:px-[240px]">
          <div id="search-section" className="py-10 lg:py-14" ref={searchSectionRef} />

          {/* 서치바 (가운데, 최대 720px) */}
          <section className="mb-4">
            <div className="mx-auto w-full xl:max-w-[720px]">
              <Searchbar placeholder="클래스 검색 (예: 뜨개, 가죽, 도자기)" />
            </div>
          </section>

          {/* 정렬바 (서치바 폭과 동일하게 중앙 정렬) */}
          <section className="mb-6">
            <div className="w-full xl:max-w-[720px]">
              <SortBar sortKey={sortKey} onChange={setSortKey} />
            </div>
          </section>

          <ListView items={pagedItems} />

          <Pagination page={page} totalPages={totalPages} onChange={setPage} />
        </div>
      </main>
    </>
  );
}

function SortBar({
  sortKey,
  onChange,
}: {
  sortKey: SortKey;
  onChange: (key: SortKey) => void;
}) {
  const items: { key: SortKey; label: string }[] = [
    { key: "latest", label: "최신순" },
    { key: "closing", label: "마감임박순" },
    { key: "priceAsc", label: "낮은가격순" },
    { key: "priceDesc", label: "높은가격순" },
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
                "h-9 px-3 rounded-full text-sm font-medium transition-colors",
                active
                  ? "bg-gray-900 text-white"
                  : "bg-transparent text-gray-700 hover:bg-gray-100",
              ].join(" ")}
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

function ListView({ items }: { items: ClassItem[] }) {
  return (
    <section className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {items.map((c) => (
        <Link
          key={c.id}
          to={`/main/classes/${c.id}`} // 기존 상세 라우트 재사용
          state={{ item: c }}
          className="block group focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-gray-900 rounded-2xl"
        >
          <article className="border border-gray-200 rounded-2xl overflow-hidden bg-white transition-shadow group-hover:shadow-md">
            <div className="aspect-[4/3] bg-gray-100" />
            <div className="p-4">
              <h3 className="font-semibold line-clamp-1">{c.title}</h3>
              <p className="text-sm text-gray-500 mt-1">
                {c.host} · {c.location}
              </p>
              <p className="text-sm text-gray-500">{c.date}</p>
              <p className="mt-2 font-bold">{c.price.toLocaleString()}원</p>
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

    // 검색 섹션 기준으로 스크롤 이동(상단 잘림 방지)
    const searchEl = document.getElementById("search-section");
    if (searchEl) {
      const rect = searchEl.getBoundingClientRect();
      const offset = window.scrollY + rect.top - 80; // 헤더/네브 높이 보정
      window.scrollTo({ top: offset, behavior: "smooth" });
    }
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
