import type { FC } from "react";
import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Header from "@src/shared/areas/layout/features/header/Header";
import Mainnavbar from "@src/shared/areas/navigation/features/navbar/main/Mainnavbar";
import SellerSidenavbar from "@src/shared/areas/navigation/features/sidenavbar/seller/SellerSidenavbar";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { PackagePlus, Truck, XOctagon, RotateCcw } from "lucide-react";
import ClassStatsCard, {
  type ClassStatsMode,
  type ClassStatsDatum,
} from "@src/shared/components/analytics/ClassStatsCard";

// --------------------- 유틸/상수 ---------------------
type Params = { storeUrl: string };
const BRAND = "#2D4739";
const KRW = new Intl.NumberFormat("ko-KR");
const fmtKRW = (v: number) => `₩ ${KRW.format(v)}`;

// const diffDaysInclusive = (start: Date, end: Date) => {
//   const a = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime();
//   const b = new Date(end.getFullYear(), end.getMonth(), end.getDate()).getTime();
//   return Math.floor((b - a) / (24 * 60 * 60 * 1000)) + 1;
// };

// --------------------- 더미 데이터 생성기들 ---------------------
const makeDailySales = (days = 14) =>
  Array.from({ length: days }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (days - 1 - i));
    const key = d.toISOString().slice(5, 10); // MM-DD
    const amount = 200000 + Math.floor(Math.random() * 800000);
    const orders = 5 + Math.floor(Math.random() * 20);
    return { key, amount, orders, date: d.toISOString().slice(0, 10) };
  });

// const makeWeeklySales = (weeks = 10) =>
//   Array.from({ length: weeks }).map((_, i) => {
//     const key = `W${i + 1}`;
//     const amount = 1500000 + Math.floor(Math.random() * 4000000);
//     const orders = 40 + Math.floor(Math.random() * 120);
//     return { key, amount, orders };
//   });

// const makeMonthlySales = (months = 6) =>
//   Array.from({ length: months }).map((_, i) => {
//     const month = new Date();
//     month.setMonth(month.getMonth() - (months - 1 - i));
//     const key = `${month.getFullYear().toString().slice(-2)}-${String(
//       month.getMonth() + 1
//     ).padStart(2, "0")}`;
//     const amount = 6000000 + Math.floor(Math.random() * 12000000);
//     const orders = 200 + Math.floor(Math.random() * 600);
//     return { key, amount, orders };
//   });

const make24HourStats = (): ClassStatsDatum[] =>
  Array.from({ length: 24 }).map((_, i) => {
    const key = `${String(i).padStart(2, "0")}:00`;
    const count = 1 + Math.floor(Math.random() * 18);
    const revenue = count * (40000 + Math.floor(Math.random() * 30000));
    return { key, count, revenue };
  });

const makeWeekdayStats = (): ClassStatsDatum[] => {
  const days = ["월", "화", "수", "목", "금", "토", "일"];
  return days.map((key) => {
    const count = 5 + Math.floor(Math.random() * 20);
    const revenue = count * (50000 + Math.floor(Math.random() * 50000));
    return { key, count, revenue };
  });
};

// 주문 상태 요약(최근 7일 가정)
type OrderSummaryKey = "신규주문" | "배송완료" | "취소요청" | "환불완료";
type OrderSummary = { key: OrderSummaryKey; count: number };
const mockOrderSummary: OrderSummary[] = [
  { key: "신규주문", count: 12 },
  { key: "배송완료", count: 87 },
  { key: "취소요청", count: 3 },
  { key: "환불완료", count: 2 },
];

// 리뷰/평점 더미
type ReviewRow = {
  id: string;
  productId: string;
  productName: string;
  rating: number; // 0~5, 0.5 step
  title: string;
  content: string;
  createdAt: string;
  author: string;
};
const mockProducts = [
  { id: "P-1001", name: "도자기 머그컵" },
  { id: "P-1002", name: "라탄 트레이" },
  { id: "P-1003", name: "캔들 세트" },
];
const mockReviews: ReviewRow[] = [
  { id: "RV-1", productId: "P-1001", productName: "도자기 머그컵", rating: 4.5, title: "색감 예뻐요", content: "유약 색이 사진보다 더 고급집니다!", createdAt: "2025-09-02", author: "김**" },
  { id: "RV-2", productId: "P-1002", productName: "라탄 트레이", rating: 4.0, title: "탄탄해요", content: "마감이 깔끔하고 사이즈도 적당합니다.", createdAt: "2025-09-01", author: "박**" },
  { id: "RV-3", productId: "P-1003", productName: "캔들 세트", rating: 5.0, title: "향이 좋아요", content: "은은해서 거슬리지 않네요.", createdAt: "2025-08-30", author: "이**" },
  { id: "RV-4", productId: "P-1001", productName: "도자기 머그컵", rating: 3.5, title: "괜찮습니다", content: "그립감이 좋아요.", createdAt: "2025-08-28", author: "최**" },
];
const PIE_COLORS = [
  "#ef4444","#f97316","#f59e0b","#eab308","#84cc16","#22c55e",
  "#10b981","#06b6d4","#3b82f6","#8b5cf6","#d946ef",
];
const ratingBuckets = Array.from({ length: 11 }).map((_, i) => i * 0.5);
const makeRatingDist = (productId?: string) => {
  const rows = productId ? mockReviews.filter((r) => r.productId === productId) : mockReviews;
  const counts = new Map<number, number>();
  ratingBuckets.forEach((b) => counts.set(b, 0));
  rows.forEach((r) => counts.set(r.rating, (counts.get(r.rating) || 0) + 1));
  return ratingBuckets.map((b) => ({ name: b.toFixed(1), value: counts.get(b) || 0 }));
};
const calcAvgRating = (rows: ReviewRow[]) =>
  rows.length ? Math.round((rows.reduce((s, r) => s + r.rating, 0) / rows.length) * 10) / 10 : 0;
const calcFiveStarShare = (rows: ReviewRow[]) =>
  rows.length ? Math.round((rows.filter((r) => r.rating >= 5).length / rows.length) * 100) : 0;

// --------------------- 컴포넌트 ---------------------
const SellerMain: FC = () => {
  const { storeUrl = "" } = useParams<Params>();
  const navigate = useNavigate();

  // 1) 주문 상태: 카드로 가로 나열
  const orderCards = useMemo(
    () => [
      {
        key: "신규주문" as OrderSummaryKey,
        count: mockOrderSummary.find((r) => r.key === "신규주문")?.count ?? 0,
        icon: PackagePlus,
        badgeCls: "bg-emerald-100 text-emerald-700",
        hoverBg: "bg-emerald-50",
      },
      {
        key: "배송완료" as OrderSummaryKey,
        count: mockOrderSummary.find((r) => r.key === "배송완료")?.count ?? 0,
        icon: Truck,
        badgeCls: "bg-blue-100 text-blue-700",
         hoverBg: "bg-blue-50",      // ✅ 연한 파랑
      },
      {
        key: "취소요청" as OrderSummaryKey,
        count: mockOrderSummary.find((r) => r.key === "취소요청")?.count ?? 0,
        icon: XOctagon,
        badgeCls: "bg-rose-100 text-rose-700",
         hoverBg: "bg-rose-50",      // ✅ 연한 로즈
      },
      {
        key: "환불완료" as OrderSummaryKey,
        count: mockOrderSummary.find((r) => r.key === "환불완료")?.count ?? 0,
        icon: RotateCcw,
        badgeCls: "bg-amber-100 text-amber-700",
        hoverBg: "bg-amber-50",     // ✅ 연한 앰버
      },
    ],
    []
  );


// ====== 기존 "2) 매출 그래프 + 날짜 선택" 블록을 아래로 교체 ======

/** ISO 주차(YYYY-Www) 구하기 */
const getISOWeekId = (date: Date) => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7; // 1..7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
};

/** 주차 타임라인 더미 (최근 N주) */
const makeWeeklySalesTimeline = (weeks = 60) =>
  Array.from({ length: weeks }).map((_, idx) => {
    const base = new Date();
    base.setDate(base.getDate() - (weeks - 1 - idx) * 7);
    const weekId = getISOWeekId(base);
    const amount = 1_500_000 + Math.floor(Math.random() * 4_000_000);
    const orders = 40 + Math.floor(Math.random() * 120);
    return { key: weekId, weekId, amount, orders };
  });

/** 월 타임라인 더미 (최근 N개월) */
const makeMonthlySalesTimeline = (months = 18) =>
  Array.from({ length: months }).map((_, idx) => {
    const d = new Date();
    d.setMonth(d.getMonth() - (months - 1 - idx));
    const monthId = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const amount = 6_000_000 + Math.floor(Math.random() * 12_000_000);
    const orders = 200 + Math.floor(Math.random() * 600);
    return { key: monthId, monthId, amount, orders };
  });

/** 2) 매출 그래프 + 날짜/주/월 선택 */
const [salesMode, setSalesMode] = useState<"day" | "week" | "month">("day");

/* --- 일별: 날짜 범위 --- */
const [startDate, setStartDate] = useState<string>(() => {
  const d = new Date(); d.setDate(d.getDate() - 13); return d.toISOString().slice(0, 10);
});
const [endDate, setEndDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
const dailyRaw = useMemo(() => makeDailySales(120), []); // 넉넉히 만들어두고 범위로 필터
const dailyFiltered = useMemo(() => {
  const s = new Date(startDate); const e = new Date(endDate);
  if (isNaN(s.getTime()) || isNaN(e.getTime()) || s > e) return makeDailySales(14);
  const days = dailyRaw.filter((x) => x.date >= startDate && x.date <= endDate);
  if (days.length === 0) return makeDailySales(14);
  return days.map((d) => ({ key: d.date.slice(5, 10), amount: d.amount, orders: d.orders }));
}, [startDate, endDate, dailyRaw]);

/* --- 주별: week 범위 (YYYY-Www) --- */
const weeklyRaw = useMemo(() => makeWeeklySalesTimeline(60), []);
const [startWeek, setStartWeek] = useState<string>(() =>
  weeklyRaw[Math.max(0, weeklyRaw.length - 10)].weekId
);
const [endWeek, setEndWeek] = useState<string>(() => weeklyRaw[weeklyRaw.length - 1].weekId);
const weeklyFiltered = useMemo(() => {
  // 잘못된 범위면 최근 10주로
  if (startWeek > endWeek) {
    return weeklyRaw.slice(-10);
  }
  return weeklyRaw.filter(w => w.weekId >= startWeek && w.weekId <= endWeek);
}, [startWeek, endWeek, weeklyRaw]);

/* --- 월별: month 범위 (YYYY-MM) --- */
const monthlyRaw = useMemo(() => makeMonthlySalesTimeline(18), []);
const [startMonth, setStartMonth] = useState<string>(() =>
  monthlyRaw[Math.max(0, monthlyRaw.length - 6)].monthId
);
const [endMonth, setEndMonth] = useState<string>(() => monthlyRaw[monthlyRaw.length - 1].monthId);
const monthlyFiltered = useMemo(() => {
  if (startMonth > endMonth) {
    return monthlyRaw.slice(-6);
  }
  return monthlyRaw.filter(m => m.monthId >= startMonth && m.monthId <= endMonth);
}, [startMonth, endMonth, monthlyRaw]);

/* --- 차트에 바인딩할 데이터 --- */
const salesData = useMemo(() => {
  if (salesMode === "day") return dailyFiltered;
  if (salesMode === "week") return weeklyFiltered.map(w => ({ key: w.weekId, amount: w.amount, orders: w.orders }));
  return monthlyFiltered.map(m => ({ key: m.monthId, amount: m.amount, orders: m.orders }));
}, [salesMode, dailyFiltered, weeklyFiltered, monthlyFiltered]);


  // 3) 전체 클래스 예약 통계 (공용 컴포넌트 사용)
  const [classMode, setClassMode] = useState<ClassStatsMode>("hour");
  const [selectedWeek, setSelectedWeek] = useState<string>(() => {
    const today = new Date(); const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(today.setDate(diff));
    return monday.toISOString().slice(0, 10);
  });
  const classStats: ClassStatsDatum[] = useMemo(
    () => (classMode === "hour" ? make24HourStats() : makeWeekdayStats()),
    [classMode]
  );

  // 4) 리뷰 & 평점 통계
  const [selectedProductId, setSelectedProductId] = useState<string>("ALL");
  const ratingDist = useMemo(
    () => (selectedProductId === "ALL" ? makeRatingDist() : makeRatingDist(selectedProductId)),
    [selectedProductId]
  );
  const latestReviews = useMemo(() => mockReviews.slice(0, 5), []);
  const filteredForStats = useMemo(
    () => (selectedProductId === "ALL" ? mockReviews : mockReviews.filter(r => r.productId === selectedProductId)),
    [selectedProductId]
  );
  const avgRating = useMemo(() => calcAvgRating(filteredForStats), [filteredForStats]);
  const totalReviews = filteredForStats.length;
  const fiveShare = useMemo(() => calcFiveStarShare(filteredForStats), [filteredForStats]);

  // 네비게이션
  const goOrders = () => navigate(`/seller/${storeUrl}/product/order`);
  const goSettlement = () => navigate(`/seller/${storeUrl}/settlement`);
  const goClassReservation = () => navigate(`/seller/${storeUrl}/class/reservation`);
  const goReviews = () => navigate(`/seller/${storeUrl}/product/review`);

  return (
    <>
      <Header />
      <Mainnavbar />

      <SellerSidenavbar>
        <div className="space-y-8">
          {/* 1) 주문 처리 상태(최근 7일) - 카드 */}
            <section className="rounded-2xl border bg-white">
            <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b">
                <h2 className="text-base sm:text-lg font-semibold">주문 처리 상태</h2>
                <div className="text-xs sm:text-sm text-gray-500">(최근 7일)</div>
            </div>

            <div className="p-4 sm:p-6">
                <div className="flex gap-3 overflow-x-auto pb-1">
                {orderCards.map(({ key, count, icon: Icon, badgeCls, hoverBg }) => (
                    <button
                    key={key}
                    onClick={goOrders}
                    className="group relative overflow-hidden min-w-[180px] flex-1 rounded-xl border hover:shadow transition"
                    title="클릭하여 주문 관리로 이동"
                    >
                    {/* 🔵 호버 배경 레이어: 왼→오른쪽으로 width 확장 */}
                    <span
                        className={[
                        "absolute inset-0 w-0",          // 시작은 0
                        "group-hover:w-full",            // 호버 시 꽉 채움
                        hoverBg,                          // 상태별 연한 배경색
                        "transition-[width] duration-300 ease-out", // 부드러운 확장
                        ].join(" ")}
                        aria-hidden
                    />

                    {/* 실제 내용은 위로 올리기 */}
                    <div className="relative z-10 grid grid-cols-[auto_1fr_auto] items-center gap-3 px-4 py-3 text-left">
                        <div className="p-2 rounded-lg bg-gray-50">
                        <Icon className="w-6 h-6 text-gray-700" />
                        </div>
                        <div className="flex flex-col">
                        <span className={`inline-flex w-fit px-2 py-0.5 rounded-full text-[11px] ${badgeCls}`}>
                            {key}
                        </span>
                        <span className="text-xs text-gray-500 mt-1">상태 건수</span>
                        </div>
                        <div className="text-xl font-bold tabular-nums">{count}</div>
                    </div>
                    </button>
                ))}
                </div>
            </div>
            </section>


          {/* 2) 매출 그래프 + 캘린더 */}
<section className="rounded-2xl border bg-white">
  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 px-4 sm:px-6 py-4 border-b">
    <h2 className="text-base sm:text-lg font-semibold">매출 그래프</h2>
    <div className="flex items-center gap-4">
      {/* 일별: 날짜 범위 */}
      {salesMode === "day" && (
        <>
          <div className="flex items-center gap-2">
            <label className="text-xs sm:text-sm text-gray-600">시작일</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="border rounded-md px-3 py-1.5 text-xs sm:text-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs sm:text-sm text-gray-600">종료일</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="border rounded-md px-3 py-1.5 text-xs sm:text-sm"
            />
          </div>
        </>
      )}

      {/* 주별: week 범위 */}
      {salesMode === "week" && (
        <>
          <div className="flex items-center gap-2">
            <label className="text-xs sm:text-sm text-gray-600">시작 주</label>
            <input
              type="week"
              value={startWeek}
              onChange={(e) => setStartWeek(e.target.value)}
              min={weeklyRaw?.[0]?.weekId}
              max={weeklyRaw?.[weeklyRaw.length - 1]?.weekId}
              className="border rounded-md px-3 py-1.5 text-xs sm:text-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs sm:text-sm text-gray-600">종료 주</label>
            <input
              type="week"
              value={endWeek}
              onChange={(e) => setEndWeek(e.target.value)}
              min={weeklyRaw?.[0]?.weekId}
              max={weeklyRaw?.[weeklyRaw.length - 1]?.weekId}
              className="border rounded-md px-3 py-1.5 text-xs sm:text-sm"
            />
          </div>
        </>
      )}

      {/* 월별: month 범위 */}
      {salesMode === "month" && (
        <>
          <div className="flex items-center gap-2">
            <label className="text-xs sm:text-sm text-gray-600">시작 월</label>
            <input
              type="month"
              value={startMonth}
              onChange={(e) => setStartMonth(e.target.value)}
              min={monthlyRaw?.[0]?.monthId}
              max={monthlyRaw?.[monthlyRaw.length - 1]?.monthId}
              className="border rounded-md px-3 py-1.5 text-xs sm:text-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs sm:text-sm text-gray-600">종료 월</label>
            <input
              type="month"
              value={endMonth}
              onChange={(e) => setEndMonth(e.target.value)}
              min={monthlyRaw?.[0]?.monthId}
              max={monthlyRaw?.[monthlyRaw.length - 1]?.monthId}
              className="border rounded-md px-3 py-1.5 text-xs sm:text-sm"
            />
          </div>
        </>
      )}

      {/* 모드 토글 */}
      <div className="bg-gray-100 rounded-md p-1 inline-flex">
        <button
          type="button"
          onClick={() => setSalesMode("day")}
          className={[
            "px-3 py-1.5 rounded text-xs sm:text-sm",
            salesMode === "day" ? "bg-white shadow" : "text-gray-600",
          ].join(" ")}
        >
          일별
        </button>
        <button
          type="button"
          onClick={() => setSalesMode("week")}
          className={[
            "px-3 py-1.5 rounded text-xs sm:text-sm",
            salesMode === "week" ? "bg-white shadow" : "text-gray-600",
          ].join(" ")}
        >
          주별
        </button>
        <button
          type="button"
          onClick={() => setSalesMode("month")}
          className={[
            "px-3 py-1.5 rounded text-xs sm:text-sm",
            salesMode === "month" ? "bg-white shadow" : "text-gray-600",
          ].join(" ")}
        >
          월별
        </button>
      </div>
    </div>
  </div>

  <button
    type="button"
    onClick={goSettlement}
    className="block w-full text-left"
    title="클릭하여 정산 관리로 이동"
  >
    <div className="p-3 sm:p-6 h-[280px] sm:h-[360px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={salesData} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="key" tick={{ fontSize: 12 }} />
          <YAxis
            yAxisId="amount"
            orientation="right"
            tickFormatter={(v) => KRW.format(v)}
          />
          <Tooltip
            formatter={(v: number, name) =>
              name === "매출액" ? [fmtKRW(v), name] : [`${v} 건`, name]
            }
          />
          <Legend />
          <Line
            yAxisId="amount"
            type="monotone"
            dataKey="amount"
            name="매출액"
            stroke={BRAND}
            strokeWidth={2}
            dot={false}
          />
          <Line
            yAxisId="amount"
            type="monotone"
            dataKey="orders"
            name="주문수"
            stroke="#8884d8"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  </button>
</section>


          {/* 3) 전체 클래스 예약 통계 (공용 컴포넌트 사용) */}
          <ClassStatsCard
            title="전체 클래스 예약 통계"
            mode={classMode}
            onModeChange={setClassMode}
            weekValue={selectedWeek}
            onWeekChange={setSelectedWeek}
            data={classStats}
            onClick={goClassReservation}
            brandColor={BRAND}
            showWeekInputWhen="weekday"
          />

          {/* 4) 새로 들어온 리뷰 + 평점 통계 */}
          <section className="rounded-2xl border bg-white">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 px-4 sm:px-6 py-4 border-b">
              <h2 className="text-base sm:text-lg font-semibold">새로 들어온 리뷰</h2>
              <div className="flex items-center gap-2">
                <label className="text-xs sm:text-sm text-gray-600">상품 선택</label>
                <select
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="border rounded-md px-3 py-1.5 text-xs sm:text-sm"
                >
                  <option value="ALL">전체</option>
                  {mockProducts.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* 평점 요약 카드 */}
            <div className="px-4 sm:px-6 py-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-xl border p-4">
                <div className="text-xs text-gray-500">평균 평점</div>
                <div className="text-2xl font-bold mt-1">{avgRating.toFixed(1)}</div>
              </div>
              <div className="rounded-xl border p-4">
                <div className="text-xs text-gray-500">리뷰 수</div>
                <div className="text-2xl font-bold mt-1">{totalReviews}</div>
              </div>
              <div className="rounded-xl border p-4">
                <div className="text-xs text-gray-500">5점 비중</div>
                <div className="text-2xl font-bold mt-1">{fiveShare}%</div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 p-4 sm:p-6">
              {/* 평점 분포(원형 그래프) */}
              <button
                type="button"
                onClick={goReviews}
                className="lg:col-span-2 rounded-xl border hover:bg-gray-50 text-left"
                title="클릭하여 리뷰 관리로 이동"
              >
                <div className="p-3 sm:p-4 h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Tooltip formatter={(v: number, name) => [`${v} 건`, `${name} 점`]} />
                      <Legend />
                      <Pie
                        data={ratingDist}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius="80%"
                        label
                      >
                        {ratingDist.map((_, idx) => (
                          <Cell key={`cell-${idx}`} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </button>

              {/* 최근 리뷰 테이블 */}
              <div className="lg:col-span-3">
                <div className="overflow-x-auto rounded-xl border">
                  <table className="w-full min-w-[640px] text-sm">
                    <thead className="bg-gray-50 text-gray-600">
                      <tr>
                        <th className="px-3 py-3 text-left">작성일</th>
                        <th className="px-3 py-3 text-left">상품명</th>
                        <th className="px-3 py-3 text-left">내용</th>
                        <th className="px-3 py-3 text-left">평점</th>
                        <th className="px-3 py-3 text-left">작성자</th>
                      </tr>
                    </thead>
                    <tbody>
                      {latestReviews.map((rv) => (
                        <tr
                          key={rv.id}
                          onClick={goReviews}
                          className="border-t border-gray-100 hover:bg-gray-50 cursor-pointer"
                          title="클릭하여 리뷰 관리로 이동"
                        >
                          <td className="px-3 py-3">{rv.createdAt}</td>
                          <td className="px-3 py-3">{rv.productName}</td>
                          <td className="px-3 py-3">{rv.title}</td>
                          <td className="px-3 py-3">{rv.rating.toFixed(1)}</td>
                          <td className="px-3 py-3">{rv.author}</td>
                        </tr>
                      ))}
                      {latestReviews.length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-3 py-6 text-center text-gray-500">
                            최근 리뷰가 없습니다.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <div className="mt-3 text-right">
                  <button
                    onClick={goReviews}
                    className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 underline underline-offset-4"
                  >
                    리뷰 관리로 이동
                  </button>
                </div>
              </div>
            </div>
          </section>
        </div>
      </SellerSidenavbar>
    </>
  );
};

export default SellerMain;
