import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, Autoplay } from 'swiper/modules';
import { legacyGet } from '@src/libs/request';

// Swiper CSS
// import 'swiper/css';
// import 'swiper/css/navigation';
// import 'swiper/css/pagination';

// 타입 정의
interface StoreInfo {
  logoImg: string;
  storeName: string;
  storeDetail: string;
}

interface Product {
  productId: number;
  productName: string;
  productDetail: string;
  pimgUrl: string;
  price?: number;
  categoryName?: string;
  typeCategoryName?: string;
  ucategoryName?: string;
  dcategoryName?: string;
}

interface Notice {
  noticeCheck: number;
  noticeTitle: string;
  noticeText: string;
}

interface StoreData {
  mainProduct: (Product & StoreInfo)[];
  bestProduct: Product[];
}

interface NoticeResponse {
  data: Notice[];
}

const StoreMain: React.FC = () => {
  const { store: storeUrl } = useParams<{ store: string }>();
  const [storeInfo, setStoreInfo] = useState<StoreInfo | null>(null);
  const [mainProducts, setMainProducts] = useState<Product[]>([]);
  const [bestProducts, setBestProducts] = useState<Product[]>([]);
  const [notice, setNotice] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (storeUrl) {
      loadStoreData();
      loadNotices();
    }
  }, [storeUrl]);

  const loadStoreData = async () => {
    try {
      const result = await legacyGet<{ data: StoreData }>(`/${storeUrl}`);
      const { mainProduct, bestProduct } = result.data;
      
      // 스토어 정보 설정 (첫 번째 대표 상품에서 추출)
      if (mainProduct.length > 0) {
        const storeData = mainProduct[0];
        setStoreInfo({
          logoImg: storeData.logoImg,
          storeName: storeData.storeName,
          storeDetail: storeData.storeDetail
        });
      }
      
      setMainProducts(mainProduct);
      setBestProducts(bestProduct);
    } catch (error) {
      console.error('스토어 데이터 로딩 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadNotices = async () => {
    try {
      const result = await legacyGet<NoticeResponse>(`${storeUrl}/seller/management/noticeselect`);
      
      if (result?.data && Array.isArray(result.data)) {
        const pinned = result.data.filter(n => n.noticeCheck === 1);
        if (pinned.length > 0) {
          const noticeData = pinned[0];
          setNotice(`🎉 ${noticeData.noticeTitle} : ${noticeData.noticeText}`);
        } else {
          setNotice('중요 공지가 없습니다.');
        }
      }
    } catch (error) {
      console.error('공지사항 로딩 실패:', error);
      setNotice('공지사항을 불러올 수 없습니다.');
    }
  };

  const handleProductClick = (productId: number) => {
    window.location.href = `/${storeUrl}/products/${productId}`;
  };

  const truncateText = (text: string, length: number) => {
    return text.length > length ? text.slice(0, length) + '...' : text;
  };

  const formatPrice = (price?: number) => {
    return price ? Number(price).toLocaleString() + '원' : '가격 정보 없음';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg font-jua text-gray-600">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="bg-white font-jua text-gray-900">
      {/* 히어로 섹션 */}
      <section className="w-full">
        <div className="w-full bg-[#F3F0E8]">
          <div className="h-[200px] sm:h-[240px] lg:h-[280px]"></div>
        </div>
        <div className="relative">
          <div className="w-full px-4 sm:px-8 xl:px-60">
            <div className="-mt-[88px] sm:-mt-[100px]">
              <div className="rounded-2xl border border-gray-200 bg-white p-6 sm:p-8 shadow-sm">
                <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-6">
                  {/* 스토어 로고 */}
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden border border-gray-200 bg-gray-50 flex items-center justify-center flex-shrink-0 relative">
                    <img 
                      src={storeInfo?.logoImg || ''} 
                      alt={storeInfo?.storeName || '스토어 로고'}
                      className="w-full h-full object-cover object-center"
                      onError={(e) => {
                        e.currentTarget.style.opacity = '0';
                      }}
                    />
                    {/* 이미지 로딩 실패시 대체 아이콘 */}
                    <div className="absolute inset-0 flex items-center justify-center text-gray-400 opacity-50 pointer-events-none">
                      <svg className="w-6 h-6 sm:w-8 sm:h-8" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                      </svg>
                    </div>
                  </div>
                  
                  {/* 스토어 정보 */}
                  <div className="flex-1 min-w-0">
                    <h1 className="text-xl sm:text-2xl lg:text-3xl font-normal tracking-wide text-gray-900">
                      {storeInfo?.storeName || '스토어명'}
                    </h1>
                    <p className="mt-2 text-sm sm:text-base leading-relaxed text-[#4B5563]">
                      {storeInfo?.storeDetail || '스토어 설명'}
                    </p>
                    
                    {/* 액션 버튼들 */}
                    <div className="mt-4 flex flex-wrap gap-3">
                      <a 
                        href={`/${storeUrl}/products`}
                        className="inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-normal text-white bg-[#2D4739] hover:opacity-95 transition-opacity tracking-wider"
                      >
                        전체 상품 보기
                        <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                        </svg>
                      </a>
                      <a 
                        href={`/${storeUrl}/notices`}
                        className="inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-normal text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 transition-colors tracking-wider"
                      >
                        공지사항
                      </a>
                    </div>
                  </div>
                </div>
              </div>
              <div className="h-6"></div>
            </div>
          </div>
        </div>
      </section>

      {/* 스토어 공지사항 */}
      <section className="w-full px-4 sm:px-8 xl:px-60">
        <div className="rounded-xl border border-gray-200 p-4 sm:p-5 lg:p-6 bg-white">
          <div className="text-sm font-normal mb-2 text-[#7A241F] tracking-wider">
            공지사항
          </div>
          <div className="overflow-hidden">
            <div className="text-sm sm:text-base leading-relaxed text-gray-700">
              <div className="animate-marquee whitespace-nowrap">
                {notice}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 인기 상품 섹션 */}
      <section className="w-full px-4 sm:px-8 xl:px-60 mt-8 sm:mt-10">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2 sm:gap-4">
          <div>
            <h2 className="text-lg sm:text-xl lg:text-2xl font-normal tracking-wide text-[#2D4739] flex items-center gap-2">
              <span className="text-xl sm:text-2xl">⭐</span>
              인기 상품
            </h2>
            <p className="mt-1 text-xs sm:text-sm text-gray-500">구매수가 많은 상품을 모았어요</p>
          </div>
          <a 
            href={`/${storeUrl}/products`}
            className="inline-flex items-center gap-1 text-xs sm:text-sm font-normal text-gray-700 hover:text-gray-900 transition-colors self-start sm:self-auto"
          >
            전체보기
            <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
            </svg>
          </a>
        </div>
        
        <div className="mt-4 sm:mt-5 relative">
          <Swiper
            modules={[Navigation, Pagination]}
            slidesPerView={3}
            spaceBetween={30}
            loop={false}
            navigation={{
              nextEl: '.product-next',
              prevEl: '.product-prev',
            }}
            pagination={{
              el: '.product-pagination',
              clickable: true,
            }}
            allowTouchMove={false}
            className="overflow-hidden rounded-xl"
          >
            {bestProducts.map((product) => (
              <SwiperSlide 
                key={product.productId}
                onClick={() => handleProductClick(product.productId)}
                className="cursor-pointer"
              >
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow">
                  <div className="aspect-square overflow-hidden bg-gray-50">
                    <img 
                      src={product.pimgUrl} 
                      alt={product.productName}
                      className="w-full h-full object-cover object-center hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <div className="p-4">
                    <h3 className="font-normal text-gray-900 text-sm sm:text-base mb-2 line-clamp-2">
                      {product.productName}
                    </h3>
                    <div className="flex flex-wrap gap-1 mb-2">
                      {product.typeCategoryName && (
                        <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                          {product.typeCategoryName}
                        </span>
                      )}
                      {product.ucategoryName && (
                        <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                          {product.ucategoryName}
                        </span>
                      )}
                      {product.dcategoryName && (
                        <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                          {product.dcategoryName}
                        </span>
                      )}
                    </div>
                    <p className="text-[#2D4739] font-normal text-sm sm:text-base">
                      {formatPrice(product.price)}
                    </p>
                  </div>
                </div>
              </SwiperSlide>
            ))}
          </Swiper>
          
          {/* Navigation */}
          <div className="swiper-button-prev product-prev hidden sm:block !w-8 !h-8 lg:!w-10 lg:!h-10 !mt-0 !left-2 !top-1/2 !-translate-y-1/2 
                          bg-white/90 rounded-full shadow-lg border border-gray-200 
                          after:!text-gray-600 after:!text-xs lg:after:!text-sm after:!font-bold
                          hover:bg-white transition-all duration-200"></div>
          <div className="swiper-button-next product-next hidden sm:block !w-8 !h-8 lg:!w-10 lg:!h-10 !mt-0 !right-2 !top-1/2 !-translate-y-1/2 
                          bg-white/90 rounded-full shadow-lg border border-gray-200 
                          after:!text-gray-600 after:!text-xs lg:after:!text-sm after:!font-bold
                          hover:bg-white transition-all duration-200"></div>
          
          {/* Pagination */}
          <div className="swiper-pagination product-pagination !bottom-2 sm:!bottom-4"></div>
        </div>
      </section>

      {/* 대표 상품 섹션 */}
      <section className="w-full px-4 sm:px-8 xl:px-60 mt-8 sm:mt-10">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2 sm:gap-4">
          <div>
            <h2 className="text-lg sm:text-xl lg:text-2xl font-normal tracking-wide text-[#2D4739] flex items-center gap-2">
              <span className="text-xl sm:text-2xl">⭐</span>
              대표 상품
            </h2>
            <p className="mt-1 text-xs sm:text-sm text-gray-500">판매자가 추천하는 스토어 대표작</p>
          </div>
          <a 
            href={`/${storeUrl}/products`}
            className="inline-flex items-center gap-1 text-xs sm:text-sm font-normal text-gray-700 hover:text-gray-900 transition-colors self-start sm:self-auto"
          >
            전체보기
            <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
            </svg>
          </a>
        </div>
        
        <div className="mt-4 sm:mt-5 relative">
          <Swiper
            modules={[Navigation, Pagination]}
            slidesPerView={3}
            spaceBetween={30}
            loop={false}
            navigation={{
              nextEl: '.store-next',
              prevEl: '.store-prev',
            }}
            pagination={{
              el: '.store-pagination',
              clickable: true,
            }}
            allowTouchMove={false}
            className="overflow-hidden rounded-xl"
          >
            {mainProducts.map((product) => (
              <SwiperSlide 
                key={product.productId}
                onClick={() => handleProductClick(product.productId)}
                className="cursor-pointer"
              >
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow">
                  <div className="aspect-square overflow-hidden bg-gray-50">
                    <img 
                      src={product.pimgUrl} 
                      alt={product.productName}
                      className="w-full h-full object-cover object-center hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <div className="p-4">
                    <h3 className="font-normal text-gray-900 text-sm sm:text-base mb-2 line-clamp-2">
                      {product.productName}
                    </h3>
                    {product.categoryName && (
                      <div className="mb-2">
                        <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                          {product.categoryName}
                        </span>
                      </div>
                    )}
                    <p className="text-gray-600 text-xs sm:text-sm line-clamp-2">
                      {truncateText(product.productDetail, 50)}
                    </p>
                  </div>
                </div>
              </SwiperSlide>
            ))}
          </Swiper>
          
          {/* Navigation */}
          <div className="swiper-button-prev store-prev hidden sm:block !w-8 !h-8 lg:!w-10 lg:!h-10 !mt-0 !left-2 !top-1/2 !-translate-y-1/2 
                          bg-white/90 rounded-full shadow-lg border border-gray-200 
                          after:!text-gray-600 after:!text-xs lg:after:!text-sm after:!font-bold
                          hover:bg-white transition-all duration-200"></div>
          <div className="swiper-button-next store-next hidden sm:block !w-8 !h-8 lg:!w-10 lg:!h-10 !mt-0 !right-2 !top-1/2 !-translate-y-1/2 
                          bg-white/90 rounded-full shadow-lg border border-gray-200 
                          after:!text-gray-600 after:!text-xs lg:after:!text-sm after:!font-bold
                          hover:bg-white transition-all duration-200"></div>
          
          {/* Pagination */}
          <div className="swiper-pagination store-pagination !bottom-2 sm:!bottom-4"></div>
        </div>
      </section>

      {/* 여백 */}
      <div className="h-8 sm:h-12"></div>

      {/* 마키 애니메이션 CSS */}
      <style >{`
        @keyframes marquee {
          0% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
        
        .animate-marquee {
          animation: marquee 20s linear infinite;
        }

        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .swiper-pagination-bullet {
          background: rgba(255, 255, 255, 0.7) !important;
          border: 1px solid #d1d5db !important;
        }

        .swiper-pagination-bullet-active {
          background: #2D4739 !important;
          border-color: #2D4739 !important;
        }
      `}</style>
    </div>
  );
};

export default StoreMain;