import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { legacyGet, get } from '@src/libs/request';
import type { ApiResponse } from '@src/libs/apiResponse';
import Header from '@src/shared/areas/layout/features/header/Header';
import Storenavbar from '@src/shared/areas/navigation/features/navbar/store/Storenavbar';
import Footer from '@src/shared/areas/layout/features/footer/Footer';
import { processContent } from '@src/shared/util/contentUtil'; // ✅ 올바른 경로로 수정
import { STORE_ICONS  } from '@src/domains/buyer/areas/main/contants/storeIcons';


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

interface StoreCustomDTO {
  storeId: number;
  font?: { id: number; name: string; style: string; url: string } | null;
  icon?: { id: number; name: string; content: string; url: string } | null;
  fontColor: string;
  headerFooterColor: string;
  noticeColor: string;
  descriptionColor: string;
  popularColor: string; // 히어로 배경색
  createdAt: string;
  updatedAt: string;
}

const StoreMain: React.FC = () => {
  const { store: storeUrl } = useParams<{ store: string }>();
  const [storeInfo, setStoreInfo] = useState<StoreInfo | null>(null);
  const [mainProducts, setMainProducts] = useState<Product[]>([]);
  const [bestProducts, setBestProducts] = useState<Product[]>([]);
  const [notice, setNotice] = useState<string>('');
  const [customSettings, setCustomSettings] = useState<StoreCustomDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  const [footerBgColor, setFooterBgColor] = useState('#2d4739');
  const [headerBgColor, setHeaderBgColor] = useState('#2d4739');


  const navigate = useNavigate();

  useEffect(() => {
    if (storeUrl) {
      loadStoreData();
      loadNotices();
      loadCustomSettings();
    }
  }, [storeUrl]);

   // ✅ 아이콘 렌더링 함수 추가
  const renderStoreIcon = (iconId?: number) => {
    const icon = STORE_ICONS.find(i => i.id === iconId) || STORE_ICONS[0];
    return <span className="mr-2">{icon.emoji}</span>;
  };

  const loadStoreData = async () => {
    try {
      setError('');
      const result = await legacyGet<{ data: StoreData }>(`/${storeUrl}`);
      const { mainProduct, bestProduct } = result.data;

      if (mainProduct.length > 0) {
        const storeData = mainProduct[0];
        setStoreInfo({
          logoImg: storeData.logoImg,
          storeName: storeData.storeName,
          storeDetail: storeData.storeDetail,
        });
      }

      setMainProducts(mainProduct);
      setBestProducts(bestProduct);
    } catch (error) {
      console.error('스토어 데이터 로딩 실패:', error);
      setError('스토어 데이터를 불러오는데 실패했습니다.');
      navigate('/error/404', { replace: true });
    } finally {
      setLoading(false);
    }
  };

  const loadNotices = async () => {
    try {
      const result = await legacyGet<NoticeResponse>(`${storeUrl}/seller/management/noticeselect`);

      if (result?.data && Array.isArray(result.data)) {
        const pinned = result.data.filter((n) => n.noticeCheck === 1);
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

  const loadCustomSettings = async () => {
    try {
      const result: ApiResponse<StoreCustomDTO> = await get<StoreCustomDTO>(
        `/api/seller/${storeUrl}/store/custom`
      );
      setCustomSettings(result.data);

      if(result.data?.headerFooterColor) {
        setFooterBgColor(result.data.headerFooterColor);
        setHeaderBgColor(result.data.headerFooterColor);
      }
    } catch (error) {
      console.warn('커스텀 설정이 없거나 로드 실패, 기본값 사용:', error);
    }
  };

  const handleProductClick = (productId: number) => {
    window.location.href = `/${storeUrl}/products/${productId}`;
  };


  const truncateText = (text: string, length: number) => {
    return text.length > length ? text.slice(0, length) + '...' : text;
  };

  // ✅ HTML 태그를 제거하고 일반 텍스트로 변환하는 함수 추가
  const extractPlainText = (htmlContent: string, maxLength: number = 50): string => {
    if (!htmlContent) return '';
    
    // processContent로 HTML을 처리하고 태그를 제거
    const { sanitizedDescription } = processContent(htmlContent);
    
    // HTML 태그를 완전히 제거하여 순수 텍스트만 추출
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = sanitizedDescription;
    const plainText = tempDiv.textContent || tempDiv.innerText || '';
    
    // 길이 제한 적용
    return truncateText(plainText, maxLength);
  };


  const formatPrice = (price?: number) => {
    return price ? Number(price).toLocaleString() + '원' : '가격 정보 없음';
  };

  if (loading) {
    return (
      <>
        <Header />
        <Storenavbar />
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-lg font-jua text-gray-600">로딩 중...</div>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <Header />
        <Storenavbar />
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="text-lg font-jua text-red-600 mb-4">{error}</div>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              다시 시도
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header backgroundColor={headerBgColor} />
      <Storenavbar />
      <div className="bg-white font-jua text-gray-900">
        {/* 히어로 섹션 */}
        <section className="w-full">
          <div
            className="w-full"
            style={{ backgroundColor: customSettings?.popularColor || '#F3F0E8' }}
          >
            <div className="h-[200px] sm:h-[240px] lg:h-[280px]"></div>
          </div>
          <div className="relative">
            <div className="w-full px-4 sm:px-8 xl:px-60">
              <div className="-mt-[88px] sm:-mt-[100px]">
                <div className="rounded-2xl border border-gray-200 bg-white p-6 sm:p-8 shadow-sm">
                  <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-6">
                    {/* 스토어 로고 */}
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden border border-gray-200 bg-gray-50 flex items-center justify-center flex-shrink-0 relative">
                      {storeInfo?.logoImg ? (
                        <img
                          src={storeInfo.logoImg}
                          alt={`${storeInfo.storeName} 로고`}
                          className="w-full h-full object-cover object-center"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="text-gray-400">
                          <svg
                            className="w-6 h-6 sm:w-8 sm:h-8"
                            fill="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                          </svg>
                        </div>
                      )}
                    </div>

                    {/* 스토어 정보 */}
                    <div className="flex-1 min-w-0">
                      <h1
                        className="text-xl sm:text-2xl lg:text-3xl font-normal tracking-wide"
                        style={{ color: customSettings?.fontColor || '#000000' }}
                      >
                        {storeInfo?.storeName || '스토어명'}
                      </h1>
                      <p
                        className="mt-2 text-sm sm:text-base leading-relaxed"
                        style={{ color: customSettings?.descriptionColor || '#4B5563' }}
                      >
                        {storeInfo?.storeDetail || '스토어 설명'}
                      </p>
                      <div className="mt-4 flex flex-wrap gap-3">
                        <a
                          href={`/${storeUrl}/products`}
                          className="inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-normal text-white hover:opacity-95 transition-opacity tracking-wider"
                          style={{ backgroundColor: customSettings?.descriptionColor || '#2D4739' }}
                        >
                          전체 상품 보기
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

        {/* 공지사항 */}
        <section className="w-full px-4 sm:px-8 xl:px-60">
          <div className="rounded-xl border border-gray-200 p-4 sm:p-5 lg:p-6 bg-white">
            <div
              className="text-sm font-normal mb-2 tracking-wider"
              style={{ color: customSettings?.noticeColor || '#7A241F' }}
            >
              공지사항
            </div>

            <div className="relative overflow-hidden">
              <div className="marquee" aria-label="스토어 공지">
                <div className="marquee__track">
                  <span className="marquee__item">{notice || '공지사항이 없습니다.'}</span>
                </div>
              </div>

              {/* 좌우 페이드 마스크 */}
              <div className="pointer-events-none absolute inset-y-0 left-0 w-8 sm:w-12 bg-gradient-to-r from-white to-transparent" />
              <div className="pointer-events-none absolute inset-y-0 right-0 w-8 sm:w-12 bg-gradient-to-l from-white to-transparent" />
            </div>
          </div>
        </section>

        {/* 인기 상품 */}
        {bestProducts.length > 0 && (
          <section className="w-full px-4 sm:px-8 xl:px-60 mt-8 sm:mt-10">
            <div className="mb-6">
            <h2
              className="text-lg sm:text-xl lg:text-2xl font-normal tracking-wide mb-4 flex items-center"
              style={{ color: customSettings?.fontColor || '#2D4739' }}
            >
              {renderStoreIcon(customSettings?.icon?.id)}
              인기 상품
              
            </h2>
            <p className="mt-2 text-sm text-gray-500">구매수가 많은 상품을 모았어요</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {bestProducts.map((product) => (
                <div
                  key={product.productId}
                  onClick={() => handleProductClick(product.productId)}
                  className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                >
                  <div className="aspect-square bg-gray-50 overflow-hidden">
                    <img
                      src={product.pimgUrl}
                      alt={product.productName}
                      className="w-full h-full object-cover hover:scale-105 transition-transform"
                      onError={(e) => {
                        e.currentTarget.src = '/placeholder-image.jpg';
                      }}
                    />
                  </div>
                  <div className="p-4">
                    <h3 className="text-sm sm:text-base mb-2 line-clamp-2">
                      {product.productName}
                    </h3>
                    <p
                      className="font-normal"
                      style={{ color: customSettings?.fontColor || '#2D4739' }}
                    >
                      {formatPrice(product.price)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 대표 상품 */}
        {mainProducts.length > 0 && (
          <section className="w-full px-4 sm:px-8 xl:px-60 mt-8 sm:mt-10">
            <div className='mb-8'>
            <h2
              className="text-lg sm:text-xl lg:text-2xl font-normal tracking-wide mb-4 flex items-center"
              style={{ color: customSettings?.fontColor || '#2D4739' }}
            >
              {renderStoreIcon(customSettings?.icon?.id)}
              대표 상품
            </h2>
            <p className="mt-2 text-sm text-gray-500">판매자가 추천하는 스토어 대표작</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {mainProducts.map((product) => (
                <div
                  key={product.productId}
                  onClick={() => handleProductClick(product.productId)}
                  className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                >
                  <div className="aspect-square bg-gray-50 overflow-hidden">
                    <img
                      src={product.pimgUrl}
                      alt={product.productName}
                      className="w-full h-full object-cover hover:scale-105 transition-transform"
                      onError={(e) => {
                        e.currentTarget.src = '/placeholder-image.jpg';
                      }}
                    />
                  </div>
                  <div className="p-4">
                    <h3 className="text-sm sm:text-base mb-2 line-clamp-2">
                      {product.productName}
                    </h3>
                    <p className="text-xs sm:text-sm text-gray-600 line-clamp-2">
                      {/* ✅ HTML 태그가 제거된 일반 텍스트로 표시 */}
                      {extractPlainText(product.productDetail, 50)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <div className="h-8 sm:h-12"></div>
        <style>{`
          .marquee {
            position: relative;
            overflow: hidden;
            width: 100%;
          }
          .marquee__track {
            display: inline-block;
            white-space: nowrap;
            will-change: transform;
            min-width: 100%;
            animation: marquee-mobile 18s linear infinite;
          }
          .marquee__item {
            display: inline-block;
            padding-right: 2rem;
            font-size: 0.95rem;
            line-height: 1.5rem;
            color: #374151;
          }
          .marquee:hover .marquee__track {
            animation-play-state: paused;
          }

          @media (prefers-reduced-motion: reduce) {
            .marquee__track {
              animation: none;
              transform: translateX(0);
            }
          }

          @keyframes marquee-mobile {
            0% { transform: translateX(0); }
            100% { transform: translateX(-100%); }
          }

          @media (min-width: 640px) {
            .marquee__track {
              animation: marquee-desktop 22s linear infinite;
            }
            .marquee__item {
              font-size: 1rem;
            }
          }

          @media (min-width: 1024px) {
            .marquee__track {
              animation-duration: 26s;
            }
          }

          @keyframes marquee-desktop {
            0% { transform: translateX(100%); }
            100% { transform: translateX(-100%); }
          }
        `}</style>
      </div>
      <Footer backgroundColor={footerBgColor} />
    </>
  );
};

export default StoreMain;
