// src/domains/main/areas/home/features/sell/pages/MainSellSellguide.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Info,
  ShieldCheck,
  Truck,
  Sparkles,
  UserPlus,
} from 'lucide-react';

import Header from '@src/shared/areas/layout/features/header/Header';
import Mainnavbar from '@src/shared/areas/navigation/features/navbar/main/Mainnavbar';
import SellSubnavbar from '@src/shared/areas/navigation/features/subnavbar/sell/SellSubnavbar';
import { isSeller, isUser, getCurrentUserRole } from '@src/shared/util/roleAuth';

type Step = {
  title: string;
  body: string;
  img: string;
  caption?: string;
};

const STEPS: Step[] = [
  {
    title: 'STEP 1 · 개인 판매 메뉴에서 개설 시작',
    body: "회원가입 및 로그인 후, 개인 판매 메뉴에서 '스토어 개설'을 클릭하세요.",
    img: 'https://picsum.photos/seed/step1/1200/700',
    caption: '대시보드 > 개인 판매 > 스토어 개설',
  },
  {
    title: 'STEP 2 · 스토어 이름과 소개 등록',
    body: '브랜드 스토리/운영 철학을 간단히 적고, 소개 이미지를 준비해 두면 좋아요.',
    img: 'https://picsum.photos/seed/step2/1200/700',
    caption: '스토어 기본 정보 입력',
  },
  {
    title: 'STEP 3 · 상품 등록 및 상세 정보 기입',
    body: '가격·옵션·배송 안내를 빠짐없이 작성해 주세요. 한 번 등록하면 1일 이내 노출 가능(검수 없음).',
    img: 'https://picsum.photos/seed/step3/1200/700',
    caption: '상품 등록/옵션/배송 안내',
  },
  {
    title: 'STEP 4 · 결제/정산 세팅',
    body: '결제 수단 연결과 정산 계정을 설정하세요. 완료 즉시 판매 시작!',
    img: 'https://picsum.photos/seed/step4/1200/700',
    caption: '결제/정산 연동',
  },
  {
    title: 'STEP 5 · 자동 정산 및 배송 관리',
    body: '주문이 들어오면 정산/배송 처리는 자동으로 관리됩니다. 대시보드에서 현황을 확인하세요.',
    img: 'https://picsum.photos/seed/step5/1200/700',
    caption: '정산/배송 자동화',
  },
];

const MainSellSellguide: React.FC = () => {
  // 현재 사용자 정보 가져오기
  const currentUser = getCurrentUserRole();
  const userRole = currentUser?.toString() || null;

  // 역할별 체크
  const userIsSeller = isSeller();
  const userIsUser = isUser();
  const userIsPersonalSeller = userRole === 'PERSONAL_SELLER'; // 개인판매자 직접 체크

  /** --- Reveal 애니메이션 플래그 --- */
  const [mounted, setMounted] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      setMounted(true);
      setIsVisible(true);
    }, 40);
    return () => clearTimeout(t);
  }, []);

  /** --- 스텝 캐러셀 상태 --- */
  const [index, setIndex] = useState(0);
  const len = STEPS.length;

  /** 자동 슬라이드 */
  useEffect(() => {
    const id = setInterval(() => setIndex((i) => (i + 1) % len), 5000);
    return () => clearInterval(id);
  }, [len]);

  /** 드래그/스와이프 */
  const trackRef = useRef<HTMLDivElement | null>(null);
  const startX = useRef(0);
  const currentX = useRef(0);
  const isDragging = useRef(false);

  const setTransform = (dx: number) => {
    if (!trackRef.current) return;
    const base = -index * 100;
    trackRef.current.style.transform = `translateX(calc(${base}% + ${dx}px))`;
  };

  const endDrag = () => {
    if (!isDragging.current) return;
    isDragging.current = false;

    const dx = currentX.current - startX.current;
    const threshold = 60;
    if (dx > threshold) {
      setIndex((i) => (i - 1 + len) % len);
    } else if (dx < -threshold) {
      setIndex((i) => (i + 1) % len);
    } else {
      if (trackRef.current) {
        trackRef.current.style.transition = 'transform 300ms ease';
        trackRef.current.style.transform = `translateX(${-index * 100}%)`;
        setTimeout(() => {
          if (trackRef.current) trackRef.current.style.transition = '';
        }, 310);
      }
    }
    startX.current = 0;
    currentX.current = 0;
  };

  const onPointerDown = (e: React.PointerEvent) => {
    isDragging.current = true;
    startX.current = e.clientX;
    currentX.current = e.clientX;
    if (trackRef.current) trackRef.current.style.transition = '';
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!isDragging.current) return;
    currentX.current = e.clientX;
    setTransform(currentX.current - startX.current);
  };

  const onPointerUp = (e: React.PointerEvent) => {
    (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
    endDrag();
  };

  const go = (dir: 'prev' | 'next') => {
    setIndex((i) => (dir === 'prev' ? (i - 1 + len) % len : (i + 1) % len));
  };

  const ProgressDots = useMemo(
    () => (
      <div className="flex items-center justify-center gap-2">
        {Array.from({ length: len }).map((_, i) => (
          <button
            key={i}
            aria-label={`Go to step ${i + 1}`}
            onClick={() => setIndex(i)}
            className={[
              'h-2.5 rounded-full transition-all duration-300',
              i === index ? 'w-8 bg-[#2d4739]' : 'w-4 bg-gray-300 hover:bg-gray-400',
            ].join(' ')}
          />
        ))}
      </div>
    ),
    [index, len]
  );

  const goToOpenForm = () => {
    window.location.href = '/main/store/openform'; // 스토어 개설 페이지 경로
  };

  const goToPersonalSellRegister = () => {
    window.location.href = '/auth/join/seller'; // 개인판매자 등록 페이지 경로
  };

  // CTA 버튼 렌더링 함수
  const renderCTAButton = () => {
    // 개인판매자인 경우 → 스토어 개설 버튼
    if (userIsPersonalSeller) {
      return (
        <button
          onClick={goToOpenForm}
          className="group relative inline-flex items-center gap-2 rounded-xl 
bg-[#6B8F7D] text-white px-6 py-3 font-semibold 
hover:bg-green-600 transform hover:scale-105 
transition-all duration-300 shadow-md hover:shadow-lg"
        >
          <span className="absolute inset-0 bg-white/20 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <Sparkles className="w-4 h-4 opacity-90 group-hover:rotate-12 transition-transform" />
          스토어 개설 신청
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </button>
      );
    } else if (userIsUser) {
      // 일반 유저인 경우 → 개인판매자 등록 버튼
      return (
        <button
          onClick={goToPersonalSellRegister}
          className="group relative inline-flex items-center gap-2 rounded-xl 
            bg-[#6B8F7D] text-white px-6 py-3 font-semibold 
            hover:bg-green-600 transform hover:scale-105 
            transition-all duration-300 shadow-md hover:shadow-lg"
        >
          <span className="absolute inset-0 bg-white/20 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <UserPlus className="w-4 h-4 opacity-90 group-hover:scale-110 transition-transform" />
          개인판매자 등록하기
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </button>
      );
    } else {
      // 로그인하지 않았거나 다른 역할인 경우
      return (
        <span
          className="inline-flex items-center gap-2 rounded-lg bg-gray-100/80 backdrop-blur-sm px-3 py-2 text-sm text-gray-700 opacity-0 animate-fade-in-slide"
          style={{ animationDelay: '0.3s' }}
        >
          <Info className="w-4 h-4 text-gray-500 animate-pulse" />
          로그인 후 이용 가능합니다
        </span>
      );
    }
  };

  // 하단 CTA 버튼 렌더링 함수
  const renderBottomCTAButton = () => {
    // 개인판매자인 경우 → 스토어 개설 버튼
    if (userIsPersonalSeller) {
      return (
        <button
          onClick={goToOpenForm}
          className="group relative inline-flex items-center gap-2 rounded-xl 
            bg-[#6B8F7D] text-white px-6 py-3 font-semibold 
            hover:bg-green-600 transform hover:scale-105 
            transition-all duration-300 shadow-md hover:shadow-lg"
        >
          <span className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <Sparkles className="w-5 h-5 group-hover:animate-spin" />
          지금 바로 개설하기
          <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform duration-300" />
        </button>
      );
    } else if (userIsUser) {
      return (
        <button
          onClick={goToPersonalSellRegister}
          className="group relative inline-flex items-center gap-2 rounded-xl 
            bg-[#6B8F7D] text-white px-6 py-3 font-semibold 
            hover:bg-green-600 transform hover:scale-105 
            transition-all duration-300 shadow-md hover:shadow-lg"
        >
          <span className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <UserPlus className="w-5 h-5 group-hover:scale-110 transition-transform" />
          개인판매자 등록하기
          <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform duration-300" />
        </button>
      );
    }
    return null;
  };

  return (
    <>
      {/* Global styles for animations */}
      <style>{`
        @keyframes slideInUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeInSlide {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeInScale {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes floaty { 
          0% { transform: translateY(0px) rotate(0deg); } 
          50% { transform: translateY(-15px) rotate(3deg); } 
          100% { transform: translateY(0px) rotate(0deg); } 
        }
        .animate-floaty { animation: floaty 8s ease-in-out infinite; }
        @keyframes reveal { 
          from { opacity: 0; transform: translateY(20px) scale(0.95) } 
          to { opacity: 1; transform: translateY(0) scale(1) } 
        }
        .reveal { animation: reveal .8s ease forwards; }
        .animate-fade-in-slide { animation: fadeInSlide 0.6s ease-out forwards; }
        .animate-fade-in-scale { animation: fadeInScale 0.6s ease-out forwards; }
      `}</style>

      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 relative overflow-hidden">
        {/* Floating geometric shapes */}
        <div className="absolute top-10 right-10 w-32 h-32 bg-gradient-to-br from-amber-300/15 to-orange-300/15 rounded-full blur-xl animate-pulse" />
        <div className="absolute top-1/3 left-10 w-24 h-24 bg-gradient-to-br from-emerald-300/20 to-green-400/20 rounded-lg rotate-45 blur-lg animate-floaty" />
        <div
          className="absolute bottom-20 right-1/4 w-40 h-40 bg-gradient-to-br from-teal-300/12 to-emerald-300/12 rounded-full blur-2xl animate-floaty"
          style={{ animationDelay: '2s' }}
        />
        <div
          className="absolute bottom-1/3 left-1/3 w-16 h-16 bg-gradient-to-br from-yellow-300/18 to-amber-400/18 rounded-full blur-md animate-pulse"
          style={{ animationDelay: '1s' }}
        />

        <Header />
        <Mainnavbar />
        <SellSubnavbar />

        {/* 🔶 240px padding + max 1440 */}
        <div className="px-4 sm:px-6 xl:px-[240px] pb-20 md:pb-20 relative z-10">
          <div className="w-full max-w-[1440px] mx-auto md:py-2">
            {/* --- HERO --- */}
            <section
              className={[
                'relative overflow-hidden rounded-xl md:rounded-2xl border border-gray-200/80 bg-white/90 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-500',
                'px-4 sm:px-6 md:px-10 py-6 sm:py-8 md:py-12',
                mounted ? 'reveal' : 'opacity-0',
              ].join(' ')}
            >
              {/* Decorations - 모바일에서 크기 조정 */}
              <div className="absolute top-0 right-0 w-32 sm:w-48 md:w-64 h-32 sm:h-48 md:h-64 bg-gradient-to-br from-indigo-100/60 to-purple-100/60 rounded-full blur-2xl md:blur-3xl transform translate-x-16 sm:translate-x-24 md:translate-x-32 -translate-y-16 sm:-translate-y-24 md:-translate-y-32 animate-floaty" />
              <div
                className="absolute bottom-0 left-0 w-24 sm:w-36 md:w-48 h-24 sm:h-36 md:h-48 bg-gradient-to-tr from-emerald-100/60 to-cyan-100/60 rounded-full blur-xl md:blur-2xl transform -translate-x-12 sm:-translate-x-18 md:-translate-x-24 translate-y-12 sm:translate-y-18 md:translate-y-24 animate-floaty"
                style={{ animationDelay: '1.5s' }}
              />
              <div
                className="absolute top-1/2 left-1/2 w-16 sm:w-24 md:w-32 h-16 sm:h-24 md:h-32 bg-gradient-to-r from-pink-100/40 to-rose-100/40 rounded-lg rotate-12 blur-lg md:blur-xl transform -translate-x-8 sm:-translate-x-12 md:-translate-x-16 -translate-y-8 sm:-translate-y-12 md:-translate-y-16 animate-floaty"
                style={{ animationDelay: '3s' }}
              />

              <div className="relative z-10 flex flex-col gap-4 sm:gap-6 md:flex-row md:items-center md:justify-between">
                <div className="flex-1">
                  <h1 className="text-xl sm:text-2xl md:text-[32px] font-extrabold tracking-[-0.02em] text-gray-900 flex items-center gap-2 sm:gap-3 leading-tight">
                    <span className="text-2xl sm:text-3xl md:text-4xl">🛒</span>
                    <span className="break-keep">개인 판매를 시작해보세요</span>
                  </h1>
                  <p
                    className="text-sm sm:text-base text-gray-700 mt-2 opacity-0 animate-fade-in-slide leading-relaxed break-keep"
                    style={{ animationDelay: '0.2s' }}
                  >
                    간단한 절차만 거치면 누구나 자신의 상품을 판매할 수 있습니다! 이미 개인판매자로
                    등록되어 있다면 스토어 개설을 해보세요!
                  </p>

                  {/* 혜택 배지 - 모바일에서 세로 배치 */}
                  <div className="mt-3 sm:mt-4 flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center gap-2">
                    <span
                      className="inline-flex items-center rounded-full bg-gradient-to-r from-amber-100 to-yellow-100 text-amber-800 text-xs font-semibold px-3 py-1.5 hover:from-amber-200 hover:to-yellow-200 transform hover:scale-105 transition-all duration-300 shadow-sm hover:shadow-md opacity-0 animate-fade-in-scale whitespace-nowrap"
                      style={{ animationDelay: '0.4s' }}
                    >
                      🎉 수수료 0원 (한시적)
                    </span>
                    <span
                      className="inline-flex items-center rounded-full bg-gradient-to-r from-emerald-100 to-green-100 text-emerald-800 text-xs font-semibold px-3 py-1.5 hover:from-emerald-200 hover:to-green-200 transform hover:scale-105 transition-all duration-300 shadow-sm hover:shadow-md opacity-0 animate-fade-in-scale"
                      style={{ animationDelay: '0.5s' }}
                    >
                      ⚡ 별도 검수 없이 1일 이내 등록
                    </span>
                    <span
                      className="inline-flex items-center rounded-full bg-gradient-to-r from-sky-100 to-blue-100 text-sky-800 text-xs font-semibold px-3 py-1.5 hover:from-sky-200 hover:to-blue-200 transform hover:scale-105 transition-all duration-300 shadow-sm hover:shadow-md opacity-0 animate-fade-in-scale"
                      style={{ animationDelay: '0.6s' }}
                    >
                      📦 정산·배송 시스템 플랫폼 책임
                    </span>
                  </div>

                  <p
                    className="text-xs text-gray-500 mt-3 leading-relaxed opacity-0 animate-fade-in-slide break-keep"
                    style={{ animationDelay: '0.7s' }}
                  >
                    ※ 판매자는 상품의 내용과 배송 정보를 성실히 기재해야 하며, 허위 정보 등록 시
                    제재를 받을 수 있습니다.
                  </p>
                </div>

                {/* CTA - 모바일에서 전체 너비 */}
                <div className="w-full md:w-auto md:text-right mt-2 sm:mt-0">
                  {renderCTAButton()}
                </div>
              </div>
            </section>

            {/* Benefits grid - 모바일 반응형 최적화 */}
            <section className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-5 md:gap-6 mt-6 sm:mt-8 md:mt-10">
              <Benefit
                title="안전한 거래/정산"
                desc="결제·정산 프로세스는 플랫폼이 안전하게 관리합니다."
                icon={<ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5 text-[#2d4739]" />}
                delay={100}
                isVisible={isVisible}
              />
              <Benefit
                title="간편한 배송 연동"
                desc="송장/배송 추적까지 시스템에서 자동으로 연동합니다."
                icon={<Truck className="w-4 h-4 sm:w-5 sm:h-5 text-[#2d4739]" />}
                delay={200}
                isVisible={isVisible}
              />
              <Benefit
                title="다양한 결제 수단"
                desc="카드/계좌이체/간편결제 등 여러 수단을 지원합니다."
                icon={<CreditCard className="w-4 h-4 sm:w-5 sm:h-5 text-[#2d4739]" />}
                delay={300}
                isVisible={isVisible}
              />
            </section>

            {/* --- 스텝 캐러셀 --- */}
            <section className="mt-10 md:mt-14">
              <div className="rounded-2xl border border-gray-200/80 bg-white/90 backdrop-blur-sm shadow-lg overflow-hidden">
                {/* 상단 타이틀 + 인디케이터 */}
                <div className="flex items-center justify-between px-4 md:px-6 py-4 border-b">
                  <h2 className="text-lg md:text-xl font-semibold text-gray-900">
                    시작은 이렇게, 5단계
                  </h2>
                  <div className="hidden md:block">{ProgressDots}</div>
                </div>

                {/* 슬라이더 뷰포트 */}
                <div
                  className="relative select-none"
                  onPointerDown={onPointerDown}
                  onPointerMove={onPointerMove}
                  onPointerUp={onPointerUp}
                  onPointerCancel={onPointerUp}
                >
                  {/* 트랙 */}
                  <div
                    ref={trackRef}
                    className="flex w-full transition-transform duration-500 ease-[cubic-bezier(.22,.61,.36,1)]"
                    style={{ transform: `translateX(${-index * 100}%)` }}
                  >
                    {STEPS.map((step, i) => (
                      <article key={i} className="min-w-full grid grid-cols-1 lg:grid-cols-2">
                        {/* 이미지 영역 */}
                        <div className="relative overflow-hidden bg-gray-50">
                          <img
                            src={step.img}
                            alt={step.caption || step.title}
                            className="h-full w-full object-cover"
                            loading="lazy"
                          />
                          {step.caption && (
                            <div className="absolute bottom-2 left-2 md:bottom-4 md:left-4 px-2 py-1.5 md:px-3 md:py-2 rounded-lg bg-black/70 backdrop-blur-sm text-white text-[11px] md:text-xs font-medium">
                              {step.caption}
                            </div>
                          )}
                        </div>

                        {/* 텍스트 영역 */}
                        <div className="p-5 md:p-8 flex flex-col">
                          <div className="mb-3">
                            <span className="inline-flex items-center rounded-full bg-[#2d4739]/10 text-[#2d4739] text-xs font-semibold px-2.5 py-1">
                              {i + 1} / {len}
                            </span>
                          </div>
                          <h3 className="text-lg md:text-xl font-bold text-gray-900">
                            {step.title}
                          </h3>
                          <p className="mt-2 text-gray-700">{step.body}</p>

                          {i === 2 && (
                            <p className="mt-3 text-sm text-emerald-700 inline-flex items-center gap-2">
                              <CheckCircle2 className="w-4 h-4" />한 번 등록하면 1일 이내 노출
                              가능(검수 없음)
                            </p>
                          )}

                          {/* 하단 컨트롤 */}
                          <div className="mt-auto pt-6 flex items-center justify-between">
                            <div className="md:hidden">{ProgressDots}</div>
                            <div className="flex items-center gap-2">
                              <button
                                aria-label="Prev"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  go('prev');
                                }}
                                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 active:scale-95 transition"
                              >
                                <ChevronLeft className="w-5 h-5" />
                              </button>
                              <button
                                aria-label="Next"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  go('next');
                                }}
                                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 active:scale-95 transition"
                              >
                                <ChevronRight className="w-5 h-5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            {/* --- 하단 CTA --- */}
            {(userIsSeller || userIsPersonalSeller || userIsUser) && (
              <div
                className="mt-2 md:mt-12 text-center opacity-0 animate-fade-in-slide"
                style={{ animationDelay: '0.6s' }}
              >
                {renderBottomCTAButton()}
                <p className="text-sm text-gray-600 mt-3 animate-pulse">
                  {userIsSeller || userIsPersonalSeller
                    ? '⚡ 단 2분이면 완료됩니다'
                    : '⚡ 개인판매자로 새로운 시작을 해보세요'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

/** 이점 카드 컴포넌트 */
const Benefit = ({
  title,
  desc,
  icon,
  delay = 0,
  isVisible,
}: {
  title: string;
  desc: string;
  icon: React.ReactNode;
  delay?: number;
  isVisible: boolean;
}) => {
  const [cardVisible, setCardVisible] = useState(false);

  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        setCardVisible(true);
      }, delay);
      return () => clearTimeout(timer);
    }
  }, [isVisible, delay]);

  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border border-gray-200/80 bg-white/90 backdrop-blur-sm p-5 md:p-6 shadow-lg hover:shadow-xl transition-all duration-500 hover:-translate-y-2 hover:scale-105 ${
        cardVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
      }`}
    >
      {/* Hover background */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/50 via-white to-purple-50/50 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

      {/* Subtle border glow */}
      <div className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-gradient-to-br from-indigo-200/20 to-purple-200/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

      <div className="relative z-10 flex items-start gap-3">
        <div className="mt-0.5 shrink-0 rounded-xl bg-gradient-to-br from-[#2d4739]/10 to-emerald-500/10 p-3 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 group-hover:shadow-lg">
          <div className="group-hover:scale-110 transition-transform duration-300">{icon}</div>
        </div>
        <div>
          <h4 className="font-semibold text-gray-900 group-hover:text-[#2d4739] transition-colors duration-300">
            {title}
          </h4>
          <p className="text-sm text-gray-600 mt-1 group-hover:text-gray-700 transition-colors duration-300">
            {desc}
          </p>
        </div>
      </div>

      {/* Decorative corners */}
      <div className="absolute top-0 right-0 w-8 h-8 bg-gradient-to-br from-indigo-200/30 to-purple-200/30 rounded-bl-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      <div className="absolute bottom-0 left-0 w-6 h-6 bg-gradient-to-tr from-emerald-200/30 to-cyan-200/30 rounded-tr-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
    </div>
  );
};

export default MainSellSellguide;
