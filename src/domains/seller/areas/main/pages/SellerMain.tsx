import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Header from '@src/shared/areas/layout/features/header/Header';
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
import { get, legacyGet } from '@src/libs/request';

/** ===== 타입 ===== */
type Params = { storeUrl: string };

// 매출 그래프
interface SalesItem {
  ymd: string; // "YYYY-MM-DD"
  amt: number; // 매출액
}

// 리뷰 통계
type ReviewStatsBucket = {
  rating: number; // 0, 0.5, 1, ... 5
  count: number; // 건수
  percentage: number; // 비율(0~100)
};
type ReviewStatsPayload = {
  totalReviews: number;
  buckets: ReviewStatsBucket[];
};

// 리뷰 테이블 행 (서버가 다양한 키를 줄 수 있으니 인덱스 시그니처 포함)
type ReviewRow = {
  reviewId: number;
  reviewCreatedAt: string; // ISO
  productThumbnailUrl: string | null;
  productName: string;
  authorId: number;
  authorName: string;
  productId: number;
  content: string;
  productCreatedAt: string | null;

  // 가능하면 서버가 주는 개별 평점 숫자(0~5)
  rating?: number;

  // 레거시 문자열 평점도 올 수 있음 ("3.5/5.0", "4/5", "4.0")
  productRating?: string;

  likeCount: number;
  reviewUpdatedAt: string;

  // 그 외 혹시 모를 필드들
  [key: string]: unknown;
};

// 드롭다운 상품 옵션
type ProductOption = { productId: number; productName: string };

export default function SellerMain() {
  /** ================= 공통 유틸 ================= */
  const BRAND = '#2D4739';
  const KRW = new Intl.NumberFormat('ko-KR');
  const fmtKRW = (v: number) => `₩ ${KRW.format(v)}`;

  const ymdLocal = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

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

  /** ================= 라우팅/상태 ================= */
  const navigate = useNavigate();
  const storeUrl = useParams<Params>().storeUrl;

  // 주문 상태(카드)
  const [orderSummary, setOrderSummary] = useState<any>(null);

  // 매출 그래프
  const [salesMode, setSalesMode] = useState<'day' | 'week' | 'month'>('day');
  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 13);
    return ymdLocal(d);
  });
  const [endDate, setEndDate] = useState<string>(() => ymdLocal(new Date()));
  const [classSales, setClassSales] = useState<SalesItem[]>([]);
  const [productSales, setProductSales] = useState<SalesItem[]>([]);

  // 클래스 통계 카드
  const [classMode, setClassMode] = useState<ClassStatsMode>('hour');
  const [classStatsData, setClassStatsData] = useState<ClassStatsDatum[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  // ====== 리뷰/상품 섹션 ======
  const [selectedProductId, setSelectedProductId] = useState<string>('ALL');
  const [reviewBuckets, setReviewBuckets] = useState<ReviewStatsBucket[] | null>(null);
  const [reviewTotalApi, setReviewTotalApi] = useState<number | null>(null);
  const [reviews, setReviews] = useState<ReviewRow[]>([]);

  /** ================= API: 주문 상태 ================= */
  useEffect(() => {
    if (!storeUrl) return;
    (async () => {
      try {
        const response = await get(`/seller/${storeUrl}/main/status`);
        if (response.status === 200) setOrderSummary(response.data);
        else console.error('주문 처리 상태 조회 실패:', response.message);
      } catch (error) {
        console.error('API 요청 실패(주문 상태):', error);
      }
    })();
  }, [storeUrl]);

  const orderCards = useMemo(() => {
    const data = orderSummary || { newOrders: 0, delivered: 0, cancelRequests: 0, refunds: 0 };
    return [
      {
        key: '신규주문',
        count: data.orderOkCount,
        icon: PackagePlus,
        badgeCls: 'bg-emerald-100 text-emerald-700',
        hoverBg: 'bg-emerald-50',
      },
      {
        key: '배송완료',
        count: data.deliveredCount,
        icon: Truck,
        badgeCls: 'bg-blue-100 text-blue-700',
        hoverBg: 'bg-blue-50',
      },
      {
        key: '취소요청',
        count: data.cancelRqCount,
        icon: XOctagon,
        badgeCls: 'bg-rose-100 text-rose-700',
        hoverBg: 'bg-rose-50',
      },
      {
        key: '환불완료',
        count: data.refundOkCount,
        icon: RotateCcw,
        badgeCls: 'bg-amber-100 text-amber-700',
        hoverBg: 'bg-amber-50',
      },
    ];
  }, [orderSummary]);

  /** ================= API: 매출 그래프 ================= */
  useEffect(() => {
    if (!storeUrl) return;
    (async () => {
      try {
        const [classRes, productResRaw] = await Promise.all([
          get(`/seller/sales/${storeUrl}/classes`),
          legacyGet(`/seller/settlements/products/${storeUrl}/sales`),
        ]);
        const productRes = productResRaw as { status: number; data?: unknown };
        if (classRes.status === 200)
          setClassSales(Array.isArray(classRes.data) ? classRes.data : []);
        if (productRes.status === 200)
          setProductSales(Array.isArray(productRes.data) ? productRes.data : []);
      } catch (error) {
        console.error('매출 데이터 조회 실패:', error);
      }
    })();
  }, [storeUrl]);

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

  const dailyData = useMemo(() => {
    const days = enumerateDays(startDate, endDate);
    const safeDays = days.length
      ? days
      : enumerateDays(ymdLocal(new Date(Date.now() - 13 * 86400000)), ymdLocal(new Date()));
    return safeDays.map((ymd) => {
      const agg = dailyAggMap.get(ymd);
      return { key: ymd.slice(5, 10), amount: agg?.amt ?? 0, orders: agg?.cnt ?? 0, date: ymd };
    });
  }, [startDate, endDate, dailyAggMap]);

  const weeklyData = useMemo(() => {
    const weekAmt = new Map<string, number>();
    const weekCnt = new Map<string, number>();
    dailyData.forEach((d) => {
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

  const monthlyData = useMemo(() => {
    const monthAmt = new Map<string, number>();
    const monthCnt = new Map<string, number>();
    dailyData.forEach((d) => {
      const monthId = d.date.slice(0, 7);
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

  const salesData = useMemo(() => {
    if (salesMode === 'day') return dailyData;
    if (salesMode === 'week') return weeklyData;
    return monthlyData;
  }, [salesMode, dailyData, weeklyData, monthlyData]);

  /** ================= API: 클래스 통계 카드 ================= */
  const fetchClassStats = async (mode: 'hour' | 'weekday') => {
    const monthNum = Number(selectedMonth.split('-')[1]);
    const params = new URLSearchParams({
      scope: 'store',
      groupBy: mode === 'hour' ? 'time' : 'weekday',
      month: String(monthNum),
    });

    const [yearStr, monthStr] = selectedMonth.split('-');
    const year = Number(yearStr);
    const month = Number(monthStr) - 1;
    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 0);
    params.append('rangeStart', start.toISOString());
    params.append('rangeEnd', end.toISOString());

    interface ClassStatsItem {
      bucket: number;
      label: string;
      count: number;
      price: number;
    }
    interface ClassStatsResponse {
      items: ClassStatsItem[];
    }
    try {
      const response = await get(`/seller/${storeUrl}/classes/reservation/stats?${params}`);
      if (response.status === 200) {
        const data = response.data as ClassStatsResponse;

        if (mode === 'hour') {
          return Array.from({ length: 24 }).map((_, h) => {
            const item = data.items.find((it) => it.bucket === h);
            const count = item?.count ?? 0;
            const price = item?.price ?? 0;
            return { key: `${String(h).padStart(2, '0')}:00`, count, revenue: count * price };
          });
        } else {
          const dayLabels = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
          return dayLabels.map((label, idx) => {
            const item = data.items.find((it) => it.bucket === idx + 1);
            const count = item?.count ?? 0;
            const price = item?.price ?? 0;
            return { key: label, count, revenue: count * price };
          });
        }
      } else {
        console.error('클래스 예약 통계 조회 실패:', response.message);
      }
    } catch (error) {
      console.error('API 호출 실패', error);
    }
  };

  useEffect(() => {
    if (!storeUrl) return;

    fetchClassStats(classMode)
      .then((data) => setClassStatsData(data ?? []))
      .catch((err) => console.error('클래스 통계 조회 실패:', err));
  }, [storeUrl, classMode, selectedMonth]);

  const classStats: ClassStatsDatum[] = useMemo(() => {
    if (classStatsData.length > 0) return classStatsData;
    if (classMode === 'hour') {
      return Array.from({ length: 24 }).map((_, i) => ({
        key: `${String(i).padStart(2, '0')}:00`,
        count: 0,
        revenue: 0,
      }));
    }
    const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    return days.map((key) => ({ key, count: 0, revenue: 0 }));
  }, [classStatsData, classMode]);

  /** ================= API: 리뷰 테이블 + 드롭다운용 상품 ================= */
  useEffect(() => {
    if (!storeUrl) return;
    (async () => {
      try {
        const res = await get<ReviewRow[]>(`/seller/${storeUrl}/review`);
        if (res.status === 200 && Array.isArray(res.data)) {
          setReviews(res.data);
        } else {
          console.error('리뷰 목록 조회 실패:', res.message);
          setReviews([]);
        }
      } catch (e) {
        console.error('리뷰 목록 API 오류:', e);
        setReviews([]);
      }
    })();
  }, [storeUrl]);

  const productOptions: ProductOption[] = useMemo(() => {
    const map = new Map<number, string>();
    for (const r of reviews) {
      if (r.productId && r.productName) {
        if (!map.has(r.productId)) map.set(r.productId, r.productName);
      }
    }
    return Array.from(map.entries())
      .map(([productId, productName]) => ({ productId, productName }))
      .sort((a, b) => a.productName.localeCompare(b.productName, 'ko'));
  }, [reviews]);

  useEffect(() => {
    if (selectedProductId === 'ALL') return;
    const exists = productOptions.some((p) => String(p.productId) === selectedProductId);
    if (!exists) setSelectedProductId('ALL');
  }, [productOptions]); // eslint-disable-line react-hooks/exhaustive-deps

  /** ================= API: 리뷰 통계(전체/상품별) ================= */
  const fetchReviewStats = async (productId?: string) => {
    try {
      const url =
        productId && productId !== 'ALL'
          ? `/seller/${storeUrl}/reviews/stats/${productId}`
          : `/seller/${storeUrl}/reviews/stats`;
      const res = await get<ReviewStatsPayload>(url);
      if (res.status === 200 && res.data) {
        setReviewTotalApi(res.data.totalReviews ?? 0);
        setReviewBuckets(res.data.buckets ?? []);
      } else {
        setReviewTotalApi(0);
        setReviewBuckets([]);
        console.error('리뷰 통계 조회 실패:', res.message);
      }
    } catch (e) {
      console.error('리뷰 통계 API 오류:', e);
      setReviewTotalApi(0);
      setReviewBuckets([]);
    }
  };

  useEffect(() => {
    if (!storeUrl) return;
    fetchReviewStats();
  }, [storeUrl]);

  useEffect(() => {
    if (!storeUrl) return;
    fetchReviewStats(selectedProductId);
  }, [selectedProductId]); // eslint-disable-line react-hooks/exhaustive-deps

  const filteredReviews = useMemo(() => {
    if (selectedProductId === 'ALL') return reviews;
    const pid = Number(selectedProductId);
    return reviews.filter((r) => Number(r.productId) === pid);
  }, [reviews, selectedProductId]);

  const ratingDist = useMemo(() => {
    return (reviewBuckets ?? []).map((b) => ({ name: b.rating.toFixed(1), value: b.count }));
  }, [reviewBuckets]);

  const avgRating = useMemo(() => {
    if (reviewBuckets && reviewTotalApi && reviewTotalApi > 0) {
      const sum = reviewBuckets.reduce((s, b) => s + b.rating * b.count, 0);
      return Math.round((sum / reviewTotalApi) * 10) / 10;
    }
    return 0;
  }, [reviewBuckets, reviewTotalApi]);

  const totalReviews = reviewTotalApi ?? 0;

  const fiveShare = useMemo(() => {
    if (reviewBuckets && reviewTotalApi && reviewTotalApi > 0) {
      const b5 = reviewBuckets.find((b) => b.rating === 5);
      return b5 ? Math.round(b5.percentage) : 0;
    }
    return 0;
  }, [reviewBuckets, reviewTotalApi]);

  /** ===== 평점 파싱/탐색 강化 (여기가 핵심 수정) ===== */
  const parseRatingString = (val: string): number | null => {
    if (!val) return null;
    // "3.5/5" 또는 "3.5/5.0"
    let m = val.match(/^\s*([0-5](?:\.\d+)?)\s*\/\s*5(?:\.0)?\s*$/);
    if (m) {
      const n = Number(m[1]);
      if (!Number.isNaN(n)) return n;
    }
    // "3.5" 혹은 "4"
    m = val.match(/^\s*([0-5](?:\.\d+)?)\s*$/);
    if (m) {
      const n = Number(m[1]);
      if (!Number.isNaN(n)) return n;
    }
    return null;
  };

  const coerceToNumberRating = (v: unknown): number | null => {
    if (typeof v === 'number') {
      if (v >= 0 && v <= 5) return v;
      return null;
    }
    if (typeof v === 'string') return parseRatingString(v);
    return null;
  };

  const getRowRating = (rv: ReviewRow): number => {
    // 1) 대표 필드 우선
    const direct = coerceToNumberRating(rv.rating);
    if (direct !== null) return Math.round(direct * 2) / 2;

    // 2) 레거시 문자열(productRating)
    const legacy = coerceToNumberRating(rv.productRating);
    if (legacy !== null) return Math.round(legacy * 2) / 2;

    // 3) 그 외 이름으로 올 수 있는 후보들 전수 검사
    const candidateKeys = [
      'reviewRating',
      'ratingScore',
      'rating_value',
      'ratingValue',
      'score',
      'stars',
      'star',
      'rate',
      'reviewScore',
    ];

    for (const key of candidateKeys) {
      const val = (rv as any)[key];
      const n = coerceToNumberRating(val);
      if (n !== null) return Math.round(n * 2) / 2;
    }

    // 4) 객체 속에 들어있는 경우(meta 등)
    const nested = (rv as any)?.meta ?? (rv as any)?.extra ?? (rv as any)?.detail;
    if (nested && typeof nested === 'object') {
      for (const key of Object.keys(nested)) {
        if (
          String(key).toLowerCase().includes('rating') ||
          ['score', 'stars', 'star', 'rate'].includes(String(key))
        ) {
          const n = coerceToNumberRating((nested as any)[key]);
          if (n !== null) return Math.round(n * 2) / 2;
        }
      }
    }

    // 5) 못 찾으면 0
    return 0;
  };

  const formatRowRating = (rv: ReviewRow) => getRowRating(rv).toFixed(1);

  /** ================= 이동 ================= */
  const goOrders = () => navigate(`/seller/${storeUrl}/product/order`);
  const goSettlement = () => navigate(`/seller/${storeUrl}/settlement`);
  const goClassReservation = () => navigate(`/seller/${storeUrl}/class/reservation`);
  const goReviews = () => navigate(`/seller/${storeUrl}/product/review`);

  /** ================= 렌더 ================= */
  return (
    <>
      <Header />

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
                        <span
                          className={`inline-flex w-fit px-2 py-0.5 rounded-full text-[11px] ${badgeCls}`}
                        >
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

          {/* 2) 매출 그래프 */}
          <section className="rounded-2xl border bg-white">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 px-4 sm:px-6 py-4 border-b">
              <h2 className="text-base sm:text-lg font-semibold">매출 그래프</h2>
              <div className="flex items-center gap-4">
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

                <div className="bg-gray-100 rounded-md p-1 inline-flex">
                  <button
                    type="button"
                    onClick={() => setSalesMode('day')}
                    className={[
                      'px-3 py-1.5 rounded text-xs sm:text-sm',
                      salesMode === 'day' ? 'bg-white shadow' : 'text-gray-600',
                    ].join(' ')}
                  >
                    일별
                  </button>
                  <button
                    type="button"
                    onClick={() => setSalesMode('week')}
                    className={[
                      'px-3 py-1.5 rounded text-xs sm:text-sm',
                      salesMode === 'week' ? 'bg-white shadow' : 'text-gray-600',
                    ].join(' ')}
                  >
                    주별
                  </button>
                  <button
                    type="button"
                    onClick={() => setSalesMode('month')}
                    className={[
                      'px-3 py-1.5 rounded text-xs sm:text-sm',
                      salesMode === 'month' ? 'bg-white shadow' : 'text-gray-600',
                    ].join(' ')}
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
                      domain={[0, (dataMax: number) => dataMax * 1.2]}
                    />
                    <YAxis
                      yAxisId="orders"
                      orientation="left"
                      width={48}
                      domain={[0, (dataMax: number) => dataMax * 1.2]}
                    />
                    <Tooltip
                      formatter={(v: number, name) =>
                        name === '매출액' ? [fmtKRW(v), name] : [`${v} 건`, name]
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
                      yAxisId="orders"
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

          {/* 3) 전체 클래스 예약 통계 */}
          <ClassStatsCard
            title="전체 클래스 예약 통계"
            mode={classMode}
            onModeChange={setClassMode}
            monthValue={selectedMonth}
            onMonthChange={setSelectedMonth}
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
                  className="border rounded-md px-3 py-1.5 text-xs sm:text-sm min-w-[200px]"
                >
                  <option value="ALL">전체</option>
                  {productOptions.map((p) => (
                    <option key={p.productId} value={String(p.productId)}>
                      {p.productName}
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
                  <table className="w-full text-sm table-fixed">
                    <thead className="bg-gray-50 text-gray-600">
                      <tr>
                        <th className="px-3 py-3 text-center w-2/12">작성일</th>
                        <th className="px-3 py-3 text-center w-4/12">상품명</th>
                        <th className="px-3 py-3 text-center w-3/12">내용</th>
                        <th className="px-3 py-3 text-center w-1/12">평점</th>
                        <th className="px-3 py-3 text-center w-2/12">작성자</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredReviews.map((rv) => {
                        const dateStr = rv.reviewCreatedAt?.slice(0, 10) ?? '';
                        return (
                          <tr
                            key={rv.reviewId}
                            onClick={goReviews}
                            className="border-t border-gray-100 hover:bg-gray-50 cursor-pointer"
                            title="클릭하여 리뷰 관리로 이동"
                          >
                            <td className="px-3 py-3 text-center">{dateStr}</td>
                            <td className="px-3 py-3 text-center">{rv.productName}</td>
                            <td className="px-3 py-3 text-center">{rv.content}</td>
                            {/* ★ 강화된 파싱/탐색으로 개별 평점 표시 */}
                            <td className="px-3 py-3 text-center">{formatRowRating(rv)}</td>
                            <td className="px-3 py-3 text-center">{rv.authorName}</td>
                          </tr>
                        );
                      })}
                      {filteredReviews.length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-3 py-6 text-center text-gray-500">
                            표시할 리뷰가 없습니다.
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
