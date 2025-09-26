import { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import Header from '@src/shared/areas/layout/features/header/Header';
import SellerSidenavbar from '@src/shared/areas/navigation/features/sidenavbar/seller/SellerSidenavbar';
import { CalendarDays, Image as ImageIcon } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { legacyGet } from '@src/libs/request';
import type { ApiResponse } from '@src/libs/apiResponse';
import { getCurrentUser } from '@src/shared/util/jwtUtils';

// ---------- Types ----------
type Params = { storeUrl: string };

type ProductOption = {
  productId: number;
  productName: string;
  pimgUrl?: string | null;
};

type ProductDailySettlementResponse = {
  productId: number;
  daily: Array<{ date: string; amount: number }>;
};

type LegacyMonthlySettlementItem = {
  settlementDate: string; // "YYYY-MM-DD"
  amount: number;
  account: string;
  accountBank: string;
  updateAt: string; // "YYYY-MM-DD HH:mm:ss" (조인 키)
};
// ---------- Utils ----------
const BRAND = '#2d4739';
const KRW = new Intl.NumberFormat('ko-KR');

const parseDate = (s: string) => new Date(`${s}T00:00:00`);
const fmtYMD = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(
    2,
    '0'
  )}`;
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const startOfWeekMon = (d: Date) => {
  const day = d.getDay(); // 0=일 ~ 6=토
  const diff = day === 0 ? -6 : 1 - day;
  return addDays(d, diff);
};
const takeDatePart = (s: string | null | undefined) => (s ? s.slice(0, 10) : '—');

// 요청하신 라벨 규칙으로 유지
const statusLabel = (n: number | null | undefined) =>
  n === 1 ? '정산완료' : n === 0 ? '정산예정' : '—';

// ---------- Component ----------
export default function SellerSettlementProduct() {
  const { storeUrl } = useParams<Params>();
  const [searchParams, setSearchParams] = useSearchParams();

  // 드롭다운(레거시)
  const [options, setOptions] = useState<ProductOption[]>([]);
  const [optLoading, setOptLoading] = useState(false);
  const [optError, setOptError] = useState<string | null>(null);

  // 선택 상품 ID (쿼리와 동기화)
  const productIdParam = searchParams.get('productId');
  const selectedId = productIdParam ? Number(productIdParam) : null;

  // 일별 정산(레거시)
  const [daily, setDaily] = useState<ProductDailySettlementResponse | null>(null);
  const [dailyLoading, setDailyLoading] = useState(false);

  // 월별 정산(레거시 + 부트 메타)
  const [legacyMonthly, setLegacyMonthly] = useState<LegacyMonthlySettlementItem[]>([]);
  const [monthlyError, setMonthlyError] = useState<string | null>(null);

  // 상품 리스트 불러오기
  useEffect(() => {
    if (!storeUrl) return;
    let alive = true;
    (async () => {
      setOptLoading(true);
      setOptError(null);
      try {
        const res = await legacyGet<ApiResponse<any[]>>(
          `/seller/settlements/products/${encodeURIComponent(storeUrl)}/list`
        );
        if (!alive) return;
        if (res.status === 200) {
          const raw = Array.isArray(res.data) ? res.data : [];
          const list: ProductOption[] = raw
            .map((it) => ({
              productId: it.productId ?? it.id ?? it.product_id,
              productName: it.productName ?? it.name ?? it.product_name,
              pimgUrl:
                it.pimgUrl ??
                it.pimg_url ??
                it.thumbnailUrl ??
                it.thumbnail_url ??
                it.img ??
                it.image ??
                null,
            }))
            .filter((v) => v.productId && v.productName);
          setOptions(list);
          if (!productIdParam && list.length) {
            setSearchParams({ productId: String(list[0].productId) }, { replace: true });
          }
        } else {
          setOptError(res.message || '상품 목록 조회 실패');
        }
      } catch {
        if (alive) setOptError('상품 목록을 불러오지 못했습니다.');
      } finally {
        if (alive) setOptLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [storeUrl]);

  // 선택 상품 일별 정산 조회
  useEffect(() => {
    if (!storeUrl) return;
    if (selectedId == null) {
      setDaily(null);
      return;
    }
    let alive = true;
    (async () => {
      setDailyLoading(true);
      try {
        const res = await legacyGet<ApiResponse<ProductDailySettlementResponse>>(
          `/seller/settlements/products/${encodeURIComponent(storeUrl)}/${encodeURIComponent(
            String(selectedId)
          )}`
        );
        if (!alive) return;
        if (res.status === 200 && res.data) {
          setDaily(res.data);
        } else {
          setDaily({ productId: selectedId, daily: [] });
        }
      } catch {
        if (alive) setDaily({ productId: selectedId, daily: [] });
      } finally {
        if (alive) setDailyLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [storeUrl, selectedId]);

  // 월별 정산(레거시 + 부트 메타) 조회/머지  ———— ★ YYYY-MM 키로 안전 조인
  useEffect(() => {
    if (!storeUrl) return;
    (async () => {
      setMonthlyError(null);
      try {
        const legacyRes = await legacyGet<ApiResponse<LegacyMonthlySettlementItem[]>>(
          `/seller/settlements/products/${encodeURIComponent(storeUrl)}/all`
        );

        const legacyList = legacyRes.status === 200 ? (legacyRes.data ?? []) : [];
        setLegacyMonthly(legacyList);
      } catch {
        setMonthlyError('월별 정산 데이터를 불러오는 데 실패했습니다.');
        setLegacyMonthly([]);
      } finally {
      }
    })();
  }, [storeUrl, selectedId]);

  // 주간 차트 데이터
  const [weekAnchor, setWeekAnchor] = useState<Date>(() => startOfWeekMon(new Date()));
  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekAnchor, i)),
    [weekAnchor]
  );

  const weeklyChartData = useMemo(() => {
    const sumByDay: Record<string, number> = {};
    weekDays.forEach((d) => (sumByDay[fmtYMD(d)] = 0));
    if (daily?.daily?.length) {
      for (const r of daily.daily) {
        const key = r.date.length > 10 ? r.date.slice(0, 10) : r.date;
        if (key in sumByDay) sumByDay[key] += r.amount;
      }
    }
    return weekDays.map((d) => ({
      date: fmtYMD(d),
      label: `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
      amount: sumByDay[fmtYMD(d)] || 0,
    }));
  }, [daily?.daily, weekDays]);

  return (
    <>
      <Header />
      <SellerSidenavbar>
        <div className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-6">
          <div className="flex flex-col gap-1">
            <h1 className="text-xl sm:text-2xl font-bold">상품별 정산</h1>
            <p className="text-gray-600">
              상품을 선택하면 대표 이미지와 일별 매출 차트를 확인할 수 있어요.
            </p>
          </div>

          {/* 상품 선택 */}
          <div className="mt-4">
            <label
              htmlFor="product-select"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              상품 선택
            </label>
            {optLoading ? (
              <div className="h-11 flex items-center px-3 rounded-xl border border-gray-300 text-gray-500">
                상품 목록 로딩 중…
              </div>
            ) : optError ? (
              <div className="h-11 flex items-center px-3 rounded-xl border border-rose-200 bg-rose-50 text-rose-700">
                {optError}
              </div>
            ) : options.length === 0 ? (
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 rounded-xl border border-dashed border-gray-300 p-4">
                <p className="text-gray-600">등록된 상품이 없습니다.</p>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                <select
                  id="product-select"
                  value={selectedId ?? ''}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setSearchParams({ productId: String(val) }, { replace: true });
                  }}
                  className="h-11 w-full sm:w-[360px] rounded-xl border border-gray-300 px-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#2d4739]/25 focus:border-[#2d4739]"
                >
                  {options.map((opt) => (
                    <option key={opt.productId} value={opt.productId}>
                      {opt.productName}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* 대표 이미지 + 주간 차트 */}
          {!!selectedId && (
            <div className="mt-6 grid grid-cols-1 xl:grid-cols-5 gap-4">
              {/* 대표 이미지 카드 */}
              <div className="xl:col-span-2 rounded-2xl border border-gray-200 overflow-hidden">
                <div className="aspect-[4/3] relative bg-gray-50">
                  {(() => {
                    const thumb = options.find((o) => o.productId === selectedId)?.pimgUrl;
                    return thumb ? (
                      <img
                        src={thumb}
                        alt="대표 이미지"
                        className="absolute inset-0 h-full w-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                        <ImageIcon className="w-10 h-10" />
                      </div>
                    );
                  })()}
                </div>
                <div className="p-4 flex items-center justify-between">
                  <div>
                    <div className="text-lg font-semibold">
                      {options.find((o) => o.productId === selectedId)?.productName}
                    </div>
                  </div>
                  <div
                    className="rounded-xl border p-2"
                    style={{ borderColor: '#e5e7eb', color: BRAND }}
                  >
                    <CalendarDays className="w-5 h-5" />
                  </div>
                </div>
              </div>

              {/* 주간 차트 */}
              <div className="xl:col-span-3 rounded-2xl border border-gray-200 p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <h3 className="text-lg font-semibold">일별 결제 금액</h3>
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
                  {dailyLoading ? (
                    <div className="h-full flex items-center justify-center text-gray-500">
                      차트 로딩 중…
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={weeklyChartData}
                        margin={{ top: 8, right: 8, left: 0, bottom: 8 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="label" fontSize={12} />
                        <YAxis tickFormatter={(v) => KRW.format(v)} fontSize={12} />
                        <Tooltip
                          formatter={(v: number) => `₩ ${KRW.format(v)}`}
                          labelFormatter={(_, p: any) => `날짜: ${p?.payload?.date ?? ''}`}
                        />
                        <Bar dataKey="amount" fill={BRAND} radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 월별 상품 정산(레거시+부트 메타 머지) */}
          <div className="mt-8">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold">월별 상품 정산</h3>
              {dailyLoading && (
                <div className="text-sm text-gray-500">{legacyMonthly.length}건</div>
              )}
            </div>

            <div className="rounded-2xl border border-gray-200 overflow-hidden">
              {dailyLoading ? (
                <div className="p-6 text-center text-gray-500">월별 정산 데이터를 불러오는 중…</div>
              ) : monthlyError ? (
                <div className="p-6 text-center text-rose-700 bg-rose-50">{monthlyError}</div>
              ) : legacyMonthly.length === 0 ? (
                <div className="p-6 text-center text-gray-500">
                  표시할 월별 정산 데이터가 없습니다.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full whitespace-nowrap text-sm">
                    <thead className="bg-gray-50">
                      <tr className="text-left text-gray-600">
                        <th className="px-4 py-3">정산일자</th>
                        <th className="px-4 py-3">정산금액</th>
                        <th className="px-4 py-3">계좌번호</th>
                        <th className="px-4 py-3">은행</th>
                        <th className="px-4 py-3">예금주</th>
                        <th className="px-4 py-3">정산상태</th>
                        <th className="px-4 py-3">최근수정일</th>
                      </tr>
                    </thead>
                    <tbody>
                      {daily?.daily.map((row, idx) => (
                        <tr key={`${idx}`} className="border-t">
                          <td className="px-4 py-3">{legacyMonthly[0].settlementDate}</td>
                          <td className="px-4 py-3 font-medium">₩ {KRW.format(row.amount)}</td>
                          <td className="px-4 py-3">{legacyMonthly[0].account}</td>
                          <td className="px-4 py-3">{legacyMonthly[0].accountBank}</td>
                          <td className="px-4 py-3">{getCurrentUser()?.name ?? '—'}</td>
                          <td className="px-4 py-3">
                            <span
                              className={[
                                'inline-flex items-center rounded-md px-2 py-1 text-xs font-medium',
                                legacyMonthly[0].settlementDate > row.date
                                  ? 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20'
                                  : legacyMonthly[0].settlementDate < row.date
                                    ? 'bg-gray-50 text-gray-700 ring-1 ring-inset ring-gray-600/20'
                                    : 'bg-slate-50 text-slate-600 ring-1 ring-inset ring-slate-500/20',
                              ].join(' ')}
                            >
                              {statusLabel(legacyMonthly[0].settlementDate > row.date ? 0 : 1)}
                            </span>
                          </td>
                          <td className="px-4 py-3">{takeDatePart(legacyMonthly[0].updateAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </SellerSidenavbar>
    </>
  );
}
