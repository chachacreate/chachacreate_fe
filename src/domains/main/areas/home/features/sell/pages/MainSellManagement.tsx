// src/domains/main/areas/home/features/sell/pages/MainSellManagement.tsx
import React, { useEffect, useMemo, useState } from "react";
import Header from "@src/shared/areas/layout/features/header/Header";
import Mainnavbar from "@src/shared/areas/navigation/features/navbar/main/Mainnavbar";
import SellSubnavbar from "@src/shared/areas/navigation/features/subnavbar/sell/SellSubnavbar";
import {
  TrendingUp,
  CalendarDays,
  ExternalLink,
  TruckIcon,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
} from "lucide-react";

/** ---------- Types ---------- */
type Status =
  | "주문 완료"
  | "취소 요청"
  | "환불 요청"
  | "발송 완료"
  | "배송 완료"
  | "취소 완료"
  | "환불 완료";

type OrderRow = {
  id: string;
  status: Status;
  orderNo: string;
  orderedAt: string; // ISO
  productId: string;
  productName: string;
  productImage?: string;
  qty: number;
  amount: number; // 단가*수량 (원)
};

type SavedProduct = {
  id: string; // "1" | "2"
  images: string[];
  name: string;
  price: number | "";
  description: string;
  categoryParent: string;
  categoryChild: string;
  stock: number | "";
  lastModified?: string;
};

/** ---------- Const / Utils ---------- */
const STORAGE_KEY = "personal_sell_products_v1";
const STATUS_ORDER: Status[] = [
  "주문 완료",
  "취소 요청",
  "환불 요청",
  "발송 완료",
  "배송 완료",
  "취소 완료",
  "환불 완료",
];
const won = (n: number) => n.toLocaleString("ko-KR");

/** 데모 주문 생성 (등록 상품 있으면 반영) */
const makeDemoOrders = (products: SavedProduct[]): OrderRow[] => {
  const base: SavedProduct[] =
    products.length > 0
      ? products
      : [
          { id: "1", name: "데모 상품 A", price: 15000, images: [], description: "", categoryParent: "", categoryChild: "", stock: 0 },
          { id: "2", name: "데모 상품 B", price: 32000, images: [], description: "", categoryParent: "", categoryChild: "", stock: 0 },
        ];

  const result: OrderRow[] = [];
  const today = new Date();

  for (let i = 0; i < 60; i++) {
    const p = base[i % base.length];
    const d = new Date(today);
    d.setDate(d.getDate() - i);

    const status = STATUS_ORDER[i % STATUS_ORDER.length];
    const qty = (i % 3) + 1;
    const price = Number(p.price || 0);

    result.push({
      id: String(i + 1),
      status,
      orderNo: `S${d.getFullYear()}${(d.getMonth() + 1).toString().padStart(2, "0")}${d.getDate().toString().padStart(2, "0")}-${1000 + i}`,
      orderedAt: d.toISOString(),
      productId: p.id,
      productName: p.name || `상품 ${p.id}`,
      productImage: p.images?.[0],
      qty,
      amount: price * qty,
    });
  }
  return result;
};

/** 날짜 helpers */
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const startOfWeek = (d: Date) => {
  const day = d.getDay(); // 0:일
  const diff = (day + 6) % 7; // 월=0
  const s = new Date(d);
  s.setDate(d.getDate() - diff);
  return startOfDay(s);
};
const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
const fmt = (d: Date) =>
  `${d.getFullYear()}.${(d.getMonth() + 1).toString().padStart(2, "0")}.${d.getDate().toString().padStart(2, "0")}`;
const ym = (d: Date) => `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}`;
const nextMonthFirst = (d: Date) => new Date(d.getFullYear(), d.getMonth() + 1, 1);
const addDays = (date: Date, days: number) => {
  const r = new Date(date);
  r.setDate(r.getDate() + days);
  return r;
};
const addWeeks = (date: Date, weeks: number) => addDays(date, weeks * 7);
const addMonths = (date: Date, months: number) => {
  const r = new Date(date);
  r.setMonth(r.getMonth() + months);
  return r;
};

/** ---------- Chart (SVG) ---------- */
// BarChart 컴포넌트 - 애니메이션 키를 통해 리렌더링 시마다 애니메이션 재실행
const BarChart: React.FC<{ 
  data: { label: string; value: number }[]; 
  height?: number;
  animationKey?: string | number; // 애니메이션 재실행을 위한 키
}> = ({
  data,
  height = 220,
  animationKey = 0,
}) => {
  const max = Math.max(1, ...data.map((d) => d.value));

  // 고정된 차트 영역에서 데이터 개수에 따라 막대 크기 조정
  const n = data.length || 1;
  const gap = 14;
  
  // 고정 너비 (부모 컨테이너에 맞춤)
  const width = 500; // 고정 차트 너비
  
  // 막대 너비 계산: 고정 너비에서 간격들을 뺀 나머지를 막대 개수로 나눔
  const totalGapWidth = gap * (n + 1); // 양쪽 끝 + 막대 사이 간격들
  const availableWidth = width - totalGapWidth;
  const barW = Math.max(8, Math.floor(availableWidth / n)); // 최소 8px

  return (
    <div className="w-full">
      <svg width={width} height={height} className="mx-auto" key={`chart-${animationKey}`}>
        {/* x-axis */}
        <line x1={0} y1={height - 24} x2={width} y2={height - 24} stroke="#e5e7eb" />
        {data.map((d, i) => {
          const h = Math.round(((height - 40) * d.value) / max);
          const x = gap + i * (barW + gap);
          const y = height - 24 - h;
          const delay = 0.06 * i; // 막대 순차 등장 딜레이

          return (
            <g key={`${animationKey}-bar-${i}`}>
              <rect
                x={x}
                y={height - 24}
                width={barW}
                height={0}
                rx={6}
                className="fill-[#2d4739]"
              >
                {/* height & y 애니메이션 */}
                <animate attributeName="height" from="0" to={h} dur="0.6s" begin={`${delay}s`} fill="freeze" />
                <animate attributeName="y" from={height - 24} to={y} dur="0.6s" begin={`${delay}s`} fill="freeze" />
              </rect>

              {/* 라벨/값 페이드 인 */}
              <text
                x={x + barW / 2}
                y={height - 8}
                textAnchor="middle"
                className="fill-gray-500 text-[10px]"
                opacity="0"
              >
                <animate attributeName="opacity" from="0" to="1" dur="0.3s" begin={`${delay + 0.4}s`} fill="freeze" />
                {d.label}
              </text>
              <text
                x={x + barW / 2}
                y={y - 6}
                textAnchor="middle"
                className="fill-gray-700 text-[10px]"
                opacity="0"
              >
                <animate attributeName="opacity" from="0" to="1" dur="0.3s" begin={`${delay + 0.45}s`} fill="freeze" />
                {d.value.toLocaleString("ko-KR")}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

/** ---------- Page ---------- */
const MainSellManagement: React.FC = () => {
  const [products, setProducts] = useState<SavedProduct[]>([]);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<"ALL" | string>("ALL");
  const [granularity, setGranularity] = useState<"일" | "주" | "월">("일");
  const [anchorDate, setAnchorDate] = useState<Date>(new Date()); // 달력 선택 기준일
  const [showTotalRev, setShowTotalRev] = useState(false);
  const [showDeliveredRev, setShowDeliveredRev] = useState(false);
  const [animKey, setAnimKey] = useState(0); // 표 애니메이션 재생 용도
  const [chartAnimKey, setChartAnimKey] = useState(0); // 차트 애니메이션 재생 용도

  // 상품/주문 로딩
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as SavedProduct[];
        if (Array.isArray(parsed)) setProducts(parsed.slice(0, 2));
      }
    } catch {}
  }, []);

  useEffect(() => {
    setOrders(makeDemoOrders(products));
  }, [products]);

  // 상품 카드
  const productCards = useMemo(() => {
    const base: SavedProduct[] =
      products.length > 0
        ? products
        : [
            { id: "1", name: "데모 상품 A", price: 15000, images: [], description: "", categoryParent: "", categoryChild: "", stock: 0 },
            { id: "2", name: "데모 상품 B", price: 32000, images: [], description: "", categoryParent: "", categoryChild: "", stock: 0 },
          ];
    return base.slice(0, 2);
  }, [products]);

  const byProduct = useMemo(
    () => (selectedProductId === "ALL" ? orders : orders.filter((o) => o.productId === selectedProductId)),
    [orders, selectedProductId]
  );

  // 총 판매 수량
  const totalSoldByProduct = useMemo(() => {
    const map: Record<string, number> = {};
    for (const o of orders) map[o.productId] = (map[o.productId] || 0) + o.qty;
    return map;
  }, [orders]);

  /** ----------- 차트/표 데이터 집계 ----------- 
   * 일별: 7일, 주별: 4주, 월별: 12개월 (요청사항)
   * anchorDate(달력 선택일)를 기준으로 과거로 이동
   */
  const ranges = useMemo(() => {
    if (granularity === "일") {
      // anchorDate 포함 7일: anchor-6 ~ anchor
      return Array.from({ length: 7 }, (_, i) => addDays(anchorDate, -6 + i));
    }
    if (granularity === "주") {
      // anchorDate가 포함된 주를 끝 주로 보고 4주: (끝-3주) ~ 끝
      const end = startOfWeek(anchorDate);
      return Array.from({ length: 4 }, (_, i) => addWeeks(end, -3 + i));
    }
    // 월: anchorDate가 포함된 달을 끝 달로 보고 12개월: (끝-11) ~ 끝
    const end = startOfMonth(anchorDate);
    return Array.from({ length: 12 }, (_, i) => addMonths(end, -11 + i));
  }, [granularity, anchorDate]);

  const chartData = useMemo(() => {
    const buckets = new Map<string, number>();

    ranges.forEach((date) => {
      let key: string;
      let start: Date;
      let end: Date;

      if (granularity === "일") {
        start = startOfDay(date);
        end = addDays(start, 1);
        key = fmt(date).slice(5); // MM.DD
      } else if (granularity === "주") {
        start = startOfWeek(date);
        end = addDays(start, 7);
        const s = fmt(start).slice(5);
        const e = fmt(addDays(start, 6)).slice(5);
        key = `${s}~${e}`;
      } else {
        start = startOfMonth(date);
        end = addMonths(start, 1);
        key = `${date.getFullYear()}.${(date.getMonth() + 1).toString().padStart(2, "0")}`;
      }

      const sum = byProduct
        .filter((o) => {
          const od = new Date(o.orderedAt);
          return od >= start && od < end;
        })
        .reduce((acc, o) => acc + o.amount, 0);

      buckets.set(key, sum);
    });

    // 차트와 표 모두 애니메이션 재실행
    setAnimKey((k) => k + 1);
    setChartAnimKey((k) => k + 1);
    
    return ranges.map((date) => {
      let label = "";
      if (granularity === "일") label = fmt(date).slice(5);
      else if (granularity === "주") {
        const s = fmt(startOfWeek(date)).slice(5);
        const e = fmt(addDays(startOfWeek(date), 6)).slice(5);
        label = `${s}~${e}`;
      } else label = `${date.getFullYear()}.${(date.getMonth() + 1).toString().padStart(2, "0")}`;
      return { label, value: buckets.get(label) || 0 };
    });
  }, [byProduct, granularity, ranges]);

  const tableData = useMemo(() => chartData.map((c) => ({ period: c.label, amount: c.value })), [chartData]);

  const totalRevenue = useMemo(() => byProduct.reduce((acc, o) => acc + o.amount, 0), [byProduct]);
  const deliveredRevenue = useMemo(
    () => byProduct.filter((o) => o.status === "배송 완료").reduce((acc, o) => acc + o.amount, 0),
    [byProduct]
  );

  // 월별 정산 (배송 완료 기준)
  const monthlySettlement = useMemo(() => {
    const map = new Map<string, number>();
    for (const o of byProduct) {
      if (o.status !== "배송 완료") continue;
      const d = new Date(o.orderedAt);
      const k = ym(d);
      map.set(k, (map.get(k) || 0) + o.amount);
    }
    const rows = Array.from(map.entries())
      .sort(([a], [b]) => (a > b ? -1 : 1))
      .map(([k, amount]) => {
        const [year, month] = k.split("-").map(Number);
        const base = new Date(year, month - 1, 1);
        const settleDate = nextMonthFirst(base);
        return {
          ym: k,
          settleDate: fmt(settleDate),
          amount,
          bank: { account: "110-123-456789", bankName: "신한은행", holder: "홍길동" },
        };
      });
    return rows;
  }, [byProduct]);

  const goProductDetail = (id: string) => {
    window.location.href = `/main/product/${id}`;
  };

  const jumpBackward = () => {
    if (granularity === "일") setAnchorDate(addDays(anchorDate, -7));
    else if (granularity === "주") setAnchorDate(addWeeks(anchorDate, -4));
    else setAnchorDate(addMonths(anchorDate, -12));
  };
  const jumpForward = () => {
    if (granularity === "일") setAnchorDate(addDays(anchorDate, 7));
    else if (granularity === "주") setAnchorDate(addWeeks(anchorDate, 4));
    else setAnchorDate(addMonths(anchorDate, 12));
  };

  /** 달력 입력 핸들러 */
  const onPickDate: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const v = e.target.value; // "YYYY-MM-DD"
    if (!v) return;
    const [y, m, d] = v.split("-").map(Number);
    setAnchorDate(new Date(y, m - 1, d));
  };

  /** 표시용 범위 텍스트 */
  const periodText = useMemo(() => {
    if (granularity === "일") {
      const start = addDays(ranges[0], 0);
      const end = addDays(ranges[ranges.length - 1], 0);
      return `${fmt(start)} ~ ${fmt(end)}`;
    }
    if (granularity === "주") {
      const start = startOfWeek(ranges[0]);
      const end = startOfWeek(ranges[ranges.length - 1]);
      return `${fmt(start)} ~ ${fmt(addDays(end, 6))}`;
    }
    const start = startOfMonth(ranges[0]);
    const end = startOfMonth(ranges[ranges.length - 1]);
    return `${start.getFullYear()}.${(start.getMonth() + 1).toString().padStart(2, "0")} ~ ${end.getFullYear()}.${(
      end.getMonth() + 1
    )
      .toString()
      .padStart(2, "0")}`;
  }, [granularity, ranges]);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* animations */}
      <style>{`
        @keyframes rowIn { from { opacity: 0; transform: translateY(6px) } to { opacity: 1; transform: translateY(0) } }
        .animate-row { animation: rowIn .4s ease both; }
      `}</style>

      <Header />
      <Mainnavbar />
      <SellSubnavbar />

      <div className="px-4 sm:px-6 xl:px-[240px]">
        <div className="w-full max-w-[1440px] mx-auto py-6 md:py-10">
          {/* 헤더 */}
          <header className="mb-6 md:mb-8">
            <h1 className="text-xl md:text-2xl font-extrabold tracking-[-0.01em]">개인 판매 · 정산 관리</h1>
            <p className="text-gray-600 mt-1 text-sm">상품을 선택해 해당 상품의 매출 및 정산 정보를 확인하세요. (일/주/월 그래프 지원)</p>
          </header>

          {/* 상품 카드 */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            {productCards.map((p) => {
              const img = p.images?.[0];
              const totalSold = totalSoldByProduct[p.id] || 0;
              const active = selectedProductId === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => setSelectedProductId((prev) => (prev === p.id ? "ALL" : p.id))}
                  className={[
                    "text-left rounded-2xl border p-4 md:p-6 shadow-sm transition-all",
                    active ? "bg-indigo-50/70 border-indigo-200 ring-2 ring-indigo-200" : "bg-white hover:bg-gray-50 border-gray-200",
                  ].join(" ")}
                >
                  <div className="flex gap-4">
                    <div className="w-20 h-20 rounded-lg overflow-hidden border bg-gray-50 shrink-0">
                      {img ? (
                        <img src={img} alt={p.name || `상품 ${p.id}`} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full grid place-items-center text-gray-400">
                          <TruckIcon className="w-6 h-6" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold truncate">{p.name || `상품 ${p.id}`}</div>
                      <div className="text-sm text-gray-600 mt-0.5">가격: {typeof p.price === "number" ? `${won(p.price)}원` : "—"}</div>
                      <div className="text-sm text-gray-900 mt-2">
                        총 판매 수량: <span className="font-semibold">{totalSold}</span>개
                      </div>

                      <div className="mt-3">
                        <span
                          onClick={(e) => {
                            e.stopPropagation();
                            goProductDetail(p.id);
                          }}
                          className="inline-flex items-center gap-1 text-xs font-medium text-indigo-700 hover:text-indigo-900 hover:underline"
                        >
                          상품 상세페이지 가기 <ExternalLink className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </div>
                  </div>

                  {active && (
                    <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-indigo-600 text-white px-2.5 py-1 text-xs">선택됨</div>
                  )}
                </button>
              );
            })}
          </section>

          {/* 그래프 + 수익 */}
          <section className="mt-6 md:mt-8 grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
            <div className="lg:col-span-2 rounded-2xl border bg-white p-4 md:p-6">
              {/* 상단 컨트롤 */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-[#2d4739]" />
                  <h2 className="text-lg font-semibold">매출 분석</h2>
                </div>

                <div className="flex items-center gap-3">
                  {/* granularity */}
                  <div className="flex items-center gap-2">
                    {(["일", "주", "월"] as const).map((g) => (
                      <button
                        key={g}
                        onClick={() => setGranularity(g)}
                        className={[
                          "h-10 rounded-xl border px-4 text-sm font-medium transition-all",
                          granularity === g ? "bg-[#2d4739] text-white border-[#2d4739]" : "bg-white text-gray-700 hover:bg-gray-50 border-gray-300",
                        ].join(" ")}
                      >
                        {g}별
                      </button>
                    ))}
                  </div>

                  {/* date picker */}
                  <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                    <CalendarIcon className="w-4 h-4 text-gray-600" />
                    <input
                      type="date"
                      value={`${anchorDate.getFullYear()}-${(anchorDate.getMonth() + 1)
                        .toString()
                        .padStart(2, "0")}-${anchorDate.getDate().toString().padStart(2, "0")}`}
                      onChange={onPickDate}
                      className="rounded-md border px-2 py-1.5 text-sm"
                    />
                  </label>
                </div>
              </div>

              {/* 기간 네비게이션 (일: 7일, 주: 4주, 월: 12개월 단위 이동) */}
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={jumpBackward}
                  className="flex items-center gap-1 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                  이전 {granularity === "일" ? "7일" : granularity === "주" ? "4주" : "12개월"}
                </button>

                <div className="text-sm text-gray-600 font-medium">{periodText}</div>

                <button
                  onClick={jumpForward}
                  className="flex items-center gap-1 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  다음 {granularity === "일" ? "7일" : granularity === "주" ? "4주" : "12개월"}
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* 차트 + 표 */}
              <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
                <div className="xl:col-span-3">
                  <BarChart 
                    data={chartData} 
                    animationKey={chartAnimKey}
                  />
                  <p className="mt-3 text-xs text-gray-500">선택한 상품 기준으로 {granularity}별 매출 합계를 보여줍니다.</p>
                </div>

                {/* 표 (반응형 사이즈 & 애니메이션) */}
                <div className="xl:col-span-2">
                  <div className="rounded-lg border border-gray-200 bg-gray-50/50 overflow-hidden">
                    <div className="px-4 py-3 bg-gray-100 border-b border-gray-200">
                      <h3 className="text-sm font-semibold text-gray-900">{granularity}별 매출 상세</h3>
                    </div>
                    <div
                      key={animKey}
                      className="overflow-y-auto min-h-[432px] sm:min-h-[432px] max-h-[432px] sm:max-h-[432px]"
                    >
                      {/* 데스크톱 표 */}
                      <table className="w-full text-xs md:text-sm hidden sm:table">
                        <thead className="bg-white sticky top-0">
                          <tr className="text-left text-gray-500 border-b border-gray-200">
                            <th className="py-2 px-4 font-medium">기간</th>
                            <th className="py-2 px-4 font-medium text-right">매출</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white">
                          {tableData.map((row, idx) => (
                            <tr 
                              key={`${animKey}-row-${idx}`}
                              className="border-b border-gray-100 hover:bg-gray-50 transition-colors animate-row"
                              style={{ animationDelay: `${idx * 0.05}s` }}
                            >
                              <td className="py-2 px-4 text-gray-900">{row.period}</td>
                              <td className="py-2 px-4 text-right font-medium text-gray-900">{won(row.amount)}원</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>

                      {/* 모바일 리스트 */}
                      <div className="sm:hidden p-2 space-y-2">
                        {tableData.map((row, idx) => (
                          <div
                            key={`${animKey}-mobile-${idx}`}
                            className="animate-row rounded-lg border bg-white px-3 py-2 flex items-center justify-between"
                            style={{ animationDelay: `${idx * 0.05}s` }}
                          >
                            <div className="text-[13px] text-gray-700">{row.period}</div>
                            <div className="text-[13px] font-semibold text-gray-900">{won(row.amount)}원</div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="px-4 py-3 bg-gray-100 border-t border-gray-200">
                      <div className="text-sm font-semibold text-gray-900">
                        총 합계: {won(tableData.reduce((s, r) => s + r.amount, 0))}원
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 수익 카드 (정산률 애니메이션 포함) */}
            <div className="rounded-2xl border bg-white p-4 md:p-6">
              <div className="flex items-center gap-2 mb-4">
                <DollarSign className="w-5 h-5 text-[#2d4739]" />
                <h3 className="text-lg font-semibold">수익 현황</h3>
              </div>

              <div className="space-y-4">
                <div className="rounded-xl border border-gray-200 overflow-hidden transition-all hover:shadow-md">
                  <button className="w-full text-left p-4 hover:bg-gray-50 transition-colors" onClick={() => setShowTotalRev((v) => !v)}>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium text-gray-700">총 수익</div>
                        <div className="text-xs text-gray-500 mt-0.5">전체 주문 기준</div>
                      </div>
                      <div className="w-2 h-2 rounded-full bg-blue-500" />
                    </div>
                  </button>
                  {showTotalRev && (
                    <div className="px-4 pb-4 animate-row">
                      <div className="rounded-lg bg-blue-50 border border-blue-200 px-4 py-3">
                        <div className="text-2xl font-bold text-blue-900">{won(totalRevenue)}원</div>
                        <div className="text-sm text-blue-700 mt-1">모든 주문 상태 포함</div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="rounded-xl border border-gray-200 overflow-hidden transition-all hover:shadow-md">
                  <button className="w-full text-left p-4 hover:bg-gray-50 transition-colors" onClick={() => setShowDeliveredRev((v) => !v)}>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium text-gray-700">정산 가능 수익</div>
                        <div className="text-xs text-gray-500 mt-0.5">배송 완료 기준</div>
                      </div>
                      <div className="w-2 h-2 rounded-full bg-emerald-500" />
                    </div>
                  </button>
                  {showDeliveredRev && (
                    <div className="px-4 pb-4 animate-row">
                      <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3">
                        <div className="text-2xl font-bold text-emerald-900">{won(deliveredRevenue)}원</div>
                        <div className="text-sm text-emerald-700 mt-1">배송 완료된 주문만</div>
                      </div>
                    </div>
                  )}
                </div>

                {/* 정산률 막대 (애니메이션) */}
                <div className="rounded-xl bg-gray-50 p-4">
                  <div className="text-sm font-medium text-gray-700 mb-2">정산률</div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
                      <div
                        key={`${totalRevenue}-${deliveredRevenue}-${chartAnimKey}`}
                        className="h-full bg-[#2d4739] transition-[width] duration-700 ease-out"
                        style={{ width: `${totalRevenue > 0 ? (deliveredRevenue / totalRevenue) * 100 : 0}%` }}
                      />
                    </div>
                    <div className="text-xs text-gray-600">
                      {totalRevenue > 0 ? Math.round((deliveredRevenue / totalRevenue) * 100) : 0}%
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">총 수익 대비 정산 가능한 수익 비율</div>
                </div>
              </div>
            </div>
          </section>

          {/* 월별 정산 테이블 */}
          <section className="mt-6 md:mt-8 rounded-2xl border bg-white p-4 md:p-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-gray-700" /> 월별 정산 내역
              </h2>
              <span className="text-xs text-gray-500">정산 완료일은 다음 달 1일 기준(예정)</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs md:text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b">
                    <th className="py-2 px-2">정산 월</th>
                    <th className="py-2 px-2">정산 완료일(예정)</th>
                    <th className="py-2 px-2 text-right">정산 금액</th>
                    <th className="py-2 px-2">정산 계좌</th>
                  </tr>
                </thead>
                <tbody key={`settlement-${animKey}`}>
                  {monthlySettlement.length === 0 ? (
                    <tr className="animate-row">
                      <td colSpan={4} className="py-6 text-center text-gray-500">
                        정산 가능한(배송 완료) 매출이 없습니다.
                      </td>
                    </tr>
                  ) : (
                    monthlySettlement.map((row, idx) => (
                      <tr 
                        key={`${animKey}-settlement-${row.ym}`} 
                        className="border-b last:border-b-0 animate-row"
                        style={{ animationDelay: `${idx * 0.1}s` }}
                      >
                        <td className="py-2 px-2">{row.ym}</td>
                        <td className="py-2 px-2">{row.settleDate}</td>
                        <td className="py-2 px-2 text-right">{won(row.amount)}원</td>
                        <td className="py-2 px-2">
                          {row.bank.bankName} {row.bank.account} ({row.bank.holder})
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-xs text-gray-500">실제 정산일/금액/계좌는 관리자 설정 및 정산 정책에 따라 달라질 수 있습니다.</p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default MainSellManagement;