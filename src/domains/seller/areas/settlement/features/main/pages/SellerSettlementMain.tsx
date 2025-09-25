// src/domains/seller/settlement/SellerSettlementMain.tsx
import { useMemo, useState, useEffect } from 'react';
import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Header from '@src/shared/areas/layout/features/header/Header';
import SellerSidenavbar from '@src/shared/areas/navigation/features/sidenavbar/seller/SellerSidenavbar';
import { Package, Receipt, ChevronRight } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { get, legacyGet } from '@src/libs/request';

// ------------------ Types ------------------
type SettlementRow = {
  settlementDate: string;
  amount: number;
  account: string;
  bank: string;
  name?: string;
  status: number; // 0=정산 예정, 1=정산 완료
  updateAt: string;
};

// 일별 매출 응답 타입
type DailySaleRow = {
  ymd: string; // "YYYY-MM-DD"
  amt: number; // 금액
};

// ------------------ Utils (로컬 기준) ------------------
const brand = '#2d4739';
const KRW = new Intl.NumberFormat('ko-KR');

const fmtLocalYMD = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
};

const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

const startOfWeekMon = (d: Date) => {
  const day = d.getDay(); // 0(일) ~ 6(토)
  const diff = day === 0 ? -6 : 1 - day;
  return addDays(d, diff);
};

const onlyDate = (iso?: string) => (iso ? iso.slice(0, 10) : '');

const nextMonthFirstYMDFromISO = (iso: string) => {
  const base = new Date(iso);
  const nextFirst = new Date(base.getFullYear(), base.getMonth() + 1, 1);
  return fmtLocalYMD(nextFirst);
};

// ------------------ Component ------------------
type TabKey = 'all';

export default function SellerSettlementMain() {
  const { storeUrl = 'store' } = useParams();
  const [active, setActive] = useState<TabKey>('all');

  // 주간 anchor (월요일)
  const [weekAnchor, setWeekAnchor] = useState<Date>(() => startOfWeekMon(new Date()));
  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekAnchor, i)),
    [weekAnchor]
  );

  // 정산 데이터 상태 (월별 정산 내역)
  const [settlementRows, setSettlementRows] = useState<SettlementRow[]>([]);

  // 일별 매출 — 상품(레거시), 클래스(부트)
  const [productDaily, setProductDaily] = useState<DailySaleRow[]>([]);
  const [classDaily, setClassDaily] = useState<DailySaleRow[]>([]);

  // 정산 내역 호출
  useEffect(() => {
    get(`/seller/settlements/main/${storeUrl}/all`)
      .then((res: any) => {
        const payload = res?.data ?? res;
        const list = payload?.data ?? payload;
        if (Array.isArray(list)) {
          setSettlementRows(list as SettlementRow[]);
        }
      })
      .catch((err: any) => {
        console.error('정산 내역 조회 실패:', err);
      });
  }, [storeUrl]);

  // 일별 매출 호출: 상품(레거시) + 클래스(부트)
  useEffect(() => {
    legacyGet(`seller/settlements/products/${storeUrl}/sales`)
      .then((res: any) => {
        const payload = res?.data ?? res;
        const list = payload?.data ?? payload;
        setProductDaily(Array.isArray(list) ? (list as DailySaleRow[]) : []);
      })
      .catch((err: any) => {
        console.error('상품 일별 매출 조회 실패:', err);
        setProductDaily([]);
      });

    get(`/api/seller/sales/${storeUrl}/classes`)
      .then((res: any) => {
        const payload = res?.data ?? res;
        const list = payload?.data ?? payload;
        setClassDaily(Array.isArray(list) ? (list as DailySaleRow[]) : []);
      })
      .catch((err: any) => {
        console.error('클래스 일별 매출 조회 실패:', err);
        setClassDaily([]);
      });
  }, [storeUrl]);

  // 주간 데이터 계산(차트/표) — "상품+클래스" 같은 날짜 합산
  const weeklyData = useMemo(() => {
    const map = new Map<string, number>();
    weekDays.forEach((d) => map.set(fmtLocalYMD(d), 0));

    const addIfInWeek = (rows: DailySaleRow[]) => {
      rows.forEach((r) => {
        if (!r?.ymd) return;
        const amt = Number(r.amt || 0);
        if (map.has(r.ymd)) {
          map.set(r.ymd, (map.get(r.ymd) ?? 0) + amt);
        }
      });
    };

    addIfInWeek(productDaily);
    addIfInWeek(classDaily);

    return weekDays.map((d) => {
      const date = fmtLocalYMD(d);
      return {
        date,
        label: `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(
          2,
          '0'
        )}`,
        amount: map.get(date) ?? 0,
      };
    });
  }, [productDaily, classDaily, weekDays]);

  const weeklyTotal = useMemo(() => weeklyData.reduce((s, r) => s + r.amount, 0), [weeklyData]);

  // 최근일자순(= updateAt 내림차순) 정렬
  const sortedRows = useMemo(() => {
    return [...settlementRows].sort(
      (a, b) => new Date(b.updateAt).getTime() - new Date(a.updateAt).getTime()
    );
  }, [settlementRows]);

  const tabs: { key: TabKey; label: string }[] = [{ key: 'all', label: '총수익(상품+클래스)' }];

  return (
    <>
      <Header />

      <SellerSidenavbar>
        <div className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-6">
          {/* Title */}
          <div className="flex flex-col gap-1">
            <h1 className="text-xl sm:text-2xl font-bold">정산 대시보드</h1>
            <p className="text-gray-600">주간 기준으로 전체 매출 합계를 확인하세요.</p>
          </div>

          {/* 차트 + 표 + 주간 합계 */}
          <div className="mt-4 grid grid-cols-1 xl:grid-cols-5 gap-4">
            {/* 차트 */}
            <div className="xl:col-span-3 rounded-2xl border border-gray-200 p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold">주간 정산 금액</h3>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    className="h-9 rounded-lg border px-3 text-sm hover:bg-gray-50"
                    onClick={() => setWeekAnchor(addDays(weekAnchor, -7))}
                  >
                    이전 주
                  </button>
                  <input
                    type="date"
                    value={fmtLocalYMD(weekAnchor)}
                    onChange={(e) => setWeekAnchor(startOfWeekMon(new Date(e.target.value)))}
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
                  <BarChart data={weeklyData} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="label" fontSize={12} />
                    <YAxis
                      tickFormatter={(v) => KRW.format(v)}
                      fontSize={12}
                      domain={[0, (dataMax: number) => dataMax * 1.2]}
                    />
                    <Tooltip
                      formatter={(v: number) => `₩ ${KRW.format(v)}`}
                      labelFormatter={(_, payload) => `날짜: ${payload?.[0]?.payload?.date ?? ''}`}
                    />
                    <Bar dataKey="amount" radius={[6, 6, 0, 0]} fill={brand} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-3 text-sm text-gray-700">
                주간 합계: <span className="font-semibold">₩ {KRW.format(weeklyTotal)}</span>
              </div>
            </div>

            {/* 표(일별 합계) */}
            <div className="xl:col-span-2 rounded-2xl border border-gray-200 bg-white overflow-hidden">
              <div className="p-4 sm:p-6">
                <div className="flex items-center justify-betw-een">
                  <h3 className="text-lg font-semibold">일별 합계 표</h3>
                </div>
                <table className="mt-4 w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500">
                      <th className="py-2 pr-4 font-medium">날짜</th>
                      <th className="py-2 pr-4 font-medium">금액</th>
                    </tr>
                  </thead>
                  <tbody>
                    {weeklyData.map((r) => (
                      <tr key={r.date} className="border-t border-gray-100">
                        <td className="py-2 pr-4">{r.date}</td>
                        <td className="py-2 pr-4">₩ {KRW.format(r.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* 빠른 이동 */}
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <QuickLink
              to={`/seller/${storeUrl}/settlement/product`}
              label="상품별 정산"
              desc="상품ID로 검색하여 상세 매출/정산 내역을 확인합니다."
              icon={<Package className="w-5 h-5" />}
            />
            <QuickLink
              to={`/seller/${storeUrl}/settlement/class`}
              label="클래스별 정산"
              desc="클래스ID로 검색하여 상세 매출/정산 내역을 확인합니다."
              icon={<Receipt className="w-5 h-5" />}
            />
          </div>

          {/* 정산 테이블(최근일자순 정렬 + 날짜 포맷) */}
          <div className="mt-6 rounded-2xl border border-gray-200 bg-white overflow-x-auto">
            <div className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">정산 내역</h2>
                <span className="text-sm text-gray-500">{sortedRows.length}건</span>
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
                  {sortedRows.map((s, idx) => (
                    <tr key={`${s.settlementDate}-${idx}`} className="border-t border-gray-100">
                      <td className="py-3 pr-4">{nextMonthFirstYMDFromISO(s.settlementDate)}</td>
                      <td className="py-3 pr-4">₩ {KRW.format(s.amount)}</td>
                      <td className="py-3 pr-4">{s.account}</td>
                      <td className="py-3 pr-4">{s.bank}</td>
                      <td className="py-3 pr-4">{s.name ?? ''}</td>
                      <td className="py-3 pr-4">
                        <span
                          className={[
                            'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium border',
                            s.status === 1
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200',
                          ].join(' ')}
                        >
                          {s.status === 1 ? '정산 완료' : '정산 예정'}
                        </span>
                      </td>
                      <td className="py-3 pr-4">{onlyDate(s.updateAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </SellerSidenavbar>
    </>
  );
}

// ------------------ QuickLink ------------------
function QuickLink({
  to,
  label,
  desc,
  icon,
}: {
  to: string;
  label: string;
  desc: string;
  icon: React.ReactNode;
}) {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate(to)}
      className={[
        'group relative w-full overflow-hidden rounded-2xl',
        'border border-gray-300 bg-transparent text-left outline-none cursor-pointer',
        'transition-all duration-300 ease-out',
        'text-gray-900 hover:text-white',
        'hover:shadow-lg',
      ].join(' ')}
    >
      <span
        aria-hidden
        className={[
          'pointer-events-none absolute inset-0 z-0',
          "before:content-[''] before:absolute before:inset-0",
          'before:bg-[#5b7d6a] before:origin-left before:scale-x-0 before:transform',
          'before:transition-transform before:duration-500 before:ease-out',
          'group-hover:before:scale-x-100',
        ].join(' ')}
      />
      <div className="relative z-10 p-4 sm:p-6 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className={[
              'rounded-xl border p-2 bg-transparent border-gray-300 text-gray-900',
              'transition-colors duration-300 group-hover:border-white group-hover:text-white',
            ].join(' ')}
          >
            {icon}
          </div>
          <div>
            <div className="font-semibold uppercase">
              <span className="inline-block transition-all duration-300 group-hover:translate-x-2">
                {label}
              </span>
            </div>
            <div className="text-sm text-gray-600 mt-0.5 transition-colors duration-300 group-hover:text-white/90">
              {desc}
            </div>
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-gray-900 transition-all duration-300 group-hover:text-white group-hover:translate-x-1.5" />
      </div>
    </button>
  );
}
