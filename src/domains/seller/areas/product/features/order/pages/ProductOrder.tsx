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
import { get, legacyGet, legacyPatch } from '@src/libs/request';

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
  orderDetailId: string;
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
  | 'ALL'
  | 'ORDER_OK'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCEL_RQ'
  | 'CANCEL_OK'
  | 'REFUND_RQ'
  | 'REFUND_OK';

/* ------------------ 상수/매핑 ------------------ */
type StatusCode =
  | 'ORDER_OK'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCEL_RQ'
  | 'CANCEL_OK'
  | 'REFUND_RQ'
  | 'REFUND_OK';

const LABEL_TO_CODE: Record<OrderStatus, StatusCode> = {
  주문완료: 'ORDER_OK',
  발송완료: 'SHIPPED',
  배송완료: 'DELIVERED',
  취소요청: 'CANCEL_RQ',
  취소완료: 'CANCEL_OK',
  환불요청: 'REFUND_RQ',
  환불완료: 'REFUND_OK',
};

const STATUS_CODE_TO_LABEL: Record<string, OrderStatus> = {
  ORDER_OK: '주문완료',
  SHIPPED: '발송완료',
  DELIVERED: '배송완료',
  CANCEL_RQ: '취소요청',
  CANCEL_OK: '취소완료',
  REFUND_RQ: '환불요청',
  REFUND_OK: '환불완료',
};

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
  const [activeFilter, setActiveFilter] = useState<FilterKey>('ALL');

  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const PAGE_SIZE = 10;

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

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const response = await legacyGet<any>(
          `/${storeUrl}/seller/management/orders?page=${page}&size=${PAGE_SIZE}&status=${activeFilter}`
        );
        // console.log('주문 데이터:', response);

        if (Array.isArray(response.data)) {
          const mapped = response.data.map((item: any) => ({
            id: String(item.orderDetailId),
            orderDetailId: String(item.orderDetailId),
            orderNumber: `ORD-${String(item.orderDetailId).padStart(5, '0')}`,
            customerName: item.orderName,
            deliveryAddress:
              `${item.addressRoad || ''} ${item.addressDetail || ''} ${item.addressExtra || ''}`.trim(),
            productName: item.productName,
            quantity: item.orderCnt,
            amount: item.orderPrice,
            orderDate: new Date(item.orderDate).toISOString().split('T')[0],
            updatedAt: new Date(item.orderDate).toISOString().split('T')[0],
            status: item.orderStatus,
            productId: String(item.productId),
          }));
          if (response.status === 200) {
            setOrders(mapped);

            // totalCount 기반 페이지 계산
            setTotalPages(Math.ceil((response.data[0]?.totalCount || 0) / PAGE_SIZE));
          } else {
            console.error('주문 데이터 로드 실패: ', response.data.message);
          }
        }
      } catch (error) {
        console.error('API 호출 실패: ', error);
      }
    };

    fetchOrders();
  }, [storeUrl, page, activeFilter]);

  // 필터링
  const filteredOrders = useMemo(() => {
    switch (activeFilter) {
      case 'ORDER_OK':
        return orders.filter((o) => o.status === '주문완료');
      case 'SHIPPED':
        return orders.filter((o) => o.status === '발송완료');
      case 'DELIVERED':
        return orders.filter((o) => o.status === '배송완료');
      case 'CANCEL_RQ':
        return orders.filter((o) => o.status === '취소요청');
      case 'CANCEL_OK':
        return orders.filter((o) => o.status === '취소완료');
      case 'REFUND_RQ':
        return orders.filter((o) => o.status === '환불요청');
      case 'REFUND_OK':
        return orders.filter((o) => o.status === '환불완료');
      default:
        return orders;
    }
  }, [activeFilter, orders]);

  const displayedOrders = filteredOrders;

  const [statusCounts, setStatusCounts] = useState<{
    ALL: number;
    ORDER_OK: number;
    SHIPPED: number;
    DELIVERED: number;
    CANCEL_RQ: number;
    CANCEL_OK: number;
    REFUND_RQ: number;
    REFUND_OK: number;
  }>({
    ALL: 0,
    ORDER_OK: 0,
    SHIPPED: 0,
    DELIVERED: 0,
    CANCEL_RQ: 0,
    CANCEL_OK: 0,
    REFUND_RQ: 0,
    REFUND_OK: 0,
  });

  useEffect(() => {
    const fetchStatusCounts = async () => {
      const response = await get<any>(`/seller/${storeUrl}/main/status`);
      // console.log('상태별 주문 개수:', response);
      setStatusCounts({
        ALL: response.data.totalCount,
        ORDER_OK: response.data.orderOkCount,
        SHIPPED: response.data.shippedCount,
        DELIVERED: response.data.deliveredCount,
        CANCEL_RQ: response.data.cancelRqCount,
        CANCEL_OK: response.data.cancelOkCount,
        REFUND_RQ: response.data.refundRqCount,
        REFUND_OK: response.data.refundOkCount,
      });
    };
    fetchStatusCounts();
  }, [storeUrl]);

  const filterOptions: { key: FilterKey; label: string }[] = [
    { key: 'ALL', label: `전체 (${statusCounts.ALL})` },
    { key: 'ORDER_OK', label: `주문완료 (${statusCounts.ORDER_OK})` },
    { key: 'SHIPPED', label: `발송완료 (${statusCounts.SHIPPED})` },
    { key: 'DELIVERED', label: `배송완료 (${statusCounts.DELIVERED})` },
    { key: 'CANCEL_RQ', label: `취소요청 (${statusCounts.CANCEL_RQ})` },
    { key: 'CANCEL_OK', label: `취소완료 (${statusCounts.CANCEL_OK})` },
    { key: 'REFUND_RQ', label: `환불요청 (${statusCounts.REFUND_RQ})` },
    { key: 'REFUND_OK', label: `환불완료 (${statusCounts.REFUND_OK})` },
  ];

  // 상태 변경
  const patchOrderStatus = async (orderId: string, nextLabel: OrderStatus) => {
    const code = LABEL_TO_CODE[nextLabel];
    try {
      await legacyPatch(`/${storeUrl}/seller/management/orders/${orderId}/status`, {
        toStatus: code,
      });

      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId
            ? { ...o, status: nextLabel, updatedAt: new Date().toISOString().slice(0, 10) }
            : o
        )
      );

      // 상태 변경 후 필터가 걸려서 숨겨지는 걸 방지
      setActiveFilter('ALL'); // 모든 주문으로 보여주기

      alert('상태가 변경되었습니다.');
    } catch (err) {
      console.error('API 호출 실패:', err);
    } finally {
      setOpenMenuOrderId(null);
    }
  };

  // useEffect(() => {
  //   console.log('orders 상태 변경:', orders);
  // }, [orders]);

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
                      setPage(1); // 필터 변경 시 항상 1페이지로 초기화
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
                          <tr
                            key={order.orderDetailId}
                            className="border-t border-gray-100 relative"
                          >
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
              <div className="flex justify-center items-center gap-2 mt-4 flex-wrap">
                {/* 이전 그룹 */}
                <button
                  onClick={() => setPage(Math.max(Math.floor((page - 1) / 5 - 1) * 5 + 1, 1))}
                  disabled={page <= 5}
                  className="px-3 py-1 rounded-md border bg-white text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  «
                </button>

                {/* 이전 페이지 */}
                <button
                  onClick={() => setPage(Math.max(page - 1, 1))}
                  disabled={page === 1}
                  className="px-3 py-1 rounded-md border bg-white text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  ◀
                </button>

                {/* 페이지 그룹 (5개 단위) */}
                {(() => {
                  const pages = [];
                  const groupStart = Math.floor((page - 1) / 5) * 5 + 1;
                  const groupEnd = Math.min(groupStart + 4, totalPages);

                  for (let p = groupStart; p <= groupEnd; p++) {
                    pages.push(
                      <button
                        key={p}
                        onClick={() => setPage(p)}
                        className={[
                          'px-3 py-1 rounded-md border text-sm transition',
                          p === page
                            ? 'bg-[#2d4739] text-white border-[#2d4739]'
                            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100',
                        ].join(' ')}
                      >
                        {p}
                      </button>
                    );
                  }
                  return pages;
                })()}

                {/* 다음 페이지 */}
                <button
                  onClick={() => setPage(Math.min(page + 1, totalPages))}
                  disabled={page === totalPages}
                  className="px-3 py-1 rounded-md border bg-white text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  ▶
                </button>
                {/* 다음 그룹 */}
                <button
                  onClick={() =>
                    setPage(Math.min(Math.floor((page - 1) / 5 + 1) * 5 + 1, totalPages))
                  }
                  disabled={page + 5 > totalPages}
                  className="px-3 py-1 rounded-md border bg-white text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  »
                </button>
              </div>

              {/* 
              {!showAll && filteredOrders.length > 10 && (
                <div className="mt-4 flex justify-center">
                  <button
                    onClick={() => setShowAll(true)}
                    className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    전체 보기 ({filteredOrders.length - 10}개 더)
                  </button>
                </div>
              )} */}
            </div>
          </div>
        </div>
      </SellerSidenavbar>
    </>
  );
}
