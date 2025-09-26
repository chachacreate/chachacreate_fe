// src/domains/main/areas/home/features/sell/pages/MainSellSellregister.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import Header from '@src/shared/areas/layout/features/header/Header';
import Mainnavbar from '@src/shared/areas/navigation/features/navbar/main/Mainnavbar';
import SellSubnavbar from '@src/shared/areas/navigation/features/subnavbar/sell/SellSubnavbar';
import {
  Save,
  Pencil,
  Trash2,
  Image as ImageIcon,
  Loader2,
  Link as LinkIcon,
  AlertCircle,
} from 'lucide-react';
import { legacyGet, legacyPost, legacyPut } from '@src/libs/request';

/** ---------------- Enums ↔ Labels 매핑 ----------------
 *  서버로 보낼 값(키)은 enum 상수명이어야 함.
 *  UI엔 한글 라벨을 보여주고, 전송 시엔 키를 보냄.
 */

// TypeCategory (상세 공예 유형)
const TYPE_LABEL_BY_KEY = {
  KNITTING: '뜨개질공예',
  METAL: '금속공예',
  WOOD: '목공예',
  CERAMIC: '도자기공예',
  GLASS: '유리공예',
  LEATHER: '가죽공예',
  RESIN: '레진공예',
  PLANT: '식물공예',
  SEWING: '양재공예',
  TYPE_ETC: '기타',
} as const;
const TYPE_KEY_BY_LABEL = Object.fromEntries(
  Object.entries(TYPE_LABEL_BY_KEY).map(([k, v]) => [v, k])
) as Record<string, keyof typeof TYPE_LABEL_BY_KEY>;

// UCategory (대분류)
const U_LABEL_BY_KEY = {
  FASHION: '패션잡화',
  INTERIOR: '인테리어 소품',
  ACCESSORY: '악세서리',
  LIFESTYLE: '케이스/문구',
  ETC: '기타',
} as const;
const U_KEY_BY_LABEL = Object.fromEntries(
  Object.entries(U_LABEL_BY_KEY).map(([k, v]) => [v, k])
) as Record<string, keyof typeof U_LABEL_BY_KEY>;

// DCategory (소분류)
const D_LABEL_BY_KEY = {
  TOP: '티셔츠/니트/셔츠',
  HANBOK: '생활한복',
  BAG: '가방/파우치',
  SHOES: '여성신발/수제화',
  FASHION_ETC: '패션잡화 기타',

  FABRIC: '패브릭',
  FLOWER_PLANT: '꽃/식물',
  LIGHT: '조명',
  INTERIOR_ETC: '인테리어 소품 기타',

  RING: '반지',
  BRACELET: '팔찌',
  EARRING: '귀걸이',
  ACCESSORY_ETC: '악세서리 기타',

  CASE: '폰케이스',
  NOTE_PEN: '노트/필기도구',
  DOLL_TOY: '인형/장난감',
  CAR: '주차번호/차량스티커',
  LIFESTYLE_ETC: '케이스/문구 기타',

  ETC_ETC: '기타',
} as const;
const D_KEY_BY_LABEL = Object.fromEntries(
  Object.entries(D_LABEL_BY_KEY).map(([k, v]) => [v, k])
) as Record<string, keyof typeof D_LABEL_BY_KEY>;

// U→D 키 매핑 (소분류 선택 제한)
const D_BY_U: Record<keyof typeof U_LABEL_BY_KEY, Array<keyof typeof D_LABEL_BY_KEY>> = {
  FASHION: ['TOP', 'HANBOK', 'BAG', 'SHOES', 'FASHION_ETC'],
  INTERIOR: ['FABRIC', 'FLOWER_PLANT', 'LIGHT', 'INTERIOR_ETC'],
  ACCESSORY: ['RING', 'BRACELET', 'EARRING', 'ACCESSORY_ETC'],
  LIFESTYLE: ['CASE', 'NOTE_PEN', 'DOLL_TOY', 'CAR', 'LIFESTYLE_ETC'],
  ETC: ['ETC_ETC'],
};

/** ---------------- Types ---------------- */
type ApiResponse<T> = {
  status: number;
  message: string;
  data: T;
};

type Product = {
  /** 슬롯 ID ("1" | "2") — UI 내부 식별자 */
  id: string;

  /** 서버 product_id (수정/삭제에 필요) */
  productId?: number;

  images: string[]; // 프리뷰 URL (dataURL or full URL)
  files?: (File | null)[]; // 업로드 원본 파일 (이미지 교체 시)
  name: string;
  price: number | '';
  description: string;
  /** enum 키(FASHION 등) 저장 */
  categoryParent: keyof typeof U_LABEL_BY_KEY | '';
  /** enum 키(TOP 등) 저장 */
  categoryChild: keyof typeof D_LABEL_BY_KEY | '';
  /** enum 키(KNITTING 등) 저장 */
  typeCategory: keyof typeof TYPE_LABEL_BY_KEY | '';
  stock: number | '';
  lastModified?: string; // ISO
  deleteFlags?: boolean[];
};

const MAX_PRODUCTS = 2;
const MAX_IMAGES = 3;

/** 빈 슬롯 */
const emptyProduct = (id: string): Product => ({
  id,
  productId: undefined,
  images: [],
  files: [null, null, null],
  name: '',
  price: '',
  description: '',
  categoryParent: '',
  categoryChild: '',
  typeCategory: '',
  stock: '',
  lastModified: undefined,
  deleteFlags: [false, false, false], // 초기값
});
const formatDate = (iso?: string) => (iso ? new Date(iso).toLocaleString() : '-');

/** ---------------- Component ---------------- */
const MainSellSellregister: React.FC = () => {
  const [items, setItems] = useState<Product[]>([emptyProduct('1'), emptyProduct('2')]);
  const [loading, setLoading] = useState(false);

  /** 최초: 내 상품 불러오기 */
  useEffect(() => {
    (async () => {
      try {
        const res = await legacyGet<ApiResponse<any[]>>('/main/sell/products');
        // data: PersonalProductDTO[]
        const list = (res?.data ?? []).slice(0, MAX_PRODUCTS);
        const slots: Product[] = [emptyProduct('1'), emptyProduct('2')];

        list.forEach((p, idx) => {
          if (idx > 1) return;
          // 서버는 한글 라벨로 내려올 수 있으므로 키로 역변환
          const uKey = U_KEY_BY_LABEL[p.ucategoryId] ?? (p.ucategoryId as any);
          const dKey = D_KEY_BY_LABEL[p.dcategoryId] ?? (p.dcategoryId as any);
          const tKey = TYPE_KEY_BY_LABEL[p.typeCategoryId] ?? (p.typeCategoryId as any);

          slots[idx] = {
            id: String(idx + 1),
            productId: p.productId,
            images: [p.pimgUrl1, p.pimgUrl2, p.pimgUrl3].filter(Boolean),
            files: [null, null, null],
            name: p.productName ?? '',
            price: p.price ?? '',
            description: p.productDetail ?? '',
            categoryParent: uKey || '',
            categoryChild: dKey || '',
            typeCategory: tKey || '',
            stock: p.stock ?? '',
            lastModified: undefined,
          };
        });

        setItems(slots);
      } catch (e) {
        console.error('상품 조회 실패:', e);
      }
    })();
  }, []);

  const onSave = async (data: Product) => {
    // 공통 검증
    if (!data.name?.trim()) return alert('상품명을 입력하세요.');
    if (data.price === '' || Number(data.price) <= 0) return alert('가격을 올바르게 입력하세요.');
    if (!data.categoryParent) return alert('상위 카테고리를 선택하세요.');
    if (!data.categoryChild) return alert('하위 카테고리를 선택하세요.');
    if (!data.typeCategory) return alert('수공예 유형을 선택하세요.');
    if (data.stock === '' || Number(data.stock) < 0) return alert('재고 수량을 입력하세요.');

    setLoading(true);
    try {
      if (!data.productId) {
        // 신규 등록
        const fd = new FormData();
        fd.append('productName', data.name);
        fd.append('productDesc', data.description);
        fd.append('productPrice', String(data.price));
        fd.append('stock', String(data.stock));
        // enum "키"를 그대로 보냄(valueOf로 받기 위함)
        fd.append('typeCategoryId', data.typeCategory);
        fd.append('ucategoryId', data.categoryParent);
        fd.append('dcategoryId', data.categoryChild);
        // 이미지(선택)
        (data.files ?? []).forEach((f, i) => {
          if (f) fd.append(`image${i + 1}`, f);
        });

        const res = await legacyPost<ApiResponse<number>>('/main/sell/sellregister', fd);
        if (res?.status === 201 || res?.status === 200) {
          alert('상품이 등록되었습니다. 목록을 새로고침합니다.');
          // 목록 리프레시
          const ref = await legacyGet<ApiResponse<any[]>>('/main/sell/products');
          const list = (ref?.data ?? []).slice(0, MAX_PRODUCTS);
          const next = [...[emptyProduct('1'), emptyProduct('2')]];
          list.forEach((p, idx) => {
            if (idx > 1) return;
            const uKey = U_KEY_BY_LABEL[p.ucategoryId] ?? (p.ucategoryId as any);
            const dKey = D_KEY_BY_LABEL[p.dcategoryId] ?? (p.dcategoryId as any);
            const tKey = TYPE_KEY_BY_LABEL[p.typeCategoryId] ?? (p.typeCategoryId as any);
            next[idx] = {
              id: String(idx + 1),
              productId: p.productId,
              images: [p.pimgUrl1, p.pimgUrl2, p.pimgUrl3].filter(Boolean),
              files: [null, null, null],
              name: p.productName ?? '',
              price: p.price ?? '',
              description: p.productDetail ?? '',
              categoryParent: uKey || '',
              categoryChild: dKey || '',
              typeCategory: tKey || '',
              stock: p.stock ?? '',
              lastModified: new Date().toISOString(),
            };
          });
          setItems(next);
        } else {
          alert(res?.message ?? '등록 실패');
        }
      } else {
        // 수정
        const fd = new FormData();
        fd.append('productId', String(data.productId));
        fd.append('productName', data.name);
        fd.append('productDesc', data.description);
        fd.append('productPrice', String(data.price));
        fd.append('stock', String(data.stock));
        fd.append('typeCategoryId', data.typeCategory);
        fd.append('ucategoryId', data.categoryParent);
        fd.append('dcategoryId', data.categoryChild);
        // 새로 선택한 이미지가 있을 때만 첨부
        (data.files ?? []).forEach((f, i) => {
          if (f) fd.append(`image${i + 1}`, f);
          fd.append(`deleteImage${i + 1}`, data.deleteFlags?.[i] ? 'true' : 'false');
        });

        const res = await legacyPost<ApiResponse<number>>('/main/sell/sellregister/update', fd);
        if (res?.status === 200) {
          alert('수정되었습니다.');
          // 마지막 수정 표시만 갱신
          setItems((prev) =>
            prev.map((x) =>
              x.id === data.id
                ? {
                    ...x,
                    images: data.images,
                    files: data.files,
                    lastModified: new Date().toISOString(),
                  }
                : x
            )
          );
        } else {
          alert(res?.message ?? '수정 실패');
        }
      }
    } catch (e) {
      console.error('저장 실패:', e);
      alert('요청 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const onDelete = async (slotId: string, productId?: number) => {
    if (!productId) return alert('서버에 등록된 상품이 아닙니다.');
    if (!confirm('정말 삭제하시겠어요? (DB에서 delete_check=1 처리됩니다)')) return;

    try {
      const res = await legacyPut<ApiResponse<number>>('/main/sell/sellregister/delete', {
        productId,
      });
      if (res?.status === 200) {
        alert('삭제 완료');
        setItems((prev) => prev.map((x) => (x.id === slotId ? emptyProduct(slotId) : x)));
      } else if (res?.status === 403) {
        alert(res.message ?? '삭제 권한이 없습니다.');
      } else {
        alert(res?.message ?? '삭제 실패');
      }
    } catch (e) {
      console.error('삭제 실패:', e);
      alert('요청 중 오류가 발생했습니다.');
    }
  };

  const slots: Product[] = useMemo(() => {
    const map: Record<string, Product> = {};
    items.forEach((p) => (map[p.id] = p));
    return [map['1'] ?? emptyProduct('1'), map['2'] ?? emptyProduct('2')];
  }, [items]);

  return (
    <div className="min-h-screen bg-slate-50 relative">
      <Header />
      <Mainnavbar />
      <SellSubnavbar />

      <div className="px-4 sm:px-6 xl:px-[240px]">
        <div className="w-full max-w-[1440px] mx-auto py-6 md:py-10 space-y-6 md:space-y-8">
          <div>
            <h1 className="text-xl md:text-2xl font-extrabold tracking-[-0.01em]">
              개인 판매 · 상품 등록 & 관리 (최대 2개)
            </h1>
            <p className="text-gray-600 mt-1 text-sm">
              사진(1~3), 이름, 가격, 카테고리(상/하), 재고, 설명 — 등록/수정/삭제 가능.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
            {slots.map((slot) => (
              <ProductCard
                key={slot.id}
                data={slot}
                onSave={onSave}
                onDelete={() => onDelete(slot.id, slot.productId)}
                loading={loading}
                setLoading={setLoading}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

/** -------------- Card -------------- */
function ProductCard({
  data,
  onSave,
  onDelete,
  loading,
  setLoading,
}: {
  data: Product;
  onSave: (p: Product) => void | Promise<void>;
  onDelete: () => void;
  loading: boolean;
  setLoading: (v: boolean) => void;
}) {
  const [form, setForm] = useState<Product>(data);
  const [editing, setEditing] = useState<boolean>(!data.name);
  const fileInputRefs = useRef<Array<HTMLInputElement | null>>([null, null, null]);
  const originalRef = useRef<Product>(data); // 원본 보관

  useEffect(() => {
    if (data.productId) {
      setForm(data);
      originalRef.current = data; // 원본 갱신
      setEditing(false);
    }
  }, [data.productId]);

  // 수정 취소 버튼 클릭 시
  const onCancelEdit = () => {
    setForm(originalRef.current);
    setEditing(false);
  };

  const setField = <K extends keyof Product>(k: K, v: Product[K]) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  const addImages = (files: FileList | null, slotIndex: number) => {
    if (!files || !files.length) return;

    const currentFiles = [...(form.files ?? [])];
    const currentImages = [...form.images];

    const file = files[0];
    const reader = new FileReader();
    reader.onload = () => {
      currentFiles[slotIndex] = file;
      currentImages[slotIndex] = String(reader.result);
      setField('files', currentFiles);
      setField('images', currentImages);
    };
    reader.readAsDataURL(file);
  };

  const removeImage = (slotIndex: number) => {
    const currentFiles = [...(form.files ?? [])];
    const currentImages = [...(form.images ?? [])];
    const deleteFlags = [...(form.deleteFlags ?? [false, false, false])];

    currentFiles[slotIndex] = null;
    currentImages[slotIndex] = '';
    deleteFlags[slotIndex] = true; // 삭제 표시

    setField('files', currentFiles);
    setField('images', currentImages);
    setField('deleteFlags', deleteFlags);
  };

  // 항상 3칸 보여주기 위한 슬롯
  const imageSlots: (string | null)[] = [
    form.images[0] ?? null,
    form.images[1] ?? null,
    form.images[2] ?? null,
  ];

  const childrenKeys = form.categoryParent ? D_BY_U[form.categoryParent] : [];

  return (
    <section className="relative rounded-2xl border bg-white p-4 md:p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold">
          {data.name ? `상품 #${data.id} · ${data.name}` : `상품 #${data.id} · 신규 등록`}
          {data.productId ? (
            <span className="ml-2 text-xs text-gray-500">({data.productId})</span>
          ) : null}
        </h2>
        <div className="flex items-center gap-2">
          {data.lastModified && (
            <span className="text-xs text-gray-500">
              마지막 수정: {formatDate(data.lastModified)}
            </span>
          )}
          <button
            onClick={() => (editing ? onCancelEdit() : setEditing(true))}
            className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50"
          >
            <Pencil className="w-4 h-4" />
            {editing ? '수정 취소' : '수정'}
          </button>
          <button
            onClick={onDelete}
            className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
            title="삭제"
          >
            <Trash2 className="w-4 h-4" />
            삭제
          </button>
        </div>
      </div>

      {/* 이미지 업로드 & 프리뷰 (3칸) */}
      <div className="grid grid-cols-3 gap-3">
        {imageSlots.map((src, i) => (
          <div
            key={i}
            className={[
              'relative aspect-square rounded-lg border overflow-hidden group bg-gray-50',
              src ? '' : '',
            ].join(' ')}
          >
            {src ? (
              <>
                <img
                  src={src}
                  alt={`product-${data.id}-${i}`}
                  className="w-full h-full object-cover"
                />
                {editing && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeImage(i);
                    }}
                    className="absolute top-2 right-2 rounded-md bg-black/60 text-white px-2 py-1 text-xs opacity-0 group-hover:opacity-100"
                  >
                    제거
                  </button>
                )}
              </>
            ) : (
              <label className="flex h-full w-full cursor-pointer items-center justify-center">
                <input
                  ref={(el) => {
                    const refArr = fileInputRefs.current;
                    if (refArr) refArr[i] = el;
                  }}
                  type="file"
                  accept="image/*"
                  multiple
                  hidden
                  disabled={!editing}
                  onChange={(e) => addImages(e.currentTarget.files, i)}
                />
                <div className="text-center text-gray-400">
                  <ImageIcon className="w-6 h-6 mx-auto mb-1" />
                  <div className="text-xs">이미지 추가</div>
                </div>
              </label>
            )}
          </div>
        ))}
      </div>

      {/* 폼 */}
      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 이름 */}
        <div>
          <label className="text-sm font-medium">상품명</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setField('name', e.target.value)}
            disabled={!editing}
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
            placeholder="예) 편백나무 트레이 S"
          />
        </div>

        {/* 가격 */}
        <div>
          <label className="text-sm font-medium">가격(원)</label>
          <input
            type="number"
            min={0}
            value={form.price}
            onChange={(e) => setField('price', e.target.value === '' ? '' : Number(e.target.value))}
            disabled={!editing}
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
            placeholder="예) 20000"
          />
        </div>

        {/* 수공예 유형 (TypeCategory) */}
        <div>
          <label className="text-sm font-medium">수공예 유형</label>
          <select
            value={form.typeCategory || ''}
            onChange={(e) =>
              setField('typeCategory', e.target.value as keyof typeof TYPE_LABEL_BY_KEY)
            }
            disabled={!editing}
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
          >
            <option value="">선택</option>
            {Object.entries(TYPE_LABEL_BY_KEY).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>

        {/* 상/하위 카테고리 */}
        <div>
          <label className="text-sm font-medium">상위 카테고리</label>
          <select
            value={form.categoryParent || ''}
            onChange={(e) => {
              const parent = e.target.value as keyof typeof U_LABEL_BY_KEY;
              setForm((prev) => ({ ...prev, categoryParent: parent, categoryChild: '' }));
            }}
            disabled={!editing}
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
          >
            <option value="">선택</option>
            {Object.entries(U_LABEL_BY_KEY).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-sm font-medium">하위 카테고리</label>
          <select
            value={form.categoryChild || ''}
            onChange={(e) =>
              setField('categoryChild', e.target.value as keyof typeof D_LABEL_BY_KEY)
            }
            disabled={!editing || !form.categoryParent}
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
          >
            <option value="">{form.categoryParent ? '선택' : '상위 카테고리를 먼저 선택'}</option>
            {childrenKeys.map((key) => (
              <option key={key} value={key}>
                {D_LABEL_BY_KEY[key]}
              </option>
            ))}
          </select>
        </div>

        {/* 재고 */}
        <div>
          <label className="text-sm font-medium">재고 수량</label>
          <input
            type="number"
            min={0}
            value={form.stock}
            onChange={(e) => setField('stock', e.target.value === '' ? '' : Number(e.target.value))}
            disabled={!editing}
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
            placeholder="예) 10"
          />
        </div>

        {/* 설명 */}
        <div className="md:col-span-2">
          <label className="text-sm font-medium flex items-center gap-2">
            설명 <span className="text-xs text-gray-500">(상세 설명)</span>
          </label>

          <textarea
            value={form.description}
            onChange={(e) => setField('description', e.target.value)}
            disabled={!editing}
            className="mt-2 w-full min-h-[120px] rounded-md border px-3 py-2 text-sm"
            placeholder="상품 제작 스토리, 소재/크기, 옵션, 주의사항, 배송/교환 정보를 적어주세요."
          />
        </div>
      </div>

      {/* 액션 */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs text-gray-500">
          {form.lastModified
            ? `마지막 수정: ${formatDate(form.lastModified)}`
            : '아직 저장되지 않았습니다.'}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onSave(form)}
            disabled={!editing}
            className="inline-flex items-center gap-2 rounded-lg bg-[#2d4739] text-white px-4 py-2 text-sm hover:opacity-95 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {data.productId ? '수정 저장' : '상품 등록'}
          </button>
        </div>
      </div>
    </section>
  );
}

export default MainSellSellregister;
