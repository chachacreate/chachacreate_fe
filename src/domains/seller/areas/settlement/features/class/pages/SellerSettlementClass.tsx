// src/domains/seller/settlement/SellerSettlementClass.tsx
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import Header from '@src/shared/areas/layout/features/header/Header';
import SellerSidenavbar from '@src/shared/areas/navigation/features/sidenavbar/seller/SellerSidenavbar';
import { CalendarDays, BarChart3, Image as ImageIcon } from 'lucide-react';
import { get } from '@src/libs/request';

// recharts: 일별 금액 바차트 표현
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

type Params = { storeUrl: string };

/** 드롭다운 옵션: 스토어 내 클래스 목록 */
type ClassOption = {
  id: number; // 클래스 ID
  name: string; // 클래스명(표시용)
};

/** 특정 클래스의 일별 정산 응답 */
type ClassDailySettlementResponse = {
  classId: number; // 클래스 ID
  className: string; // 클래스명
  thumbnailUrl: string | null; // 대표이미지 URL(없으면 null)
  daily: Array<{ date: string; amount: number }>; // 일별 결제금액 [{date, amount}]
};

/** 스토어 전체 클래스 "월별" 정산 목록의 한 행 */
type StoreMonthlySettlementItem = {
  settlementDate: string; // 서버 응답의 정산일자 (원본 유지)
  amount: number;
  account: string;
  bank: string;
  name: string | null;
  status: number; // 0=정산 예정, 1=정산 완료, 그 외=보류
  updateAt: string; // 최근 수정일
};

/** 로컬 기준으로 'YYYY-MM-DD' 생성 (toISOString 사용 금지: UTC 전환으로 하루 당김 방지) */
const fmtYMD = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

/** 'YYYY-MM-DD...' 형태면 앞 10자리, 아니면 Date 파싱 후 로컬 포맷으로 변환 */
const toDateOnly = (s: string) => {
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  const d = new Date(s);
  if (!isNaN(d.getTime())) return fmtYMD(d);
  return s; // 폴백
};

/** 문자열 날짜를 Date로 파싱 ( 'YYYY-MM-DD' 또는 'YYYY-MM-DDTHH:mm:ss' 모두 처리 ) */
const parseDate = (s: string) => new Date(`${s}${s.includes('T') ? '' : 'T00:00:00'}`);

/** d + n일 */
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

/** 주 시작(월요일)로 보정 */
const startOfWeekMon = (d: Date) => {
  const day = d.getDay(); // 0=일 ~ 6=토
  const diff = day === 0 ? -6 : 1 - day; // 월요일 기준
  return addDays(d, diff);
};

/** 통화 포맷(KRW) */
const KRW = new Intl.NumberFormat('ko-KR');
const fmtKRW = (v: number) => `₩ ${KRW.format(v)}`;

/** 상태 숫자 → 뱃지 텍스트 */
const statusText = (s?: number) => (s === 1 ? '정산 완료' : s === 0 ? '정산 예정' : '보류');

/** 상태 숫자 → 뱃지 CSS 클래스 */
const statusBadgeCls = (s?: number) =>
  s === 1
    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
    : s === 0
      ? 'bg-amber-50 text-amber-700 border-amber-200'
      : 'bg-rose-50 text-rose-700 border-rose-200';

/**
 * 임의의 날짜 문자열을 "다음달 1일 00:00:00"로 변환
 */
function toNextMonthFirstISO(input: string): string {
  // 연-월만 안전하게 추출(타임존 영향 제거)
  const m = input.match(/^(\d{4})-(\d{2})/);
  const make = (y: number, mon1to12: number) => {
    const nextY = mon1to12 === 12 ? y + 1 : y;
    const nextM = mon1to12 === 12 ? 1 : mon1to12 + 1;
    return `${nextY}-${String(nextM).padStart(2, '0')}-01T00:00:00`;
  };

  if (m) {
    const yyyy = Number(m[1]);
    const mm = Number(m[2]);
    return make(yyyy, mm);
  }

  // 예외 포맷 → Date 파싱 후 보정 (마지막 안전장치)
  const d = new Date(input);
  if (!isNaN(d.getTime())) {
    return make(d.getFullYear(), d.getMonth() + 1);
  }

  // 파싱 실패 시 원본 유지
  return input;
}

const BRAND = '#2d4739';

export default function SellerSettlementClass() {
  const { storeUrl } = useParams<Params>();

  // -------------------- 서버 상태: 드롭다운 --------------------
  const [options, setOptions] = useState<ClassOption[]>([]);
  const [optLoading, setOptLoading] = useState(false);
  const [optError, setOptError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  // -------------------- 서버 상태: 일별 정산(선택 클래스) --------------------
  const [daily, setDaily] = useState<ClassDailySettlementResponse | null>(null);
  const [dailyLoading, setDailyLoading] = useState(false);
  const [dailyError, setDailyError] = useState<string | null>(null);

  // -------------------- 서버 상태: 월별 정산(스토어 전체) --------------------
  const [monthlyRows, setMonthlyRows] = useState<StoreMonthlySettlementItem[]>([]);
  const [monthlyLoading, setMonthlyLoading] = useState(false);
  const [monthlyError, setMonthlyError] = useState<string | null>(null);

  /* 드롭다운: 스토어 내 클래스 목록 */
  useEffect(() => {
    if (!storeUrl) return;
    let alive = true;

    (async () => {
      setOptLoading(true);
      setOptError(null);
      try {
        const { data, status, message } = await get<ClassOption[]>(
          `/seller/settlements/classes/${encodeURIComponent(storeUrl)}/class-list`
        );

        if (!alive) return;
        if (status === 200) {
          const list = data ?? [];
          setOptions(list);
          if (list.length && selectedId == null) {
            setSelectedId(list[0].id); // 기본 선택
          }
        } else {
          setOptError(message || '클래스 목록 조회 실패');
        }
      } catch {
        if (alive) setOptError('클래스 목록을 불러오지 못했습니다.');
      } finally {
        if (alive) setOptLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [storeUrl]);

  /* 특정 클래스의 일별 정산 */
  useEffect(() => {
    if (!storeUrl || selectedId == null) {
      setDaily(null);
      return;
    }
    let alive = true;

    (async () => {
      setDailyLoading(true);
      setDailyError(null);
      try {
        const { data, status, message } = await get<ClassDailySettlementResponse>(
          `/seller/settlements/classes/${encodeURIComponent(storeUrl)}/${encodeURIComponent(
            selectedId
          )}`
        );

        if (!alive) return;
        if (status === 200) {
          setDaily(data ?? null);
        } else {
          setDailyError(message || '클래스 정산 데이터 조회 실패');
          setDaily(null);
        }
      } catch {
        if (alive) {
          setDailyError('클래스 정산 데이터를 불러오지 못했습니다.');
          setDaily(null);
        }
      } finally {
        if (alive) setDailyLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [storeUrl, selectedId]);

  /* 스토어 전체 클래스의 "월별" 정산 */
  useEffect(() => {
    if (!storeUrl) return;
    let alive = true;

    (async () => {
      setMonthlyLoading(true);
      setMonthlyError(null);
      try {
        const { data, status, message } = await get<StoreMonthlySettlementItem[]>(
          `/seller/settlements/classes/${encodeURIComponent(storeUrl)}/all`
        );

        if (!alive) return;
        if (status === 200) {
          setMonthlyRows(data ?? []);
        } else {
          setMonthlyError(message || '월별 정산 데이터 조회 실패');
          setMonthlyRows([]);
        }
      } catch {
        if (alive) setMonthlyError('월별 정산 데이터를 불러오지 못했습니다.');
      } finally {
        if (alive) setMonthlyLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [storeUrl]);

  /*  주간 차트: 기준 주(월~일)와 일별 합계 계산 */
  const [weekAnchor, setWeekAnchor] = useState<Date>(() => startOfWeekMon(new Date()));
  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekAnchor, i)),
    [weekAnchor]
  );

  const weeklyChartData = useMemo(() => {
    // 주간 합계 초기화
    const sumByDay: Record<string, number> = {};
    weekDays.forEach((d) => (sumByDay[fmtYMD(d)] = 0)); // 로컬 기준 키

    // 일별 정산 응답(daily.daily)이 로드된 경우: 현재 주에 해당하는 금액 합산
    if (daily?.daily?.length) {
      for (const r of daily.daily) {
        const key = r.date.length > 10 ? r.date.slice(0, 10) : r.date; // 'YYYY-MM-DD' 확보
        if (key in sumByDay) sumByDay[key] += r.amount;
      }
    }

    // 차트 바인딩(표시 label 포함)
    return weekDays.map((d) => ({
      date: fmtYMD(d),
      label: `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
      amount: sumByDay[fmtYMD(d)] || 0,
    }));
  }, [daily?.daily, weekDays]);

  const weeklyTotal = useMemo(
    () => weeklyChartData.reduce((acc, cur) => acc + cur.amount, 0),
    [weeklyChartData]
  );

  /* 정산 주기(한 달) 합계 */
  const cycleTotal = useMemo(() => {
    if (!daily?.daily?.length) return 0;

    // settlementDate 오름차순 정렬 후 가장 최근(마지막)
    const ordered = monthlyRows
      ?.slice()
      ?.sort((a, b) => (a.settlementDate > b.settlementDate ? 1 : -1));

    // 최근 월의 1일(원본 기준) → 그로부터 +1개월
    const lastStart = ordered?.length
      ? parseDate(ordered[ordered.length - 1].settlementDate)
      : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const next = new Date(lastStart.getFullYear(), lastStart.getMonth() + 1, lastStart.getDate());

    // 해당 범위에 포함되는 daily 금액 합산
    let sum = 0;
    for (const d0 of daily.daily) {
      const when = parseDate(d0.date);
      if (when >= lastStart && when < next) sum += d0.amount;
    }
    return sum;
  }, [daily?.daily, monthlyRows]);

  /* (추가) status가 0/1인 행만 표에 노출 */
  const filteredMonthlyRows = useMemo(
    () => monthlyRows.filter((r) => r?.status === 0 || r?.status === 1),
    [monthlyRows]
  );

  /* 렌더링 */
  return (
    <>
      <Header />

      <SellerSidenavbar>
        <div className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-6">
          {/* 타이틀/설명 */}
          <div className="flex flex-col gap-1">
            <h1 className="text-xl sm:text-2xl font-bold">클래스별 정산</h1>
            <p className="text-gray-600">
              클래스를 선택하면 대표 이미지 · 일별 매출 차트 · 정산 내역을 확인할 수 있어요.
            </p>
          </div>
          {/* 클래스 선택 영역 */}
          <div className="mt-4">
            <label htmlFor="class-select" className="block text-sm font-medium text-gray-700 mb-2">
              클래스 선택
            </label>

            {optLoading ? (
              <div className="h-11 flex items-center px-3 rounded-xl border border-gray-300 text-gray-500">
                클래스 목록 로딩 중…
              </div>
            ) : optError ? (
              <div className="h-11 flex items-center px-3 rounded-xl border border-rose-200 bg-rose-50 text-rose-700">
                {optError}
              </div>
            ) : options.length === 0 ? (
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 rounded-xl border border-dashed border-gray-300 p-4">
                <p className="text-gray-600">등록된 클래스가 없습니다.</p>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                <select
                  id="class-select"
                  value={selectedId ?? ''}
                  onChange={(e) => setSelectedId(Number(e.target.value))}
                  className="h-11 w-full sm:w-[360px] rounded-xl border border-gray-300 px-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#2d4739]/25 focus:border-[#2d4739]"
                >
                  {options.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.name}
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
                  {dailyLoading ? (
                    <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                      로딩 중…
                    </div>
                  ) : daily?.thumbnailUrl ? (
                    <img
                      src={daily.thumbnailUrl}
                      alt={daily.className}
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
                    <div className="text-sm text-gray-600">[{daily?.classId ?? selectedId}]</div>
                    <div className="text-lg font-semibold">
                      {daily?.className ?? options.find((o) => o.id === selectedId)?.name}
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

              {/* 주간 결제금액 바차트 */}
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
                  ) : dailyError ? (
                    <div className="h-full flex items-center justify-center text-rose-700 bg-rose-50 rounded-xl border border-rose-200">
                      {dailyError}
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={weeklyChartData}
                        margin={{ top: 8, right: 8, left: 0, bottom: 8 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="label" fontSize={12} />
                        <YAxis
                          tickFormatter={(v) => KRW.format(v)}
                          fontSize={12}
                          domain={[0, (dataMax: number) => dataMax * 1.2]}
                        />
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
          {/* 요약 카드: 정산 주기(한 달) 총 매출 / 이번주 매출 */}
          {!!selectedId && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 mt-6">
              <SummaryCard title="총 매출(정산 주기 한 달)" value={fmtKRW(cycleTotal)} />
              <SummaryCard title="이번주 매출" value={fmtKRW(weeklyTotal)} />
            </div>
          )}
          {/* 월별 정산 테이블(스토어 전체) */}
          <div className="mt-6 rounded-2xl border border-gray-200 bg-white overflow-x-auto">
            <div className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">정산 내역 (스토어 월별)</h2>
                <span className="text-sm text-gray-500">
                  {monthlyLoading
                    ? '로딩 중…'
                    : filteredMonthlyRows.length
                      ? `${filteredMonthlyRows.length}건`
                      : '데이터 없음'}
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
                  {monthlyError ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="py-8 text-center text-rose-700 bg-rose-50 border border-rose-200 rounded-xl"
                      >
                        {monthlyError}
                      </td>
                    </tr>
                  ) : monthlyLoading ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-gray-500">
                        로딩 중…
                      </td>
                    </tr>
                  ) : filteredMonthlyRows.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-gray-500">
                        정산 데이터가 없습니다
                      </td>
                    </tr>
                  ) : (
                    filteredMonthlyRows.map((s, idx) => (
                      <tr key={`${s.settlementDate}-${idx}`} className="border-t border-gray-100">
                        {/* 표시 시점에만 '다음달 1일'로 변환 → 로컬 YYYY-MM-DD로 노출 */}
                        <td className="py-3 pr-4">
                          {toDateOnly(toNextMonthFirstISO(s.settlementDate))}
                        </td>

                        <td className="py-3 pr-4">{fmtKRW(s.amount)}</td>
                        <td className="py-3 pr-4">{s.account}</td>
                        <td className="py-3 pr-4">{s.bank}</td>
                        <td className="py-3 pr-4">{s.name ?? '—'}</td>
                        <td className="py-3 pr-4">
                          <span
                            className={[
                              'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium border',
                              statusBadgeCls(s.status),
                            ].join(' ')}
                          >
                            {statusText(s.status)}
                          </span>
                        </td>
                        {/* 최근 수정일은 원본 기준의 날짜부만 노출(표시만 로컬 YYYY-MM-DD) */}
                        <td className="py-3 pr-4">{toDateOnly(s.updateAt)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </SellerSidenavbar>
    </>
  );
}

/* 서브 컴포넌트: 요약 카드(타이틀/값/아이콘) */
function SummaryCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm text-gray-600">{title}</div>
          <div className="mt-1 text-xl font-bold">{value}</div>
        </div>
        <div className="rounded-xl border p-2" style={{ borderColor: '#e5e7eb', color: BRAND }}>
          <BarChart3 className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}
