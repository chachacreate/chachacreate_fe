// src/domains/main/areas/mypage/pages/MainMypageMyreviews.tsx
import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, Loader2, Star, ThumbsUp } from 'lucide-react';

import Header from '@src/shared/areas/layout/features/header/Header';
import Mainnavbar from '@src/shared/areas/navigation/features/navbar/main/Mainnavbar';
import MypageSidenavbar from '@src/shared/areas/navigation/features/sidenavbar/mypage/MypageSidenavbar';

import { get } from '@src/libs/request';
import type { ApiResponse } from '@src/libs/apiResponse';
import Storenavbar from '@src/shared/areas/navigation/features/navbar/store/Storenavbar';

//서버 DTO 타입
type ReviewListItemDTO = {
  reviewId: number;
  productId: number;
  reviewCreatedAt?: string; // "2025-09-09T10:33:31"
  productThumbnailUrl?: string | null;
  productName?: string | null;
  authorId: number;
  authorName: string;
  content: string;
  productRating?: string; // "4.50/5.0" 형태
  likeCount: number;
  reviewUpdatedAt?: string;
  createdAt?: string; // 일부 데이터에 존재
};

// UI 모델 타입 (화면 표시용으로 가공)
type ReviewItem = {
  id: number;
  productId: number;
  name: string;
  image?: string | null;
  content: string;
  createdDate: string; // YYYY-MM-DD
  createdAtTs: number; // 정렬용 timestamp
  rating: number; // 0~5 (소수점)
  likes: number;
};

// 상수
const API_ENDPOINT = '/mypage/reviews/reviews';
const BRAND = '#2d4739';

/** 이미지 없을 때 placeholder */
const PLACEHOLDER =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480">
       <rect width="100%" height="100%" fill="#f3f4f6"/>
       <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle"
             fill="#9ca3af" font-family="sans-serif" font-size="16">
         No Image
       </text>
     </svg>`
  );

// 유틸 함수

/** "2025-09-09T10:33:31" → "2025-09-09" */
const toDate = (iso?: string) => (iso ? iso.slice(0, 10) : '');

/** 날짜 문자열을 timestamp로 (없으면 0) */
const toTs = (iso?: string) => (iso ? new Date(iso).getTime() : 0);

/** "4.50/5.0" → 4.5 */
const parseRating = (raw?: string): number => {
  if (!raw) return 0;
  const [head] = raw.split('/');
  const n = Number(head);
  return Number.isFinite(n) ? n : 0;
};

// 서버 DTO → UI 모델로 변환
const adapt = (dto: ReviewListItemDTO): ReviewItem => {
  // 날짜 우선순위: reviewCreatedAt > createdAt
  const createdIso = dto.reviewCreatedAt ?? dto.createdAt ?? '';
  return {
    id: dto.reviewId,
    productId: dto.productId,
    name: dto.productName ?? '(상품명 없음)',
    image: dto.productThumbnailUrl ?? null,
    content: dto.content ?? '',
    createdDate: toDate(createdIso),
    createdAtTs: toTs(createdIso),
    rating: parseRating(dto.productRating),
    likes: dto.likeCount ?? 0,
  };
};

// 메인 컴포넌트
export default function MainMypageMyreviews() {
  // 데이터 상태
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [unauthorized, setUnauthorized] = useState(false);

  // StrictMode 2회 실행 방지용 가드
  const didFetchRef = useRef(false);

  /** 서버 호출 */
  const fetchReviews = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      setUnauthorized(false);

      // 응답 래퍼 형태가 axios형/직접형 등 혼재할 수 있어 안전하게 처리
      const res = await get<ApiResponse<ReviewListItemDTO[]>>(API_ENDPOINT);

      let envelope: ApiResponse<ReviewListItemDTO[]> | null = null;

      if (res && typeof res === 'object' && 'data' in (res as any)) {
        const d = (res as any).data;
        if (d && typeof d === 'object' && 'data' in d) {
          envelope = d as ApiResponse<ReviewListItemDTO[]>;
        } else if (Array.isArray(d)) {
          envelope = { data: d, status: 200, message: '' } as ApiResponse<ReviewListItemDTO[]>;
        } else {
          envelope = d as ApiResponse<ReviewListItemDTO[]>;
        }
      } else {
        envelope = res as ApiResponse<ReviewListItemDTO[]>;
      }

      // 권한 체크
      if ((envelope as any)?.status === 401) {
        setUnauthorized(true);
        setItems([]);
        return;
      }

      const raw = Array.isArray(envelope?.data) ? envelope!.data : [];
      const list = raw.map(adapt);

      // 최신 작성 순으로 정렬 (createdAtTs desc)
      list.sort((a, b) => b.createdAtTs - a.createdAtTs);

      setItems(list);
    } catch (e: any) {
      const httpStatus = e?.response?.status;
      if (httpStatus === 401) {
        setUnauthorized(true);
        setItems([]);
        return;
      }
      setErrorMsg(e?.message ?? '리뷰 목록을 불러오는 중 오류가 발생했습니다.');
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (didFetchRef.current) return;
    didFetchRef.current = true;
    fetchReviews();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 데이터 유무 메모
  const hasData = useMemo(
    () => !loading && !errorMsg && items.length > 0,
    [loading, errorMsg, items.length]
  );

  // 본문 더보기 토글
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const toggleExpand = (id: number) => setExpanded((p) => ({ ...p, [id]: !p[id] }));

  const isMain = location.pathname.startsWith('/main');
  return (
    <div
      className="min-h-screen font-jua pb-12"
      style={{ background: 'linear-gradient(135deg,#f8fafc 0%,#f1f5f9 100%)' }}
    >
      <Header />
      {isMain ? <Mainnavbar /> : <Storenavbar />}

      {/* 모바일: 독립 페이지 느낌 (뒤로가기 포함) */}
      <div className="lg:hidden">
        {/* 상단 고정 바 */}
        <div className="sticky top-0 z-50 bg-white border-b border-gray-200">
          <div className="px-4 py-3 flex items-center gap-3">
            <button
              type="button"
              onClick={() =>
                history.length > 1 ? history.back() : (window.location.href = '/main/mypage')
              }
              className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-white border border-gray-200 shadow-sm hover:bg-gray-50 active:scale-95 transition-all"
              aria-label="뒤로가기"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-bold text-gray-900">작성 리뷰</h1>
            <div className="flex-1" />
          </div>
        </div>

        {/* 본문 */}
        <div className="px-4 py-4 space-y-6">
          {/* 헤더 설명 카드 */}
          <div className="rounded-2xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-4 bg-gradient-to-r from-[#2d4739] to-gray-800">
              <h2 className="text-white text-lg">작성 리뷰</h2>
              <p className="text-gray-200 text-xs mt-0.5">
                내가 남긴 리뷰를 확인하고 내용을 다시 읽어볼 수 있어요.
              </p>
            </div>
          </div>

          {/* 상태 메시지 */}
          {loading && (
            <div className="rounded-xl border border-gray-200 bg-white p-4 text-gray-500">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                불러오는 중…
              </div>
            </div>
          )}
          {errorMsg && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-700">
              {errorMsg}
            </div>
          )}
          {unauthorized && !loading && !errorMsg && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-700">
              로그인 후 리뷰를 확인할 수 있습니다.
            </div>
          )}

          {/* 카드 리스트 */}
          {!loading && !errorMsg && items.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center text-gray-500">
              아직 작성한 리뷰가 없습니다.
            </div>
          ) : (
            <ul className="space-y-4">
              {items.map((rv) => {
                const isOpen = !!expanded[rv.id];
                const tooLong = rv.content.length > 120;
                const display = isOpen ? rv.content : rv.content.slice(0, 120);
                return (
                  <li
                    key={rv.id}
                    className="rounded-xl border border-gray-200 bg-white overflow-hidden"
                  >
                    <div className="p-4 flex gap-3">
                      <a
                        href={`/main/product/${rv.productId}`}
                        className="w-20 h-20 rounded-lg bg-gray-100 overflow-hidden shrink-0"
                      >
                        <img
                          src={rv.image || PLACEHOLDER}
                          alt={rv.name}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </a>

                      <div className="min-w-0 flex-1">
                        <a
                          href={`/main/product/${rv.productId}`}
                          className="text-base font-semibold text-gray-900 hover:underline"
                        >
                          {rv.name}
                        </a>

                        {/* 평점 + 날짜 + 좋아요 (항상 한 줄로) */}
                        <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-gray-600">
                          <span className="inline-flex items-center gap-1 whitespace-nowrap tabular-nums">
                            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                            {rv.rating.toFixed(1)} <span className="text-gray-400">/</span> 5
                          </span>
                          <span className="text-gray-400">•</span>
                          <span>{rv.createdDate}</span>
                          <span className="text-gray-400">•</span>
                          <span className="inline-flex items-center gap-1">
                            <ThumbsUp className="w-4 h-4 text-blue-800" />
                            {rv.likes}
                          </span>
                        </div>

                        {/* 내용 */}
                        <p className="mt-2 text-sm text-gray-700 whitespace-pre-wrap">
                          {display}
                          {!isOpen && tooLong && <span className="text-gray-400">…</span>}
                        </p>

                        {tooLong && (
                          <button
                            type="button"
                            onClick={() => toggleExpand(rv.id)}
                            className="mt-2 inline-flex items-center text-xs px-2 py-1 rounded-md border hover:bg-gray-50 active:scale-95 transition"
                          >
                            {isOpen ? '접기' : '더보기'}
                          </button>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          <div className="pb-6" />
        </div>
      </div>

      {/* 데스크톱: 사이드바 + 1440 컨텐츠 영역 + 표 */}
      <div className="hidden lg:block">
        <MypageSidenavbar>
          <div className="mx-auto w-full max-w-[1440px]">
            <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
              {/* 헤더 */}
              <div className="bg-gradient-to-r from-[#2d4739] to-gray-800 px-6 md:px-8 py-5 md:py-6">
                <h2 className="text-xl md:text-2xl text-white mb-1.5 md:mb-2">작성 리뷰</h2>
                <p className="text-gray-200 text-xs md:text-sm">
                  내가 남긴 리뷰를 표로 확인하고 본문을 펼쳐볼 수 있어요.
                </p>
              </div>

              {/* 상태 메시지 */}
              <div className="p-6">
                {loading && (
                  <div className="rounded-lg border border-gray-200 bg-white p-4 text-gray-500">
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      불러오는 중…
                    </div>
                  </div>
                )}
                {errorMsg && (
                  <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-rose-700">
                    {errorMsg}
                  </div>
                )}
                {unauthorized && !loading && !errorMsg && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-700">
                    로그인 후 리뷰를 확인할 수 있습니다.
                  </div>
                )}

                {/* 표 or 빈 상태 */}
                {!hasData ? (
                  !loading &&
                  !errorMsg && (
                    <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center text-gray-500">
                      아직 작성한 리뷰가 없습니다.
                    </div>
                  )
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-gray-200">
                    <table className="min-w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr className="text-left text-gray-600">
                          <th className="py-3 px-4">상품</th>
                          <th className="py-3 px-4 w-[45%]">리뷰 내용</th>
                          <th className="py-3 px-4">작성일</th>
                          <th className="py-3 px-4">평점</th>
                          <th className="py-3 px-4">좋아요</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {items.map((rv) => {
                          const isOpen = !!expanded[rv.id];
                          const tooLong = rv.content.length > 140;
                          const display = isOpen ? rv.content : rv.content.slice(0, 140);
                          return (
                            <tr key={rv.id} className="align-top">
                              {/* 상품(사진+이름) */}
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-3 min-w-[280px]">
                                  <a
                                    href={`/main/product/${rv.productId}`}
                                    className="block w-16 h-16 rounded-lg overflow-hidden bg-gray-100 shrink-0"
                                  >
                                    <img
                                      src={rv.image || PLACEHOLDER}
                                      alt={rv.name}
                                      className="w-full h-full object-cover"
                                      loading="lazy"
                                    />
                                  </a>
                                  <div className="min-w-0">
                                    <a
                                      href={`/main/product/${rv.productId}`}
                                      className="text-gray-900 font-medium hover:underline line-clamp-2"
                                    >
                                      {rv.name}
                                    </a>
                                  </div>
                                </div>
                              </td>

                              {/* 리뷰 내용 */}
                              <td className="py-3 px-4">
                                <p className="text-gray-700 whitespace-pre-wrap">
                                  {display}
                                  {!isOpen && tooLong && <span className="text-gray-400">…</span>}
                                </p>
                                {tooLong && (
                                  <button
                                    type="button"
                                    onClick={() => toggleExpand(rv.id)}
                                    className="mt-2 inline-flex items-center text-xs px-2 py-1 rounded-md border hover:bg-gray-50 active:scale-95 transition"
                                  >
                                    {isOpen ? '접기' : '더보기'}
                                  </button>
                                )}
                              </td>

                              {/* 작성일 */}
                              <td className="py-3 px-4 text-gray-700 whitespace-nowrap">
                                {rv.createdDate}
                              </td>

                              {/* 평점 (항상 한 줄) */}
                              <td className="py-3 px-4 whitespace-nowrap">
                                <div className="inline-flex items-center gap-1 text-gray-800 tabular-nums">
                                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                                  <span className="font-medium">{rv.rating.toFixed(1)}</span>
                                  <span className="text-gray-400">/</span>
                                  <span>5</span>
                                </div>
                              </td>

                              {/* 좋아요 */}
                              <td className="py-3 px-4">
                                <div className="inline-flex items-center gap-1 text-gray-800">
                                  <ThumbsUp className="w-4 h-4 text-blue-800" />
                                  <span className="font-medium">{rv.likes}</span>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        </MypageSidenavbar>
      </div>
    </div>
  );
}
