// src/domains/seller/areas/class/features/reservation/pages/ClassReservation.tsx
import type { FC } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import Header from '@src/shared/areas/layout/features/header/Header';
import SellerSidenavbar from '@src/shared/areas/navigation/features/sidenavbar/seller/SellerSidenavbar';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { get } from '@src/libs/request';

/** ============ 타입 ============ */
type Params = { storeUrl: string };

/** /classes/reservation 응답 DTO */
type ReservationItemDTO = {
  reservedDate: string; // "YYYY-MM-DD"
  className: string;
  reservedTime: string; // "HH:mm"
  reserverName: string;
  reserverPhone: string;
  paymentAmount: number;
  status: 'ORDER_OK' | 'CANCEL_RQ' | 'CANCEL_OK' | string;
  updatedAt: string; // ISO
};
type ReservationListDTO = {
  storeUrl: string;
  yearMonth: string | null;
  items: ReservationItemDTO[];
};

/** 공통 Envelope */
type Envelope<T> = { status: number; message?: string; data: T };
function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}
function unwrapData<T>(res: unknown): T {
  if (isObject(res) && 'data' in res) {
    const inner = (res as { data: unknown }).data;
    if (isObject(inner) && 'data' in inner && 'status' in inner) {
      return (inner as Envelope<T>).data;
    }
    return inner as T;
  }
  if (isObject(res) && 'data' in res && 'status' in res) {
    return (res as Envelope<T>).data;
  }
  return res as T;
}

/** ============ 뷰 모델 ============ */
type ReservationRow = {
  id: string;
  date: string; // YYYY-MM-DD
  classId: string; // 실제 id가 없으므로 className을 id로 사용
  className: string;
  time: string; // HH:mm
  customerName: string;
  customerPhone: string;
  paymentMethod: string; // API에 없어서 "-" 고정
  amount: number;
  status: '예약완료' | '취소요청' | '취소완료';
  updatedAt: string; // YYYY-MM-DD
};

type ChartRow = { key: string; count: number };

const KRW = new Intl.NumberFormat('ko-KR');
const BRAND = '#2D4739';

/** ============ 유틸 ============ */
function mapStatus(api: ReservationItemDTO['status']): ReservationRow['status'] {
  switch (api) {
    case 'ORDER_OK':
      return '예약완료';
    case 'CANCEL_RQ':
      return '취소요청';
    case 'CANCEL_OK':
      return '취소완료';
    default:
      return '예약완료';
  }
}
function pad2(n: number) {
  return String(n).padStart(2, '0');
}
function weekdayKorean(d: Date) {
  return ['일', '월', '화', '수', '목', '금', '토'][d.getDay()];
}

/** ============ 컴포넌트 ============ */
const ClassReservation: FC = () => {
  const { storeUrl = '' } = useParams<Params>();

  // 로딩/에러
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // 데이터 상태
  const [reservations, setReservations] = useState<ReservationRow[]>([]);

  // 모달(취소요청 행)
  const [cancelTarget, setCancelTarget] = useState<ReservationRow | null>(null);

  // 컨트롤 상태 (UI 유지)
  const [globalMode, setGlobalMode] = useState<'hour' | 'weekday'>('hour');
  const [classMode, setClassMode] = useState<'hour' | 'weekday'>('hour');
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`; // e.g. "2025-09"
  });
  const [selectedClass, setSelectedClass] = useState<string>('ALL');
  const [tableClassFilter, setTableClassFilter] = useState<string>('ALL');

  // 초기 데이터 패치
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setIsLoading(true);
        setLoadError(null);

        const listRes = await get<ReservationListDTO | Envelope<ReservationListDTO>>(
          `/seller/${encodeURIComponent(storeUrl)}/classes/reservation`
        );

        // 예약 리스트
        const list = unwrapData<ReservationListDTO>(listRes);
        const mappedRows: ReservationRow[] = (list.items || []).map((it, i) => ({
          id: String(i + 1),
          date: it.reservedDate,
          classId: it.className, // 실제 id 없음 → 이름으로 대체
          className: it.className,
          time: it.reservedTime,
          customerName: it.reserverName,
          customerPhone: it.reserverPhone,
          paymentMethod: '-', // API 없음
          amount: it.paymentAmount,
          status: mapStatus(it.status),
          updatedAt: (it.updatedAt || '').slice(0, 10),
        }));

        if (!alive) return;
        setReservations(mappedRows);

        // selectedMonth를 데이터에 맞춰 자동 보정(최초 1회)
        if (mappedRows.length > 0) {
          const ym = mappedRows[0].date?.slice(0, 7);
          if (ym) setSelectedMonth(ym);
        }
      } catch (e) {
        if (!alive) return;
        setLoadError(e instanceof Error ? e.message : '데이터를 불러오지 못했어요.');
      } finally {
        if (alive) setIsLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [storeUrl]);

  // 클래스 옵션 (API에 classId가 없으니 className 중복 제거)
  const classOptions = useMemo(() => {
    const set = new Set<string>();
    reservations.forEach((r) => set.add(r.className));
    return [{ id: 'ALL', name: '전체' }].concat(
      Array.from(set).map((name) => ({ id: name, name }))
    );
  }, [reservations]);

  // 표 필터링
  const filteredReservations = useMemo(() => {
    return reservations.filter((r) => {
      const monthOk = r.date.startsWith(selectedMonth);
      const classOk = tableClassFilter === 'ALL' || r.className === tableClassFilter;
      return monthOk && classOk;
    });
  }, [reservations, selectedMonth, tableClassFilter]);

  /** --------- 차트 데이터 빌더 (월 단위 기준) --------- */
  // 시간별 집계: 월 전체 00~23시
  const buildHourData = (data: ReservationRow[]) => {
    const hours = Array.from({ length: 24 }, (_, i) => `${pad2(i)}:00`);
    const map = new Map<string, number>(hours.map((h) => [h, 0]));
    data.forEach((r) => {
      if (!r.date.startsWith(selectedMonth)) return;
      const hh = `${r.time.slice(0, 2)}:00`;
      map.set(hh, (map.get(hh) ?? 0) + 1);
    });
    return hours.map((h) => ({ key: h, count: map.get(h) ?? 0 }));
  };

  // 요일별 집계: 월 전체 월~일
  const buildWeekdayData = (data: ReservationRow[]) => {
    const buckets = new Map<string, number>([
      ['월', 0],
      ['화', 0],
      ['수', 0],
      ['목', 0],
      ['금', 0],
      ['토', 0],
      ['일', 0],
    ]);
    data.forEach((r) => {
      if (!r.date.startsWith(selectedMonth)) return;
      const d = new Date(`${r.date}T00:00:00`);
      const w = weekdayKorean(d); // 일~토
      buckets.set(w, (buckets.get(w) ?? 0) + 1);
    });
    const order = ['월', '화', '수', '목', '금', '토', '일'];
    return order.map((k) => ({ key: k, count: buckets.get(k) ?? 0 }));
  };

  /** --------- 전체 통계 차트 데이터 --------- */
  const globalData: ChartRow[] = useMemo(() => {
    if (globalMode === 'hour') return buildHourData(reservations);
    return buildWeekdayData(reservations); // 월 단위 요일 집계
  }, [globalMode, reservations, selectedMonth]);

  /** --------- 클래스별 통계 차트 데이터 --------- */
  const classData: ChartRow[] = useMemo(() => {
    const target =
      selectedClass === 'ALL'
        ? reservations
        : reservations.filter((r) => r.className === selectedClass);

    if (classMode === 'hour') return buildHourData(target);
    return buildWeekdayData(target); // 월 단위 요일 집계
  }, [classMode, reservations, selectedClass, selectedMonth]);

  // 행 클릭(취소요청만 모달)
  const onRowClick = (r: ReservationRow) => {
    if (r.status === '취소요청') setCancelTarget(r);
  };
  const confirmCancel = () => {
    if (!cancelTarget) return;
    const today = new Date().toISOString().slice(0, 10);
    setReservations((prev) =>
      prev.map((x) =>
        x.id === cancelTarget.id ? { ...x, status: '취소완료', updatedAt: today } : x
      )
    );
    setCancelTarget(null);
  };
  const closeModal = () => setCancelTarget(null);

  return (
    <>
      {/* 반짝 효과 */}
      <style>{`
        @keyframes shimmer-rose {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .tr-rose-shimmer {
          background: linear-gradient(
            90deg,
            rgba(254, 226, 226, 0.55) 0%,
            rgba(254, 202, 202, 0.95) 50%,
            rgba(254, 226, 226, 0.55) 100%
          );
          background-size: 200% 100%;
          animation: shimmer-rose 2.4s linear infinite;
        }
      `}</style>

      <Header />

      <SellerSidenavbar>
        <div className="space-y-8 pb-12">
          {/* 로딩/에러 */}
          {isLoading && (
            <div className="rounded-2xl border bg-white p-6 text-sm text-gray-700">
              불러오는 중...
            </div>
          )}
          {loadError && !isLoading && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
              {loadError}
            </div>
          )}

          {!isLoading && !loadError && (
            <>
              {/* 🔼 월 선택: 페이지 최상단 공통 컨트롤로 이동 */}
              <div className="rounded-2xl border bg-white px-4 sm:px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <label className="text-xs sm:text-sm text-gray-600">월 선택</label>
                  <input
                    type="month"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="border rounded-md px-3 py-1.5 text-xs sm:text-sm"
                  />
                </div>
              </div>

              {/* 전체 클래스 예약 통계 */}
              <section className="rounded-2xl border bg-white">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 px-4 sm:px-6 py-4 border-b">
                  <h2 className="text-base sm:text-lg font-semibold">전체 클래스 예약 통계</h2>
                  <div className="flex items-center gap-4">
                    {/* 요일별은 월 단위 집계이므로 week 입력 숨김 */}
                    <div className="bg-gray-100 rounded-md p-1 inline-flex">
                      <button
                        type="button"
                        onClick={() => setGlobalMode('hour')}
                        className={[
                          'px-3 py-1.5 rounded text-xs sm:text-sm',
                          globalMode === 'hour' ? 'bg-white shadow' : 'text-gray-600',
                        ].join(' ')}
                      >
                        시간별 (24시간)
                      </button>
                      <button
                        type="button"
                        onClick={() => setGlobalMode('weekday')}
                        className={[
                          'px-3 py-1.5 rounded text-xs sm:text-sm',
                          globalMode === 'weekday' ? 'bg-white shadow' : 'text-gray-600',
                        ].join(' ')}
                      >
                        요일별 (월 단위)
                      </button>
                    </div>
                  </div>
                </div>

                <div className="p-3 sm:p-6 h-[280px] sm:h-[360px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={globalData} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="key"
                        tick={{ fontSize: 12 }}
                        interval={globalMode === 'hour' ? 1 : 0}
                      />
                      <YAxis
                        tick={{ fontSize: 12 }}
                        domain={[0, (dataMax: number) => dataMax * 1.2]}
                      />
                      <Tooltip formatter={(v: number) => [`${v} 건`, '예약 건수']} />
                      <Legend />
                      <Bar dataKey="count" name="예약 건수" fill={BRAND} radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </section>

              {/* 클래스별 예약 통계 */}
              <section className="rounded-2xl border bg-white">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 px-4 sm:px-6 py-4 border-b">
                  <div className="flex items-center gap-4">
                    <h2 className="text-base sm:text-lg font-semibold">클래스별 예약 통계</h2>
                    <div className="flex items-center gap-2">
                      <select
                        value={selectedClass}
                        onChange={(e) => setSelectedClass(e.target.value)}
                        className="border rounded-md px-3 py-1.5 text-xs sm:text-sm"
                      >
                        {classOptions.map((option) => (
                          <option key={option.id} value={option.id}>
                            {option.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {/* 요일별은 월 단위 집계이므로 week 입력 숨김 */}
                    <div className="bg-gray-100 rounded-md p-1 inline-flex">
                      <button
                        type="button"
                        onClick={() => setClassMode('hour')}
                        className={[
                          'px-3 py-1.5 rounded text-xs sm:text-sm',
                          classMode === 'hour' ? 'bg-white shadow' : 'text-gray-600',
                        ].join(' ')}
                      >
                        시간별
                        <br />
                        (24시간)
                      </button>
                      <button
                        type="button"
                        onClick={() => setClassMode('weekday')}
                        className={[
                          'px-3 py-1.5 rounded text-xs sm:text-sm',
                          classMode === 'weekday' ? 'bg-white shadow' : 'text-gray-600',
                        ].join(' ')}
                      >
                        요일별
                        <br />
                        (월 단위)
                      </button>
                    </div>
                  </div>
                </div>

                <div className="p-3 sm:p-6 h-[280px] sm:h-[360px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={classData} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="key"
                        tick={{ fontSize: 12 }}
                        interval={classMode === 'hour' ? 1 : 0}
                      />
                      <YAxis
                        tick={{ fontSize: 12 }}
                        domain={[0, (dataMax: number) => dataMax * 1.2]}
                      />
                      <Tooltip formatter={(v: number) => [`${v} 건`, '예약 건수']} />
                      <Legend />
                      <Bar dataKey="count" name="예약 건수" fill="#82ca9d" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </section>

              {/* 클래스 예약 확인 테이블 */}
              <section className="rounded-2xl border bg-white">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between px-4 sm:px-6 py-4 border-b gap-3">
                  <h2 className="text-base sm:text-lg font-semibold">클래스 예약 확인</h2>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <label className="text-xs sm:text-sm text-gray-600">클래스 필터</label>
                      <select
                        value={tableClassFilter}
                        onChange={(e) => setTableClassFilter(e.target.value)}
                        className="border rounded-md px-3 py-1.5 text-xs sm:text-sm"
                      >
                        {classOptions.map((option) => (
                          <option key={option.id} value={option.id}>
                            {option.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    {/* ⬇️ 월 선택 입력은 상단 공통 바로 이동했으므로 제거됨 */}
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w=[960px] text-xs sm:text-xs">
                    <thead className="bg-gray-50 text-gray-600 text-xs">
                      <tr>
                        <th className="px-3 py-3 text-center w-1/12">예약 일자</th>
                        <th className="px-3 py-3 text-center w-2/12">클래스명</th>
                        <th className="px-3 py-3 text-center w-1/12">예약 시간</th>
                        <th className="px-3 py-3 text-center w-1/12">예약자명</th>
                        <th className="px-3 py-3 text-center w-2/12">연락처</th>
                        <th className="px-3 py-3 text-center w-1/12">결제 금액</th>
                        <th className="px-3 py-3 text-center w-1/12">예약 상태</th>
                        <th className="px-3 py-3 text-center w-1/12 word-break">상태 수정일</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredReservations.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="px-3 py-8 text-center text-gray-500">
                            선택한 조건에 해당하는 예약이 없습니다.
                          </td>
                        </tr>
                      ) : (
                        filteredReservations.map((r) => {
                          const isCancelReq = r.status === '취소요청';
                          return (
                            <tr
                              key={`${r.id}-${r.updatedAt}`}
                              onClick={() => onRowClick(r)}
                              className={[
                                'border-t border-gray-100',
                                isCancelReq ? 'tr-rose-shimmer cursor-pointer' : '',
                                !isCancelReq ? 'hover:bg-gray-50' : '',
                              ].join(' ')}
                              title={isCancelReq ? '클릭하여 취소 처리' : undefined}
                            >
                              <td className="px-3 py-3 text-center">{r.date}</td>
                              <td className="px-3 py-3 text-center">{r.className}</td>
                              <td className="px-3 py-3 text-center">{r.time}</td>
                              <td className="px-3 py-3 text-center">{r.customerName}</td>
                              <td className="px-3 py-3 text-center">{r.customerPhone}</td>
                              <td className="px-3 py-3 text-right">₩ {KRW.format(r.amount)}</td>
                              <td className="px-3 py-3 text-center">
                                {r.status === '예약완료' && (
                                  <span className="px-2 py-1 rounded-full text-xs bg-emerald-100 text-emerald-700">
                                    예약완료
                                  </span>
                                )}
                                {r.status === '취소요청' && (
                                  <span className="px-2 py-1 rounded-full text-xs bg-rose-100 text-rose-700">
                                    취소요청
                                  </span>
                                )}
                                {r.status === '취소완료' && (
                                  <span className="px-2 py-1 rounded-full text-xs bg-rose-200 text-rose-800">
                                    취소완료
                                  </span>
                                )}
                              </td>
                              <td className="px-3 py-3 text-center">{r.updatedAt}</td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {filteredReservations.length > 0 && (
                  <div className="px-4 sm:px-6 py-3 border-t bg-gray-50 text-xs sm:text-sm text-gray-600">
                    총 {filteredReservations.length}건 | 총 금액: ₩{' '}
                    {KRW.format(filteredReservations.reduce((sum, r) => sum + r.amount, 0))}
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      </SellerSidenavbar>

      {/* 취소 확인 모달 */}
      {cancelTarget && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40">
          <div className="w-full max-w-[520px] rounded-xl overflow-hidden bg-white shadow-2xl">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <h4 className="font-semibold">예약 취소 처리</h4>
              <button className="text-gray-500" onClick={closeModal}>
                ×
              </button>
            </div>
            <div className="p-4 space-y-3">
              <p className="text-sm text-gray-700">
                아래 예약을 <span className="font-semibold text-rose-700">취소 처리</span>
                하시겠습니까?
              </p>
              <div className="rounded-lg border bg-gray-50 p-3 text-sm text-gray-700">
                <div>
                  예약번호: <span className="font-mono">{cancelTarget.id}</span>
                </div>
                <div>
                  클래스: {cancelTarget.className} ({cancelTarget.classId})
                </div>
                <div>
                  일시: {cancelTarget.date} {cancelTarget.time}
                </div>
                <div>
                  예약자: {cancelTarget.customerName} · {cancelTarget.customerPhone}
                </div>
                <div>
                  결제: {cancelTarget.paymentMethod} · ₩ {KRW.format(cancelTarget.amount)}
                </div>
              </div>
            </div>
            <div className="p-4 border-t flex flex-col sm:flex-row gap-2 sm:justify-end">
              <button
                onClick={confirmCancel}
                className="px-4 py-2 rounded-md bg-[#2D4739] text-white font-medium hover:opacity-90"
              >
                취소 처리
              </button>
              <button
                onClick={closeModal}
                className="px-4 py-2 rounded-md border font-medium hover:bg-gray-50"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ClassReservation;
