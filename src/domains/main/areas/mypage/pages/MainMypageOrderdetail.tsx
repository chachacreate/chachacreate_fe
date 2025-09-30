// src/domains/main/areas/mypage/pages/MainMypageOrderdetail.tsx
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ChevronLeft,
  CreditCard,
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
import Storenavbar from '@src/shared/areas/navigation/features/navbar/store/Storenavbar';

import { legacyGet, post } from '@src/libs/request';

/* ======================== Types ======================== */
type Params = { orderId?: string };

type OrderStatus =
  | 'ORDER_OK'    // 주문완료 (상품준비중)
  | 'SHIPPED'     // 발송완료 (배송중)
  | 'DELIVERED'   // 배송완료
  | 'CANCEL_RQ'   // 취소요청
  | 'CANCEL_OK'   // 취소완료
  | 'REFUND_RQ'   // 환불요청
  | 'REFUND_OK'   // 환불완료
  | 'unknown';

interface OrderItem {
  orderDetailId: string | number;
  productId: number;
  productName: string;
  orderCnt: number;
  orderPrice: number;
  pimgUrl?: string;
  storeUrl?: string;
  orderStatus?: string; // 서버 원본 문자열(국문)
}

interface OrderDetail {
  orderId: string | number;
  orderDetailId?: string | number; // 단일행일 때 존재할 수도 있음
  orderStatus?: string;            // (레거시) 서버가 주던 필드 – 사용 안 함
  orderName: string;
  orderPhone: string;
  postNum?: string;
  addressRoad?: string;
  addressDetail?: string;
  addressExtra?: string;
  totalAmount: number;
  orderItems: OrderItem[];
}

/* ======================== Status helpers ======================== */
// 주문내역(리스트) 페이지와 동일한 규칙으로 매핑 (국문 → Enum)
const mapStatus = (raw?: string): OrderStatus => {
  if (!raw) return 'unknown';
  const s = raw.toUpperCase();

  if (s.includes('주문완료')) return 'ORDER_OK';
  if (s.includes('발송완료')) return 'SHIPPED';
  if (s.includes('배송완료')) return 'DELIVERED';
  if (s.includes('취소요청')) return 'CANCEL_RQ';
  if (s.includes('취소완료')) return 'CANCEL_OK';
  if (s.includes('환불요청')) return 'REFUND_RQ';
  if (s.includes('환불완료')) return 'REFUND_OK';
  return 'unknown';
};

// 표시 라벨 (주문내역 페이지와 톤 통일)
const statusLabel = (s: OrderStatus) =>
  s === 'ORDER_OK'
    ? '상품 준비중'
    : s === 'SHIPPED'
    ? '배송 중'
    : s === 'DELIVERED'
    ? '배송 완료'
    : s === 'CANCEL_RQ'
    ? '취소 요청'
    : s === 'CANCEL_OK'
    ? '취소 완료'
    : s === 'REFUND_RQ'
    ? '환불 요청'
    : s === 'REFUND_OK'
    ? '환불 완료'
    : '확인중';

// 대표 상태 우선순위 (리스트 페이지와 동일)
const PRIORITY: OrderStatus[] = [
  'CANCEL_RQ',
  'REFUND_RQ',
  'ORDER_OK',
  'SHIPPED',
  'DELIVERED',
  'CANCEL_OK',
  'REFUND_OK',
  'unknown',
];

// 대표 상태 계산: 여러 상세가 있으면 PRIORITY 기준으로 결정
function pickRepresentativeStatus(items: OrderItem[]): OrderStatus {
  if (!items || items.length === 0) return 'unknown';
  const set = new Set<OrderStatus>();
  items.forEach((it) => set.add(mapStatus(it.orderStatus)));
  for (const p of PRIORITY) {
    if (set.has(p)) return p;
  }
  return 'unknown';
}

// 취소/환불 가능여부 (주문내역 페이지의 의미와 맞춤)
const canCancelBy = (rep: OrderStatus) => rep === 'ORDER_OK';
const canRefundBy = (rep: OrderStatus) => rep === 'SHIPPED';

/* ======================== Component ======================== */
const MainMypageOrderdetail: React.FC = () => {
  const { orderId } = useParams<Params>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<OrderDetail | null>(null);

  // 모달 상태
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

  // 상태 요약(원본 상태 문자열로 묶되, UI 표시는 대표 상태 라벨을 사용)
  const statusSummary: Array<[string, number]> = useMemo(() => {
    const map = new Map<string, number>();
    (detail?.orderItems ?? []).forEach((it) => {
      const k = it.orderStatus || '확인중';
      map.set(k, (map.get(k) || 0) + 1);
    });
    return Array.from(map.entries());
  }, [detail?.orderItems]);

  // ✅ 대표 상태(주문내역 페이지와 완전히 동일한 규칙으로 산정)
  const representative: OrderStatus = useMemo(
   () => pickRepresentativeStatus(detail?.orderItems ?? []),
   [detail?.orderItems]
  );

  const canCancel = useMemo(() => canCancelBy(representative), [representative]);
  const canRefund = useMemo(() => canRefundBy(representative), [representative]);

  const fetchDetail = useCallback(async () => {
    if (!orderId) return;
    setLoading(true);
    setError(null);
    try {
      const response = await legacyGet<any>(`/main/mypage/orderdetail/${orderId}`);
      if (response?.status === 200 && response?.data) {
        setDetail(response.data as OrderDetail);
      } else {
        setError(response?.message || '주문 상세 정보 조회 실패');
      }
    } catch (e: any) {
      console.error('API 호출 실패', e);
      setError('주문 상세 정보를 불러오지 못했습니다.');
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

  // 모달 열기
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
      // 여러 상세 중 어떤 것을 대상으로 보낼지: 우선 첫 번째 상세 사용(기존 정책 유지)
      const orderDetailId =
        detail.orderDetailId ??
        detail.orderItems?.[0]?.orderDetailId;

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
        await fetchDetail(); // 갱신
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

  // 모달
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
                    {/* 여러 상세가 있으면 상태 ×건수로 모두 표시 */}
                    {statusSummary.length === 0
                      ? '-'
                      : statusSummary.map(([k, n]) => `${k} ×${n}`).join(' / ')}
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

  // 본문
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
            {/* ✅ 리스트 페이지와 동일 규칙으로 계산된 대표 상태를 텍스트로 표시 */}
            <p className="mt-1 text-gray-600 text-sm">
              현재 상태: {statusLabel(representative)}
              {statusSummary.length > 1 && (
                <span className="ml-1 opacity-70">
                  ({statusSummary.map(([k, n]) => `${k} ×${n}`).join(' / ')})
                </span>
              )}
            </p>
          </div>

          {/* 주문 상품 */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl shadow-sm p-5">
            <h3 className="font-semibold mb-3">주문 상품</h3>
            {detail.orderItems.map((item) => (
              <div key={item.orderDetailId} className="flex items-center gap-4 border-t py-2">
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
                  {/* 각 라인의 현재 상태(서버 원본 표시) */}
                  <p className="text-gray-600">
                    현재 상태: {item.orderStatus ?? '-'}
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
              disabled={!canRefund || saving}
              className={`px-4 py-2 rounded-xl border ${
                canRefund && !saving
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
