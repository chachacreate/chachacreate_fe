// src/domains/seller/areas/class/features/insert/pages/ClassInsert.tsx
import type { FC, ChangeEvent, MouseEvent } from "react";
import { useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Header from "@src/shared/areas/layout/features/header/Header";
import Mainnavbar from "@src/shared/areas/navigation/features/navbar/main/Mainnavbar";
import SellerSidenavbar from "@src/shared/areas/navigation/features/sidenavbar/seller/SellerSidenavbar";
import DaumPostcodeEmbed from "react-daum-postcode";

type Params = { storeUrl: string };

type ScheduleRow = {
  id: string;
  startDate: string;  // YYYY-MM-DD
  endDate: string;    // YYYY-MM-DD
  startTime: string;  // HH:MM
  endTime: string;    // HH:MM
  intervalMin: number; // 30/60/90/120...
};

const MAX_NUM = 1_000_000_000_000; // 1조
const AI_SAMPLES = [
  "초보자도 따라오기 쉬운 도자기 원데이 클래스입니다. 기본 컵을 만들어보고 유약 색상도 선택해요.",
  "직접 만든 라탄 트레이로 공간에 포인트를 더해보세요. 안전한 재료와 친절한 가이드로 함께 합니다.",
  "가죽 소품 입문반: 카드지갑을 시작으로 스티칭 기초를 익힙니다. 선착순 소수정예!",
  "플라워 클래스: 제철 꽃으로 컬러 조합과 꽃다루는 법을 배워봅니다. 초보 환영!",
];

const timeOptions = Array.from({ length: 48 }, (_, i) => {
  const hh = String(Math.floor(i / 2)).padStart(2, "0");
  const mm = i % 2 === 0 ? "00" : "30";
  return `${hh}:${mm}`;
});
const intervalOptions = [30, 60, 90, 120, 150, 180];

const ClassInsert: FC = () => {
  const navigate = useNavigate();
  const { storeUrl = "" } = useParams<Params>();

  // ✅ 판매자 이력 여부 (임시: true → 오버레이 숨김)
  // TODO: 실제 API 연동 시 서버 값으로 대체
  const hasResume = true;

  // 기본 폼 상태
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [aiDesc, setAiDesc] = useState("");
  const [capacity, setCapacity] = useState<number | "">("");
  const [price, setPrice] = useState<number | "">("");

  // 장소/주소
  const [isPostcodeOpen, setIsPostcodeOpen] = useState(false);
  const [postcode, setPostcode] = useState("");
  const [address, setAddress] = useState("");
  const [addressDetail, setAddressDetail] = useState("");

  // 이미지 업로드
  const [images, setImages] = useState<{ id: string; file?: File; url: string }[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // 일정(동적)
  const [schedules, setSchedules] = useState<ScheduleRow[]>([
    {
      id: crypto.randomUUID(),
      startDate: "",
      endDate: "",
      startTime: "10:00",
      endTime: "18:00",
      intervalMin: 60,
    },
  ]);

  // 휴일
  const [holidays, setHolidays] = useState<string[]>([]);
  const [pendingHoliday, setPendingHoliday] = useState("");

  // 숫자 가드 (음수 X, 1조 미만)
  const guardInt = (v: string) => {
    if (!v) return "";
    const n = Number(v.replace(/[^\d]/g, ""));
    if (Number.isNaN(n)) return "";
    if (n < 0) return 0;
    if (n >= MAX_NUM) return MAX_NUM - 1;
    return n;
  };

  // 이미지 추가/삭제
  const onPickImages = (e: ChangeEvent<HTMLInputElement>) => {
  const files = e.target.files;
  if (!files || !files.length) return;

  const f = files[0]; // 첫 번째 파일만 사용
  const next = {
    id: crypto.randomUUID(),
    file: f,
    url: URL.createObjectURL(f),
  };

  // 이미 이미지가 있으면 교체, 없으면 추가
  setImages([next]);

  if (fileInputRef.current) fileInputRef.current.value = "";
};

  const removeImage = (id: string) => setImages((prev) => prev.filter((i) => i.id !== id));

  // AI 설명 목데이터
  const genAiDesc = () => {
    const pick = AI_SAMPLES[Math.floor(Math.random() * AI_SAMPLES.length)];
    setAiDesc(pick);
  };


  const updateSchedule = <K extends keyof ScheduleRow>(
    id: string,
    key: K,
    value: ScheduleRow[K]
  ) => {
    setSchedules((prev) => prev.map((s) => (s.id === id ? { ...s, [key]: value } : s)));
  };

  // 휴일 추가/삭제
  const addHoliday = () => {
    if (pendingHoliday && !holidays.includes(pendingHoliday)) {
      setHolidays((prev) => [...prev, pendingHoliday].sort());
    }
    setPendingHoliday("");
  };
  const removeHoliday = (d: string) =>
    setHolidays((prev) => prev.filter((x) => x !== d));

  // 제출 (데모)
  const onSubmit = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    // 간단 유효성 예시
    if (!title.trim()) return alert("클래스명을 입력해 주세요.");
    if (!address.trim()) return alert("클래스 장소(주소)를 입력해 주세요.");
    if (!capacity || Number(capacity) <= 0) return alert("최대 참여 인원을 1 이상으로 입력해 주세요.");
    if (!price || Number(price) <= 0) return alert("회당 가격을 1 이상으로 입력해 주세요.");
    if (schedules.some((s) => !s.startDate || !s.endDate))
      return alert("일정의 시작/종료 날짜를 입력해 주세요.");

    alert("등록(데모) — 콘솔 확인!");
    // eslint-disable-next-line no-console
    console.log({
      title,
      desc,
      aiDesc,
      address: { postcode, address, addressDetail },
      images,
      capacity,
      price,
      schedules,
      holidays,
    });
    navigate(`/seller/${storeUrl}/class/list`);
  };

  const addressSummary = useMemo(() => {
    if (!address) return "";
    return [address, addressDetail].filter(Boolean).join(" ");
  }, [address, addressDetail]);

  return (
    <>
      <Header />
      <Mainnavbar />

      <SellerSidenavbar>
        <div className="space-y-6 sm:space-y-8 relative">
          

          {/* 등록 폼 */}
          <section className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-6 lg:p-8">
            <h1 className="text-xl sm:text-2xl font-bold">클래스 등록</h1>
            <p className="mt-1 text-sm text-gray-500">storeUrl: {storeUrl}</p>
            <div className="mt-6 grid gap-5">

                {/* 상단 액션: + 사진 추가 */}
                <div className="flex flex-wrap gap-2">
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3 py-2 rounded-md border text-sm"
                    >
                        {images.length > 0 ? "사진 변경" : "+ 사진 추가"}
                    </button>

                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={onPickImages}
                        className="hidden"
                    />
                    </div>

                {/* 이미지 미리보기 */}
                {images.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {images.map((img) => (
                        <div key={img.id} className="relative rounded-lg overflow-hidden border">
                        {/* eslint-disable-next-line jsx-a11y/img-redundant-alt */}
                        <img src={img.url} alt="preview image" className="w-full h-40 object-cover" />
                        <button
                            type="button"
                            onClick={() => removeImage(img.id)}
                            className="absolute top-2 right-2 rounded-md bg-black/60 text-white text-xs px-2 py-1"
                        >
                            삭제
                        </button>
                        </div>
                    ))}
                    </div>
                )}

              {/* 클래스명 */}
              <label className="grid gap-1">
                <span className="text-sm font-medium">클래스명</span>
                <input
                  className="border rounded-md px-3 py-2"
                  placeholder="예) 도자기 원데이 클래스"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </label>

              {/* 장소(우편번호/주소) */}
              <div className="grid gap-3">
                <span className="text-sm font-medium">클래스 장소</span>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    className="border rounded-md px-3 py-2 sm:w-40"
                    placeholder="우편번호"
                    value={postcode}
                    readOnly
                  />
                  <button
                    type="button"
                    className="px-3 py-2 rounded-md border"
                    onClick={() => setIsPostcodeOpen(true)}
                  >
                    우편번호 찾기
                  </button>
                </div>
                <input
                  className="border rounded-md px-3 py-2"
                  placeholder="기본 주소"
                  value={address}
                  readOnly
                />
                <input
                  className="border rounded-md px-3 py-2"
                  placeholder="상세 주소"
                  value={addressDetail}
                  onChange={(e) => setAddressDetail(e.target.value)}
                />
                {addressSummary && (
                  <p className="text-xs text-gray-500">주소 미리보기: {addressSummary}</p>
                )}
              </div>

              {/* 상세설명 */}
              <label className="grid gap-1">
                <span className="text-sm font-medium">클래스 상세설명</span>
                <textarea
                  className="border rounded-md px-3 py-2 min-h-[120px]"
                  placeholder="클래스 소개, 커리큘럼, 난이도, 준비물 등을 적어주세요."
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                />
              </label>

              {/* AI 설명 (목데이터) */}
              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">AI 클래스 설명 멘트</span>
                  <button
                    type="button"
                    className="px-3 py-1.5 rounded-md border text-sm"
                    onClick={genAiDesc}
                  >
                    생성하기
                  </button>
                </div>
                <textarea
                  className="border rounded-md px-3 py-2 min-h-[100px]"
                  placeholder="‘생성하기’를 누르면 임시 멘트가 채워집니다."
                  value={aiDesc}
                  onChange={(e) => setAiDesc(e.target.value)}
                />
              </div>

              {/* 최대 인원 / 가격 */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <label className="grid gap-1">
                  <span className="text-sm font-medium">클래스 최대 참여 인원</span>
                  <input
                    inputMode="numeric"
                    className="border rounded-md px-3 py-2"
                    placeholder="예) 8"
                    value={capacity}
                    onChange={(e) =>
                      setCapacity(guardInt(e.target.value) as number | "")
                    }
                  />
                </label>
                <label className="grid gap-1">
                  <span className="text-sm font-medium">클래스 회당 가격(원)</span>
                  <input
                    inputMode="numeric"
                    className="border rounded-md px-3 py-2"
                    placeholder="예) 55000"
                    value={price}
                    onChange={(e) => setPrice(guardInt(e.target.value) as number | "")}
                  />
                </label>
              </div>

              {/* 가능 날짜/시간 (동적 행) */}
              <div className="grid gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">클래스 가능 날짜/시간</span>
                </div>

                <div className="space-y-3">
                    {schedules.map((s) => (
                        <div
                        key={s.id}
                        className="rounded-xl border p-3 sm:p-4 grid gap-3 
                                    sm:grid-cols-2 lg:grid-cols-5 lg:items-end"
                        >
                        <label className="grid gap-1 lg:col-span-1">
                            <span className="text-xs sm:text-sm font-medium">시작 날짜</span>
                            <input
                            type="date"
                            className="border rounded-md px-3 py-2"
                            value={s.startDate}
                            onChange={(e) => updateSchedule(s.id, "startDate", e.target.value)}
                            />
                        </label>

                        <label className="grid gap-1 lg:col-span-1">
                            <span className="text-xs sm:text-sm font-medium">종료 날짜</span>
                            <input
                            type="date"
                            className="border rounded-md px-3 py-2"
                            value={s.endDate}
                            onChange={(e) => updateSchedule(s.id, "endDate", e.target.value)}
                            />
                        </label>

                        <label className="grid gap-1 lg:col-span-1">
                            <span className="text-xs sm:text-sm font-medium">시작 시간</span>
                            <select
                            className="border rounded-md px-3 py-2"
                            value={s.startTime}
                            onChange={(e) => updateSchedule(s.id, "startTime", e.target.value)}
                            >
                            {timeOptions.map((t) => (
                                <option key={`st-${s.id}-${t}`} value={t}>
                                {t}
                                </option>
                            ))}
                            </select>
                        </label>

                        <label className="grid gap-1 lg:col-span-1">
                            <span className="text-xs sm:text-sm font-medium">종료 시간</span>
                            <select
                            className="border rounded-md px-3 py-2"
                            value={s.endTime}
                            onChange={(e) => updateSchedule(s.id, "endTime", e.target.value)}
                            >
                            {timeOptions.map((t) => (
                                <option key={`et-${s.id}-${t}`} value={t}>
                                {t}
                                </option>
                            ))}
                            </select>
                        </label>

                        <label className="grid gap-1 lg:col-span-1">
                            <span className="text-xs sm:text-sm font-medium">시간 간격(분)</span>
                            <select
                            className="border rounded-md px-3 py-2"
                            value={s.intervalMin}
                            onChange={(e) => updateSchedule(s.id, "intervalMin", Number(e.target.value))}
                            >
                            {intervalOptions.map((m) => (
                                <option key={`iv-${s.id}-${m}`} value={m}>
                                {m}
                                </option>
                            ))}
                            </select>
                        </label>
                        </div>
                    ))}
                    </div>

              </div>

              {/* 휴일 설정 */}
              <div className="grid gap-2">
                <span className="text-sm font-medium">클래스 휴일 설정</span>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="date"
                    className="border rounded-md px-3 py-2"
                    value={pendingHoliday}
                    onChange={(e) => setPendingHoliday(e.target.value)}
                  />
                  <button
                    type="button"
                    className="px-3 py-2 rounded-md border"
                    onClick={addHoliday}
                  >
                    + 휴일 추가
                  </button>
                </div>
                {holidays.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {holidays.map((d) => (
                      <span
                        key={d}
                        className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm"
                      >
                        {d}
                        <button
                          type="button"
                          className="text-gray-500 hover:text-gray-900"
                          onClick={() => removeHoliday(d)}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* 예약 관련 주의사항 */}
              <label className="grid gap-1">
                <span className="text-sm font-medium">예약 관련 주의사항</span>
                <textarea
                  className="border rounded-md px-3 py-2 min-h-[100px]"
                  placeholder="환불 규정, 지각/결석 안내 등"
                />
              </label>

              {/* 제출 버튼 */}
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <button
                  type="button"
                  className="w-full sm:w-auto px-4 py-2 rounded-md bg-[#2D4739] text-white"
                  onClick={onSubmit}
                >
                  등록
                </button>
              </div>
            </div>
          </section>

          {/* 항상 DOM에 남아있는 '이력 안내' 오버레이 (모바일 상단 정렬) */}
          <div
            className={[
              "absolute inset-0 flex justify-center p-4 sm:p-6 transition-opacity",
              hasResume
                ? "opacity-0 pointer-events-none" // ✅ 숨김
                : "opacity-100 items-start sm:items-center pt-12 sm:pt-0",
            ].join(" ")}
            aria-hidden={hasResume}
          >
            <div className="w-full max-w-[720px] rounded-2xl border bg-white/85 backdrop-blur-md shadow-xl p-4 sm:p-6">
              <h3 className="text-base sm:text-lg font-semibold">판매자 이력 등록이 필요해요</h3>
              <p className="mt-2 text-sm sm:text-base text-gray-700">
                클래스 등록 전에 판매자 이력이 등록되어 있어야 합니다.
                먼저 이력 페이지에서 프로필/경력 정보를 입력해 주세요.
              </p>
              <div className="mt-4 flex flex-col sm:flex-row gap-2 sm:gap-3">
                <button
                  onClick={() => navigate(`/seller/${storeUrl}/resumes`)}
                  className="w-full sm:w-auto px-4 py-2 rounded-md bg-[#2D4739] text-white"
                >
                  이력 등록하러 가기
                </button>
                <button
                  onClick={() => window.history.back()}
                  className="w-full sm:w-auto px-4 py-2 rounded-md border"
                >
                  뒤로가기
                </button>
              </div>
            </div>
          </div>
        </div>
      </SellerSidenavbar>

      {/* 우편번호 모달 */}
      {isPostcodeOpen && (
        <div className="fixed inset-0 z-[100] flex items-start sm:items-center justify-center p-4 bg-black/40">
          <div className="w-full max-w-[520px] rounded-xl overflow-hidden bg-white">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <h4 className="font-semibold">우편번호 찾기</h4>
              <button className="text-gray-500" onClick={() => setIsPostcodeOpen(false)}>
                ×
              </button>
            </div>
            <DaumPostcodeEmbed
              onComplete={(data) => {
                setPostcode(data.zonecode);
                setAddress(data.address);
                setIsPostcodeOpen(false);
              }}
              style={{ width: "100%", height: "420px" }}
            />
          </div>
        </div>
      )}
    </>
  );
};

export default ClassInsert;
