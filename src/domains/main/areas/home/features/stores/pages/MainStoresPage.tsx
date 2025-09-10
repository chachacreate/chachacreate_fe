import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Search, ChevronDown, ChevronUp } from 'lucide-react';

import Header from '@src/shared/areas/layout/features/header/Header';
import Mainnavbar from '@src/shared/areas/navigation/features/navbar/main/Mainnavbar';
import StoresSubnavbar from '@src/shared/areas/navigation/features/subnavbar/stores/StoresSubnavbar';
import { legacyGet } from '@src/libs/request';

/** 스토어 타입 */
type Store = {
  id: string;
  name: string;
  description: string;
  image: string;
  categoriesSold: string[];
  orderCount: number;
  viewCount: number;
  /** 스토어 커스텀 색상(선택): 카드 호버 테두리/칩 컬러에 사용 */
  accentColor?: string; // 예: "#2d4739"
};

type CategoryOption = {
  value: string;
  label: string;
  subCategories: { value: string; label: string }[];
};

type SortKey = 'views' | 'orders' | 'name';

const PAGE_SIZE = 12;

const categoryOptions: CategoryOption[] = [
  {
    value: '1', // FASHION
    label: '패션잡화',
    subCategories: [
      { value: '1', label: '티셔츠/니트/셔츠' },
      { value: '2', label: '생활한복' },
      { value: '3', label: '가방/파우치' },
      { value: '4', label: '여성신발/수제화' },
      { value: '5', label: '패션잡화 기타' },
    ],
  },
  {
    value: '2', // INTERIOR
    label: '인테리어 소품',
    subCategories: [
      { value: '6', label: '패브릭' },
      { value: '7', label: '꽃/식물' },
      { value: '8', label: '조명' },
      { value: '9', label: '인테리어 소품 기타' },
    ],
  },
  {
    value: '3', // ACCESSORY
    label: '악세서리',
    subCategories: [
      { value: '10', label: '반지' },
      { value: '11', label: '팔찌' },
      { value: '12', label: '귀걸이' },
      { value: '13', label: '악세서리 기타' },
    ],
  },
  {
    value: '4', // LIFESTYLE
    label: '케이스/문구',
    subCategories: [
      { value: '14', label: '폰케이스' },
      { value: '15', label: '노트/필기도구' },
      { value: '16', label: '인형/장난감' },
      { value: '17', label: '주차번호/차량스티커' },
      { value: '18', label: '케이스/문구 기타' },
    ],
  },
  {
    value: '5', // ETC
    label: '기타',
    subCategories: [{ value: '19', label: '기타' }],
  },
];

/** value -> label 빠른 룩업 */
const VALUE_TO_LABEL: Record<string, string> = (() => {
  const m: Record<string, string> = {};
  categoryOptions.forEach((cat) => {
    m[cat.value] = cat.label;
    cat.subCategories.forEach((sub) => (m[sub.value] = sub.label));
  });
  return m;
})();

/** 대표 카테고리(최빈값) 계산 */
function getRepresentativeCategory(categoriesSold: string[]): string {
  if (!categoriesSold.length) return 'all';
  const freq = new Map<string, number>();
  categoriesSold.forEach((v) => freq.set(v, (freq.get(v) ?? 0) + 1));

  let maxCount = 0;
  let best = categoriesSold[0]; // 첫 요소 기본값
  categoriesSold.forEach((v) => {
    const count = freq.get(v) ?? 0;
    if (count > maxCount) {
      best = v;
      maxCount = count;
    }
  });
  return best;
}

/** API에서 받아온 categoriesSold 라벨 → value 매핑 */
function mapCategoriesToValue(categories: string[]): string[] {
  return categories
    .map((c) => {
      const entry = Object.entries(VALUE_TO_LABEL).find(([_, label]) => label === c);
      return entry ? entry[0] : undefined;
    })
    .filter((v): v is string => !!v); // undefined 제거
}

const sortOptions: { value: SortKey; label: string }[] = [
  { value: 'views', label: '조회순' },
  { value: 'orders', label: '판매순' },
  { value: 'name', label: '가나다순' },
];

/** 커스텀 컬러 팔레트(데모용) */
const PALETTE = ['#2d4739', '#0e7490', '#6d28d9', '#b45309', '#15803d'];

const MainStoresPage: React.FC = () => {
  const [allStores, setAllStores] = useState<Store[]>([]);
  const [visibleStores, setVisibleStores] = useState<Store[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [mainCat, setMainCat] = useState('all');
  const [subCat, setSubCat] = useState('all');
  const [sortBy, setSortBy] = useState<SortKey>('views');

  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);

  /** 모바일에서 카드별 설명 펼침 상태 */
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const sentinelRef = useRef<HTMLDivElement | null>(null);

  /** API 호출로 전체 스토어 불러오기 */
  const fetchAllStores = useCallback(async () => {
    setLoading(true);
    try {
      const response = await legacyGet<{ status: number; message: string; data: any[] }>(
        '/main/store/stores'
      );
      if (response.status === 200) {
        const storesData = Array.isArray(response.data) ? response.data : [];
        const mapped: Store[] = storesData.map((s, idx) => ({
          id: String(s.storeId),
          name: s.storeName,
          description: s.storeDesc,
          image: s.logoImg || `https://picsum.photos/seed/${idx}/800/800`,
          categoriesSold: s.categoriesSold ? mapCategoriesToValue(s.categoriesSold) : [],
          orderCount: s.orderCnt ?? 0,
          viewCount: s.viewCnt ?? 0,
          accentColor: s.accentColor,
        }));
        setAllStores(mapped);
      } else {
        console.error('스토어 전체 조회 실패:', response.message);
      }
    } catch (error) {
      console.error('API 요청 실패:', error);
      setAllStores([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllStores();
  }, [fetchAllStores]);

  /** 필터링 & 정렬 결과 */
  const filteredAll = useMemo(() => {
    return allStores
      .filter((s) => {
        const nameOk = s.name.toLowerCase().includes(searchTerm.toLowerCase());
        const repMain = s.categoriesSold[0] ?? 'all';
        const repSub = getRepresentativeCategory(s.categoriesSold.slice(1));

        const mainOk = mainCat === 'all' || repMain === mainCat;
        const subOk = subCat === 'all' || repSub === subCat;

        return nameOk && mainOk && subOk;
      })
      .sort((a, b) => {
        switch (sortBy) {
          case 'views':
            return b.viewCount - a.viewCount;
          case 'orders':
            return b.orderCount - a.orderCount;
          case 'name':
            return a.name.localeCompare(b.name, 'ko');
        }
      });
  }, [allStores, searchTerm, mainCat, subCat, sortBy]);

  /** 페이지 적용 */
  useEffect(() => {
    const end = PAGE_SIZE * page;
    const sliced = filteredAll.slice(0, end);
    setVisibleStores(sliced);
    setHasMore(end < filteredAll.length);
  }, [filteredAll, page]);

  /** 메인 카테고리 변경 시 첫 번째 서브카테고리 자동 선택 + 페이지 리셋 */
  useEffect(() => {
    const currentCategory = categoryOptions.find((c) => c.value === mainCat);
    if (currentCategory && currentCategory.subCategories.length > 0) {
      setSubCat(currentCategory.subCategories[0].value);
    } else {
      setSubCat('all');
    }
    setPage(1);
  }, [mainCat]);

  /** 검색/정렬/서브카테고리 변경 시 페이지 리셋 */
  useEffect(() => {
    setPage(1);
  }, [searchTerm, sortBy, subCat]);

  /** 무한 스크롤 IntersectionObserver */
  useEffect(() => {
    if (!sentinelRef.current) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting && hasMore && !loading) {
            setLoading(true);
            setTimeout(() => {
              setPage((p) => p + 1);
              setLoading(false);
            }, 400);
          }
        });
      },
      { root: null, rootMargin: '0px 0px 600px 0px', threshold: 0 }
    );
    io.observe(sentinelRef.current);
    return () => io.disconnect();
  }, [hasMore, loading]);

  const currentCategory = categoryOptions.find((c) => c.value === mainCat);
  const subCategories = currentCategory?.subCategories ?? [];

  const handleStoreClick = (storeId: string) => {
    window.location.href = `/main/stores/${storeId}`; // 필요 시 라우트에 맞게 수정
  };

  const totalFilteredCount = filteredAll.length;

  /** 모바일 설명 토글 */
  const toggleExpand = (id: string) => setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  // 서브네비게이션 클릭 핸들러 - "전체 스토어" 클릭 시 필터 초기화
  const handleSubnavClick = (to: string) => {
    if (to === '/main/stores') {
      setSearchTerm('');
      setMainCat('all');
      setSubCat('all');
      setPage(1);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <Mainnavbar />
      {/* 서브 네브바 자체에 여백 적용된 버전을 쓰는 경우 className 없이 사용해도 OK */}
      <StoresSubnavbar className="mb-6 md:mb-8" onItemClick={handleSubnavClick} />

      {/* 🔶 240px 패딩 + 내부 1440 */}
      <div className="px-4 sm:px-6 xl:px-[240px]">
        <div className="w-full max-w-[1440px] mx-auto py-2">
          {/* 타이틀 */}
          <div className="mb-8">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">스토어 둘러보기</h1>
            <p className="text-gray-600">핸드메이드 감성의 다양한 스토어를 만나보세요</p>
          </div>

          {/* 검색 */}
          <div className="relative mb-6">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="스토어명으로 검색하세요"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2d4739] focus:border-transparent"
            />
          </div>

          {/* 카테고리 탭 */}
          <div className="mb-6">
            <div className="flex flex-wrap gap-2 mb-4">
              {categoryOptions.map((c) => (
                <button
                  key={c.value}
                  onClick={() => setMainCat(c.value)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    mainCat === c.value
                      ? 'bg-[#2d4739] text-white'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>

            {/* 서브카테고리 */}
            {mainCat !== 'all' && (subCategories?.length ?? 0) > 1 && (
              <div className="flex flex-wrap gap-2">
                {subCategories.map((s) => (
                  <button
                    key={s.value}
                    onClick={() => setSubCat(s.value)}
                    className={`px-3 py-1.5 rounded-full text-xs transition-colors ${
                      subCat === s.value
                        ? 'bg-[#2d4739]/10 text-[#2d4739] border border-[#2d4739]'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 필터바 (정렬) */}
          <div className="flex flex-col md:flex-row gap-4 mb-8">
            <div className="relative w-full max-w-[220px]">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortKey)}
                className="w-full appearance-none bg-white border border-gray-300 rounded-lg px-4 pr-10 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#2d4739]"
              >
                {sortOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
                <ChevronDown className="w-4 h-4 text-gray-400" />
              </span>
            </div>
          </div>

          {/* 총 개수 */}
          <div className="mb-6">
            <p className="text-gray-600">
              총 <span className="font-semibold text-[#2d4739]">{totalFilteredCount}</span>개의
              스토어
            </p>
          </div>

          {/* 스토어 그리드 */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {visibleStores.map((s) => {
              const repMain = s.categoriesSold[0];
              const repSub = getRepresentativeCategory(s.categoriesSold.slice(1));
              const isOpen = !!expanded[s.id];
              const accent = s.accentColor || '#2d4739';

              return (
                <div
                  key={s.id}
                  onClick={() => handleStoreClick(s.id)}
                  // ✅ 커스텀 색상: CSS 변수로 주입 → hover:border-[var(--store-accent)] 사용
                  style={{ ['--store-accent' as any]: accent }}
                  className="
                    group bg-white rounded-xl border border-gray-200 shadow-sm
                    hover:shadow-lg hover:border-[var(--store-accent)] hover:-translate-y-1
                    transition-all duration-200 cursor-pointer overflow-hidden
                    focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--store-accent)]
                  "
                  tabIndex={0}
                >
                  {/* 이미지 & 설명 오버레이 컨테이너 */}
                  <div className="relative aspect-square overflow-hidden">
                    <img
                      src={s.image}
                      alt={s.name}
                      loading="lazy"
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />

                    {/* ✅ 설명 오버레이
                        - md 이상(웹): 호버 시 표시
                        - 모바일: isOpen 일 때 표시 (버튼으로 토글)
                    */}
                    <div
                      onClick={(e) => e.stopPropagation()} // 오버레이 클릭은 카드 네비게이션 막기
                      className={[
                        'absolute inset-0 flex',
                        'transition-opacity duration-200',
                        // 기본(모바일 기준) 상태
                        isOpen
                          ? 'opacity-100 pointer-events-auto'
                          : 'opacity-0 pointer-events-none',
                        // 데스크탑: hover 시 표시
                        'md:pointer-events-none md:opacity-0 md:group-hover:opacity-100',
                      ].join(' ')}
                    >
                      {/* 반투명 배경 + 블러 */}
                      <div className="absolute inset-0 bg-black/55 backdrop-blur-sm" />
                      {/* 내용 */}
                      <div className="relative z-10 flex-1 h-full p-4 md:p-5">
                        <div className="h-full w-full rounded-lg text-white/95 text-sm leading-relaxed overflow-y-auto">
                          {/* 긴 설명 스크롤 */}
                          <p className="whitespace-pre-line">{s.description}</p>
                        </div>

                        {/* 모바일에서만 닫기 버튼 */}
                        {/* <div className="md:hidden absolute top-3 right-3">
                          <button
                            onClick={() => toggleExpand(s.id)}
                            className="inline-flex items-center gap-1 rounded-lg bg-white/90 px-2 py-1 text-xs font-semibold text-gray-800 shadow-sm"
                          >
                            닫기
                            <ChevronDown className="w-3.5 h-3.5" />
                          </button>
                        </div> */}
                      </div>

                      {/* 아래서 위로 올라오는 느낌(모바일 시각 보강) */}
                      <div
                        className={[
                          'absolute inset-x-0 bottom-0 h-10',
                          'bg-gradient-to-t from-black/50 to-transparent',
                          isOpen ? 'opacity-100' : 'opacity-0',
                          'md:opacity-0',
                          'transition-opacity duration-200',
                        ].join(' ')}
                      />
                    </div>
                  </div>

                  {/* 본문 */}
                  <div
                    className="p-4"
                    onClick={(e) => e.stopPropagation()} // 내부 버튼 클릭 시 라우팅 방지
                  >
                    {/* ✅ 모바일 전용: 설명 토글 버튼 (카드 본문 최상단, 작은 원형) */}
                    <div className="mb-2 md:hidden flex justify-center">
                      <button
                        onClick={() => toggleExpand(s.id)}
                        className="
                        inline-flex items-center justify-center
                        w-6 h-6 rounded-full border border-gray-300 bg-white
                        text-gray-700 shadow-sm active:scale-[0.95]
                        "
                      >
                        {isOpen ? (
                          <ChevronDown className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronUp className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>

                    {/* 카테고리 칩 */}
                    <div className="flex flex-wrap gap-1 mb-2">
                      <span className="text-xs bg-[var(--store-accent)]/10 text-[var(--store-accent)] px-2 py-1 rounded-full">
                        {VALUE_TO_LABEL[repMain] ?? repMain}
                      </span>
                      <span className="text-xs bg-[var(--store-accent)]/10 text-[var(--store-accent)] px-2 py-1 rounded-full">
                        {VALUE_TO_LABEL[repSub] ?? repSub}
                      </span>
                    </div>

                    {/* 스토어명 */}
                    <h3 className="font-semibold text-gray-900 text-sm md:text-base line-clamp-2 mb-1">
                      {s.name}
                    </h3>

                    {/* 설명(요약) — 기본 2줄까지만 보여주고, 자세한 내용은 오버레이에서 */}
                    <p className="text-xs text-gray-600 line-clamp-2 mb-3">{s.description}</p>

                    {/* 메타 */}
                    <p className="text-xs text-gray-500">
                      판매 {s.orderCount.toLocaleString()} · 조회 {s.viewCount.toLocaleString()}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 로딩 / 끝 / 결과 없음 */}
          <div ref={sentinelRef} className="h-1" />
          {loading && (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#2d4739]" />
              <p className="mt-2 text-gray-600">스토어를 불러오는 중...</p>
            </div>
          )}
          {!hasMore && !loading && visibleStores.length > 0 && (
            <div className="text-center py-8 text-gray-600">모든 스토어를 확인했습니다.</div>
          )}
          {visibleStores.length === 0 && !loading && (
            <div className="text-center py-16">
              <Search className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">검색 결과가 없습니다</h3>
              <p className="text-gray-600">다른 검색어나 필터를 시도해보세요</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MainStoresPage;
