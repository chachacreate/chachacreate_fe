// src/domains/seller/areas/product/features/list/pages/ProductList.tsx
import type { FC } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';

import Header from '@src/shared/areas/layout/features/header/Header';
import SellerSidenavbar from '@src/shared/areas/navigation/features/sidenavbar/seller/SellerSidenavbar';

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
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null; // '삭제됨' 또는 null
  isRepresentative?: boolean;
};

const KRW = new Intl.NumberFormat('ko-KR');
const LEGACY_BASE = `${window.location.origin}/legacy`;

const PLACEHOLDER_IMG =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='160' height='120'>
      <rect width='100%' height='100%' fill='%23f3f4f6'/>
      <text x='50%' y='52%' dominant-baseline='middle' text-anchor='middle' font-size='14' fill='%239ca3af'>IMAGE</text>
    </svg>`
  );

const MAX_REP = 3;

function fmtDate(v: any): string {
  if (!v) return '';
  try {
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return String(v);
    return d.toISOString().slice(0, 10);
  } catch {
    return String(v);
  }
}

const ProductList: FC = () => {
  const { storeUrl = '' } = useParams<Params>();
  const navigate = useNavigate();

  // 목록
  const [rows, setRows] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(false);

  // 선택 상태
  const [repSelected, setRepSelected] = useState<Record<string, boolean>>({});
  const [delSelected, setDelSelected] = useState<Record<string, boolean>>({});

  // 대표/삭제 카운트
  const repCount = useMemo(() => Object.values(repSelected).filter(Boolean).length, [repSelected]);
  const delCount = useMemo(() => Object.values(delSelected).filter(Boolean).length, [delSelected]);

  // 대표 전체 선택 후보(운영중만)
  const allRepCheckable = useMemo(() => rows.filter((r) => !r.deletedAt).map((r) => r.id), [rows]);
  const allRepChecked = useMemo(
    () => allRepCheckable.length > 0 && allRepCheckable.every((id) => repSelected[id]),
    [allRepCheckable, repSelected]
  );

  // 삭제 전체 선택 후보(전체)
  const allDelCheckable = useMemo(() => rows.map((r) => r.id), [rows]);
  const allDelChecked = useMemo(
    () => allDelCheckable.length > 0 && allDelCheckable.every((id) => delSelected[id]),
    [allDelCheckable, delSelected]
  );

  // DTO → Row 매핑
  const mapDtoToRow = (dto: any): ProductRow => {
    const productId = dto?.productId ?? dto?.id ?? dto?.PRODUCT_ID;

    const imageUrl =
      dto?.pimgUrl ?? dto?.thumbnailUrl ?? dto?.imageUrl ?? dto?.P_IMG_URL ?? undefined;

    const name = dto?.productName ?? dto?.name ?? dto?.PRODUCT_NAME ?? '(이름없음)';

    const price = Number(dto?.price ?? dto?.PRICE ?? 0) || 0;
    const stock = Number(dto?.stock ?? dto?.STOCK ?? 0) || 0;

    const categoryLarge = dto?.typeCategoryName ?? dto?.TYPE_CATEGORY_NAME ?? '-';

    // 중분류: 백엔드 alias `middle_category_name` 우선
    const categoryMiddle =
      dto?.middleCategoryName ??
      dto?.uCategoryName ??
      dto?.MIDDLE_CATEGORY_NAME ??
      dto?.U_CATEGORY_NAME ??
      '-';

    const categorySmall = dto?.dcategoryName ?? dto?.dCategoryName ?? dto?.D_CATEGORY_NAME ?? '-';

    const createdAt = fmtDate(dto?.productDate ?? dto?.createdAt ?? dto?.PRODUCT_DATE);
    const updatedAt = fmtDate(dto?.lastModifiedDate ?? dto?.updatedAt ?? dto?.LAST_MODIFIED_DATE);

    const deletedAt = dto?.deleteDate
      ? fmtDate(dto.deleteDate)
      : dto?.deleteCheck === 1 || dto?.DELETE_CHECK === 1
        ? '삭제됨'
        : null;

    const isRepresentative = (dto?.flagshipCheck ?? dto?.FLAGSHIP_CHECK) === 1;

    return {
      id: String(productId ?? ''),
      imageUrl,
      name,
      price,
      stock,
      categoryLarge,
      categoryMiddle,
      categorySmall,
      createdAt: createdAt || '-',
      updatedAt: updatedAt || '-',
      deletedAt,
      isRepresentative,
    };
  };

  // 상품 목록 로드
  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${LEGACY_BASE}/${storeUrl}/seller/products`, {
        withCredentials: true,
      });
      const list = Array.isArray(res.data?.data) ? res.data.data : [];
      const mapped: ProductRow[] = list.map(mapDtoToRow);

      setRows(mapped);

      // 삭제표시된 상품은 대표 자동 해제
      const nextRep: Record<string, boolean> = {};
      mapped.forEach((r) => {
        if (r.isRepresentative && !r.deletedAt) nextRep[r.id] = true;
      });
      setRepSelected(nextRep);
      setDelSelected({});
    } catch (e: any) {
      console.error(e);
      alert(e?.response?.data?.message || e?.message || '상품 목록을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!storeUrl) return;
    fetchProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeUrl]);

  // ====== 대표 선택/전체선택/저장 ======
  const toggleRep = (id: string) => {
    setRepSelected((prev) => {
      const next = { ...prev };
      const nextVal = !next[id];
      const nextCount = Object.entries(next).reduce(
        (acc, [k, v]) => acc + (k === id ? (nextVal ? 1 : 0) : v ? 1 : 0),
        0
      );
      if (nextVal && nextCount > MAX_REP) {
        alert(`대표상품은 최대 ${MAX_REP}개까지 선택할 수 있습니다.`);
        return prev;
      }
      next[id] = nextVal;
      return next;
    });
  };

  const toggleAllRep = () => {
    if (allRepChecked) {
      setRepSelected({});
      return;
    }
    const candidates = allRepCheckable.slice(0, MAX_REP);
    const next: Record<string, boolean> = {};
    candidates.forEach((id) => (next[id] = true));
    setRepSelected(next);
  };

  const saveRepresentatives = async () => {
    if (repCount === 0 && !confirm('대표상품이 0개입니다. 모두 해제하시겠습니까?')) return;
    try {
      const payload = rows.map((r) => ({
        productId: Number(r.id),
        flagshipCheck: repSelected[r.id] ? 1 : 0,
      }));
      const res = await axios.put(`${LEGACY_BASE}/${storeUrl}/seller/products`, payload, {
        withCredentials: true,
      });
      if (res.status >= 200 && res.status < 300) {
        alert(`대표상품이 저장되었습니다. (선택 ${repCount}개)`);
        await fetchProducts();
      } else {
        throw new Error(res.statusText || '대표상품 저장 실패');
      }
    } catch (e: any) {
      console.error(e);
      alert(e?.response?.data?.message || e?.message || '대표상품 저장 실패');
    }
  };

  // ====== 삭제 선택/전체선택/토글 ======
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

  // 단일 토글: 현재 상태 기준으로 개별 flip (delete_check 0↔1)
  const toggleDeletion = async () => {
    if (Object.values(delSelected).every((v) => !v)) return;
    if (!confirm('선택한 상품의 삭제 상태를 토글하시겠습니까?')) return;

    // 선택된 ID들
    const idsChosen = Object.entries(delSelected)
      .filter(([, v]) => v)
      .map(([id]) => id);

    // 현재 rows에서 상태 조회 → 개별 deleteCheck 계산 (운영중이면 1, 이미 삭제면 0)
    const idToRow = new Map(rows.map((r) => [r.id, r]));
    const payload = idsChosen.map((id) => {
      const row = idToRow.get(id);
      const willBe = row?.deletedAt ? 0 : 1; // flip
      return { productId: Number(id), deleteCheck: willBe };
    });

    // 운영중 → 삭제될 것들은 대표 선택 즉시 해제
    setRepSelected((prev) => {
      const next = { ...prev };
      payload.forEach(({ productId, deleteCheck }) => {
        if (deleteCheck === 1) {
          const key = String(productId);
          if (next[key]) delete next[key];
        }
      });
      return next;
    });

    try {
      const res = await axios.delete(`${LEGACY_BASE}/${storeUrl}/seller/products`, {
        withCredentials: true,
        data: payload, // 각 항목에 deleteCheck 포함
      });

      if (res.status >= 200 && res.status < 300) {
        alert('선택 항목의 삭제 상태를 변경했습니다.');
        await fetchProducts(); // 서버 상태 동기화
      } else {
        throw new Error(res.statusText || '삭제/복구 토글 실패');
      }
    } catch (e: any) {
      console.error(e);
      alert(e?.response?.data?.message || e?.message || '삭제/복구 토글에 실패했습니다.');
    }
  };

  const goInsert = () => navigate(`/seller/${storeUrl}/product/insert`);
  const goEdit = (id: string) =>
    navigate(`/seller/${storeUrl}/product/${encodeURIComponent(id)}/edit`);

  return (
    <>
      <Header />

      <SellerSidenavbar>
        <div className="space-y-4 sm:space-y-6">
          {/* 헤더 */}
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

          {/* 액션바 */}
          <div className="grid gap-3 sm:grid-cols-2">
            {/* 대표상품 */}
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
                  대표 상품 저장
                </button>
              </div>
            </div>

            {/* 삭제/복구 토글 */}
            <div className="bg-white rounded-lg border p-3 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">삭제/복구 선택</div>
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
                  onClick={toggleDeletion}
                  disabled={delCount === 0}
                  className={[
                    'px-3 py-1.5 rounded-md border text-sm font-medium',
                    delCount === 0
                      ? 'opacity-50 cursor-not-allowed bg-gray-100'
                      : 'bg-white hover:bg-gray-50 border-red-200 text-red-600 hover:text-red-700',
                  ].join(' ')}
                >
                  선택 삭제/복구
                </button>
              </div>
            </div>
          </div>

          {/* 테이블 */}
          <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm table-fixed">
                <thead className="bg-gray-50">
                  <tr className="text-left text-gray-600">
                    <th className="px-3 py-3 w-1/12 text-center">대표</th>
                    <th className="px-3 py-3 w-1/12 text-center">선택</th>
                    <th className="px-3 py-3 w-1/12 text-center">대표이미지</th>
                    <th className="px-3 py-3 w-2/12 text-center">상품 이름</th>
                    <th className="px-3 py-3 w-1/12 text-center">가격</th>
                    <th className="px-3 py-3 w-1/12 text-center">재고</th>
                    <th className="px-3 py-3 w-1/12 text-center">대분류</th>
                    <th className="px-3 py-3 w-1/12 text-center">중분류</th>
                    <th className="px-3 py-3 w-1/12 text-center">소분류</th>
                    <th className="px-3 py-3 w-1/12 text-center">날짜</th>
                    <th className="px-3 py-3 w-1/12 text-center">액션</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    const disabled = !!r.deletedAt;
                    return (
                      <tr
                        key={r.id}
                        className={[
                          'border-t border-gray-100',
                          disabled ? 'opacity-60' : 'hover:bg-gray-25',
                        ].join(' ')}
                      >
                        <td className="px-3 py-3 align-top text-center">
                          <input
                            type="checkbox"
                            title="대표상품 선택"
                            disabled={disabled && !repSelected[r.id]}
                            checked={!!repSelected[r.id]}
                            onChange={() => toggleRep(r.id)}
                            className="rounded"
                          />
                        </td>
                        <td className="px-3 py-3 align-top text-center">
                          <input
                            type="checkbox"
                            title="삭제/복구 선택"
                            checked={!!delSelected[r.id]}
                            onChange={() => toggleDel(r.id)}
                            className="rounded"
                          />
                        </td>
                        <td className="px-3 py-3 align-top">
                          <div
                            className={[
                              'h-15 w-20 overflow-hidden rounded-md border',
                              disabled ? 'cursor-not-allowed' : 'hover:ring-1 hover:ring-gray-300',
                            ].join(' ')}
                            title={r.name}
                          >
                            <img
                              src={r.imageUrl || PLACEHOLDER_IMG}
                              alt={r.name}
                              className="h-full w-full object-cover"
                            />
                          </div>
                        </td>
                        <td className="px-3 py-3 align-top">
                          <div className="font-medium text-gray-900 break-words">{r.name}</div>
                          {/* <div className="text-xs text-gray-500 mt-1">{r.id}</div> */}
                        </td>
                        <td className="px-3 py-3 align-top text-right">
                          <div className="font-bold text-[#2D4739]">₩{KRW.format(r.price)}</div>
                        </td>
                        <td className="px-3 py-3 align-top text-right text-center">
                          <span className="font-medium">{r.stock}</span>
                        </td>
                        <td className="px-3 py-3 align-top text-center">{r.categoryLarge}</td>
                        <td className="px-3 py-3 align-top text-center">{r.categoryMiddle}</td>
                        <td className="px-3 py-3 align-top text-center">{r.categorySmall}</td>
                        <td className="px-3 py-3 align-top text-xs text-right">
                          <div>등록: {r.createdAt || '-'}</div>
                          <div>수정: {r.updatedAt || '-'}</div>
                          <div className={r.deletedAt ? 'text-red-600' : 'text-gray-400'}>
                            삭제: {r.deletedAt || '-'}
                          </div>
                        </td>
                        <td className="px-3 py-3 align-top text-right text-center">
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

                  {!loading && rows.length === 0 && (
                    <tr>
                      <td colSpan={11} className="px-4 py-12 text-center">
                        <div className="text-gray-400 text-2xl mb-3">🛍</div>
                        <p className="text-gray-500">등록된 판매 상품이 없습니다.</p>
                      </td>
                    </tr>
                  )}

                  {loading && (
                    <tr>
                      <td colSpan={11} className="px-4 py-12 text-center text-gray-500">
                        불러오는 중...
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
