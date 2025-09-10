import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Header from '@src/shared/areas/layout/features/header/Header';
import Mainnavbar from '@src/shared/areas/navigation/features/navbar/main/Mainnavbar';
import SellerSidenavbar from '@src/shared/areas/navigation/features/sidenavbar/seller/SellerSidenavbar';
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
} from 'recharts';
import { PackagePlus, Truck, XOctagon, RotateCcw } from 'lucide-react';
import ClassStatsCard, {
  type ClassStatsMode,
  type ClassStatsDatum,
} from '@src/shared/components/analytics/ClassStatsCard';
import { get } from '@src/libs/request';
import React from 'react';

export default function SellerMain() {
  // --------------------- 유틸/상수 ---------------------
  type Params = { storeUrl: string };
  interface SalesItem {
    ymd: string; // "2025-09-01"
    amt: number; // 매출액
  }

  const BRAND = '#2D4739';
  const KRW = new Intl.NumberFormat('ko-KR');
  const fmtKRW = (v: number) => `₩ ${KRW.format(v)}`;

  // 로컬 기준 YYYY-MM-DD 생성
  const ymdLocal = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  /** ISO 주차(YYYY-Www) 구하기 */
  const getISOWeekId = (date: Date) => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7; // 1..7
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
    return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
  };

  const enumerateDays = (from: string, to: string) => {
    const res: string[] = [];
    const s = new Date(from + 'T00:00:00');
    const e = new Date(to + 'T00:00:00');
    if (isNaN(s.getTime()) || isNaN(e.getTime())) return res;
    for (const d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
      res.push(ymdLocal(d));
    }
    return res;
  };

  // --------------------- 더미(리뷰용) 등 기존 그대로 ---------------------
  const [responseData, setResponseData] = useState<any>(null);
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
    { id: 'P-1001', name: '도자기 머그컵' },
    { id: 'P-1002', name: '라탄 트레이' },
    { id: 'P-1003', name: '캔들 세트' },
  ];
  const mockReviews: ReviewRow[] = [
    {
      id: 'RV-1',
      productId: 'P-1001',
      productName: '도자기 머그컵',
      rating: 4.5,
      title: '색감 예뻐요',
      content: '유약 색이 사진보다 더 고급집니다!',
      createdAt: '2025-09-02',
      author: '김**',
    },
    {
      id: 'RV-2',
      productId: 'P-1002',
      productName: '라탄 트레이',
      rating: 4.0,
      title: '탄탄해요',
      content: '마감이 깔끔하고 사이즈도 적당합니다.',
      createdAt: '2025-09-01',
      author: '박**',
    },
    {
      id: 'RV-3',
      productId: 'P-1003',
      productName: '캔들 세트',
      rating: 5.0,
      title: '향이 좋아요',
      content: '은은해서 거슬리지 않네요.',
      createdAt: '2025-08-30',
      author: '이**',
    },
    {
      id: 'RV-4',
      productId: 'P-1001',
      productName: '도자기 머그컵',
      rating: 3.5,
      title: '괜찮습니다',
      content: '그립감이 좋아요.',
      createdAt: '2025-08-28',
      author: '최**',
    },
  ];
  const PIE_COLORS = [
    '#ef4444',
    '#f97316',
    '#f59e0b',
    '#eab308',
    '#84cc16',
    '#22c55e',
    '#10b981',
    '#06b6d4',
    '#3b82f6',
    '#8b5cf6',
    '#d946ef',
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

  const navigate = useNavigate();
  const storeUrl = useParams<Params>().storeUrl;

  // 1) 주문 상태: 카드로 가로 나열 
  const orderCards = useMemo(() => {
    const data = responseData || { newOrders: 0, delivered: 0, cancelRequests: 0, refunds: 0 };
    return [
      {
        key: '신규주문',
        count: data.newOrders,
        icon: PackagePlus,
        badgeCls: 'bg-emerald-100 text-emerald-700',
        hoverBg: 'bg-emerald-50',
      },
      {
        key: '배송완료',
        count: data.delivered,
        icon: Truck,
        badgeCls: 'bg-blue-100 text-blue-700',
        hoverBg: 'bg-blue-50',
      },
      {
        key: '취소요청',
        count: data.cancelRequests,
        icon: XOctagon,
        badgeCls: 'bg-rose-100 text-rose-700',
        hoverBg: 'bg-rose-50',
      },
      {
        key: '환불완료',
        count: data.refunds,
        icon: RotateCcw,
        badgeCls: 'bg-amber-100 text-amber-700',
        hoverBg: 'bg-amber-50',
      },
    ];
  }, [responseData]);

  // 주문 상태 API 
  useEffect(() => {
    if (!storeUrl) return;
    const fetchOrderSummary = async () => {
      try {
        const response = await get(`/seller/${storeUrl}/main/status`);
        if (response.status === 200) {
          setResponseData(response.data);
        } else {
          console.error('주문 처리 상태 조회 실패:', response.message);
        }
      } catch (error: any) {
        console.error('API 요청 실패:', error);
      }
    };
    fetchOrderSummary();
  }, [storeUrl]);

  // ====== 2) 매출 그래프: 시작/종료일 기준으로 일/주/월 모두 필터 & 집계 ======
  const [salesMode, setSalesMode] = useState<'day' | 'week' | 'month'>('day');

  // 날짜 범위 상태 
  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 13);
    return ymdLocal(d);
  });
  const [endDate, setEndDate] = useState<string>(() => ymdLocal(new Date()));

  // 매출 API 호출
  const [classSales, setClassSales] = useState<SalesItem[]>([]);
  const [productSales, setProductSales] = useState<SalesItem[]>([]);
  useEffect(() => {
    if (!storeUrl) return;
    const fetchSales = async () => {
      try {
        const [classRes, productRes] = await Promise.all([
          get(`/seller/sales/${storeUrl}/classes`),                 // 부트(클래스)
          get(`/seller/settlements/products/${storeUrl}/sales`),    // 레거시(상품)
        ]);
        if (classRes.status === 200) setClassSales(classRes.data ?? []);
        if (productRes.status === 200) setProductSales(productRes.data ?? []);
      } catch (error: any) {
        console.error('매출 데이터 조회 실패:', error);
      }
    };
    fetchSales();
  }, [storeUrl]);

  // 날짜별 합산 맵(amt 합계 + cnt=row 개수)
  const dailyAggMap = useMemo(() => {
    type Agg = { amt: number; cnt: number };
    const map = new Map<string, Agg>();
    const add = (row: SalesItem) => {
      const prev = map.get(row.ymd) ?? { amt: 0, cnt: 0 };
      prev.amt += row.amt;
      prev.cnt += 1;
      map.set(row.ymd, prev);
    };
    classSales.forEach(add);
    productSales.forEach(add);
    return map;
  }, [classSales, productSales]);

  // 일별 데이터: 시작/종료일 범위에 맞춰 "빈 날 0값" 포함해 생성
  const dailyData = useMemo(() => {
    const days = enumerateDays(startDate, endDate);
    // 범위가 이상하면 최근 14일
    const safeDays = days.length ? days : enumerateDays(ymdLocal(new Date(Date.now() - 13 * 86400000)), ymdLocal(new Date()));
    return safeDays.map((ymd) => {
      const agg = dailyAggMap.get(ymd);
      return {
        key: ymd.slice(5, 10),     // MM-DD
        amount: agg?.amt ?? 0,
        orders: agg?.cnt ?? 0,
        date: ymd,
      };
    });
  }, [startDate, endDate, dailyAggMap]);

  // 주별 데이터: 위 일자 배열 기준으로 동일 범위 집계
  const weeklyData = useMemo(() => {
    const weekAmt = new Map<string, number>();
    const weekCnt = new Map<string, number>();
    dailyData.forEach((d) => {
      // date는 YYYY-MM-DD
      const weekId = getISOWeekId(new Date(d.date));
      weekAmt.set(weekId, (weekAmt.get(weekId) ?? 0) + d.amount);
      weekCnt.set(weekId, (weekCnt.get(weekId) ?? 0) + d.orders);
    });
    return Array.from(weekAmt.keys())
      .sort((a, b) => a.localeCompare(b))
      .map((weekId) => ({
        key: weekId,
        amount: weekAmt.get(weekId) ?? 0,
        orders: weekCnt.get(weekId) ?? 0,
      }));
  }, [dailyData]);

  // 월별 데이터: 위 일자 배열 기준으로 동일 범위 집계
  const monthlyData = useMemo(() => {
    const monthAmt = new Map<string, number>();
    const monthCnt = new Map<string, number>();
    dailyData.forEach((d) => {
      const monthId = d.date.slice(0, 7); // YYYY-MM
      monthAmt.set(monthId, (monthAmt.get(monthId) ?? 0) + d.amount);
      monthCnt.set(monthId, (monthCnt.get(monthId) ?? 0) + d.orders);
    });
    return Array.from(monthAmt.keys())
      .sort((a, b) => a.localeCompare(b))
      .map((monthId) => ({
        key: monthId,
        amount: monthAmt.get(monthId) ?? 0,
        orders: monthCnt.get(monthId) ?? 0,
      }));
  }, [dailyData]);

  // 차트에 바인딩할 데이터
  const salesData = useMemo(() => {
    if (salesMode === 'day') return dailyData;
    if (salesMode === 'week') return weeklyData;
    return monthlyData;
  }, [salesMode, dailyData, weeklyData, monthlyData]);

  // 3) 전체 클래스 예약 통계 (공용 컴포넌트 사용) 
  const [classMode, setClassMode] = useState<ClassStatsMode>('hour');
  const [classStatsData, setClassStatsData] = useState<ClassStatsDatum[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  useEffect(() => {
    if (!storeUrl) return;

    const fetchClassStats = async () => {
      try {
        const groupBy = classMode === 'hour' ? 'time' : 'weekday';
        const month = Number(selectedMonth.split('-')[1]); // month를 1~12 숫자로

        const params = new URLSearchParams({
          scope: 'store',
          groupBy,
          month: month.toString(),
        });

        if (classMode !== 'hour') {
          const [yearStr, monthStr] = selectedMonth.split('-');
          const year = Number(yearStr);
          const month = Number(monthStr) - 1;
          const start = new Date(year, month, 1);
          const end = new Date(year, month + 1, 0);
          params.append('rangeStart', start.toISOString());
          params.append('rangeEnd', end.toISOString());
        }

        interface ClassStatsItem {
          bucket: number;
          label: string;
          count: number;
        }

        interface ClassStatsResponse {
          items: ClassStatsItem[];
        }

        const response = await get(`/seller/${storeUrl}/classes/reservation/stats?${params}`);

        if (response.status === 200) {
          const responseData = response.data as ClassStatsResponse;
          const transformedData: ClassStatsDatum[] = responseData.items.map((item: any) => ({
            key: item.label,
            count: item.count,
            revenue: item.count * 50000, // 가격 임시값
          }));
          console.log('API 응답', responseData);
          setClassStatsData(transformedData);
        } else {
          console.error('전체 클래스 예약 통계 조회 실패:', response.message);
        }
      } catch (error: any) {
        console.error('API 요청 실패:', error);
      }
    };

    fetchClassStats();
  }, [storeUrl, classMode, selectedMonth]);

  const classStats: ClassStatsDatum[] = useMemo(() => {
    if (classStatsData.length > 0) {
      return classStatsData;
    }

    if (classMode === 'hour') {
      return Array.from({ length: 24 }).map((_, i) => ({
        key: `${String(i).padStart(2, '0')}:00`,
        count: 0,
        revenue: 0,
      }));
    } else {
      const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
      return days.map((key) => ({
        key,
        count: 0,
        revenue: 0,
      }));
    }
  }, [classStatsData, classMode]);

  // 4) 리뷰 & 평점 통계
  const [selectedProductId, setSelectedProductId] = useState<string>('ALL');
  const ratingDist = useMemo(
    () => (selectedProductId === 'ALL' ? makeRatingDist() : makeRatingDist(selectedProductId)),
    [selectedProductId]
  );
  const latestReviews = useMemo(() => mockReviews.slice(0, 5), []);
  const filteredForStats = useMemo(
    () =>
      selectedProductId === 'ALL'
        ? mockReviews
        : mockReviews.filter((r) => r.productId === selectedProductId),
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
                    {/* 🔵 호버 배경 레이어 */}
                    <span
                      className={[
                        'absolute inset-0 w-0',
                        'group-hover:w-full',
                        hoverBg,
                        'transition-[width] duration-300 ease-out',
                      ].join(' ')}
                      aria-hidden
                    />

                    <div className="relative z-10 grid grid-cols-[auto_1fr_auto] items-center gap-3 px-4 py-3 text-left">
                      <div className="p-2 rounded-lg bg-gray-50">
                        <Icon className="w-6 h-6 text-gray-700" />
                      </div>
                      <div className="flex flex-col">
                        <span className={`inline-flex w-fit px-2 py-0.5 rounded-full text-[11px] ${badgeCls}`}>{key}</span>
                        <span className="text-xs text-gray-500 mt-1">상태 건수</span>
                      </div>
                      <div className="text-xl font-bold tabular-nums">{count}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* 2) 매출 그래프 */}
          <section className="rounded-2xl border bg-white">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 px-4 sm:px-6 py-4 border-b">
              <h2 className="text-base sm:text-lg font-semibold">매출 그래프</h2>
              <div className="flex items-center gap-4">
                {/* 시작/종료일은 모든 모드 공통으로 사용 */}
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

                {/* 모드 토글 */}
                <div className="bg-gray-100 rounded-md p-1 inline-flex">
                  <button
                    type="button"
                    onClick={() => setSalesMode('day')}
                    className={['px-3 py-1.5 rounded text-xs sm:text-sm', salesMode === 'day' ? 'bg-white shadow' : 'text-gray-600'].join(' ')}
                  >
                    일별
                  </button>
                  <button
                    type="button"
                    onClick={() => setSalesMode('week')}
                    className={['px-3 py-1.5 rounded text-xs sm:text-sm', salesMode === 'week' ? 'bg-white shadow' : 'text-gray-600'].join(' ')}
                  >
                    주별
                  </button>
                  <button
                    type="button"
                    onClick={() => setSalesMode('month')}
                    className={['px-3 py-1.5 rounded text-xs sm:text-sm', salesMode === 'month' ? 'bg-white shadow' : 'text-gray-600'].join(' ')}
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
                    {/* 우측: 매출액 축 */}
                    <YAxis yAxisId="amount" orientation="right" tickFormatter={(v) => KRW.format(v)} />
                    {/* 좌측: 주문수 축 */}
                    <YAxis yAxisId="orders" orientation="left" width={48} />
                    <Tooltip
                      formatter={(v: number, name) => (name === '매출액' ? [fmtKRW(v), name] : [`${v} 건`, name])}
                    />
                    <Legend />
                    <Line yAxisId="amount" type="monotone" dataKey="amount" name="매출액" stroke={BRAND} strokeWidth={2} dot={false} />
                    <Line yAxisId="orders" type="monotone" dataKey="orders" name="주문수" stroke="#8884d8" strokeWidth={2} dot={false} />
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
            monthValue={selectedMonth} // 기존 selectedWeek → selectedMonth
            onMonthChange={setSelectedMonth} // 기존 setSelectedWeek → setSelectedMonth
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
}
