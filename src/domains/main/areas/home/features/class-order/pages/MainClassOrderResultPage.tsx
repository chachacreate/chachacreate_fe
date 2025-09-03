// src/domains/main/areas/home/features/class-order/pages/MainClassOrderResultPage.tsx
import { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import Header from '@src/shared/areas/layout/features/header/Header';
import Mainnavbar from '@src/shared/areas/navigation/features/navbar/main/Mainnavbar';
import { Check } from 'lucide-react';
import { post } from '@src/libs/request';

type OrderState = {
  classId?: string;
  date?: string;
  time?: string;
  item?: {
    title?: string;
    price?: number;
  };
};

export default function MainClassOrderResultPage() {
  const nav = useNavigate();
  const [searchParams] = useSearchParams();
  const { state } = useLocation();
  const { classId, date, time, item } = (state || {}) as OrderState;

  const storeUrl = 'main'; // 페이지 URL 경로 수정 후 반영 필요;

  const [responseData, setResponseData] = useState<any>(null);

  // 한 번만 호출 플래그
  const calledRef = useRef(false);

  useEffect(() => {
    const orderId = searchParams.get('orderId');
    const amount = searchParams.get('amount');
    const paymentKey = searchParams.get('paymentKey');

    if (calledRef.current || !orderId || !amount || !paymentKey || !storeUrl || !classId) return;

    calledRef.current = true; // 한 번만 실행되도록

    async function confirm() {
      try {
        const reservedTime = `${date}T${time}:00`; // '2025-09-02T22:00:00'
        const requestData = {
          id: orderId,
          reservedTime,
          amount: Number(amount),
          paymentKey,
        };

        const response = await post(`/${storeUrl}/classes/${classId}/reservations`, requestData);

        if (response.status === 201) {
          setResponseData(response.data);

          // URL 정리 후 status=success만 남기기
          nav(`/main/classes/order/result?status=success`, { replace: true });
        } else {
          console.error('클래스 예약 실패:', response.message);
        }
      } catch (error: any) {
        console.error('API 요청 실패:', error);
        nav('/main/classes/order', { replace: true });
      }
    }

    confirm();
  }, [searchParams, nav, date, time, storeUrl, classId]);

  if (!responseData) {
    return (
      <main className="flex items-center justify-center h-screen">
        <p className="text-lg font-medium">결제를 확인 중입니다...</p>
      </main>
    );
  }
  // responseData: 결제 승인 응답 데이터
  console.log(responseData);
  const title = responseData.classTitle ?? item?.title;
  const price = responseData.amount ?? item?.price;

  // const formatted = useMemo(() => {
  //   if (!date || !time) return '';
  //   const d = new Date(`${date}T${time}`);
  //   const yoil = ['일', '월', '화', '수', '목', '금', '토'][d.getDay()];
  //   const yyyy = d.getFullYear();
  //   const mm = String(d.getMonth() + 1).padStart(2, '0');
  //   const dd = String(d.getDate()).padStart(2, '0');
  //   const hh = String(d.getHours()).padStart(2, '0');
  //   const mi = String(d.getMinutes()).padStart(2, '0');
  //   return `${yyyy}.${mm}.${dd}(${yoil})  ${hh}:${mi}`;
  // }, [date, time]);

  return (
    <>
      <Header />
      <Mainnavbar />

      {/* 최대 1920, 2xl에서 좌우 240px 패딩 */}
      <main
        className="relative mx-auto max-w-[1920px] px-4 sm:px-8 lg:px-12 xl:px-20 2xl:px-[240px]
                 py-8 sm:py-10 pb-[calc(80px+env(safe-area-inset-bottom))] md:pb-12"
      >
        {/* 축하 배경 (반응형, 애니메이션) */}
        <ConfettiBg />

        <section className="relative z-10 mx-auto w-full max-w-[860px] text-center">
          {/* 체크 아이콘 */}
          <div className="mx-auto mb-5 sm:mb-6 grid h-20 w-20 sm:h-24 sm:w-24 place-items-center rounded-full bg-[#2D4739]">
            <Check className="h-10 w-10 sm:h-12 sm:w-12 bg-[#2D4739] text-[#ffffff]" />
          </div>

          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight">
            예약이 완료되었습니다!
          </h1>

          <hr className="my-5 sm:my-6 border-gray-200" />

          {/* 정보 표 */}
          <div className="mx-auto max-w-[760px]">
            <dl className="grid grid-cols-1 sm:grid-cols-[120px_1fr] gap-y-2.5 sm:gap-y-3 gap-x-6 text-left">
              <dt className="text-gray-600 font-medium">클래스명</dt>
              <dd className="font-semibold break-words">🍑 {title}</dd>

              <dt className="text-gray-600 font-medium">예약일</dt>
              <dd className="font-semibold">
                {date ?? responseData.reservedTime?.split('T')[0] ?? '미지정'}{' '}
                {time ??
                  responseData.reservedTime?.split('T')[1]?.slice(0, 5) ?? // "22:00:00" -> "22:00"
                  ''}
              </dd>

              <dt className="text-gray-600 font-medium">결제금액</dt>
              <dd className="font-extrabold">{price.toLocaleString()} 원</dd>
            </dl>
          </div>

          {/* 버튼들 */}
          <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-5">
            <button
              onClick={() => nav('/main/classes')}
              className="h-11 sm:h-12 px-6 sm:px-7 rounded-full bg-[#2D4739] text-white font-semibold hover:opacity-90 w-full sm:w-auto"
            >
              목록으로
            </button>
            <button
              onClick={() => nav('/main/mypage/classes')}
              className="h-11 sm:h-12 px-6 sm:px-7 rounded-full bg-[#2D4739] text-white font-semibold hover:opacity-90 w-full sm:w-auto"
            >
              예약확인
            </button>
          </div>
        </section>
      </main>
    </>
  );
}

/** 축하 배경: tailwind 유틸로 스타일링 + 인라인 keyframes로 자연스러운 낙하 애니메이션 */
function ConfettiBg() {
  // 여러 조각을 생성 (사이즈/위치/지연시간 랜덤)
  const pieces = Array.from({ length: 36 }).map((_, i) => {
    const left = Math.random() * 100; // %
    const size = 6 + Math.random() * 14; // px
    const duration = 6 + Math.random() * 6; // s
    const delay = -Math.random() * 6; // s
    const colors = ['bg-pink-300', 'bg-yellow-300', 'bg-teal-300', 'bg-indigo-300', 'bg-rose-300'];
    const color = colors[i % colors.length];
    const rotate = Math.floor(Math.random() * 360);
    const opacity = 0.6 + Math.random() * 0.35;
    const borderRadius = Math.random() > 0.5 ? '9999px' : '4px'; // 원형/사각 혼합
    return { left, size, duration, delay, color, rotate, opacity, borderRadius };
  });

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      {/* keyframes 정의 (컴포넌트 내부에 삽입) */}
      <style>{`
        @keyframes confetti-fall {
          0%   { transform: translateY(-120%) rotate(0deg); }
          100% { transform: translateY(120vh) rotate(360deg); }
        }
        @keyframes confetti-sway {
          0%,100% { transform: translateX(0); }
          50%     { transform: translateX(24px); }
        }
      `}</style>

      {/* 낙하하는 종이 조각들 */}
      {pieces.map((p, idx) => (
        <span
          key={idx}
          className={`absolute ${p.color} shadow-sm`}
          style={{
            left: `${p.left}%`,
            top: `-10%`,
            width: `${p.size}px`,
            height: `${p.size * 0.6}px`,
            opacity: p.opacity,
            borderRadius: p.borderRadius as any,
            transform: `rotate(${p.rotate}deg)`,
            animation: `confetti-fall ${p.duration}s linear infinite`,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}

      {/* 큰 리본 느낌의 배경 장식 (느리게 흔들리며 떨어짐) */}
      <span
        className="absolute -left-10 top-28 h-20 w-20 rounded-full bg-pink-300/60 blur-[1px]"
        style={{
          animation: 'confetti-fall 14s linear infinite, confetti-sway 6s ease-in-out infinite',
          animationDelay: '-3s',
        }}
      />
      <span
        className="absolute right-6 top-16 h-24 w-24 rounded-full bg-teal-300/60 blur-[1px]"
        style={{
          animation: 'confetti-fall 16s linear infinite, confetti-sway 7s ease-in-out infinite',
          animationDelay: '-5s',
        }}
      />
      <span
        className="absolute left-1/3 top-10 h-14 w-14 rounded-full bg-yellow-300/70 blur-[1px]"
        style={{
          animation: 'confetti-fall 13s linear infinite, confetti-sway 5.5s ease-in-out infinite',
          animationDelay: '-2s',
        }}
      />
      <span
        className="absolute right-1/4 bottom-12 h-20 w-20 rounded-full bg-rose-300/70 blur-[1px]"
        style={{
          animation: 'confetti-fall 15s linear infinite, confetti-sway 6.5s ease-in-out infinite',
          animationDelay: '-4s',
        }}
      />
    </div>
  );
}
