// src/domains/main/areas/home/features/sell/pages/MainSellManagement.tsx
import React, { useEffect, useMemo, useState } from 'react';
import Header from '@src/shared/areas/layout/features/header/Header';
import Mainnavbar from '@src/shared/areas/navigation/features/navbar/main/Mainnavbar';
import SellSubnavbar from '@src/shared/areas/navigation/features/subnavbar/sell/SellSubnavbar';
import {
  TrendingUp,
  CalendarDays,
  ExternalLink,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Info,
} from 'lucide-react';
import { legacyGet } from '@src/libs/request';

/** ---------- API Types ---------- */
type SellManageItem = {
  ACCOUNTNUMBER: string;
  BANKNAME: string;
  ADJUSTMENTDATE: string; // "YYYY-MM-DD"
  TOTALSALES: number; // 총 매출(단위는 API 정의에 따름)
  PRODUCT_NAME: string;
  DELIVEREDSALES: number; // 배송완료 매출(정산 기준)
  ADJUSTMENTSTATUS: string; // "정산 예정" 등
  PRODUCTDETAIL: string;
};
type DayPoint = { SALEDATE: string; DAILYTOTAL: number }; // "YYYY-MM-DD", 합계
type DaySalesMap = Record<string, DayPoint[]>; // key: PRODUCT_NAME
type ApiEnvelope = {
  status: number;
  message: string;
  data: {
    sellmanageList: SellManageItem[];
    daySellmanagelistByProduct: DaySalesMap;
  };
};

/** ---------- UI Types ---------- */
type SavedProductCard = {
  key: string; // PRODUCT_NAME
  name: string;
  description: string;
  totalSales: number;
  deliveredSales: number;
  adjustmentStatus: string;
  adjustmentDate: string;
  bank: { name: string; account: string };
};

/** ---------- Helpers ---------- */
const won = (n: number) => n.toLocaleString('ko-KR'); // 필요 시 '원' 표기 제거 가능
const fmt = (d: Date) =>
  `${d.getFullYear()}.${(d.getMonth() + 1).toString().padStart(2, '0')}.${d
    .getDate()
    .toString()
    .padStart(2, '0')}`;
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const addDays = (date: Date, days: number) => {
  const r = new Date(date);
  r.setDate(r.getDate() + days);
  return r;
};
const startOfWeek = (d: Date) => {
  const day = d.getDay(); // 0: Sun
  const diff = (day + 6) % 7; // Monday = 0
  const s = new Date(d);
  s.setDate(d.getDate() - diff);
  return startOfDay(s);
};
const addWeeks = (date: Date, weeks: number) => addDays(date, weeks * 7);
const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
const addMonths = (date: Date, months: number) => {
  const r = new Date(date);
  r.setMonth(r.getMonth() + months);
  return r;
};

/** ---------- BarChart (SVG, 애니메이션) ---------- */
const BarChart: React.FC<{
  data: { label: string; value: number }[];
  height?: number;
  animationKey?: string | number;
}> = ({ data, height = 220, animationKey = 0 }) => {
  const max = Math.max(1, ...data.map((d) => d.value));
  const n = data.length || 1;
  const gap = 14;
  const width = 500;
  const totalGapWidth = gap * (n + 1);
  const availableWidth = width - totalGapWidth;
  const barW = Math.max(8, Math.floor(availableWidth / n));

  return (
    <div className="w-full">
      <svg width={width} height={height} className="mx-auto" key={`chart-${animationKey}`}>
        <line x1={0} y1={height - 24} x2={width} y2={height - 24} stroke="#e5e7eb" />
        {data.map((d, i) => {
          const h = Math.round(((height - 40) * d.value) / max);
          const x = gap + i * (barW + gap);
          const y = height - 24 - h;
          const delay = 0.06 * i;

          return (
            <g key={`${animationKey}-bar-${i}`}>
              <rect x={x} y={height - 24} width={barW} height={0} rx={6} className="fill-[#2d4739]">
                <animate
                  attributeName="height"
                  from="0"
                  to={h}
                  dur="0.6s"
                  begin={`${delay}s`}
                  fill="freeze"
                />
                <animate
                  attributeName="y"
                  from={height - 24}
                  to={y}
                  dur="0.6s"
                  begin={`${delay}s`}
                  fill="freeze"
                />
              </rect>
              <text
                x={x + barW / 2}
                y={height - 8}
                textAnchor="middle"
                className="fill-gray-500 text-[10px]"
                opacity="0"
              >
                <animate
                  attributeName="opacity"
                  from="0"
                  to="1"
                  dur="0.3s"
                  begin={`${delay + 0.4}s`}
                  fill="freeze"
                />
                {d.label}
              </text>
              <text
                x={x + barW / 2}
                y={y - 6}
                textAnchor="middle"
                className="fill-gray-700 text-[10px]"
                opacity="0"
              >
                <animate
                  attributeName="opacity"
                  from="0"
                  to="1"
                  dur="0.3s"
                  begin={`${delay + 0.45}s`}
                  fill="freeze"
                />
                {d.value.toLocaleString('ko-KR')}
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
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [cards, setCards] = useState<SavedProductCard[]>([]);
  const [byProduct, setByProduct] = useState<DaySalesMap>({});
  const [selectedKey, setSelectedKey] = useState<'ALL' | string>('ALL');

  const [granularity, setGranularity] = useState<'일' | '주' | '월'>('일');
  const [anchorDate, setAnchorDate] = useState<Date>(new Date());
  const [showTotalRev, setShowTotalRev] = useState(false);
  const [showDeliveredRev, setShowDeliveredRev] = useState(false);
  const [animKey, setAnimKey] = useState(0);
  const [chartAnimKey, setChartAnimKey] = useState(0);

  // 데이터 로드: request.ts의 legacyGet 사용
  useEffect(() => {
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const j = await legacyGet<ApiEnvelope>('/main/sell/management');
        const list = j?.data?.sellmanageList ?? [];
        const days = j?.data?.daySellmanagelistByProduct ?? {};

        const cs: SavedProductCard[] = list.slice(0, 2).map((it) => ({
          key: it.PRODUCT_NAME,
          name: it.PRODUCT_NAME,
          description: it.PRODUCTDETAIL,
          totalSales: it.TOTALSALES,
          deliveredSales: it.DELIVEREDSALES,
          adjustmentStatus: it.ADJUSTMENTSTATUS,
          adjustmentDate: it.ADJUSTMENTDATE,
          bank: { name: it.BANKNAME, account: it.ACCOUNTNUMBER },
        }));

        setCards(cs);
        setByProduct(days);
      } catch (e: any) {
        setErr(e?.message ?? '정산 데이터 조회 실패');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  /** ----------- 범위 생성 ----------- */
  const ranges = useMemo(() => {
    if (granularity === '일') {
      return Array.from({ length: 7 }, (_, i) => addDays(anchorDate, -6 + i));
    }
    if (granularity === '주') {
      const end = startOfWeek(anchorDate);
      return Array.from({ length: 4 }, (_, i) => addWeeks(end, -3 + i));
    }
    const end = startOfMonth(anchorDate);
    return Array.from({ length: 12 }, (_, i) => addMonths(end, -11 + i));
  }, [granularity, anchorDate]);

  /** 선택 상품 raw series (ALL 합산 지원) */
  const selectedSeries = useMemo(() => {
    const acc = new Map<string, number>(); // key: YYYY-MM-DD
    const push = (p: DayPoint[]) => {
      for (const row of p || []) {
        const k = row.SALEDATE;
        acc.set(k, (acc.get(k) || 0) + (row.DAILYTOTAL || 0));
      }
    };
    if (selectedKey === 'ALL') {
      Object.values(byProduct).forEach((arr) => push(arr));
    } else {
      push(byProduct[selectedKey] || []);
    }
    return acc;
  }, [byProduct, selectedKey]);

  /** 차트/표 집계 */
  const chartData = useMemo(() => {
    const buckets = new Map<string, number>();

    ranges.forEach((date) => {
      let start: Date, end: Date, label: string;

      if (granularity === '일') {
        start = startOfDay(date);
        end = addDays(start, 1);
        label = fmt(date).slice(5); // MM.DD
      } else if (granularity === '주') {
        start = startOfWeek(date);
        end = addDays(start, 7);
        const s = fmt(start).slice(5);
        const e = fmt(addDays(start, 6)).slice(5);
        label = `${s}~${e}`;
      } else {
        start = startOfMonth(date);
        end = addMonths(start, 1);
        label = `${date.getFullYear()}.${(date.getMonth() + 1).toString().padStart(2, '0')}`;
      }

      let sum = 0;
      for (const [k, v] of selectedSeries.entries()) {
        const d = new Date(k + 'T00:00:00');
        if (d >= start && d < end) sum += v;
      }
      buckets.set(label, sum);
    });

    setAnimKey((k) => k + 1);
    setChartAnimKey((k) => k + 1);

    return ranges.map((date) => {
      let label = '';
      if (granularity === '일') label = fmt(date).slice(5);
      else if (granularity === '주') {
        const s = fmt(startOfWeek(date)).slice(5);
        const e = fmt(addDays(startOfWeek(date), 6)).slice(5);
        label = `${s}~${e}`;
      } else label = `${date.getFullYear()}.${(date.getMonth() + 1).toString().padStart(2, '0')}`;
      return { label, value: buckets.get(label) || 0 };
    });
  }, [selectedSeries, granularity, ranges]);

  const tableData = useMemo(
    () => chartData.map((c) => ({ period: c.label, amount: c.value })),
    [chartData]
  );

  /** 수익(합계) */
  const totalRevenue = useMemo(
    () => cards.reduce((acc, c) => acc + (c.totalSales || 0), 0),
    [cards]
  );
  const deliveredRevenue = useMemo(
    () => cards.reduce((acc, c) => acc + (c.deliveredSales || 0), 0),
    [cards]
  );

  /** 월별 정산 테이블 (상품별) */
  const monthlySettlement = useMemo(() => {
    return cards.map((c) => {
      const date = new Date(c.adjustmentDate + 'T00:00:00');
      return {
        ym: `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`,
        settleDate: fmt(date),
        amount: c.totalSales,
        bank: { bankName: c.bank.name, account: c.bank.account },
        product: c.name,
        status: c.adjustmentStatus,
      };
    });
  }, [cards]);
  /** 기간 텍스트 */
  const periodText = useMemo(() => {
    if (ranges.length === 0) return '';
    if (granularity === '일') {
      return `${fmt(ranges[0])} ~ ${fmt(ranges[ranges.length - 1])}`;
    }
    if (granularity === '주') {
      const s = startOfWeek(ranges[0]);
      const e = startOfWeek(ranges[ranges.length - 1]);
      return `${fmt(s)} ~ ${fmt(addDays(e, 6))}`;
    }
    const s = startOfMonth(ranges[0]);
    const e = startOfMonth(ranges[ranges.length - 1]);
    return `${s.getFullYear()}.${(s.getMonth() + 1).toString().padStart(2, '0')} ~ ${e.getFullYear()}.${(
      e.getMonth() + 1
    )
      .toString()
      .padStart(2, '0')}`;
  }, [granularity, ranges]);

  const onPickDate: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const v = e.target.value;
    if (!v) return;
    const [y, m, d] = v.split('-').map(Number);
    setAnchorDate(new Date(y, m - 1, d));
  };

  const jumpBackward = () => {
    if (granularity === '일') setAnchorDate(addDays(anchorDate, -7));
    else if (granularity === '주') setAnchorDate(addWeeks(anchorDate, -4));
    else setAnchorDate(addMonths(anchorDate, -12));
  };
  const jumpForward = () => {
    if (granularity === '일') setAnchorDate(addDays(anchorDate, 7));
    else if (granularity === '주') setAnchorDate(addWeeks(anchorDate, 4));
    else setAnchorDate(addMonths(anchorDate, 12));
  };

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
            <h1 className="text-xl md:text-2xl font-extrabold tracking-[-0.01em]">
              개인 판매 · 정산 관리
            </h1>

            {err && (
              <div className="mt-3 inline-flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                <Info className="w-4 h-4" /> {err}
              </div>
            )}
            {loading && <div className="mt-3 text-sm text-gray-600">불러오는 중…</div>}
          </header>

          {/* 상품 카드 */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            {cards.map((c) => {
              const active = selectedKey === c.key;
              return (
                <button
                  key={c.key}
                  onClick={() => setSelectedKey((prev) => (prev === c.key ? 'ALL' : c.key))}
                  className={[
                    'text-left rounded-2xl border p-4 md:p-6 shadow-sm transition-all',
                    active
                      ? 'bg-indigo-50/70 border-indigo-200 ring-2 ring-indigo-200'
                      : 'bg-white hover:bg-gray-50 border-gray-200',
                  ].join(' ')}
                >
                  <div className="flex gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold truncate">{c.name}</div>
                      <div className="text-xs text-gray-500 line-clamp-2">{c.description}</div>

                      <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                        <div className="rounded-lg bg-gray-50 border px-3 py-2">
                          <div className="text-[12px] text-gray-500">총 매출</div>
                          <div className="font-semibold text-gray-900">{won(c.totalSales)}원</div>
                        </div>
                        <div className="rounded-lg bg-gray-50 border px-3 py-2">
                          <div className="text-[12px] text-gray-500">배송완료 매출</div>
                          <div className="font-semibold text-gray-900">
                            {won(c.deliveredSales)}원
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-gray-600">
                        <span className="inline-flex items-center rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5">
                          {c.adjustmentStatus}
                        </span>
                        <span>정산 예정일: {c.adjustmentDate}</span>
                        <span>
                          계좌: {c.bank.name} {c.bank.account}
                        </span>
                      </div>

                      <div className="mt-2">
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-indigo-700 hover:text-indigo-900 hover:underline">
                          상품 상세페이지 가기 <ExternalLink className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </div>
                  </div>

                  {active && (
                    <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-indigo-600 text-white px-2.5 py-1 text-xs">
                      선택됨
                    </div>
                  )}
                </button>
              );
            })}

            {cards.length === 0 && !loading && !err && (
              <div className="col-span-full text-sm text-gray-500">표시할 상품이 없습니다.</div>
            )}
          </section>

          {/* 그래프 + 수익 */}
          <section className="mt-6 md:mt-8 grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
            <div className="lg:col-span-2 rounded-2xl border bg-white p-4 md:p-6">
              {/* 상단 컨트롤 */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-[#2d4739]" />
                  <h2 className="text-lg font-semibold">
                    매출 분석{' '}
                    {selectedKey !== 'ALL' ? (
                      <span className="text-gray-500">({selectedKey})</span>
                    ) : null}
                  </h2>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    {(['일', '주', '월'] as const).map((g) => (
                      <button
                        key={g}
                        onClick={() => setGranularity(g)}
                        className={[
                          'h-10 rounded-xl border px-4 text-sm font-medium transition-all',
                          granularity === g
                            ? 'bg-[#2d4739] text-white border-[#2d4739]'
                            : 'bg-white text-gray-700 hover:bg-gray-50 border-gray-300',
                        ].join(' ')}
                      >
                        {g}별
                      </button>
                    ))}
                  </div>

                  <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                    <CalendarIcon className="w-4 h-4 text-gray-600" />
                    <input
                      type="date"
                      value={`${anchorDate.getFullYear()}-${(anchorDate.getMonth() + 1)
                        .toString()
                        .padStart(2, '0')}-${anchorDate.getDate().toString().padStart(2, '0')}`}
                      onChange={onPickDate}
                      className="rounded-md border px-2 py-1.5 text-sm"
                    />
                  </label>
                </div>
              </div>

              {/* 기간 네비게이션 */}
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={jumpBackward}
                  className="flex items-center gap-1 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                  이전 {granularity === '일' ? '7일' : granularity === '주' ? '4주' : '12개월'}
                </button>

                <div className="text-sm text-gray-600 font-medium">{periodText}</div>

                <button
                  onClick={jumpForward}
                  className="flex items-center gap-1 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  다음 {granularity === '일' ? '7일' : granularity === '주' ? '4주' : '12개월'}
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* 차트 + 표 */}
              <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
                <div className="xl:col-span-3">
                  <BarChart data={chartData} animationKey={chartAnimKey} />
                  <p className="mt-3 text-xs text-gray-500">
                    {selectedKey === 'ALL' ? '모든 상품 합산 ' : `${selectedKey} 기준 `}
                    {granularity}별 매출 합계입니다.
                  </p>
                </div>

                {/* 표 */}
                <div className="xl:col-span-2">
                  <div className="rounded-lg border border-gray-200 bg-gray-50/50 overflow-hidden">
                    <div className="px-4 py-3 bg-gray-100 border-b border-gray-200">
                      <h3 className="text-sm font-semibold text-gray-900">
                        {granularity}별 매출 상세
                      </h3>
                    </div>
                    <div key={animKey} className="overflow-y-auto min-h-[432px] max-h-[432px]">
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
                              <td className="py-2 px-4 text-right font-medium text-gray-900">
                                {won(row.amount)}원
                              </td>
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
                            <div className="text-[13px] font-semibold text-gray-900">
                              {won(row.amount)}원
                            </div>
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

            {/* 수익 카드 */}
            <div className="rounded-2xl border bg-white p-4 md:p-6">
              <div className="flex items-center gap-2 mb-4">
                <DollarSign className="w-5 h-5 text-[#2d4739]" />
                <h3 className="text-lg font-semibold">수익 현황</h3>
              </div>

              <div className="space-y-4">
                <div className="rounded-xl border border-gray-200 overflow-hidden transition-all hover:shadow-md">
                  <button
                    className="w-full text-left p-4 hover:bg-gray-50 transition-colors"
                    onClick={() => setShowTotalRev((v) => !v)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium text-gray-700">총 매출 합계</div>
                        <div className="text-xs text-gray-500 mt-0.5">전체 상품 기준</div>
                      </div>
                      <div className="w-2 h-2 rounded-full bg-blue-500" />
                    </div>
                  </button>
                  {showTotalRev && (
                    <div className="px-4 pb-4 animate-row">
                      <div className="rounded-lg bg-blue-50 border border-blue-200 px-4 py-3">
                        <div className="text-2xl font-bold text-blue-900">
                          {won(totalRevenue)}원
                        </div>
                        <div className="text-sm text-blue-700 mt-1">총 매출 합계</div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="rounded-xl border border-gray-200 overflow-hidden transition-all hover:shadow-md">
                  <button
                    className="w-full text-left p-4 hover:bg-gray-50 transition-colors"
                    onClick={() => setShowDeliveredRev((v) => !v)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium text-gray-700">정산 가능 매출</div>
                        <div className="text-xs text-gray-500 mt-0.5">배송 완료 기준</div>
                      </div>
                      <div className="w-2 h-2 rounded-full bg-emerald-500" />
                    </div>
                  </button>
                  {showDeliveredRev && (
                    <div className="px-4 pb-4 animate-row">
                      <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3">
                        <div className="text-2xl font-bold text-emerald-900">
                          {won(deliveredRevenue)}원
                        </div>
                        <div className="text-sm text-emerald-700 mt-1">배송 완료 합계</div>
                      </div>
                    </div>
                  )}
                </div>

                {/* 정산률 막대 */}
                <div className="rounded-xl bg-gray-50 p-4">
                  <div className="text-sm font-medium text-gray-700 mb-2">정산률</div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
                      <div
                        key={`${totalRevenue}-${deliveredRevenue}-${chartAnimKey}`}
                        className="h-full bg-[#2d4739] transition-[width] duration-700 ease-out"
                        style={{
                          width: `${totalRevenue > 0 ? (deliveredRevenue / totalRevenue) * 100 : 0}%`,
                        }}
                      />
                    </div>
                    <div className="text-xs text-gray-600">
                      {totalRevenue > 0 ? Math.round((deliveredRevenue / totalRevenue) * 100) : 0}%
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    총 매출 대비 정산 가능한 매출 비율
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* 월별 정산 테이블 */}
          <section className="mt-6 md:mt-8 rounded-2xl border bg-white p-4 md:p-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-gray-700" /> 월별 정산 내역(상품별)
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs md:text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b">
                    <th className="py-2 px-2">상품명</th>
                    <th className="py-2 px-2">정산 월</th>
                    <th className="py-2 px-2">정산 예정일</th>
                    <th className="py-2 px-2">정산 상태</th>
                    <th className="py-2 px-2 text-right">정산 예정 금액</th>
                    <th className="py-2 px-2">정산 계좌</th>
                  </tr>
                </thead>
                <tbody key={`settlement-${animKey}`}>
                  {monthlySettlement.length === 0 ? (
                    <tr className="animate-row">
                      <td colSpan={6} className="py-6 text-center text-gray-500">
                        정산 데이터가 없습니다.
                      </td>
                    </tr>
                  ) : (
                    monthlySettlement.map((row, idx) => (
                      <tr
                        key={`${animKey}-settlement-${row.product}-${row.ym}`}
                        className="border-b last:border-b-0 animate-row"
                        style={{ animationDelay: `${idx * 0.08}s` }}
                      >
                        <td className="py-2 px-2">{row.product}</td>
                        <td className="py-2 px-2">{row.ym}</td>
                        <td className="py-2 px-2">{row.settleDate}</td>
                        <td className="py-2 px-2">{row.status}</td>
                        <td className="py-2 px-2 text-right">{won(row.amount)}원</td>
                        <td className="py-2 px-2">
                          {row.bank.bankName} {row.bank.account}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default MainSellManagement;
