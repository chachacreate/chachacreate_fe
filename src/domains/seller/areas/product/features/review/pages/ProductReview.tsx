// src/domains/seller/areas/product/features/review/pages/ProductReviewList.tsx
import type { FC, ChangeEvent } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import Header from '@src/shared/areas/layout/features/header/Header';
import SellerSidenavbar from '@src/shared/areas/navigation/features/sidenavbar/seller/SellerSidenavbar';
import { Star, ThumbsUp, Search } from 'lucide-react';
import { get, legacyGet } from '@src/libs/request';

type Params = { storeUrl: string };

type Review = {
  id: string;
  productId: string;
  productName: string;
  productImage?: string;
  productCreatedAt: string; // 상품 등록일
  createdAt: string; // 리뷰 작성일
  updatedAt?: string; // 리뷰 수정일
  author: string;
  content: string;
  rating: number; // 1~5
  likes: number;
};

type ApiReview = {
  reviewId: number;
  reviewCreatedAt: string;
  productThumbnailUrl?: string;
  productName: string;
  authorId: number;
  authorName: string;
  content: string;
  productId?: number;
  productCreatedAt?: string | null;
  productRating?: string; // "4.5/5.0" 형태
  likeCount: number;
  reviewUpdatedAt?: string;
};

type SortKey = 'latest' | 'rating' | 'likes';

const ProductReviewList: FC = () => {
  const { storeUrl } = useParams<Params>();
  const [selectedProduct, setSelectedProduct] = useState<string>('all');
  const [sortKey, setSortKey] = useState<SortKey>('latest');
  const [q, setQ] = useState<string>('');

  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchReviews() {
      setLoading(true);
      setError(null);
      try {
        const url =
          selectedProduct === 'all'
            ? `/seller/${storeUrl}/review`
            : `/seller/${storeUrl}/review/${selectedProduct}`;

        const response = await get<ApiReview[]>(url);

        // API 응답 -> 화면용 Review 타입으로 변환
        const data: Review[] = response.data.map((r) => ({
          id: String(r.reviewId),
          productId: String(r.productId || 'unknown'),
          productName: r.productName,
          productImage: r.productThumbnailUrl || '',
          productCreatedAt: r.productCreatedAt || '',
          createdAt: r.reviewCreatedAt.split('T')[0],
          updatedAt: r.reviewUpdatedAt ? r.reviewUpdatedAt.split('T')[0] : '',
          author: r.authorName,
          content: r.content,
          rating: parseFloat(r.productRating?.split('/')[0] || '0'),
          likes: r.likeCount,
        }));

        setReviews(data);
      } catch (error: any) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }

    fetchReviews();
  }, [storeUrl, selectedProduct]);

  // 상품 드롭다운 옵션
  // const products = useMemo(() => {
  //   const map = new Map<string, string>();
  //   reviews.forEach((r) => map.set(r.productId, r.productName)); // <-- MOCK_REVIEWS -> reviews
  //   return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  // }, [reviews]); // reviews에 의존

  // 삭제되지 않은 상품 목록 기준으로 변경
  const [products, setProducts] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    async function fetchProducts() {
      try {
        const res = await legacyGet<any>(`/${storeUrl}/seller/products`);
        // console.log(res);
        const productsData = Array.isArray(res.data) ? res.data : [];

        setProducts(
          productsData
            .filter((p: any) => p.deleteCheck === 0) // 삭제되지 않은 것만
            .map((p: any) => ({
              id: String(p.productId),
              name: p.productName,
            }))
        );
      } catch (err) {
        console.error(err);
      }
    }
    fetchProducts();
  }, [storeUrl]);

  // 필터 + 검색 + 정렬
  const filtered = useMemo(() => {
    let list = [...reviews]; // <-- MOCK_REVIEWS -> reviews

    if (selectedProduct !== 'all') {
      list = list.filter((r) => r.productId === selectedProduct);
    }
    if (q.trim()) {
      const term = q.trim().toLowerCase();
      list = list.filter(
        (r) => r.author.toLowerCase().includes(term) || r.content.toLowerCase().includes(term)
      );
    }

    switch (sortKey) {
      case 'rating':
        list.sort((a, b) => b.rating - a.rating || b.likes - a.likes);
        break;
      case 'likes':
        list.sort((a, b) => b.likes - a.likes || cmpDate(b.createdAt, a.createdAt));
        break;
      case 'latest':
      default:
        list.sort((a, b) => cmpDate(b.createdAt, a.createdAt));
    }
    return list;
  }, [reviews, selectedProduct, sortKey, q]); // <-- reviews 추가

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

      <SellerSidenavbar>
        <div className="space-y-6">
          {/* 헤더/요약 */}
          <section className="rounded-2xl overflow-hidden border border-emerald-100">
            <div className="bg-gradient-to-r from-[#2D4739] to-emerald-700 px-6 py-7 text-white">
              <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5">
                <div>
                  <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight">리뷰 관리</h1>
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
                    <div className="text-base font-bold leading-none">{products.length}개</div>
                  </div>
                </div>
              </div>
            </div>

            {/* 컨트롤 바 */}
            <div className="bg-white/90 backdrop-blur border-t border-emerald-100 px-4 sm:px-6 py-3">
              <div className="grid gap-3 md:grid-cols-[1fr_auto_auto]">
                {/* 상품 선택 */}
                <div className="flex items-center gap-3">
                  <label className="text-sm font-medium text-gray-700 shrink-0">상품</label>
                  <select
                    value={selectedProduct}
                    onChange={onChangeProduct}
                    className="w-full md:w-72 rounded-lg border-gray-300 bg-white text-sm px-3 py-2"
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
                  <label className="text-sm font-medium text-gray-700 shrink-0">정렬</label>
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
              <table className="w-full text-sm table-fixed">
                <thead>
                  <tr className="text-left text-gray-600 text-xs">
                    <th className="px-4 py-3 w-1/12 sticky top-0 z-20 bg-gray-50 border-b">
                      작성일
                    </th>
                    <th className="px-4 py-3 w-1/12 sticky top-0 z-20 bg-gray-50 border-b">
                      이미지
                    </th>
                    <th className="px-4 py-3 w-3/12 sticky top-0 z-20 bg-gray-50 border-b break-words">
                      상품 이름
                    </th>
                    <th className="px-4 py-3 w-1/12 sticky top-0 z-20 bg-gray-50 border-b">
                      작성자
                    </th>
                    <th className="px-4 py-3 w-2/12 sticky top-0 z-20 bg-gray-50 border-b">
                      리뷰 내용
                    </th>
                    <th className="px-4 py-3 w-1/12 sticky top-0 z-20 bg-gray-50 border-b">
                      등록일
                    </th>
                    <th className="px-4 py-3 w-1/12 sticky top-0 z-20 bg-gray-50 border-b">평점</th>
                    <th className="px-4 py-3 w-1/12 sticky top-0 z-20 bg-gray-50 border-b">
                      좋아요
                    </th>
                    <th className="px-4 py-3 w-1/12 sticky top-0 z-20 bg-gray-50 border-b">
                      수정일
                    </th>
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
                            src={r.productImage}
                            alt={r.productName}
                            className="h-full w-full object-cover"
                          />
                        </div>
                      </td>

                      <td className="px-4 py-3 align-top">
                        <div className="font-medium text-gray-900 break-words">{r.productName}</div>
                        {/* <div className="text-[11px] text-gray-500 mt-0.5">{r.productId}</div> */}
                      </td>

                      <td className="px-4 py-3 align-top text-gray-800 text-xs">{r.author}</td>

                      <td className="px-4 py-3 align-top">
                        <p className="text-gray-700 leading-relaxed line-clamp-3">{r.content}</p>
                      </td>

                      <td className="px-4 py-3 align-top text-xs">{r.createdAt}</td>

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
          src={r.productImage}
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
