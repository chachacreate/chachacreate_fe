// src/domains/main/areas/home/features/sell/pages/MainSellProducts.tsx
import React, { useEffect, useMemo, useState } from "react";
import Header from "@src/shared/areas/layout/features/header/Header";
import Mainnavbar from "@src/shared/areas/navigation/features/navbar/main/Mainnavbar";
import SellSubnavbar from "@src/shared/areas/navigation/features/subnavbar/sell/SellSubnavbar";
import {
  Package, PackageCheck, Truck, TruckIcon, Ban, Undo2, CheckCircle2, AlertTriangle, ExternalLink, X
} from "lucide-react";

/** ----- 타입 ----- */
type Status =
  | "주문 완료"
  | "취소 요청"
  | "환불 요청"
  | "발송 완료"
  | "배송 완료"
  | "취소 완료"
  | "환불 완료";

type OrderRow = {
  id: string;
  status: Status;
  orderNo: string;
  customerName: string;
  address: string;
  orderedAt: string; // ISO
  productId: string;
  productName: string;
  productImage?: string;
  qty: number;
  amount: number; // 원화
  cancelReason?: string; // 취소 사유
  refundReason?: string; // 환불 사유
};

type SavedProduct = {
  id: string; // "1" | "2"
  images: string[];
  name: string;
  price: number | "";
  description: string;
  categoryParent: string;
  categoryChild: string;
  stock: number | "";
  lastModified?: string;
};

/** ----- 상수/유틸 ----- */
const STORAGE_KEY = "personal_sell_products_v1";

const STATUS_ORDER: Status[] = [
  "주문 완료",
  "취소 요청",
  "환불 요청",
  "발송 완료",
  "배송 완료",
  "취소 완료",
  "환불 완료",
];
const statusOrderIndex = Object.fromEntries(STATUS_ORDER.map((s, i) => [s, i])) as Record<Status, number>;

const won = (n: number) => n.toLocaleString("ko-KR");

// 상태 배지 컬러(텍스트/배경/보더)
const STATUS_BADGE: Record<
  Status,
  { text: string; bg: string; border: string; chip?: string }
> = {
  "주문 완료": { text: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200", chip: "bg-emerald-600 text-white" },
  "취소 요청": { text: "text-rose-700", bg: "bg-rose-50", border: "border-rose-200", chip: "bg-rose-600 text-white" },
  "환불 요청": { text: "text-orange-700", bg: "bg-orange-50", border: "border-orange-200", chip: "bg-orange-600 text-white" },
  "발송 완료": { text: "text-sky-700", bg: "bg-sky-50", border: "border-sky-200", chip: "bg-sky-600 text-white" },
  "배송 완료": { text: "text-indigo-700", bg: "bg-indigo-50", border: "border-indigo-200", chip: "bg-indigo-600 text-white" },
  "취소 완료": { text: "text-gray-700", bg: "bg-gray-50", border: "border-gray-200", chip: "bg-gray-600 text-white" },
  "환불 완료": { text: "text-violet-700", bg: "bg-violet-50", border: "border-violet-200", chip: "bg-violet-600 text-white" },
};

const StatusIcon: Record<Status, React.ReactNode> = {
  "주문 완료": <Package className="w-4 h-4" />,
  "취소 요청": <Ban className="w-4 h-4" />,
  "환불 요청": <Undo2 className="w-4 h-4" />,
  "발송 완료": <Truck className="w-4 h-4" />,
  "배송 완료": <PackageCheck className="w-4 h-4" />,
  "취소 완료": <AlertTriangle className="w-4 h-4" />,
  "환불 완료": <CheckCircle2 className="w-4 h-4" />,
};

// 취소/환불 사유 예시
const getCancelReason = (index: number): string => {
  const reasons = [
    "고객 변심으로 인한 취소 요청",
    "상품 불량으로 인한 취소 요청",
    "배송 지연으로 인한 취소 요청",
    "단순 변심으로 인한 취소",
    "상품 옵션 변경 요청으로 인한 취소",
  ];
  return reasons[index % reasons.length];
};

const getRefundReason = (index: number): string => {
  const reasons = [
    "상품 불량으로 인한 환불 요청",
    "상품이 설명과 다름",
    "배송 과정에서 상품 손상",
    "고객 변심으로 인한 환불",
    "상품 크기/색상이 예상과 다름",
  ];
  return reasons[index % reasons.length];
};

// 데모 주문 생성
const makeDemoOrders = (products: SavedProduct[]): OrderRow[] => {
  const p: SavedProduct[] =
  products.length > 0
    ? products
    : [
        { id: "1", name: "데모 상품 A", price: 15000, images: [], description: "", categoryParent: "", categoryChild: "", stock: 0 },
        { id: "2", name: "데모 상품 B", price: 32000, images: [], description: "", categoryParent: "", categoryChild: "", stock: 0 },
      ];

  const pool: Status[] = STATUS_ORDER;
  const names = ["김지민", "이서준", "박하늘", "최민아", "정하윤", "이도윤", "김민지", "오유나", "하진수", "문영서", "유승아", "이현우"];
  const addresses = [
    "서울특별시 강남구 테헤란로 123",
    "경기도 성남시 분당구 판교역로 45",
    "부산광역시 해운대구 센텀중앙로 55",
    "대구광역시 수성구 동대구로 77",
    "광주광역시 서구 상무대로 12",
    "대전광역시 유성구 대학로 27",
  ];

  return Array.from({ length: 28 }).map((_, i) => {
    const pick = p[i % p.length];
    const status = pool[i % pool.length];
    const qty = (i % 3) + 1;
    const price = Number(pick.price || 0);
    const image = pick.images?.[0];

    const d = new Date();
    d.setDate(d.getDate() - (27 - i));

    return {
      id: String(i + 1),
      status,
      orderNo: `O${d.getFullYear()}${(d.getMonth() + 1).toString().padStart(2, "0")}${d.getDate().toString().padStart(2, "0")}-${(1000 + i).toString()}`,
      customerName: names[i % names.length],
      address: addresses[i % addresses.length],
      orderedAt: d.toISOString(),
      productId: pick.id,
      productName: String(pick.name || `상품 ${pick.id}`),
      productImage: image,
      qty,
      amount: price * qty,
      cancelReason: status === "취소 요청" ? getCancelReason(i) : undefined,
      refundReason: status === "환불 요청" ? getRefundReason(i) : undefined,
    };
  });
};

const MainSellProducts: React.FC = () => {
  // 상품/주문
  const [products, setProducts] = useState<SavedProduct[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<Status | "전체">("전체");
  const [selectedProductId, setSelectedProductId] = useState<"ALL" | string>("ALL");
  const [showAll, setShowAll] = useState(false);
  
  // 모달 상태
  const [modalOrder, setModalOrder] = useState<OrderRow | null>(null);
  const [orders, setOrders] = useState<OrderRow[]>([]);

  // 등록상품 로딩
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as SavedProduct[];
        if (Array.isArray(parsed)) setProducts(parsed.slice(0, 2));
      }
    } catch {/* noop */}
  }, []);

  // 주문 원천데이터
  const ordersAll = useMemo(() => {
    const demoOrders = makeDemoOrders(products);
    // 업데이트된 주문이 있으면 반영
    return demoOrders.map(demoOrder => {
      const updatedOrder = orders.find(o => o.id === demoOrder.id);
      return updatedOrder || demoOrder;
    });
  }, [products, orders]);

  // 상품 카드 집계
  const productCards = useMemo(() => {
  const base: SavedProduct[] =
    products.length > 0
      ? products
      : [
          { id: "1", name: "데모 상품 A", price: 15000, images: [], description: "", categoryParent: "", categoryChild: "", stock: 0 },
          { id: "2", name: "데모 상품 B", price: 32000, images: [], description: "", categoryParent: "", categoryChild: "", stock: 0 },
        ];
  return base.slice(0, 2);
}, [products]);

  const totalSoldByProduct = useMemo(() => {
    const map: Record<string, number> = {};
    for (const o of ordersAll) map[o.productId] = (map[o.productId] || 0) + o.qty;
    return map;
  }, [ordersAll]);

  // 상품 선택 필터
  const byProduct = useMemo(
    () => (selectedProductId === "ALL" ? ordersAll : ordersAll.filter((o) => o.productId === selectedProductId)),
    [ordersAll, selectedProductId]
  );

  // 상태별 카운트(상품 필터 반영)
  const statusCounts = useMemo(() => {
    const map: Record<Status, number> = {
      "주문 완료": 0, "취소 요청": 0, "환불 요청": 0, "발송 완료": 0, "배송 완료": 0, "취소 완료": 0, "환불 완료": 0,
    };
    for (const o of byProduct) map[o.status] += 1;
    return map;
  }, [byProduct]);

  // 정렬 + 상태 필터
  const sorted = useMemo(
    () =>
      [...byProduct].sort((a, b) => {
        const so = statusOrderIndex[a.status] - statusOrderIndex[b.status];
        if (so !== 0) return so;
        return new Date(b.orderedAt).getTime() - new Date(a.orderedAt).getTime();
      }),
    [byProduct]
  );

  const filtered = useMemo(
    () => (selectedStatus === "전체" ? sorted : sorted.filter((o) => o.status === selectedStatus)),
    [sorted, selectedStatus]
  );

  const visible = useMemo(() => (showAll ? filtered : filtered.slice(0, 10)), [filtered, showAll]);

  const goProductDetail = (id: string) => {
    // TODO: 실제 상세 경로 맞추기
    window.location.href = `/main/product/${id}`;
  };

  // 행 클릭 핸들러
  const handleRowClick = (order: OrderRow) => {
    if (order.status === "취소 요청" || order.status === "환불 요청") {
      setModalOrder(order);
    }
  };

  // 상태 완료 처리
  const handleConfirmComplete = () => {
    if (!modalOrder) return;
    
    const newStatus: Status = modalOrder.status === "취소 요청" ? "취소 완료" : "환불 완료";
    
    setOrders(prev => {
      const existing = prev.find(o => o.id === modalOrder.id);
      if (existing) {
        return prev.map(o => o.id === modalOrder.id ? { ...o, status: newStatus } : o);
      } else {
        return [...prev, { ...modalOrder, status: newStatus }];
      }
    });
    
    setModalOrder(null);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      <Mainnavbar />
      <SellSubnavbar />

      <div className="px-4 sm:px-6 xl:px-[240px]">
        <div className="w-full max-w-[1440px] mx-auto py-6 md:py-10">
          {/* 헤더 */}
          <header className="mb-6 md:mb-8">
            <h1 className="text-xl md:text-2xl font-extrabold tracking-[-0.01em]">개인 판매 · 주문 관리</h1>
            <p className="text-gray-600 mt-1 text-sm">상품을 선택해 해당 상품의 주문만 확인하거나, 전체 주문을 볼 수 있어요.</p>
          </header>

          {/* 상품 카드 — 클릭 시 상품 필터 적용 */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            {productCards.map((p) => {
              const img = p.images?.[0];
              const totalSold = totalSoldByProduct[p.id] || 0;
              const active = selectedProductId === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => {
                    // 같은 카드 클릭 시 전체로 토글
                    setSelectedProductId((prev) => (prev === p.id ? "ALL" : p.id));
                    setShowAll(false);
                  }}
                  className={[
                    "text-left rounded-2xl border p-4 md:p-6 shadow-sm transition-all",
                    active
                      ? "bg-emerald-50/70 border-emerald-200 ring-2 ring-emerald-200"
                      : "bg-white hover:bg-gray-50 border-gray-200",
                  ].join(" ")}
                >
                  <div className="flex gap-4">
                    <div className="w-20 h-20 rounded-lg overflow-hidden border bg-gray-50 shrink-0">
                      {img ? (
                        <img src={img} alt={p.name || `상품 ${p.id}`} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full grid place-items-center text-gray-400">
                          <TruckIcon className="w-6 h-6" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold truncate">{p.name || `상품 ${p.id}`}</div>
                      <div className="text-sm text-gray-600 mt-0.5">
                        가격: {typeof p.price === "number" ? `${won(p.price)}원` : "—"}
                      </div>
                      <div className="text-sm text-gray-900 mt-2">
                        총 판매 수량: <span className="font-semibold">{totalSold}</span>개
                      </div>

                      {/* 상세페이지 이동 */}
                      <div className="mt-3">
                        <span
                          onClick={(e) => {
                            e.stopPropagation();
                            goProductDetail(p.id);
                          }}
                          className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 hover:text-emerald-900 hover:underline"
                        >
                          상품 상세페이지 가기 <ExternalLink className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </div>
                  </div>

                  {active && (
                    <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-emerald-600 text-white px-2.5 py-1 text-xs">
                      선택됨
                    </div>
                  )}
                </button>
              );
            })}
          </section>

          {/* 상태 필터 (상품 필터 반영된 카운트) */}
          <section className="mt-6 md:mt-8 rounded-2xl border bg-white p-3 md:p-4">
            <div className="flex flex-wrap items-center gap-2">
              {(["전체", ...STATUS_ORDER] as const).map((s) => {
                const active = selectedStatus === s;
                const count =
                  s === "전체"
                    ? filtered.length + (selectedStatus === "전체" ? 0 : 0) || byProduct.length
                    : statusCounts[s as Status];
                const color =
                  s === "전체"
                    ? "bg-gray-900 text-white border-gray-900"
                    : active
                    ? `${STATUS_BADGE[s as Status].bg} ${STATUS_BADGE[s as Status].text} border ${STATUS_BADGE[s as Status].border}`
                    : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50";
                const chip =
                  s === "전체"
                    ? "bg-white/90 text-gray-900"
                    : active
                    ? STATUS_BADGE[s as Status].chip
                    : "bg-gray-200 text-gray-800";

                return (
                  <button
                    key={s}
                    onClick={() => {
                      setSelectedStatus(s as any);
                      setShowAll(false);
                    }}
                    className={["inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors", color].join(" ")}
                  >
                    <span className="hidden sm:inline">{s}</span>
                    <span className="sm:hidden">{s.toString().slice(0, 2)}</span>
                    <span className={["px-2 py-0.5 rounded-full text-xs", chip].join(" ")}>{s === "전체" ? byProduct.length : count}</span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* 주문 테이블 */}
          <section className="mt-4 md:mt-6 rounded-2xl border bg-white p-3 md:p-4">
            {/* Desktop */}
            <div className="hidden md:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b">
                    <th className="py-2 px-2">처리상태</th>
                    <th className="py-2 px-2">주문번호</th>
                    <th className="py-2 px-2">주문자명</th>
                    <th className="py-2 px-2">배송지</th>
                    <th className="py-2 px-2">주문일</th>
                    <th className="py-2 px-2">주문상품</th>
                    <th className="py-2 px-2 text-right">상품수량</th>
                    <th className="py-2 px-2 text-right">금액</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((o) => {
                    const badge = STATUS_BADGE[o.status];
                    const isClickable = o.status === "취소 요청" || o.status === "환불 요청";
                    return (
                      <tr 
                        key={o.id} 
                        className={[
                          "border-b last:border-b-0 hover:bg-gray-50/50",
                          isClickable ? "cursor-pointer" : ""
                        ].join(" ")}
                        onClick={() => handleRowClick(o)}
                      >
                        <td className="py-2 px-2">
                          <span className={["inline-flex items-center gap-1 rounded-md border px-2 py-1", badge.bg, badge.text, badge.border].join(" ")}>
                            {StatusIcon[o.status]}
                            {o.status}
                          </span>
                        </td>
                        <td className="py-2 px-2">{o.orderNo}</td>
                        <td className="py-2 px-2">{o.customerName}</td>
                        <td className="py-2 px-2 max-w-[240px] truncate">{o.address}</td>
                        <td className="py-2 px-2">{new Date(o.orderedAt).toLocaleString()}</td>
                        <td className="py-2 px-2">
                          <div className="flex items-center gap-2">
                            <div className="w-9 h-9 rounded border overflow-hidden bg-gray-50 shrink-0">
                              {o.productImage ? (
                                <img src={o.productImage} alt={o.productName} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full grid place-items-center text-gray-300">
                                  <Package className="w-4 h-4" />
                                </div>
                              )}
                            </div>
                            <span className="truncate">{o.productName}</span>
                          </div>
                        </td>
                        <td className="py-2 px-2 text-right">{o.qty}</td>
                        <td className="py-2 px-2 text-right">{won(o.amount)}원</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile */}
            <div className="md:hidden space-y-3">
              {visible.map((o) => {
                const badge = STATUS_BADGE[o.status];
                const isClickable = o.status === "취소 요청" || o.status === "환불 요청";
                return (
                  <div 
                    key={o.id} 
                    className={[
                      "rounded-xl border p-3 bg-white",
                      isClickable ? "cursor-pointer hover:bg-gray-50" : ""
                    ].join(" ")}
                    onClick={() => handleRowClick(o)}
                  >
                    <div className="flex items-center justify-between">
                      <span className={["inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs", badge.bg, badge.text, badge.border].join(" ")}>
                        {StatusIcon[o.status]}
                        {o.status}
                      </span>
                      <span className="text-xs text-gray-500">{new Date(o.orderedAt).toLocaleDateString()}</span>
                    </div>

                    <div className="mt-2 flex items-center gap-3">
                      <div className="w-14 h-14 rounded border overflow-hidden bg-gray-50 shrink-0">
                        {o.productImage ? (
                          <img src={o.productImage} alt={o.productName} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full grid place-items-center text-gray-300">
                            <Package className="w-4 h-4" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium truncate">{o.productName}</div>
                        <div className="text-xs text-gray-600 truncate">{o.orderNo}</div>
                      </div>
                    </div>

                    <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                      <div className="text-gray-500">주문자</div>
                      <div className="text-right">{o.customerName}</div>
                      <div className="text-gray-500">수량</div>
                      <div className="text-right">{o.qty}</div>
                      <div className="text-gray-500">금액</div>
                      <div className="text-right">{won(o.amount)}원</div>
                      <div className="text-gray-500 col-span-2">배송지</div>
                      <div className="col-span-2 text-gray-900">{o.address}</div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 전체 보기 */}
            {!showAll && filtered.length > 10 && (
              <div className="mt-4 text-center">
                <button
                  onClick={() => setShowAll(true)}
                  className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm hover:bg-gray-50"
                >
                  전체 보기 ({filtered.length - 10}건 더 보기)
                </button>
              </div>
            )}
          </section>
        </div>
      </div>

      {/* 취소/환불 사유 모달 */}
      {modalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">
                {modalOrder.status === "취소 요청" ? "취소 사유 확인" : "환불 사유 확인"}
              </h2>
              <button
                onClick={() => setModalOrder(null)}
                className="p-1 hover:bg-gray-100 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-600">주문번호</div>
                <div className="font-medium">{modalOrder.orderNo}</div>
              </div>

              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-600">상품명</div>
                <div className="font-medium">{modalOrder.productName}</div>
              </div>

              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-600">주문자</div>
                <div className="font-medium">{modalOrder.customerName}</div>
              </div>

              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg">
                <div className="text-sm text-rose-600 font-medium mb-1">
                  {modalOrder.status === "취소 요청" ? "취소 사유" : "환불 사유"}
                </div>
                <div className="text-rose-900">
                  {modalOrder.status === "취소 요청" ? modalOrder.cancelReason : modalOrder.refundReason}
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setModalOrder(null)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                닫기
              </button>
              <button
                onClick={handleConfirmComplete}
                className={[
                  "flex-1 px-4 py-2 text-white rounded-lg font-medium",
                  modalOrder.status === "취소 요청" 
                    ? "bg-rose-600 hover:bg-rose-700" 
                    : "bg-orange-600 hover:bg-orange-700"
                ].join(" ")}
              >
                {modalOrder.status === "취소 요청" ? "취소 완료 처리" : "환불 완료 처리"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MainSellProducts;