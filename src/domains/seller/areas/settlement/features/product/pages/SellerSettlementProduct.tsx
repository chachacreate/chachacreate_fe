// src/domains/seller/settlement/SellerSettlementProduct.tsx
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import Header from "@src/shared/areas/layout/features/header/Header";
import Mainnavbar from "@src/shared/areas/navigation/features/navbar/main/Mainnavbar";
import SellerSidenavbar from "@src/shared/areas/navigation/features/sidenavbar/seller/SellerSidenavbar";
import { CalendarDays, BarChart3, Image as ImageIcon } from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

// ------------------ Types ------------------
type ProductSale = {
  id: string;            // tx id
  date: string;          // YYYY-MM-DD (결제일)
  time: string;          // HH:MM–HH:MM (옵션)
  productId: string;
  title: string;
  quantity: number;
  amount: number;        // 결제금액(원) = 단가*수량
  refunded?: boolean;    // 환불 여부
};

type ProductMeta = {
  productId: string;
  title: string;
  hero: string;          // 대표 이미지
  createdAt: string;     // 등록일
  deleted?: boolean;     // 논리삭제
};

type SettlementRow = {
  date: string; amount: number; account: string; bank: string;
  holder: string; status: "정산 완료" | "정산 예정" | "보류"; updatedAt: string;
};

// ------------------ MOCK DATA ------------------
const PRODUCT_META: ProductMeta[] = [
  {
    productId: "P-1001",
    title: "핸드메이드 머그컵",
    hero: "https://images.unsplash.com/photo-1517705008128-361805f42e86?q=80&w=1200&auto=format&fit=crop",
    createdAt: "2025-05-08",
  },
  {
    productId: "P-1002",
    title: "드라이플라워 소품",
    hero: "https://images.unsplash.com/photo-1470058869958-2a77ade41c02?q=80&w=1200&auto=format&fit=crop",
    createdAt: "2025-05-12",
  },
  {
    productId: "P-1003",
    title: "수채화 엽서 세트",
    hero: "https://images.unsplash.com/photo-1519681393784-d120267933ba?q=80&w=1200&auto=format&fit=crop",
    createdAt: "2025-05-18",
  },
];

const TX_PRODUCT: ProductSale[] = [
  { id: "tp1", date: "2025-05-17", time: "10:10", productId: "P-1001", title: "핸드메이드 머그컵", quantity: 2, amount: 36000 },
  { id: "tp2", date: "2025-05-17", time: "14:32", productId: "P-1002", title: "드라이플라워 소품", quantity: 1, amount: 18000 },
  { id: "tp3", date: "2025-05-18", time: "11:20", productId: "P-1003", title: "수채화 엽서 세트", quantity: 5, amount: 25000 },
  { id: "tp4", date: "2025-05-19", time: "09:40", productId: "P-1001", title: "핸드메이드 머그컵", quantity: 1, amount: 18000 },
  { id: "tp5", date: "2025-05-21", time: "16:45", productId: "P-1001", title: "핸드메이드 머그컵", quantity: 3, amount: 54000 },
  // 환불 예시(차트/합계에서 제외)
  { id: "tp6", date: "2025-05-21", time: "18:05", productId: "P-1002", title: "드라이플라워 소품", quantity: 1, amount: 18000, refunded: true },
];

const SETTLEMENT_PRODUCT: Record<string, SettlementRow[]> = {
  "P-1001": [
    { date: "2025-05-17", amount: 120000, account: "1002-858-000000", bank: "우리은행", holder: "이상민", status: "정산 완료", updatedAt: "2025-05-17" },
    { date: "2025-06-17", amount: 90000,  account: "3333-28-0000000", bank: "카카오뱅크", holder: "이상민", status: "정산 예정", updatedAt: "2025-05-20" },
  ],
  "P-1002": [
    { date: "2025-05-17", amount: 18000, account: "1002-111-222333", bank: "우리은행", holder: "홍길동", status: "정산 완료", updatedAt: "2025-05-18" },
  ],
  "P-1003": [
    { date: "2025-04-19", amount: 25000, account: "455-66-777777", bank: "국민은행", holder: "김영희", status: "정산 예정", updatedAt: "2025-05-20" },
  ],
};

// ------------------ Utils ------------------
const brand = "#2d4739";
const KRW = new Intl.NumberFormat("ko-KR");

function useQuery() {
  const { search } = useLocation();
  return new URLSearchParams(search);
}
const parseDate = (s: string) => new Date(`${s}T00:00:00`);
const fmtYMD = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const addMonths = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth() + n, d.getDate());
const startOfWeekMon = (d: Date) => {
  const day = d.getDay(); // 0=Sun..6=Sat
  const diff = (day === 0 ? -6 : 1 - day);
  return addDays(d, diff);
};

// ------------------ Component ------------------
export default function SellerSettlementProduct() {
  const { storeUrl = "store" } = useParams();
  const query = useQuery();
  const navigate = useNavigate();

  // (1) 상품 목록(논리삭제 제외)
  const aliveProducts = useMemo(
    () => PRODUCT_META.filter((p) => !p.deleted).sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    []
  );
  const hasProducts = aliveProducts.length > 0;

  // (2) 선택 상품
  const defaultProductId = hasProducts ? aliveProducts[0].productId : "";
  const queryId = query.get("productId") ?? "";
  const [selectedId, setSelectedId] = useState<string>(queryId || defaultProductId);

  useEffect(() => {
    if (hasProducts && !queryId && defaultProductId) {
      navigate(`/seller/${storeUrl}/settlement/product?productId=${encodeURIComponent(defaultProductId)}`, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultProductId, hasProducts]);

  const selectedMeta = useMemo(
    () => aliveProducts.find((p) => p.productId === selectedId) ?? null,
    [aliveProducts, selectedId]
  );

  const onSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    setSelectedId(id);
    navigate(`/seller/${storeUrl}/settlement/product?productId=${encodeURIComponent(id)}`, { replace: false });
  };

  // (3) 선택 상품 데이터 (환불 제외)
  const tx = useMemo(() => {
    if (!selectedMeta) return [];
    return TX_PRODUCT.filter((t) => t.productId === selectedMeta.productId && !t.refunded);
  }, [selectedMeta]);

  const settlements = useMemo(() => {
    if (!selectedMeta) return [];
    return (SETTLEMENT_PRODUCT[selectedMeta.productId] ?? []);
  }, [selectedMeta]);

  // ------------------ 주간 차트 (월~일 7일) ------------------
  const [weekAnchor, setWeekAnchor] = useState<Date>(() => startOfWeekMon(new Date()));
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekAnchor, i)), [weekAnchor]);

  const weeklyChartData = useMemo(() => {
    const sumByDay: Record<string, number> = {};
    weekDays.forEach((d) => (sumByDay[fmtYMD(d)] = 0));
    tx.forEach((r) => {
      const key = r.date;
      if (key in sumByDay) sumByDay[key] += r.amount;
    });
    return weekDays.map((d) => ({
      date: fmtYMD(d),
      label: `${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
      amount: sumByDay[fmtYMD(d)] || 0,
    }));
  }, [tx, weekDays]);

  const weeklyTotal = useMemo(
    () => weeklyChartData.reduce((acc, cur) => acc + cur.amount, 0),
    [weeklyChartData]
  );

  // ------------------ 요약 카드 ------------------
  // 총 매출: "정산일 기준 다음 정산일까지 한달 기준"
  const cycleTotal = useMemo(() => {
    if (!selectedMeta) return 0;
    const list = (SETTLEMENT_PRODUCT[selectedMeta.productId] ?? []).slice().sort((a, b) => a.date.localeCompare(b.date));
    // 마지막 정산일 => 그 날부터 +1개월
    const lastSettleStart = list.length ? parseDate(list[list.length - 1].date) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const nextSettle = addMonths(lastSettleStart, 1);
    return tx
      .filter((t) => {
        const d = parseDate(t.date);
        return d >= lastSettleStart && d < nextSettle;
      })
      .reduce((sum, t) => sum + t.amount, 0);
  }, [tx, selectedMeta]);

  // ------------------ Render ------------------
  return (
    <>
      <Header />
      <Mainnavbar />

      <SellerSidenavbar>
        <div className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-6">
          <div className="flex flex-col gap-1">
            <h1 className="text-xl sm:text-2xl font-bold">상품별 정산</h1>
            <p className="text-gray-600">상품을 선택하면 대표 이미지 · 주간 매출 차트 · 정산 내역을 확인할 수 있어요.</p>
          </div>

          {/* 선택영역 / 빈 상태 */}
          <div className="mt-4">
            <label htmlFor="product-select" className="block text-sm font-medium text-gray-700 mb-2">
              상품 선택
            </label>

            {!hasProducts ? (
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 rounded-xl border border-dashed border-gray-300 p-4">
                <p className="text-gray-600">등록된 상품이 없습니다.</p>
                <button
                  type="button"
                  onClick={() => navigate(`/seller/${storeUrl}/products/new`)} // 필요 시 경로 수정
                  className="h-10 rounded-xl bg-[#2d4739] px-4 text-white text-sm hover:opacity-95"
                >
                  상품 등록하러 가기
                </button>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                <select
                  id="product-select"
                  value={selectedMeta?.productId ?? ""}
                  onChange={onSelectChange}
                  className="h-11 w-full sm:w-[360px] rounded-xl border border-gray-300 px-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#2d4739]/25 focus:border-[#2d4739]"
                >
                  {aliveProducts.map((opt) => (
                    <option key={opt.productId} value={opt.productId}>
                      [{opt.productId}] {opt.title}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* 대표 이미지 + 주간 차트 */}
          {selectedMeta && (
            <div className="mt-6 grid grid-cols-1 xl:grid-cols-5 gap-4">
              {/* 대표 이미지 카드 */}
              <div className="xl:col-span-2 rounded-2xl border border-gray-200 overflow-hidden">
                <div className="aspect-[4/3] relative bg-gray-50">
                  {selectedMeta.hero ? (
                    <img
                      src={selectedMeta.hero}
                      alt={selectedMeta.title}
                      className="absolute inset-0 h-full w-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                      <ImageIcon className="w-10 h-10" />
                    </div>
                  )}
                </div>
                <div className="p-4 flex items-center justify-between">
                  <div>
                    <div className="text-sm text-gray-600">[{selectedMeta.productId}]</div>
                    <div className="text-lg font-semibold">{selectedMeta.title}</div>
                  </div>
                  <div className="rounded-xl border p-2" style={{ borderColor: "#e5e7eb", color: brand }}>
                    <CalendarDays className="w-5 h-5" />
                  </div>
                </div>
              </div>

              {/* 주간 결제금액 차트 (환불 제외) */}
              <div className="xl:col-span-3 rounded-2xl border border-gray-200 p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <h3 className="text-lg font-semibold">주간 결제 금액</h3>
                  <div className="flex items-center gap-2">
                    <button
                      className="h-9 rounded-lg border px-3 text-sm hover:bg-gray-50"
                      onClick={() => setWeekAnchor(addDays(weekAnchor, -7))}
                    >
                      이전 주
                    </button>
                    <input
                      type="date"
                      value={fmtYMD(weekAnchor)}
                      onChange={(e) => setWeekAnchor(startOfWeekMon(parseDate(e.target.value)))}
                      className="h-9 rounded-lg border px-3 text-sm"
                      aria-label="주 시작일 선택(월요일 기준)"
                      title="주 시작일(월요일)"
                    />
                    <button
                      className="h-9 rounded-lg border px-3 text-sm hover:bg-gray-50"
                      onClick={() => setWeekAnchor(addDays(weekAnchor, 7))}
                    >
                      다음 주
                    </button>
                  </div>
                </div>

                <div className="mt-3 h-[260px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={weeklyChartData} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="label" fontSize={12} />
                      <YAxis tickFormatter={(v) => KRW.format(v)} fontSize={12} />
                      <Tooltip
                        formatter={(v: number) => `₩ ${KRW.format(v)}`}
                        labelFormatter={(l, p: any) => `날짜: ${p?.payload?.date ?? ""}`}
                      />
                      <Bar dataKey="amount" fill={brand} radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {/* 요약 카드: 총 매출(정산주기) / 이번주 매출 */}
          {selectedMeta && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 mt-6">
              <SummaryCard title="총 매출(정산 주기 한 달)" value={`₩ ${KRW.format(cycleTotal)}`} icon={<BarChart3 className="w-5 h-5" />} />
              <SummaryCard title="이번주 매출" value={`₩ ${KRW.format(weeklyTotal)}`} icon={<BarChart3 className="w-5 h-5" />} />
            </div>
          )}

          {/* 정산 내역 (왼쪽 정렬) */}
          {selectedMeta && (
            <div className="mt-6 rounded-2xl border border-gray-200 bg-white overflow-x-auto">
              <div className="p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">정산 내역</h2>
                  <span className="text-sm text-gray-500">
                    {settlements.length ? `${settlements.length}건` : "데이터 없음"}
                  </span>
                </div>

                <table className="mt-4 w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500">
                      <th className="py-2 pr-4 font-medium">정산 일자</th>
                      <th className="py-2 pr-4 font-medium">정산 금액</th>
                      <th className="py-2 pr-4 font-medium">계좌번호</th>
                      <th className="py-2 pr-4 font-medium">은행명</th>
                      <th className="py-2 pr-4 font-medium">예금주명</th>
                      <th className="py-2 pr-4 font-medium">정산상태</th>
                      <th className="py-2 pr-4 font-medium">최근 수정일</th>
                    </tr>
                  </thead>
                  <tbody>
                    {settlements.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-gray-500">정산 데이터가 없습니다</td>
                      </tr>
                    ) : (
                      settlements.map((s, idx) => (
                        <tr key={`${s.date}-${idx}`} className="border-t border-gray-100">
                          <td className="py-3 pr-4">{s.date}</td>
                          <td className="py-3 pr-4">₩ {KRW.format(s.amount)}</td>
                          <td className="py-3 pr-4">{s.account}</td>
                          <td className="py-3 pr-4">{s.bank}</td>
                          <td className="py-3 pr-4">{s.holder}</td>
                          <td className="py-3 pr-4">
                            <span
                              className={[
                                "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium border",
                                s.status === "정산 완료"
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : s.status === "정산 예정"
                                  ? "bg-amber-50 text-amber-700 border-amber-200"
                                  : "bg-rose-50 text-rose-700 border-rose-200",
                              ].join(" ")}
                            >
                              {s.status}
                            </span>
                          </td>
                          <td className="py-3 pr-4">{s.updatedAt}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
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
        <div className="rounded-xl border p-2" style={{ borderColor: "#e5e7eb", color: "#2d4739" }}>
          {icon}
        </div>
      </div>
    </div>
  );
}
