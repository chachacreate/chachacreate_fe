import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Search, Star, ChevronDown, Store, AlertCircle, RefreshCw } from 'lucide-react';
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

interface ApiResponse {
  products: Product[];
  totalPages: number;
  totalCount: number;
  currentPage: number;
}

const PAGE_SIZE = 9;

const sortOptions: FilterOption[] = [
  { value: 'latest', label: '최신순' },
  { value: 'popular', label: '인기순' },
  { value: 'lowprice', label: '낮은 가격순' },
  { value: 'highprice', label: '높은 가격순' },
];

const StoreProducts = () => {
  const { storeUrl } = useParams<{ storeUrl: string }>();
  
  // State 관리
  const [storeInfo, setStoreInfo] = useState<StoreInfo>({ 
    storeName: '', 
    storeUrl: storeUrl || '' 
  });
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

  // API 호출 함수들
  const fetchStoreInfo = useCallback(async () => {
    if (!storeUrl) return;
    
    try {
      setError(null);
      const data = await legacyGet<{ storeName: string }>(`/legacy/store/${storeUrl}/name`);
      setStoreInfo(prev => ({ ...prev, storeName: data.storeName }));
    } catch (error) {
      console.error('스토어 정보 가져오기 실패:', error);
      setError('스토어 정보를 불러올 수 없습니다.');
    }
  }, [storeUrl]);

  const fetchCategories = useCallback(async () => {
    if (!storeUrl) return;

    try {
      setError(null);
      console.log('카테고리 요청:', `/legacy/store/${storeUrl}/categories`);
      
      const data = await legacyGet<Category[]>(`/legacy/store/${storeUrl}/categories`);
      console.log('카테고리 응답:', data);
      
      setCategories(data || []);
    } catch (error) {
      console.error('카테고리 가져오기 실패:', error);
      // 카테고리는 실패해도 상품 조회에는 영향 없도록 에러를 설정하지 않음
      setCategories([]);
    }
  }, [storeUrl]);

  const fetchProducts = useCallback(async (
    page = 1, 
    sort = 'latest', 
    keyword = '', 
    categoryIds: number[] = []
  ) => {
    if (!storeUrl) return;

    setLoading(true);
    setError(null);
    
    try {
      const params: Record<string, any> = {
        page,
        sort,
        size: PAGE_SIZE,
      };
      
      if (keyword.trim()) {
        params.query = keyword.trim();
      }
      
      if (categoryIds.length > 0) {
        params.categories = categoryIds.join(',');
      }

      const data = await legacyGet<ApiResponse>(`/legacy/store/${storeUrl}/products`, params);
      
      setAllProducts(data.products || []);
      setTotalPages(data.totalPages || 1);
      setTotalCount(data.totalCount || 0);
      setCurrentPage(data.currentPage || page);
      
    } catch (error) {
      console.error('상품 불러오기 실패:', error);
      setError('상품을 불러올 수 없습니다.');
      setAllProducts([]);
      setTotalPages(1);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, [storeUrl]);

  // 초기 데이터 로드
  useEffect(() => {
    if (storeUrl) {
      fetchStoreInfo();
      fetchCategories();
    }
  }, [storeUrl, fetchStoreInfo, fetchCategories]);

  // 상품 데이터 로드 (필터/정렬 변경 시)
  useEffect(() => {
    if (storeUrl) {
      fetchProducts(currentPage, sortBy, searchTerm, selectedCategories);
    }
  }, [fetchProducts, currentPage, sortBy, searchTerm, selectedCategories, storeUrl]);

  // 이벤트 핸들러들
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    // fetchProducts는 useEffect에서 자동 호출됨
  };

  const handleSortChange = (newSort: string) => {
    setSortBy(newSort);
    setCurrentPage(1);
  };

  const handleCategoryChange = (categoryId: number, checked: boolean) => {
    setSelectedCategories(prev => {
      const newCategories = checked 
        ? [...prev, categoryId]
        : prev.filter(id => id !== categoryId);
      return newCategories;
    });
    setCurrentPage(1);
  };

  const handleSelectAllCategories = (mainCategoryId: number, checked: boolean) => {
    const category = categories.find(cat => cat.id === mainCategoryId);
    if (!category) return;

    const subcategoryIds = category.subcategories.map(sub => sub.id);
    
    setSelectedCategories(prev => {
      if (checked) {
        // 중복 제거하여 추가
        const uniqueIds = subcategoryIds.filter(id => !prev.includes(id));
        return [...prev, ...uniqueIds];
      } else {
        // 해당 서브카테고리들 제거
        return prev.filter(id => !subcategoryIds.includes(id));
      }
    });
    setCurrentPage(1);
  };

  const resetFilters = () => {
    setSelectedCategories([]);
    setSearchTerm('');
    setSortBy('latest');
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleProductClick = (productId: number) => {
    window.location.href = `/${storeUrl}/products/${productId}`;
  };

  const retryFetch = () => {
    setError(null);
    fetchStoreInfo();
    fetchCategories();
    fetchProducts(currentPage, sortBy, searchTerm, selectedCategories);
  };

  // 유틸리티 함수들
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ko-KR').format(price);
  };

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

    // 첫 페이지로
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

    // 숫자 버튼들
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

    // 다음 그룹 또는 마지막 페이지로
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

  // 에러 상태 렌더링
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
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
              {storeInfo.storeName || '스토어'} 전체 상품
            </h1>
            <p className="text-gray-600">다양한 상품을 만나보세요</p>
          </div>

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
          <div className="flex flex-col md:flex-row gap-4 mb-8">
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
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              disabled={loading}
            >
              카테고리별 
              <ChevronDown className={`w-4 h-4 transition-transform ${showCategoryFilter ? 'rotate-180' : ''}`} />
            </button>

            {/* 선택된 필터 표시 */}
            {selectedCategories.length > 0 && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span>선택된 카테고리: {selectedCategories.length}개</span>
                <button
                  onClick={resetFilters}
                  className="text-[#2d4739] hover:underline"
                >
                  전체 해제
                </button>
              </div>
            )}
          </div>

          {/* 카테고리 필터 섹션 */}
          {showCategoryFilter && categories.length > 0 && (
            <div className="mb-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
              {categories.map((category) => {
                const subcategoryIds = category.subcategories.map(sub => sub.id);
                const selectedSubcategories = selectedCategories.filter(id => subcategoryIds.includes(id));
                const isAllSelected = subcategoryIds.length > 0 && selectedSubcategories.length === subcategoryIds.length;
                
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
              총 <span className="font-semibold text-[#2d4739]">{totalCount.toLocaleString()}</span>개의 상품
              {selectedCategories.length > 0 && (
                <span className="text-sm text-gray-500 ml-2">
                  (필터 적용됨)
                </span>
              )}
            </p>
          </div>

          {/* 상품 그리드 */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {allProducts.map((product) => (
              <div
                key={product.id}
                onClick={() => handleProductClick(product.id)}
                className="group bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-lg hover:border-[#2d4739]/40 hover:-translate-y-1 transition-all duration-200 cursor-pointer overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2d4739]/40"
                tabIndex={0}
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
                      target.src = '/placeholder-image.jpg'; // 기본 이미지로 대체
                    }}
                  />
                  {/* 레이팅 배지 */}
                  {product.rating && (
                    <div className="absolute top-3 left-3 flex items-center gap-1 rounded-full bg-black/60 text-white text-xs px-2 py-1 backdrop-blur-sm">
                      <span className="flex">{renderStars(product.rating)}</span>
                      <span className="opacity-90">({product.rating})</span>
                    </div>
                  )}
                </div>

                {/* 카드 본문 */}
                <div className="p-4">
                  {/* 카테고리 칩 */}
                  <div className="flex flex-wrap gap-1 mb-2">
                    {product.categories.slice(0, 2).map((category, index) => (
                      <span
                        key={index}
                        className="text-xs bg-[#2d4739]/10 text-[#2d4739] px-2 py-1 rounded-full"
                      >
                        {category}
                      </span>
                    ))}
                    {product.categories.length > 2 && (
                      <span className="text-xs text-gray-400 px-1">
                        +{product.categories.length - 2}
                      </span>
                    )}
                  </div>

                  {/* 상품명 */}
                  <h3 className="font-semibold text-gray-900 text-sm md:text-base line-clamp-2 mb-2">
                    {product.name}
                  </h3>

                  {/* 메타 정보 */}
                  {(product.orderCount || product.viewCount) && (
                    <p className="text-xs text-gray-500 mb-3">
                      {product.orderCount && `주문 ${product.orderCount.toLocaleString()}회`}
                      {product.orderCount && product.viewCount && ' · '}
                      {product.viewCount && `조회 ${product.viewCount.toLocaleString()}회`}
                    </p>
                  )}

                  {/* 가격 */}
                  <div className="flex items-center justify-between">
                    <p className="text-lg font-extrabold text-[#2d4739]">
                      {formatPrice(product.price)}원
                    </p>
                  </div>
                </div>
              </div>
            ))}
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
            <div className="mt-8">
              {renderPagination()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StoreProducts;