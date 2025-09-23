import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { Search, Star, ChevronDown, AlertCircle, RefreshCw } from 'lucide-react';

import { legacyGet } from '@src/libs/request';
import Header from '@src/shared/areas/layout/features/header/Header';
import Storenavbar from '@src/shared/areas/navigation/features/navbar/store/Storenavbar';

interface Product {
  id: number;
  name: string;
  price: number;
  imageUrl: string;
  categories: string[];
  rating?: number;
  orderCount?: number;
  viewCount?: number;
}

interface Category {
  id: number;
  name: string;
  subcategories: { id: number; name: string }[];
}

interface StoreInfo {
  storeName: string;
  storeUrl: string;
}

interface FilterOption {
  value: string;
  label: string;
}

type ApiEnvelope<T> = { status?: number; message?: string; data: T };
const unwrap = <T,>(resp: T | ApiEnvelope<T>): T => {
  const anyResp = resp as any;
  return anyResp && typeof anyResp === 'object' && 'data' in anyResp
    ? (anyResp.data as T)
    : (resp as T);
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
  typeCategory: { id: number; name: string }[];
};

type DCategoryItem = { id: number; name: string };

const PAGE_SIZE = 9;

const sortOptions: FilterOption[] = [
  { value: 'latest', label: '최신순' },
  { value: 'popular', label: '인기순' },
  { value: 'lowprice', label: '낮은 가격순' },
  { value: 'highprice', label: '높은 가격순' },
];

const StoreProducts = () => {
  const { storeUrl } = useParams<{ storeUrl: string }>();

  const location = useLocation();
  const navigate = useNavigate();
  const didInitRef = useRef(false);

  const effectiveStoreUrl = useMemo(() => {
    if (storeUrl && storeUrl.trim()) return storeUrl;
    const segments = location.pathname.split('?')[0].split('/').filter(Boolean);
    const RESERVED = new Set(['legacy', 'api']);
    return segments.find((s) => !RESERVED.has(s)) || '';
  }, [storeUrl, location.pathname]);

  const [storeInfo, setStoreInfo] = useState<StoreInfo>({ storeName: '', storeUrl: '' });

  const [categories, setCategories] = useState<Category[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('latest');
  const [selectedCategories, setSelectedCategories] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [showCategoryFilter, setShowCategoryFilter] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // URL 동기화
  useEffect(() => {
    if (effectiveStoreUrl && storeInfo.storeUrl !== effectiveStoreUrl) {
      setStoreInfo((prev) => ({ ...prev, storeUrl: effectiveStoreUrl }));
    }
  }, [effectiveStoreUrl, storeInfo.storeUrl]);

  // 쿼리스트링 빌드
  const buildProductsURL = (sort: string, keyword: string, dIds: number[]) => {
    const qs = new URLSearchParams();
    if (sort) qs.set('sort', sort);
    if (keyword && keyword.trim()) qs.set('keyword', keyword.trim());
    dIds.forEach((id) => qs.append('d', String(id)));
    const q = qs.toString();
    return `/${effectiveStoreUrl}/products${q ? `?${q}` : ''}`;
  };

  // 상품 조회
  const fetchProducts = useCallback(
    async (page = 1, sort = 'latest', keyword = '', dcategoryIds: number[] = []) => {
      if (!effectiveStoreUrl) {
        setError('상품 로드를 위해 storeUrl이 필요합니다.');
        return;
      }
      setLoading(true);
      setError(null);

      try {
        const url = buildProductsURL(sort, keyword, dcategoryIds);
        const resp = await legacyGet<ApiEnvelope<HomeProductDTO[]>>(url);
        const raw = unwrap<HomeProductDTO[]>(resp) ?? [];

        if (!storeInfo.storeName && raw[0]?.storeName) {
          setStoreInfo((prev) => ({ ...prev, storeName: raw[0]!.storeName! }));
        }

        const mapped: Product[] = raw.map((it) => ({
          id: it.productId,
          name: it.productName,
          price: it.price,
          imageUrl: it.pimgUrl || '/placeholder-image.jpg',
          categories: [it.typeCategoryName, it.ucategoryName, it.dcategoryName].filter(
            Boolean
          ) as string[],
          orderCount: it.saleCnt ?? 0,
          viewCount: it.viewCnt ?? 0,
        }));

        const total = mapped.length;
        const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
        const safePage = Math.min(Math.max(1, page), pages);
        const start = (safePage - 1) * PAGE_SIZE;
        const end = start + PAGE_SIZE;

        setAllProducts(mapped.slice(start, end));
        setTotalCount(total);
        setTotalPages(pages);
        setCurrentPage(safePage);
      } catch (err: any) {
        console.error('상품 불러오기 실패:', err?.message ?? err);
        setError(err?.message || '상품을 불러올 수 없습니다.');
        setAllProducts([]);
        setTotalPages(1);
        setTotalCount(0);
      } finally {
        setLoading(false);
      }
    },
    [effectiveStoreUrl, storeInfo.storeName]
  );

  // 초기 로드: 전체상품 + 상위 u카테고리
  useEffect(() => {
    if (!effectiveStoreUrl) {
      setError('스토어 주소(storeUrl)를 경로에서 찾을 수 없습니다.');
      return;
    }
    if (didInitRef.current) return;
    didInitRef.current = true;

    fetchProducts(1, 'latest', '', []);

    (async () => {
      try {
        const baseResp = await legacyGet<ApiEnvelope<CategoryBaseResponse> | CategoryBaseResponse>(
          `/${effectiveStoreUrl}/categories`
        );
        const base = unwrap<CategoryBaseResponse>(baseResp);
        const uList = base?.uCategory ?? [];
        setCategories(uList.map((u) => ({ id: u.id, name: u.name, subcategories: [] })));
      } catch (err) {
        console.error('카테고리(상위) 로드 실패:', err);
        setCategories([]);
      }
    })();
  }, [effectiveStoreUrl, fetchProducts]);

  // "카테고리별" 열었을 때 d카테고리 병렬 로드 (1회/그룹)
  useEffect(() => {
    if (!showCategoryFilter) return;
    if (!effectiveStoreUrl) return;
    const needNames = categories.filter((c) => c.subcategories.length === 0).map((c) => c.name);
    if (needNames.length === 0) return;

    (async () => {
      try {
        const tasks = needNames.map((name) =>
          legacyGet<ApiEnvelope<DCategoryItem[]> | DCategoryItem[]>(
            `/${effectiveStoreUrl}/categories`,
            {
              uCategoryName: name,
            }
          )
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
        console.error('d카테고리 일괄 로드 실패:', e);
      }
    })();
  }, [showCategoryFilter, effectiveStoreUrl, categories]);

  // ================= 이벤트 핸들러 =================
  const handleProductClick = (productId: number) => {
    navigate(`/${effectiveStoreUrl}/products/${productId}`);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchProducts(1, sortBy, searchTerm, selectedCategories);
  };

  const handleSortChange = (newSort: string) => {
    setSortBy(newSort);
    setCurrentPage(1);
    fetchProducts(1, newSort, searchTerm, selectedCategories);
  };

  const handleCategoryChange = (categoryId: number, checked: boolean) => {
    setSelectedCategories((prev) =>
      checked ? [...prev, categoryId] : prev.filter((id) => id !== categoryId)
    );
    setCurrentPage(1);
  };

  const handleSelectAllCategories = (uId: number, checked: boolean) => {
    const cat = categories.find((c) => c.id === uId);
    if (!cat) return;
    const subIds = cat.subcategories.map((s) => s.id);

    setSelectedCategories((prev) =>
      checked ? [...new Set([...prev, ...subIds])] : prev.filter((id) => !subIds.includes(id))
    );

    setCurrentPage(1);
  };

  const resetFilters = () => {
    setSelectedCategories([]);
    setSearchTerm('');
    setSortBy('latest');
    setCurrentPage(1);
    fetchProducts(1, 'latest', '', []);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    fetchProducts(page, sortBy, searchTerm, selectedCategories);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const retryFetch = () => {
    setError(null);
    fetchProducts(currentPage, sortBy, searchTerm, selectedCategories);
  };

  // selectedCategories 첫 실행 스킵 (초기 마운트 시 중복 fetch 방지)
  const prevSelectedRef = useRef<number[] | null>(null);
  useEffect(() => {
    if (!didInitRef.current) return;
    if (prevSelectedRef.current === null) {
      prevSelectedRef.current = selectedCategories;
      return;
    }
    if (prevSelectedRef.current !== selectedCategories) {
      prevSelectedRef.current = selectedCategories;
      fetchProducts(1, sortBy, searchTerm, selectedCategories);
    }
  }, [selectedCategories]);

  // ================= 유틸 =================
  const formatPrice = (price: number) => new Intl.NumberFormat('ko-KR').format(price);

  const renderStars = (rating: number = 0) => {
    const stars = [];
    const full = Math.floor(rating);
    const half = rating % 1 !== 0;

    for (let i = 0; i < full; i++) {
      stars.push(<Star key={`f-${i}`} className="w-4 h-4 fill-amber-400 text-amber-400" />);
    }

    if (half) {
      stars.push(
        <div key="half" className="relative w-4 h-4">
          <Star className="w-4 h-4 text-gray-300" />
          <div className="absolute top-0 left-0 overflow-hidden w-1/2">
            <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
          </div>
        </div>
      );
    }

    const remaining = 5 - Math.ceil(rating);
    for (let i = 0; i < remaining; i++) {
      stars.push(<Star key={`e-${i}`} className="w-4 h-4 text-gray-300" />);
    }

    return stars;
  };

  const renderPagination = () => {
    if (totalPages <= 1) return null;

    const pages = [];
    const PAGE_LIMIT = 5;
    const currentPageGroup = Math.floor((currentPage - 1) / PAGE_LIMIT);
    const startPage = currentPageGroup * PAGE_LIMIT + 1;
    const endPage = Math.min(startPage + PAGE_LIMIT - 1, totalPages);

    // «
    pages.push(
      <button
        key="first"
        onClick={() => handlePageChange(1)}
        className="px-3 py-2 border border-gray-300 rounded-l-lg hover:bg-gray-50 disabled:opacity-50"
        disabled={currentPage === 1}
      >
        &lt;
      </button>
    );

    // numbers
    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <button
          key={i}
          onClick={() => handlePageChange(i)}
          className={`px-3 py-2 border-t border-b border-gray-300 hover:bg-gray-50 ${
            i === currentPage ? 'bg-[#2d4739] text-white' : ''
          }`}
        >
          {i}
        </button>
      );
    }

    // »
    const nextGroupStart = startPage + PAGE_LIMIT;
    const targetPage = nextGroupStart <= totalPages ? nextGroupStart : totalPages;

    pages.push(
      <button
        key="last"
        onClick={() => handlePageChange(targetPage)}
        className="px-3 py-2 border border-gray-300 rounded-r-lg hover:bg-gray-50 disabled:opacity-50"
        disabled={currentPage === totalPages}
      >
        &gt;
      </button>
    );

    return <div className="flex justify-center items-center">{pages}</div>;
  };

  // ================= 렌더링 =================

  if (error) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <Storenavbar />
        <div className="px-4 sm:px-6 xl:px-[240px]">
          <div className="w-full max-w-[1440px] mx-auto py-8">
            <div className="text-center py-16">
              <AlertCircle className="w-16 h-16 mx-auto mb-4 text-red-500" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">오류가 발생했습니다</h3>
              <p className="text-gray-600 mb-4">{error}</p>
              <button
                onClick={retryFetch}
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#2d4739] text-white rounded-lg hover:bg-[#2d4739]/90"
              >
                <RefreshCw className="w-4 h-4" />
                다시 시도
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <Storenavbar />

      {/* 메인 컨테이너 */}
      <div className="px-4 sm:px-6 xl:px-[240px]">
        <div className="w-full max-w-[1440px] mx-auto py-8">
          {/* 헤더 */}
          <div className="mb-8">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2 group-hover:underline">
              {storeInfo.storeName || '스토어'} 전체 상품
            </h1>
            <p className="text-gray-600">다양한 상품을 만나보세요</p>
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
            <form onSubmit={handleSearch}>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="상품명으로 검색하세요"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2d4739] focus:border-transparent"
                />
                <button
                  type="submit"
                  className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-1 bg-[#2d4739] text-white rounded-md hover:bg-[#2d4739]/90 text-sm"
                >
                  검색
                </button>
              </div>
            </form>
          </div>

          {/* 필터 바 */}
          <div className="mb-8 border-b border-gray-100 bg-white">
            <div className="py-3 flex flex-col md:flex-row gap-3 md:gap-4 items-start md:items-center">
              {/* 정렬 */}
              <div className="relative w-full max-w-[220px]">
                <select
                  value={sortBy}
                  onChange={(e) => handleSortChange(e.target.value)}
                  className="w-full appearance-none bg-white border border-gray-300 rounded-lg px-4 pr-10 py-2 md:py-2.5 focus:outline-none focus:ring-2 focus:ring-[#2d4739]"
                  disabled={loading}
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

              {/* 카테고리 필터 토글 */}
              <button
                onClick={() => setShowCategoryFilter(!showCategoryFilter)}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                disabled={loading}
                aria-expanded={showCategoryFilter}
              >
                카테고리별
                <ChevronDown
                  className={`w-4 h-4 transition-transform ${showCategoryFilter ? 'rotate-180' : ''}`}
                />
              </button>

              {/* 선택된 필터 표시 */}
              {selectedCategories.length > 0 && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span>선택된 카테고리: {selectedCategories.length}개</span>
                  <button onClick={resetFilters} className="text-[#2d4739] hover:underline">
                    전체 해제
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* 카테고리 필터 섹션 */}
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
                          className="rounded border-gray-300"
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
                            className="rounded border-gray-300"
                          />
                          {sub.name}
                        </label>
                      ))}

                      {category.subcategories.length === 0 && (
                        <span className="text-sm text-gray-500 col-span-full">
                          하위 카테고리가 없습니다.
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}

              <div className="flex justify-end">
                <button
                  onClick={resetFilters}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
                >
                  ↻ 필터 초기화
                </button>
              </div>
            </div>
          )}

          {/* 총 개수 */}
          <div className="mb-6">
            <p className="text-gray-600">
              총 <span className="font-semibold text-[#2d4739]">{totalCount.toLocaleString()}</span>
              개의 상품
              {selectedCategories.length > 0 && (
                <span className="text-sm text-gray-500 ml-2">(필터 적용됨)</span>
              )}
            </p>
          </div>

          {/* 상품 그리드 */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {allProducts.map((product) => {
              const order = product.orderCount ?? 0;
              const view = product.viewCount ?? 0;
              const bothZero = order === 0 && view === 0;

              return (
                <div
                  key={product.id}
                  onClick={() => handleProductClick(product.id)}
                  className="group bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-lg hover:border-[#2d4739]/40 hover:-translate-y-1 transition-all duration-200 cursor-pointer overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2d4739]/40"
                  tabIndex={0}
                  role="button"
                  aria-label={`${product.name} 상세로 이동`}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleProductClick(product.id);
                    }
                  }}
                >
                  {/* 이미지 영역 */}
                  <div className="relative aspect-square overflow-hidden">
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      loading="lazy"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = '/placeholder-image.jpg';
                      }}
                    />
                    {/* 레이팅 배지 (옵션) */}
                    {product.rating && (
                      <div className="absolute top-3 left-3 flex items-center gap-1 rounded-full bg-black/60 text-white text-xs px-2 py-1 backdrop-blur-sm">
                        <span className="flex">{renderStars(product.rating)}</span>
                        <span className="opacity-90">({product.rating})</span>
                      </div>
                    )}
                  </div>

                  {/* 카드 본문 */}
                  <div className="p-4">
                    <div className="flex flex-wrap gap-1 mb-2">
                      {product.categories.map((category, index) => (
                        <span
                          key={index}
                          className="text-xs bg-[#2d4739]/10 text-[#2d4739] px-2 py-1 rounded-full"
                        >
                          {category}
                        </span>
                      ))}
                    </div>

                    <h3 className="font-semibold text-gray-900 text-sm md:text-base line-clamp-2 mb-2">
                      {product.name}
                    </h3>

                    {/* 주문/조회: 항상 둘 다 노출 (0도 '0회'로) */}
                    <p className="text-xs text-gray-500 mb-3">
                      주문 {(product.orderCount ?? 0).toLocaleString()}회 · 조회 {(product.viewCount ?? 0).toLocaleString()}회
                    </p>

                    <div className="flex items-center justify-between">
                      <p className="text-lg font-extrabold text-[#2d4739]">
                        {formatPrice(product.price)}원
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 로딩 */}
          {loading && (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#2d4739]" />
              <p className="mt-2 text-gray-600">상품을 불러오는 중...</p>
            </div>
          )}

          {/* 결과 없음 */}
          {!loading && allProducts.length === 0 && !error && (
            <div className="text-center py-16">
              <div className="text-gray-400 mb-4">
                <Search className="w-16 h-16 mx-auto mb-4" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">검색 결과가 없습니다</h3>
              <p className="text-gray-600 mb-4">다른 검색어나 필터를 시도해보세요</p>
              {(searchTerm || selectedCategories.length > 0) && (
                <button
                  onClick={resetFilters}
                  className="px-4 py-2 bg-[#2d4739] text-white rounded-lg hover:bg-[#2d4739]/90"
                >
                  필터 초기화
                </button>
              )}
            </div>
          )}

          {/* 페이지네이션 */}
          {!loading && allProducts.length > 0 && (
            <div className="mt-8">{renderPagination()}</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StoreProducts;