import { useEffect, useMemo, useState, useCallback, memo, useRef, type FormEvent } from 'react';
import { Search, X, CalendarDays, MapPin, Clock, Ticket, ChevronLeft } from 'lucide-react';

import Header from '@src/shared/areas/layout/features/header/Header';
import Mainnavbar from '@src/shared/areas/navigation/features/navbar/main/Mainnavbar';
import MypageSidenavbar from '@src/shared/areas/navigation/features/sidenavbar/mypage/MypageSidenavbar';
import { get } from '@src/libs/request';

// 서버 DTO 타입 (백엔드 응답 규격)
type ClassReservationSummaryResponseDTO = {
  classId: number;
  reservationNumber: string;
  image: string | null;
  status: string;
  reservedTime: string;
  classTitle: string;
  addressRoad: string;
  storeName: string;
  storeId: number;
  storeUrl: string;
  displayStatus: string;
};

// 서버 응답 래퍼 타입
type ApiEnvelope = {
  status: number;
  message: string;
  data: ClassReservationSummaryResponseDTO[] | null;
};

// UI 모델 타입
type ResvStatus = 'all' | 'upcoming' | 'past' | 'canceled';

type Reservation = {
  reservationNo: string;
  title: string;
  host: string;
  date: string;
  time: string;
  reservedAt: number;
  location: string;
  status: 'upcoming' | 'past' | 'canceled';
  thumbnail?: string | null;
  storeId: number;
  storeUrl: string;
  classId: number;
};

// 브랜드 컬러
const BRAND = '#2d4739';

/** 이미지 없을 때 보여줄 placeholder (SVG data URI) */
const PLACEHOLDER =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480">
       <rect width="100%" height="100%" fill="#f3f4f6"/>
       <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle"
             fill="#9ca3af" font-family="sans-serif" font-size="16">
         No Image
       </text>
     </svg>`
  );

// 예약 내역 API 엔드포인트
const RESV_ENDPOINT = '/mypage/classes';

/** 날짜/시간 유틸 */
const toDate = (iso?: string) => (iso ? iso.slice(0, 10) : '');
const toTime = (iso?: string) => {
  if (!iso) return '-';
  const d = new Date(iso);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
};
const toTs = (iso?: string) => (iso ? new Date(iso).getTime() : 0);

/** UI 필터 → 서버 파라미터 변환 */
const toApiFilter = (ui: ResvStatus): string => {
  switch (ui) {
    case 'all':
      return 'ALL';
    case 'upcoming':
      return 'UPCOMING';
    case 'past':
      return 'PAST';
    case 'canceled':
      return 'CANCELED';
    default:
      return 'ALL';
  }
};

/** 필터 라벨 (빈 상태 문구용) */
const filterLabel = (ui: ResvStatus) => {
  switch (ui) {
    case 'all':
      return '전체';
    case 'upcoming':
      return '예정';
    case 'past':
      return '지난';
    case 'canceled':
      return '취소';
  }
};

/** 서버 status/displayStatus → UI status 변환 */
const mapStatus = (
  displayStatus?: string,
  status?: string,
  reservedTime?: string
): Reservation['status'] => {
  const disp = (displayStatus ?? '').toUpperCase();
  if (disp.includes('CANCEL')) return 'canceled';
  if (disp === 'UPCOMING') return 'upcoming';
  if (disp === 'PAST') return 'past';

  const raw = (status ?? '').toUpperCase();
  if (raw.includes('CANCEL')) return 'canceled';

  const today = toDate(new Date().toISOString());
  const date = toDate(reservedTime);
  if (date && date < today) return 'past';
  return 'upcoming';
};

/** 서버 DTO → UI 모델 변환 */
const adapt = (dto: ClassReservationSummaryResponseDTO): Reservation => ({
  reservationNo: dto.reservationNumber,
  title: dto.classTitle ?? '(제목 없음)',
  host: dto.storeName ?? '-',
  date: toDate(dto.reservedTime),
  time: toTime(dto.reservedTime),
  reservedAt: toTs(dto.reservedTime),
  location: dto.addressRoad ?? '-',
  status: mapStatus(dto.displayStatus, dto.status, dto.reservedTime),
  thumbnail: dto.image ?? null,
  storeId: dto.storeId,
  storeUrl: dto.storeUrl,
  classId: dto.classId,
});

// 검색바 (독립 컴포넌트)
type SearchBarProps = {
  defaultValue?: string;
  onSubmit: (keyword: string) => void;
  onClear?: () => void;
};

const SearchBar = memo(function SearchBar({
  defaultValue = '',
  onSubmit,
  onClear,
}: SearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [localQ, setLocalQ] = useState(defaultValue);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalQ(e.target.value);
  };

  const handleReset = () => {
    setLocalQ('');
    onClear?.();
    inputRef.current?.focus();
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit(localQ.trim());
  };

  return (
    <form
      onSubmit={handleSubmit}
      onKeyDownCapture={(e) => e.stopPropagation()}
      className="relative w-full mt-4"
    >
      <label htmlFor="myclass-search" className="sr-only">
        클래스 검색
      </label>

      <input
        ref={inputRef}
        id="myclass-search"
        type="text"
        value={localQ}
        onChange={handleChange}
        placeholder="클래스명, 예약번호(예: RV-20250101-0000)"
        className={[
          'w-full h-11 rounded-xl border px-4 pr-24 font-jua',
          'text-gray-900 placeholder:text-gray-400',
          'border-gray-300 focus:outline-none',
          'focus:ring-2 focus:ring-[#2d4739]/25 focus:border-[#2d4739]',
          'relative',
        ].join(' ')}
        autoComplete="off"
        spellCheck={false}
        autoCorrect="off"
      />

      {localQ && (
        <button
          type="button"
          onClick={handleReset}
          aria-label="검색어 지우기"
          className="absolute right-24 top-1/2 -translate-y-1/2 p-2 rounded-md hover:bg-gray-100 active:scale-95 z-10"
        >
          <X className="w-4 h-4" />
        </button>
      )}

      <button
        type="submit"
        className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-2 rounded-lg text-white text-sm font-jua font-medium active:scale-95 z-10"
        style={{ backgroundColor: BRAND }}
      >
        <span className="inline-flex items-center gap-1">
          <Search className="w-4 h-4" />
          검색
        </span>
      </button>
    </form>
  );
});

// 페이지 컴포넌트
export default function MainMypageClassesPage() {
  const [submittedQ, setSubmittedQ] = useState('');
  const [statusFilter, setStatusFilter] = useState<ResvStatus>('all');

  const [items, setItems] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [unauthorized, setUnauthorized] = useState(false);

  const fetchReservations = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      setUnauthorized(false);

      const params: Record<string, string> = {};
      const filterVal = toApiFilter(statusFilter);
      if (filterVal) params.filter = filterVal;
      if (submittedQ) params.q = submittedQ;

      const res = await get<unknown>(RESV_ENDPOINT, params);

      if ((res as any).status === 401) {
        setUnauthorized(true);
        setItems([]);
        return;
      }

      const body = (res as any).data;
      let raw: ClassReservationSummaryResponseDTO[] = [];

      if (Array.isArray(body)) {
        raw = body;
      } else if (body && typeof body === 'object') {
        const env = body as Partial<ApiEnvelope>;
        if (env.status === 401) {
          setUnauthorized(true);
          setItems([]);
          return;
        }
        raw = Array.isArray(env.data) ? env.data : [];
      } else {
        raw = [];
      }

      const list = raw.map(adapt);

      const sorted = [...list].sort((a, b) => {
        if (a.status === 'upcoming' && b.status !== 'upcoming') return -1;
        if (a.status !== 'upcoming' && b.status === 'upcoming') return 1;
        return a.status === 'upcoming'
          ? a.reservedAt - b.reservedAt
          : b.reservedAt - a.reservedAt;
      });

      setItems(sorted);
    } catch (e: any) {
      const httpStatus = e?.response?.status;
      if (httpStatus === 401) {
        setUnauthorized(true);
        setItems([]);
        return;
      }
      setErrorMsg(e?.message ?? '예약 내역 조회 중 오류가 발생했습니다.');
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReservations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submittedQ, statusFilter]);

  const handleSearchSubmit = useCallback((keyword: string) => {
    setSubmittedQ(keyword);
  }, []);

  const handleSearchClear = useCallback(() => {
    setSubmittedQ('');
  }, []);

  const filtered = useMemo(() => {
    const base = items.filter((r) => {
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      if (!submittedQ) return true;
      const needle = submittedQ.toLowerCase();
      return (
        r.title.toLowerCase().includes(needle) ||
        r.host.toLowerCase().includes(needle) ||
        r.date.includes(needle) ||
        r.reservationNo.toLowerCase().includes(needle) ||
        r.time.toLowerCase().includes(needle)
      );
    });
    return [...base].sort((a, b) => {
      if (a.status === 'upcoming' && b.status !== 'upcoming') return -1;
      if (a.status !== 'upcoming' && b.status === 'upcoming') return 1;
      return a.status === 'upcoming'
        ? a.reservedAt - b.reservedAt
        : b.reservedAt - a.reservedAt;
    });
  }, [items, submittedQ, statusFilter]);

  const emptyText = `${filterLabel(statusFilter)} 클래스 내역이 존재하지 않습니다`;

  /** ✅ 공통 본문 (모바일/데스크탑에서 재사용) */
  const ContentBody = () => (
    <>
      {/* 검색바 */}
      <SearchBar
        defaultValue={submittedQ}
        onSubmit={handleSearchSubmit}
        onClear={handleSearchClear}
      />

      {/* 상태 필터 */}
      <div className="mt-3 flex flex-wrap gap-2">
        {[
          { key: 'all', label: '전체' },
          { key: 'upcoming', label: '예정' },
          { key: 'past', label: '지난' },
          { key: 'canceled', label: '취소' },
        ].map(({ key, label }) => {
          const active = statusFilter === key;
          return (
            <button
              key={key}
              onClick={() => setStatusFilter(key as ResvStatus)}
              className={[
                'px-3 py-1.5 rounded-full text-sm border transition font-jua',
                active
                  ? 'text-white border-transparent'
                  : 'text-gray-700 border-gray-300 bg-white hover:bg-gray-50',
              ].join(' ')}
              style={active ? { backgroundColor: BRAND } : undefined}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* 결과 개수/안내 */}
      <div className="mt-2 text-sm text-gray-600 font-jua">
        {submittedQ ? (
          <>
            검색어: <span className="font-medium">{submittedQ}</span> • 결과 {filtered.length}건
          </>
        ) : (
          <span>총 {filtered.length}건</span>
        )}
      </div>

      {/* 안내 메시지들 */}
      {loading && <div className="mt-3 text-gray-500 font-jua">불러오는 중…</div>}

      {errorMsg && (
        <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 p-3 text-rose-700 font-jua">
          {errorMsg}
        </div>
      )}

      {unauthorized && !loading && !errorMsg && (
        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-700 font-jua">
          로그인 후 예약 내역을 확인할 수 있습니다.
        </div>
      )}

      {/* 결과 카드 그리드 + 빈 상태 */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {!loading && !errorMsg && filtered.length === 0 ? (
          <div className="col-span-full rounded-xl border border-dashed border-gray-300 p-8 text-center text-gray-500">
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <CalendarDays className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="font-medium text-gray-900 mb-1 font-jua">{emptyText}</h3>
              <p className="text-sm font-jua">검색 조건을 바꾸거나, 다른 상태를 선택해 보세요.</p>
            </div>
          </div>
        ) : (
          filtered.map((r) => (
            <article
              key={r.reservationNo}
              className="rounded-xl border border-gray-200 bg-white overflow-hidden flex flex-col"
            >
              {/* 썸네일 */}
              <a href={`/main/classes/${r.classId}`} className="block aspect-[16/9] bg-gray-100">
                <img
                  src={r.thumbnail || PLACEHOLDER}
                  alt={r.title}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </a>

              {/* 카드 본문 */}
              <div className="p-4 flex flex-col gap-2">
                {/* 상태 뱃지 + 제목 */}
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={[
                      'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium font-jua',
                      r.status === 'upcoming'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : r.status === 'past'
                        ? 'bg-gray-100 text-gray-700 border border-gray-200'
                        : 'bg-rose-50 text-rose-700 border border-rose-200',
                    ].join(' ')}
                  >
                    {r.status === 'upcoming' ? '예정' : r.status === 'past' ? '지난' : '취소'}
                  </span>
                  <h3 className="text-base sm:text-lg font-semibold truncate font-jua">{r.title}</h3>
                </div>

                {/* 호스트 / 주소 */}
                <div className="text-sm text-gray-600 font-jua">
                  호스트 <span className="font-medium">{r.host}</span>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-sm text-gray-700 font-jua">
                  <span className="inline-flex items-center gap-1">
                    <CalendarDays className="w-4 h-4" />
                    {r.date}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    {r.location}
                  </span>
                </div>

                {/* 시간 / 예약번호 */}
                <div className="flex flex-wrap items-center gap-3 text-sm text-gray-700 font-jua">
                  <span className="inline-flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {r.time}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Ticket className="w-4 h-4" />
                    {r.reservationNo}
                  </span>
                </div>

                {/* 액션 */}
                <div className="mt-3 flex gap-2">
                  {r.status === 'upcoming' ? (
                    <>
                      <a
                        href={`/main/classes/${r.classId}`}
                        className="flex-1 h-9 rounded-lg text-white text-sm font-medium grid place-items-center hover:opacity-95 active:scale-95 transition font-jua"
                        style={{ backgroundColor: BRAND }}
                      >
                        상세 보기
                      </a>
                      <button
                        className="flex-1 h-9 rounded-lg border text-sm font-medium hover:bg-gray-50 active:scale-95 transition font-jua"
                      >
                        예약 취소
                      </button>
                    </>
                  ) : (
                    <a
                      href={`/main/classes/${r.classId}`}
                      className="w-full h-9 rounded-lg text-white text-sm font-medium grid place-items-center hover:opacity-95 active:scale-95 transition font-jua"
                      style={{ backgroundColor: BRAND }}
                    >
                      다시 예약
                    </a>
                  )}
                </div>
              </div>
            </article>
          ))
        )}
      </div>
    </>
  );

  return (
    <div
      className="min-h-screen font-jua"
      style={{ background: 'linear-gradient(135deg,#f8fafc 0%,#f1f5f9 100%)' }}
    >
      <Header />
      <Mainnavbar />

      {/* 📱 모바일: 사이드 그리드 숨기고, 독립 페이지처럼 렌더 */}
      <div className="lg:hidden">
        {/* 상단 고정 바 */}
        <div className="sticky top-0 z-50 bg-white border-b border-gray-200">
          <div className="px-4 py-3 flex items-center gap-3">
            <button
              type="button"
              onClick={() => (history.length > 1 ? history.back() : (window.location.href = '/main/mypage'))}
              className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-white border border-gray-200 shadow-sm hover:bg-gray-50 active:scale-95 transition-all"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-bold text-gray-900">클래스 예약 조회</h1>
            <div className="flex-1" />
          </div>
        </div>

        {/* 본문 */}
        <div className="px-4 py-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-4">
            <ContentBody />
          </div>
        </div>

        {/* 하단 여백 (고정 버튼 자리 확보 필요 시) */}
        <div className="pb-6" />
      </div>

      {/* 🖥️ 데스크톱: 기존 사이드 내비 + 콘텐츠 */}
      <div className="hidden lg:block">
        <MypageSidenavbar>
          <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
            {/* 데스크톱 헤더 영역 */}
            <div className="bg-gradient-to-r from-[#2d4739] to-gray-800 px-6 md:px-8 py-5 md:py-6">
              <h2 className="text-xl md:text-2xl text-white mb-1.5 md:mb-2 font-jua">클래스 예약 조회</h2>
              <p className="text-gray-200 text-xs md:text-sm font-jua">
                신청한 클래스와 예약 내역을 검색/필터로 빠르게 찾아보세요
              </p>
            </div>

            {/* 데스크톱 본문 */}
            <div className="p-6">
              <ContentBody />
            </div>
          </div>
        </MypageSidenavbar>
      </div>
    </div>
  );
}
