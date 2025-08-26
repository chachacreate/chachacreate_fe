import { useMemo, useState, useEffect, useRef } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import Header from "@src/shared/areas/layout/features/header/Header";
import Mainnavbar from "@src/shared/areas/navigation/features/navbar/main/Mainnavbar";

type ClassItem = {
  id: string;
  title: string;
  host: string;
  price: number;
  date: string;
  location?: string;
  thumbnail?: string;
  address?: string;
};

// 더미 시간표 데이터
const MOCK_TIMETABLE = [
  "10:00", "11:30", "13:00", "14:30",
  "16:00", "17:30", "19:00", "20:30",
];

// 선택 가능한 날짜들
const MOCK_AVAILABLE_DATES = [
  "2025-09-01", "2025-09-03", "2025-09-05", "2025-09-07",
  "2025-09-10", "2025-09-12", "2025-09-15", "2025-09-17",
  "2025-09-20", "2025-09-22", "2025-09-25", "2025-09-28",
];

// 직접 새로고침 시 폴백용 더미
const buildMock = (): ClassItem[] =>
  Array.from({ length: 40 }).map((_, i) => ({
    id: `c${i + 1}`,
    title: `수공예 원데이 클래스 #${i + 1}`,
    host: i % 3 === 0 ? "라임스튜디오" : i % 3 === 1 ? "소소공방" : "토분이네",
    price: 30000 + (i % 7) * 5000,
    date: `2025-09-${String((i % 27) + 1).padStart(2, "0")}`,
    location: ["서울 종로", "서울 성수", "경기 분당", "인천 부평"][i % 4],
    address: [
      "서울특별시 종로구 종로 123",
      "서울특별시 성동구 성수이로 456",
      "경기도 성남시 분당구 분당로 789",
      "인천광역시 부평구 부평대로 012",
    ][i % 4],
  }));

export default function ClassesDetailPage() {
  const { classId } = useParams<{ classId: string }>();
  const nav = useNavigate();
  const location = useLocation();

  const [activeTab, setActiveTab] = useState<"detail" | "store">("detail");
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [showFixedButton, setShowFixedButton] = useState(false);

  // 가시성 감지용 ref들
  const calendarSectionRef = useRef<HTMLDivElement | null>(null);
  const inlineCtaRef = useRef<HTMLButtonElement | null>(null);

  // 목록에서 넘어온 state 우선, 새로고침/직접 진입 폴백
  const fromState = (location.state as { item?: ClassItem } | null)?.item;
  const fallback = useMemo(() => buildMock().find((m) => m.id === classId), [classId]);
  const item = fromState ?? fallback;

  // ✅ "캘린더/타임테이블 카드 내부의 CTA"가 화면에 안 보일 때만 플로팅 노출
  useEffect(() => {
    const target = inlineCtaRef.current;
    if (!target) return;

    const io = new IntersectionObserver(
      ([entry]) => {
        // entry.isIntersecting === true 면 버튼이 보이는 상태 → 플로팅 감춤
        setShowFixedButton(!entry.isIntersecting);
      },
      {
        root: null,
        threshold: 0.01, // 1%라도 보이면 "보이는 것"으로 처리
      }
    );

    io.observe(target);
    return () => io.disconnect();
  }, [inlineCtaRef.current]); // 렌더로 ref가 바뀌면 재설정

  // 플로팅 클릭 → 캘린더 선택 영역으로 스크롤
  const scrollToCalendar = () => {
    const el = calendarSectionRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const absoluteTop = rect.top + window.scrollY;
    const centerOffset = (window.innerHeight - rect.height) / 2;
    const targetTop = absoluteTop - Math.max(centerOffset, 0); // 섹션이 뷰포트보다 크면 상단 정렬

    window.scrollTo({ top: targetTop, behavior: "smooth" });

    // 하이라이트 효과 (기존 유지)
    el.classList.add("ring-2", "ring-[#2D4739]", "ring-offset-2", "rounded-2xl");
    window.setTimeout(() => {
        el.classList.remove("ring-2", "ring-[#2D4739]", "ring-offset-2", "rounded-2xl");
    }, 700);
    };

  const handleStoreInfo = () => {
    if (item?.host) nav(`/store/${item.host}/info`);
  };

  const handleApply = () => {
    if (!selectedDate || !selectedTime) {
      alert("날짜와 시간을 선택해주세요.");
      return;
    }
    // ✅ 주문 페이지로 이동 (라우터에 등록한 경로와 일치해야 함)
  nav("/main/classes/order", {
    state: {
      classId,              // 현재 상세의 id
      date: selectedDate,   // 선택 날짜
      time: selectedTime,   // 선택 시간
      item,                 // (선택) 상세 아이템 전체 전달
    },
  });
  };

  return (
    <>
      <Header />
      <Mainnavbar />

      <main className="w-full">
        {!item ? (
          <div className="mx-auto px-[240px] py-20">
            <div className="rounded-2xl border border-gray-200 bg-white p-8">
              <h1 className="text-lg font-semibold">클래스를 찾을 수 없습니다</h1>
              <p className="text-sm text-gray-500 mt-1">
                존재하지 않거나 삭제되었을 수 있어요.
              </p>
              <button
                onClick={() => nav(-1)}
                className="mt-6 h-10 px-4 rounded-xl border border-gray-300 hover:bg-gray-50"
              >
                이전으로
              </button>
            </div>
          </div>
        ) : (
          <div className="mx-auto px-4 sm:px-8 lg:px-[240px] py-6 lg:py-10">
            {/* 상단 섹션: 이미지 + 클래스 정보 (Frame 시안 반영) */}
            <section className="mb-10">
              <div className="flex flex-col xl:flex-row items-start gap-8 xl:gap-[120px]">
                {/* 왼쪽: 클래스 이미지 (670×335 비율) */}
                <div className="w-full xl:w-[670px]">
                  <div className="rounded-2xl overflow-hidden border border-gray-200">
                    <div className="relative w-full aspect-[2/1]">
                      {item.thumbnail ? (
                        <img
                          src={item.thumbnail}
                          alt={item.title}
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                      ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
                          <span className="text-gray-500">클래스 이미지</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* 오른쪽: 텍스트 블록 (503×335 레이아웃, 상단 정보 + 하단 가격) */}
                <div className="flex-1 xl:max-w-[503px] xl:h-[335px] flex flex-col justify-between">
                  <div className="flex flex-col gap-2.5">
                    <h1 className="text-[16px] sm:text-[24px] xl:text-[28px] leading-[1.5] font-bold">
                      {item.title}
                    </h1>
                    <p className="text-[#3d3d3d] text-[12px] sm:text-[20px] xl:text-[28px] leading-[1.5]">
                      {item.host ? `${item.host}의 클래스` : "{store}의 클래스"}
                    </p>
                    <p className="text-[#3d3d3d] text-[12px] sm:text-[20px] xl:text-[24px] leading-[1.5]">
                      {item.address ?? item.location ?? "홍대입구역 2번출구 ANT 빌딩"}
                    </p>
                  </div>
                  <p className="mt-6 xl:mt-0 text-black text-[22px] sm:text-[26px] xl:text-[32px] leading-[1.5] font-bold">
                    {item.price.toLocaleString()} 원
                  </p>
                </div>
              </div>
            </section>

            {/* 중간 섹션: 캘린더 + 시간표 + 신청하기 */}
            <section
              ref={calendarSectionRef}
              className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10"
            >
              {/* 왼쪽: 캘린더 */}
              <div className="bg-white border border-gray-200 rounded-2xl p-6">
                <h3 className="text-lg font-semibold mb-4">날짜 선택</h3>
                <div className="grid grid-cols-7 gap-2 text-center text-sm mb-4">
                  {["일", "월", "화", "수", "목", "금", "토"].map((day) => (
                    <div key={day} className="py-2 font-medium text-gray-500">
                      {day}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-2">
                  {Array.from({ length: 31 }, (_, i) => {
                    const date = `2025-09-${String(i + 1).padStart(2, "0")}`;
                    const isAvailable = MOCK_AVAILABLE_DATES.includes(date);
                    const isSelected = selectedDate === date;
                    return (
                      <button
                        key={i}
                        onClick={() => isAvailable && setSelectedDate(date)}
                        disabled={!isAvailable}
                        className={[
                          "w-10 h-10 rounded-lg text-sm transition-colors",
                          isSelected
                            ? "bg-[#2D4739] text-white"
                            : isAvailable
                            ? "hover:bg-gray-100 text-gray-900"
                            : "text-gray-300 cursor-not-allowed",
                        ].join(" ")}
                      >
                        {i + 1}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 오른쪽: 시간표 + 신청하기 (상단 카드 내 CTA) */}
              <div className="bg-white border border-gray-200 rounded-2xl p-6">
                <h3 className="text-lg font-semibold mb-4">시간 선택</h3>
                <div className="grid grid-cols-2 gap-3 mb-6">
                  {MOCK_TIMETABLE.map((time) => {
                    const isSelected = selectedTime === time;
                    return (
                      <button
                        key={time}
                        onClick={() => setSelectedTime(time)}
                        className={[
                          "py-3 px-4 rounded-lg text-sm font-medium transition-colors",
                          isSelected
                            ? "bg-[#2D4739] text-white"
                            : "bg-gray-50 hover:bg-gray-100 text-gray-700",
                        ].join(" ")}
                      >
                        {time}
                      </button>
                    );
                  })}
                </div>

                <button
                  ref={inlineCtaRef}
                  onClick={handleApply}
                  className="w-full py-4 bg-[#2D4739] text-white font-semibold rounded-xl hover:opacity-90 transition-opacity"
                >
                  신청하기
                </button>
              </div>
            </section>

            {/* 하단 섹션: 탭 네비게이션 + 콘텐츠 */}
            <section className="bg-white border border-gray-200 rounded-2xl">
              <nav className="flex border-b border-gray-200">
                <button
                  onClick={() => setActiveTab("detail")}
                  className={[
                    "flex-1 py-4 px-6 text-center font-medium transition-colors",
                    activeTab === "detail"
                      ? "text-[#2D4739] border-b-2 border-[#2D4739]"
                      : "text-gray-600 hover:text-gray-900",
                  ].join(" ")}
                >
                  상세보기
                </button>
                <button
                  onClick={() => setActiveTab("store")}
                  className={[
                    "flex-1 py-4 px-6 text-center font-medium transition-colors",
                    activeTab === "store"
                      ? "text-[#2D4739] border-b-2 border-[#2D4739]"
                      : "text-gray-600 hover:text-gray-900",
                  ].join(" ")}
                >
                  스토어 정보 보기
                </button>
              </nav>

              <div className="p-6">
                {activeTab === "detail" ? (
                  <div className="prose max-w-none">
                    <h3 className="text-xl font-semibold mb-4">클래스 상세 정보</h3>
                    <div className="space-y-4 text-gray-700">
                      <p>"{item.title}" 클래스에 오신 것을 환영합니다.</p>
                      <p>본 클래스에서는 전문적인 수공예 기법을 배우실 수 있습니다.</p>

                      <h4 className="font-semibold mt-6 mb-2">준비물</h4>
                      <ul className="list-disc list-inside space-y-1">
                        <li>개인 앞치마</li>
                        <li>필기구</li>
                        <li>편안한 복장</li>
                      </ul>

                      <h4 className="font-semibold mt-6 mb-2">진행 방식</h4>
                      <p>2-3시간 동안 단계별로 진행되며, 개인별 맞춤 지도를 받으실 수 있습니다.</p>

                      <h4 className="font-semibold mt-6 mb-2">유의사항</h4>
                      <p>수업 시작 10분 전까지 도착해주시기 바랍니다.</p>
                      <h4 className="font-semibold mt-6 mb-2">진행 방식</h4>
                      <p>2-3시간 동안 단계별로 진행되며, 개인별 맞춤 지도를 받으실 수 있습니다.</p>

                      <h4 className="font-semibold mt-6 mb-2">유의사항</h4>
                      <p>수업 시작 10분 전까지 도착해주시기 바랍니다.</p>
                      <h4 className="font-semibold mt-6 mb-2">진행 방식</h4>
                      <p>2-3시간 동안 단계별로 진행되며, 개인별 맞춤 지도를 받으실 수 있습니다.</p>

                      <h4 className="font-semibold mt-6 mb-2">유의사항</h4>
                      <p>수업 시작 10분 전까지 도착해주시기 바랍니다.</p>
                      <h4 className="font-semibold mt-6 mb-2">진행 방식</h4>
                      <p>2-3시간 동안 단계별로 진행되며, 개인별 맞춤 지도를 받으실 수 있습니다.</p>

                      <h4 className="font-semibold mt-6 mb-2">유의사항</h4>
                      <p>수업 시작 10분 전까지 도착해주시기 바랍니다.</p>
                      <h4 className="font-semibold mt-6 mb-2">진행 방식</h4>
                      <p>2-3시간 동안 단계별로 진행되며, 개인별 맞춤 지도를 받으실 수 있습니다.</p>

                      <h4 className="font-semibold mt-6 mb-2">유의사항</h4>
                      <p>수업 시작 10분 전까지 도착해주시기 바랍니다.</p>

                    </div>
                  </div>
                ) : (
                  <div>
                    <h3 className="text-xl font-semibold mb-4">스토어 정보</h3>
                    <div className="bg-gray-50 p-4 rounded-xl mb-4">
                      <h4 className="font-semibold mb-2">{item.host}</h4>
                      <p className="text-gray-600 mb-3">전문 수공예 스튜디오</p>
                      <button
                        onClick={handleStoreInfo}
                        className="px-4 py-2 bg-[#2D4739] text-white rounded-lg hover:opacity-90"
                      >
                        스토어 상세 정보 보기
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </section>
          </div>
        )}

        {/* ✅ "인라인 신청하기"가 안 보일 때만 나타나는 우측 하단 플로팅 CTA */}
        {showFixedButton && (
            <button
                onClick={scrollToCalendar}
                className="fixed bottom-5 z-50 h-14 px-6 rounded-full bg-[#2D4739] text-white font-semibold 
                        shadow-[0_8px_20px_rgba(0,0,0,0.15)] hover:opacity-90 transition-opacity"
                style={{
                right: "max(calc((100vw - 1440px) / 2 + 20px), 20px)" 
                // 1440px 컨테이너의 오른쪽 + 여백 20px
                }}
            >
                신청하기
            </button>
            )}
      </main>
    </>
  );
}
