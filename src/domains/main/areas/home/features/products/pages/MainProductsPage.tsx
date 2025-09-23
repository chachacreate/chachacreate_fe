import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Search, ChevronDown, X, Check } from 'lucide-react';
import Header from '@src/shared/areas/layout/features/header/Header';
import Mainnavbar from '@src/shared/areas/navigation/features/navbar/main/Mainnavbar';
import { legacyGet } from '@src/libs/request';

interface Product {
  id: number;
  name: string;
  price: number;
  image: string;
  categories: string[];
  orderCount?: number;
  viewCount?: number;
  storeName: string;
  storeUrl: string;
}

interface Category {
  id: number;
  name: string;
  subcategories: { id: number; name: string }[];
}

interface FilterOption {
  value: string;
  label: string;
}

type ApiEnvelope<T> = { status?: number; message?: string; data: T };
const unwrap = <T,>(resp: T | ApiEnvelope<T>): T => {
  const anyResp = resp as any;
  return anyResp && typeof anyResp === 'object' && 'data' in anyResp ? (anyResp.data as T) : (resp as T);
};

type HomeProductDTO = {
  productId: number;
  productName: string;
  price: number;
  pimgUrl?: string;
  saleCnt?: number;
  viewCnt?: number;
  storeName?: string;
  storeUrl?: string;
  typeCategoryName?: string;
  ucategoryName?: string;
  dcategoryName?: string;
  dcategoryId?: number;
};

type CategoryBaseResponse = {
  uCategory: { id: number; name: string }[];
};

type DCategoryItem = { id: number; name: string };

const sortOptions: FilterOption[] = [
  { value: 'latest', label: '최신순' },
  { value: 'popular', label: '주문 많은 순' },
  { value: 'views', label: '조회순' },
  { value: 'lowprice', label: '낮은가격순' },
  { value: 'highprice', label: '높은가격순' },
];

const MainProductsPage = () => {
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [sortBy, setSortBy] = useState('latest');
  const [searchTerm, setSearchTerm] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<number[]>([]);
  const [showCategoryFilter, setShowCategoryFilter] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  const [mounted, setMounted] = useState(false);
  const [showSortSheet, setShowSortSheet] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // 상품 조회
  const fetchProducts = useCallback(
    async (sort = 'latest', keyword = '', dcategoryIds: number[] = [], uIds: number[] = [], typeIds: number[] = []) => {
      setLoading(true);
      try {
        const qs = new URLSearchParams();
        if (sort) qs.set('sort', sort);
        if (keyword && keyword.trim()) qs.set('keyword', keyword.trim());

        typeIds.forEach((id) => qs.append('type', String(id)));
        uIds.forEach((id) => qs.append('u', String(id)));
        dcategoryIds.forEach((id) => qs.append('d', String(id)));

        const resp = await legacyGet<ApiEnvelope<HomeProductDTO[]>>(`/main/products?${qs.toString()}`);
        const raw = unwrap<HomeProductDTO[]>(resp) ?? [];

        const mapped: Product[] = raw.map((p) => ({
          id: p.productId,
          name: p.productName,
          price: p.price,
          image: p.pimgUrl || '/placeholder-image.jpg',
          categories: [p.typeCategoryName, p.ucategoryName, p.dcategoryName].filter(Boolean) as string[],
          orderCount: p.saleCnt ?? 0,
          viewCount: p.viewCnt ?? 0,
          storeName: p.storeName || '뜨락상회',
          storeUrl: p.storeUrl || 'main',
        }));

        setAllProducts(mapped);
        setTotalCount(mapped.length);
        setHasMore(false);
      } catch (err) {
        console.error('상품 불러오기 실패:', err);
        setAllProducts([]);
        setTotalCount(0);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // 초기 로드
  useEffect(() => {
    fetchProducts('latest', '', []);
    (async () => {
      try {
        const baseResp = await legacyGet<ApiEnvelope<CategoryBaseResponse>>(`/main/categories`);
        const base = unwrap<CategoryBaseResponse>(baseResp);
        const uList = base?.uCategory ?? [];
        setCategories(uList.map((u) => ({ id: u.id, name: u.name, subcategories: [] })));
      } catch (err) {
        console.error('카테고리 로드 실패:', err);
        setCategories([]);
      }
    })();
  }, [fetchProducts]);

  // d카테고리 로드
  useEffect(() => {
    if (!showCategoryFilter) return;
    const needNames = categories.filter((c) => c.subcategories.length === 0).map((c) => c.name);
    if (needNames.length === 0) return;

    (async () => {
      try {
        const tasks = needNames.map((name) =>
          legacyGet<ApiEnvelope<DCategoryItem[]>>(`/main/categories`, { uCategoryName: name })
            .then((r) => unwrap<DCategoryItem[]>(r))
            .catch(() => [] as DCategoryItem[])
        );
        const results = await Promise.all(tasks);

        setCategories((prev) =>
          prev.map((cat) => {
            if (cat.subcategories.length > 0) return cat;
            const idx = needNames.indexOf(cat.name);
            const dList = results[idx] ?? [];
            return { ...cat, subcategories: dList.map((d) => ({ id: d.id, name: d.name })) };
          })
        );
      } catch (e) {
        console.error('d카테고리 로드 실패:', e);
      }
    })();
  }, [showCategoryFilter, categories]);

  const handleCategoryChange = (id: number, checked: boolean) => {
    setSelectedCategories((prev) => (checked ? [...prev, id] : prev.filter((c) => c !== id)));
  };

  const handleSelectAllCategories = (uId: number, checked: boolean) => {
    const cat = categories.find((c) => c.id === uId);
    if (!cat) return;
    const subIds = cat.subcategories.map((s) => s.id);
    setSelectedCategories((prev) =>
      checked ? [...new Set([...prev, ...subIds])] : prev.filter((id) => !subIds.includes(id))
    );
  };

  const resetFilters = () => {
    setSelectedCategories([]);
    setSearchTerm('');
    setSortBy('latest');
    fetchProducts('latest', '', []);
  };

  useEffect(() => {
    fetchProducts(sortBy, searchTerm, selectedCategories);
  }, [selectedCategories, sortBy, searchTerm, fetchProducts]);

  const formatPrice = (price: number) => new Intl.NumberFormat('ko-KR').format(price);

  const selectedChips = useMemo(() => {
    const map = new Map<number, string>();
    categories.forEach((c) =>
      c.subcategories.forEach((s) => {
        if (selectedCategories.includes(s.id)) map.set(s.id, `${c.name} · ${s.name}`);
      })
    );
    return Array.from(map.entries());
  }, [categories, selectedCategories]);

  const isMobile = typeof window !== 'undefined' ? window.matchMedia('(max-width: 768px)').matches : false;

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <Mainnavbar />

      <div className="px-4 sm:px-6 xl:px-[240px] pb-12 md:pb-16">
        <div className="w-full max-w-[1440px] mx-auto py-8">
          {/* 헤더 */}
          <div className="mb-8">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2 ">
              전체 상품
            </h1>
            <p className="text-gray-600 hover:text-gray-800 transition-colors duration-300">
              다양한 상품을 만나보세요
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

          {/* 검색바 */}
          <div className="relative mb-6">
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="상품명으로 검색하세요"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2d4739] focus:border-transparent"
              />
            </div>
          </div>

          {/* 필터 바 (sticky 제거 → 일반 div) */}
          <div className="mb-8 border-b border-gray-100 bg-white">
            <div className="py-3 flex flex-col md:flex-row gap-3 md:gap-4 items-start md:items-center">
              {/* 정렬 */}
              {!isMobile ? (
                <div className="relative w-full max-w-[220px]">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="w-full appearance-none bg-white border border-gray-300 rounded-lg px-4 pr-10 py-2 md:py-2.5 focus:outline-none focus:ring-2 focus:ring-[#2d4739]"
                  >
                    {sortOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
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
                  <span>
                    정렬: {sortOptions.find((o) => o.value === sortBy)?.label ?? '최신순'}
                  </span>
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                </button>
              )}

              {/* 카테고리 토글 */}
              <button
                onClick={() => setShowCategoryFilter(!showCategoryFilter)}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                카테고리별
                <ChevronDown className={`w-4 h-4 transition-transform ${showCategoryFilter ? 'rotate-180' : ''}`} />
              </button>

              {/* 선택된 카테고리 칩 */}
              {selectedChips.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  {selectedChips.map(([id, label]) => (
                    <span key={id} className="inline-flex items-center gap-1 text-xs bg-[#2d4739]/10 text-[#2d4739] px-2 py-1 rounded-full">
                      {label}
                      <button onClick={() => setSelectedCategories((prev) => prev.filter((c) => c !== id))}>
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                  <button onClick={resetFilters} className="text-sm text-[#2d4739] hover:underline">
                    전체 해제
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* 카테고리 필터 */}
          {showCategoryFilter && categories.length > 0 && (
            <div className="mb-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
              {categories.map((category) => {
                const subIds = category.subcategories.map((s) => s.id);
                const selectedSub = selectedCategories.filter((id) => subIds.includes(id));
                const isAllSelected = subIds.length > 0 && selectedSub.length === subIds.length;

                return (
                  <div key={category.id} className="mb-4">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="font-medium text-gray-900">{category.name}</span>
                      <label className="flex items-center gap-1 text-sm text-gray-600">
                        <input
                          type="checkbox"
                          checked={isAllSelected}
                          onChange={(e) => handleSelectAllCategories(category.id, e.target.checked)}
                        />
                        전체 선택
                      </label>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                      {category.subcategories.map((sub) => (
                        <label key={sub.id} className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={selectedCategories.includes(sub.id)}
                            onChange={(e) => handleCategoryChange(sub.id, e.target.checked)}
                          />
                          {sub.name}
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
              <div className="flex justify-end">
                <button onClick={resetFilters} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">
                  ↻ 필터 초기화
                </button>
              </div>
            </div>
          )}

          {/* 상품 그리드 */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {allProducts.map((product) => (
              <div
                key={product.id}
                onClick={() => (window.location.href = `/${product.storeUrl}/products/${product.id}`)}
                className="group bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-lg cursor-pointer overflow-hidden"
              >
                <div className="relative aspect-square overflow-hidden">
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
                <div className="p-4">
                  <div className="flex flex-wrap gap-1 mb-2">
                    {product.categories.map((c, idx) => (
                      <span key={idx} className="text-xs bg-[#2d4739]/10 text-[#2d4739] px-2 py-1 rounded-full">
                        {c}
                      </span>
                    ))}
                  </div>
                  <h3 className="font-semibold text-gray-900 text-sm md:text-base line-clamp-2 mb-2">{product.name}</h3>
                  <p className="text-xs text-gray-500 mb-3">주문 {product.orderCount}회 · 조회 {product.viewCount}회</p>
                  <p className="text-lg font-extrabold text-[#2d4739]">{formatPrice(product.price)}원</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 모바일 정렬 바텀시트 */}
      {showSortSheet && (
        <div className="fixed inset-0 z-50" onClick={() => setShowSortSheet(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="absolute inset-x-0 bottom-0 bg-white rounded-t-2xl p-4 pt-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto w-12 h-1.5 bg-gray-300 rounded-full mb-4" />
            <h4 className="text-base font-semibold mb-3">정렬</h4>
            <div className="flex flex-col divide-y">
              {sortOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => {
                    setSortBy(opt.value);
                    setShowSortSheet(false);
                  }}
                  className="flex items-center justify-between py-3 text-left"
                >
                  <span className={`text-[15px] ${opt.value === sortBy ? 'text-[#2d4739] font-semibold' : 'text-gray-700'}`}>
                    {opt.label}
                  </span>
                  {opt.value === sortBy && <Check className="w-5 h-5 text-[#2d4739]" />}
                </button>
              ))}
            </div>
            <button onClick={() => setShowSortSheet(false)} className="mt-4 w-full py-2 rounded-lg border border-gray-300 text-gray-700">
              닫기
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MainProductsPage;
