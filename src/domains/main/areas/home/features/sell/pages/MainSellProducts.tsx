// src/domains/main/areas/home/features/sell/pages/MainSellProducts.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import Header from '@src/shared/areas/layout/features/header/Header';
import Mainnavbar from '@src/shared/areas/navigation/features/navbar/main/Mainnavbar';
import SellSubnavbar from '@src/shared/areas/navigation/features/subnavbar/sell/SellSubnavbar';
import {
  Package,
  PackageCheck,
  Truck,
  TruckIcon,
  Ban,
  Undo2,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  X,
  ChevronDown,
  Check,
} from 'lucide-react';
import { legacyGet } from '@src/libs/request';

/** ----- 타입 ----- */
type Status =
  | '주문 완료'
  | '취소 요청'
  | '환불 요청'
  | '발송 완료'
  | '배송 완료'
  | '취소 완료'
  | '환불 완료';

type OrderRow = {
  id: string;
  orderInfoId: string;
  status: Status;
  orderNo: string;
  customerName: string;
  address: string;
  orderedAt: string; // ISO
  productId: string;
  productName: string;
  productImage?: string;
  qty: number;
  amount: number; // 합계(원)
  unitPrice: number; // 단가(원)
  cancelReason?: string;
  refundReason?: string;
};

type ProductCardItem = {
  id: string;
  name: string;
  price: number | null;
  description: string;
  categoryParent: string;
  categoryChild: string;
  stock: number | '';
  lastModified?: string;
};

/** ----- 상수/유틸 ----- */
const STATUS_ORDER: Status[] = [
  '주문 완료',
  '취소 요청',
  '환불 요청',
  '발송 완료',
  '배송 완료',
  '취소 완료',
  '환불 완료',
];
const statusOrderIndex = Object.fromEntries(STATUS_ORDER.map((s, i) => [s, i])) as Record<
  Status,
  number
>;
const won = (n: number) => n.toLocaleString('ko-KR');

const STATUS_BADGE: Record<Status, { text: string; bg: string; border: string; chip?: string }> = {
  '주문 완료': {
    text: 'text-emerald-700',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    chip: 'bg-emerald-600 text-white',
  },
  '취소 요청': {
    text: 'text-rose-700',
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    chip: 'bg-rose-600 text-white',
  },
  '환불 요청': {
    text: 'text-orange-700',
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    chip: 'bg-orange-600 text-white',
  },
  '발송 완료': {
    text: 'text-sky-700',
    bg: 'bg-sky-50',
    border: 'border-sky-200',
    chip: 'bg-sky-600 text-white',
  },
  '배송 완료': {
    text: 'text-indigo-700',
    bg: 'bg-indigo-50',
    border: 'border-indigo-200',
    chip: 'bg-indigo-600 text-white',
  },
  '취소 완료': {
    text: 'text-gray-700',
    bg: 'bg-gray-50',
    border: 'border-gray-200',
    chip: 'bg-gray-600 text-white',
  },
  '환불 완료': {
    text: 'text-violet-700',
    bg: 'bg-violet-50',
    border: 'border-violet-200',
    chip: 'bg-violet-600 text-white',
  },
};

const StatusIcon: Record<Status, React.ReactNode> = {
  '주문 완료': <Package className="w-4 h-4" />,
  '취소 요청': <Ban className="w-4 h-4" />,
  '환불 요청': <Undo2 className="w-4 h-4" />,
  '발송 완료': <Truck className="w-4 h-4" />,
  '배송 완료': <PackageCheck className="w-4 h-4" />,
  '취소 완료': <AlertTriangle className="w-4 h-4" />,
  '환불 완료': <CheckCircle2 className="w-4 h-4" />,
};

// 서버 ↔ UI 매핑
const mapStatusToUI = (raw?: string): Status => {
  switch (raw) {
    case '주문완료':
    case '주문 완료':
    case 'ORDER_OK':
      return '주문 완료';
    case '취소요청':
    case '취소 요청':
    case 'CANCEL':
    case 'CANCEL_RQ':
      return '취소 요청';
    case '환불요청':
    case '환불 요청':
    case 'REFUND':
    case 'REFUND_RQ':
      return '환불 요청';
    case '발송완료':
    case '발송 완료':
    case 'CONFIRM':
    case 'SHIPPED':
      return '발송 완료';
    case '배송완료':
    case '배송 완료':
    case 'DELIVERED':
      return '배송 완료';
    case '취소완료':
    case '취소 완료':
    case 'CANCEL_OK':
      return '취소 완료';
    case '환불완료':
    case '환불 완료':
    case 'REFUND_OK':
      return '환불 완료';
    default:
      return '주문 완료';
  }
};

type StatusCode =
  | 'ORDER_OK'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCEL_RQ'
  | 'CANCEL_OK'
  | 'REFUND_RQ'
  | 'REFUND_OK';

const UI_TO_CODE: Record<Status, StatusCode> = {
  '주문 완료': 'ORDER_OK',
  '발송 완료': 'SHIPPED',
  '배송 완료': 'DELIVERED',
  '취소 요청': 'CANCEL_RQ',
  '취소 완료': 'CANCEL_OK',
  '환불 요청': 'REFUND_RQ',
  '환불 완료': 'REFUND_OK',
};

// 응답 정규화
function extractList(res: any): any[] {
  try {
    if (!res) return [];
    if (Array.isArray(res)) return res;
    if (res.data) {
      if (Array.isArray(res.data)) return res.data;
      if (res.data.data && Array.isArray(res.data.data)) return res.data.data;
    }
    if (res.status !== undefined && res.message !== undefined && Array.isArray(res.data))
      return res.data;
    if (res.data && res.data.status !== undefined && Array.isArray(res.data.data))
      return res.data.data;
    return [];
  } catch {
    return [];
  }
}

// ✅ PUT 엔드포인트(우선순위, 404면 다음 경로로 자동 폴백)
const PUT_ENDPOINTS = [
  '/legacy/main/sell/orderstatus', // 컨트롤러 기준(권장)
  '/legacy/order/management/orderstatus', // 네가 말한 경로(백엔드 설정에 따라)
];

const MainSellProducts: React.FC = () => {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedStatus, setSelectedStatus] = useState<Status | '전체'>('전체');
  const [selectedProductId, setSelectedProductId] = useState<'ALL' | string>('ALL');
  const [showAll, setShowAll] = useState(false);
  const [modalOrder, setModalOrder] = useState<OrderRow | null>(null);

  // 드롭다운
  const [openMenuOrderId, setOpenMenuOrderId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (openMenuOrderId && menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuOrderId(null);
      }
    }
    document.addEventListener('click', onClickOutside); // ✅ mousedown → click
    return () => document.removeEventListener('click', onClickOutside);
  }, [openMenuOrderId]);

  // 주문 조회
  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const r1 = await legacyGet<any>('/main/sell/order/management');
        let list = extractList(r1);

        if (!list.length) {
          const r2 = await fetch('/main/sell/order/management', {
            credentials: 'include',
            headers: { Accept: 'application/json' },
          });
          const j2 = await r2.json().catch(() => null);
          list = extractList(j2);
        }

        const mapped: OrderRow[] = list.map((it: any) => ({
          id: String(it.orderDetailId ?? it.orderId),
          orderInfoId: String(it.orderId),
          status: mapStatusToUI(it.orderStatus),
          orderNo: `ORD-${String(it.orderDetailId ?? it.orderId).padStart(5, '0')}`,
          customerName: it.orderName,
          address:
            it.addressFull ??
            [it.addressRoad, it.addressDetail, it.addressExtra].filter(Boolean).join(' ').trim(),
          orderedAt: new Date(it.orderDate).toISOString(),
          productId: String(it.productId),
          productName: it.productName,
          productImage: undefined,
          qty: Number(it.orderCnt ?? 0),
          amount: Number(it.orderPrice ?? 0),
          unitPrice: Number(it.price ?? it.orderPrice ?? 0),
          cancelReason: it.cancelReason,
          refundReason: it.refundReason,
        }));

        setOrders(mapped);
      } catch (e: any) {
        setError(e?.message ?? '주문 조회 실패');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // 카드/카운트/필터
  const productCards = useMemo<ProductCardItem[]>(() => {
    const map = new Map<string, ProductCardItem>();
    for (const o of orders) {
      if (!map.has(o.productId)) {
        map.set(o.productId, {
          id: o.productId,
          name: o.productName,
          price: Number.isFinite(o.unitPrice) ? o.unitPrice : null,
          description: '',
          categoryParent: '',
          categoryChild: '',
          stock: '',
        });
      }
    }
    return Array.from(map.values()).slice(0, 2);
  }, [orders]);

  const totalSoldByProduct = useMemo(() => {
    const map: Record<string, number> = {};
    for (const o of orders) map[o.productId] = (map[o.productId] || 0) + o.qty;
    return map;
  }, [orders]);

  const byProduct = useMemo(
    () =>
      selectedProductId === 'ALL'
        ? orders
        : orders.filter((o) => o.productId === selectedProductId),
    [orders, selectedProductId]
  );

  const statusCounts = useMemo(() => {
    const map: Record<Status, number> = {
      '주문 완료': 0,
      '취소 요청': 0,
      '환불 요청': 0,
      '발송 완료': 0,
      '배송 완료': 0,
      '취소 완료': 0,
      '환불 완료': 0,
    };
    for (const o of byProduct) map[o.status] += 1;
    return map;
  }, [byProduct]);

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
    () => (selectedStatus === '전체' ? sorted : sorted.filter((o) => o.status === selectedStatus)),
    [sorted, selectedStatus]
  );

  const visible = useMemo(() => (showAll ? filtered : filtered.slice(0, 10)), [filtered, showAll]);

  const goProductDetail = (id: string) => (window.location.href = `/main/product/${id}`);

  const handleRowClick = (order: OrderRow) => {
    if (order.status === '취소 요청' || order.status === '환불 요청') setModalOrder(order);
  };

  const handleConfirmComplete = () => {
    if (!modalOrder) return;
    const newStatus: Status = modalOrder.status === '취소 요청' ? '취소 완료' : '환불 완료';
    setOrders((prev) =>
      prev.map((o) => (o.id === modalOrder.id ? { ...o, status: newStatus } : o))
    );
    setModalOrder(null);
  };

  // ✅ PUT 호출 (세션 쿠키 포함). 우선순위 경로 시도 → 404면 다음 경로 시도
  const putOrderStatus = async (orderId: string, next: Status) => {
    const payload = {
      orderId: Number(orderId),
      orderStatus: UI_TO_CODE[next], // 서버가 무시해도 안전하게 전달
    };

    for (const url of PUT_ENDPOINTS) {
      try {
        const resp = await fetch(url, {
          method: 'PUT',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify(payload),
        });

        if (resp.status === 404) continue; // 다음 후보 경로 시도

        const data = await resp.json().catch(() => null);
        // ApiResponse<Integer> 기준: status 200 && data > 0 이면 성공
        const ok =
          (resp.ok && typeof data?.data === 'number' && data.data > 0) ||
          (typeof data?.data === 'number' && data.data > 0);

        if (ok) return true;
      } catch {
        // 다음 후보 경로 시도
      }
    }
    throw new Error('상태 변경 실패');
  };

  // ✅ 상태 변경 공통
  const patchOrderStatus = async (rowId: string, next: Status) => {
    const row = orders.find((o) => o.id === rowId);
    if (!row) return;
    try {
      await putOrderStatus(row.orderInfoId, next); // ✅ 여기!
      setOrders((prev) => prev.map((o) => (o.id === rowId ? { ...o, status: next } : o)));
    } catch (e) {
      console.error(e);
    } finally {
      setOpenMenuOrderId(null);
    }
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
            <h1 className="text-xl md:text-2xl font-extrabold tracking-[-0.01em]">
              개인 판매 · 주문 관리
            </h1>
            <p className="text-gray-600 mt-1 text-sm">
              상품을 선택해 해당 상품의 주문만 확인하거나, 전체 주문을 볼 수 있어요.
            </p>
          </header>

          {/* 로딩/에러 */}
          {loading && <div className="mb-4 text-sm text-gray-600">불러오는 중…</div>}
          {error && <div className="mb-4 text-sm text-rose-600">에러: {error}</div>}

          {/* 상품 카드 */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            {productCards.length === 0 && !loading && (
              <div className="col-span-full text-sm text-gray-500">
                주문이 없습니다. 주문이 생성되면 카드가 표시됩니다.
              </div>
            )}
            {productCards.map((p) => {
              const totalSold = totalSoldByProduct[p.id] || 0;
              const active = selectedProductId === p.id;
              const displayPrice = p.price != null ? p.price : null;

              return (
                <button
                  key={p.id}
                  onClick={() => {
                    setSelectedProductId((prev) => (prev === p.id ? 'ALL' : p.id));
                    setShowAll(false);
                  }}
                  className={[
                    'text-left rounded-2xl border p-4 md:p-6 shadow-sm transition-all',
                    active
                      ? 'bg-emerald-50/70 border-emerald-200 ring-2 ring-emerald-200'
                      : 'bg-white hover:bg-gray-50 border-gray-200',
                  ].join(' ')}
                >
                  <div className="flex gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold truncate">{p.name || `상품 ${p.id}`}</div>
                      <div className="text-sm text-gray-600 mt-0.5">
                        가격: {displayPrice != null ? `${won(displayPrice)}원` : '—'}
                      </div>
                      <div className="text-sm text-gray-900 mt-2">
                        총 판매 수량: <span className="font-semibold">{totalSold}</span>개
                      </div>

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

          {/* 상태 필터 */}
          <section className="mt-6 md:mt-8 rounded-2xl border bg-white p-3 md:p-4">
            <div className="flex flex-wrap items-center gap-2">
              {(['전체', ...STATUS_ORDER] as const).map((s) => {
                const active = selectedStatus === s;
                const count = s === '전체' ? byProduct.length : statusCounts[s as Status];
                const color =
                  s === '전체'
                    ? 'bg-gray-900 text-white border-gray-900'
                    : active
                      ? `${STATUS_BADGE[s as Status].bg} ${STATUS_BADGE[s as Status].text} border ${STATUS_BADGE[s as Status].border}`
                      : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50';
                const chip =
                  s === '전체'
                    ? 'bg-white/90 text-gray-900'
                    : active
                      ? STATUS_BADGE[s as Status].chip
                      : 'bg-gray-200 text-gray-800';

                return (
                  <button
                    key={s}
                    onClick={() => {
                      setSelectedStatus(s as any);
                      setShowAll(false);
                    }}
                    className={[
                      'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors',
                      color,
                    ].join(' ')}
                  >
                    <span className="hidden sm:inline">{s}</span>
                    <span className="sm:hidden">{s.toString().slice(0, 2)}</span>
                    <span className={['px-2 py-0.5 rounded-full text-xs', chip].join(' ')}>
                      {count}
                    </span>
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
                    const open = openMenuOrderId === o.id;
                    const isClickableRow = o.status === '취소 요청' || o.status === '환불 요청';

                    return (
                      <tr
                        key={o.id}
                        className={[
                          'border-b last:border-b-0 hover:bg-gray-50/50',
                          isClickableRow ? 'cursor-pointer' : '',
                        ].join(' ')}
                        onClick={() => handleRowClick(o)}
                      >
                        <td className="py-2 px-2 relative">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenMenuOrderId(open ? null : o.id);
                            }}
                            className={[
                              'inline-flex items-center gap-1 rounded-md border px-2 py-1 transition',
                              badge.bg,
                              badge.text,
                              badge.border,
                            ].join(' ')}
                          >
                            {StatusIcon[o.status]}
                            {o.status}
                            <ChevronDown className="w-4 h-4 ml-1 opacity-70" />
                          </button>

                          {open && (
                            <div
                              ref={menuRef}
                              className="absolute z-20 mt-2 w-44 rounded-lg border bg-white shadow-lg p-1"
                            >
                              {STATUS_ORDER.map((label) => {
                                const selected = label === o.status;
                                return (
                                  <button
                                    key={label}
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      void patchOrderStatus(o.id, label);
                                    }}
                                    className={[
                                      'w-full text-left px-3 py-2 rounded-md text-sm hover:bg-gray-50 flex items-center justify-between',
                                      selected ? 'bg-gray-50' : '',
                                    ].join(' ')}
                                  >
                                    <span className="inline-flex items-center gap-2">
                                      {StatusIcon[label]}
                                      {label}
                                    </span>
                                    {selected && <Check className="w-4 h-4" />}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </td>

                        <td className="py-2 px-2">{o.orderNo}</td>
                        <td className="py-2 px-2">{o.customerName}</td>
                        <td className="py-2 px-2 max-w-[240px] truncate">{o.address}</td>
                        <td className="py-2 px-2">{new Date(o.orderedAt).toLocaleString()}</td>
                        <td className="py-2 px-2">
                          <div className="flex items-center gap-2">
                            <span className="truncate">{o.productName}</span>
                          </div>
                        </td>
                        <td className="py-2 px-2 text-right">{o.qty}</td>
                        <td className="py-2 px-2 text-right">{won(o.amount)}원</td>
                      </tr>
                    );
                  })}
                  {visible.length === 0 && !loading && (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-gray-500">
                        표시할 주문이 없습니다.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile */}
            <div className="md:hidden space-y-3">
              {visible.map((o) => {
                const badge = STATUS_BADGE[o.status];
                const open = openMenuOrderId === o.id;
                const isClickableRow = o.status === '취소 요청' || o.status === '환불 요청';

                return (
                  <div
                    key={o.id}
                    className={[
                      'rounded-xl border p-3 bg-white relative',
                      isClickableRow ? 'cursor-pointer hover:bg-gray-50' : '',
                    ].join(' ')}
                    onClick={() => handleRowClick(o)}
                  >
                    <div className="flex items-center justify-between">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuOrderId(open ? null : o.id);
                        }}
                        className={[
                          'inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs transition',
                          badge.bg,
                          badge.text,
                          badge.border,
                        ].join(' ')}
                      >
                        {StatusIcon[o.status]}
                        {o.status}
                        <ChevronDown className="w-4 h-4 ml-1 opacity-70" />
                      </button>

                      <span className="text-xs text-gray-500">
                        {new Date(o.orderedAt).toLocaleDateString()}
                      </span>
                    </div>

                    {open && (
                      <div
                        ref={menuRef}
                        className="absolute right-3 top-10 z-20 w-44 rounded-lg border bg-white shadow-lg p-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {STATUS_ORDER.map((label) => {
                          const selected = label === o.status;
                          return (
                            <button
                              key={label}
                              type="button"
                              onClick={() => void patchOrderStatus(o.id, label)}
                              className={[
                                'w-full text-left px-3 py-2 rounded-md text-sm hover:bg-gray-50 flex items-center justify-between',
                                selected ? 'bg-gray-50' : '',
                              ].join(' ')}
                            >
                              <span className="inline-flex items-center gap-2">
                                {StatusIcon[label]}
                                {label}
                              </span>
                              {selected && <Check className="w-4 h-4" />}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    <div className="mt-2 flex items-center gap-3">
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

              {visible.length === 0 && !loading && (
                <div className="text-center text-sm text-gray-500 py-6">
                  표시할 주문이 없습니다.
                </div>
              )}
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
                {modalOrder.status === '취소 요청' ? '취소 사유 확인' : '환불 사유 확인'}
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
                  {modalOrder.status === '취소 요청' ? '취소 사유' : '환불 사유'}
                </div>
                <div className="text-rose-900">
                  {modalOrder.status === '취소 요청'
                    ? (modalOrder.cancelReason ?? '—')
                    : (modalOrder.refundReason ?? '—')}
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
                  'flex-1 px-4 py-2 text-white rounded-lg font-medium',
                  modalOrder.status === '취소 요청'
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : 'bg-orange-600 hover:bg-orange-700',
                ].join(' ')}
              >
                {modalOrder.status === '취소 요청' ? '취소 완료 처리' : '환불 완료 처리'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MainSellProducts;
