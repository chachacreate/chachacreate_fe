// src/domains/main/areas/home/features/class-order/pages/MainClassOrderPage.tsx
import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import Header from "@src/shared/areas/layout/features/header/Header";
import Mainnavbar from "@src/shared/areas/navigation/features/navbar/main/Mainnavbar";
import { ArrowLeft } from "lucide-react";

type OrderState = {
  classId?: string;
  date?: string; // "YYYY-MM-DD"
  time?: string; // "HH:mm"
  item?: {
    title?: string;
    host?: string;
    price?: number;
    location?: string;
    thumbnail?: string;
  };
};

export default function MainClassOrderPage() {
  const nav = useNavigate();
  const { state } = useLocation();
  const { classId, date, time, item } = (state || {}) as OrderState;

  // 표시용 더미
  const title = item?.title ?? "여름 복숭아 요거트 케이크 만들기!";
  const host = item?.host ?? "{store}의 클래스";
  const locationText = item?.location ?? "장소 상세";
  const price = item?.price ?? 20000;

  // 결제/동의
  const [payMethod, setPayMethod] = useState<"bank" | "card">("bank");
  const [agreeAll, setAgreeAll] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [agreeNotice, setAgreeNotice] = useState(false);
  const [agreeMarketing, setAgreeMarketing] = useState(false);

  // 전체 동의 동기화
  useEffect(() => {
    if (agreeAll) {
      setAgreePrivacy(true);
      setAgreeNotice(true);
      setAgreeMarketing(true);
    }
  }, [agreeAll]);

  const formatted = useMemo(() => {
    if (!date || !time) return "";
    const d = new Date(`${date}T${time}`);
    const yoil = ["일", "월", "화", "수", "목", "금", "토"][d.getDay()];
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const hh = String(d.getHours()).padStart(2, "0");
    const mi = String(d.getMinutes()).padStart(2, "0");
    return `${yyyy}.${mm}.${dd}(${yoil})  ${hh}:${mi}`;
  }, [date, time]);

  return (
    <>
      <Header />
      <Mainnavbar />

      {/* 1920 폭 한정 + 2xl에서 좌우 240px 패딩, 하위 브레이크포인트는 자동 축소 */}
      <main className="mx-auto max-w-[1920px] px-4 sm:px-6 lg:px-12 xl:px-20 2xl:px-[240px] py-4 sm:py-6 lg:py-8">
        {/* ← 수정하기 */}
        <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
          <button
            onClick={() => nav(-1)}
            className="inline-flex items-center gap-1 text-gray-700 hover:text-gray-900"
          >
            <ArrowLeft className="h-5 w-5" />
            <span className="text-sm font-medium">수정하기</span>
          </button>
        </div>

        {/* 반응형 그리드: 모바일 1열, xl부터 좌(1.4fr)/우(1fr) */}
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] gap-4 sm:gap-6">
          {/* 좌측 */}
          <div className="space-y-4 sm:space-y-6">
            {/* 예약 클래스 정보 */}
            <section className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-6 shadow-sm">
              <h2 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">
                예약 클래스 정보
              </h2>

              <div className="flex flex-col md:flex-row gap-4 sm:gap-5">
                {/* 썸네일 */}
                <div className="w-full md:w-[350px]">
                  <div className="relative w-full aspect-[16/9] md:aspect-[2/1] rounded-xl overflow-hidden border border-gray-200">
                    {item?.thumbnail ? (
                      <img
                        src={item.thumbnail}
                        alt={title}
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                    ) : (
                      <div className="absolute inset-0 bg-gray-100 grid place-items-center">
                        <span className="text-gray-500 text-sm">클래스 이미지</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* 텍스트 */}
                <div className="flex-1 flex flex-col justify-between">
                  <div className="space-y-1.5 sm:space-y-2">
                    <p className="text-[16px] sm:text-[18px] lg:text-[20px] font-bold leading-[1.5]">
                      {title}
                    </p>
                    <p className="text-gray-600 text-sm sm:text-base">{host}</p>
                    <p className="text-gray-500 text-sm sm:text-base">{locationText}</p>
                  </div>

                  <div className="mt-3 sm:mt-4">
                    <p className="text-gray-800 font-medium text-sm sm:text-base">
                      {formatted || "날짜/시간 미선택"}
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* 안내사항/주의사항 (내부 스크롤) */}
            <section className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-6 shadow-sm">
              <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">
                안내사항 / 주의사항
              </h3>
              <div className="rounded-xl border border-gray-100 p-3 sm:p-4 leading-relaxed text-[13px] sm:text-[14px] text-gray-700 overflow-auto max-h-[220px] sm:max-h-[260px] md:max-h-[300px] xl:max-h-[360px]">
                <ol className="list-decimal ml-4 sm:ml-5 space-y-2">
                  <li>
                    <strong>예약 및 결제</strong>
                    <ul className="list-disc ml-4 sm:ml-5 mt-2 space-y-1">
                      <li>클래스 예약은 선착순으로 진행됩니다.</li>
                      <li>결제는 플랫폼의 안전한 결제 수단을 통해 진행됩니다.</li>
                      <li>결제 완료 후 ‘예약 완료’ 상태로 전환됩니다.</li>
                    </ul>
                  </li>
                  <li>
                    <strong>취소 및 환불 규정</strong>
                    <ul className="list-disc ml-4 sm:ml-5 mt-2 space-y-1">
                      <li>시작 7일 전까지 취소 시: 100% 환불</li>
                      <li>시작 3일 전까지 취소 시: 50% 환불</li>
                      <li>시작 2일 이내 또는 당일 취소 시: 환불 불가</li>
                    </ul>
                  </li>
                  <li>
                    <strong>유의사항</strong>
                    <ul className="list-disc ml-4 sm:ml-5 mt-2 space-y-1">
                      <li>수업 시작 10분 전까지 도착해 주세요.</li>
                      <li>무단 지각/결석 시 별도 보상이 제공되지 않습니다.</li>
                      <li>강사의 사정으로 취소 시 전액 환불됩니다.</li>
                    </ul>
                  </li>
                </ol>
              </div>
            </section>
          </div>

          {/* 우측 (xl 이상 sticky, 모바일/태블릿은 일반 흐름) */}
          <aside className="xl:sticky xl:top-20 self-start">
            <section className="
                rounded-2xl border border-gray-200 bg-white
                p-4 sm:p-6 shadow-sm
                pb-[calc(64px+env(safe-area-inset-bottom))] md:pb-6
                ">
              <div className="grid grid-cols-1 sm:grid-cols-[120px_1fr] gap-y-4 sm:gap-y-5 gap-x-4">
                <label className="text-gray-700 font-medium mt-1 sm:mt-2">예약자명</label>
                <div className="grid">
                  <div className="relative">
                    <input
                      type="text"
                      className="h-10 sm:h-11 w-full rounded-lg border border-gray-300 px-3 focus:outline-none focus:ring-2 focus:ring-gray-900"
                      placeholder="이름 입력"
                    />
                   
                  </div>
                </div>

                <label className="text-gray-700 font-medium mt-1 sm:mt-2">연락처</label>
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <input
                    type="tel"
                    className="h-10 sm:h-11 w-16 sm:w-20 rounded-lg border border-gray-300 px-2 sm:px-3 focus:outline-none focus:ring-2 focus:ring-gray-900"
                    defaultValue="010"
                  />
                  <span>-</span>
                  <input
                    type="tel"
                    className="h-10 sm:h-11 w-20 sm:w-24 rounded-lg border border-gray-300 px-2 sm:px-3 focus:outline-none focus:ring-2 focus:ring-gray-900"
                    placeholder="1234"
                  />
                  <span>-</span>
                  <input
                    type="tel"
                    className="h-10 sm:h-11 w-20 sm:w-24 rounded-lg border border-gray-300 px-2 sm:px-3 focus:outline-none focus:ring-2 focus:ring-gray-900"
                    placeholder="5678"
                  />
                </div>

                <label className="text-gray-700 font-medium mt-1 sm:mt-2">결제금액</label>
                <div className="text-[16px] sm:text-[18px] font-bold text-rose-600">
                  {price.toLocaleString()}원
                </div>

                <label className="text-gray-700 font-medium mt-1 sm:mt-2">결제방법</label>
                <div className="flex items-center gap-4 sm:gap-6">
                  <label className="inline-flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="pay"
                      checked={payMethod === "bank"}
                      onChange={() => setPayMethod("bank")}
                    />
                    <span>무통장 입금</span>
                  </label>
                  <label className="inline-flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="pay"
                      checked={payMethod === "card"}
                      onChange={() => setPayMethod("card")}
                    />
                    <span>카드결제</span>
                  </label>
                </div>

                <label className="text-gray-700 font-medium mt-1 sm:mt-2">약관동의</label>
                <div className="space-y-2.5 sm:space-y-3">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={agreeAll}
                      onChange={(e) => setAgreeAll(e.target.checked)}
                    />
                    <span className="font-medium text-sm">전체동의</span>
                  </label>

                  <label className="flex items-center gap-2 text-[12px] sm:text-sm">
                    <input
                      type="checkbox"
                      checked={agreePrivacy}
                      onChange={(e) => setAgreePrivacy(e.target.checked)}
                    />
                    <span>
                      개인정보 수집 및 이용안내 <button className="underline">(보기)</button>
                    </span>
                  </label>

                  <label className="flex items-center gap-2 text-[12px] sm:text-sm">
                    <input
                      type="checkbox"
                      checked={agreeNotice}
                      onChange={(e) => setAgreeNotice(e.target.checked)}
                    />
                    <span>
                      결제관련 주의사항 안내 <button className="underline">(보기)</button>
                    </span>
                  </label>

                  <label className="flex items-center gap-2 text-[12px] sm:text-sm">
                    <input
                      type="checkbox"
                      checked={agreeMarketing}
                      onChange={(e) => setAgreeMarketing(e.target.checked)}
                    />
                    <span>마케팅 수신 동의 (선택)</span>
                  </label>
                </div>
              </div>

              {/* 결제 버튼 */}
              <div className="mt-6 sm:mt-8">
                <button
                    disabled={!(agreePrivacy && agreeNotice)}
                    onClick={() => {
                        if (!(agreePrivacy && agreeNotice)) return;

                        // TODO: 실제 결제 API 연동 후, 성공/실패에 맞춰 아래 경로로 이동
                        nav("/main/classes/order/result?status=success", {
                        state: { classId, date, time, item }, // 결과 페이지에서 표시용
                        });
                        // 실패 테스트 시:
                        // nav("/main/classes/order/result?status=fail", { state: { classId, date, time, item } });
                    }}
                    className={[
                        "w-full h-12 sm:h-14 rounded-full font-semibold shadow-[0_8px_20px_rgba(0,0,0,0.15)]",
                        agreePrivacy && agreeNotice
                        ? "bg-[#2D4739] text-white hover:opacity-90"
                        : "bg-gray-200 text-gray-500 cursor-not-allowed",
                    ].join(" ")}
                    >
                    결제하기
                    </button>
              </div>
            </section>
          </aside>
        </div>

        {/* 안내 텍스트 (선택) */}
        {(!classId || !date || !time) && (
          <p className="mt-3 sm:mt-4 text-[11px] sm:text-xs text-gray-500">
            * 상세 페이지에서 날짜/시간 선택 후 넘어오면 자동으로 표시됩니다.
          </p>
        )}
      </main>
    </>
  );
}
