import { useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import Header from "@src/shared/areas/layout/features/header/Header";
import Mainnavbar from "@src/shared/areas/navigation/features/navbar/main/Mainnavbar";
import SellerSidenavbar from "@src/shared/areas/navigation/features/sidenavbar/seller/SellerSidenavbar";
import { Search, X, Package, BarChart3, Receipt, Wallet } from "lucide-react";

type ProductSale = {
  id: string;              // tx id
  date: string;            // YYYY-MM-DD
  productId: string;
  title: string;
  qty: number;
  amount: number;          // 결제금액
  fee: number;             // 수수료
  refunded?: boolean;
};

const MOCK: ProductSale[] = [
  { id: "tp1", date: "2025-08-25", productId: "P-1001", title: "핸드메이드 컵", qty: 1, amount: 38000, fee: 1900 },
  { id: "tp2", date: "2025-08-26", productId: "P-1002", title: "우든 커틀러리 세트", qty: 1, amount: 42000, fee: 2100 },
  { id: "tp3", date: "2025-08-27", productId: "P-1001", title: "핸드메이드 컵", qty: 2, amount: 76000, fee: 3800, refunded: true },
  { id: "tp4", date: "2025-08-21", productId: "P-2001", title: "가죽 카드지갑", qty: 1, amount: 52000, fee: 2600 },
  { id: "tp5", date: "2025-07-30", productId: "P-3001", title: "플라워 키트", qty: 3, amount: 90000, fee: 4500 },
];

const brand = "#2d4739";
const KRW = new Intl.NumberFormat("ko-KR");

function useQuery() {
  const { search } = useLocation();
  return new URLSearchParams(search);
}

export default function SellerSettlementProduct() {
  const { storeUrl = "store" } = useParams();
  const query = useQuery();
  const navigate = useNavigate();

  const initial = query.get("keyword") ?? "";
  const [q, setQ] = useState(initial);
  const [submittedQ, setSubmittedQ] = useState(initial);

  // IME 안전
  const composingRef = useRef(false);
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => setQ(e.target.value);
  const onCompStart = () => (composingRef.current = true);
  const onCompEnd = () => (composingRef.current = false);
  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    const composing = composingRef.current || e.nativeEvent?.isComposing || (e as any).keyCode === 229;
    if (composing && e.key === "Enter") e.preventDefault();
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (composingRef.current) return;
    setSubmittedQ(q.trim());
    navigate(`/seller/${storeUrl}/settlement/product?keyword=${encodeURIComponent(q.trim())}`, { replace: false });
  };

  const clear = () => {
    setQ("");
    setSubmittedQ("");
    navigate(`/seller/${storeUrl}/settlement/product`, { replace: false });
  };

  const filtered = useMemo(() => {
    const needle = submittedQ.trim().toLowerCase();
    if (!needle) return [];
    return MOCK.filter(
      (t) =>
        t.productId.toLowerCase().includes(needle) ||
        t.title.toLowerCase().includes(needle)
    ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [submittedQ]);

  const metrics = useMemo(() => {
    let gross = 0, refunds = 0, fee = 0, orders = 0, qty = 0;
    filtered.forEach((r) => {
      orders += 1;
      qty += r.qty;
      fee += r.fee;
      if (r.refunded) refunds += r.amount;
      else gross += r.amount;
    });
    const payout = Math.max(gross - fee - refunds, 0);
    return { gross, refunds, fee, payout, orders, qty };
  }, [filtered]);

  return (
    <>
      <Header />
      <Mainnavbar />

      <SellerSidenavbar>
        <div className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-6">
          <div className="flex flex-col gap-2">
            <h1 className="text-xl sm:text-2xl font-bold">상품별 정산</h1>
            <p className="text-gray-600">상품 ID 또는 이름으로 검색해 상세 매출/정산 내역을 확인하세요.</p>
          </div>

          {/* 검색 */}
          <form onSubmit={onSubmit} className="relative w-full mt-4">
            <label className="sr-only" htmlFor="product-keyword">상품 검색</label>
            <input
              id="product-keyword"
              type="text"
              value={q}
              onChange={handleChange}
              onCompositionStart={onCompStart}
              onCompositionEnd={onCompEnd}
              onKeyDown={onKeyDown}
              placeholder="상품 ID 또는 이름 (예: P-1001)"
              className="w-full h-11 rounded-xl border px-4 pr-24 text-gray-900 placeholder:text-gray-400 border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#2d4739]/25 focus:border-[#2d4739]"
              autoComplete="off"
              inputMode="search"
              enterKeyHint="search"
            />
            {q && (
              <button type="button" onClick={clear} aria-label="검색어 지우기" className="absolute right-12 top-1/2 -translate-y-1/2 p-2 rounded-md hover:bg-gray-100 active:scale-95">
                <X className="w-4 h-4" />
              </button>
            )}
            <button
              type="submit"
              className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-2 rounded-lg text-white text-sm font-medium active:scale-95"
              style={{ backgroundColor: brand }}
            >
              <span className="inline-flex items-center gap-1">
                <Search className="w-4 h-4" /> 검색
              </span>
            </button>
          </form>

          {/* 합계 카드 */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 mt-4">
            <SummaryCard title="총 매출(환불 제외)" value={`₩ ${KRW.format(metrics.gross)}`} icon={<BarChart3 className="w-5 h-5" />} />
            <SummaryCard title="환불 금액" value={`₩ ${KRW.format(metrics.refunds)}`} icon={<Receipt className="w-5 h-5" />} />
            <SummaryCard title="수수료" value={`₩ ${KRW.format(metrics.fee)}`} icon={<Package className="w-5 h-5" />} />
            <SummaryCard title="정산 예상금" value={`₩ ${KRW.format(metrics.payout)}`} icon={<Wallet className="w-5 h-5" />} />
          </div>

          {/* 결과 테이블 */}
          <div className="mt-4 rounded-2xl border border-gray-200 bg-white overflow-x-auto">
            <div className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">검색 결과 {filtered.length}건</h2>
              </div>
              <table className="mt-4 w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500">
                    <th className="py-2 pr-4 font-medium">주문일</th>
                    <th className="py-2 pr-4 font-medium">상품ID</th>
                    <th className="py-2 pr-4 font-medium">상품명</th>
                    <th className="py-2 pr-4 font-medium">수량</th>
                    <th className="py-2 pr-4 font-medium text-right">결제금액</th>
                    <th className="py-2 pr-4 font-medium text-right">수수료</th>
                    <th className="py-2 pl-4 font-medium text-right">상태</th>
                  </tr>
                </thead>
                <tbody>
                  {submittedQ && filtered.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-gray-500">검색 결과가 없습니다</td>
                    </tr>
                  ) : !submittedQ ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-gray-500">키워드를 입력해 검색하세요</td>
                    </tr>
                  ) : (
                    filtered.map((r) => (
                      <tr key={r.id} className="border-t border-gray-100">
                        <td className="py-3 pr-4">{r.date}</td>
                        <td className="py-3 pr-4">{r.productId}</td>
                        <td className="py-3 pr-4">{r.title}</td>
                        <td className="py-3 pr-4">{r.qty}</td>
                        <td className="py-3 pr-4 text-right">₩ {KRW.format(r.amount)}</td>
                        <td className="py-3 pr-4 text-right">₩ {KRW.format(r.fee)}</td>
                        <td className="py-3 pl-4 text-right">
                          <span className={[
                            "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                            r.refunded ? "bg-rose-50 text-rose-700 border border-rose-200" : "bg-emerald-50 text-emerald-700 border border-emerald-200",
                          ].join(" ")}>{r.refunded ? "환불" : "정상"}</span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>

              {/* 퀵 합계 */}
              {submittedQ && filtered.length > 0 && (
                <div className="mt-4 text-sm text-gray-600">
                  총 주문 {metrics.orders}건 • 총 수량 {metrics.qty}개
                </div>
              )}
            </div>
          </div>
        </div>
      </SellerSidenavbar>
    </>
  );
}

function SummaryCard({ title, value, icon }: { title: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm text-gray-600">{title}</div>
          <div className="mt-1 text-xl font-bold">{value}</div>
        </div>
        <div className="rounded-xl border p-2" style={{ borderColor: "#e5e7eb", color: brand }}>
          {icon}
        </div>
      </div>
    </div>
  );
}
