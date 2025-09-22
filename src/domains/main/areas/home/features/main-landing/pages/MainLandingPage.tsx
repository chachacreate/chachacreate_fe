import { useState, useEffect } from 'react';
import { ArrowRight } from 'lucide-react';
import Header from '@src/shared/areas/layout/features/header/Header';
import Mainnavbar from '@src/shared/areas/navigation/features/navbar/main/Mainnavbar';
import Footer from '@src/shared/areas/layout/features/footer/Footer';
import { ChevronDown, X } from 'lucide-react';
import { legacyGet } from '@src/libs/request';
import { Link } from 'react-router-dom';
interface Store {
  storeId: string;
  storeUrl: string;
  storeName: string;
  logoImg: string;
  categoryName: string;
  storeDetail: string;
}

interface Product {
  productId: string;
  storeUrl: string;
  productName: string;
  pimgUrl: string;
  price: number | null;
  typeCategoryName: string;
  ucategoryName: string;
  dcategoryName: string;
}

interface MainHomeData {
  bestStore: Store[];
  bestProduct: Product[];
  newProduct: Product[];
}

const MainLandingPage = () => {
  const [bannerIndex, setBannerIndex] = useState(0);
  const [storeIndex, setStoreIndex] = useState(0);
  const [productIndex, setProductIndex] = useState(0);
  const [expandedStore, setExpandedStore] = useState<string | null>(null);

  const [mainData, setMainData] = useState<MainHomeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMainHomeInfo = async () => {
    try {
      setLoading(true);
      const result = await legacyGet<{ data: MainHomeData }>('/main');

      const filteredData = {
        ...result.data,
        bestStore: result.data.bestStore.filter((store: any) => store.storeName !== null),
      };

      setMainData(filteredData);
      setError(null);
    } catch (err) {
      console.error('메인 데이터 조회 실패:', err);
      setError('데이터를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleStoreClick = async (storeId: string, storeUrl: string) => {
    try {
      await legacyGet(`/main/store/click/${storeId}`);
    } catch (err) {
      console.error('스토어 클릭 추적 실패:', err);
    } finally {
      window.location.href = `/${storeUrl}`;
    }
  };

  const handleProductClick = async (productId: string, storeUrl: string = 'main') => {
    try {
      await legacyGet(`/click/${productId}`);
    } catch (err) {
      console.error('상품 클릭 추적 실패:', err);
    } finally {
      window.location.href = `/${storeUrl}/products/${productId}`;
    }
  };

  const formatPrice = (price: number | null): string => {
    return price ? `${price.toLocaleString()}원` : '가격 정보 없음';
  };

  useEffect(() => {
    const bannerInterval = setInterval(() => {
      setBannerIndex((prev) => (prev + 1) % 3);
    }, 4000);
    return () => clearInterval(bannerInterval);
  }, []);

  useEffect(() => {
    const storeInterval = setInterval(() => {
      setStoreIndex((prev) => (prev + 1) % 2);
    }, 3000);
    return () => clearInterval(storeInterval);
  }, []);

  useEffect(() => {
    const productInterval = setInterval(() => {
      setProductIndex((prev) => (prev + 1) % 2);
    }, 3500);
    return () => clearInterval(productInterval);
  }, []);

  useEffect(() => {
    fetchMainHomeInfo();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen">
        <Header />
        <Mainnavbar />
        <main className="max-w-[1440px] mx-auto px-4 py-8 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2d4739] mx-auto mb-4"></div>
            <p className="text-gray-600">데이터를 불러오는 중...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen">
        <Header />
        <Mainnavbar />
        <main className="max-w-[1440px] mx-auto px-4 py-8 flex items-center justify-center">
          <div className="text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={fetchMainHomeInfo}
              className="bg-[#2d4739] text-white px-4 py-2 rounded-lg hover:bg-[#1e3428] transition-colors"
            >
              다시 시도
            </button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const topRankStore = mainData?.bestStore[0];
  const bestStores = mainData?.bestStore || [];
  const bestProducts = mainData?.bestProduct || [];
  const newProducts = mainData?.newProduct || [];

  return (
    <div className="min-h-screen">
      <Header />
      <Mainnavbar />

      <main className="max-w-[1440px] mx-auto px-4 py-4 sm:py-8 space-y-6 sm:space-y-10">
        {/* 배너 영역 */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 relative isolate">
          <div className="lg:col-span-2 relative overflow-hidden rounded-xl sm:rounded-2xl shadow-lg sm:shadow-2xl bg-gray-200 h-96 sm:h-[500px] lg:h-[500px]">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center text-gray-600 px-4">
                <h2 className="text-xl sm:text-2xl lg:text-4xl font-bold mb-2">
                  자동 스와이프 광고 영역
                </h2>
                <p className="text-sm sm:text-lg lg:text-xl">3개 배너 자동 전환</p>
              </div>
            </div>
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex space-x-2">
              {[0, 1, 2].map((index) => (
                <button
                  key={index}
                  className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full transition-all ${index === bannerIndex ? 'bg-gray-800' : 'bg-gray-400'}`}
                  onClick={() => setBannerIndex(index)}
                />
              ))}
            </div>
          </div>

          <div className="space-y-4 sm:space-y-6 flex flex-col">
            {/* 금주의 인기스토어 */}
            <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-lg hover:shadow-xl transition-all duration-300 flex-1 lg:flex-none lg:h-[256px] flex flex-col justify-between min-h-[220px] sm:min-h-[240px]">
              <div className="flex-1">
                <h3 className="font-bold text-base sm:text-lg mb-3 sm:mb-4 text-[#2d4739]">
                  금주의 인기스토어
                </h3>
                {topRankStore ? (
                  <>
                    <div className="flex items-center space-x-3 sm:space-x-4 mb-3 sm:mb-4">
                      <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gray-200 rounded-full flex-shrink-0 overflow-hidden">
                        <img
                          src={topRankStore.logoImg}
                          alt={topRankStore.storeName}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="font-semibold text-gray-800 text-sm sm:text-base">
                          {topRankStore.storeName}
                        </h4>
                        <span className="text-xs text-gray-500">{topRankStore.categoryName}</span>
                      </div>
                    </div>
                    <p className="text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4 line-clamp-2">
                      {topRankStore.storeDetail}
                    </p>
                  </>
                ) : (
                  <div className="flex items-center space-x-3 sm:space-x-4 mb-3 sm:mb-4">
                    <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gray-200 rounded-full flex-shrink-0"></div>
                    <div className="min-w-0 flex-1">
                      <h4 className="font-semibold text-gray-800 text-sm sm:text-base">스토어명</h4>
                    </div>
                  </div>
                )}
              </div>
              <button
                className="w-full bg-[#2d4739] text-white py-2 rounded-lg hover:bg-[#1e3428] transition-colors flex items-center justify-center space-x-2 text-sm sm:text-base flex-shrink-0 mt-auto"
                onClick={() =>
                  topRankStore && handleStoreClick(topRankStore.storeId, topRankStore.storeUrl)
                }
              >
                <span>바로가기</span>
                <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4" />
              </button>
            </div>

            {/* 핸드메이드 클래스 */}
            <div className="bg-white rounded-xl sm:rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 flex-1 lg:flex-none lg:h-[200px] flex flex-col min-h-[200px] sm:min-h-[220px]">
              <div className="flex h-full">
                <div className="w-44 sm:w-40 lg:w-48 bg-gray-200 flex items-center justify-center flex-shrink-0">
                  <span className="text-gray-600 text-xs sm:text-sm">클래스 사진</span>
                </div>
                <div className="p-3 sm:p-4 flex-1 flex flex-col justify-between min-h-0">
                  <div className="flex-1 min-h-0">
                    <h3 className="font-bold text-[#2d4739] mb-1 text-sm sm:text-base">클래스명</h3>
                    <p className="text-xs sm:text-sm text-gray-600 mb-2">스토어명</p>
                    <div className="flex justify-between items-center mb-3">
                      <span className="font-semibold text-[#2d4739] text-sm sm:text-base">
                        가격
                      </span>
                    </div>
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-xs sm:text-sm text-gray-500">시간</span>
                    </div>
                  </div>
                  <button className="w-full bg-green-500 text-white py-2 rounded-lg hover:bg-green-600 transition-colors text-sm sm:text-base flex-shrink-0 mt-auto">
                    신청하기
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 인기 스토어 영역 */}
        <section className="pt-4 sm:pt-8 isolate">
          <div className="flex justify-between items-center mb-4 sm:mb-8">
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-[#2d4739]">
              인기 스토어
            </h2>
            <Link
              to={'/main/stores'}
              className="text-[#2d4739] hover:text-green-600 transition-colors flex items-center space-x-1 text-sm sm:text-base"
            >
              <span>전체보기</span>
              <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4" />
            </Link>
          </div>

          <div className="relative overflow-hidden">
            <div
              className="flex transition-transform duration-700 ease-in-out"
              style={{ transform: `translateX(-${storeIndex * 100}%)` }}
            >
              {[0, 1].map((slideIndex) => (
                <div key={slideIndex} className="w-full flex-shrink-0">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 lg:gap-6 py-4 lg:py-6">
                    {/* 슬라이드별 스토어 2개씩 표시 */}
                    {bestStores
                      .slice(slideIndex * 2, slideIndex * 2 + 2)
                      .map((store, itemIndex) => {
                        const cardId = `${slideIndex}-${itemIndex}`;
                        const isExpanded = expandedStore === cardId;

                        return (
                          <div
                            key={itemIndex}
                            className="bg-white rounded-xl sm:rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 group flex flex-col relative"
                            onClick={() => handleStoreClick(store.storeId, store.storeUrl)}
                          >
                            <div className="relative overflow-hidden flex-shrink-0">
                              <div className="w-full aspect-[3/2] sm:aspect-[4/3] lg:aspect-[4/3] bg-gray-200 flex items-center justify-center group-hover:scale-105 transition-transform duration-500">
                                <img
                                  src={store.logoImg}
                                  alt={store.storeName}
                                  className="w-full h-full object-cover"
                                />
                              </div>

                              <div className="hidden lg:block absolute inset-0 bg-black/0 group-hover:bg-black/20 group-hover:backdrop-blur-[2px] transition-all duration-300 pointer-events-none" />
                              <div className="hidden lg:group-hover:flex lg:absolute lg:inset-0 lg:items-center lg:justify-center lg:p-4 lg:pointer-events-none">
                                <p className="text-white text-sm lg:text-base text-center leading-relaxed">
                                  {store.storeDetail}
                                </p>
                              </div>

                              <div
                                className={`lg:hidden absolute inset-0 transition-all duration-300 pointer-events-none ${
                                  isExpanded ? 'bg-black/20 backdrop-blur-[2px]' : 'bg-black/0'
                                }`}
                              />
                              {isExpanded && (
                                <div className="lg:hidden absolute inset-0 flex items-center justify-center p-4 pointer-events-none">
                                  <p className="text-white text-sm text-center leading-relaxed">
                                    {store.storeDetail}
                                  </p>
                                </div>
                              )}

                              <div className="absolute top-2 sm:top-4 left-2 sm:left-4 z-10">
                                <span className="bg-[#2d4739] text-white px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm">
                                  {store.categoryName}
                                </span>
                              </div>

                              {isExpanded && (
                                <button
                                  onClick={() => setExpandedStore(null)}
                                  className="lg:hidden absolute top-2 right-2 w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-md hover:bg-white transition-colors z-20"
                                >
                                  <X className="w-4 h-4 text-gray-600" />
                                </button>
                              )}
                            </div>

                            <div
                              className="p-4 sm:p-6 lg:p-8 flex-1 flex flex-col justify-between relative cursor-pointer"
                              onClick={() => handleStoreClick(store.storeId, store.storeUrl)}
                            >
                              <div>
                                <div className="flex justify-between items-start mb-2 sm:mb-3 lg:mb-4">
                                  <h3 className="font-bold text-sm sm:text-lg lg:text-xl text-gray-800">
                                    {store.storeName}
                                  </h3>

                                  {!isExpanded && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setExpandedStore(cardId);
                                      }}
                                      className="sm:hidden flex-shrink-0 ml-2 px-2 py-1 text-[#2d4739] rounded-md bg-gray-50 hover:bg-gray-100 transition"
                                    >
                                      <span className="inline-flex items-center gap-1 text-xs font-semibold">
                                        전체설명 <ChevronDown className="w-4 h-4" />
                                      </span>
                                    </button>
                                  )}
                                </div>

                                <div className="relative">
                                  <p
                                    className={[
                                      'text-gray-600 text-sm sm:text-base lg:text-lg overflow-hidden transition-[max-height] duration-300',
                                      isExpanded ? 'max-h-0 lg:max-h-20' : 'max-h-12 lg:max-h-20',
                                      'lg:group-hover:max-h-0',
                                    ].join(' ')}
                                  >
                                    {store.storeDetail}
                                  </p>

                                  {!isExpanded && (
                                    <span className="lg:hidden absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-white to-transparent pointer-events-none" />
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}

                    {/* 3번째 아이템 (태블릿/데스크톱 전용) */}
                    {bestStores[slideIndex * 2 + 2] && (
                      <div className="hidden sm:block bg-white rounded-xl sm:rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 group flex flex-col relative">
                        <div className="relative overflow-hidden flex-shrink-0">
                          <div className="w-full aspect-[4/3] lg:aspect-[4/3] bg-gray-200 flex items-center justify-center group-hover:scale-105 transition-transform duration-500">
                            <img
                              src={bestStores[slideIndex * 2 + 2].logoImg}
                              alt={bestStores[slideIndex * 2 + 2].storeName}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="hidden lg:block absolute inset-0 bg-black/0 group-hover:bg-black/20 group-hover:backdrop-blur-[2px] transition-all duration-300 pointer-events-none" />
                          <div className="hidden lg:group-hover:flex lg:absolute lg:inset-0 lg:items-center lg:justify-center lg:p-4 lg:pointer-events-none">
                            <p className="text-white text-sm lg:text-base text-center leading-relaxed">
                              {bestStores[slideIndex * 2 + 2].storeDetail}
                            </p>
                          </div>
                          <div className="absolute top-2 sm:top-4 left-2 sm:left-4 z-10">
                            <span className="bg-[#2d4739] text-white px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm">
                              {bestStores[slideIndex * 2 + 2].categoryName}
                            </span>
                          </div>
                        </div>
                        <div
                          className="p-2 sm:p-6 lg:p-8 flex-1 flex flex-col justify-between relative cursor-pointer"
                          onClick={() =>
                            handleStoreClick(
                              bestStores[slideIndex * 2 + 2].storeId,
                              bestStores[slideIndex * 2 + 2].storeUrl
                            )
                          }
                        >
                          <div>
                            <div className="flex justify-between items-start mb-1 sm:mb-3 lg:mb-4">
                              <h3 className="font-bold text-xs sm:text-lg lg:text-xl text-gray-800">
                                {bestStores[slideIndex * 2 + 2].storeName}
                              </h3>
                            </div>
                            <p className="text-gray-600 text-xs sm:text-base lg:text-lg overflow-hidden transition-[max-height] duration-300 lg:max-h-20 lg:group-hover:max-h-0">
                              {bestStores[slideIndex * 2 + 2].storeDetail}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 인기 상품 영역 */}
        <section className="pt-4 sm:pt-8 isolate">
          <div className="flex justify-between items-center mb-4 sm:mb-8">
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-[#2d4739]">인기 상품</h2>
            <Link
              to={`/main/products`}
              className="text-[#2d4739] hover:text-green-600 transition-colors flex items-center space-x-1 text-sm sm:text-base"
            >
              <span>전체보기</span>
              <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4" />
            </Link>
          </div>

          <div className="relative overflow-hidden">
            <div
              className="flex transition-transform duration-700 ease-in-out"
              style={{ transform: `translateX(-${productIndex * 100}%)` }}
            >
              {[0, 1].map((slideIndex) => (
                <div key={slideIndex} className="w-full flex-shrink-0 py-4 lg:py-6">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-4 lg:gap-8">
                    {bestProducts
                      .slice(slideIndex * 2, slideIndex * 2 + 2)
                      .map((product, itemIndex) => (
                        <div
                          key={itemIndex}
                          className="bg-white rounded-xl sm:rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 group flex flex-col cursor-pointer"
                          onClick={() => handleProductClick(product.productId, product.storeUrl)}
                        >
                          <div className="relative overflow-hidden flex-shrink-0">
                            <div className="w-full aspect-square bg-gray-200 flex items-center justify-center group-hover:scale-105 transition-transform duration-500">
                              <img
                                src={product.pimgUrl}
                                alt={product.productName}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          </div>
                          <div className="p-2 sm:p-4 lg:p-6 flex-1 flex flex-col justify-between">
                            <div>
                              <div className="mb-1 sm:mb-2">
                                <span className="text-xs sm:text-sm text-[#2d4739] bg-green-50 px-2 py-1 rounded-full">
                                  {product.typeCategoryName}
                                </span>
                              </div>
                              <h3 className="font-bold text-xs sm:text-base lg:text-lg text-gray-800 mb-1 sm:mb-2">
                                {product.productName}
                              </h3>
                              <div className="flex items-center space-x-2 mb-1 sm:mb-2">
                                <span className="text-sm sm:text-lg lg:text-xl font-bold text-[#2d4739]">
                                  {formatPrice(product.price)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}

                    {/* 3번째 아이템 (태블릿/데스크톱 전용) */}
                    {bestProducts[slideIndex * 2 + 2] && (
                      <div
                        className="hidden sm:block bg-white rounded-xl sm:rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 group flex flex-col cursor-pointer"
                        onClick={() =>
                          handleProductClick(
                            bestProducts[slideIndex * 2 + 2].productId,
                            bestProducts[slideIndex * 2 + 2].storeUrl
                          )
                        }
                      >
                        <div className="relative overflow-hidden flex-shrink-0">
                          <div className="w-full aspect-square bg-gray-200 flex items-center justify-center group-hover:scale-105 transition-transform duration-500">
                            <img
                              src={bestProducts[slideIndex * 2 + 2].pimgUrl}
                              alt={bestProducts[slideIndex * 2 + 2].productName}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        </div>
                        <div className="p-2 sm:p-4 lg:p-6 flex-1 flex flex-col justify-between">
                          <div>
                            <div className="mb-1 sm:mb-2">
                              <span className="text-xs sm:text-sm text-[#2d4739] bg-green-50 px-2 py-1 rounded-full">
                                {bestProducts[slideIndex * 2 + 2].typeCategoryName}
                              </span>
                            </div>
                            <h3 className="font-bold text-xs sm:text-base lg:text-lg text-gray-800 mb-1 sm:mb-2">
                              {bestProducts[slideIndex * 2 + 2].productName}
                            </h3>
                            <div className="flex items-center space-x-2 mb-1 sm:mb-2">
                              <span className="text-sm sm:text-lg lg:text-xl font-bold text-[#2d4739]">
                                {formatPrice(bestProducts[slideIndex * 2 + 2].price)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 금주 신상품 */}
        <section className="pt-4 sm:pt-8 isolate">
          <div className="flex justify-between items-center mb-4 sm:mb-8">
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-[#2d4739]">
              금주 신상품
            </h2>
            <Link
              to={'/main/products'}
              className="text-[#2d4739] hover:text-green-600 transition-colors flex items-center space-x-1 text-sm sm:text-base"
            >
              <span>전체보기</span>
              <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4 lg:gap-6">
            {newProducts.slice(0, 10).map((product, index) => (
              <div
                key={index}
                className="bg-white rounded-lg sm:rounded-xl overflow-hidden shadow-md hover:shadow-lg transition-all duration-300 group cursor-pointer"
                onClick={() => handleProductClick(product.productId, product.storeUrl || 'main')}
              >
                <div className="relative overflow-hidden">
                  <div className="w-full aspect-square bg-gray-200 flex items-center justify-center group-hover:scale-105 transition-transform duration-500">
                    <img
                      src={product.pimgUrl}
                      alt={product.productName}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300"></div>
                </div>
                <div className="p-4 sm:p-3 lg:p-4">
                  <h3 className="font-semibold text-gray-800 text-xs sm:text-sm lg:text-base mb-1 sm:mb-2 line-clamp-2">
                    {product.productName}
                  </h3>
                  <span className="text-[#2d4739] font-bold text-xs sm:text-sm lg:text-base">
                    {formatPrice(product.price)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default MainLandingPage;
