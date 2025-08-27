import { useMemo, useState, type FormEvent } from "react";
import { Search, X, CalendarDays, MapPin, Clock, Ticket } from "lucide-react";
import Header from "@src/shared/areas/layout/features/header/Header";
import Mainnavbar from "@src/shared/areas/navigation/features/navbar/main/Mainnavbar";
import MypageSidenavbar from "@src/shared/areas/navigation/features/sidenavbar/mypage/MypageSidenavbar";

/** ---------- 임시 예약 데이터 ---------- */
type Reservation = {
  id: string;
  reservationNo: string; // ✅ 예약번호
  title: string;
  host: string;
  date: string;          // ISO (YYYY-MM-DD)
  time: string;          // ✅ 예약한 수강시간 (예: "14:00–16:00")
  location: string;
  status: "upcoming" | "past" | "canceled";
  thumbnail?: string;
};

const RESERVATIONS: Reservation[] = [
  {
    id: "r1",
    reservationNo: "2025-0902-001",
    title: "도자기 원데이 클래스",
    host: "라임스튜디오",
    date: "2025-09-02",
    time: "14:00",
    location: "서울 성수",
    status: "upcoming",
  },
  {
    id: "r2",
    reservationNo: "2025-1010-003",
    title: "나무 커틀러리 만들기",
    host: "우든핸즈",
    date: "2025-10-10",
    time: "10:30–12:30",
    location: "경기 분당",
    status: "upcoming",
  },
  {
    id: "r3",
    reservationNo: "2025-0715-004",
    title: "천연 비누 공방 체험",
    host: "소프랩",
    date: "2025-07-15",
    time: "13:00–15:00",
    location: "서울 홍대",
    status: "past",
  },
  {
    id: "r4",
    reservationNo: "2025-0805-002",
    title: "가죽 카드지갑 만들기",
    host: "레더무드",
    date: "2025-08-05",
    time: "19:00–21:00",
    location: "부산 서면",
    status: "past",
  },
  {
    id: "r5",
    reservationNo: "2025-0915-007",
    title: "플라워 클래스 베이직",
    host: "블룸앤코",
    date: "2025-09-15",
    time: "11:00–12:30",
    location: "서울 강남",
    status: "canceled",
  },
  {
    id: "r6",
    reservationNo: "2025-0920-005",
    title: "수채화 일러스트 입문",
    host: "컬러필",
    date: "2025-09-20",
    time: "15:00–17:00",
    location: "인천 송도",
    status: "upcoming",
  },
];

/** ---------- 유틸 ---------- */
const brand = "#2d4739";

export default function MypageClassesPage() {
  const [q, setQ] = useState("");
  const [submittedQ, setSubmittedQ] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<"all" | "upcoming" | "past" | "canceled">("all");

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setSubmittedQ(q.trim());
  };

  const clear = () => {
    setQ("");
    setSubmittedQ("");
  };

  // 필터링
  const filtered = useMemo(() => {
    const base = RESERVATIONS.filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (!submittedQ) return true;
      const needle = submittedQ.toLowerCase();
      // 날짜는 YYYY-MM-DD 포함 검색, 나머지는 부분 매칭
      return (
        r.title.toLowerCase().includes(needle) ||
        r.host.toLowerCase().includes(needle) ||
        r.date.includes(needle) ||
        r.reservationNo.toLowerCase().includes(needle) || // ✅ 예약번호도 검색
        r.time.toLowerCase().includes(needle)              // ✅ 시간도 검색
      );
    });

    // 정렬: 예정은 빠른날짜 우선, 지난/취소는 최근 먼저
    return [...base].sort((a, b) => {
      if (a.status === "upcoming" && b.status !== "upcoming") return -1;
      if (a.status !== "upcoming" && b.status === "upcoming") return 1;
      const da = new Date(a.date).getTime();
      const db = new Date(b.date).getTime();
      if (a.status === "upcoming") return da - db; // 가까운 일정 먼저
      return db - da; // 지난/취소는 최신 먼저
    });
  }, [submittedQ, statusFilter]);

  return (
    <>
      <Header />
      <Mainnavbar />

      <MypageSidenavbar>
        <div className="rounded-2xl border border-gray-200 bg-white p-6">
          {/* 상단 타이틀 */}
          <div className="flex flex-col gap-2">
            <h1 className="text-xl sm:text-2xl font-bold">클래스 예약 조회</h1>
            <p className="text-gray-600">
              신청한 클래스와 예약 내역을 검색/필터로 빠르게 찾아보세요.
            </p>
          </div>

          {/* 검색 바 */}
          <form onSubmit={onSubmit} className="relative w-full mt-4">
            <label htmlFor="myclass-search" className="sr-only">
              클래스 검색
            </label>
            <input
              id="myclass-search"
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="클래스명, 호스트, 날짜/예약번호/시간(예: 2025-09-01, 14:00)"
              className={[
                "w-full h-11 rounded-xl border px-4 pr-24",
                "text-gray-900 placeholder:text-gray-400",
                "border-gray-300 focus:outline-none",
                "focus:ring-2 focus:ring-[#2d4739]/25 focus:border-[#2d4739]",
              ].join(" ")}
              autoComplete="off"
              spellCheck={false}
              autoCorrect="off"
            />

            {/* 지우기 버튼 */}
            {q && (
              <button
                type="button"
                onClick={clear}
                aria-label="검색어 지우기"
                className="absolute right-12 top-1/2 -translate-y-1/2 p-2 rounded-md hover:bg-gray-100 active:scale-95"
              >
                <X className="w-4 h-4" />
              </button>
            )}

            {/* 검색 버튼 */}
            <button
              type="submit"
              className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-2 rounded-lg text-white text-sm font-medium active:scale-95"
              style={{ backgroundColor: brand }}
            >
              <span className="inline-flex items-center gap-1">
                <Search className="w-4 h-4" />
                검색
              </span>
            </button>
          </form>

          {/* 상태 필터 (반응형) */}
          <div className="mt-3 flex flex-wrap gap-2">
            {([
              { key: "all", label: "전체" },
              { key: "upcoming", label: "예정" },
              { key: "past", label: "지난" },
              { key: "canceled", label: "취소" },
            ] as const).map(({ key, label }) => {
              const active = statusFilter === key;
              return (
                <button
                  key={key}
                  onClick={() => setStatusFilter(key)}
                  className={[
                    "px-3 py-1.5 rounded-full text-sm border transition",
                    active
                      ? "text-white border-transparent"
                      : "text-gray-700 border-gray-300 bg-white hover:bg-gray-50",
                  ].join(" ")}
                  style={active ? { backgroundColor: brand } : undefined}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* 결과 수/검색어 표시 */}
          <div className="mt-2 text-sm text-gray-600">
            {submittedQ ? (
              <>
                <span className="mr-1">검색어:</span>
                <span className="font-medium text-gray-900">{submittedQ}</span>
                <span className="mx-2">•</span>
                <span>결과 {filtered.length}건</span>
              </>
            ) : (
              <span>총 {filtered.length}건</span>
            )}
          </div>

          {/* 결과 목록 (반응형 카드) */}
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.length === 0 ? (
              <div className="col-span-full rounded-xl border border-dashed border-gray-300 p-8 text-center text-gray-500">
                <div className="flex flex-col items-center">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                    <CalendarDays className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="font-medium text-gray-900 mb-1">검색 결과가 없습니다</h3>
                  <p className="text-sm">다른 키워드로 다시 검색해보세요.</p>
                </div>
              </div>
            ) : (
              filtered.map((r) => (
                <article
                  key={r.id}
                  className="rounded-xl border border-gray-200 bg-white overflow-hidden flex flex-col"
                >
                  {/* 썸네일(옵션) */}
                  <div className="aspect-[16/9] bg-gray-100" />

                  <div className="p-4 flex flex-col gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={[
                          "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                          r.status === "upcoming"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : r.status === "past"
                            ? "bg-gray-100 text-gray-700 border border-gray-200"
                            : "bg-rose-50 text-rose-700 border border-rose-200",
                        ].join(" ")}
                      >
                        {r.status === "upcoming" ? "예정" : r.status === "past" ? "지난" : "취소"}
                      </span>
                      <h3 className="text-base sm:text-lg font-semibold truncate">{r.title}</h3>
                    </div>

                    <div className="text-sm text-gray-600">
                      호스트 <span className="font-medium text-gray-900">{r.host}</span>
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

                    {/* ✅ 예약번호 + 수강시간 */}
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

                    <div className="mt-3 flex gap-2">
                      {r.status === "upcoming" ? (
                        <>
                          <button
                            className="flex-1 h-9 rounded-lg text-white text-sm font-medium hover:opacity-95 active:scale-95"
                            style={{ backgroundColor: brand }}
                          >
                            상세 보기
                          </button>
                          <button className="flex-1 h-9 rounded-lg border text-sm font-medium hover:bg-gray-50 active:scale-95">
                            예약 취소
                          </button>
                        </>
                      ) : r.status === "past" ? (
                        // ✅ 리뷰 작성 제거, 다시 예약만 단독 버튼 (가득)
                        <button
                          className="w-full h-9 rounded-lg text-white text-sm font-medium hover:opacity-95 active:scale-95"
                          style={{ backgroundColor: brand }}
                        >
                          다시 예약
                        </button>
                      ) : (
                        <button className="w-full h-9 rounded-lg border text-sm font-medium hover:bg-gray-50 active:scale-95">
                          다시 예약
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              ))
            )}
          </div>

          {/* 예약이 전혀 없는 계정의 기본 빈 상태 (초기 DB 미연결 대비) */}
          {RESERVATIONS.length === 0 && (
            <div className="mt-6 rounded-xl border border-dashed border-gray-300 p-8 text-center text-gray-500">
              <div className="flex flex-col items-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <CalendarDays className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="font-medium text-gray-900 mb-1">예약된 클래스가 없습니다</h3>
                <p className="text-sm">아직 신청한 클래스가 없습니다. 클래스를 둘러보세요!</p>
                <button
                  className="mt-4 px-4 py-2 text-white rounded-lg text-sm hover:opacity-95 transition"
                  style={{ backgroundColor: brand }}
                >
                  클래스 둘러보기
                </button>
              </div>
            </div>
          )}
        </div>
      </MypageSidenavbar>
    </>
  );
}
