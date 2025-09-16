// src/domains/seller/order/SellerOrderManagementMain.tsx
import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import Header from '@src/shared/areas/layout/features/header/Header';
import SellerSidenavbar from '@src/shared/areas/navigation/features/sidenavbar/seller/SellerSidenavbar';
import {
  Package,
  Truck,
  CheckCircle,
  XCircle,
  RefreshCw,
  AlertCircle,
  X,
  ChevronDown,
  Check,
} from 'lucide-react';
import { legacyGet, legacyPatch } from '@src/libs/request';

/* ------------------ Types ------------------ */
type OrderStatus =
  | '주문완료'
  | '발송완료'
  | '배송완료'
  | '취소요청'
  | '취소완료'
  | '환불요청'
  | '환불완료';

type OrderItem = {
  id: string;
  orderNumber: string;
  customerName: string;
  deliveryAddress: string;
  productName: string;
  quantity: number;
  amount: number;
  orderDate: string;
  updatedAt: string;
  status: OrderStatus;
  cancelReason?: string;
  refundReason?: string;
  refundAmount?: number;
  refundDate?: string;
  productId: string;
};

type FilterKey =
  | 'all'
  | 'ordered'
  | 'shipped'
  | 'delivered'
  | 'cancel_request'
  | 'cancelled'
  | 'refund_request'
  | 'refunded';

/* ------------------ 상수/매핑 ------------------ */
// 서버 Enum 코드 ↔ 한글 라벨
type StatusCode =
  | 'ORDER_OK'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCEL_RQ'
  | 'CANCEL_OK'
  | 'REFUND_RQ'
  | 'REFUND_OK';

const CODE_TO_LABEL: Record<StatusCode, OrderStatus> = {
  ORDER_OK: '주문완료',
  SHIPPED: '발송완료',
  DELIVERED: '배송완료',
  CANCEL_RQ: '취소요청',
  CANCEL_OK: '취소완료',
  REFUND_RQ: '환불요청',
  REFUND_OK: '환불완료',
};

const LABEL_TO_CODE: Record<OrderStatus, StatusCode> = {
  주문완료: 'ORDER_OK',
  발송완료: 'SHIPPED',
  배송완료: 'DELIVERED',
  취소요청: 'CANCEL_RQ',
  취소완료: 'CANCEL_OK',
  환불요청: 'REFUND_RQ',
  환불완료: 'REFUND_OK',
};

// 모든 상태를 언제나 선택 가능
const ALL_STATUS_LABELS: OrderStatus[] = [
  '주문완료',
  '발송완료',
  '배송완료',
  '취소요청',
  '취소완료',
  '환불요청',
  '환불완료',
];

/* ------------------ Utils ------------------ */
const KRW = new Intl.NumberFormat('ko-KR');

const getStatusIcon = (status: OrderStatus) => {
  switch (status) {
    case '주문완료':
      return <Package className="w-4 h-4" />;
    case '발송완료':
      return <Truck className="w-4 h-4" />;
    case '배송완료':
      return <CheckCircle className="w-4 h-4" />;
    case '취소요청':
      return <AlertCircle className="w-4 h-4" />;
    case '취소완료':
      return <XCircle className="w-4 h-4" />;
    case '환불요청':
      return <RefreshCw className="w-4 h-4" />;
    case '환불완료':
      return <CheckCircle className="w-4 h-4" />;
    default:
      return <Package className="w-4 h-4" />;
  }
};

const getStatusColor = (status: OrderStatus) => {
  switch (status) {
    case '주문완료':
      return 'bg-blue-50 text-blue-700 border-blue-200';
    case '발송완료':
      return 'bg-purple-50 text-purple-700 border-purple-200';
    case '배송완료':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case '취소요청':
      return 'bg-orange-50 text-orange-700 border-orange-200';
    case '취소완료':
      return 'bg-gray-50 text-gray-700 border-gray-200';
    case '환불요청':
      return 'bg-amber-50 text-amber-700 border-amber-200';
    case '환불완료':
      return 'bg-slate-50 text-slate-700 border-slate-200';
    default:
      return 'bg-gray-50 text-gray-700 border-gray-200';
  }
};

/* ------------------ Component ------------------ */
export default function SellerOrderManagementMain() {
  const { storeUrl = 'store' } = useParams();
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all');
  const [showAll, setShowAll] = useState(false);
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [openMenuOrderId, setOpenMenuOrderId] = useState<string | null>(null);

  const menuRef = useRef<HTMLDivElement>(null);

  // 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (openMenuOrderId && menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuOrderId(null);
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [openMenuOrderId]);

  // 초기/스토어 변경 시 조회
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const response = await legacyGet<{
          status: number;
          message: string;
          data: any[];
        }>(`/${storeUrl}/seller/management/orders`);

        if (response?.data) {
          const mapped: OrderItem[] = response.data.map((item) => ({
            id: String(item.orderId),
            orderNumber: `ORD-${String(item.orderDetailId).padStart(5, '0')}`,
            customerName: item.orderName,
            deliveryAddress:
              `${item.addressRoad || ''} ${item.addressDetail || ''} ${item.addressExtra || ''}`.trim(),
            productName: item.productName,
            quantity: item.orderCnt,
            amount: item.orderPrice,
            orderDate: new Date(item.orderDate).toISOString().split('T')[0],
            updatedAt: new Date(item.orderDate).toISOString().split('T')[0],
            status: item.orderStatus as OrderStatus, // 서버가 한글 라벨로 내려줌
            productId: String(item.productId),
            cancelReason: item.cancelReason,
            refundReason: item.refundReason,
            refundAmount: item.refundAmount,
            refundDate: item.refundDate,
          }));
          setOrders(mapped);
        } else {
          setOrders([]);
          console.error('주문/발송 관리 조회 실패:', response?.message);
        }
      } catch (err) {
        console.error('API 요청 실패:', err);
        setOrders([]);
      }
    };

    void fetchOrders();
  }, [storeUrl]);

  // 필터링
  const filteredOrders = useMemo(() => {
    switch (activeFilter) {
      case 'ordered':
        return orders.filter((o) => o.status === '주문완료');
      case 'shipped':
        return orders.filter((o) => o.status === '발송완료');
      case 'delivered':
        return orders.filter((o) => o.status === '배송완료');
      case 'cancel_request':
        return orders.filter((o) => o.status === '취소요청');
      case 'cancelled':
        return orders.filter((o) => o.status === '취소완료');
      case 'refund_request':
        return orders.filter((o) => o.status === '환불요청');
      case 'refunded':
        return orders.filter((o) => o.status === '환불완료');
      case 'all':
      default:
        return orders;
    }
  }, [activeFilter, orders]);

  const displayedOrders = useMemo(
    () => (showAll ? filteredOrders : filteredOrders.slice(0, 10)),
    [filteredOrders, showAll]
  );

  const statusCounts = useMemo(() => {
    return {
      all: orders.length,
      ordered: orders.filter((o) => o.status === '주문완료').length,
      shipped: orders.filter((o) => o.status === '발송완료').length,
      delivered: orders.filter((o) => o.status === '배송완료').length,
      cancel_request: orders.filter((o) => o.status === '취소요청').length,
      cancelled: orders.filter((o) => o.status === '취소완료').length,
      refund_request: orders.filter((o) => o.status === '환불요청').length,
      refunded: orders.filter((o) => o.status === '환불완료').length,
    };
  }, [orders]);

  const filterOptions: { key: FilterKey; label: string }[] = [
    { key: 'all', label: `전체 (${statusCounts.all})` },
    { key: 'ordered', label: `주문완료 (${statusCounts.ordered})` },
    { key: 'shipped', label: `발송완료 (${statusCounts.shipped})` },
    { key: 'delivered', label: `배송완료 (${statusCounts.delivered})` },
    { key: 'cancel_request', label: `취소요청 (${statusCounts.cancel_request})` },
    { key: 'cancelled', label: `취소완료 (${statusCounts.cancelled})` },
    { key: 'refund_request', label: `환불요청 (${statusCounts.refund_request})` },
    { key: 'refunded', label: `환불완료 (${statusCounts.refunded})` },
  ];

  // 상태 변경 호출
  const patchOrderStatus = async (orderId: string, nextLabel: OrderStatus) => {
    const code: StatusCode = LABEL_TO_CODE[nextLabel];
    try {
      await legacyPatch<{
        status: number;
        message: string;
        data: null;
      }>(`/${storeUrl}/seller/management/orders/${orderId}/status`, {
        toStatus: code,
      });

      // 낙관적 업데이트
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId
            ? { ...o, status: nextLabel, updatedAt: new Date().toISOString().slice(0, 10) }
            : o
        )
      );
    } catch (err) {
      console.error('상태 변경 실패:', err);
      // 필요 시 토스트/알럿 처리
    } finally {
      setOpenMenuOrderId(null);
    }
  };

  const isCompletedStatus = (s: OrderStatus) => s === '취소완료' || s === '환불완료';

  return (
    <>
      <Header />

      <SellerSidenavbar>
        <div className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-6">
          {/* Title */}
          <div className="flex flex-col gap-1">
            <h1 className="text-xl sm:text-2xl font-bold">주문/발송 관리</h1>
            <p className="text-gray-600">주문과 주문 처리 상태를 확인하고 관리하세요.</p>
          </div>

          {/* 필터 라디오 */}
          <div className="mt-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
              {filterOptions.map((option) => (
                <label
                  key={option.key}
                  className={[
                    'flex items-center justify-center h-10 rounded-xl border cursor-pointer text-sm transition-colors',
                    activeFilter === option.key
                      ? 'bg-[#2d4739] text-white border-[#2d4739]'
                      : 'bg-white hover:bg-gray-50 border-gray-200',
                  ].join(' ')}
                >
                  <input
                    type="radio"
                    name="orderFilter"
                    value={option.key}
                    checked={activeFilter === option.key}
                    onChange={() => {
                      setActiveFilter(option.key);
                      setShowAll(false);
                    }}
                    className="sr-only"
                  />
                  {option.label}
                </label>
              ))}
            </div>
          </div>

          {/* 주문 테이블 */}
          <div className="mt-6 rounded-2xl border border-gray-200 bg-white">
            <div className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">
                  {isCompletedStatus(filteredOrders[0]?.status) ? '취소/환불 내역' : '주문 내역'}
                </h2>
                <span className="text-sm text-gray-500">{filteredOrders.length}건</span>
              </div>

              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-sm min-w-max">
                  <thead>
                    <tr className="text-left text-gray-500 whitespace-nowrap">
                      <th className="py-3 pr-6 font-medium min-w-[160px]">처리상태</th>
                      <th className="py-3 pr-6 font-medium min-w-[140px]">주문번호</th>
                      <th className="py-3 pr-6 font-medium min-w-[100px]">주문자명</th>
                      <th className="py-3 pr-6 font-medium min-w-[200px]">배송지</th>
                      <th className="py-3 pr-6 font-medium min-w-[180px]">주문상품</th>
                      <th className="py-3 pr-6 font-medium min-w-[80px]">상품수량</th>
                      <th className="py-3 pr-6 font-medium min-w-[100px]">주문금액</th>
                      <th className="py-3 pr-6 font-medium min-w-[100px]">주문일</th>
                      <th className="py-3 pr-6 font-medium min-w-[100px]">수정일</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayedOrders.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-10 text-center text-gray-500">
                          해당 상태에 해당하는 주문 내역이 없습니다.
                        </td>
                      </tr>
                    ) : (
                      displayedOrders.map((order) => {
                        const open = openMenuOrderId === order.id;
                        return (
                          <tr key={order.id} className="border-t border-gray-100 relative">
                            <td className="py-4 pr-6 whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => setOpenMenuOrderId(open ? null : order.id)}
                                className={[
                                  'inline-flex items-center rounded-full px-2 py-1 text-xs font-medium border gap-1',
                                  getStatusColor(order.status),
                                  'hover:opacity-90 transition',
                                ].join(' ')}
                              >
                                {getStatusIcon(order.status)}
                                {order.status}
                                <ChevronDown className="w-4 h-4 ml-1 opacity-70" />
                              </button>

                              {/* 드롭다운 */}
                              {open && (
                                <div
                                  ref={menuRef}
                                  className="absolute z-20 mt-2 w-44 rounded-lg border bg-white shadow-lg p-1"
                                >
                                  {ALL_STATUS_LABELS.map((label) => {
                                    const selected = label === order.status;
                                    return (
                                      <button
                                        key={label}
                                        type="button"
                                        onClick={() => patchOrderStatus(order.id, label)}
                                        className={[
                                          'w-full text-left px-3 py-2 rounded-md text-sm hover:bg-gray-50 flex items-center justify-between',
                                          selected ? 'bg-gray-50' : '',
                                        ].join(' ')}
                                      >
                                        <span>{label}</span>
                                        {selected && <Check className="w-4 h-4" />}
                                      </button>
                                    );
                                  })}
                                </div>
                              )}
                            </td>

                            <td className="py-4 pr-6 whitespace-nowrap">{order.orderNumber}</td>
                            <td className="py-4 pr-6 whitespace-nowrap">{order.customerName}</td>
                            <td className="py-4 pr-6">
                              <div className="max-w-[220px] truncate" title={order.deliveryAddress}>
                                {order.deliveryAddress}
                              </div>
                            </td>
                            <td className="py-4 pr-6">
                              <div className="max-w-[220px] truncate" title={order.productName}>
                                {order.productName}
                              </div>
                            </td>
                            <td className="py-4 pr-6 whitespace-nowrap">{order.quantity}개</td>
                            <td className="py-4 pr-6 whitespace-nowrap">
                              ₩ {KRW.format(order.amount)}
                            </td>
                            <td className="py-4 pr-6 whitespace-nowrap">{order.orderDate}</td>
                            <td className="py-4 pr-6 whitespace-nowrap">{order.updatedAt}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {!showAll && filteredOrders.length > 10 && (
                <div className="mt-4 flex justify-center">
                  <button
                    onClick={() => setShowAll(true)}
                    className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    전체 보기 ({filteredOrders.length - 10}개 더)
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </SellerSidenavbar>
    </>
  );
}
