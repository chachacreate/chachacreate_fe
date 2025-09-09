// src/domains/main/areas/home/features/sell/pages/MainSellSellregister.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import Header from "@src/shared/areas/layout/features/header/Header";
import Mainnavbar from "@src/shared/areas/navigation/features/navbar/main/Mainnavbar";
import SellSubnavbar from "@src/shared/areas/navigation/features/subnavbar/sell/SellSubnavbar";
import {
  Save, Pencil, Trash2, Image as ImageIcon, Loader2, Link as LinkIcon, AlertCircle, CheckCircle2,
} from "lucide-react";

type Product = {
  id: string;                // "1" | "2"
  images: string[];          // max 3 (dataURL or URL)
  name: string;
  price: number | "";
  description: string;
  categoryParent: string;
  categoryChild: string;
  stock: number | "";
  lastModified?: string;     // ISO
};

const MAX_PRODUCTS = 2;
const MAX_IMAGES = 3;
const STORAGE_KEY = "personal_sell_products_v1";

const CATEGORIES: Record<string, string[]> = {
  "수공예·핸드메이드": ["목공", "도자기", "가죽", "천·자수", "플라워", "기타"],
  "푸드·베이킹": ["쿠키", "케이크", "잼·청", "건강식", "기타"],
  "아트·그림": ["일러스트", "회화", "판화", "캘리그래피", "기타"],
  "잡화·리빙": ["방향·캔들", "키친", "데코", "문구", "기타"],
};

const emptyProduct = (id: string): Product => ({
  id,
  images: [],
  name: "",
  price: "",
  description: "",
  categoryParent: "",
  categoryChild: "",
  stock: "",
  lastModified: undefined,
});

const formatDate = (iso?: string) => (iso ? new Date(iso).toLocaleString() : "-");

const loadProducts = (): Product[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Product[];
    return Array.isArray(parsed) ? parsed.slice(0, MAX_PRODUCTS) : [];
  } catch {
    return [];
  }
};

const saveProducts = (list: Product[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(0, MAX_PRODUCTS)));
};

const upsert = (list: Product[], p: Product) => {
  const i = list.findIndex((x) => x.id === p.id);
  const copy = [...list];
  if (i >= 0) copy[i] = p;
  else copy.push(p);
  return copy;
};

const MainSellSellregister: React.FC = () => {
  const [items, setItems] = useState<Product[]>(() => loadProducts());
  const [loading, setLoading] = useState(false);

  const slots: Product[] = useMemo(() => {
    const map: Record<string, Product> = {};
    items.forEach((p) => (map[p.id] = p));
    return [map["1"] ?? emptyProduct("1"), map["2"] ?? emptyProduct("2")];
  }, [items]);

  const onSave = (data: Product) => {
    const next: Product = { ...data, lastModified: new Date().toISOString() };
    const merged = upsert(items, next);
    setItems(merged);
    saveProducts(merged);
  };

  const onDelete = (id: string) => {
    // NOTE: 추후 서버(DB)에서 "모든 배송 완료" 검증 후 삭제 허용
    if (!confirm("정말 삭제하시겠어요? (거래 기록은 테이블에서 유지될 수 있어요)")) return;
    const left = items.filter((x) => x.id !== id);
    setItems(left);
    saveProducts(left);
  };

  const goToDetail = (id: string) => {
    // TODO: 실제 상세 경로로 변경
    window.location.href = `/main/product/${id}`;
  };

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
              사진(1~3), 이름, 가격, 카테고리(상/하), 재고, 설명(네이버 블로그 글쓰기 API 연동 예정).
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
            {slots.map((slot) => (
              <ProductCard
                key={slot.id}
                data={slot}
                onSave={onSave}
                onDelete={() => onDelete(slot.id)}
                onImageClick={() => (slot.name ? goToDetail(slot.id) : null)}
                loading={loading}
                setLoading={setLoading}
              />
            ))}
          </div>

          <div className="rounded-xl border bg-white p-4 md:p-6 text-sm text-gray-600">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 text-amber-600" />
              <div className="space-y-1">
                <p>· 삭제는 추후 서버(DB)에서 배송 상태 검증 후 허용됩니다.</p>
                <p>· 삭제하더라도 거래/정산 기록 테이블은 유지될 수 있습니다.</p>
                <p>· 이미지 클릭 시 상품 상세 페이지로 이동합니다.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

function ProductCard({
  data,
  onSave,
  onDelete,
  onImageClick,
  loading,
  setLoading,
}: {
  data: Product;
  onSave: (p: Product) => void;
  onDelete: () => void;
  onImageClick: () => void;
  loading: boolean;
  setLoading: (v: boolean) => void;
}) {
  const [form, setForm] = useState<Product>(data);
  const [editing, setEditing] = useState<boolean>(!data.name);
  const fileInputRefs = useRef<Array<HTMLInputElement | null>>([null, null, null]);
  const children = form.categoryParent ? CATEGORIES[form.categoryParent] ?? [] : [];

  useEffect(() => {
  setForm(data);           // 폼 값 전체 리셋
  setEditing(!data.name);  // 이름이 없으면 신규 등록 폼처럼 편집 모드
}, [data]); // id만 아니

  const setField = <K extends keyof Product>(k: K, v: Product[K]) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  const addImages = async (files: FileList | null) => {
    if (!files || !files.length) return;
    const current = form.images ?? [];
    const remain = Math.max(0, MAX_IMAGES - current.length);
    if (remain <= 0) return;

    const picks = Array.from(files).slice(0, remain);
    const readers = await Promise.all(
      picks.map(
        (f) =>
          new Promise<string>((res, rej) => {
            const r = new FileReader();
            r.onload = () => res(String(r.result));
            r.onerror = rej;
            r.readAsDataURL(f);
          })
      )
    );
    setField("images", [...current, ...readers].slice(0, MAX_IMAGES));
  };

  const removeImage = (i: number) =>
    setField(
      "images",
      (form.images ?? []).filter((_, idx) => idx !== i)
    );

  const handleSave = () => {
    if ((form.images?.length ?? 0) < 1) return alert("이미지를 1장 이상 등록하세요.");
    if (!form.name?.trim()) return alert("상품명을 입력하세요.");
    if (form.price === "" || Number(form.price) <= 0) return alert("가격을 올바르게 입력하세요.");
    if (!form.categoryParent) return alert("상위 카테고리를 선택하세요.");
    if (!form.categoryChild) return alert("하위 카테고리를 선택하세요.");
    if (form.stock === "" || Number(form.stock) < 0) return alert("재고 수량을 입력하세요.");

    onSave(form);
    setEditing(false);
  };

  const fetchBlogDescriptionDemo = async () => {
    // 네이버 블로그 글쓰기 폼 API 연동 예정: 데모 버튼
    const url = prompt("네이버 블로그 글 URL을 입력하세요 (데모):");
    if (!url) return;
    setLoading(true);
    try {
      await new Promise((r) => setTimeout(r, 700));
      const demo =
        "네이버 블로그 API 데모 텍스트입니다. 실제 연동 시 글 본문/요약을 불러와 설명에 채웁니다. " +
        "제작 스토리, 소재/크기, 옵션, 주의사항, 배송/교환 정보를 적어주세요.";
      setField("description", demo);
    } finally {
      setLoading(false);
    }
  };

  // 항상 3칸 슬롯 구성: 기존 이미지 + 빈 칸
  const imageSlots: (string | null)[] = [
    form.images[0] ?? null,
    form.images[1] ?? null,
    form.images[2] ?? null,
  ];

  return (
    
    <section className="relative rounded-2xl border bg-white p-4 md:p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold">
          {data.name ? `상품 #${data.id} · ${data.name}` : `상품 #${data.id} · 신규 등록`}
        </h2>
        <div className="flex items-center gap-2">
          {data.lastModified && (
            <span className="text-xs text-gray-500">
              마지막 수정: {formatDate(data.lastModified)}
            </span>
          )}
          <button
            onClick={() => setEditing((v) => !v)}
            className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50"
          >
            <Pencil className="w-4 h-4" />
            {editing ? "수정 취소" : "수정"}
          </button>
          <button
            onClick={onDelete}
            className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
            title="추후 DB에서 배송 완료 검증 후 삭제 허용"
          >
            <Trash2 className="w-4 h-4" />
            삭제
          </button>
        </div>
      </div>

      {/* 이미지 업로드 & 프리뷰 (항상 3칸) */}
      <div className="grid grid-cols-3 gap-3">
        {imageSlots.map((src, i) => (
          <div
            key={i}
            className={[
              "relative aspect-square rounded-lg border overflow-hidden group bg-gray-50",
              src ? (editing ? "" : "cursor-pointer") : "",
            ].join(" ")}
            onClick={() => {
              if (src && !editing) onImageClick();
            }}
          >
            {src ? (
              <>
                <img src={src} alt={`product-${data.id}-${i}`} className="w-full h-full object-cover" />
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
                ref={(el) => { fileInputRefs.current[i] = el; }} // <- 중괄호 사용, 반환값 없음
                type="file"
                accept="image/*"
                multiple
                hidden
                disabled={!editing}
                onChange={(e) => addImages(e.currentTarget.files)}
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
            onChange={(e) => setField("name", e.target.value)}
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
            onChange={(e) => setField("price", e.target.value === "" ? "" : Number(e.target.value))}
            disabled={!editing}
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
            placeholder="예) 20000"
          />
        </div>

        {/* 카테고리 상/하 */}
        <div>
          <label className="text-sm font-medium">상위 카테고리</label>
          <select
            value={form.categoryParent}
            onChange={(e) => {
              const parent = e.target.value;
              setForm((prev) => ({ ...prev, categoryParent: parent, categoryChild: "" }));
            }}
            disabled={!editing}
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
          >
            <option value="">선택</option>
            {Object.keys(CATEGORIES).map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-sm font-medium">하위 카테고리</label>
          <select
            value={form.categoryChild}
            onChange={(e) => setField("categoryChild", e.target.value)}
            disabled={!editing || !form.categoryParent}
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
          >
            <option value="">{form.categoryParent ? "선택" : "상위 카테고리를 먼저 선택"}</option>
            {(form.categoryParent ? CATEGORIES[form.categoryParent] ?? [] : []).map((c) => (
              <option key={c} value={c}>{c}</option>
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
            onChange={(e) => setField("stock", e.target.value === "" ? "" : Number(e.target.value))}
            disabled={!editing}
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
            placeholder="예) 10"
          />
        </div>

        {/* 설명(네이버 블로그 API 섹션) — 재고 밑으로 이동 */}
        <div className="md:col-span-2">
          <label className="text-sm font-medium flex items-center gap-2">
            설명 <span className="text-xs text-gray-500">(네이버 블로그 글쓰기 API 연동 예정)</span>
          </label>
          <div className="mt-1 flex items-center gap-2">
            <button
              onClick={fetchBlogDescriptionDemo}
              disabled={!editing || loading}
              className="inline-flex items-center gap-1 rounded-md border px-3 py-2 text-sm hover:bg-gray-50"
              title="블로그 글의 본문/요약을 설명에 채우는 데모"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LinkIcon className="w-4 h-4" />}
              불러오기(데모)
            </button>
          </div>
          <textarea
            value={form.description}
            onChange={(e) => setField("description", e.target.value)}
            disabled={!editing}
            className="mt-2 w-full min-h-[120px] rounded-md border px-3 py-2 text-sm"
            placeholder="상품 제작 스토리, 소재/크기, 옵션, 주의사항, 배송/교환 정보를 적어주세요."
          />
        </div>
      </div>

      {/* 액션 */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs text-gray-500">
          {form.lastModified ? `마지막 수정: ${formatDate(form.lastModified)}` : "아직 저장되지 않았습니다."}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSave}
            disabled={!editing}
            className="inline-flex items-center gap-2 rounded-lg bg-[#2d4739] text-white px-4 py-2 text-sm hover:opacity-95 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {data.name ? "수정 저장" : "상품 등록"}
          </button>
        </div>
      </div>
    </section>
    
  );
}


export default MainSellSellregister;
