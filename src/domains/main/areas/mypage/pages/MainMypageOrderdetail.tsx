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
  X,
} from 'lucide-react';

import Header from '@src/shared/areas/layout/features/header/Header';
import Mainnavbar from '@src/shared/areas/navigation/features/navbar/main/Mainnavbar';
import MypageSidenavbar from '@src/shared/areas/navigation/features/sidenavbar/mypage/MypageSidenavbar';

import { legacyGet, post } from '@src/libs/request';
import Storenavbar from '@src/shared/areas/navigation/features/navbar/store/Storenavbar';

/* ======================== Types ======================== */
type Params = { orderId?: string };

interface OrderItem {
  orderDetailId: string | number;
  productId: number;
  productName: string;
  orderCnt: number;
  orderPrice: number;
  pimgUrl?: string;
  storeUrl?: string;
  orderStatus?: string;
}

interface OrderDetail {
  orderId: string | number;
  orderDetailId: string | number;
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

  // 모달 상태 관리
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'cancel' | 'refund'>('cancel');
  const [reason, setReason] = useState('');

  const fullAddress = useMemo(() => {
    if (!detail) return '';
    const parts = [detail.postNum, detail.addressRoad, detail.addressDetail, detail.addressExtra]
      .filter(Boolean)
      .map((s) => String(s).trim())
      .filter((s) => s.length > 0);
    return parts.join(' ');
  }, [detail]);

  const canCancel = useMemo(() => {
    if (!detail || !detail.orderItems?.length) return false;

    // detail의 상태를 확인 (주문완료일 때만 취소 가능)
    return isPreShipping(detail?.orderItems?.[0]?.orderStatus);
  }, [detail?.orderStatus, detail?.orderItems?.[0]?.orderDetailId]);

  const canRefund = useMemo(() => {
    if (!detail || !detail.orderItems?.length) return false;

    const s = detail.orderStatus;
    if (!s) return false;

    // 발송완료 상태일 때만 환불 가능
    if (isShipping(s)) return true;

    // 배송완료/취소완료/환불완료 이후는 불가능
    return false;
  }, [detail?.orderStatus, detail?.orderItems?.[0]?.orderDetailId]);

  const fetchDetail = useCallback(async () => {
    if (!orderId) return;
    setLoading(true);
    setError(null);
    try {
      const response = await legacyGet<any>(`/main/mypage/orderdetail/${orderId}`);
      if (response?.status === 200 && response?.data) {
        // console.log('주문 상세 정보:', response.data);
        setDetail(response.data as OrderDetail);
      } else {
        setError(response.message);
        console.error('주문 상세 정보 조회 실패', error);
      }
    } catch (error: any) {
      console.error('API 호출 실패', error);
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

  const CANCEL_URL = (detailId: string | number) => `/mypage/orders/${detailId}/cancel`;
  const REFUND_URL = (detailId: string | number) => `/mypage/orders/${detailId}/refund`;

  // 모달 열기 함수들
  const openCancelModal = () => {
    setModalType('cancel');
    setReason('');
    setModalOpen(true);
  };

  const openRefundModal = () => {
    setModalType('refund');
    setReason('');
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setReason('');
  };

  const handleSubmit = async () => {
    if (!detail) return;
    if (!reason.trim()) {
      alert('사유를 입력해주세요.');
      return;
    }

    const isCancel = modalType === 'cancel';
    const message = isCancel ? '해당 주문을 취소하시겠습니까?' : '환불을 요청하시겠습니까?';

    if (!confirm(message)) return;

    const body = {
      amount: detail.totalAmount,
      content: reason.trim(),
    };

    setSaving(true);
    try {
      // 수정된 부분
      const orderDetailId = detail.orderDetailId ?? detail.orderItems?.[0]?.orderDetailId;
      if (!orderDetailId) {
        alert('주문 상세 정보를 불러오는 중입니다. 잠시 후 다시 시도해주세요.');
        setSaving(false);
        return;
      }

      const url = isCancel ? CANCEL_URL(orderDetailId) : REFUND_URL(orderDetailId);
      const res = await post<any>(url, body);

      if (res?.status === 200) {
        alert(isCancel ? '주문 취소가 요청되었습니다.' : '환불이 요청되었습니다.');
        closeModal();
        setDetail((prev) =>
          prev ? { ...prev, orderStatus: isCancel ? '취소 요청 완료' : '환불 요청 완료' } : prev
        );
        await fetchDetail();
      } else {
        alert(
          res?.message ?? (isCancel ? '주문 취소에 실패했습니다.' : '환불 요청에 실패했습니다.')
        );
      }
    } catch (e: any) {
      console.error(`[OrderDetail] ${modalType} error:`, e);
      alert('요청 처리 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const goProduct = (storeUrl: string | undefined, productId: number) => {
    const base = storeUrl && storeUrl !== '' ? `/${storeUrl}` : '/main';
    navigate(`${base}/products/${productId}`);
  };

  // 모달 컴포넌트
  const Modal = (
    <>
      {modalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold">
                {modalType === 'cancel' ? '주문 취소' : '환불 요청'}
              </h2>
              <button
                onClick={closeModal}
                className="p-1 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">
                  현재 주문 상태:{' '}
                  <span className="font-medium text-gray-900">
                    {detail?.orderItems?.[0]?.orderStatus}
                  </span>
                </p>
                <p className="text-sm text-gray-600">
                  {modalType === 'cancel' ? '주문 취소' : '환불 요청'} 사유를 입력해주세요.
                </p>
              </div>

              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={
                  modalType === 'cancel'
                    ? '취소 사유를 입력해주세요...'
                    : '환불 요청 사유를 입력해주세요...'
                }
                className="w-full h-24 p-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                maxLength={500}
              />
              <div className="text-right text-xs text-gray-500 mt-1">{reason.length}/500</div>
            </div>

            <div className="flex gap-3 p-6 border-t border-gray-200">
              <button
                onClick={closeModal}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                disabled={saving}
              >
                취소
              </button>
              <button
                onClick={handleSubmit}
                disabled={!reason.trim() || saving}
                className={`flex-1 px-4 py-2 rounded-lg transition-colors ${
                  !reason.trim() || saving
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : modalType === 'cancel'
                      ? 'bg-red-600 hover:bg-red-700 text-white'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {saving ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    처리중...
                  </span>
                ) : modalType === 'cancel' ? (
                  '주문 취소'
                ) : (
                  '환불 요청'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );

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
            <p className="text-gray-600">현재 상태: {detail?.orderItems?.[0]?.orderStatus}</p>
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
              onClick={openCancelModal}
              disabled={!canCancel || saving}
              className={`px-4 py-2 rounded-xl border ${
                canCancel && !saving
                  ? 'bg-white hover:bg-gray-50 text-gray-800 border-gray-300'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200'
              }`}
              title={canCancel ? '주문취소' : '배송중 이전 단계에서만 취소 가능'}
            >
              <XCircle className="inline w-4 h-4 mr-1" />
              주문취소
            </button>

            <button
              onClick={openRefundModal}
              disabled={!canRefund || saving || isFinalized(detail.orderStatus)}
              className={`px-4 py-2 rounded-xl border ${
                canRefund && !saving && !isFinalized(detail.orderStatus)
                  ? 'bg-white hover:bg-gray-50 text-gray-800 border-gray-300'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200'
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
  const isMain = location.pathname.startsWith('/main');
  return (
    <div
      className="min-h-screen font-jua"
      style={{ background: 'linear-gradient(135deg,#f8fafc 0%,#f1f5f9 100%)' }}
    >
      <Header />
      {isMain ? <Mainnavbar /> : <Storenavbar />}

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

      {/* 모달 */}
      {Modal}
    </div>
  );
};

export default MainMypageOrderdetail;
