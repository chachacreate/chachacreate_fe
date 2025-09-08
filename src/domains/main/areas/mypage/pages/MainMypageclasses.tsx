import { useEffect, useMemo, useState, useCallback, memo, useRef, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Search, X, CalendarDays, MapPin, Clock, Ticket } from 'lucide-react';

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

// UI 모델 타입
type Reservation = {
  reservationNo: string;  // 예약번호 (React key로도 사용)
  title: string;          // classTitle
  host: string;           // storeName
  date: string;           // YYYY-MM-DD
  time: string;           // HH:mm
  reservedAt: number;     // 예약 일시 
  location: string;       // 주소
  status: 'upcoming' | 'past' | 'canceled'; // 예약 상태
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

// 검색바 컴포넌트
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
    setLocalQ('');             // 입력값 초기화
    onClear?.();               // 부모에 '검색 초기화' 통지 → 서버 재조회 트리거
    inputRef.current?.focus(); // UX: 포커스 유지
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
          'w-full h-11 rounded-xl border px-4 pr-24', 
          'text-gray-900 placeholder:text-gray-400',
          'border-gray-300 focus:outline-none',
          'focus:ring-2 focus:ring-[#2d4739]/25 focus:border-[#2d4739]',
          'relative', 
        ].join(' ')}
        autoComplete="off"
        spellCheck={false}
        autoCorrect="off"
      />

      {/* 검색어 지우기 버튼 (localQ가 있을 때만 표시) */}
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

      {/* 검색 버튼 */}
      <button
        type="submit"
        className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-2 rounded-lg text-white text-sm font-medium active:scale-95 z-10"
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
  /** 실제 서버에 보낼 검색어(제출 시에만 반영) */
  const [submittedQ, setSubmittedQ] = useState('');
  /** 상태 필터 */
  const [statusFilter, setStatusFilter] = useState<ResvStatus>('all');

  /** 데이터 상태 */
  const [items, setItems] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [unauthorized, setUnauthorized] = useState(false);

  /** API 호출
   *  - data가 null이어도 "빈 배열"로 처리하여 UI가 정상 빈 상태를 렌더
   */
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

      // 응답 바디 정규화
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

      // 정렬: 예정 먼저, 그다음 지난/취소
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

  /** 제출된 검색어/필터 변경 시 서버 재조회 */
  useEffect(() => {
    fetchReservations();
  }, [submittedQ, statusFilter]);

  // 검색 제출 콜백 (검색바에서 호출)
  const handleSearchSubmit = useCallback((keyword: string) => {
    setSubmittedQ(keyword);
  }, []);

  // 검색 초기화 콜백 (X 버튼에서 호출)
  const handleSearchClear = useCallback(() => {
    setSubmittedQ(''); 
  }, []);

  /** 보호적 클라이언트 필터 + 정렬 (서버가 이미 필터링하더라도 UI 안전망) */
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

  /** 빈 상태 문구 (필터별 메시지) */
  const emptyText = `${filterLabel(statusFilter)} 클래스 내역이 존재하지 않습니다`;

  return (
    <>
      <Header />
      <Mainnavbar />

      <MypageSidenavbar>
        <div className="rounded-2xl border border-gray-200 bg-white p-6">
          {/* 제목/설명 */}
          <div className="flex flex-col gap-2">
            <h1 className="text-xl sm:text-2xl font-bold">클래스 예약 조회</h1>
            <p className="text-gray-600">
              신청한 클래스와 예약 내역을 검색/필터로 빠르게 찾아보세요.
            </p>
          </div>

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
                    'px-3 py-1.5 rounded-full text-sm border transition',
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
          <div className="mt-2 text-sm text-gray-600">
            {submittedQ ? (
              <>
                검색어: <span className="font-medium">{submittedQ}</span> • 결과 {filtered.length}건
              </>
            ) : (
              <span>총 {filtered.length}건</span>
            )}
          </div>

          {/* 안내 메시지들 */}
          {loading && <div className="mt-3 text-gray-500">불러오는 중…</div>}

          {errorMsg && (
            <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 p-3 text-rose-700">
              {errorMsg}
            </div>
          )}

          {unauthorized && !loading && !errorMsg && (
            <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-700">
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
                  <h3 className="font-medium text-gray-900 mb-1">{emptyText}</h3>
                  <p className="text-sm">검색 조건을 바꾸거나, 다른 상태를 선택해 보세요.</p>
                </div>
              </div>
            ) : (
              filtered.map((r) => (
                <article
                  key={r.reservationNo}
                  className="rounded-xl border border-gray-200 bg-white overflow-hidden flex flex-col"
                >
                  {/* 썸네일 */}
                  <Link to={`/main/classes/${r.classId}`} className="block aspect-[16/9] bg-gray-100">
                    <img
                      src={r.thumbnail || PLACEHOLDER}
                      alt={r.title}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </Link>

                  {/* 카드 본문 */}
                  <div className="p-4 flex flex-col gap-2">
                    {/* 상태 뱃지 + 제목 */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={[
                          'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                          r.status === 'upcoming'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : r.status === 'past'
                            ? 'bg-gray-100 text-gray-700 border border-gray-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200',
                        ].join(' ')}
                      >
                        {r.status === 'upcoming' ? '예정' : r.status === 'past' ? '지난' : '취소'}
                      </span>
                      <h3 className="text-base sm:text-lg font-semibold truncate">{r.title}</h3>
                    </div>

                    {/* 호스트 / 주소 */}
                    <div className="text-sm text-gray-600">
                      호스트 <span className="font-medium">{r.host}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-sm text-gray-700">
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
                    <div className="flex flex-wrap items-center gap-3 text-sm text-gray-700">
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
                          <Link
                            to={`/main/classes/${r.classId}`}
                            className="flex-1 h-9 rounded-lg text-white text-sm font-medium grid place-items-center hover:opacity-95 active:scale-95"
                            style={{ backgroundColor: BRAND }}
                          >
                            상세 보기
                          </Link>
                          <button
                            className="flex-1 h-9 rounded-lg border text-sm font-medium hover:bg-gray-50 active:scale-95"
                            // TODO: 예약 취소 기능 연결
                          >
                            예약 취소
                          </button>
                        </>
                      ) : (
                        <Link
                          to={`/main/classes/${r.classId}`}
                          className="w-full h-9 rounded-lg text-white text-sm font-medium grid place-items-center hover:opacity-95 active:scale-95"
                          style={{ backgroundColor: BRAND }}
                        >
                          다시 예약
                        </Link>
                      )}
                    </div>
                  </div>
                </article>
              ))
            )}
          </div>
        </div>
      </MypageSidenavbar>
    </>
  );
}
