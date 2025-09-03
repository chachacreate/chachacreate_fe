// src/domains/seller/order/SellerOrderManagementMain.tsx
import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Header from "@src/shared/areas/layout/features/header/Header";
import Mainnavbar from "@src/shared/areas/navigation/features/navbar/main/Mainnavbar";
import SellerSidenavbar from "@src/shared/areas/navigation/features/sidenavbar/seller/SellerSidenavbar";
import { Package, Truck, CheckCircle, XCircle, RefreshCw, AlertCircle, X } from "lucide-react";

// ------------------ Types ------------------
type OrderStatus = "주문완료" | "발송완료" | "배송완료" | "취소요청" | "취소완료" | "환불요청" | "환불완료";

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

type FilterKey = "all" | "ordered" | "shipped" | "delivered" | "cancel_request" | "cancelled" | "refund_request" | "refunded";

// ------------------ MOCK DATA ------------------
const ORDERS: OrderItem[] = [
  {
    id: "o1", orderNumber: "ORD-2025-001", customerName: "김민수", 
    deliveryAddress: "서울시 강남구 테헤란로 123", productName: "핸드메이드 머그컵", 
    quantity: 2, amount: 36000, orderDate: "2025-09-01", updatedAt: "2025-09-01", 
    status: "주문완료", productId: "P-1001"
  },
  {
    id: "o2", orderNumber: "ORD-2025-002", customerName: "이영희", 
    deliveryAddress: "부산시 해운대구 센텀로 456", productName: "드라이플라워 소품", 
    quantity: 1, amount: 18000, orderDate: "2025-09-02", updatedAt: "2025-09-02", 
    status: "발송완료", productId: "P-1002"
  },
  {
    id: "o3", orderNumber: "ORD-2025-003", customerName: "박지성", 
    deliveryAddress: "대구시 수성구 달구벌대로 789", productName: "수채화 엽서 세트", 
    quantity: 3, amount: 45000, orderDate: "2025-09-03", updatedAt: "2025-09-03", 
    status: "배송완료", productId: "P-1003"
  },
  {
    id: "o4", orderNumber: "ORD-2025-004", customerName: "정수민", 
    deliveryAddress: "인천시 연수구 컨벤시아대로 101", productName: "핸드메이드 머그컵", 
    quantity: 1, amount: 18000, orderDate: "2025-09-04", updatedAt: "2025-09-04", 
    status: "취소요청", productId: "P-1001", cancelReason: "단순 변심"
  },
  {
    id: "o5", orderNumber: "ORD-2025-005", customerName: "최영수", 
    deliveryAddress: "광주시 서구 상무대로 202", productName: "도자기 원데이 키트", 
    quantity: 2, amount: 60000, orderDate: "2025-08-30", updatedAt: "2025-09-01", 
    status: "취소완료", productId: "P-1004", cancelReason: "배송 지연", 
    refundAmount: 60000, refundDate: "2025-09-01"
  },
  {
    id: "o6", orderNumber: "ORD-2025-006", customerName: "한지민", 
    deliveryAddress: "울산시 남구 삼산로 303", productName: "천연 비누 세트", 
    quantity: 1, amount: 25000, orderDate: "2025-09-05", updatedAt: "2025-09-05", 
    status: "환불요청", productId: "P-1005", refundReason: "상품 불량"
  },
  {
    id: "o7", orderNumber: "ORD-2025-007", customerName: "윤서연", 
    deliveryAddress: "전주시 완산구 팔달로 404", productName: "플라워 클래스 재료", 
    quantity: 1, amount: 35000, orderDate: "2025-08-28", updatedAt: "2025-08-30", 
    status: "환불완료", productId: "P-1006", refundReason: "사이즈 불일치", 
    refundAmount: 35000, refundDate: "2025-08-30"
  },
  // 추가 더미 데이터들...
  {
    id: "o8", orderNumber: "ORD-2025-008", customerName: "강태현", 
    deliveryAddress: "청주시 흥덕구 직지대로 505", productName: "핸드메이드 머그컵", 
    quantity: 3, amount: 54000, orderDate: "2025-09-06", updatedAt: "2025-09-06", 
    status: "주문완료", productId: "P-1001"
  },
  {
    id: "o9", orderNumber: "ORD-2025-009", customerName: "송혜교", 
    deliveryAddress: "춘천시 중앙로 606", productName: "드라이플라워 소품", 
    quantity: 2, amount: 36000, orderDate: "2025-09-07", updatedAt: "2025-09-07", 
    status: "발송완료", productId: "P-1002"
  },
  {
    id: "o10", orderNumber: "ORD-2025-010", customerName: "류준열", 
    deliveryAddress: "안산시 단원구 광덕로 707", productName: "수채화 엽서 세트", 
    quantity: 1, amount: 15000, orderDate: "2025-09-08", updatedAt: "2025-09-08", 
    status: "배송완료", productId: "P-1003"
  },
  {
    id: "o11", orderNumber: "ORD-2025-011", customerName: "공유", 
    deliveryAddress: "성남시 분당구 판교로 808", productName: "도자기 원데이 키트", 
    quantity: 1, amount: 30000, orderDate: "2025-09-09", updatedAt: "2025-09-09", 
    status: "주문완료", productId: "P-1004"
  },
  {
    id: "o12", orderNumber: "ORD-2025-012", customerName: "김고은", 
    deliveryAddress: "수원시 영통구 월드컵로 909", productName: "천연 비누 세트", 
    quantity: 2, amount: 50000, orderDate: "2025-09-10", updatedAt: "2025-09-10", 
    status: "취소요청", productId: "P-1005", cancelReason: "중복 주문"
  }
];

// ------------------ Utils ------------------
const KRW = new Intl.NumberFormat("ko-KR");

const getStatusIcon = (status: OrderStatus) => {
  switch (status) {
    case "주문완료": return <Package className="w-4 h-4" />;
    case "발송완료": return <Truck className="w-4 h-4" />;
    case "배송완료": return <CheckCircle className="w-4 h-4" />;
    case "취소요청": return <AlertCircle className="w-4 h-4" />;
    case "취소완료": return <XCircle className="w-4 h-4" />;
    case "환불요청": return <RefreshCw className="w-4 h-4" />;
    case "환불완료": return <CheckCircle className="w-4 h-4" />;
    default: return <Package className="w-4 h-4" />;
  }
};

const getStatusColor = (status: OrderStatus) => {
  switch (status) {
    case "주문완료": return "bg-blue-50 text-blue-700 border-blue-200";
    case "발송완료": return "bg-purple-50 text-purple-700 border-purple-200";
    case "배송완료": return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "취소요청": return "bg-orange-50 text-orange-700 border-orange-200";
    case "취소완료": return "bg-gray-50 text-gray-700 border-gray-200";
    case "환불요청": return "bg-amber-50 text-amber-700 border-amber-200";
    case "환불완료": return "bg-slate-50 text-slate-700 border-slate-200";
    default: return "bg-gray-50 text-gray-700 border-gray-200";
  }
};

// ------------------ Component ------------------
export default function SellerOrderManagementMain() {
  const { storeUrl = "store" } = useParams();
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");
  const [showAll, setShowAll] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<OrderItem | null>(null);

  // 필터링된 주문 목록
  const filteredOrders = useMemo(() => {
    switch (activeFilter) {
      case "ordered": return ORDERS.filter(o => o.status === "주문완료");
      case "shipped": return ORDERS.filter(o => o.status === "발송완료");
      case "delivered": return ORDERS.filter(o => o.status === "배송완료");
      case "cancel_request": return ORDERS.filter(o => o.status === "취소요청");
      case "cancelled": return ORDERS.filter(o => o.status === "취소완료");
      case "refund_request": return ORDERS.filter(o => o.status === "환불요청");
      case "refunded": return ORDERS.filter(o => o.status === "환불완료");
      case "all":
      default: return ORDERS;
    }
  }, [activeFilter]);

  // 표시할 주문 목록 (10개 제한 또는 전체)
  const displayedOrders = useMemo(() => {
    return showAll ? filteredOrders : filteredOrders.slice(0, 10);
  }, [filteredOrders, showAll]);

  // 상태 통계
  const statusCounts = useMemo(() => {
    const counts = {
      all: ORDERS.length,
      ordered: ORDERS.filter(o => o.status === "주문완료").length,
      shipped: ORDERS.filter(o => o.status === "발송완료").length,
      delivered: ORDERS.filter(o => o.status === "배송완료").length,
      cancel_request: ORDERS.filter(o => o.status === "취소요청").length,
      cancelled: ORDERS.filter(o => o.status === "취소완료").length,
      refund_request: ORDERS.filter(o => o.status === "환불요청").length,
      refunded: ORDERS.filter(o => o.status === "환불완료").length,
    };
    return counts;
  }, []);

  const filterOptions: { key: FilterKey; label: string }[] = [
    { key: "all", label: `전체 (${statusCounts.all})` },
    { key: "ordered", label: `주문완료 (${statusCounts.ordered})` },
    { key: "shipped", label: `발송완료 (${statusCounts.shipped})` },
    { key: "delivered", label: `배송완료 (${statusCounts.delivered})` },
    { key: "cancel_request", label: `취소요청 (${statusCounts.cancel_request})` },
    { key: "cancelled", label: `취소완료 (${statusCounts.cancelled})` },
    { key: "refund_request", label: `환불요청 (${statusCounts.refund_request})` },
    { key: "refunded", label: `환불완료 (${statusCounts.refunded})` },
  ];

  // 취소/환불 처리 함수
  const handleProcessRequest = (order: OrderItem) => {
    // 실제로는 API 호출
    console.log(`Processing ${order.status} for order:`, order.orderNumber);
    setSelectedRequest(null);
    // 상태 업데이트 로직...
  };

  const isCompletedStatus = (status: OrderStatus) => status === "취소완료" || status === "환불완료";

  return (
    <>
      <Header />
      <Mainnavbar />

      <SellerSidenavbar>
        <div className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-6">
          {/* Title */}
          <div className="flex flex-col gap-1">
            <h1 className="text-xl sm:text-2xl font-bold">주문/발송 관리</h1>
            <p className="text-gray-600">주문과 주문 처리 상태를 확인하고 관리하세요.</p>
          </div>

          {/* 필터 라디오 버튼 */}
          <div className="mt-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
              {filterOptions.map((option) => (
                <label
                  key={option.key}
                  className={[
                    "flex items-center justify-center h-10 rounded-xl border cursor-pointer text-sm transition-colors",
                    activeFilter === option.key
                      ? "bg-[#2d4739] text-white border-[#2d4739]"
                      : "bg-white hover:bg-gray-50 border-gray-200"
                  ].join(" ")}
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
                  {isCompletedStatus(filteredOrders[0]?.status) ? "취소/환불 내역" : "주문 내역"}
                </h2>
                <span className="text-sm text-gray-500">{filteredOrders.length}건</span>
              </div>

              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-sm min-w-max">
                  <thead>
                    <tr className="text-left text-gray-500 whitespace-nowrap">
                      <th className="py-3 pr-6 font-medium min-w-[120px]">처리상태</th>
                      {isCompletedStatus(filteredOrders[0]?.status) ? (
                        <>
                          <th className="py-3 pr-6 font-medium min-w-[100px]">상품번호</th>
                          <th className="py-3 pr-6 font-medium min-w-[180px]">상품이름</th>
                          <th className="py-3 pr-6 font-medium min-w-[80px]">상품수량</th>
                          <th className="py-3 pr-6 font-medium min-w-[150px]">취소/환불 사유</th>
                          <th className="py-3 pr-6 font-medium min-w-[100px]">환불금액</th>
                          <th className="py-3 pr-6 font-medium min-w-[100px]">환불일</th>
                          <th className="py-3 pr-6 font-medium min-w-[100px]">수정일</th>
                        </>
                      ) : (
                        <>
                          <th className="py-3 pr-6 font-medium min-w-[140px]">주문번호</th>
                          <th className="py-3 pr-6 font-medium min-w-[100px]">주문자명</th>
                          <th className="py-3 pr-6 font-medium min-w-[200px]">배송지</th>
                          <th className="py-3 pr-6 font-medium min-w-[180px]">주문상품</th>
                          <th className="py-3 pr-6 font-medium min-w-[80px]">상품수량</th>
                          <th className="py-3 pr-6 font-medium min-w-[100px]">주문금액</th>
                          <th className="py-3 pr-6 font-medium min-w-[100px]">주문일</th>
                          <th className="py-3 pr-6 font-medium min-w-[100px]">수정일</th>
                          {(activeFilter === "cancel_request" || activeFilter === "refund_request") && (
                            <th className="py-3 pr-6 font-medium min-w-[80px]">처리</th>
                          )}
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {displayedOrders.map((order) => (
                      <tr key={order.id} className="border-t border-gray-100">
                        <td className="py-4 pr-6 whitespace-nowrap">
                          <span
                            className={[
                              "inline-flex items-center rounded-full px-2 py-1 text-xs font-medium border gap-1",
                              getStatusColor(order.status)
                            ].join(" ")}
                          >
                            {getStatusIcon(order.status)}
                            {order.status}
                          </span>
                        </td>
                        {isCompletedStatus(order.status) ? (
                          <>
                            <td className="py-4 pr-6 whitespace-nowrap">{order.productId}</td>
                            <td className="py-4 pr-6">
                              <div className="max-w-[180px] truncate" title={order.productName}>
                                {order.productName}
                              </div>
                            </td>
                            <td className="py-4 pr-6 whitespace-nowrap">{order.quantity}개</td>
                            <td className="py-4 pr-6">
                              <div className="max-w-[150px] truncate" title={order.cancelReason || order.refundReason || "-"}>
                                {order.cancelReason || order.refundReason || "-"}
                              </div>
                            </td>
                            <td className="py-4 pr-6 whitespace-nowrap">₩ {KRW.format(order.refundAmount || 0)}</td>
                            <td className="py-4 pr-6 whitespace-nowrap">{order.refundDate || "-"}</td>
                            <td className="py-4 pr-6 whitespace-nowrap">{order.updatedAt}</td>
                          </>
                        ) : (
                          <>
                            <td className="py-4 pr-6 whitespace-nowrap">{order.orderNumber}</td>
                            <td className="py-4 pr-6 whitespace-nowrap">{order.customerName}</td>
                            <td className="py-4 pr-6">
                              <div className="max-w-[200px] truncate" title={order.deliveryAddress}>
                                {order.deliveryAddress}
                              </div>
                            </td>
                            <td className="py-4 pr-6">
                              <div className="max-w-[180px] truncate" title={order.productName}>
                                {order.productName}
                              </div>
                            </td>
                            <td className="py-4 pr-6 whitespace-nowrap">{order.quantity}개</td>
                            <td className="py-4 pr-6 whitespace-nowrap">₩ {KRW.format(order.amount)}</td>
                            <td className="py-4 pr-6 whitespace-nowrap">{order.orderDate}</td>
                            <td className="py-4 pr-6 whitespace-nowrap">{order.updatedAt}</td>
                            {(activeFilter === "cancel_request" || activeFilter === "refund_request") && (
                              <td className="py-4 pr-6 whitespace-nowrap">
                                <button
                                  onClick={() => setSelectedRequest(order)}
                                  className="px-3 py-1.5 bg-[#2d4739] text-white text-xs rounded-lg hover:bg-[#1f3027] transition-colors whitespace-nowrap"
                                >
                                  처리
                                </button>
                              </td>
                            )}
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* 전체 보기 버튼 */}
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

      {/* 취소/환불 처리 모달 */}
      {selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">
                {selectedRequest.status === "취소요청" ? "취소" : "환불"} 처리
              </h3>
              <button
                onClick={() => setSelectedRequest(null)}
                className="p-1 hover:bg-gray-100 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">주문자명</label>
                <div className="p-3 bg-gray-50 rounded-lg text-sm">{selectedRequest.customerName}</div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">상품 이름</label>
                <div className="p-3 bg-gray-50 rounded-lg text-sm">{selectedRequest.productName}</div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">상품 수량</label>
                <div className="p-3 bg-gray-50 rounded-lg text-sm">{selectedRequest.quantity}개</div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {selectedRequest.status === "취소요청" ? "취소" : "환불"} 금액
                </label>
                <div className="p-3 bg-gray-50 rounded-lg text-sm">₩ {KRW.format(selectedRequest.amount)}</div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {selectedRequest.status === "취소요청" ? "취소" : "환불"} 사유
                </label>
                <div className="p-3 bg-gray-50 rounded-lg text-sm">
                  {selectedRequest.cancelReason || selectedRequest.refundReason || "사유 없음"}
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setSelectedRequest(null)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                취소
              </button>
              <button
                onClick={() => handleProcessRequest(selectedRequest)}
                className="flex-1 px-4 py-2 bg-[#2d4739] text-white rounded-lg hover:bg-[#1f3027] transition-colors"
              >
                {selectedRequest.status === "취소요청" ? "취소" : "환불"} 처리
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}