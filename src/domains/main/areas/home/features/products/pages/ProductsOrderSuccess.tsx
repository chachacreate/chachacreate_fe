// src/domains/main/areas/home/features/products/pages/ProductsOrderSuccess.tsx
import React, { useMemo, useEffect, useRef } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { CheckCircle2, XCircle, Home, Receipt, ShoppingCart } from 'lucide-react';

import Header from '@src/shared/areas/layout/features/header/Header';
import Mainnavbar from '@src/shared/areas/navigation/features/navbar/main/Mainnavbar';

// 레거시 API 래퍼 (세션 기반)
import { legacyPost } from '@src/libs/request';

type ResultParam = { result?: 'success' | 'fail' };

const BRAND = '#2d4739';

const ProductsOrderSuccess: React.FC = () => {
  const { result } = useParams<ResultParam>();
  const navigate = useNavigate();
  const location = useLocation();
  const [search] = useSearchParams();

  // optional 정보: query 또는 navigation state로 받을 수 있게
  const orderId =
    (location.state as any)?.orderId ??
    search.get('orderId') ??
    (location.state as any)?.oid ??
    undefined;

  const amountRaw = (location.state as any)?.amount ?? search.get('amount') ?? undefined;

  const message = (location.state as any)?.message ?? search.get('message') ?? undefined;

  const amount = useMemo(() => {
    if (amountRaw == null) return undefined;
    const n = Number(amountRaw);
    return Number.isFinite(n) ? n : undefined;
  }, [amountRaw]);

  const toKRW = (v: number) =>
    new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
      maximumFractionDigits: 0,
    }).format(v);

  const isSuccess = result === 'success';
  const isFail = result === 'fail';

  // 주문 성공 시 재고 차감 API를 딱 한 번만 호출하기 위한 가드
  const calledRef = useRef(false);

  useEffect(() => {
    if (!isSuccess || !orderId || calledRef.current) return;
    calledRef.current = true; // React StrictMode 중복 실행 가드

    // 새로고침/재진입 시 중복 호출 방지(클라 1차 가드)
    const onceKey = `stock:decrease:${orderId}`;
    if (sessionStorage.getItem(onceKey)) return;

    (async () => {
      try {
        // 상태 변경이므로 POST 사용
        const res = await legacyPost<any>(`/inventory/adjustments/orders/${orderId}`);
        // console.log('[stock-decrease][OK]', res);
        sessionStorage.setItem(onceKey, '1');
      } catch (err) {
        console.error('[stock-decrease][FAIL]', err);
        // 실패 시 onceKey 저장하지 않음 → 사용자가 새로고침하면 재시도 가능
      }
    })();
  }, [isSuccess, orderId]);

  return (
    <div
      className="min-h-screen font-jua"
      style={{ background: 'linear-gradient(135deg,#f8fafc 0%,#f1f5f9 100%)' }}
    >
      <Header />
      <Mainnavbar />

      <div className="max-w-[960px] mx-auto px-4 py-10">
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-8">
          <div className="flex flex-col items-center text-center gap-4">
            {isSuccess ? (
              <>
                <CheckCircle2 className="w-16 h-16 text-emerald-500" />
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                  결제가 완료되었습니다
                </h1>
                <p className="text-gray-600">주문이 정상적으로 접수되었어요.</p>
              </>
            ) : isFail ? (
              <>
                <XCircle className="w-16 h-16 text-red-500" />
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                  결제에 실패했습니다
                </h1>
                <p className="text-gray-600">
                  {message
                    ? decodeURIComponent(String(message))
                    : '다시 시도해 주세요. 문제가 계속되면 문의해 주세요.'}
                </p>
              </>
            ) : (
              <>
                <XCircle className="w-16 h-16 text-amber-500" />
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900">알 수 없는 상태</h1>
                <p className="text-gray-600">결제 결과를 확인할 수 없어요.</p>
              </>
            )}

            <div className="w-full h-px bg-gray-200 my-6" />

            {/* 주문/결제 요약 */}
            {(orderId || amount !== undefined) && (
              <div className="w-full max-w-[560px] grid grid-cols-1 md:grid-cols-2 gap-4">
                {orderId && (
                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-left">
                    <div className="text-sm text-gray-500">주문번호</div>
                    <div className="mt-1 text-lg font-semibold text-gray-900">{orderId}</div>
                  </div>
                )}
                {amount !== undefined && (
                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-left">
                    <div className="text-sm text-gray-500">결제 금액</div>
                    <div className="mt-1 text-lg font-semibold text-gray-900">{toKRW(amount)}</div>
                  </div>
                )}
              </div>
            )}

            {/* 액션 */}
            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              {isSuccess ? (
                <>
                  <button
                    onClick={() => navigate('/main/mypage/orders')}
                    className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-white font-semibold"
                    style={{ backgroundColor: BRAND }}
                  >
                    <Receipt className="w-5 h-5" />
                    주문내역으로 가기
                  </button>
                  <a
                    href="http://localhost/main"
                    className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 no-underline text-gray-900"
                  >
                    <Home className="w-5 h-5" />
                    홈으로
                  </a>
                </>
              ) : (
                <>
                  <button
                    onClick={() => navigate('/main/order')}
                    className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-white font-semibold"
                    style={{ backgroundColor: BRAND }}
                  >
                    <ShoppingCart className="w-5 h-5" />
                    결제 다시 시도
                  </button>
                  <a
                    href="http://localhost/main"
                    className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 no-underline text-gray-900"
                  >
                    <Home className="w-5 h-5" />
                    홈으로
                  </a>
                </>
              )}
            </div>
          </div>
        </div>

        {/* 안내 박스 */}
        <div className="mt-6 text-center text-sm text-gray-500">
          문제가 계속되면 고객센터로 문의해 주세요.
        </div>
      </div>
    </div>
  );
};

export default ProductsOrderSuccess;
