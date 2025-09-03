import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Search, X, CalendarDays, MapPin, Clock, Ticket } from "lucide-react";
import Header from "@src/shared/areas/layout/features/header/Header";
import Mainnavbar from "@src/shared/areas/navigation/features/navbar/main/Mainnavbar";
import MypageSidenavbar from "@src/shared/areas/navigation/features/sidenavbar/mypage/MypageSidenavbar";
import { get } from "@src/libs/request";

/** =========================
 *  서버 DTO/응답 타입 (서버에서 내려주는 필드 그대로)
 *  ========================= */

// 서버가 내려주는 예약 요약 한 건의 DTO 타입입니다.
type ClassReservationSummaryResponseDTO = {
  reservationNumber: string;   // 예약번호 (고유)
  image: string | null;        // 썸네일 이미지 URL (없을 수 있음)
  status: string;              // 주문 상태 (예: "ORDER_OK", "CANCEL_OK")
  reservedTime: string;        // ISO 날짜-시간 (예: "2025-09-01T14:00:00")
  classTitle: string;          // 클래스 제목
  addressRoad: string;         // 도로명 주소
  storeName: string;           // 호스트/스토어명
  storeId: number;           // 호스트/스토어 ID
  storeUrl: string;        // 호스트/스토어 URL
  displayStatus: string;       // 화면용 상태 (예: "UPCOMING", "PAST", "CANCEL_OK")
  classId: number;             // 클래스 ID (추가됨)
};

// 서버의 공통 응답 래퍼 타입입니다. (status/message/data 형태)
type ApiResponseList = {
  status: number;                                      // 비즈니스 코드(200/401 등) — HTTP 코드와 다를 수 있음
  message: string;                                     // 메시지
  data: ClassReservationSummaryResponseDTO[] | null;   // 실제 데이터 배열 (없으면 null)
};

/** =========================
 *  UI 렌더링용 타입 (프런트에서 쓰기 좋게 가공)
 *  ========================= */

// 카드 렌더링을 위해 프런트에서 쓰는 예약 타입입니다.
type Reservation = {
  id: string;                                        // 고유 키 (reservationNumber 사용)
  reservationNo: string;                             // 예약번호
  title: string;                                     // 클래스 제목
  host: string;                                      // 호스트/스토어명
  date: string;                                      // YYYY-MM-DD
  time: string;                                      // HH:mm (또는 "HH:mm–HH:mm" 등)
  location: string;                                  // 위치(도로명)
  status: "upcoming" | "past" | "canceled";          // 화면 표기용 상태
  thumbnail?: string | null;                         // 썸네일 URL
  storeId: number;                                   // 호스트/스토어 ID
  storeUrl: string;                                  // 호스트/스토어 URL
  classId: number;                                    // 클래스 ID (추가됨)
};

/** =========================
 *  상수/유틸 함수
 *  ========================= */

// 브랜드 컬러(버튼/포커스 등)
const brand = "#2d4739";

// 백엔드 base URL을 읽습니다. (.env의 VITE_API_BASE_URL)
const API_BASE = import.meta.env.VITE_API_BASE_URL ?? ""; // 빈 문자열 방어

// baseURL이 /api 로 끝나는지에 따라 최종 엔드포인트를 자동 보정합니다.
// - baseURL = http://host:port        → "/api/..." 로 호출
// - baseURL = http://host:port/api    → "/..." (api 제외) 로 호출
const RESV_ENDPOINT = API_BASE.endsWith("/api")
  ? "/mypage/members/reservations"                    // baseURL에 이미 /api 포함 → 경로엔 /api 제외
  : "/api/mypage/members/reservations";               // baseURL에 /api 미포함 → 경로에 /api 포함

// ISO 문자열에서 "YYYY-MM-DD"만 뽑습니다.
function isoToDate(iso: string | undefined): string {
  if (!iso) return "";                                // 값이 없으면 빈 문자열
  return iso.slice(0, 10);                            // ISO 앞 10자리가 YYYY-MM-DD
}

// ISO 문자열을 "HH:mm"으로 변환합니다. (로컬 시간 기준)
function isoToTime(iso: string | undefined): string {
  if (!iso) return "-";                               // 값이 없으면 하이픈
  const d = new Date(iso);                            // Date 객체로 변환
  const hh = `${d.getHours()}`.padStart(2, "0");      // 시를 2자리로
  const mm = `${d.getMinutes()}`.padStart(2, "0");    // 분을 2자리로
  return `${hh}:${mm}`;                               // "HH:mm" 조립
}

// 서버의 displayStatus/status/시간을 종합해 UI에서 쓰는 상태로 매핑합니다.
function mapStatus(
  displayStatus?: string,
  status?: string,
  reservedTime?: string
): Reservation["status"] {
  const disp = (displayStatus ?? "").toUpperCase();   // 대문자로 통일
  if (disp.includes("CANCEL")) return "canceled";     // CANCEL_OK 등 취소 계열
  if (disp === "UPCOMING") return "upcoming";         // 예정
  if (disp === "PAST") return "past";                 // 지난

  const raw = (status ?? "").toUpperCase();           // 보조로 서버 status도 확인
  if (raw.includes("CANCEL")) return "canceled";      // 취소 계열이면 취소

  // 위에서 못 정했으면 날짜 비교로 판정 (오늘 이전이면 지난, 아니면 예정)
  const today = new Date().toISOString().slice(0, 10);
  const date = isoToDate(reservedTime);
  if (date && date < today) return "past";
  return "upcoming";
}

// 서버 DTO를 UI용 Reservation으로 변환합니다.
function toReservation(dto: ClassReservationSummaryResponseDTO): Reservation {
  return {
    id: dto.reservationNumber,                        // 카드 key로 사용
    reservationNo: dto.reservationNumber,             // 예약번호
    title: dto.classTitle ?? "(제목 없음)",            // 제목 누락 대비
    host: dto.storeName ?? "-",                       // 호스트 누락 대비
    date: isoToDate(dto.reservedTime),                // YYYY-MM-DD
    time: isoToTime(dto.reservedTime),                // HH:mm
    location: dto.addressRoad ?? "-",                 // 주소 누락 대비
    status: mapStatus(dto.displayStatus, dto.status, dto.reservedTime), // 상태 매핑
    thumbnail: dto.image ?? null,                     // 썸네일
    storeId: dto.storeId,                             // 호스트/스토어 ID
    storeUrl: dto.storeUrl,                           // 호스트/스토어 URL
    classId: dto.classId,                               // 클래스 ID
  };
}

// UI 필터("all/upcoming/past/canceled")를 서버가 받는 값("전체/예정/지난/취소")으로 바꿔줍니다.
function toApiFilter(ui: "all" | "upcoming" | "past" | "canceled"): string | undefined {
  switch (ui) {
    case "all": return "전체";                         // 기본값
    case "upcoming": return "예정";                   // 예정
    case "past": return "지난";                       // 지난
    case "canceled": return "취소";                   // 취소
    default: return undefined;                        // 혹시 모를 안전장치
  }
}

/** =========================
 *  메인 컴포넌트
 *  ========================= */

export default function MypageClassesPage() {
  // 입력창에 타이핑되는 검색어 상태입니다.
  const [q, setQ] = useState("");                     // 제어 컴포넌트 value

  // 실제로 제출된 검색어입니다. 이 값이 바뀌면 서버를 호출합니다.
  const [submittedQ, setSubmittedQ] = useState("");

  // 상태 필터 탭 상태입니다.
  const [statusFilter, setStatusFilter] =
    useState<"all" | "upcoming" | "past" | "canceled">("all");

  // 서버에서 받아온 예약 목록(가공된 UI 타입)입니다.
  const [items, setItems] = useState<Reservation[]>([]); // 항상 배열 보장

  // 로딩/에러/권한상태 UI 표시에 사용됩니다.
  const [loading, setLoading] = useState(false);      // API 호출 중
  const [errorMsg, setErrorMsg] = useState<string | null>(null); // 오류 메시지
  const [unauthorized, setUnauthorized] = useState(false);       // 미로그인(401)

  // 서버에서 예약 목록을 불러옵니다. (팀 규칙: @src/libs/request.get 사용)
  async function fetchReservations() {
    try {
      setLoading(true);                               // 로딩 시작
      setErrorMsg(null);                              // 이전 에러 초기화
      setUnauthorized(false);                         // 이전 권한배너 초기화

      // 서버 쿼리 파라미터 구성 (filter는 한글, q는 선택적)
      const params: Record<string, string | undefined> = {
        filter: toApiFilter(statusFilter),            // "전체/예정/지난/취소"
        q: submittedQ || undefined,                   // 공백이면 제외
      };

      // get<T>는 ApiResponse<T> 형태를 반환 → res.data가 "T"가 됩니다.
      // 여기서는 T = ApiResponseList (서버 래퍼)
      const res = await get<ApiResponseList>(RESV_ENDPOINT, params);

      // 서버의 응답 래퍼(payload)를 꺼냅니다. (status/message/data)
      const payload = res.data;                       // ApiResponseList

      // 서버가 HTTP 200 안에서 status=401을 바디에 담아줄 수도 있으므로 방어합니다.
      if (payload && typeof payload.status === "number" && payload.status === 401) {
        setUnauthorized(true);                        // 미로그인 배너 표시
        setItems([]);                                 // 목록 비움
        return;                                       // 더 진행하지 않음
      }

      // payload.data가 배열이 아닐 수도 있으므로 안전하게 배열화합니다.
      const rawList = Array.isArray(payload?.data) ? payload!.data : [];
      const list = rawList.map(toReservation);        // UI 타입으로 변환

      // 정렬 규칙:
      // - 예정은 빠른 날짜가 먼저 (오름차순)
      // - 지난/취소는 최신 날짜가 먼저 (내림차순)
      const sorted = [...list].sort((a, b) => {
        if (a.status === "upcoming" && b.status !== "upcoming") return -1;
        if (a.status !== "upcoming" && b.status === "upcoming") return 1;
        const da = new Date(a.date).getTime();
        const db = new Date(b.date).getTime();
        return a.status === "upcoming" ? da - db : db - da;
      });

      setItems(sorted);                               // 상태 반영
    } catch (e: any) {
      // Axios 에러일 때 HTTP 상태를 확인합니다. (ex: 401 Unauthorized)
      const httpStatus = e?.response?.status as number | undefined;
      if (httpStatus === 401) {                       // 인터셉터 처리 전/후에 대비
        setUnauthorized(true);                        // 미로그인 배너 표시
        setItems([]);                                 // 목록 비움
        return;                                       // 더 진행하지 않음
      }
      // 그 외의 오류는 사용자에게 메시지를 보여줍니다.
      setErrorMsg(e?.message ?? "예약 내역 조회 중 오류가 발생했습니다.");
      setItems([]);                                   // 안전하게 빈 배열
    } finally {
      setLoading(false);                              // 로딩 종료
    }
  }

  // submittedQ(검색 제출)나 statusFilter(탭)가 바뀌면 서버를 다시 호출합니다.
  useEffect(() => {
    fetchReservations();                              // 의존성 변경 시 API 호출
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submittedQ, statusFilter]);

  // 검색 폼 제출(엔터/버튼 클릭) 시 호출됩니다.
  const onSubmit = (e: FormEvent) => {
    e.preventDefault();                               // 폼 기본 제출 방지
    setSubmittedQ(q.trim());                          // 공백 제거 후 확정 → API 호출 트리거
  };

  // 검색어를 지우고, 제출된 검색어도 초기화하여 전체 조회로 돌아갑니다.
  const clear = () => {
    setQ("");                                         // 입력값 초기화
    setSubmittedQ("");                                // 제출값 초기화 → API 호출 트리거
  };

  // 클라이언트 측에서도 한 번 더 필터/정렬을 적용합니다. (서버 보조)
  const filtered = useMemo(() => {
    const base = items.filter((r) => {                // 결과 중에서 필터링
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (!submittedQ) return true;                   // 검색어 없으면 패스
      const needle = submittedQ.toLowerCase();        // 소문자 비교
      return (
        r.title.toLowerCase().includes(needle) ||     // 제목 검색
        r.host.toLowerCase().includes(needle) ||      // 호스트 검색
        r.date.includes(needle) ||                    // 날짜 포함 검색(YYYY-MM-DD)
        r.reservationNo.toLowerCase().includes(needle) || // 예약번호 검색
        r.time.toLowerCase().includes(needle)         // 시간 검색(HH:mm)
      );
    });

    // 정렬 규칙 동일 유지 (예정↑ / 지난·취소↓)
    return [...base].sort((a, b) => {
      if (a.status === "upcoming" && b.status !== "upcoming") return -1;
      if (a.status !== "upcoming" && b.status === "upcoming") return 1;
      const da = new Date(a.date).getTime();
      const db = new Date(b.date).getTime();
      return a.status === "upcoming" ? da - db : db - da;
    });
  }, [items, submittedQ, statusFilter]);              // 의존성: 목록/검색어/탭

  // 실제 렌더링 파트입니다.
  return (
    <>
      {/* 페이지 공통 헤더 영역 */}
      <Header />

      {/* 상단 내비게이션 바 */}
      <Mainnavbar />

      {/* 마이페이지 사이드 네비 영역 (좌측) */}
      <MypageSidenavbar>
        {/* 카드 형태의 컨테이너 */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6">
          {/* 상단 타이틀/설명 */}
          <div className="flex flex-col gap-2">
            <h1 className="text-xl sm:text-2xl font-bold">클래스 예약 조회</h1>
            <p className="text-gray-600">신청한 클래스와 예약 내역을 검색/필터로 빠르게 찾아보세요.</p>
          </div>

          {/* =========================
              검색 바
              - 제어 입력(value={q})
              - onChange로 상태 갱신
              - 우측에 '지우기', '검색' 버튼 (absolute)
             ========================= */}
          <form onSubmit={onSubmit} className="relative w-full mt-4">
            {/* 스크린 리더용 레이블 (시각적으로 숨김) */}
            <label htmlFor="myclass-search" className="sr-only">클래스 검색</label>

            {/* 입력창 — 제어 컴포넌트 */}
            <input
              id="myclass-search"                       // 접근성: label과 매칭
              type="text"                               // 텍스트 입력
              value={q}                                 // 상태 바인딩
              onChange={(e) => setQ((e.target as HTMLInputElement).value)} // 안전한 값 읽기
              placeholder="클래스명, 호스트, 날짜/예약번호/시간(예: 2025-09-01, 14:00)" // 힌트
              className={[
                "w-full h-11 rounded-xl border px-4 pr-24",  // 우측 버튼 공간 확보(pr-24)
                "text-gray-900 placeholder:text-gray-400",    // 텍스트/플레이스홀더 색
                "border-gray-300 focus:outline-none",         // 보더/아웃라인 스타일
                "focus:ring-2 focus:ring-[#2d4739]/25 focus:border-[#2d4739]", // 포커스 스타일
                "z-20 relative",                               // 버튼 absolute와 겹침 방지 (입력 위에 위치)
              ].join(" ")}
              autoComplete="off"                       // 자동완성 끄기
              spellCheck={false}                       // 맞춤법 표시 끄기
              autoCorrect="off"                        // 자동수정 끄기
            />

            {/* 입력값이 있을 때만 나타나는 '지우기' 버튼 */}
            {q && (
              <button
                type="button"                           // 폼 제출 방지
                onClick={clear}                         // 클릭 시 입력/제출값 초기화
                aria-label="검색어 지우기"               // 접근성 라벨
                className="absolute right-12 top-1/2 -translate-y-1/2 p-2 rounded-md hover:bg-gray-100 active:scale-95 z-30" // 입력 위에 뜨도록 z-30
              >
                <X className="w-4 h-4" />               {/* X 아이콘 */}
              </button>
            )}

            {/* '검색' 제출 버튼 */}
            <button
              type="submit"                             // 폼 제출
              className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-2 rounded-lg text-white text-sm font-medium active:scale-95 z-30" // 입력 위에 뜨도록 z-30
              style={{ backgroundColor: brand }}        // 브랜드 컬러 적용
            >
              <span className="inline-flex items-center gap-1">
                <Search className="w-4 h-4" />          {/* 돋보기 아이콘 */}
                검색
              </span>
            </button>
          </form>

          {/* =========================
              상태 필터 탭 (전체/예정/지난/취소)
             ========================= */}
          <div className="mt-3 flex flex-wrap gap-2">
            {([
              { key: "all", label: "전체" },            // 전체
              { key: "upcoming", label: "예정" },       // 예정
              { key: "past", label: "지난" },           // 지난
              { key: "canceled", label: "취소" },       // 취소
            ] as const).map(({ key, label }) => {
              const active = statusFilter === key;      // 현재 선택 여부
              return (
                <button
                  key={key}                              // 리스트 key
                  onClick={() => setStatusFilter(key)}   // 클릭 시 상태 변경 → API 호출
                  className={[
                    "px-3 py-1.5 rounded-full text-sm border transition", // 공통 스타일
                    active
                      ? "text-white border-transparent"  // 활성 상태: 색 반전
                      : "text-gray-700 border-gray-300 bg-white hover:bg-gray-50", // 비활성
                  ].join(" ")}
                  style={active ? { backgroundColor: brand } : undefined} // 활성 배경색
                >
                  {label}                                {/* 라벨 텍스트 */}
                </button>
              );
            })}
          </div>

          {/* 통계/상태 줄: 검색어와 결과 개수, 또는 총 개수 */}
          <div className="mt-2 text-sm text-gray-600">
            {submittedQ ? (
              <>
                <span className="mr-1">검색어:</span>
                <span className="font-medium text-gray-900">{submittedQ}</span>
                <span className="mx-2">•</span>
                <span>결과 {filtered.length}건</span>
              </>
            ) : (
              <span>총 {filtered.length}건</span>       // 검색어 없을 때 총 개수
            )}
          </div>

          {/* 로딩/에러/권한 없음 배너 */}
          {loading && <div className="mt-3 text-gray-500">불러오는 중…</div>}  {/* 로딩 표시 */}
          {errorMsg && (
            <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 p-3 text-rose-700">
              {errorMsg}                                 {/* 오류 메시지 */}
            </div>
          )}
          {unauthorized && !loading && !errorMsg && (
            <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-700">
              로그인 후 예약 내역을 확인할 수 있습니다.   {/* 미로그인 안내 */}
            </div>
          )}

          {/* =========================
              결과 카드 그리드
             ========================= */}
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {/* 빈 상태 처리: 로딩/에러가 없고, 필터된 결과가 0건일 때 */}
            {!loading && !errorMsg && filtered.length === 0 ? (
              <div className="col-span-full rounded-xl border border-dashed border-gray-300 p-8 text-center text-gray-500">
                <div className="flex flex-col items-center">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                    <CalendarDays className="w-8 h-8 text-gray-400" /> {/* 달력 아이콘 */}
                  </div>
                  <h3 className="font-medium text-gray-900 mb-1">표시할 예약 내역이 없습니다</h3>
                  <p className="text-sm">검색 조건을 바꾸거나, 로그인 상태를 확인해 주세요.</p>
                </div>
              </div>
            ) : (
              // 결과가 하나 이상일 때 카드 렌더링
              filtered.map((r) => (
                <article
                  key={r.id}                             // 고유 key
                  className="rounded-xl border border-gray-200 bg-white overflow-hidden flex flex-col"
                >
                  {/* 썸네일 영역 (이미지를 사용하려면 내부에 <img ... /> 추가) */}
                  <div className="aspect-[16/9] bg-gray-100" />
                  {/* 예시:
                  {r.thumbnail && (
                    <img src={r.thumbnail} alt="" className="w-full h-full object-cover" />
                  )}
                  */}

                  {/* 카드 본문 */}
                  <div className="p-4 flex flex-col gap-2">
                    {/* 상단 상태 뱃지 + 제목 */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={[
                          "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                          r.status === "upcoming"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200" // 예정
                            : r.status === "past"
                            ? "bg-gray-100 text-gray-700 border border-gray-200"         // 지난
                            : "bg-rose-50 text-rose-700 border border-rose-200",          // 취소
                        ].join(" ")}
                      >
                        {r.status === "upcoming" ? "예정" : r.status === "past" ? "지난" : "취소"}
                      </span>
                      <h3 className="text-base sm:text-lg font-semibold truncate">{r.title}</h3>
                    </div>

                    {/* 호스트/스토어명 */}
                    <div className="text-sm text-gray-600">
                      호스트 <span className="font-medium text-gray-900">{r.host}</span>
                    </div>

                    {/* 날짜/장소 행 */}
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

                    {/* 수강시간/예약번호 행 */}
                    <div className="flex flex-wrap items-center gap-3 text-sm text-gray-700">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        <span className="text-gray-600">수강시간</span>
                        <span className="font-medium text-gray-900">{r.time}</span>
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Ticket className="w-4 h-4" />
                        <span className="text-gray-600">예약번호</span>
                        <span className="font-medium text-gray-900">{r.reservationNo}</span>
                      </span>
                    </div>

                    {/* 액션 버튼 영역 (상태에 따라 다르게 표시) */}
                    <div className="mt-3 flex gap-2">
                      {r.status === "upcoming" ? (
                        <>
                          <button
                            className="flex-1 h-9 rounded-lg text-white text-sm font-medium hover:opacity-95 active:scale-95"
                            style={{ backgroundColor: brand }}
                            onClick={() => console.log("상세 보기:", r.id)} // TODO: 상세 페이지 연결
                          >
                            상세 보기
                          </button>
                          <button
                            className="flex-1 h-9 rounded-lg border text-sm font-medium hover:bg-gray-50 active:scale-95"
                            onClick={() => console.log("예약 취소:", r.id)} // TODO: 취소 API 연결
                          >
                            예약 취소
                          </button>
                        </>
                      ) : r.status === "past" ? (
                        <button
                          className="w-full h-9 rounded-lg text-white text-sm font-medium hover:opacity-95 active:scale-95"
                          style={{ backgroundColor: brand }}
                          onClick={() => window.location.href = `/main/classes/${r.classId}`} // 클래스 상세 페이지로 이동
                          // onClick={() => console.log("다시 예약:", r)} // TODO: 다시 예약 연결
                        >
                          다시 예약
                        </button>
                      ) : (
                        <button
                          className="w-full h-9 rounded-lg border text-sm font-medium hover:bg-gray-50 active:scale-95"
                          onClick={() => console.log("다시 예약:", r.id)}   // TODO: 다시 예약 연결
                        >
                          다시 예약
                        </button>
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
