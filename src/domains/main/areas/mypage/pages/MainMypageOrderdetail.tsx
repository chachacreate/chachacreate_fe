// src/domains/main/areas/mypage/pages/MainMypageOrderdetail.tsx
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ChevronLeft,
  CreditCard,
  MapPin,
  Package,
  Truck,
  XCircle,
  RotateCcw,
  Loader2,
} from 'lucide-react';

import Header from '@src/shared/areas/layout/features/header/Header';
import Mainnavbar from '@src/shared/areas/navigation/features/navbar/main/Mainnavbar';
import MypageSidenavbar from '@src/shared/areas/navigation/features/sidenavbar/mypage/MypageSidenavbar';

import { legacyGet, legacyPost } from '@src/libs/request';

/* ======================== Types ======================== */
type Params = { orderId?: string };

interface OrderItem {
  productId: number;
  productName: string;
  orderCnt: number;
  orderPrice: number;
  pimgUrl?: string;
  storeUrl?: string;
}

interface OrderDetail {
  orderId: string | number;
  orderStatus?: string;
  orderName: string;
  orderPhone: string;
  postNum?: string;
  addressRoad?: string;
  addressDetail?: string;
  addressExtra?: string;
  totalAmount: number;
  orderItems: OrderItem[];
}

/* ============ 상태 타입 & 유틸 ============ */
type PreShippingStatus = '주문완료';
type ShippingStatus = '발송완료';
type FinalizedStatus = '배송완료' | '취소완료' | '환불완료';

const PRE_SHIPPING: readonly PreShippingStatus[] = ['주문완료'] as const;
const SHIPPING: ShippingStatus = '발송완료';
const FINALIZED: readonly FinalizedStatus[] = ['배송완료', '취소완료', '환불완료'] as const;

function isPreShipping(status?: string): status is PreShippingStatus {
  return !!status && (PRE_SHIPPING as readonly string[]).includes(status);
}
function isShipping(status?: string): status is ShippingStatus {
  return status === SHIPPING;
}
function isFinalized(status?: string): status is FinalizedStatus {
  return !!status && (FINALIZED as readonly string[]).includes(status);
}

/* ======================== Component ======================== */
const MainMypageOrderdetail: React.FC = () => {
  const { orderId } = useParams<Params>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<OrderDetail | null>(null);

  const fullAddress = useMemo(() => {
    if (!detail) return '';
    const parts = [detail.postNum, detail.addressRoad, detail.addressDetail, detail.addressExtra]
      .filter(Boolean)
      .map((s) => String(s).trim())
      .filter((s) => s.length > 0);
    return parts.join(' ');
  }, [detail]);

  const canCancel = useMemo(() => isPreShipping(detail?.orderStatus), [detail?.orderStatus]);
  const canRefund = useMemo(() => {
    const s = detail?.orderStatus;
    if (!s) return false;
    if (isShipping(s)) return true;
    // 배송완료/취소완료/환불완료 등 이후에는 비활성 (정책에 맞게 조정)
    return false;
  }, [detail?.orderStatus]);

  const fetchDetail = useCallback(async () => {
    if (!orderId) return;
    setLoading(true);
    setError(null);
    try {
      const response = await legacyGet<any>(`/main/mypage/orderdetail/${orderId}`);
      if (response?.status === 200 && response?.data) {
        setDetail(response.data as OrderDetail);
        console.log('Order detail:', response.data);
      } else {
        setError(response?.message ?? '주문 상세 정보를 불러오지 못했습니다.');
      }
    } catch (error: any) {
      console.error('API 요청 실패', error);
      setError('서버 통신 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const handleBack = () => {
    if (history.length > 1) history.back();
    else navigate('/main/mypage/orders');
  };

  const handleBackToOrders = () => {
    navigate('/main/mypage/orders');
  };

  const CANCEL_URL = (oid: string | number) => `/legacy/main/mypage/orders/${oid}/cancel`;
  const REFUND_URL = (oid: string | number) => `/legacy/main/mypage/orders/${oid}/refund`;

  const handleCancel = async () => {
    if (!detail) return;
    if (!confirm('해당 주문을 취소하시겠습니까?')) return;
    setSaving(true);
    try {
      const res = await legacyPost<any>(CANCEL_URL(detail.orderId), {});
      if (res?.status === 200) {
        alert('주문이 취소되었습니다.');
        await fetchDetail();
      } else {
        alert(res?.message ?? '주문 취소에 실패했습니다.');
      }
    } catch (e: any) {
      console.error('[OrderDetail] cancel error:', e);
      alert('요청 처리 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handleRefund = async () => {
    if (!detail) return;
    if (!confirm('환불을 요청하시겠습니까?')) return;
    setSaving(true);
    try {
      const res = await legacyPost<any>(REFUND_URL(detail.orderId), {});
      if (res?.status === 200) {
        alert('환불이 요청되었습니다.');
        await fetchDetail();
      } else {
        alert(res?.message ?? '환불 요청에 실패했습니다.');
      }
    } catch (e: any) {
      console.error('[OrderDetail] refund error:', e);
      alert('요청 처리 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const goProduct = (storeUrl: string | undefined, productId: number) => {
    const base = storeUrl && storeUrl !== '' ? `/${storeUrl}` : '/main';
    navigate(`${base}/products/${productId}`);
  };

  // 공통 본문(데스크톱/모바일에서 재사용)
  const Content = (
    <main className="space-y-6">
      {/* 로딩 / 에러 */}
      {loading && (
        <div className="flex items-center gap-2 text-gray-600 bg-gray-50 border border-gray-200 rounded-xl p-6 shadow-sm">
          <Loader2 className="w-5 h-5 animate-spin" />
          불러오는 중...
        </div>
      )}
      {error && !loading && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4">{error}</div>
      )}

      {!loading && !error && detail && (
        <>
          <div className="bg-gray-50 p-5 rounded-xl border border-gray-200 shadow-sm">
            <p className="font-semibold text-lg">주문번호: {detail.orderId}</p>
            <p className="text-gray-600">현재 상태: {detail.orderStatus}</p>
          </div>

          {/* 주문 상품 */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl shadow-sm p-5">
            <h3 className="font-semibold mb-3">주문 상품</h3>
            {detail.orderItems.map((item) => (
              <div key={item.productId} className="flex items-center gap-4 border-t py-2">
                <button
                  type="button"
                  onClick={() => goProduct(item.storeUrl, item.productId)}
                  className="w-16 h-16 rounded border overflow-hidden"
                >
                  {item.pimgUrl ? (
                    <img
                      src={item.pimgUrl}
                      alt={item.productName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-200" />
                  )}
                </button>
                <div className="flex-1">
                  <button
                    type="button"
                    onClick={() => goProduct(item.storeUrl, item.productId)}
                    className="font-medium hover:underline text-left"
                  >
                    {item.productName}
                  </button>
                  <p className="text-sm text-gray-500">
                    수량 {item.orderCnt}개 / {(item.orderPrice * item.orderCnt).toLocaleString()} 원
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* 배송지 정보 */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl shadow-sm p-5">
            <h3 className="font-semibold mb-3">배송지 정보</h3>
            <p>이름: {detail.orderName}</p>
            <p>전화번호: {detail.orderPhone}</p>
            <p>주소: {fullAddress}</p>
          </div>

          {/* 결제 정보 */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl shadow-sm p-5">
            <div className="flex items-center gap-2 mb-2">
              <CreditCard className="w-4 h-4" />
              <h3 className="font-semibold">결제 정보</h3>
            </div>
            <p>총 결제 금액: {detail.totalAmount.toLocaleString()} 원</p>
          </div>

          {/* 버튼 */}
          <div className="flex gap-3">
            <button
              onClick={handleCancel}
              disabled={!canCancel || saving}
              className={`px-4 py-2 rounded-xl border ${
                canCancel && !saving
                  ? 'bg-white hover:bg-gray-50 text-gray-800'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
              title={canCancel ? '주문취소' : '배송중 이전 단계에서만 취소 가능'}
            >
              <XCircle className="inline w-4 h-4 mr-1" />
              주문취소
            </button>

            <button
              onClick={handleRefund}
              disabled={!canRefund || saving || isFinalized(detail.orderStatus)}
              className={`px-4 py-2 rounded-xl border ${
                canRefund && !saving && !isFinalized(detail.orderStatus)
                  ? 'bg-white hover:bg-gray-50 text-gray-800'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
              title={canRefund ? '환불 요청' : '배송중 이후에 환불 요청 가능'}
            >
              <RotateCcw className="inline w-4 h-4 mr-1" />
              환불요청
            </button>
          </div>

          <div className="pb-12" />
        </>
      )}
    </main>
  );

  return (
    <div
      className="min-h-screen font-jua"
      style={{ background: 'linear-gradient(135deg,#f8fafc 0%,#f1f5f9 100%)' }}
    >
      <Header />
      <Mainnavbar />

      {/* 모바일 상단바 */}
      <div className="lg:hidden">
        <div className="sticky top-0 z-50 bg-white border-b border-gray-200">
          <div className="px-4 py-3 flex items-center gap-3">
            <button
              type="button"
              onClick={handleBack}
              className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-white border border-gray-200 shadow-sm hover:bg-gray-50 active:scale-95 transition-all"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-bold text-gray-900">주문 상세</h1>
            <div className="ml-auto" />
          </div>
        </div>
      </div>

      {/* 본문: 데스크톱 */}
      <div className="max-w-[1440px] mx-auto px-4 lg:px-0 mt-6">
        <div className="hidden lg:grid lg:grid-cols-[280px_1fr] gap-8">
          <div>
            <MypageSidenavbar />
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-lg p-6 lg:p-8">
            {/* 주문내역으로 돌아가기 버튼 */}
            <div className="mb-6">
              <button
                onClick={handleBackToOrders}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#2d4739] rounded-lg hover:bg-[#243c30] transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                주문내역으로 돌아가기
              </button>
            </div>

            {Content}
          </div>
        </div>

        {/* 본문: 모바일 */}
        <div className="lg:hidden">
          <div className="bg-white rounded-xl border border-gray-200 shadow-lg p-6 mt-4">
            {/* 주문내역으로 돌아가기 버튼 */}
            <div className="mb-6">
              <button
                onClick={handleBackToOrders}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                주문내역으로 돌아가기
              </button>
            </div>

            {Content}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MainMypageOrderdetail;
