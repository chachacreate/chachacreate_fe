import React, { useState, useEffect } from 'react';
import { ArrowRight } from 'lucide-react';
import Header from '@src/shared/areas/layout/features/header/Header';
import Mainnavbar from '@src/shared/areas/navigation/features/navbar/main/Mainnavbar';
import Footer from '@src/shared/areas/layout/features/footer/Footer';
import { ChevronDown, ChevronUp, X } from 'lucide-react';

const MainLandingPage = () => {
  const [bannerIndex, setBannerIndex] = useState(0);
  const [storeIndex, setStoreIndex] = useState(0);
  const [productIndex, setProductIndex] = useState(0);

  // ✅ 모바일에서 펼쳐진 카드 ID 관리
  const [expandedStore, setExpandedStore] = useState<string | null>(null);

  useEffect(() => {
    const bannerInterval = setInterval(() => {
      setBannerIndex(prev => (prev + 1) % 3);
    }, 4000);
    return () => clearInterval(bannerInterval);
  }, []);

  useEffect(() => {
    const storeInterval = setInterval(() => {
      setStoreIndex(prev => (prev + 1) % 2);
    }, 3000);
    return () => clearInterval(storeInterval);
  }, []);

  useEffect(() => {
    const productInterval = setInterval(() => {
      setProductIndex(prev => (prev + 1) % 2);
    }, 3500);
    return () => clearInterval(productInterval);
  }, []);

  return (
    <div className="min-h-screen ">
      <Header />
      <Mainnavbar />

      {/* 메인 콘텐츠 */}
      <main className="max-w-[1440px] mx-auto px-4 py-4 sm:py-8 space-y-6 sm:space-y-10">
        
        {/* 배너 영역 */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 relative isolate">
          {/* 자동 스와이프 광고 */}
          <div className="lg:col-span-2 relative overflow-hidden rounded-xl sm:rounded-2xl shadow-lg sm:shadow-2xl bg-gray-200 h-96 sm:h-[500px] lg:h-[500px]">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center text-gray-600 px-4">
                <h2 className="text-xl sm:text-2xl lg:text-4xl font-bold mb-2">자동 스와이프 광고 영역</h2>
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

          {/* 금주의 인기스토어 & 핸드메이드 클래스 */}
          <div className="space-y-4 sm:space-y-6  flex flex-col">
            {/* 금주의 인기스토어 */}
            <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-lg hover:shadow-xl transition-all duration-300 flex-1 lg:flex-none lg:h-[256px] flex flex-col justify-between min-h-[220px] sm:min-h-[240px]">
              <div className="flex-1">
                <h3 className="font-bold text-base sm:text-lg mb-3 sm:mb-4 text-[#2d4739]">금주의 인기스토어</h3>
                <div className="flex items-center space-x-3 sm:space-x-4 mb-3 sm:mb-4">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gray-200 rounded-full flex-shrink-0"></div>
                  <div className="min-w-0 flex-1">
                    <h4 className="font-semibold text-gray-800 text-sm sm:text-base">스토어명</h4>
                  </div>
                </div>
                <p className="text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4">스토어 설명</p>
              </div>
              <button className="w-full bg-[#2d4739] text-white py-2 rounded-lg hover:bg-[#1e3428] transition-colors flex items-center justify-center space-x-2 text-sm sm:text-base flex-shrink-0 mt-auto">
                <span>바로가기</span>
                <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4" />
              </button>
            </div>

            {/* 핸드메이드 클래스 */}
            <div className="bg-white rounded-xl sm:rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 flex-1 lg:flex-none lg:h-[200px] flex flex-col min-h-[200px] sm:min-h-[220px]">
              <div className="flex h-full">
                {/* 클래스 사진 */}
                <div className="w-44 sm:w-40 lg:w-48 bg-gray-200 flex items-center justify-center flex-shrink-0">
                  <span className="text-gray-600 text-xs sm:text-sm">클래스 사진</span>
                </div>
                
                {/* 클래스 정보 + 신청하기 */}
                <div className="p-3 sm:p-4 flex-1 flex flex-col justify-between min-h-0">
                  <div className="flex-1 min-h-0">
                    <h3 className="font-bold text-[#2d4739] mb-1 text-sm sm:text-base">클래스명</h3>
                    <p className="text-xs sm:text-sm text-gray-600 mb-2">스토어명</p>
                    <div className="flex justify-between items-center mb-3">
                      <span className="font-semibold text-[#2d4739] text-sm sm:text-base">가격</span>
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

        {/* 인기 스토어 영역 - 상태를 메인 컴포넌트에서 관리 */}
        <section className="pt-4 sm:pt-8 isolate">
          <div className="flex justify-between items-center mb-4 sm:mb-8">
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-[#2d4739]">인기 스토어</h2>
            <button className="text-[#2d4739] hover:text-green-600 transition-colors flex items-center space-x-1 text-sm sm:text-base">
              <span>전체보기</span>
              <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4" />
            </button>
          </div>
          
          <div className="relative overflow-hidden">
            <div 
              className="flex transition-transform duration-700 ease-in-out"
              style={{ transform: `translateX(-${storeIndex * 100}%)` }}
            >
              {[0, 1].map((slideIndex) => (
                <div key={slideIndex} className="w-full flex-shrink-0 ">
                  {/* 모바일: 세로 2개, 태블릿/데스크톱: 가로 3개 */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 lg:gap-6 py-4 lg:py-6">
                    {/* 항상 표시되는 2개 아이템 */}
                    {[0, 1].map((itemIndex) => {
                      const cardId = `${slideIndex}-${itemIndex}`;
                      const cardNumber = slideIndex * 2 + itemIndex + 1;
                      const isExpanded = expandedStore === cardId; // ✅ 모바일 토글 상태

                      return (
                        <div key={itemIndex} className="bg-white rounded-xl sm:rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 group flex flex-col relative">
                          {/* 이미지 영역 */}
                          <div className="relative overflow-hidden flex-shrink-0">
                            <div className="w-full aspect-[3/2] sm:aspect-[4/3] lg:aspect-[4/3] bg-gray-200 flex items-center justify-center group-hover:scale-105 transition-transform duration-500">
                              <span className="text-gray-600 text-xs sm:text-sm">스토어 사진 {cardNumber}</span>
                            </div>
                            
                            {/* 데스크톱(≥lg) 호버 시 어두운 블러 + 설명 오버레이 */}
                            <div className="hidden lg:block absolute inset-0 bg-black/0 group-hover:bg-black/20 group-hover:backdrop-blur-[2px] transition-all duration-300 pointer-events-none" />
                            <div className="hidden lg:group-hover:flex lg:absolute lg:inset-0 lg:items-center lg:justify-center lg:p-4 lg:pointer-events-none">
                              <p className="text-white text-sm lg:text-base text-center leading-relaxed">
                                이곳에는 스토어에 대한 더 자세한 설명이 들어갑니다. 스토어의
                                특징, 주요 상품, 운영 철학 등을 포함할 수 있습니다.
                              </p>
                            </div>
                            
                            {/* 모바일 펼쳐졌을 때 어두운 블러 + 설명 오버레이 */}
                            <div className={`lg:hidden absolute inset-0 transition-all duration-300 pointer-events-none ${
                              isExpanded ? 'bg-black/20 backdrop-blur-[2px]' : 'bg-black/0'
                            }`} />
                            {isExpanded && (
                              <div className="lg:hidden absolute inset-0 flex items-center justify-center p-4 pointer-events-none">
                                <p className="text-white text-sm text-center leading-relaxed">
                                  이곳에는 스토어에 대한 더 자세한 설명이 들어갑니다. 스토어의
                                  특징, 주요 상품, 운영 철학 등을 포함할 수 있습니다. 고객들이
                                  스토어를 선택하는 데 도움이 되는 정보들을 제공합니다.
                                </p>
                              </div>
                            )}
                            
                            <div className="absolute top-2 sm:top-4 left-2 sm:left-4 z-10">
                              <span className="bg-[#2d4739] text-white px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm">
                                카테고리
                              </span>
                            </div>

                            {/* 모바일 펼쳐졌을 때 닫기 버튼 (이미지 영역에) */}
                            {isExpanded && (
                              <button
                                onClick={() => setExpandedStore(null)}
                                className="lg:hidden absolute top-2 right-2 w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-md hover:bg-white transition-colors z-20"
                              >
                                <X className="w-4 h-4 text-gray-600" />
                              </button>
                            )}
                          </div>
                          
                          {/* 텍스트 영역 */}
                          <div className="p-4 sm:p-6 lg:p-8 flex-1 flex flex-col justify-between relative">
                            <div>
                              <div className="flex justify-between items-start mb-2 sm:mb-3 lg:mb-4">
                                <h3 className="font-bold text-sm sm:text-lg lg:text-xl text-gray-800">스토어명 {cardNumber}</h3>

                                {/* 모바일 더보기 버튼 (닫혀있을 때만 표시) */}
                                {!isExpanded && (
                                  <button
                                    onClick={() => setExpandedStore(cardId)}
                                    className="sm:hidden flex-shrink-0 ml-2 px-2 py-1 text-[#2d4739] rounded-md bg-gray-50 hover:bg-gray-100 transition"
                                  >
                                    <span className="inline-flex items-center gap-1 text-xs font-semibold">
                                      전체설명 <ChevronDown className="w-4 h-4" />
                                    </span>
                                  </button>
                                )}
                              </div>

                              {/* 설명: 모바일은 접혀있을 때만 표시, 데스크톱은 기본 표시 */}
                              <div className="relative">
                                <p
                                  className={[
                                    "text-gray-600 text-sm sm:text-base lg:text-lg overflow-hidden transition-[max-height] duration-300",
                                    // 모바일: 펼쳐져있으면 숨김 (이미지 오버레이로 표시), 접혀있으면 일부만 표시
                                    isExpanded ? "max-h-0 lg:max-h-20" : "max-h-12 lg:max-h-20",
                                    // 데스크톱: 기본 일부만 보였다가 호버 시에는 숨김 (이미지 오버레이로 표시)
                                    "lg:group-hover:max-h-0",
                                  ].join(" ")}
                                >
                                  이곳에는 스토어에 대한 더 자세한 설명이 들어갑니다. 스토어의
                                  특징, 주요 상품, 운영 철학 등을 포함할 수 있습니다. 고객들이
                                  스토어를 선택하는 데 도움이 되는 정보들을 제공합니다. (샘플 텍스트)
                                </p>

                                {/* 모바일이 접혀 있을 때만 그라데이션 페이드 */}
                                {!isExpanded && (
                                  <span className="lg:hidden absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-white to-transparent pointer-events-none" />
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    
                    {/* 태블릿/데스크톱 전용 3번째 아이템 (데스크톱 호버로 설명 펼침) */}
                    <div className="hidden sm:block bg-white rounded-xl sm:rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 group flex flex-col relative">
                      <div className="relative overflow-hidden flex-shrink-0">
                        <div className="w-full aspect-[4/3] lg:aspect-[4/3] bg-gray-200 flex items-center justify-center group-hover:scale-105 transition-transform duration-500">
                          <span className="text-gray-600 text-xs sm:text-sm">스토어 사진 {slideIndex * 2 + 3}</span>
                        </div>
                        {/* 데스크톱 호버 시 어두운 블러 + 설명 오버레이 */}
                        <div className="hidden lg:block absolute inset-0 bg-black/0 group-hover:bg-black/20 group-hover:backdrop-blur-[2px] transition-all duration-300 pointer-events-none" />
                        <div className="hidden lg:group-hover:flex lg:absolute lg:inset-0 lg:items-center lg:justify-center lg:p-4 lg:pointer-events-none">
                          <p className="text-white text-sm lg:text-base text-center leading-relaxed">
                            이곳에는 스토어에 대한 더 자세한 설명이 들어갑니다. 데스크톱에선 카드
                            호버 시 전체 설명이 펼쳐집니다.
                          </p>
                        </div>
                        <div className="absolute top-2 sm:top-4 left-2 sm:left-4 z-10">
                          <span className="bg-[#2d4739] text-white px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm">
                            카테고리
                          </span>
                        </div>
                      </div>
                      <div className="p-2 sm:p-6 lg:p-8 flex-1 flex flex-col justify-between relative">
                        <div>
                          <div className="flex justify-between items-start mb-1 sm:mb-3 lg:mb-4">
                            <h3 className="font-bold text-xs sm:text-lg lg:text-xl text-gray-800">스토어명 {slideIndex * 2 + 3}</h3>
                          </div>
                          <p className="text-gray-600 text-xs sm:text-base lg:text-lg overflow-hidden transition-[max-height] duration-300 lg:max-h-20 lg:group-hover:max-h-0">
                            이곳에는 스토어에 대한 더 자세한 설명이 들어갑니다. 데스크톱에선 카드
                            호버 시 전체 설명이 펼쳐집니다. (샘플 텍스트)
                          </p>
                        </div>
                      </div>
                    </div>
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
            <button className="text-[#2d4739] hover:text-green-600 transition-colors flex items-center space-x-1 text-sm sm:text-base">
              <span>전체보기</span>
              <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4" />
            </button>
          </div>
          
          <div className="relative overflow-hidden">
            <div 
              className="flex transition-transform duration-700 ease-in-out"
              style={{ transform: `translateX(-${productIndex * 100}%)` }}
            >
              {[0, 1].map((slideIndex) => (
                <div key={slideIndex} className="w-full flex-shrink-0 py-4 lg:py-6">
                  {/* 모바일: 가로 2개, 태블릿/데스크톱: 가로 3개 */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-4 lg:gap-8">
                    {/* 항상 표시되는 2개 아이템 */}
                    {[0, 1].map((itemIndex) => (
                      <div key={itemIndex} className="bg-white rounded-xl sm:rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 group flex flex-col">
                        <div className="relative overflow-hidden flex-shrink-0">
                          <div className="w-full aspect-square bg-gray-200 flex items-center justify-center group-hover:scale-105 transition-transform duration-500">
                            <span className="text-gray-600 text-xs sm:text-sm">상품 사진 {slideIndex * 2 + itemIndex + 1}</span>
                          </div>
                        </div>
                        <div className="p-2 sm:p-4 lg:p-6 flex-1 flex flex-col justify-between">
                          <div>
                            <div className="mb-1 sm:mb-2">
                              <span className="text-xs sm:text-sm text-[#2d4739] bg-green-50 px-2 py-1 rounded-full">
                                카테고리
                              </span>
                            </div>
                            <h3 className="font-bold text-xs sm:text-base lg:text-lg text-gray-800 mb-1 sm:mb-2">상품명 {slideIndex * 2 + itemIndex + 1}</h3>
                            <div className="flex items-center space-x-2 mb-1 sm:mb-2">
                              <span className="text-sm sm:text-lg lg:text-xl font-bold text-[#2d4739]">가격</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    {/* 태블릿과 데스크톱에서만 보이는 세 번째 아이템 */}
                    <div className="hidden sm:block bg-white rounded-xl sm:rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 group flex flex-col">
                      <div className="relative overflow-hidden flex-shrink-0">
                        <div className="w-full aspect-square bg-gray-200 flex items-center justify-center group-hover:scale-105 transition-transform duration-500">
                          <span className="text-gray-600 text-xs sm:text-sm">상품 사진 {slideIndex * 2 + 3}</span>
                        </div>
                      </div>
                      <div className="p-2 sm:p-4 lg:p-6 flex-1 flex flex-col justify-between">
                        <div>
                          <div className="mb-1 sm:mb-2">
                            <span className="text-xs sm:text-sm text-[#2d4739] bg-green-50 px-2 py-1 rounded-full">
                              카테고리
                            </span>
                          </div>
                          <h3 className="font-bold text-xs sm:text-base lg:text-lg text-gray-800 mb-1 sm:mb-2">상품명 {slideIndex * 2 + 3}</h3>
                          <div className="flex items-center space-x-2 mb-1 sm:mb-2">
                            <span className="text-sm sm:text-lg lg:text-xl font-bold text-[#2d4739]">가격</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 금주 신상품 */}
        <section className="pt-4 sm:pt-8 isolate">
          <div className="flex justify-between items-center mb-4 sm:mb-8">
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-[#2d4739]">금주 신상품</h2>
            <button className="text-[#2d4739] hover:text-green-600 transition-colors flex items-center space-x-1 text-sm sm:text-base">
              <span>전체보기</span>
              <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4" />
            </button>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4 lg:gap-6">
            {Array.from({ length: 10 }).map((_, index) => (
              <div key={index} className="bg-white rounded-lg sm:rounded-xl overflow-hidden shadow-md hover:shadow-lg transition-all duration-300 group">
                <div className="relative overflow-hidden">
                  <div className="w-full aspect-square bg-gray-200 flex items-center justify-center group-hover:scale-105 transition-transform duration-500">
                    <span className="text-gray-600 text-xs sm:text-sm">상품 사진</span>
                  </div>
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300"></div>
                </div>
                <div className="p-4 sm:p-3 lg:p-4">
                  <h3 className="font-semibold text-gray-800 text-xs sm:text-sm lg:text-base mb-1 sm:mb-2 line-clamp-2">상품명</h3>
                  <span className="text-[#2d4739] font-bold text-xs sm:text-sm lg:text-base">가격</span>
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