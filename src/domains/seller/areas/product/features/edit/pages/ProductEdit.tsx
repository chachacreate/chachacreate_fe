// src/domains/seller/areas/product/features/edit/pages/ProductEdit.tsx
import type { FC, ChangeEvent, MouseEvent } from 'react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import Header from '@src/shared/areas/layout/features/header/Header';
import SellerSidenavbar from '@src/shared/areas/navigation/features/sidenavbar/seller/SellerSidenavbar';

import api from '@src/libs/apiService'; // Boot용 + FastAPI
import EditorAPI, {
  type EditorHandle,
} from '@src/domains/seller/areas/class/features/insert/components/EditorAPI';
import axios from 'axios';
import { predictImage } from '../../insert/services/aiService/aiService';

// ---------------- Types ----------------
type Params = { storeUrl: string; productId: string };
type EnumItem = { id: number; name: string };
type DCatsByU = Record<string, EnumItem[]>;

type ProductImage = {
  id: string; // 프론트용 로컬 UUID
  file?: File; // 새로 업로드한 파일
  url: string; // 미리보기/기존 이미지 URL
  serverImageId?: number; // 서버가 내려주는 기존 이미지 식별자(삭제 전송용)
};

type ProductForm = {
  id: string; // 프론트용 폼 ID
  productNumber: number; // UI 표기용(수정은 항상 1)
  name: string;
  price: number | '';
  aiPrice: number | '';
  desc: string;
  aiDesc: string; // AI 프롬프트/메모
  images: ProductImage[]; // 썸네일(최대 3)
  stock: number | '';
  categoryLarge: string; // typeCategoryId
  categoryMiddle: string; // uCategoryId
  categorySmall: string; // dcategoryId
};

const MAX_NUM = 1_000_000_000_000;
const guardInt = (v: string) => {
  if (!v) return '';
  const n = Number(v.replace(/[^\d]/g, ''));
  if (Number.isNaN(n)) return '';
  if (n < 0) return 0;
  if (n >= MAX_NUM) return MAX_NUM - 1;
  return n;
};
const toInt = (v: number | '' | string | undefined) => {
  if (v === '' || v === undefined) return 0;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
};

// HTML에서 <img src="...">만 추출
const extractImageUrlsFromHtml = (html: string): string[] => {
  if (!html) return [];
  const re = /<img[^>]*src=["']([^"']+)["'][^>]*>/gi;
  const set = new Set<string>();
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const url = (m[1] || '').trim();
    if (url && !set.has(url)) {
      set.add(url);
      out.push(url);
    }
  }
  return out;
};

const createEmptyProductForm = (): ProductForm => ({
  id: crypto.randomUUID(),
  productNumber: 1,
  name: '',
  price: '',
  aiPrice: '',
  desc: '',
  aiDesc: '',
  images: [],
  stock: '',
  categoryLarge: '',
  categoryMiddle: '',
  categorySmall: '',
});

// ---------------- Component ----------------
const ProductEdit: FC = () => {
  const navigate = useNavigate();
  const { storeUrl = '', productId = '' } = useParams<Params>();

  // 단일 폼(수정)
  const [form, setForm] = useState<ProductForm>(createEmptyProductForm());

  // 카테고리
  const [typeCats, setTypeCats] = useState<EnumItem[]>([]);
  const [uCats, setUCats] = useState<EnumItem[]>([]);
  const [dCatsByU, setDCatsByU] = useState<DCatsByU>({});

  // 삭제할 "기존 서버 이미지 ID" 목록
  const [deletedServerImageIds, setDeletedServerImageIds] = useState<number[]>([]);

  // AI
  const [isLoadingAiPrice, setIsLoadingAiPrice] = useState(false);
  const [aiPredictionInfo, setAiPredictionInfo] = useState<Record<string, any>>({});

  // 에디터 refs
  const editorRefs = useRef<Record<string, EditorHandle | null>>({});
  // 에디터 로컬 이미지 버킷: form.id 기준
  const pendingDescImagesRef = useRef<Record<string, Map<string, File>>>({});

  // Nginx로 /legacy 프록시(동일 Origin) → CORS 회피
  const LEGACY_BASE = `${window.location.origin}/legacy`;

  // --------- 엔드포인트(필요시 프로젝트에 맞게 교체) ---------
  // 카테고리 조회
  const ENDPOINT_CATEGORIES = `${LEGACY_BASE}/category`;
  // 상품 상세(수정 진입 시 현재 데이터)
  // 예시: GET /:storeUrl/seller/product/{productId}
  const ENDPOINT_DETAIL = `${LEGACY_BASE}/${storeUrl}/seller/product/${productId}`;
  // 상품 수정 저장
  // 예시: POST or PUT /:storeUrl/seller/product/${productId}/update
  const ENDPOINT_UPDATE = `${LEGACY_BASE}/${storeUrl}/seller/product/${productId}/update`;

  // ---------- 초기 로딩: 카테고리 + 상품 상세 ----------
  useEffect(() => {
    (async () => {
      try {
        // 카테고리
        const catRes = await axios.get(ENDPOINT_CATEGORIES, { withCredentials: true });
        const { typeCategories = [], uCategories = [], dCategoriesByU = {} } = catRes.data || {};
        setTypeCats(typeCategories);
        setUCats(uCategories);
        setDCatsByU(dCategoriesByU);
      } catch {
        alert('카테고리 불러오기 실패');
      }

      try {
        // 상품 상세
        const res = await axios.get(ENDPOINT_DETAIL, { withCredentials: true });
        // 서버 응답 스키마에 맞게 매핑 필요
        // 아래는 예시 매핑(필드명 맞춰 수정)
        const p = res.data?.product ?? res.data?.data ?? res.data;
        const images = (p?.images ?? []).slice(0, 3).map((img: any) => ({
          id: crypto.randomUUID(),
          url: img.url, // 서버가 내려준 정적 URL
          serverImageId: img.id, // 서버 이미지 ID
        })) as ProductImage[];

        const next: ProductForm = {
          id: crypto.randomUUID(),
          productNumber: 1,
          name: p?.productName ?? '',
          price: typeof p?.price === 'number' ? p.price : '',
          aiPrice: '', // 초기엔 비워두고, 필요시 AI 버튼으로 채움
          desc: p?.productDetail ?? '',
          aiDesc: '',
          images,
          stock: typeof p?.stock === 'number' ? p.stock : '',
          categoryLarge: String(p?.typeCategoryId ?? ''),
          categoryMiddle: String(p?.uCategoryId ?? ''), // 백엔드가 내려주면 세팅
          categorySmall: String(p?.dcategoryId ?? ''),
        };

        setForm(next);
      } catch (e: any) {
        console.error(e);
        alert(e?.response?.data?.message || '상품 정보를 불러오지 못했습니다.');
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId, storeUrl]);

  // ---------- 폼 업데이트 ----------
  const updateForm = <K extends keyof ProductForm>(key: K, value: ProductForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  // ---------- 이미지 선택/삭제 ----------
  const onPickImages = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !files.length) return;
    const chosen = Array.from(files).slice(0, 3);

    setForm((prev) => {
      const remain = Math.max(0, 3 - (prev.images?.length ?? 0));
      const toAdd = chosen.slice(0, remain).map((file) => ({
        id: crypto.randomUUID(),
        file,
        url: URL.createObjectURL(file),
      }));
      return { ...prev, images: [...(prev.images ?? []), ...toAdd] };
    });

    e.target.value = '';
  };

  const removeImage = (imageId: string) => {
    setForm((prev) => {
      const target = prev.images.find((i) => i.id === imageId);
      if (target?.serverImageId) {
        setDeletedServerImageIds((ids) => [...ids, target.serverImageId!]);
      }
      return { ...prev, images: prev.images.filter((i) => i.id !== imageId) };
    });
  };

  // ---------- AI 가격 ----------
  const genAiPrice = async () => {
    // 첫 이미지 기준
    if (!form.images.length || !(form.images[0].file || form.images[0].url)) {
      alert('AI 가격 추천을 위해 상품 사진을 먼저 업로드하거나 기존 이미지를 확인해 주세요.');
      return;
    }

    // 실제로는 파일 기반이 정확. 기존 이미지 URL만 있는 경우엔 스킵/폴백
    const imgFile = form.images.find((i) => i.file)?.file;
    setIsLoadingAiPrice(true);
    try {
      if (imgFile) {
        const result = await predictImage(imgFile);
        if (result.success && result.predictions.length > 0) {
          const top = result.predictions[0];
          setAiPredictionInfo({ [form.id]: result });
          if (top.price_info?.median_price) {
            updateForm('aiPrice', Math.round(top.price_info.median_price));
          } else {
            const base = (form.name.length || 6) * 1200;
            const randomized = Math.round((base + Math.random() * 8000) / 100) * 100;
            updateForm('aiPrice', randomized as number);
            alert('가격 통계가 없어 기본 알고리즘으로 추천했습니다.');
          }
        } else {
          throw new Error('이미지 예측 실패');
        }
      } else {
        // 파일이 없고 URL만 있을 때 폴백
        const base = (form.name.length || 6) * 1200;
        const randomized = Math.round((base + Math.random() * 8000) / 100) * 100;
        updateForm('aiPrice', randomized as number);
        alert('로컬 이미지 파일이 없어 기본 알고리즘으로 추천했습니다.');
      }
    } catch (e: any) {
      console.error(e);
      const base = (form.name.length || 6) * 1200;
      const randomized = Math.round((base + Math.random() * 8000) / 100) * 100;
      updateForm('aiPrice', randomized as number);
      alert('AI 분석 실패로 기본 알고리즘을 사용했습니다.');
    } finally {
      setIsLoadingAiPrice(false);
    }
  };

  const generatePredictionTooltip = (): string => {
    const predictionInfo = aiPredictionInfo[form.id];
    if (!predictionInfo) return '';
    let tip = `🎯 예측: ${predictionInfo.top_category} (신뢰도 ${(predictionInfo.top_confidence * 100).toFixed(1)}%)\n`;
    predictionInfo.predictions.forEach((pred: any, idx: number) => {
      if (pred.price_info) {
        tip += `📊 '${pred.price_info.db_category}' 가격 통계\n`;
        tip += `  평균: ${pred.price_info.average_price.toLocaleString()}원\n`;
        tip += `  범위: ${pred.price_info.min_price.toLocaleString()} ~ ${pred.price_info.max_price.toLocaleString()}원\n`;
        tip += `  중앙값: ${pred.price_info.median_price.toLocaleString()}원\n`;
        tip += `  표본: ${pred.price_info.product_count}개`;
      } else {
        tip += `📭 '${pred.category}' 가격 정보 없음`;
      }
      if (idx < predictionInfo.predictions.length - 1) tip += '\n';
    });
    return tip;
  };

  // ---------- 카테고리 ----------
  const onChangeLarge = (largeId: string) => {
    updateForm('categoryLarge', largeId);
    updateForm('categoryMiddle', '');
    updateForm('categorySmall', '');
  };
  const onChangeMiddle = (uId: string) => {
    updateForm('categoryMiddle', uId);
    updateForm('categorySmall', '');
  };

  // ---------- 에디터 로컬 이미지 수집 ----------
  const onLocalImageAdded = (url: string, file: File) => {
    const bucket = (pendingDescImagesRef.current[form.id] ||= new Map<string, File>());
    bucket.set(url, file);
  };

  // ---------- 에디터 본문 준비(blob src → cid 치환) ----------
  function prepareDescForSubmit(rawHtml: string) {
    const bucket = pendingDescImagesRef.current[form.id] ?? new Map<string, File>();
    const srcs = extractImageUrlsFromHtml(rawHtml);
    let html = rawHtml;
    const descFiles: Array<{ idx: number; file: File }> = [];
    let seq = 1;

    for (const src of srcs) {
      const f = bucket.get(src);
      if (!f) continue; // 외부 URL은 그대로
      const cid = `cid:desc-${seq}`;
      html = html.split(src).join(cid);
      descFiles.push({ idx: seq, file: f });
      if (src.startsWith('blob:')) URL.revokeObjectURL(src);
      bucket.delete(src);
      seq++;
    }
    return { htmlWithCids: html, descFiles };
  }

  // ---------- multipart/form-data 구성 ----------
  function buildFormDataForUpdate() {
    const fd = new FormData();

    const rawHtml = editorRefs.current[form.id]?.getHTML?.() || form.desc || '';
    const { htmlWithCids, descFiles } = prepareDescForSubmit(rawHtml);

    // 설명 본문 이미지(로컬 추가분)
    descFiles.forEach(({ idx, file }) => {
      fd.append(`product0_desc${idx}`, file);
    });

    // 썸네일(신규 업로드분만 파일로 첨부)
    form.images.forEach((img, iIdx) => {
      if (img.file) fd.append(`product0_image${iIdx + 1}`, img.file);
    });

    // DTO 본문 (수정용)
    const dtoPayload = [
      {
        product: {
          productId: Number(productId), // 서버가 필요하면 사용
          productName: form.name.trim(),
          price: toInt(typeof form.price === 'number' ? form.price : form.aiPrice),
          productDetail: htmlWithCids, // cid 포함
          typeCategoryId: toInt(form.categoryLarge),
          dcategoryId: toInt(form.categorySmall),
          stock: toInt(form.stock),
        },
        descriptionImageUrls: [], // 서버에서 cid → URL 치환 후 재추출
        // 이미지는 위 파일 파트로 전송
        deletedServerImageIds, // 서버에 기존 이미지 삭제 지시
      },
    ];

    fd.append('dtoList', new Blob([JSON.stringify(dtoPayload)], { type: 'application/json' }));
    return fd;
  }

  // ---------- 저장 ----------
  const onSubmit = async (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();

    // 검증
    if (!form.name.trim()) return alert('상품 이름을 입력해 주세요.');
    if (!form.price && !form.aiPrice) return alert('가격을 입력하거나 AI 추천가를 사용해 주세요.');
    if (!form.categoryLarge || !form.categoryMiddle || !form.categorySmall)
      return alert('대/중/소 카테고리를 모두 선택해 주세요.');
    if (form.stock === '' || Number(form.stock) < 0)
      return alert('재고 수량을 0 이상으로 입력해 주세요.');
    // 수정은 이미지 필수 요건을 완화(기존이 있을 수 있음)
    const hasAnyImage = form.images.length > 0;
    if (!hasAnyImage) {
      if (!confirm('등록된 상품 이미지가 없습니다. 이대로 저장할까요?')) return;
    }

    try {
      const fd = buildFormDataForUpdate();

      // 백엔드에 맞게 POST/PUT 선택
      const res = await axios.post(ENDPOINT_UPDATE, fd, { withCredentials: true });
      if (res.status >= 200 && res.status < 300) {
        alert('상품 수정이 완료되었습니다.');
        navigate(`/seller/${storeUrl}/product/list`);
        return;
      }
      throw new Error(res.statusText || '상품 수정 실패');
    } catch (err: any) {
      console.error(err);
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        '상품 수정 실패';
      alert(msg);
    }
  };

  // ---------- 초기화(폼만 리셋) ----------
  const onReset = () => {
    // 상세를 다시 불러오고 싶으면 location.reload 또는 상세 GET 재호출 로직 구현
    setForm(createEmptyProductForm());
    setDeletedServerImageIds([]);
    pendingDescImagesRef.current[form.id]?.clear();
  };

  return (
    <>
      <Header />

      <SellerSidenavbar>
        <div className="space-y-6 sm:space-y-8 pb-10">
          {/* 상단 타이틀 (추가 페이지와 동일 스타일 유지, 단 버튼 삭제) */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold">판매 상품 수정</h1>
              <p className="mt-1 text-sm text-gray-500">상품 ID: {productId}</p>
            </div>
            {/* ⛔️ 수정 페이지이므로 "상품 추가" 버튼 제거 */}
          </div>

          {/* 폼 섹션 (단일) */}
          <section className="rounded-2xl border bg-white p-4 sm:p-6 lg:p-8">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-lg font-bold">상품 1</h2>
                <p className="text-sm text-gray-500">storeUrl: {storeUrl}</p>
              </div>
              {/* ⛔️ 수정 페이지: 섹션 삭제 버튼 없음 */}
            </div>

            <div className="grid gap-5">
              {/* 썸네일 1~3장 */}
              <div className="grid gap-2">
                <span className="text-sm font-medium">상품 사진 (최대 3장)</span>
                <div className="flex flex-wrap items-center gap-2">
                  <label className="px-3 py-2 rounded-md border text-sm cursor-pointer hover:bg-gray-50">
                    + 사진 선택
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={onPickImages}
                      className="hidden"
                    />
                  </label>
                  <span className="text-xs text-gray-500">현재 {form.images.length}/3</span>
                </div>
                {form.images.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {form.images.map((img) => (
                      <div key={img.id} className="relative rounded-lg overflow-hidden border">
                        <img src={img.url} alt="preview" className="w-full h-40 object-cover" />
                        <button
                          type="button"
                          onClick={() => removeImage(img.id)}
                          className="absolute top-2 right-2 rounded-md bg-black/60 text-white text-xs px-2 py-1"
                        >
                          삭제
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 상품 이름 */}
              <label className="grid gap-1">
                <span className="text-sm font-medium">상품 이름</span>
                <input
                  className="border rounded-md px-3 py-2"
                  placeholder="예) 핸드메이드 머그컵"
                  value={form.name}
                  onChange={(e) => updateForm('name', e.target.value)}
                />
              </label>

              {/* 가격 + AI */}
              <div className="grid gap-2">
                <span className="text-sm font-medium">가격</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    inputMode="numeric"
                    className="border rounded-md px-3 py-2"
                    placeholder="직접 입력 (원)"
                    value={form.price}
                    onChange={(e) => updateForm('price', guardInt(e.target.value) as number | '')}
                  />
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="px-3 py-2 rounded-md border hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400 flex items-center gap-1"
                      onClick={genAiPrice}
                      disabled={isLoadingAiPrice}
                    >
                      {isLoadingAiPrice && (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-500"></div>
                      )}
                      {isLoadingAiPrice ? 'AI 분석 중...' : 'AI 가격 추천'}
                    </button>
                    <div className="relative flex-1">
                      <input
                        readOnly
                        className="border rounded-md px-3 py-2 w-full bg-gray-50 cursor-help"
                        placeholder="AI 추천가"
                        value={form.aiPrice ? `${Number(form.aiPrice).toLocaleString()} 원` : ''}
                        title={
                          form.aiPrice && aiPredictionInfo[form.id]
                            ? generatePredictionTooltip()
                            : ''
                        }
                      />
                    </div>
                  </div>
                </div>
                <p className="text-xs text-gray-500">
                  * AI 가격 추천은 상품 사진을 분석하여 시장 가격을 제안합니다.
                </p>
              </div>

              {/* 상세설명 (Editor) + AI 프롬프트/버튼 */}
              <fieldset className="grid gap-2">
                <legend className="text-sm font-medium">상품 상세설명</legend>
                <EditorAPI
                  ref={(el) => {
                    editorRefs.current[form.id] = el ?? null;
                  }}
                  initialValue={form.desc}
                  onLocalImageAdded={(url, file) => onLocalImageAdded(url, file)}
                />

                <div className="grid gap-2 mt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">AI 상품 설명 프롬프트/메모</span>
                    <button
                      type="button"
                      className="px-3 py-1.5 rounded-md border text-sm hover:bg-gray-50"
                      onClick={async () => {
                        if (!form.name.trim()) return alert('상품 이름을 먼저 입력해 주세요.');
                        try {
                          const payload = {
                            name: form.name,
                            prompt: form.aiDesc,
                            price:
                              typeof form.price === 'number'
                                ? form.price
                                : typeof form.aiPrice === 'number'
                                  ? form.aiPrice
                                  : 0,
                            categoryLarge: form.categoryLarge || '',
                            categoryMiddle: form.categoryMiddle || '',
                            categorySmall: form.categorySmall || '',
                          };
                          const resp = await api.post('/ai/product-description', payload);
                          const content: string =
                            resp?.data?.content ?? resp?.data?.data ?? resp?.data?.markdown ?? '';
                          if (!content) throw new Error('AI 응답이 비었습니다.');
                          editorRefs.current[form.id]?.setMarkdown(content);
                          const html = editorRefs.current[form.id]?.getHTML() || '';
                          updateForm('desc', html);
                        } catch (e: any) {
                          alert(e?.response?.data?.error || e?.message || 'AI 설명 생성 실패');
                        }
                      }}
                    >
                      AI 설명 생성
                    </button>
                  </div>
                  <textarea
                    className="border rounded-md px-3 py-2 min-h-[100px]"
                    placeholder="핵심 특징, 소재/사이즈, 사용 상황 등 키워드를 남겨 주세요."
                    value={form.aiDesc}
                    onChange={(e) => updateForm('aiDesc', e.target.value)}
                  />
                  <p className="text-xs text-gray-500">
                    * 생성 후 내용은 위 에디터에 자동 반영됩니다.
                  </p>
                </div>
              </fieldset>

              {/* 카테고리 */}
              <div className="grid gap-2">
                <span className="text-sm font-medium">상품 카테고리</span>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <select
                    className="border rounded-md px-3 py-2"
                    value={form.categoryLarge}
                    onChange={(e) => onChangeLarge(e.target.value)}
                  >
                    <option value="">수공예 기법(대분류) 선택</option>
                    {typeCats.map((t) => (
                      <option key={`type-${t.id}`} value={String(t.id)}>
                        {t.name}
                      </option>
                    ))}
                  </select>

                  <select
                    className="border rounded-md px-3 py-2"
                    value={form.categoryMiddle}
                    onChange={(e) => onChangeMiddle(e.target.value)}
                    disabled={!form.categoryLarge}
                  >
                    <option value="">
                      {form.categoryLarge ? '중분류 선택' : '대분류 먼저 선택'}
                    </option>
                    {uCats.map((u) => (
                      <option key={`u-${u.id}`} value={String(u.id)}>
                        {u.name}
                      </option>
                    ))}
                  </select>

                  <select
                    className="border rounded-md px-3 py-2"
                    value={form.categorySmall}
                    onChange={(e) => updateForm('categorySmall', e.target.value)}
                    disabled={!form.categoryMiddle}
                  >
                    <option value="">
                      {form.categoryMiddle ? '소분류 선택' : '중분류 먼저 선택'}
                    </option>
                    {(dCatsByU[form.categoryMiddle] ?? []).map((d) => (
                      <option key={`d-${d.id}`} value={String(d.id)}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 재고 */}
              <label className="grid gap-1">
                <span className="text-sm font-medium">재고 수량</span>
                <input
                  inputMode="numeric"
                  className="border rounded-md px-3 py-2 w-full sm:w-60"
                  placeholder="예) 20"
                  value={form.stock}
                  onChange={(e) => updateForm('stock', guardInt(e.target.value) as number | '')}
                />
              </label>
            </div>
          </section>

          {/* ✅ 하단 버튼: 페이지 맨 아래에 위치(둥둥 떠다니지 않음) */}
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <button
              type="button"
              className="w-full sm:w-auto px-6 py-3 rounded-lg bg-[#2D4739] text-white font-medium hover:opacity-90"
              onClick={onSubmit}
            >
              상품 수정 저장
            </button>
            <button
              type="button"
              className="w-full sm:w-auto px-6 py-3 rounded-lg border font-medium hover:bg-gray-50"
              onClick={onReset}
            >
              초기화
            </button>
          </div>
        </div>
      </SellerSidenavbar>
    </>
  );
};

export default ProductEdit;
