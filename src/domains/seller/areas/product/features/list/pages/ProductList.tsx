import type { FC } from "react";
import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Header from "@src/shared/areas/layout/features/header/Header";
import Mainnavbar from "@src/shared/areas/navigation/features/navbar/main/Mainnavbar";
import SellerSidenavbar from "@src/shared/areas/navigation/features/sidenavbar/seller/SellerSidenavbar";

type Params = { storeUrl: string };

type ProductRow = {
  id: string;
  imageUrl?: string;
  name: string;
  price: number;
  stock: number;
  categoryLarge: string;
  categoryMiddle: string;
  categorySmall: string;
  createdAt: string;         // YYYY-MM-DD
  updatedAt: string;         // YYYY-MM-DD
  deletedAt: string | null;  // YYYY-MM-DD | null
  isRepresentative?: boolean;
};

const KRW = new Intl.NumberFormat("ko-KR");

const PLACEHOLDER_IMG =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='160' height='120'>
      <rect width='100%' height='100%' fill='%23f3f4f6'/>
      <text x='50%' y='52%' dominant-baseline='middle' text-anchor='middle' font-size='14' fill='%239ca3af'>IMAGE</text>
    </svg>`
  );

// 임시 데이터
const mockRows: ProductRow[] = [
  {
    id: "p1",
    imageUrl: "",
    name: "핸드메이드 머그컵",
    price: 15000,
    stock: 42,
    categoryLarge: "주방",
    categoryMiddle: "컵/머그",
    categorySmall: "머그컵",
    createdAt: "2025-08-20",
    updatedAt: "2025-08-28",
    deletedAt: null,
    isRepresentative: true,
  },
  {
    id: "p2",
    imageUrl: "",
    name: "라탄 테이블 트레이",
    price: 32000,
    stock: 8,
    categoryLarge: "리빙",
    categoryMiddle: "가구소품",
    categorySmall: "트레이",
    createdAt: "2025-08-21",
    updatedAt: "2025-08-26",
    deletedAt: null,
  },
  {
    id: "p3",
    imageUrl: "",
    name: "미니 토분 세트",
    price: 12000,
    stock: 0,
    categoryLarge: "원예",
    categoryMiddle: "화분",
    categorySmall: "토분",
    createdAt: "2025-08-22",
    updatedAt: "2025-08-29",
    deletedAt: "2025-08-30",
  },
  {
    id: "p4",
    imageUrl: "",
    name: "카드 지갑",
    price: 29000,
    stock: 17,
    categoryLarge: "패션",
    categoryMiddle: "지갑",
    categorySmall: "카드지갑",
    createdAt: "2025-08-24",
    updatedAt: "2025-08-30",
    deletedAt: null,
  },
];

const MAX_REP = 3;

const ProductList: FC = () => {
  const { storeUrl = "" } = useParams<Params>();
  const navigate = useNavigate();

  const [rows, setRows] = useState<ProductRow[]>(mockRows);

  // 대표상품/삭제 선택 상태
  const [repSelected, setRepSelected] = useState<Record<string, boolean>>(
    () =>
      rows.reduce((acc, r) => {
        if (r.isRepresentative) acc[r.id] = true;
        return acc;
      }, {} as Record<string, boolean>)
  );
  const [delSelected, setDelSelected] = useState<Record<string, boolean>>({});

  const repCount = useMemo(() => Object.values(repSelected).filter(Boolean).length, [repSelected]);
  const delCount = useMemo(() => Object.values(delSelected).filter(Boolean).length, [delSelected]);

  // 대표 전체선택 (운영중만)
  const allRepCheckable = useMemo(
    () => rows.filter((r) => !r.deletedAt).map((r) => r.id),
    [rows]
  );
  const allRepChecked = useMemo(
    () => allRepCheckable.length > 0 && allRepCheckable.every((id) => repSelected[id]),
    [allRepCheckable, repSelected]
  );

  // 삭제 전체선택 (운영/삭제 모두 선택 허용)
  const allDelCheckable = useMemo(() => rows.map((r) => r.id), [rows]);
  const allDelChecked = useMemo(
    () => allDelCheckable.length > 0 && allDelCheckable.every((id) => delSelected[id]),
    [allDelCheckable, delSelected]
  );

  // 대표 선택 토글 (최대 3개)
  const toggleRep = (id: string) => {
    setRepSelected((prev) => {
      const next = { ...prev };
      const nextVal = !next[id];

      const nextCount = Object.entries(next).reduce((acc, [k, v]) => acc + (k === id ? (nextVal ? 1 : 0) : v ? 1 : 0), 0);
      if (nextVal && nextCount > MAX_REP) {
        alert(`대표상품은 최대 ${MAX_REP}개까지 선택할 수 있습니다.`);
        return prev;
      }
      next[id] = nextVal;
      return next;
    });
  };

  // 대표 전체 토글 (최대 3 제한 고려)
  const toggleAllRep = () => {
    if (allRepChecked) {
      setRepSelected({});
      return;
    }
    const candidates = allRepCheckable.slice(0, MAX_REP); // 최대 3까지만 켜기
    const next: Record<string, boolean> = {};
    candidates.forEach((id) => (next[id] = true));
    setRepSelected(next);
  };

  // 삭제 선택 토글
  const toggleDel = (id: string) => setDelSelected((p) => ({ ...p, [id]: !p[id] }));
  const toggleAllDel = () => {
    if (allDelChecked) {
      setDelSelected({});
      return;
    }
    const next: Record<string, boolean> = {};
    allDelCheckable.forEach((id) => (next[id] = true));
    setDelSelected(next);
  };

  // 대표상품 저장(수정)
  const saveRepresentatives = () => {
    if (repCount === 0) {
      if (!confirm("대표상품이 0개입니다. 모두 해제하시겠습니까?")) return;
    }
    const next = rows.map((r) => ({ ...r, isRepresentative: !!repSelected[r.id] }));
    setRows(next);
    alert(`대표상품이 저장되었습니다. (선택 ${repCount}개)`);
  };

  // 선택 삭제 (deletedAt 세팅)
  const bulkDelete = () => {
    if (delCount === 0) return;
    if (!confirm(`선택한 ${delCount}개 상품을 삭제 표시 하시겠습니까?`)) return;
    const today = new Date().toISOString().slice(0, 10);
    setRows((prev) =>
      prev.map((r) => (delSelected[r.id] ? { ...r, deletedAt: today } : r))
    );
    setDelSelected({});
  };

  const goInsert = () => navigate(`/seller/${storeUrl}/product/insert`);
  const goEdit = (id: string) => navigate(`/seller/${storeUrl}/product/insert?edit=${encodeURIComponent(id)}`);

  return (
    <>
      <Header />
      <Mainnavbar />

      <SellerSidenavbar>
        <div className="space-y-4 sm:space-y-6">
          {/* 헤더/요약 */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold">판매 상품 관리</h1>
              <p className="text-sm text-gray-500 mt-1">storeUrl: {storeUrl}</p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={goInsert}
                className="px-4 py-2 rounded-lg bg-[#2D4739] text-white font-medium hover:opacity-90"
              >
                + 상품 등록
              </button>
            </div>
          </div>

          {/* 상단 액션바 */}
          <div className="grid gap-3 sm:grid-cols-2">
            {/* 대표상품 선택 컨트롤 */}
            <div className="bg-white rounded-lg border p-3 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="text-sm">
                  <span className="font-medium">대표상품 선택</span>
                  <span className="ml-2 text-gray-500">(최대 {MAX_REP}개)</span>
                </div>
                <div className="text-sm text-gray-600">
                  선택 {repCount} / {MAX_REP}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <label className="inline-flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={allRepChecked}
                    onChange={toggleAllRep}
                    className="rounded"
                  />
                  전체 선택(운영중)
                </label>
                <button
                  type="button"
                  onClick={saveRepresentatives}
                  className="px-3 py-1.5 rounded-md border text-sm bg-white hover:bg-gray-50"
                >
                  대표 상품 수정
                </button>
              </div>
            </div>

            {/* 삭제 선택 컨트롤 */}
            <div className="bg-white rounded-lg border p-3 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">삭제 선택</div>
                <div className="text-sm text-gray-600">선택 {delCount}</div>
              </div>
              <div className="flex items-center justify-between">
                <label className="inline-flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={allDelChecked}
                    onChange={toggleAllDel}
                    className="rounded"
                  />
                  전체 선택
                </label>
                <button
                  type="button"
                  onClick={bulkDelete}
                  disabled={delCount === 0}
                  className={[
                    "px-3 py-1.5 rounded-md border text-sm font-medium",
                    delCount === 0
                      ? "opacity-50 cursor-not-allowed bg-gray-100"
                      : "bg-white hover:bg-gray-50 border-red-200 text-red-600 hover:text-red-700",
                  ].join(" ")}
                >
                  선택 삭제
                </button>
              </div>
            </div>
          </div>

          {/* 테이블 */}
<div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
  <div className="overflow-x-auto">
    <table className="w-full text-sm">
      <thead className="bg-gray-50">
        <tr className="text-left text-gray-600">
          <th className="px-3 py-3 w-12">대표</th>
          <th className="px-3 py-3 w-12">삭제</th>
          <th className="px-3 py-3 w-25">대표이미지</th>
          <th className="px-3 py-3 min-w-[180px]">상품 이름</th>
          <th className="px-3 py-3 w-24 text-right">가격</th>
          <th className="px-3 py-3 w-24 text-right">재고</th>
          <th className="px-3 py-3 w-24">대분류</th>
          <th className="px-3 py-3 w-28">중분류</th>
          <th className="px-3 py-3 w-28">소분류</th>
          {/* ✅ 날짜 컬럼 하나로 통합 */}
          <th className="px-3 py-3 w-36">날짜</th>
          <th className="px-3 py-3 w-20 text-right">액션</th>
        </tr>
      </thead>

      <tbody>
        {rows.map((r) => {
          const disabled = !!r.deletedAt;
          return (
            <tr
              key={r.id}
              className={[
                "border-t border-gray-100",
                disabled ? "opacity-60" : "hover:bg-gray-25",
              ].join(" ")}
            >
              {/* 대표 선택 */}
              <td className="px-3 py-3 align-top">
                <input
                  type="checkbox"
                  title="대표상품 선택"
                  disabled={disabled && !repSelected[r.id]}
                  checked={!!repSelected[r.id]}
                  onChange={() => toggleRep(r.id)}
                  className="rounded"
                />
              </td>

              {/* 삭제 선택 */}
              <td className="px-3 py-3 align-top">
                <input
                  type="checkbox"
                  title="삭제 선택"
                  checked={!!delSelected[r.id]}
                  onChange={() => toggleDel(r.id)}
                  className="rounded"
                />
              </td>

              {/* 대표이미지 */}
              <td className="px-3 py-3 align-top">
                <div
                  className={[
                    "h-15 w-20 overflow-hidden rounded-md border",
                    disabled ? "cursor-not-allowed" : "hover:ring-1 hover:ring-gray-300",
                  ].join(" ")}
                  title={r.name}
                >
                  <img
                    src={r.imageUrl || PLACEHOLDER_IMG}
                    alt={r.name}
                    className="h-full w-full object-cover"
                  />
                </div>
              </td>

              {/* 상품 이름 */}
              <td className="px-3 py-3 align-top">
                <div className="font-medium text-gray-900 truncate">{r.name}</div>
                <div className="text-xs text-gray-500 mt-1">{r.id}</div>
              </td>

              {/* 가격 */}
              <td className="px-3 py-3 align-top text-right">
                <div className="font-bold text-[#2D4739]">₩{KRW.format(r.price)}</div>
              </td>

              {/* 재고 */}
              <td className="px-3 py-3 align-top text-right">
                <span className="font-medium">{r.stock}</span>
              </td>

              {/* 카테고리 */}
              <td className="px-3 py-3 align-top">{r.categoryLarge}</td>
              <td className="px-3 py-3 align-top">{r.categoryMiddle}</td>
              <td className="px-3 py-3 align-top">{r.categorySmall}</td>

              {/* ✅ 날짜(등록/수정/삭제) 통합 */}
              <td className="px-3 py-3 align-top text-xs">
                <div>등록: {r.createdAt || "-"}</div>
                <div>수정: {r.updatedAt || "-"}</div>
                <div className={r.deletedAt ? "text-red-600" : "text-gray-400"}>
                  삭제: {r.deletedAt || "-"}
                </div>
              </td>

              {/* 액션 */}
              <td className="px-3 py-3 align-top text-right">
                <button
                  type="button"
                  onClick={() => goEdit(r.id)}
                  disabled={disabled}
                  className="inline-flex items-center px-2 py-1 rounded-md border text-xs font-medium hover:bg-gray-50 disabled:opacity-50"
                >
                  수정
                </button>
              </td>
            </tr>
          );
        })}

        {rows.length === 0 && (
          <tr>
            {/* ✅ 통합된 컬럼 수에 맞춰 colSpan 수정: 11 */}
            <td colSpan={11} className="px-4 py-12 text-center">
              <div className="text-gray-400 text-2xl mb-3">🛍</div>
              <p className="text-gray-500">등록된 판매 상품이 없습니다.</p>
            </td>
          </tr>
        )}
      </tbody>
    </table>
  </div>
</div>


        </div>
      </SellerSidenavbar>
    </>
  );
};

export default ProductList;
