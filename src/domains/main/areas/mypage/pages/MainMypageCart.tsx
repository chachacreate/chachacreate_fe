// src/domains/main/areas/mypage/pages/MainMypageCart.tsx
import React, { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import {
  ChevronLeft,
  Minus,
  Plus,
  Trash2,
  ShoppingCart,
  Store,
} from "lucide-react";

import Header from "@src/shared/areas/layout/features/header/Header";
import Mainnavbar from "@src/shared/areas/navigation/features/navbar/main/Mainnavbar";
import MypageSidenavbar from "@src/shared/areas/navigation/features/sidenavbar/mypage/MypageSidenavbar";

/** 브랜드 컬러 */
const BRAND = "#2d4739";

/** 이미지 없을 때 placeholder */
const PLACEHOLDER =
  "data:image/svg+xml;utf8," +
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
  id: number;
  storeUrl?: string | null;
  storeName: string;
  productId: number;
  image?: string | null;
  name: string;
  desc?: string;
  price: number; // 단가
  qty: number;
};

type Params = { storeUrl?: string };

/** KRW 포맷 */
const toKRW = (v: number) =>
  new Intl.NumberFormat("ko-KR", {
    style: "currency",
    currency: "KRW",
    maximumFractionDigits: 0,
  }).format(v);

/** ✅ 목데이터 (실서버 붙일 때 교체) */
const MOCK: CartItem[] = [
  {
    id: 1,
    storeUrl: "casa-coffee",
    storeName: "카사 커피",
    productId: 101,
    image: null,
    name: "핸드드립 케냐 AA 200g",
    desc: "상큼한 산미와 깔끔한 바디감",
    price: 14000,
    qty: 1,
  },
  {
    id: 2,
    storeUrl: "casa-coffee",
    storeName: "카사 커피",
    productId: 102,
    image: null,
    name: "콜드브루 보틀 500ml",
    desc: "진하게 내린 원액 콜드브루",
    price: 12000,
    qty: 2,
  },
  {
    id: 3,
    storeUrl: "handmade-lab",
    storeName: "핸드메이드랩",
    productId: 201,
    image: null,
    name: "천연 비누 세트",
    desc: "라벤더/시트러스 2종",
    price: 18000,
    qty: 1,
  },
];

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

  const [items, setItems] = useState<CartItem[]>(MOCK);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(() => new Set());

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
  const allChecked =
    allItems.length > 0 && allItems.every((it) => selectedIds.has(it.id));
  const someChecked =
    allItems.length > 0 && allItems.some((it) => selectedIds.has(it.id));

  /** 전체 선택/해제 */
  const toggleAll = (checked: boolean) => {
    setSelectedIds(() => {
      if (!checked) return new Set();
      return new Set(allItems.map((it) => it.id));
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
      list.forEach((it) => {
        if (checked) next.add(it.id);
        else next.delete(it.id);
      });
      return next;
    });
  };

  /** 수량 변경 */
  const changeQty = (id: number, qty: number) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, qty } : it)));
  };

  /** 품목 제거 */
  const removeItem = (id: number) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  /** 장바구니 비우기 (전체) */
  const clearCart = () => {
    if (!confirm("장바구니의 모든 상품을 삭제할까요?")) return;
    setItems([]);
    setSelectedIds(new Set());
  };

const clearCurrentStore = () => {
  const selectedCurrentItems = currentStoreItems.filter((it) => selectedIds.has(it.id));
  if (selectedCurrentItems.length === 0) {
    alert("삭제할 상품을 선택해주세요.");
    return;
  }
  if (!confirm(`현재 스토어 장바구니에서 선택된 ${selectedCurrentItems.length}개 상품을 삭제할까요?`)) return;
  
  const selectedCurrentIds = new Set(selectedCurrentItems.map((it) => it.id));
  setItems((prev) => prev.filter((it) => !selectedCurrentIds.has(it.id)));
  setSelectedIds((prev) => {
    const next = new Set(prev);
    selectedCurrentIds.forEach((id) => next.delete(id));
    return next;
  });
};

/** 전체 스토어 장바구니에서 선택된 상품 삭제 */
const clearOtherStores = () => {
  const selectedOtherItems = otherStoreItems.filter((it) => selectedIds.has(it.id));
  if (selectedOtherItems.length === 0) {
    alert("삭제할 상품을 선택해주세요.");
    return;
  }
  if (!confirm(`전체 스토어 장바구니에서 선택된 ${selectedOtherItems.length}개 상품을 삭제할까요?`)) return;
  
  const selectedOtherIds = new Set(selectedOtherItems.map((it) => it.id));
  setItems((prev) => prev.filter((it) => !selectedOtherIds.has(it.id)));
  setSelectedIds((prev) => {
    const next = new Set(prev);
    selectedOtherIds.forEach((id) => next.delete(id));
    return next;
  });
};

  /** 합계 계산 (선택된 항목 대상) */
  const calcSummary = useMemo(() => {
    const selected = items.filter((x) => selectedIds.has(x.id));
    const count = selected.length;

    const subtotal = selected.reduce((sum, it) => sum + it.price * it.qty, 0);

    // 스토어별 중복 제거 후 배송비 합산
    const storesInSelection = Array.from(
      new Set(selected.map((x) => x.storeUrl || x.storeName))
    );
    const shipping = storesInSelection.length * SHIPPING_FEE_PER_STORE;

    const total = subtotal + (count > 0 ? shipping : 0);

    return {
      count,
      lines: selected.map((it) => ({
        id: it.id,
        name: it.name,
        lineTotal: it.price * it.qty,
      })),
      subtotal,
      shipping: count > 0 ? shipping : 0,
      total,
    };
  }, [items, selectedIds]);

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
            "inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm active:scale-95 transition",
            items.length === 0
              ? "opacity-50 cursor-not-allowed"
              : "hover:bg-gray-50",
          ].join(" ")}
        >
          <Trash2 className="w-4 h-4" />
          장바구니 비우기
        </button>
      </div>
    </div>
  );

  /** 데스크톱 표 행 */
  const TableRow = ({ it }: { it: CartItem }) => (
    <tr className="border-b last:border-0">
      <td className="py-3 px-3 align-middle">
        <input
          type="checkbox"
          className="h-4 w-4"
          checked={selectedIds.has(it.id)}
          onChange={() => toggleSelect(it.id)}
        />
      </td>
      <td className="py-3 px-3 align-middle text-sm text-gray-700 whitespace-nowrap">
        <div className="inline-flex items-center gap-1.5">
          <Store className="w-4 h-4 text-gray-500" />
          {it.storeName}
        </div>
      </td>
      <td className="py-3 px-3 align-middle">
        <a
          href={`/main/products/${it.productId}`}
          className="block w-16 h-16 rounded-lg overflow-hidden bg-gray-100"
        >
          <img
            src={it.image || PLACEHOLDER}
            alt={it.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </a>
      </td>
      <td className="py-3 px-3 align-middle">
        <a
          href={`/main/products/${it.productId}`}
          className="text-gray-900 font-medium hover:underline line-clamp-2"
        >
          {it.name}
        </a>
        {it.desc && (
          <p className="text-sm text-gray-500 line-clamp-1 mt-0.5">{it.desc}</p>
        )}
      </td>
      <td className="py-3 px-3 align-middle text-gray-900 font-semibold whitespace-nowrap">
        {toKRW(it.price)}
      </td>
      <td className="py-3 px-3 align-middle">
        <QtyStepper value={it.qty} onChange={(v) => changeQty(it.id, v)} />
      </td>
      <td className="py-3 px-3 align-middle">
        <button
          type="button"
          onClick={() => removeItem(it.id)}
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
    const sectionAllChecked =
      list.length > 0 && list.every((it) => selectedIds.has(it.id));
    const sectionSomeChecked = list.some((it) => selectedIds.has(it.id));

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
                  "inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm active:scale-95 transition",
                  list.length === 0
                    ? "opacity-50 cursor-not-allowed"
                    : "hover:bg-gray-50",
                ].join(" ")}
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
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="py-3 px-3 w-[44px]">선택</th>
                  <th className="py-3 px-3">스토어</th>
                  <th className="py-3 px-3">상품이미지</th>
                  <th className="py-3 px-3">상품명/설명</th>
                  <th className="py-3 px-3">가격</th>
                  <th className="py-3 px-3">개수</th>
                  <th className="py-3 px-3">관리</th>
                </tr>
              </thead>
              <tbody>
                {list.map((it) => (
                  <TableRow key={it.id} it={it} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    );
  };

  /** 모바일 카드 */
  const MobileCard = ({ it }: { it: CartItem }) => (
    <li className="rounded-2xl border border-gray-200 bg-white p-4">
      <div className="flex items-start justify-between">
        <label className="inline-flex items-center gap-2">
          <input
            type="checkbox"
            className="h-4 w-4"
            checked={selectedIds.has(it.id)}
            onChange={() => toggleSelect(it.id)}
          />
          <span className="text-sm text-gray-700 inline-flex items-center gap-1.5">
            <Store className="w-4 h-4 text-gray-500" />
            {it.storeName}
          </span>
        </label>
        <button
          type="button"
          onClick={() => removeItem(it.id)}
          className="inline-flex items-center gap-1 text-xs rounded-md border px-2 py-1 hover:bg-gray-50"
        >
          <Trash2 className="w-4 h-4" />
          삭제
        </button>
      </div>

      <div className="mt-3 flex gap-3">
        <a
          href={`/main/products/${it.productId}`}
          className="w-24 h-24 rounded-lg overflow-hidden bg-gray-100 shrink-0"
        >
          <img
            src={it.image || PLACEHOLDER}
            alt={it.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </a>
        <div className="min-w-0 flex-1">
          <a
            href={`/main/products/${it.productId}`}
            className="text-base font-semibold text-gray-900 hover:underline line-clamp-2"
          >
            {it.name}
          </a>
          {it.desc && (
            <p className="text-sm text-gray-500 line-clamp-2 mt-0.5">{it.desc}</p>
          )}

          <div className="mt-2 flex items-center justify-between">
            <div className="text-gray-900 font-semibold">{toKRW(it.price)}</div>
            <QtyStepper value={it.qty} onChange={(v) => changeQty(it.id, v)} />
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
    const sectionAllChecked =
      list.length > 0 && list.every((it) => selectedIds.has(it.id));
    const sectionSomeChecked = list.some((it) => selectedIds.has(it.id));

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
                  "inline-flex items-center gap-1 text-xs rounded-md border px-2 py-1 transition",
                  list.length === 0
                    ? "opacity-50 cursor-not-allowed"
                    : "hover:bg-gray-50",
                ].join(" ")}
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
            list.map((it) => <MobileCard key={it.id} it={it} />)
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
        <p className="text-sm text-gray-500 mt-0.5">
          선택된 {calcSummary.count}개 상품 기준
        </p>
      </header>
      <div className="p-6 space-y-4">
        <ul className="space-y-2">
          {calcSummary.lines.map((ln) => (
            <li key={ln.id} className="flex items-center justify-between text-sm">
              <span className="text-gray-700 line-clamp-1">{ln.name}</span>
              <span className="text-gray-900 font-medium">
                {toKRW(ln.lineTotal)}
              </span>
            </li>
          ))}
        </ul>

        <div className="h-px bg-gray-200" />

        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">상품 합계</span>
          <span className="text-gray-900 font-semibold">
            {toKRW(calcSummary.subtotal)}
          </span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">배송비</span>
          <span className="text-gray-900 font-semibold">
            {toKRW(calcSummary.shipping)}
          </span>
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
            "w-full h-11 rounded-xl text-white font-semibold active:scale-95 transition",
            calcSummary.count === 0 ? "opacity-50 cursor-not-allowed" : "hover:opacity-95",
          ].join(" ")}
          style={{ backgroundColor: BRAND }}
          onClick={() => alert("결제 플로우로 이동")}
        >
          결제하기
        </button>
      </div>
    </section>
  );

  return (
    <div
      className="min-h-screen font-jua pb-12"
      style={{ background: "linear-gradient(135deg,#f8fafc 0%,#f1f5f9 100%)" }}
    >
      <Header />
      <Mainnavbar />

      {/* 📱 모바일: 독립 페이지 느낌 (뒤로가기 포함) */}
      <div className="lg:hidden">
        <div className="sticky top-0 z-50 bg-white border-b border-gray-200">
          <div className="px-4 py-3 flex items-center gap-3">
            <button
              type="button"
              onClick={() =>
                history.length > 1 ? history.back() : (window.location.href = "/main/mypage")
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
            title={storeUrl ? "전체 스토어 장바구니" : "장바구니"}
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
                    "inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm active:scale-95 transition",
                    items.length === 0
                      ? "opacity-50 cursor-not-allowed"
                      : "hover:bg-gray-50",
                  ].join(" ")}
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
                  title={storeUrl ? "전체 스토어 장바구니" : "장바구니"}
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