// src/domains/main/areas/mypage/pages/MainMypageCart.tsx
import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Minus, Plus, Trash2, ShoppingCart, Store } from 'lucide-react';

import Header from '@src/shared/areas/layout/features/header/Header';
import Mainnavbar from '@src/shared/areas/navigation/features/navbar/main/Mainnavbar';
import MypageSidenavbar from '@src/shared/areas/navigation/features/sidenavbar/mypage/MypageSidenavbar';
import { legacyDel, legacyGet, legacyPut } from '@src/libs/request';
import Storenavbar from '@src/shared/areas/navigation/features/navbar/store/Storenavbar';
import { truncateText } from '@src/shared/util/truncateUtil';

/** 브랜드 컬러 */
const BRAND = '#2d4739';

/** 이미지 없을 때 placeholder */
const PLACEHOLDER =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480">
       <rect width="100%" height="100%" fill="#f3f4f6"/>
       <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle"
             fill="#9ca3af" font-family="sans-serif" font-size="16">
         No Image
       </text>
     </svg>`
  );

/** 타입 */
type CartItem = {
  cartId: number;
  memberId: number;
  productId: number;
  productName: string;
  price: number;
  productCnt: number;
  stock: number;
  storeId: number;
  storeName: string | null;
  storeUrl: string;
  pimgUrl?: string | null;
  productDetail?: string;
};

type Params = { storeUrl?: string };

/** KRW 포맷 */
const toKRW = (v: number) =>
  new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW',
    maximumFractionDigits: 0,
  }).format(v);

/** 스토어당 배송비 (선택된 동일 스토어 품목이 하나라도 있으면 1회 부과) */
const SHIPPING_FEE_PER_STORE = 3000;

/** 수량 스텝퍼 */
function QtyStepper({
  value,
  onChange,
  disabled,
}: {
  value: number;
  onChange: (v: number) => void;
  disabled?: boolean;
}) {
  return (
    <div className="inline-flex items-center rounded-lg border overflow-hidden">
      <button
        type="button"
        className="h-9 w-9 grid place-items-center hover:bg-gray-50 active:scale-95 disabled:opacity-50"
        onClick={() => onChange(Math.max(1, value - 1))}
        disabled={disabled}
        aria-label="수량 감소"
      >
        <Minus className="w-4 h-4" />
      </button>
      <div className="px-3 min-w-[2.5rem] text-center">{value}</div>
      <button
        type="button"
        className="h-9 w-9 grid place-items-center hover:bg-gray-50 active:scale-95 disabled:opacity-50"
        onClick={() => onChange(value + 1)}
        disabled={disabled}
        aria-label="수량 증가"
      >
        <Plus className="w-4 h-4" />
      </button>
    </div>
  );
}

export default function MainMypageCart() {
  const { storeUrl } = useParams<Params>();

  const [items, setItems] = useState<CartItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(() => new Set());

  useEffect(() => {
    const fetchCart = async () => {
      try {
        const response = await legacyGet<{ status: number; message: string; data: CartItem[] }>(
          '/main/mypage/cart'
        );
        // console.log('장바구니 데이터:', response);
        if (response.status === 200) {
          setItems(response.data);
        } else {
          console.error('장바구니 데이터 조회 실패: ', response.message);
        }
      } catch (error) {
        console.error('API 요청 실패: ', error);
      }
    };
    fetchCart();
  }, []);

  /** 파생: 현재 스토어/나머지 스토어 구분
   * - storeUrl가 있으면 해당 스토어만 "현재 스토어 장바구니"로 보여주고, 나머지는 "전체 스토어 장바구니"
   * - storeUrl가 없으면(메인 홈) 모든 아이템을 "전체 스토어 장바구니"로 표시
   */
  const { currentStoreItems, otherStoreItems, allItems } = useMemo(() => {
    const all = items;
    if (storeUrl) {
      return {
        currentStoreItems: items.filter((x) => x.storeUrl === storeUrl),
        otherStoreItems: items.filter((x) => x.storeUrl !== storeUrl),
        allItems: all,
      };
    }
    // storeUrl이 없으면 현재 스토어 장바구니는 비우고 모든 아이템을 전체 스토어 장바구니에 표시
    return {
      currentStoreItems: [],
      otherStoreItems: items,
      allItems: all,
    };
  }, [items, storeUrl]);

  /** 전체 선택(현재 장바구니의 모든 아이템) 체크 상태 */
  const allChecked = allItems.length > 0 && allItems.every((item) => selectedIds.has(item.cartId));
  const someChecked = allItems.length > 0 && allItems.some((item) => selectedIds.has(item.cartId));

  /** 전체 선택/해제 */
  const toggleAll = (checked: boolean) => {
    setSelectedIds(() => {
      if (!checked) return new Set();
      return new Set(allItems.map((item) => item.cartId));
    });
  };

  /** 선택 토글 */
  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  /** 섹션 전체 선택/해제 */
  const toggleSectionAll = (list: CartItem[], checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      list.forEach((item) => {
        if (checked) next.add(item.cartId);
        else next.delete(item.cartId);
      });
      return next;
    });
  };

  /** 수량 변경 */
  const changeQty = async (cartId: number, productCnt: number) => {
    try {
      const response = await legacyPut<{ status: number; message: string; data: null }>(
        '/main/mypage/cart',
        {
          cartId,
          productCnt,
        }
      );
      if (response.status === 200) {
        setItems((prev) =>
          prev.map((item) => (item.cartId === cartId ? { ...item, productCnt } : item))
        );
      } else {
        console.error('수량 수정 실패: ', response.message);
      }
    } catch (error) {
      console.error('API 요청 실패: ', error);
    }
  };

  async function removeCartItems(
    ids: number[],
    urlBuilder?: (cartId: number) => string,
    confirmMessage?: string
  ) {
    if (ids.length === 0) {
      alert('삭제할 상품을 선택해주세요.');
      return;
    }

    if (confirmMessage && !confirm(confirmMessage)) return;

    try {
      // 단건 삭제 반복 처리
      if (urlBuilder) {
        await Promise.all(
          ids.map((cartId) =>
            legacyDel<{ status: number; message: string; data: null }>(urlBuilder(cartId))
          )
        );
      }

      // 상태 업데이트
      const idsSet = new Set(ids);
      setItems((prev) => prev.filter((item) => !idsSet.has(item.cartId)));
      setSelectedIds((prev) => {
        const next = new Set(prev);
        ids.forEach((cartId) => next.delete(cartId));
        return next;
      });
    } catch (err) {
      console.error('API 요청 실패:', err);
    }
  }

  // 단건 삭제
  const removeItem = (cartId: number) =>
    removeCartItems([cartId], (id) => `/main/mypage/cart/delete/${id}`);

  // 전체 삭제
  const clearCart = async () => {
    if (!confirm('장바구니의 모든 상품을 삭제할까요?')) return;
    try {
      const response = await legacyDel<{ status: number; message: string; data: null }>(
        '/main/mypage/cart/deleteAll'
      );
      if (response.status === 200) {
        setItems([]);
        setSelectedIds(new Set());
      } else {
        console.error('전체 삭제 실패: ', response.message);
      }
    } catch (error) {
      console.error('API 요청 실패: ', error);
    }
  };

  // 현재 스토어 선택 삭제
  const clearCurrentStore = () => {
    const selectedCurrentIds = currentStoreItems
      .filter((i) => selectedIds.has(i.cartId))
      .map((i) => i.cartId);
    removeCartItems(
      selectedCurrentIds,
      (id) => `/main/mypage/cart/delete/${id}`,
      `현재 스토어 장바구니에서 선택된 ${selectedCurrentIds.length}개 상품을 삭제할까요?`
    );
  };

  // 다른 스토어 선택 삭제
  const clearOtherStores = () => {
    const selectedOtherIds = otherStoreItems
      .filter((i) => selectedIds.has(i.cartId))
      .map((i) => i.cartId);
    removeCartItems(
      selectedOtherIds,
      (id) => `/main/mypage/cart/delete/${id}`,
      `전체 스토어 장바구니에서 선택된 ${selectedOtherIds.length}개 상품을 삭제할까요?`
    );
  };

  /** 합계 계산 (선택된 항목 대상) */
  const calcSummary = useMemo(() => {
    const selected = items.filter((x) => selectedIds.has(x.cartId));
    const count = selected.length;

    const subtotal = selected.reduce((sum, item) => sum + item.price * item.productCnt, 0);

    // 스토어별 중복 제거 후 배송비 합산
    const storesInSelection = Array.from(new Set(selected.map((x) => x.storeUrl || x.storeName)));
    const shipping = storesInSelection.length * SHIPPING_FEE_PER_STORE;

    const total = subtotal + (count > 0 ? shipping : 0);

    return {
      count,
      lines: selected.map((item) => ({
        id: item.cartId,
        name: item.productName,
        lineTotal: item.price * item.productCnt,
      })),
      subtotal,
      shipping: count > 0 ? shipping : 0,
      total,
    };
  }, [items, selectedIds]);

  // 결제 naivgate
  const naivgate = useNavigate();

  const handleCheckout = () => {
    const selected = items.filter((x) => selectedIds.has(x.cartId));
    if (selected.length === 0) {
      alert('결제할 상품을 선택해주세요.');
      return;
    }

    const orderItems = selected.map((item) => ({
      productId: item.productId,
      productName: item.productName,
      productDetail: item.productDetail ?? '',
      productCnt: item.productCnt,
      price: item.price,
      pimgUrl: item.pimgUrl || '',
      storeName: item.storeName || '뜨락상회',
      storeUrl: item.storeUrl ?? 'main',
      cartId: item.cartId, // 장바구니 주문 표식
    }));

    // 주문 정보 세션스토리지에 저장
    sessionStorage.setItem('orderItems', JSON.stringify(orderItems));
    // 주문 페이지로 이동
    naivgate('/main/order');
    // naivgate("/main/order");
  };

  /** 공통 헤더 + 글로벌 컨트롤(전체선택/비우기) */
  const HeaderCard = () => (
    <div className="rounded-2xl border border-gray-300 overflow-hidden">
      <div className="px-6 py-5 bg-gradient-to-r from-[#2d4739] to-gray-800">
        <h2 className="text-white text-lg md:text-xl">장바구니</h2>
        <p className="text-gray-200 text-xs md:text-sm mt-0.5">
          현재 선택한 상품으로 주문 예상 금액을 확인하고 결제하세요.
        </p>
      </div>
      <div className="px-6 py-4 flex flex-wrap items-center justify-between gap-3 bg-white">
        <label className="inline-flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            className={`h-4 w-4 ${!allChecked && someChecked ? 'accent-gray-400' : ''}`}
            checked={allChecked}
            ref={(el) => {
              if (el) el.indeterminate = !allChecked && someChecked;
            }}
            onChange={(e) => toggleAll(e.target.checked)}
          />
          전체선택
        </label>

        <button
          type="button"
          onClick={clearCart}
          disabled={items.length === 0}
          className={[
            'inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm active:scale-95 transition',
            items.length === 0 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50',
          ].join(' ')}
        >
          <Trash2 className="w-4 h-4" />
          장바구니 비우기
        </button>
      </div>
    </div>
  );

  /** 데스크톱 표 행 */
  const TableRow = ({ item }: { item: CartItem }) => (
    <tr className="border-b last:border-0">
      <td className="py-3 px-3 align-middle">
        <input
          type="checkbox"
          className="h-4 w-4"
          checked={selectedIds.has(item.cartId)}
          onChange={() => toggleSelect(item.cartId)}
        />
      </td>
      <td className="py-3 px-3 align-middle text-sm text-gray-700 whitespace-nowrap">
        <div className="inline-flex items-center gap-1.5">
          <Store className="w-4 h-4 text-gray-500" />
          {item.storeName || '뜨락상회'}
        </div>
      </td>
      <td className="py-3 px-3 align-middle">
        <a
          href={`/main/products/${item.productId}`}
          className="block w-16 h-16 rounded-lg overflow-hidden bg-gray-100"
        >
          <img
            src={item.pimgUrl || PLACEHOLDER}
            alt={item.productName}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </a>
      </td>
      <td className="py-3 px-3 align-middle">
        <a
          href={`/main/products/${item.productId}`}
          className="text-gray-900 font-medium hover:underline line-clamp-2"
        >
          {item.productName}
        </a>
        {item.productDetail && (
          <p className="text-sm text-gray-500 line-clamp-1 mt-0.5">
            {truncateText(item.productDetail, 100)}
          </p>
        )}
      </td>
      <td className="py-3 px-3 align-middle text-gray-900 font-semibold whitespace-nowrap">
        {toKRW(item.price)}
      </td>
      <td className="py-3 px-3 align-middle">
        <QtyStepper value={item.productCnt} onChange={(v) => changeQty(item.cartId, v)} />
      </td>
      <td className="py-3 px-3 align-middle">
        <button
          type="button"
          onClick={() => removeItem(item.cartId)}
          className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-sm hover:bg-gray-50 active:scale-95 transition"
        >
          <Trash2 className="w-4 h-4" />
          삭제
        </button>
      </td>
    </tr>
  );

  /** 데스크톱 표 섹션 */
  const TableSection = ({
    title,
    list,
    onClearSection,
  }: {
    title: string;
    list: CartItem[];
    onClearSection: () => void;
  }) => {
    const sectionAllChecked = list.length > 0 && list.every((item) => selectedIds.has(item.cartId));
    const sectionSomeChecked = list.some((item) => selectedIds.has(item.cartId));

    return (
      <section className="rounded-2xl border border-gray-300 bg-white overflow-hidden">
        <header className="px-6 py-5 border-b bg-white/60">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-gray-700" />
              <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            </div>
            <div className="flex items-center gap-4">
              <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  className={`h-4 w-4 ${!sectionAllChecked && sectionSomeChecked ? 'accent-gray-400' : ''}`}
                  checked={sectionAllChecked}
                  ref={(el) => {
                    if (el) el.indeterminate = !sectionAllChecked && sectionSomeChecked;
                  }}
                  onChange={(e) => toggleSectionAll(list, e.target.checked)}
                />
                전체선택
              </label>
              <button
                type="button"
                onClick={onClearSection}
                disabled={list.length === 0}
                className={[
                  'inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm active:scale-95 transition',
                  list.length === 0 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50',
                ].join(' ')}
              >
                <Trash2 className="w-4 h-4" />
                선택한 상품 삭제
              </button>
            </div>
          </div>
        </header>

        {list.length === 0 ? (
          <div className="p-6 text-gray-500">담긴 상품이 없습니다.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm text-center">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="py-3 px-3 w-1/12">선택</th>
                  <th className="py-3 px-3 w-2/12">스토어</th>
                  <th className="py-3 px-3 w-1/12 text-left">상품이미지</th>
                  <th className="py-3 px-3 w-3/12">상품명/설명</th>
                  <th className="py-3 px-3 w-1/12">가격</th>
                  <th className="py-3 px-3 w-1/12">개수</th>
                  <th className="py-3 px-3 w-1/12">관리</th>
                </tr>
              </thead>
              <tbody>
                {list.map((item) => (
                  <TableRow key={item.cartId} item={item} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    );
  };

  /** 모바일 카드 */
  const MobileCard = ({ item }: { item: CartItem }) => (
    <li className="rounded-2xl border border-gray-200 bg-white p-4">
      <div className="flex items-start justify-between">
        <label className="inline-flex items-center gap-2">
          <input
            type="checkbox"
            className="h-4 w-4"
            checked={selectedIds.has(item.cartId)}
            onChange={() => toggleSelect(item.cartId)}
          />
          <span className="text-sm text-gray-700 inline-flex items-center gap-1.5">
            <Store className="w-4 h-4 text-gray-500" />
            {item.storeName}
          </span>
        </label>
        <button
          type="button"
          onClick={() => removeItem(item.cartId)}
          className="inline-flex items-center gap-1 text-xs rounded-md border px-2 py-1 hover:bg-gray-50"
        >
          <Trash2 className="w-4 h-4" />
          삭제
        </button>
      </div>

      <div className="mt-3 flex gap-3">
        <a
          href={`/main/products/${item.productId}`}
          className="w-24 h-24 rounded-lg overflow-hidden bg-gray-100 shrink-0"
        >
          <img
            src={item.pimgUrl || PLACEHOLDER}
            alt={item.productName}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </a>
        <div className="min-w-0 flex-1">
          <a
            href={`/main/products/${item.productId}`}
            className="text-base font-semibold text-gray-900 hover:underline line-clamp-2"
          >
            {item.productName}
          </a>
          {item.productDetail && (
            <p className="text-sm text-gray-500 line-clamp-2 mt-0.5">
              {truncateText(item.productDetail, 100)}
            </p>
          )}

          <div className="mt-2 flex items-center justify-between">
            <div className="text-gray-900 font-semibold">{toKRW(item.price)}</div>
            <QtyStepper value={item.productCnt} onChange={(v) => changeQty(item.cartId, v)} />
          </div>
        </div>
      </div>
    </li>
  );

  /** 모바일 섹션 */
  const MobileSection = ({
    title,
    list,
    onClearSection,
  }: {
    title: string;
    list: CartItem[];
    onClearSection: () => void;
  }) => {
    const sectionAllChecked = list.length > 0 && list.every((item) => selectedIds.has(item.cartId));
    const sectionSomeChecked = list.some((item) => selectedIds.has(item.cartId));

    return (
      <section className="rounded-2xl border border-gray-300 bg-white overflow-hidden">
        <header className="px-4 py-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-gray-700" />
              <h3 className="text-base font-semibold text-gray-900">{title}</h3>
            </div>
            <div className="flex items-center gap-3">
              <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  className={`h-4 w-4 ${!sectionAllChecked && sectionSomeChecked ? 'accent-gray-400' : ''}`}
                  checked={sectionAllChecked}
                  ref={(el) => {
                    if (el) el.indeterminate = !sectionAllChecked && sectionSomeChecked;
                  }}
                  onChange={(e) => toggleSectionAll(list, e.target.checked)}
                />
                전체선택
              </label>
              <button
                type="button"
                onClick={onClearSection}
                disabled={list.length === 0}
                className={[
                  'inline-flex items-center gap-1 text-xs rounded-md border px-2 py-1 transition',
                  list.length === 0 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50',
                ].join(' ')}
              >
                <Trash2 className="w-3 h-3" />
                선택 삭제
              </button>
            </div>
          </div>
        </header>
        <ul className="p-4 space-y-3">
          {list.length === 0 ? (
            <li className="text-gray-500">담긴 상품이 없습니다.</li>
          ) : (
            list.map((item) => <MobileCard key={item.cartId} item={item} />)
          )}
        </ul>
      </section>
    );
  };

  /** 주문 요약(공용) */
  const Summary = () => (
    <section className="rounded-2xl border border-gray-300 bg-white overflow-hidden">
      <header className="px-6 py-5 border-b bg-white/60">
        <h3 className="text-lg font-semibold text-gray-900">주문 예상 금액</h3>
        <p className="text-sm text-gray-500 mt-0.5">선택된 {calcSummary.count}개 상품 기준</p>
      </header>
      <div className="p-6 space-y-4">
        <ul className="space-y-2">
          {calcSummary.lines.map((ln) => (
            <li key={ln.id} className="flex items-center justify-between text-sm">
              <span className="text-gray-700 line-clamp-1">{ln.name}</span>
              <span className="text-gray-900 font-medium">{toKRW(ln.lineTotal)}</span>
            </li>
          ))}
        </ul>

        <div className="h-px bg-gray-200" />

        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">상품 합계</span>
          <span className="text-gray-900 font-semibold">{toKRW(calcSummary.subtotal)}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">배송비</span>
          <span className="text-gray-900 font-semibold">{toKRW(calcSummary.shipping)}</span>
        </div>

        <div className="h-px bg-gray-200" />

        <div className="flex items-center justify-between">
          <span className="text-gray-800 font-semibold">총 금액</span>
          <span className="text-xl font-bold" style={{ color: BRAND }}>
            {toKRW(calcSummary.total)}
          </span>
        </div>

        <button
          type="button"
          disabled={calcSummary.count === 0}
          className={[
            'w-full h-11 rounded-xl text-white font-semibold active:scale-95 transition',
            calcSummary.count === 0 ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-95',
          ].join(' ')}
          style={{ backgroundColor: BRAND }}
          onClick={handleCheckout}
        >
          결제하기
        </button>
      </div>
    </section>
  );

  // /main 로 시작하면 Mainnavbar, 아니면 Storenavbar
  const isMain = location.pathname.startsWith('/main');

  return (
    <div
      className="min-h-screen font-jua pb-12"
      style={{ background: 'linear-gradient(135deg,#f8fafc 0%,#f1f5f9 100%)' }}
    >
      <Header />
      {isMain ? <Mainnavbar /> : <Storenavbar />}

      {/* 📱 모바일: 독립 페이지 느낌 (뒤로가기 포함) */}
      <div className="lg:hidden">
        <div className="sticky top-0 z-50 bg-white border-b border-gray-200">
          <div className="px-4 py-3 flex items-center gap-3">
            <button
              type="button"
              onClick={() =>
                history.length > 1 ? history.back() : (window.location.href = '/main/mypage')
              }
              className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-white border border-gray-200 shadow-sm hover:bg-gray-50 active:scale-95 transition-all"
              aria-label="뒤로가기"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-bold text-gray-900">장바구니</h1>
            <div className="flex-1" />
          </div>
        </div>

        <div className="px-4 py-4 space-y-6">
          {/* 글로벌 컨트롤 포함 헤더 */}
          <HeaderCard />

          {/* 현재 스토어 장바구니 (storeUrl이 있을 때만 표시) */}
          {storeUrl && (
            <MobileSection
              title="현재 스토어 장바구니"
              list={currentStoreItems}
              onClearSection={clearCurrentStore}
            />
          )}

          {/* 전체 스토어 장바구니 */}
          <MobileSection
            title={storeUrl ? '전체 스토어 장바구니' : '장바구니'}
            list={otherStoreItems}
            onClearSection={clearOtherStores}
          />

          <Summary />
          <div className="pb-6" />
        </div>
      </div>

      {/* 🖥️ 데스크톱 */}
      <div className="hidden lg:block">
        <MypageSidenavbar>
          <div className="mx-auto w-full max-w-[1440px]">
            <div className="rounded-2xl border border-gray-300 bg-white overflow-hidden">
              {/* 헤더 + 글로벌 컨트롤 */}
              <div className="bg-gradient-to-r from-[#2d4739] to-gray-800 px-6 md:px-8 py-5 md:py-6">
                <h2 className="text-xl md:text-2xl text-white mb-1.5 md:mb-2">장바구니</h2>
                <p className="text-gray-200 text-xs md:text-sm">
                  현재 선택한 상품으로 주문 예상 금액을 확인하고 결제하세요.
                </p>
              </div>
              <div className="px-6 py-4 flex items-center justify-between gap-3 border-b bg-white">
                <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    className={`h-4 w-4 ${!allChecked && someChecked ? 'accent-gray-400' : ''}`}
                    checked={allChecked}
                    ref={(el) => {
                      if (el) el.indeterminate = !allChecked && someChecked;
                    }}
                    onChange={(e) => toggleAll(e.target.checked)}
                  />
                  전체선택
                </label>

                <button
                  type="button"
                  onClick={clearCart}
                  disabled={items.length === 0}
                  className={[
                    'inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm active:scale-95 transition',
                    items.length === 0 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50',
                  ].join(' ')}
                >
                  <Trash2 className="w-4 h-4" />
                  장바구니 전체 비우기
                </button>
              </div>

              {/* 본문 */}
              <div className="p-6 space-y-6">
                {/* 현재 스토어 장바구니 (storeUrl이 있을 때만 표시) */}
                {storeUrl && (
                  <TableSection
                    title="현재 스토어 장바구니"
                    list={currentStoreItems}
                    onClearSection={clearCurrentStore}
                  />
                )}

                {/* 전체 스토어 장바구니 */}
                <TableSection
                  title={storeUrl ? '전체 스토어 장바구니' : '장바구니'}
                  list={otherStoreItems}
                  onClearSection={clearOtherStores}
                />

                <Summary />
              </div>
            </div>
          </div>
        </MypageSidenavbar>
      </div>
    </div>
  );
}
