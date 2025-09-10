import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Search, Star, ChevronDown } from 'lucide-react';
import Header from '@src/shared/areas/layout/features/header/Header';
import Mainnavbar from '@src/shared/areas/navigation/features/navbar/main/Mainnavbar';
import { legacyGet } from '@src/libs/request';

interface Product {
  id: number;
  name: string;
  price: number;
  image: string;
  /** 카테고리 value 값 저장: [메인, 서브] (예: ['electronics','phone']) */
  categories: number[];
  rating: number;
  orderCount: number;
  viewCount: number;
  storeName: string;
}

interface FilterOption {
  value: string;
  label: string;
}

interface CategoryOption {
  value: string;
  label: string;
  subCategories: { value: string; label: string }[];
}

const PAGE_SIZE = 12;

const UP_CATEGORY_NAME_TO_ID: Record<string, number> = {
  패션잡화: 1,
  '인테리어 소품': 2,
  악세서리: 3,
  '케이스/문구': 4,
  기타: 5,
};

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

const sortOptions: FilterOption[] = [
  { value: 'latest', label: '최신순' },
  { value: 'popular', label: '주문 많은 순' },
  { value: 'views', label: '조회순' },
  { value: 'rating', label: '평점순' },
  { value: 'price_low', label: '낮은가격순' },
  { value: 'price_high', label: '높은가격순' },
];

/** value -> label 변환용 빠른 룩업 */
const VALUE_TO_LABEL: Record<string, string> = (() => {
  const m: Record<string, string> = {};
  categoryOptions.forEach((cat) => {
    m[cat.value] = cat.label;
    cat.subCategories.forEach((sub) => (m[sub.value] = sub.label));
  });
  return m;
})();

const MainProductsPage = () => {
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('latest');
  const [selectedMainCategory, setSelectedMainCategory] = useState('all');
  const [selectedSubCategory, setSelectedSubCategory] = useState('all');
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);

  async function fetchAllProducts(params?: {
    type?: string; // 배열 → 단일 문자열
    d?: string;
    u?: string;
    keyword?: string;
    sort?: string;
  }): Promise<Product[]> {
    const response = await legacyGet<{ status: number; message: string; data: any[] }>(
      '/main/products',
      params
    );
    const productsData = Array.isArray(response.data) ? response.data : [];

    return productsData.map((p) => ({
      id: p.productId,
      name: p.productName,
      price: p.price,
      image: p.pimgUrl,
      categories: [UP_CATEGORY_NAME_TO_ID[p.ucategoryName] ?? 5, p.dcategoryId ?? 0],
      rating: p.rating ?? 0,
      orderCount: p.saleCnt ?? 0,
      viewCount: p.viewCnt ?? 0,
      storeName: p.storeName || '뜨락상회',
    }));
  }

  useEffect(() => {
    async function loadProducts() {
      setLoading(true);
      try {
        const products = await fetchAllProducts({
          type: selectedMainCategory !== 'all' ? String(selectedMainCategory) : undefined,
          d: selectedSubCategory !== 'all' ? String(selectedSubCategory) : undefined,
          keyword: searchTerm || undefined,
          sort: sortBy || undefined,
        });
        setAllProducts(products);
        setPage(1);
      } catch (err) {
        console.error('상품 불러오기 실패', err);
        setAllProducts([]);
      } finally {
        setLoading(false);
      }
    }

    loadProducts();
  }, [selectedMainCategory, selectedSubCategory, searchTerm, sortBy]);

  const filteredAll = useMemo(() => {
    return allProducts.filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.categories.some((catId) =>
          VALUE_TO_LABEL[String(catId)]?.toLowerCase().includes(searchTerm.toLowerCase())
        );

      const categoryOk =
        (selectedMainCategory === 'all' || p.categories[0] === Number(selectedMainCategory)) &&
        (selectedSubCategory === 'all' || p.categories[1] === Number(selectedSubCategory));

      return matchesSearch && categoryOk;
    });
  }, [allProducts, searchTerm, selectedMainCategory, selectedSubCategory]);

  // 이후 정렬 로직도 그대로 적용
  const sortedFilteredAll = useMemo(() => {
    const data = [...filteredAll];
    switch (sortBy) {
      case 'latest':
        data.sort((a, b) => b.id - a.id);
        break;
      case 'popular':
        data.sort((a, b) => b.orderCount - a.orderCount);
        break;
      case 'views':
        data.sort((a, b) => b.viewCount - a.viewCount);
        break;
      case 'rating':
        data.sort((a, b) => b.rating - a.rating);
        break;
      case 'price_low':
        data.sort((a, b) => a.price - b.price);
        break;
      case 'price_high':
        data.sort((a, b) => b.price - a.price);
        break;
    }
    return data;
  }, [filteredAll, sortBy]);

  /** 메인 카테고리 변경 시 하위카테고리 초기화 + 페이지 리셋 */
  useEffect(() => {
    const currentCategory = categoryOptions.find((c) => c.value === selectedMainCategory);
    if (currentCategory && currentCategory.subCategories.length > 0) {
      setSelectedSubCategory(currentCategory.subCategories[0].value); // 첫 번째 서브카테고리
    } else {
      setSelectedSubCategory('all'); // 서브카테고리 없으면 'all'
    }
    setPage(1);
  }, [selectedMainCategory]);

  /** 검색/필터/정렬 변경 시 페이지 리셋 */
  useEffect(() => {
    setPage(1);
  }, [searchTerm, sortBy, selectedSubCategory]);

  // 페이지 단위 slice
  useEffect(() => {
    const end = page * PAGE_SIZE;
    setFilteredProducts(sortedFilteredAll.slice(0, end));
    setHasMore(end < sortedFilteredAll.length);
  }, [sortedFilteredAll, page]);

  /** 무한 스크롤 */
  const loadMoreProducts = useCallback(() => {
    if (loading || !hasMore) return;
    setLoading(true);
    setTimeout(() => {
      setPage((prev) => prev + 1);
      setLoading(false);
    }, 500);
  }, [loading, hasMore]);

  useEffect(() => {
    const onScroll = () => {
      const nearBottom =
        window.innerHeight + document.documentElement.scrollTop >=
        document.documentElement.offsetHeight - 600;
      if (nearBottom) loadMoreProducts();
    };
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, [loadMoreProducts]);

  /** 화면 표기용: value -> label */
  const labelOf = (value: number | string) => VALUE_TO_LABEL[String(value)] ?? String(value);

  /** 총 카운트(필터 반영) */
  const totalFilteredCount = filteredAll.length;

  const currentCategory = categoryOptions.find((c) => c.value === selectedMainCategory);
  const subCategories = currentCategory?.subCategories ?? [];

  const formatPrice = (price: number) => new Intl.NumberFormat('ko-KR').format(price);

  const renderStars = (rating: number) => {
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
    const rem = 5 - Math.ceil(rating);
    for (let i = 0; i < rem; i++) {
      stars.push(<Star key={`e-${i}`} className="w-4 h-4 text-gray-300" />);
    }
    return stars;
  };

  const handleProductClick = (productId: string) => {
    window.location.href = `/main/products/${productId}`;
  };

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <Mainnavbar />

      {/* 🔶 바깥 240px 패딩 + 내부 1440 영역 */}
      <div className="px-4 sm:px-6 xl:px-[240px]">
        <div className="w-full max-w-[1440px] mx-auto py-8">
          {/* 헤더 */}
          <div className="mb-8">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">상품 둘러보기</h1>
            <p className="text-gray-600">다양한 상품을 만나보세요</p>
          </div>

          {/* 검색바 */}
          <div className="relative mb-6">
            <div className="relative">
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

          {/* 카테고리 탭 */}
          <div className="mb-6">
            <div className="flex flex-wrap gap-2 mb-4">
              {categoryOptions.map((category) => (
                <button
                  key={category.value}
                  onClick={() => setSelectedMainCategory(category.value)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    selectedMainCategory === category.value
                      ? 'bg-[#2d4739] text-white'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {category.label}
                </button>
              ))}
            </div>

            {/* 서브카테고리 */}
            {selectedMainCategory !== 'all' && subCategories.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {subCategories.map((sub) => (
                  <button
                    key={sub.value}
                    onClick={() => setSelectedSubCategory(sub.value)}
                    className={`px-3 py-1.5 rounded-full text-xs transition-colors ${
                      selectedSubCategory === sub.value
                        ? 'bg-[#2d4739]/10 text-[#2d4739] border border-[#2d4739]'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {sub.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 필터 바 */}
          <div className="flex flex-col md:flex-row gap-4 mb-8">
            {/* 정렬 */}
            <div className="relative w-full max-w-[220px]">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="
                    w-full appearance-none bg-white border border-gray-300 rounded-lg
                    px-4 md:pr-10 pr-9  /* 아이콘 자리 확보 (모바일은 살짝 줄임) */
                    py-2 md:py-2.5
                    focus:outline-none focus:ring-2 focus:ring-[#2d4739]
                    "
              >
                {sortOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              {/* ▼ 아이콘: 항상 select '안'쪽에 중앙 정렬 */}
              <span
                className="
                    pointer-events-none absolute inset-y-0
                    right-2 md:right-3
                    flex items-center
                    "
              >
                <ChevronDown className="w-4 h-4 text-gray-400" />
              </span>
            </div>
          </div>

          {/* 총 개수 */}
          <div className="mb-6">
            <p className="text-gray-600">
              총 <span className="font-semibold text-[#2d4739]">{totalFilteredCount}</span>개의 상품
            </p>
          </div>

          {/* 상품 그리드 */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {filteredProducts.map((product) => (
              <div
                key={product.id}
                onClick={() => handleProductClick(String(product.id))}
                // 더 눈에 띄게: 테두리 + hover 강조 + 살짝 상승
                className="group bg-white rounded-xl border border-gray-200 shadow-sm
                            hover:shadow-lg hover:border-[#2d4739]/40 hover:-translate-y-1
                            transition-all duration-200 cursor-pointer overflow-hidden focus:outline-none
                            focus-visible:ring-2 focus-visible:ring-[#2d4739]/40"
                tabIndex={0}
              >
                {/* 이미지 영역: 호버 시 확대, 좌상단 레이팅 배지 */}
                <div className="relative aspect-square overflow-hidden">
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    loading="lazy"
                  />
                  {/* 레이팅 배지 */}
                  <div
                    className="absolute top-3 left-3 flex items-center gap-1 rounded-full
                                    bg-black/60 text-white text-xs px-2 py-1 backdrop-blur-sm"
                  >
                    <span className="flex">{renderStars(product.rating)}</span>
                    <span className="opacity-90">({product.rating})</span>
                  </div>
                </div>

                {/* 카드 본문 */}
                <div className="p-4">
                  {/* 카테고리 칩 */}
                  <div className="flex flex-wrap gap-1 mb-2">
                    <span className="text-xs bg-[#2d4739]/10 text-[#2d4739] px-2 py-1 rounded-full">
                      {labelOf(product.categories[0])}
                    </span>
                    <span className="text-xs bg-[#2d4739]/10 text-[#2d4739] px-2 py-1 rounded-full">
                      {labelOf(product.categories[1])}
                    </span>
                  </div>

                  {/* 상품명 */}
                  <h3 className="font-semibold text-gray-900 text-sm md:text-base line-clamp-2 mb-2">
                    {product.name}
                  </h3>

                  {/* 메타 정보 */}
                  <p className="text-xs text-gray-500 mb-3">
                    주문 {product.orderCount}회 · 조회 {product.viewCount}회
                  </p>

                  {/* 가격 & 스토어 */}
                  <div className="flex items-center justify-between">
                    <p className="text-lg font-extrabold text-[#2d4739]">
                      {formatPrice(product.price)}원
                    </p>
                  </div>
                  <p className="text-sm text-gray-500 mt-2">{product.storeName}</p>
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

          {/* 더 이상 없음 */}
          {!hasMore && !loading && filteredProducts.length > 0 && (
            <div className="text-center py-8">
              <p className="text-gray-600">모든 상품을 확인했습니다.</p>
            </div>
          )}

          {/* 결과 없음 */}
          {filteredProducts.length === 0 && !loading && (
            <div className="text-center py-16">
              <div className="text-gray-400 mb-4">
                <Search className="w-16 h-16 mx-auto mb-4" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">검색 결과가 없습니다</h3>
              <p className="text-gray-600">다른 검색어나 필터를 시도해보세요</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MainProductsPage;
