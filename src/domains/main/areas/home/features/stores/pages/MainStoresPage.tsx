import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Search, ChevronDown, Check, X } from 'lucide-react';

import Header from '@src/shared/areas/layout/features/header/Header';
import Mainnavbar from '@src/shared/areas/navigation/features/navbar/main/Mainnavbar';
import StoresSubnavbar from '@src/shared/areas/navigation/features/subnavbar/stores/StoresSubnavbar';
import { legacyGet } from '@src/libs/request';

type Store = {
  id: string;
  name: string;
  description: string;
  image: string;
  orderCount: number;
  viewCount: number;
  storeUrl: string;
  accentColor?: string;
  upCategory?: string; // uCategory label
  downCategory?: string; // dCategory label
};

type CategoryOption = {
  value: string;
  label: string;
  subCategories: { value: string; label: string }[];
};

type SortKey = 'views' | 'orders' | 'name';

const PAGE_SIZE = 20;

// 카테고리 정의
const categoryOptions: CategoryOption[] = [
  {
    value: '1',
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
    value: '2',
    label: '인테리어 소품',
    subCategories: [
      { value: '6', label: '패브릭' },
      { value: '7', label: '꽃/식물' },
      { value: '8', label: '조명' },
      { value: '9', label: '인테리어 소품 기타' },
    ],
  },
  {
    value: '3',
    label: '악세서리',
    subCategories: [
      { value: '10', label: '반지' },
      { value: '11', label: '팔찌' },
      { value: '12', label: '귀걸이' },
      { value: '13', label: '악세서리 기타' },
    ],
  },
  {
    value: '4',
    label: '케이스/문구',
    subCategories: [
      { value: '14', label: '폰케이스' },
      { value: '15', label: '노트/필기도구' },
      { value: '16', label: '인형/장난감' },
      { value: '17', label: '주차번호/차량스티커' },
      { value: '18', label: '케이스/문구 기타' },
    ],
  },
  { value: '5', label: '기타', subCategories: [{ value: '19', label: '기타' }] },
];

// value -> label 맵
const VALUE_TO_LABEL: Record<string, string> = {};
categoryOptions.forEach((c) => {
  c.subCategories.forEach((s) => (VALUE_TO_LABEL[s.value] = s.label));
});

const sortOptions: { value: SortKey; label: string }[] = [
  { value: 'views', label: '조회순' },
  { value: 'orders', label: '판매순' },
  { value: 'name', label: '가나다순' },
];

const MainStoresPage: React.FC = () => {
  const [allStores, setAllStores] = useState<Store[]>([]);
  const [visibleStores, setVisibleStores] = useState<Store[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [subCatList, setSubCatList] = useState<string[]>([]); // 선택된 d카테고리 value
  const [sortBy, setSortBy] = useState<SortKey>('views');
  const [showCategoryFilter, setShowCategoryFilter] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // 모바일 정렬 바텀시트
  const [showSortSheet, setShowSortSheet] = useState(false);
  const [isMobile, setIsMobile] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.matchMedia('(max-width: 768px)').matches : false
  );
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(max-width: 768px)');
    const onChange = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    setIsMobile(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  /** 전체 스토어 + 카테고리 불러오기 */
  const fetchAllStores = useCallback(async () => {
    setLoading(true);
    try {
      const res = await legacyGet<{ status: number; data: any[] }>('/main/store/stores');
      if (res.status === 200) {
        const stores = await Promise.all(
          res.data.map(async (s) => {
            const catRes = await legacyGet<{ data: { ucategory?: string; dcategory?: string } }>(
              `/main/${s.storeId}/categories`
            );
            const c = catRes.data ?? {};
            return {
              id: String(s.storeId),
              name: s.storeName,
              description: s.storeDetail,
              image: s.logoImg || `https://picsum.photos/seed/${s.storeId}/800/800`,
              orderCount: s.saleCnt ?? 0,
              viewCount: s.viewCnt ?? 0,
              storeUrl: s.storeUrl,
              upCategory: c.ucategory,
              downCategory: c.dcategory,
            } as Store;
          })
        );
        setAllStores(stores);
      } else setAllStores([]);
    } catch {
      setAllStores([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllStores();
  }, [fetchAllStores]);

  /** 필터링 & 정렬 (OR 조건 적용) */
  const filteredAll = useMemo(() => {
    return allStores
      .filter((s) => {
        const nameOk = s.name.toLowerCase().includes(searchTerm.toLowerCase());

        // 선택한 카테고리 중 하나라도 포함되면 true
        const subOk =
          subCatList.length === 0 ||
          subCatList.some(
            (value) =>
              VALUE_TO_LABEL[value] === s.downCategory || VALUE_TO_LABEL[value] === s.upCategory
          );

        return nameOk && subOk;
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
  }, [allStores, searchTerm, subCatList, sortBy]);

  /** 페이지 적용 */
  useEffect(() => {
    const end = PAGE_SIZE * page;
    setVisibleStores(filteredAll.slice(0, end));
    setHasMore(end < filteredAll.length);
  }, [filteredAll, page]);

  /** 전체선택 체크박스 */
  const handleSelectAll = (subValues: string[], checked: boolean) => {
    if (checked) setSubCatList((prev) => Array.from(new Set([...prev, ...subValues])));
    else setSubCatList((prev) => prev.filter((v) => !subValues.includes(v)));
  };

  /** 개별 d카테고리 체크 */
  const handleSubCatToggle = (value: string) => {
    setSubCatList((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  };

  const handleStoreClick = (id: string, url: string) => {
    window.location.href = `/${url}`;
    legacyGet(`/main/store/click/${id}`);
  };

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <Mainnavbar />
      <StoresSubnavbar className="mb-6 md:mb-8" />

      <div className="px-4 sm:px-6 xl:px-[240px] pb-12 md:pb-16">
        <div className="w-full max-w-[1440px] mx-auto py-2">
          <div className="mb-8">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2 ">스토어 모음</h1>
            <p className="text-gray-600 hover:text-gray-800 transition-colors duration-300">
              다양한 스토어들을 구경해봬세요
            </p>
          </div>

          <style>{`
            /* 필요한 애니메이션만 추가 */
            h1 { animation: slideIn 0.5s ease-out; }
            p { animation: slideIn 0.5s ease-out 0.2s both; }
            
            @keyframes slideIn {
              from { opacity: 0; transform: translateY(10px); }
              to { opacity: 1; transform: translateY(0); }
            }
          `}</style>

          <div className="relative mb-6">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="스토어명으로 검색하세요"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2d4739]"
            />
          </div>

          {/* 정렬 + 카테고리 버튼 */}
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4 mb-8">
            {/* 데스크톱: 셀렉트 / 모바일: 바텀시트 트리거 */}
            {!isMobile ? (
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
            ) : (
              <button
                onClick={() => setShowSortSheet(true)}
                className="inline-flex items-center justify-between w-full max-w-[220px] px-4 py-2 border border-gray-300 rounded-lg text-gray-700"
              >
                <span>정렬: {sortOptions.find((o) => o.value === sortBy)?.label ?? '조회순'}</span>
                <ChevronDown className="w-4 h-4 text-gray-400" />
              </button>
            )}

            <button
              onClick={() => setShowCategoryFilter(!showCategoryFilter)}
              className="w-auto inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              카테고리별
              <ChevronDown
                className={`w-4 h-4 transition-transform ${showCategoryFilter ? 'rotate-180' : ''}`}
              />
            </button>
          </div>

          {showCategoryFilter && (
            <div className="mb-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
              {categoryOptions
                .filter((c) => c.value !== '5')
                .map((c) => (
                  <div key={c.value} className="mb-4">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="font-medium text-gray-900">{c.label}</span>
                      {c.subCategories.length > 0 && (
                        <label className="flex items-center gap-1 text-sm text-gray-600">
                          <input
                            type="checkbox"
                            checked={c.subCategories.every((sub) => subCatList.includes(sub.value))}
                            onChange={(e) =>
                              handleSelectAll(
                                c.subCategories.map((s) => s.value),
                                e.target.checked
                              )
                            }
                            className="rounded border-gray-300"
                          />
                          전체 선택
                        </label>
                      )}
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                      {c.subCategories.map((sub) => (
                        <label key={sub.value} className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={subCatList.includes(sub.value)}
                            onChange={() => handleSubCatToggle(sub.value)}
                            className="rounded border-gray-300"
                          />
                          {sub.label}
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              <div className="flex justify-end">
                <button
                  onClick={() => setSubCatList([])}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
                >
                  ↻ 필터 초기화
                </button>
              </div>
            </div>
          )}

          <div className="mb-6">
            <p className="text-gray-600">
              총 <span className="font-semibold text-[#2d4739]">{filteredAll.length}</span>개의
              스토어
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {visibleStores.map((s) => {
              const accent = s.accentColor || '#2d4739';
              return (
                <div
                  key={s.id}
                  onClick={() => handleStoreClick(s.id, s.storeUrl)}
                  style={{ ['--store-accent' as any]: accent }}
                  className="group bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-lg hover:border-[var(--store-accent)] hover:-translate-y-1 transition-all duration-200 cursor-pointer overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--store-accent)]"
                  tabIndex={0}
                >
                  <div className="relative aspect-square overflow-hidden">
                    <img
                      src={s.image}
                      alt={s.name}
                      loading="lazy"
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-gray-900 text-sm md:text-base line-clamp-2 mb-1">
                      {s.name}
                    </h3>
                    <div className="flex flex-wrap gap-1 mb-2">
                      {s.upCategory && (
                        <span
                          style={{
                            backgroundColor: `${s.accentColor ?? '#2d4739'}20`,
                            color: s.accentColor ?? '#2d4739',
                          }}
                          className="text-xs px-2 py-1 rounded-full font-semibold"
                        >
                          {s.upCategory}
                        </span>
                      )}
                      {s.downCategory && (
                        <span
                          style={{
                            backgroundColor: `${s.accentColor ?? '#2d4739'}20`,
                            color: s.accentColor ?? '#2d4739',
                          }}
                          className="text-xs px-2 py-1 rounded-full font-semibold"
                        >
                          {s.downCategory}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-600 line-clamp-2 mb-3">{s.description}</p>
                    <p className="text-xs text-gray-500">
                      판매 {s.orderCount.toLocaleString()} · 조회 {s.viewCount.toLocaleString()}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          <div ref={sentinelRef} className="h-1" />
          {loading && (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#2d4739]" />
              <p className="mt-2 text-gray-600">스토어를 불러오는 중...</p>
            </div>
          )}
        </div>
      </div>

      {/* 모바일 정렬 바텀시트 */}
      {showSortSheet && (
        <div
          className="fixed inset-0 z-50"
          role="dialog"
          aria-modal="true"
          onClick={() => setShowSortSheet(false)}
        >
          {/* Dim */}
          <div className="absolute inset-0 bg-black/40" />
          {/* Sheet */}
          <div
            className="absolute inset-x-0 bottom-0 bg-white rounded-t-2xl p-4 pt-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto w-12 h-1.5 bg-gray-300 rounded-full mb-4" />
            <h4 className="text-base font-semibold mb-3">정렬</h4>
            <div className="flex flex-col divide-y">
              {sortOptions.map((opt) => {
                const active = opt.value === sortBy;
                return (
                  <button
                    key={opt.value}
                    onClick={() => {
                      setSortBy(opt.value);
                      setShowSortSheet(false);
                    }}
                    className="flex items-center justify-between py-3 text-left"
                  >
                    <span
                      className={`text-[15px] ${active ? 'text-[#2d4739] font-semibold' : 'text-gray-700'}`}
                    >
                      {opt.label}
                    </span>
                    {active && <Check className="w-5 h-5 text-[#2d4739]" />}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setShowSortSheet(false)}
              className="mt-4 w-full py-2 rounded-lg border border-gray-300 text-gray-700"
            >
              닫기
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MainStoresPage;
