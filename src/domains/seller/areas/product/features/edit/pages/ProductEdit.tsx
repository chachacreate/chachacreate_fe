// src/domains/seller/areas/product/features/edit/pages/ProductEdit.tsx
import type { FC, MouseEvent } from 'react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import Header from '@src/shared/areas/layout/features/header/Header';
import SellerSidenavbar from '@src/shared/areas/navigation/features/sidenavbar/seller/SellerSidenavbar';

import api from '@src/libs/apiService'; // Boot용 + FastAPI
import EditorAPI, {
  type EditorHandle,
} from '@src/domains/seller/areas/class/features/insert/components/EditorAPI';

import { predictImage } from '../../insert/services/aiService/aiService';
import { legacyGet, legacyPost } from '@src/libs/request';

// ---------------- Types ----------------
type Params = { storeUrl: string; productId: string };
type EnumItem = { id: number; name: string };
type DCatsByU = Record<string, EnumItem[]>;

type ProductImage = {
  id: string; // 프론트용 로컬 UUID
  file?: File; // 새로 업로드한 파일
  url: string; // 미리보기/기존 이미지 URL
  serverImageId?: number; // 서버가 내려주는 기존 이미지 식별자(PImgId)
  markedForDelete?: boolean; // 삭제 선택 표시용
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
  const [isLoadingAiDesc, setIsLoadingAiDesc] = useState(false); // ✅ AI 설명 로딩 상태 추가
  const [aiPredictionInfo, setAiPredictionInfo] = useState<Record<string, any>>({});

  // 수정: 단일 상품만 수정 → 에디터도 1개만 필요
  const editorRef = useRef<EditorHandle | null>(null);

  // 단일 상품용 로컬 이미지 버킷
  const pendingDescImagesRef = useRef<Map<string, File>>(new Map());

  // 현재 활성(삭제 표시 안 된) 이미지
  const activeImages = form.images.filter((img) => !img.markedForDelete);

  // ---------- 초기 로딩: 카테고리 + 상품 상세 ----------
  useEffect(() => {
    (async () => {
      try {
        // 카테고리
        const catRes = await legacyGet<any>('/category', { withCredentials: true });
        // console.log('카테고리 응답:', catRes);
        const { typeCategories = [], uCategories = [], dCategoriesByU = {} } = catRes || {};
        // console.log('카테고리:', typeCategories, uCategories, dCategoriesByU);

        setTypeCats(typeCategories);
        setUCats(uCategories);
        setDCatsByU(dCategoriesByU);

        // 하단 inferredUId에서 dCategoriesByU를 사용하기 위해 카테고리와 상품을 하나의 시도에서 모두 처리

        // 상품 상세
        const response = await legacyGet<any>(`/${storeUrl}/seller/products/${productId}`, {
          withCredentials: true,
        });

        const product = response.data?.product ?? response.data?.data ?? response.data;
        // console.log('상품 상세 응답:', product);

        // 기존 이미지 3장 배열로 변환
        const images: ProductImage[] = (product.images ?? []).map((img: any) => ({
          id: crypto.randomUUID(),
          url: img.url,
          serverImageId: img.id,
          markedForDelete: false,
        }));

        // dCategoryId를 통해 uCategory 추론
        const inferredUId =
          Object.entries(dCategoriesByU).find(([uId, dCats]) =>
            (dCats as EnumItem[]).some((d: any) => String(d.id) === String(product?.dcategoryId))
          )?.[0] ?? '';

        const next: ProductForm = {
          id: crypto.randomUUID(),
          productNumber: 1,
          name: product?.productName ?? '',
          price: typeof product?.price === 'number' ? product.price : '',
          aiPrice: '', // 초기엔 비워두고, 필요시 AI 버튼으로 채움
          desc: product?.productDetail ?? '',
          aiDesc: '',
          images,
          stock: typeof product?.stock === 'number' ? product.stock : '',
          categoryLarge: String(product?.typeCategoryId ?? ''),
          categoryMiddle: inferredUId,
          categorySmall: String(product?.dcategoryId ?? ''),
        };

        // console.log('폼 초기값: ', next);

        setForm(next);
      } catch (error: any) {
        console.error('API 호출 실패: ', error);
        alert(error?.response?.data?.message || '상품 정보를 불러오지 못했습니다.');
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId, storeUrl]);

  useEffect(() => {
    // console.log('typeCats 상태 업데이트됨:', typeCats);
  }, [typeCats]);

  // ---------- 에디터 초기값 세팅 ---------- // 기존 설명 폼 반영
  useEffect(() => {
    const editor = editorRef.current;
    if (editor && form.desc) {
      editor.setMarkdown(form.desc); // 기존 HTML/마크다운을 에디터에 넣음
    }
  }, [form.id, form.desc]);

  // ---------- 폼 업데이트 ----------
  const updateForm = <K extends keyof ProductForm>(key: K, value: ProductForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  // 수정용 이미지 선택 핸들러
  const onEditPickImages = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !files.length) return;

    // 기존 서버 이미지 + 새로 추가하는 파일 합쳐서 3개까지 허용
    const chosen = Array.from(files);
    setForm((prev) => {
      const currentCount = prev.images?.filter((img) => !img.markedForDelete).length ?? 0;
      const remain = Math.max(0, 3 - currentCount);

      const toAdd = chosen.slice(0, remain).map((file) => ({
        id: crypto.randomUUID(),
        file,
        url: URL.createObjectURL(file),
      }));

      // return { ...prev, images: [...toAdd, ...(prev.images ?? [])] };
      return { ...prev, images: [...(prev.images ?? []), ...toAdd] };
    });

    e.target.value = '';
  };

  const removeImage = (imgId: string) => {
    setForm((prev) => {
      return {
        ...prev,
        images: prev.images
          .map((img) =>
            img.id === imgId ? (img.serverImageId ? { ...img, markedForDelete: true } : null) : img
          )
          .filter(Boolean) as ProductImage[],
      };
    });
  };

  // ✅ AI 가격 추천 - 이미지 예측 API (수정 페이지-단일 폼 전용)
  const genAiPriceForEdit = async () => {
    if (!form.images.length || !form.images[0].file) {
      alert('AI 가격 추천을 위해 상품 사진을 먼저 업로드해 주세요.');
      return;
    }

    setIsLoadingAiPrice(true);

    try {
      const result = await predictImage(form.images[0].file);

      if (result.success && result.predictions.length > 0) {
        const topPrediction = result.predictions[0];

        setAiPredictionInfo(result);

        if (topPrediction.price_info?.median_price) {
          const medianPrice = Math.round(topPrediction.price_info.median_price);

          setForm((prev) => ({
            ...prev,
            aiPrice: medianPrice,
          }));

          console.log(
            `AI 예측 카테고리: ${topPrediction.category} (신뢰도: ${(topPrediction.confidence * 100).toFixed(1)}%)`
          );
        } else {
          // 가격 정보 없음 → 기본 알고리즘
          const base = (form?.name.length || 6) * 1200;
          const randomized = Math.round((base + Math.random() * 8000) / 100) * 100;
          setForm((prev) => ({
            ...prev,
            aiPrice: randomized,
          }));
          alert('해당 카테고리의 가격 정보가 없어 기본 알고리즘으로 가격을 추천했습니다.');
        }
      } else {
        throw new Error('이미지 예측에 실패했습니다.');
      }
    } catch (error: any) {
      console.error('AI 가격 추천 실패:', error);

      // 실패 시 기존 로직 폴백
      const base = (form?.name.length || 6) * 1200;
      const randomized = Math.round((base + Math.random() * 8000) / 100) * 100;
      setForm((prev) => ({
        ...prev,
        aiPrice: randomized,
      }));

      alert('AI 가격 분석에 실패하여 기본 알고리즘으로 가격을 추천합니다.');
    } finally {
      setIsLoadingAiPrice(false);
    }
  };

  // AI 예측 정보 툴팁 생성
  const generatePredictionTooltip = (): string => {
    const predictionInfo = aiPredictionInfo;
    if (!predictionInfo) return '';

    let tooltip = `🎯 예측 완료: ${predictionInfo.top_category} (신뢰도: ${(predictionInfo.top_confidence * 100).toFixed(2)}%)\n`;

    predictionInfo.predictions.forEach((pred: any, index: number) => {
      if (pred.price_info) {
        tooltip += `📊 카테고리 '${pred.price_info.db_category}' 가격 통계:\n`;
        tooltip += `   평균: ${pred.price_info.average_price.toLocaleString()}원\n`;
        tooltip += `   범위: ${pred.price_info.min_price.toLocaleString()}원 ~ ${pred.price_info.max_price.toLocaleString()}원\n`;
        tooltip += `   중앙값: ${pred.price_info.median_price.toLocaleString()}원\n`;
        tooltip += `   상품수: ${pred.price_info.product_count}개`;
      } else {
        tooltip += `📭 카테고리 '${pred.category}'에 대한 가격 정보가 없습니다.`;
      }
      if (index < predictionInfo.predictions.length - 1) tooltip += '\n';
    });

    return tooltip;
  };

  const onChangeLarge = (largeId: string) => {
    updateForm('categoryLarge', largeId);
    updateForm('categoryMiddle', '');
    updateForm('categorySmall', '');
  };
  const onChangeMiddle = (uId: string) => {
    updateForm('categoryMiddle', uId);
    updateForm('categorySmall', '');
  };

  // 에디터에서 로컬 이미지 등록되면 기억
  const onLocalImageAdded = (url: string, file: File) => {
    const bucket = (pendingDescImagesRef.current ||= new Map<string, File>());
    bucket.set(url, file);
  };

  // ✅ AI 상세설명 생성 → 에디터에 주입 (수정 페이지 전용)
  const genAiDescForEdit = async () => {
    if (!form.name.trim()) {
      alert('상품 이름을 먼저 입력해 주세요.');
      return;
    }

    setIsLoadingAiDesc(true); // ✅ 로딩 상태 시작


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

      const content: string = resp?.data?.content ?? resp?.data?.data ?? resp?.data?.markdown ?? '';

      if (!content) {
        throw new Error('AI 응답이 비었습니다.');
      }

      // 단일 에디터 전용
      editorRef.current?.setMarkdown(content);

      const html = editorRef.current?.getHTML() || '';

      // 단일 form 상태 업데이트
      setForm((prev) => ({
        ...prev,
        desc: html,
      }));
    } catch (e: any) {
      alert(e?.response?.data?.error || e?.message || 'AI 설명 생성 실패');
    } finally {

      setIsLoadingAiDesc(false); // ✅ 로딩 상태 종료

    }
  };

  /** 저장 직전: blob src → cid:desc-n 치환 + 파일목록 반환 */
  function prepareDescForSubmit(rawHtml: string) {
    const bucket = pendingDescImagesRef.current ?? new Map<string, File>();
    const srcs = extractImageUrlsFromHtml(rawHtml);
    let html = rawHtml;
    const descFiles: Array<{ idx: number; file: File }> = [];
    let seq = 1;

    for (const src of srcs) {
      const f = bucket.get(src);
      if (!f) continue; // http(s) 등 외부 URL은 그대로
      const cid = `cid:desc-${seq}`;
      html = html.split(src).join(cid);
      descFiles.push({ idx: seq, file: f });
      if (src.startsWith('blob:')) URL.revokeObjectURL(src); // 메모리 해제
      bucket.delete(src);
      seq++;
    }
    return { htmlWithCids: html, descFiles };
  }

  function buildFormDataForUpdateSingle(form: ProductForm) {
    const fd = new FormData();

    const rawHtml = editorRef.current?.getHTML() || form.desc || '';
    const { htmlWithCids, descFiles } = prepareDescForSubmit(rawHtml);

    // 설명 이미지 + 썸네일 이미지 모두 'images' key로 추가
    descFiles.forEach(({ file }) => fd.append('images', file));
    form.images.forEach((img) => {
      if (img.file) fd.append('images', img.file);
    });

    // 삭제할 기존 서버 이미지 ID
    const seqsToDelete = form.images
      .filter((img) => img.serverImageId && img.markedForDelete)
      .map((img) => img.serverImageId);

    // console.log('삭제할 서버 이미지 ID:', seqsToDelete);

    seqsToDelete.forEach((id) => {
      if (id != null) {
        // null 또는 undefined 제외
        fd.append('imageIds', id.toString());
      }
    });

    const dtoPayload = {
      productId: Number(productId),
      productName: form.name.trim(),
      price: toInt(typeof form.price === 'number' ? form.price : form.aiPrice),
      productDetail: htmlWithCids,
      typeCategoryId: toInt(form.categoryLarge),
      dcategoryId: toInt(form.categorySmall),
      stock: toInt(form.stock),
      descriptionImageUrls: [], // 서버에서 cid → URL 처리
    };
    // console.log('전송용 DTO:', dtoPayload);

    fd.append('dto', new Blob([JSON.stringify(dtoPayload)], { type: 'application/json' }));

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
      const fd = buildFormDataForUpdateSingle(form);

      await legacyPost<any>(`/${storeUrl}/seller/productupdate/${productId}`, fd);

      alert('상품 수정이 완료되었습니다.');
      navigate(`/seller/${storeUrl}/product/list`);
    } catch (error: any) {
      console.error('API 호출 실패:', error);
      const msg =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message ||
        '상품 수정 실패';
      alert(msg);
    }
  };

  // ---------- 초기화(폼만 리셋) ----------
  const onReset = () => {
    // 상세를 다시 불러오고 싶으면 location.reload 또는 상세 GET 재호출 로직 구현
    setForm(createEmptyProductForm());
    setDeletedServerImageIds([]);
    pendingDescImagesRef.current.clear();
  };

  return (
    <>
      <Header />

      <SellerSidenavbar>
        {/* 상단 타이틀 (추가 페이지와 동일 스타일 유지, 단 버튼 삭제) */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-lg sm:text-2xl font-bold">판매 상품 수정</h1>
            <p className="mt-1 text-sm text-gray-500">상품 ID: {productId}</p>
          </div>
          {/* ⛔️ 수정 페이지이므로 "상품 추가" 버튼 제거 */}
        </div>

        {/* 폼 섹션 (단일) */}
        <div className="space-y-6 sm:space-y-8">
          <section className="rounded-2xl border bg-white p-4 sm:p-6 lg:p-8">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-6 gap-2">
              <div>
                <h2 className="text-base sm:text-lg font-bold">상품 1</h2>
                <p className="text-xs sm:text-sm text-gray-500">storeUrl: {storeUrl}</p>
              </div>
              {/* ⛔️ 수정 페이지: 섹션 삭제 버튼 없음 */}
            </div>

            <div className="grid gap-5">
              {/* 썸네일 1~3장 */}
              <div className="grid gap-2">
                <span className="text-sm font-medium">상품 사진 (최대 3장)</span>
                <div className="flex flex-wrap items-center gap-2">
                  {activeImages.length < 3 && (
                    <label className="px-3 py-2 rounded-md border text-sm cursor-pointer hover:bg-gray-50">
                      + 사진 선택
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={onEditPickImages.bind(null)}
                        className="hidden"
                      />
                    </label>
                  )}

                  <span className="text-xs text-gray-500">현재 {activeImages.length}/3</span>
                </div>
                {form.images.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {activeImages.map((img) => (
                      <div key={img.id} className="relative rounded-lg overflow-hidden border">
                        <img
                          src={img.url}
                          alt="preview"
                          className="w-full h-32 sm:h-40 object-cover"
                        />
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
                  className="border rounded-md px-3 py-2 w-full"
                  placeholder="예) 핸드메이드 머그컵"
                  value={form.name}
                  onChange={(e) => updateForm('name', e.target.value)}
                />
              </label>

              {/* 가격 + AI */}
              <div className="grid gap-2">
                <span className="text-sm font-medium">가격</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4">
                  <input
                    inputMode="numeric"
                    className="border rounded-md px-3 py-2 w-full"
                    placeholder="직접 입력 (원)"
                    value={form.price}
                    onChange={(e) => updateForm('price', guardInt(e.target.value) as number | '')}
                  />
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <button
                      type="button"
                      className="px-3 py-2 rounded-md border hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400 flex items-center gap-1"
                      onClick={genAiPriceForEdit}
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


              {/* ✅ 상세설명 (Editor) + AI 프롬프트/버튼 + 로딩 오버레이 */}

              <fieldset className="grid gap-2 relative">
                <legend className="text-sm font-medium">상품 상세설명</legend>

                {/* ✅ AI 로딩 오버레이 (단일폼 전용) */}
                {isLoadingAiDesc && (
                  <div className="absolute inset-0 bg-white bg-opacity-80 backdrop-blur-sm flex items-center justify-center z-50 rounded-lg">
                    <div className="flex flex-col items-center gap-3 p-6">
                      <img
                        src="/images/product_insert/AI_loading.gif"
                        alt="AI 생성 중..."
                        className="w-32 h-32 object-contain"
                      />
                      <div className="text-sm font-medium text-gray-700">
                        AI가 상품 설명을 생성하고 있습니다...
                      </div>
                      <div className="text-xs text-gray-500">잠시만 기다려주세요</div>
                    </div>
                  </div>
                )}

                {/* 에디터 */}
                <div className="w-full overflow-hidden">
                  <EditorAPI
                    ref={(el) => {
                      editorRef.current = el ?? null;
                    }}
                    initialValue={form.desc}
                    onLocalImageAdded={(url, file) => onLocalImageAdded(url, file)}
                  />
                </div>

                <div className="grid gap-2 mt-2">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <span className="text-sm font-medium">AI 상품 설명 프롬프트/메모</span>
                    <button
                      type="button"

                      className="px-3 py-1.5 rounded-md border text-sm hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400"
                      onClick={() => genAiDescForEdit()}
                      disabled={isLoadingAiDesc}
                    >

                      {isLoadingAiDesc ? 'AI 생성 중...' : 'AI 설명 생성'}
                    </button>
                  </div>

                  <textarea
                    className="border rounded-md px-3 py-2 min-h-[100px] disabled:bg-gray-50 disabled:cursor-not-allowed"
                    placeholder="핵심 특징, 소재/사이즈, 사용 상황 등 키워드를 남겨 주세요."
                    value={form.aiDesc}

                    onChange={(e) => updateForm('aiDesc', e.target.value)}

                    disabled={isLoadingAiDesc}
                  />
                  <p className="text-xs text-gray-500">
                    * 생성 후 내용은 위 에디터에 자동 반영됩니다.
                  </p>
                </div>

                {/* ✅ AI 로딩 오버레이 */}
                {isLoadingAiDesc && (
                  <div className="absolute inset-0 bg-white bg-opacity-80 backdrop-blur-sm flex items-center justify-center z-20 rounded-lg">
                    <div className="flex flex-col items-center gap-3 p-6">
                      <img
                        src="/images/product_insert/AI_loading.gif"
                        alt="AI 생성 중..."
                        className="w-32 h-32 object-contain"
                      />
                      <div className="text-sm font-medium text-gray-700">
                        AI가 상품 설명을 생성하고 있습니다...
                      </div>
                      <div className="text-xs text-gray-500">잠시만 기다려주세요</div>
                    </div>
                  </div>
                )}
              </fieldset>

              {/* 카테고리 */}
              <div className="grid gap-2">
                <span className="text-sm font-medium">상품 카테고리</span>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  {/* 대분류 */}
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

                  {/* 중분류 */}
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

                  {/* 소분류 */}
                  <select
                    className="border rounded-md px-3 py-2"
                    value={form.categorySmall}
                    onChange={(e) => updateForm('categorySmall', e.target.value)}
                    disabled={!form.categoryMiddle}
                  >
                    <option value="">
                      {form.categoryMiddle ? '소분류 선택' : '중분류 먼저 선택'}
                    </option>
                    {(dCatsByU[String(form.categoryMiddle)] ?? []).map((d) => (
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
        </div>

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
      </SellerSidenavbar>
    </>
  );
};

export default ProductEdit;