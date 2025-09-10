// src/domains/main/areas/mypage/pages/MainMypageOrdersPage.tsx
import { useEffect, useMemo, useState, useCallback, memo } from "react";
import { CalendarDays, ChevronLeft, Package, ShoppingBag, Ticket, Truck, X } from "lucide-react";

import Header from "@src/shared/areas/layout/features/header/Header";
import Mainnavbar from "@src/shared/areas/navigation/features/navbar/main/Mainnavbar";
import MypageSidenavbar from "@src/shared/areas/navigation/features/sidenavbar/mypage/MypageSidenavbar";
import { get } from "@src/libs/request";

/** 브랜드 컬러 */
const BRAND = "#2d4739";

/** 이미지 없을 때 placeholder */
const PLACEHOLDER =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480">
       <rect width="100%" height="100%" fill="#f3f4f6"/>
       <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle"
             fill="#9ca3af" font-family="sans-serif" font-size="16">
         No Image
       </text>
     </svg>`
  );

/** 서버 DTO (가정) */
type OrderSummaryDTO = {
  orderNumber: string;
  orderDate: string;      // ISO
  productId: number;
  productName: string;
  productImage: string | null;
  quantity: number;
  price: number;
  status: string;         // PENDING/PAID/PREPARING/SHIPPED/DELIVERED/CANCELED/REFUNDED
};

/** 서버 래퍼 */
type ApiEnvelope<T> = { status: number; message?: string; data: T | null };

/** UI 모델 */
type OrderStatus = "pending" | "paid" | "preparing" | "shipped" | "delivered" | "canceled" | "refunded" | "unknown";
type OrderItem = {
  orderNo: string;
  orderedAt: number;
  orderDate: string; // YYYY-MM-DD
  productId: number;
  name: string;
  image?: string | null;
  qty: number;
  price: number;
  status: OrderStatus;
};

/** 유틸 */
const toDate = (iso?: string) => (iso ? iso.slice(0, 10) : "");
const toTs = (iso?: string) => (iso ? new Date(iso).getTime() : 0);
const formatKRW = (v: number) =>
  new Intl.NumberFormat("ko-KR", { style: "currency", currency: "KRW", maximumFractionDigits: 0 }).format(v);
const mapStatus = (raw?: string): OrderStatus => {
  const s = (raw ?? "").toUpperCase();
  if (s.includes("CANCEL")) return "canceled";
  if (s.includes("REFUND")) return "refunded";
  if (s.includes("DELIVERED")) return "delivered";
  if (s.includes("SHIPPED")) return "shipped";
  if (s.includes("PREPAR")) return "preparing";
  if (s.includes("PAID")) return "paid";
  if (s.includes("PEND")) return "pending";
  return "unknown";
};
const adapt = (dto: OrderSummaryDTO): OrderItem => ({
  orderNo: dto.orderNumber,
  orderedAt: toTs(dto.orderDate),
  orderDate: toDate(dto.orderDate),
  productId: dto.productId,
  name: dto.productName ?? "(상품명 없음)",
  image: dto.productImage ?? null,
  qty: Math.max(1, Number(dto.quantity || 1)),
  price: Math.max(0, Number(dto.price || 0)),
  status: mapStatus(dto.status),
});
const isInProgress = (s: OrderStatus) => ["pending", "paid", "preparing", "shipped", "unknown"].includes(s);

/** 엔드포인트 */
const ORDERS_ENDPOINT = "/mypage/orders";

/** 검색바 */
const SearchBar = memo(function SearchBar({
  defaultValue = "",
  onSubmit,
  onClear,
}: {
  defaultValue?: string;
  onSubmit: (keyword: string) => void;
  onClear?: () => void;
}) {
  const [localQ, setLocalQ] = useState(defaultValue);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(localQ.trim());
      }}
      onKeyDownCapture={(e) => e.stopPropagation()}
      className="relative w-full"
    >
      <label htmlFor="order-search" className="sr-only">
        주문 검색
      </label>
      <input
        id="order-search"
        value={localQ}
        onChange={(e) => setLocalQ(e.target.value)}
        placeholder="주문번호, 상품명으로 검색"
        className={[
          "w-full h-11 rounded-xl border px-4 pr-24 font-jua",
          "text-gray-900 placeholder:text-gray-400",
          "border-gray-300 focus:outline-none",
          "focus:ring-2 focus:ring-[#2d4739]/25 focus:border-[#2d4739]",
        ].join(" ")}
        autoComplete="off"
        spellCheck={false}
      />
      {localQ && (
        <button
          type="button"
          onClick={() => {
            setLocalQ("");
            onClear?.();
          }}
          aria-label="검색어 지우기"
          className="absolute right-24 top-1/2 -translate-y-1/2 p-2 rounded-md hover:bg-gray-100 active:scale-95 z-10"
        >
        <X className="w-4 h-4" />
        </button>
      )}
      <button
        type="submit"
        className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-2 rounded-lg text-white text-sm font-jua font-medium active:scale-95 z-10"
        style={{ backgroundColor: BRAND }}
      >
        검색
      </button>
    </form>
  );
});

/** 상태 라벨/뱃지 */
const statusLabel = (s: OrderStatus) =>
  s === "pending" ? "결제대기" :
  s === "paid" ? "결제완료" :
  s === "preparing" ? "상품준비중" :
  s === "shipped" ? "배송중" :
  s === "delivered" ? "배송완료" :
  s === "canceled" ? "취소" :
  s === "refunded" ? "환불" : "확인중";

const statusBadgeCls = (s: OrderStatus) =>
  s === "pending" || s === "paid" ? "bg-amber-50 text-amber-700 border border-amber-200" :
  s === "preparing" ? "bg-blue-50 text-blue-700 border border-blue-200" :
  s === "shipped" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" :
  s === "delivered" ? "bg-gray-100 text-gray-700 border border-gray-200" :
  s === "canceled" || s === "refunded" ? "bg-rose-50 text-rose-700 border border-rose-200" :
  "bg-gray-100 text-gray-700 border border-gray-200";

/** 모바일 카드 (섹션 공용) */
function OrderCardMobile({ item }: { item: OrderItem }) {
  return (
    <article className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <div className="p-4 flex gap-4">
        <a
          href={`/main/product/${item.productId}`}
          className="relative w-24 h-24 shrink-0 bg-gray-100 rounded-lg overflow-hidden"
        >
          <img src={item.image || PLACEHOLDER} alt={item.name} className="w-full h-full object-cover" loading="lazy" />
        </a>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium font-jua ${statusBadgeCls(item.status)}`}>
              {statusLabel(item.status)}
            </span>
            <span className="inline-flex items-center gap-1 text-xs text-gray-600 font-jua">
              <CalendarDays className="w-4 h-4" /> {item.orderDate}
            </span>
            {/* <span className="inline-flex items-center gap-1 text-xs text-gray-600 font-jua">
              <Ticket className="w-4 h-4" /> {item.orderNo}
            </span> */}
          </div>
          <a href={`/main/product/${item.productId}`} className="mt-1.5 block text-base font-jua ">
            {item.name}
          </a>
          <div className="mt-1 text-sm text-gray-700 font-jua">
            수량 <span className="font-semibold">{item.qty}</span> • 금액 <span className="font-semibold">{formatKRW(item.price)}</span>
          </div>
          <div className="mt-3 flex gap-2">
            <a
              href={`/main/mypage/orders/${item.orderNo}`}
              className="h-9 px-4 rounded-lg text-white text-sm font-medium grid place-items-center hover:opacity-95 active:scale-95 transition font-jua"
              style={{ backgroundColor: BRAND }}
            >
              주문 상세
            </a>
          </div>
        </div>
      </div>
    </article>
  );
}

export default function MainMypageOrdersPage() {
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [unauthorized, setUnauthorized] = useState(false);
  const [allOrders, setAllOrders] = useState<OrderItem[]>([]);

  /** 목데이터 사용 */
  const USE_MOCK = true;

  const fetchOrders = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      setUnauthorized(false);

      if (USE_MOCK) {
        const mock: OrderSummaryDTO[] = [
          {
            orderNumber: "OD-20250910-0001",
            orderDate: new Date().toISOString(),
            productId: 101,
            productName: "핸드메이드 도자기 머그컵",
            productImage: null,
            quantity: 1,
            price: 19800,
            status: "SHIPPED",
          },
          {
            orderNumber: "OD-20250831-0007",
            orderDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10).toISOString(),
            productId: 77,
            productName: "수제 허브 비누 세트",
            productImage: null,
            quantity: 2,
            price: 24800,
            status: "DELIVERED",
          },
        ];
        const listAll = mock.map(adapt).sort((a, b) => b.orderedAt - a.orderedAt);
        setAllOrders(listAll);
        return;
      }

      const paramsAll: Record<string, string> = {};
      if (q) paramsAll.q = q;
      const resAll = await get<unknown>(ORDERS_ENDPOINT, { ...paramsAll, filter: "ALL" });
      const rawAll = extractArray<OrderSummaryDTO>(resAll);
      const listAll = rawAll.map(adapt).sort((a, b) => b.orderedAt - a.orderedAt);
      setAllOrders(listAll);
    } catch (e: any) {
      const httpStatus = e?.response?.status;
      if (httpStatus === 401) {
        setUnauthorized(true);
        setAllOrders([]);
        return;
      }
      setErrorMsg(e?.message ?? "주문 내역 조회 중 오류가 발생했습니다.");
      setAllOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, USE_MOCK]);

  /** 진행중/전체 */
  const inProgressOrders = useMemo(() => {
    const filtered = allOrders.filter((o) => isInProgress(o.status));
    return [...filtered].sort((a, b) => b.orderedAt - a.orderedAt);
  }, [allOrders]);

  const handleSearchSubmit = useCallback((keyword: string) => setQ(keyword), []);
  const handleSearchClear = useCallback(() => setQ(""), []);

  /** 단일 컨테이너 컴포넌트: 검색~주문내역까지, 섹션 내부 분리 + 하단 패딩 */
  const Container = ({ children }: { children: React.ReactNode }) => (
    <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden mb-6 pb-6">
      <div className="bg-gradient-to-r from-[#2d4739] to-gray-800 px-6 md:px-8 py-5 md:py-6">
        <h2 className="text-xl md:text-2xl text-white mb-1.5 md:mb-2">주문 내역</h2>
        <p className="text-gray-200 text-xs md:text-sm">주문을 최신순으로 확인하고 상세로 이동하세요</p>
      </div>
      <div className="p-4 md:p-6">{children}</div>
      {/* ⬇️ 컨테이너 자체 하단 패딩 확보 */}
      <div className="px-4 md:px-6 pt-2" />
    </div>
  );

  /** 표 헤더 (공통) */
  const TableHeader = () => (
    <thead className="bg-gray-50 text-xs text-gray-600 font-jua">
      <tr className="border-b border-gray-200">
        <th className="py-3 px-3 text-left">주문일</th>
        <th className="py-3 px-3 text-left">상품사진</th>
        <th className="py-3 px-3 text-left">상품명</th>
        <th className="py-3 px-3 text-right">수량</th>
        <th className="py-3 px-3 text-right">가격</th>
        <th className="py-3 px-3 text-center">주문상세</th>
      </tr>
    </thead>
  );

  /** 표 행 (공통) */
  const TableRow = ({ item }: { item: OrderItem }) => (
    <tr className="border-b last:border-b-0">
      <td className="py-3 px-3 align-middle text-sm font-jua text-gray-700">{item.orderDate}</td>
      <td className="py-3 px-3 align-middle">
        <a
          href={`/main/product/${item.productId}`}
          className="inline-block w-16 h-16 bg-gray-100 rounded-lg overflow-hidden"
        >
          <img src={item.image || PLACEHOLDER} alt={item.name} className="w-full h-full object-cover" loading="lazy" />
        </a>
      </td>
      <td className="py-3 px-3 align-middle">
        <a
          href={`/main/product/${item.productId}`}
          className="text-sm md:text-base text-gray-900 hover:underline font-jua line-clamp-2"
        >
          {item.name}
        </a>
      </td>
      <td className="py-3 px-3 align-middle text-right text-sm font-jua text-gray-800">{item.qty}</td>
      <td className="py-3 px-3 align-middle text-right text-sm font-jua text-gray-900">{formatKRW(item.price)}</td>
      <td className="py-3 px-3 align-middle">
        <div className="flex justify-center items-center gap-3">
          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium font-jua ${statusBadgeCls(item.status)}`}>
            {statusLabel(item.status)}
          </span>
          <a
            href={`/main/mypage/orders/${item.orderNo}`}
            className="h-8 px-3 rounded-lg text-white text-xs font-medium grid place-items-center hover:opacity-95 active:scale-95 transition font-jua"
            style={{ backgroundColor: BRAND }}
          >
            주문상세 보기
          </a>
        </div>
      </td>
    </tr>
  );

  /** 섹션 타이틀 */
  const SectionTitle = ({ icon, title, desc }: { icon: "progress" | "all"; title: string; desc: string }) => {
    const Icon = icon === "progress" ? Truck : ShoppingBag;
    return (
      <div className="mb-3">
        <div className="flex items-center gap-2">
          <Icon className="w-5 h-5 text-gray-800" />
          <h3 className="text-lg text-gray-900">{title}</h3>
        </div>
        <p className="text-gray-500 text-xs mt-0.5">{desc}</p>
      </div>
    );
  };

  return (
    <div className="min-h-screen font-jua" style={{ background: "linear-gradient(135deg,#f8fafc 0%,#f1f5f9 100%)" }}>
      <Header />
      <Mainnavbar />

      {/* 모바일 상단바 */}
      <div className="lg:hidden">
        <div className="sticky top-0 z-50 bg-white border-b border-gray-200">
          <div className="px-4 py-3 flex items-center gap-3">
            <button
              type="button"
              onClick={() => (history.length > 1 ? history.back() : (window.location.href = "/main/mypage"))}
              className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-white border border-gray-200 shadow-sm hover:bg-gray-50 active:scale-95 transition-all"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-bold text-gray-900">주문 내역</h1>
            <div className="flex-1" />
          </div>
        </div>

        {/* 단일 컨테이너: 검색~주문내역(두 섹션) */}
        <div className="px-4 py-4">
          <Container>
            {/* 검색 */}
            <SearchBar defaultValue={q} onSubmit={handleSearchSubmit} onClear={handleSearchClear} />

            {/* 진행중 섹션 - 모바일 카드 / 데스크탑 테이블 */}
            <div className="mt-6">
              <SectionTitle icon="progress" title="배송 중인 주문 내역" desc="현재 진행중인 주문을 최신순으로 보여드려요" />

              {/* 데스크톱 표 */}
              <div className="hidden md:block rounded-lg border border-gray-200 overflow-hidden">
                <table className="w-full text-sm">
                  <TableHeader />
                  <tbody>
                    {loading && (
                      <tr><td colSpan={6} className="p-6 text-center text-gray-500">불러오는 중…</td></tr>
                    )}
                    {errorMsg && (
                      <tr><td colSpan={6} className="p-6">
                        <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-rose-700">{errorMsg}</div>
                      </td></tr>
                    )}
                    {unauthorized && !loading && !errorMsg && (
                      <tr><td colSpan={6} className="p-6">
                        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-700">
                          로그인 후 주문 내역을 확인할 수 있습니다.
                        </div>
                      </td></tr>
                    )}
                    {!loading && !errorMsg && inProgressOrders.length === 0 && (
                      <tr><td colSpan={6} className="p-6"><EmptyState icon="progress" title="진행중 주문이 없습니다" desc="새로운 주문을 만들어보세요." /></td></tr>
                    )}
                    {!loading && !errorMsg && inProgressOrders.map((it) => <TableRow key={it.orderNo} item={it} />)}
                  </tbody>
                </table>
              </div>

              {/* 모바일 카드 */}
              <div className="md:hidden space-y-4">
                {!loading && !errorMsg && inProgressOrders.length === 0 ? (
                  <EmptyState icon="progress" title="진행중 주문이 없습니다" desc="새로운 주문을 만들어보세요." />
                ) : (
                  inProgressOrders.map((it) => <OrderCardMobile key={it.orderNo} item={it} />)
                )}
              </div>
            </div>

            {/* 전체 섹션 - 모바일 카드 / 데스크탑 테이블 */}
            <div className="mt-10">
              <SectionTitle icon="all" title="전체 주문 내역" desc="내가 주문한 모든 내역을 최신순으로 보여드려요" />

              {/* 데스크톱 표 */}
              <div className="hidden md:block rounded-lg border border-gray-200 overflow-hidden">
                <table className="w-full text-sm">
                  <TableHeader />
                  <tbody>
                    {!loading && !errorMsg && allOrders.length === 0 && (
                      <tr><td colSpan={6} className="p-6"><EmptyState icon="all" title="주문 내역이 없습니다" desc="상품을 둘러보고 주문해 보세요." /></td></tr>
                    )}
                    {!loading && !errorMsg && allOrders.map((it) => <TableRow key={it.orderNo} item={it} />)}
                  </tbody>
                </table>
              </div>

              {/* 모바일 카드 */}
              <div className="md:hidden space-y-4">
                {!loading && !errorMsg && allOrders.length === 0 ? (
                  <EmptyState icon="all" title="주문 내역이 없습니다" desc="상품을 둘러보고 주문해 보세요." />
                ) : (
                  allOrders.map((it) => <OrderCardMobile key={it.orderNo} item={it} />)
                )}
              </div>
            </div>
          </Container>
        </div>

        {/* 페이지 바닥 여백 */}
        <div className="pb-6" />
      </div>

      {/* 데스크톱: 240 사이드 + 1440 컨텐츠 */}
      <div className="hidden lg:block">
        <MypageSidenavbar>
          <div className="mx-auto w-full max-w-[1440px] px-0">
            <Container>
              <SearchBar defaultValue={q} onSubmit={handleSearchSubmit} onClear={handleSearchClear} />

              {/* 진행중 섹션 */}
              <div className="mt-6">
                <SectionTitle icon="progress" title="배송 중인 주문 내역" desc="현재 진행중인 주문을 최신순으로 보여드려요" />
                <div className="hidden md:block rounded-lg border border-gray-200 overflow-hidden">
                  <table className="w-full text-sm">
                    <TableHeader />
                    <tbody>
                      {loading && (
                        <tr><td colSpan={6} className="p-6 text-center text-gray-500">불러오는 중…</td></tr>
                      )}
                      {errorMsg && (
                        <tr><td colSpan={6} className="p-6">
                          <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-rose-700">{errorMsg}</div>
                        </td></tr>
                      )}
                      {unauthorized && !loading && !errorMsg && (
                        <tr><td colSpan={6} className="p-6">
                          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-700">
                            로그인 후 주문 내역을 확인할 수 있습니다.
                          </div>
                        </td></tr>
                      )}
                      {!loading && !errorMsg && inProgressOrders.length === 0 && (
                        <tr><td colSpan={6} className="p-6"><EmptyState icon="progress" title="진행중 주문이 없습니다" desc="새로운 주문을 만들어보세요." /></td></tr>
                      )}
                      {!loading && !errorMsg && inProgressOrders.map((it) => <TableRow key={it.orderNo} item={it} />)}
                    </tbody>
                  </table>
                </div>

                {/* 모바일 카드 */}
                <div className="md:hidden space-y-4">
                  {!loading && !errorMsg && inProgressOrders.length === 0 ? (
                    <EmptyState icon="progress" title="진행중 주문이 없습니다" desc="새로운 주문을 만들어보세요." />
                  ) : (
                    inProgressOrders.map((it) => <OrderCardMobile key={it.orderNo} item={it} />)
                  )}
                </div>
              </div>

              {/* 전체 섹션 */}
              <div className="mt-10">
                <SectionTitle icon="all" title="전체 주문 내역" desc="내가 주문한 모든 내역을 최신순으로 보여드려요" />
                <div className="hidden md:block rounded-lg border border-gray-200 overflow-hidden">
                  <table className="w-full text-sm">
                    <TableHeader />
                    <tbody>
                      {!loading && !errorMsg && allOrders.length === 0 && (
                        <tr><td colSpan={6} className="p-6"><EmptyState icon="all" title="주문 내역이 없습니다" desc="상품을 둘러보고 주문해 보세요." /></td></tr>
                      )}
                      {!loading && !errorMsg && allOrders.map((it) => <TableRow key={it.orderNo} item={it} />)}
                    </tbody>
                  </table>
                </div>

                {/* 모바일 카드 */}
                <div className="md:hidden space-y-4">
                  {!loading && !errorMsg && allOrders.length === 0 ? (
                    <EmptyState icon="all" title="주문 내역이 없습니다" desc="상품을 둘러보고 주문해 보세요." />
                  ) : (
                    allOrders.map((it) => <OrderCardMobile key={it.orderNo} item={it} />)
                  )}
                </div>
              </div>
            </Container>
          </div>
        </MypageSidenavbar>
      </div>
    </div>
  );
}

/** 응답 방어 */
function extractArray<T>(res: unknown): T[] {
  const asEnv = res as Partial<ApiEnvelope<T[]>>;
  if (asEnv && typeof asEnv === "object") {
    if (asEnv.status === 401) throw Object.assign(new Error("Unauthorized"), { response: { status: 401 } });
    if (Array.isArray(asEnv.data)) return asEnv.data;
  }
  if (Array.isArray(res)) return res as T[];
  return [];
}

/** 빈 상태 */
function EmptyState({ icon, title, desc }: { icon: "progress" | "all"; title: string; desc: string }) {
  const Icon = icon === "progress" ? Truck : Package;
  return (
    <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center text-gray-500">
      <div className="flex flex-col items-center">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <Icon className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="font-medium text-gray-900 mb-1 font-jua">{title}</h3>
        <p className="text-sm font-jua">{desc}</p>
      </div>
    </div>
  );
}
