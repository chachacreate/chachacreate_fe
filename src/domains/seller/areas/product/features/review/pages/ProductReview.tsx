// src/domains/seller/areas/product/features/review/pages/ProductReviewList.tsx
import type { FC, ChangeEvent } from "react";
import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import Header from "@src/shared/areas/layout/features/header/Header";
import Mainnavbar from "@src/shared/areas/navigation/features/navbar/main/Mainnavbar";
import SellerSidenavbar from "@src/shared/areas/navigation/features/sidenavbar/seller/SellerSidenavbar";
import { Star, ThumbsUp, Search } from "lucide-react";

type Params = { storeUrl: string };

type Review = {
  id: string;
  productId: string;
  productName: string;
  productImage?: string;
  productCreatedAt: string; // 상품 등록일
  createdAt: string;        // 리뷰 작성일
  updatedAt?: string;       // 리뷰 수정일
  author: string;
  content: string;
  rating: number;           // 1~5
  likes: number;
};

const PLACEHOLDER_IMG =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='160' height='120'><rect width='100%' height='100%' fill='#f3f4f6'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='#9ca3af' font-size='12'>No Image</text></svg>`
  );

// ---- Mock 데이터 (API 연동 전 테스트용) ----
const MOCK_REVIEWS: Review[] = [
  {
    id: "r1",
    productId: "P-1001",
    productName: "수제 머그컵",
    productImage: "",
    productCreatedAt: "2025-08-14",
    createdAt: "2025-09-01",
    updatedAt: "2025-09-02",
    author: "green****",
    content: "유약 색감이 정말 예뻐요. 손에 착 감깁니다.",
    rating: 5,
    likes: 12,
  },
  {
    id: "r2",
    productId: "P-1001",
    productName: "수제 머그컵",
    productImage: "",
    productCreatedAt: "2025-08-14",
    createdAt: "2025-08-28",
    author: "craft****",
    content: "배송이 조금 느렸지만 제품은 만족합니다.",
    rating: 4,
    likes: 3,
  },
  {
    id: "r3",
    productId: "P-2001",
    productName: "라탄 코스터 세트",
    productImage: "",
    productCreatedAt: "2025-07-30",
    createdAt: "2025-08-10",
    updatedAt: "2025-08-12",
    author: "hand****",
    content: "집 분위기가 따뜻해졌어요 :) 선물용으로도 좋을 듯!",
    rating: 5,
    likes: 8,
  },
  {
    id: "r4",
    productId: "P-3001",
    productName: "우드 트레이",
    productImage: "",
    productCreatedAt: "2025-06-22",
    createdAt: "2025-07-02",
    author: "wood****",
    content: "마감이 아주 깔끔하진 않네요. 그래도 실용적입니다.",
    rating: 3,
    likes: 1,
  },
];

type SortKey = "latest" | "rating" | "likes";

const ProductReviewList: FC = () => {
  const { storeUrl } = useParams<Params>();
  const [selectedProduct, setSelectedProduct] = useState<string>("all");
  const [sortKey, setSortKey] = useState<SortKey>("latest");
  const [q, setQ] = useState<string>("");

  // 상품 드롭다운 옵션
  const products = useMemo(() => {
    const map = new Map<string, string>();
    MOCK_REVIEWS.forEach((r) => map.set(r.productId, r.productName));
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, []);

  // 필터 + 검색 + 정렬
  const filtered = useMemo(() => {
    let list = [...MOCK_REVIEWS];

    if (selectedProduct !== "all") {
      list = list.filter((r) => r.productId === selectedProduct);
    }
    if (q.trim()) {
      const term = q.trim().toLowerCase();
      list = list.filter(
        (r) =>
          r.author.toLowerCase().includes(term) ||
          r.content.toLowerCase().includes(term)
      );
    }

    switch (sortKey) {
      case "rating":
        list.sort((a, b) => b.rating - a.rating || b.likes - a.likes);
        break;
      case "likes":
        list.sort((a, b) => b.likes - a.likes || cmpDate(b.createdAt, a.createdAt));
        break;
      case "latest":
      default:
        list.sort((a, b) => cmpDate(b.createdAt, a.createdAt));
    }
    return list;
  }, [selectedProduct, sortKey, q]);

  const total = filtered.length;

  function cmpDate(a: string, b: string) {
    // "YYYY-MM-DD" 기준
    return new Date(a).getTime() - new Date(b).getTime();
  }

  function onChangeProduct(e: ChangeEvent<HTMLSelectElement>) {
    setSelectedProduct(e.target.value);
  }

  return (
    <>
      <Header />
      <Mainnavbar />

      <SellerSidenavbar>
        <div className="space-y-6">
          {/* 헤더/요약 */}
          <section className="rounded-2xl overflow-hidden border border-emerald-100">
            <div className="bg-gradient-to-r from-[#2D4739] to-emerald-700 px-6 py-7 text-white">
              <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5">
                <div>
                  <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight">
                    리뷰 관리
                  </h1>
                  <p className="text-emerald-50/90 mt-1">
                    스토어: <span className="font-semibold">{storeUrl}</span>
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <div className="rounded-xl bg-white/10 backdrop-blur px-4 py-2">
                    <span className="text-emerald-100 text-xs">리뷰 수</span>
                    <div className="text-base font-bold leading-none">{total}개</div>
                  </div>
                  <div className="rounded-xl bg-white/10 backdrop-blur px-4 py-2">
                    <span className="text-emerald-100 text-xs">상품 수</span>
                    <div className="text-base font-bold leading-none">
                      {products.length}개
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 컨트롤 바 */}
            <div className="bg-white/90 backdrop-blur border-t border-emerald-100 px-4 sm:px-6 py-3">
              <div className="grid gap-3 md:grid-cols-[1fr_auto_auto]">
                {/* 상품 선택 */}
                <div className="flex items-center gap-3">
                  <label className="text-sm font-medium text-gray-700 shrink-0">
                    상품
                  </label>
                  <select
                    value={selectedProduct}
                    onChange={onChangeProduct}
                    className="w-full md:w-72 rounded-lg border-gray-300 bg-white text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                  >
                    <option value="all">전체 상품</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 검색 */}
                <div className="flex items-center gap-2">
                  <div className="relative w-full md:w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      value={q}
                      onChange={(e) => setQ(e.target.value)}
                      placeholder="작성자/내용 검색"
                      className="w-full rounded-lg border-gray-300 pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200"
                    />
                  </div>
                </div>

                {/* 정렬 */}
                <div className="flex items-center gap-3">
                  <label className="text-sm font-medium text-gray-700 shrink-0">
                    정렬
                  </label>
                  <select
                    value={sortKey}
                    onChange={(e) => setSortKey(e.target.value as SortKey)}
                    className="rounded-lg border-gray-300 bg-white text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                  >
                    <option value="latest">최신순</option>
                    <option value="rating">평점순</option>
                    <option value="likes">좋아요순</option>
                  </select>
                </div>
              </div>
            </div>
          </section>

          {/* 목록 */}
          <section className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            {/* 모바일 카드뷰 */}
            <div className="block md:hidden divide-y">
              {filtered.length === 0 ? (
                <div className="text-center py-20">
                  <div className="text-6xl mb-3">📝</div>
                  <p className="text-gray-500">표시할 리뷰가 없습니다.</p>
                </div>
              ) : (
                filtered.map((r) => <ReviewCard key={r.id} r={r} />)
              )}
            </div>

            {/* 데스크톱 테이블뷰 */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-600">
                      <th className="px-4 py-3 w-32 sticky top-0 z-20 bg-gray-50 border-b">리뷰 작성일</th>
                      <th className="px-4 py-3 w-20 sticky top-0 z-20 bg-gray-50 border-b">대표 이미지</th>
                      <th className="px-4 py-3 min-w-[200px] sticky top-0 z-20 bg-gray-50 border-b">상품 이름</th>
                      <th className="px-4 py-3 w-40 sticky top-0 z-20 bg-gray-50 border-b">작성자</th>
                      <th className="px-4 py-3 min-w-[300px] sticky top-0 z-20 bg-gray-50 border-b">리뷰 내용</th>
                      <th className="px-4 py-3 w-32 sticky top-0 z-20 bg-gray-50 border-b">상품 등록일</th>
                      <th className="px-4 py-3 w-28 sticky top-0 z-20 bg-gray-50 border-b">상품 평점</th>
                      <th className="px-4 py-3 w-24 sticky top-0 z-20 bg-gray-50 border-b">좋아요</th>
                      <th className="px-4 py-3 w-32 sticky top-0 z-20 bg-gray-50 border-b">수정일</th>
                    </tr>
                  </thead>

                <tbody className="[&_tr:nth-child(even)]:bg-gray-50/40">
                  {filtered.map((r) => (
                    <tr key={r.id} className="border-b border-gray-100 hover:bg-emerald-50/40">
                      <td className="px-4 py-3 align-top text-xs">{r.createdAt}</td>

                      <td className="px-4 py-3 align-top">
                        <div
                          className="h-12 w-16 overflow-hidden rounded-md border hover:ring-1 hover:ring-gray-300"
                          title={r.productName}
                        >
                          <img
                            src={r.productImage || PLACEHOLDER_IMG}
                            alt={r.productName}
                            className="h-full w-full object-cover"
                          />
                        </div>
                      </td>

                      <td className="px-4 py-3 align-top">
                        <div className="font-medium text-gray-900 truncate">{r.productName}</div>
                        <div className="text-[11px] text-gray-500 mt-0.5">{r.productId}</div>
                      </td>

                      <td className="px-4 py-3 align-top text-gray-800">{r.author}</td>

                      <td className="px-4 py-3 align-top">
                        <p className="text-gray-700 leading-relaxed line-clamp-3">{r.content}</p>
                      </td>

                      <td className="px-4 py-3 align-top text-xs">{r.productCreatedAt}</td>

                      <td className="px-4 py-3 align-top">
                        <div className="inline-flex items-center gap-1.5 font-semibold text-[#2D4739]">
                          <Star className="h-4 w-4 fill-current" />
                          {r.rating.toFixed(1)}
                        </div>
                      </td>

                      <td className="px-4 py-3 align-top">
                        <div className="inline-flex items-center gap-1.5 text-gray-800">
                          <ThumbsUp className="h-4 w-4" />
                          <span className="font-medium">{r.likes}</span>
                        </div>
                      </td>

                      <td className="px-4 py-3 align-top text-xs">
                        {r.updatedAt ? (
                          <span className="text-gray-700">{r.updatedAt}</span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                    </tr>
                  ))}

                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={9} className="px-4 py-16 text-center">
                        <div className="text-gray-400 text-3xl mb-3">📝</div>
                        <p className="text-gray-500">표시할 리뷰가 없습니다.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </SellerSidenavbar>
    </>
  );
};

export default ProductReviewList;

// ----- 하위 컴포넌트: 모바일 카드 -----
const ReviewCard: FC<{ r: Review }> = ({ r }) => {
  return (
    <article className="p-4">
      <div className="flex items-start gap-4">
        <img
          src={r.productImage || PLACEHOLDER_IMG}
          alt={r.productName}
          className="h-16 w-20 rounded-lg border object-cover"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-semibold text-gray-900 truncate">{r.productName}</h3>
            <span className="text-xs text-gray-500 shrink-0">{r.createdAt}</span>
          </div>

          <p className="mt-1 text-gray-700 text-sm">{r.content}</p>

          <div className="mt-3 flex items-center justify-between">
            <div className="inline-flex items-center gap-1.5 font-semibold text-[#2D4739]">
              <Star className="h-4 w-4 fill-current" />
              {r.rating.toFixed(1)}
            </div>
            <div className="inline-flex items-center gap-1.5 text-gray-800">
              <ThumbsUp className="h-4 w-4" />
              <span className="font-medium">{r.likes}</span>
            </div>
          </div>

          <div className="mt-2 text-[11px] text-gray-500">
            상품 등록일 {r.productCreatedAt}
            {r.updatedAt && <span className="ml-2">· 수정 {r.updatedAt}</span>}
          </div>
        </div>
      </div>
    </article>
  );
};
