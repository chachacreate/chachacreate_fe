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
import { predictImage } from '../services/aiService/aiService';

type Params = { storeUrl: string };
type EnumItem = { id: number; name: string };
type DCatsByU = Record<string, EnumItem[]>;

type ProductImage = { id: string; file?: File; url: string };

type ProductForm = {
  id: string;
  productNumber: number;
  name: string;
  price: number | '';
  aiPrice: number | '';
  desc: string;
  aiDesc: string; // AI 프롬프트/메모
  images: ProductImage[]; // 썸네일(최대 3)
  stock: number | '';
  categoryLarge: string; // typeCategoryId
  categoryMiddle: string; // uCategoryId(UI)
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

// HTML에서 <img src="...">만 추출 (중복 제거 + 순서 유지)
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

const createEmptyProductForm = (no = 1): ProductForm => ({
  id: crypto.randomUUID(),
  productNumber: no,
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

const ProductInsert: FC = () => {
  const navigate = useNavigate();
  const { storeUrl = '' } = useParams<Params>();
  const [forms, setForms] = useState<ProductForm[]>([createEmptyProductForm(1)]);
  const [isLoadingAiPrice, setIsLoadingAiPrice] = useState<Record<string, boolean>>({});

  // 카테고리
  const [typeCats, setTypeCats] = useState<EnumItem[]>([]);
  const [uCats, setUCats] = useState<EnumItem[]>([]);
  const [dCatsByU, setDCatsByU] = useState<DCatsByU>({});

  // AI 예측 정보 저장
  const [aiPredictionInfo, setAiPredictionInfo] = useState<Record<string, any>>({});

  // 에디터 refs
  const editorRefs = useRef<Record<string, EditorHandle | null>>({});

  // 폼별 "에디터에 추가된 로컬 설명 이미지" 버킷: blobURL -> File
  const pendingDescImagesRef = useRef<Record<string, Map<string, File>>>({});

  // Nginx로 /legacy 프록시(동일 Origin) → CORS 회피
  const LEGACY_BASE = `${window.location.origin}/legacy`;

  useEffect(() => {
    (async () => {
      const res = await axios.get(`${LEGACY_BASE}/category`, { withCredentials: true });
      const { typeCategories = [], uCategories = [], dCategoriesByU = {} } = res.data || {};
      setTypeCats(typeCategories);
      setUCats(uCategories);
      setDCatsByU(dCategoriesByU);
    })().catch(() => alert('카테고리 불러오기 실패'));
  }, []);

  // 폼 조작
  const addNewForm = () =>
    setForms((prev) => [{ ...createEmptyProductForm(prev.length + 1) }, ...prev]);

  const removeForm = (formId: string) => {
    setForms((prev) => {
      if (prev.length === 1) return prev;
      delete editorRefs.current[formId];
      delete pendingDescImagesRef.current[formId];
      delete isLoadingAiPrice[formId];
      const filtered = prev.filter((f) => f.id !== formId);
      return filtered.map((f, i) => ({ ...f, productNumber: i + 1 }));
    });
  };

  const updateForm = <K extends keyof ProductForm>(
    formId: string,
    key: K,
    value: ProductForm[K]
  ) => {
    setForms((prev) => prev.map((f) => (f.id === formId ? { ...f, [key]: value } : f)));
  };

  const onPickImages = (formId: string, e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !files.length) return;
    const chosen = Array.from(files).slice(0, 3);
    setForms((prev) =>
      prev.map((f) => {
        if (f.id !== formId) return f;
        const remain = Math.max(0, 3 - (f.images?.length ?? 0));
        const toAdd = chosen.slice(0, remain).map((file) => ({
          id: crypto.randomUUID(),
          file,
          url: URL.createObjectURL(file),
        }));
        return { ...f, images: [...(f.images ?? []), ...toAdd] };
      })
    );
    e.target.value = '';
  };

  const removeImage = (formId: string, imageId: string) => {
    setForms((prev) =>
      prev.map((f) =>
        f.id === formId ? { ...f, images: f.images.filter((i) => i.id !== imageId) } : f
      )
    );
  };

  // ✅ AI 가격 추천 - 이미지 예측 API 사용
  const genAiPrice = async (formId: string) => {
    const form = forms.find((f) => f.id === formId);
    if (!form) return;

    // 첫 번째 이미지가 있는지 확인
    if (!form.images.length || !form.images[0].file) {
      alert('AI 가격 추천을 위해 상품 사진을 먼저 업로드해 주세요.');
      return;
    }

    setIsLoadingAiPrice((prev) => ({ ...prev, [formId]: true }));

    try {
      const result = await predictImage(form.images[0].file);

      if (result.success && result.predictions.length > 0) {
        const topPrediction = result.predictions[0];
        setAiPredictionInfo((prev: any) => ({
          ...prev,
          [formId]: result,
        }));
        if (topPrediction.price_info && topPrediction.price_info.median_price) {
          const medianPrice = Math.round(topPrediction.price_info.median_price);
          updateForm(formId, 'aiPrice', medianPrice);
          // 선택사항: 예측된 카테고리 정보를 사용자에게 알려주기
          console.log(
            `AI 예측 카테고리: ${topPrediction.category} (신뢰도: ${(topPrediction.confidence * 100).toFixed(1)}%)`
          );
        } else {
          // 가격 정보가 없는 경우 기본 로직 사용
          const base = (form?.name.length || 6) * 1200;
          const randomized = Math.round((base + Math.random() * 8000) / 100) * 100;
          updateForm(formId, 'aiPrice', randomized as number);
          alert('해당 카테고리의 가격 정보가 없어 기본 알고리즘으로 가격을 추천했습니다.');
        }
      } else {
        throw new Error('이미지 예측에 실패했습니다.');
      }
    } catch (error: any) {
      console.error('AI 가격 추천 실패:', error);

      // 실패 시 기존 로직으로 폴백
      const base = (form?.name.length || 6) * 1200;
      const randomized = Math.round((base + Math.random() * 8000) / 100) * 100;
      updateForm(formId, 'aiPrice', randomized as number);

      alert('AI 가격 분석에 실패하여 기본 알고리즘으로 가격을 추천합니다.');
    } finally {
      setIsLoadingAiPrice((prev) => ({ ...prev, [formId]: false }));
    }
  };

  // AI 예측 정보 툴팁 생성
  const generatePredictionTooltip = (formId: string): string => {
    const predictionInfo = aiPredictionInfo[formId];
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

  const onChangeLarge = (formId: string, largeId: string) => {
    updateForm(formId, 'categoryLarge', largeId);
    updateForm(formId, 'categoryMiddle', '');
    updateForm(formId, 'categorySmall', '');
  };
  const onChangeMiddle = (formId: string, uId: string) => {
    updateForm(formId, 'categoryMiddle', uId);
    updateForm(formId, 'categorySmall', '');
  };

  // 에디터에서 로컬 이미지 등록되면 기억
  const onLocalImageAdded = (formId: string, url: string, file: File) => {
    const bucket = (pendingDescImagesRef.current[formId] ||= new Map<string, File>());
    bucket.set(url, file);
  };

  // ✅ AI 상세설명 생성 → 에디터에 주입
  const genAiDesc = async (formId: string) => {
    const form = forms.find((f) => f.id === formId);
    if (!form) return;
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
      const content: string = resp?.data?.content ?? resp?.data?.data ?? resp?.data?.markdown ?? '';
      if (!content) throw new Error('AI 응답이 비었습니다.');

      editorRefs.current[formId]?.setMarkdown(content);
      const html = editorRefs.current[formId]?.getHTML() || '';
      updateForm(formId, 'desc', html);
    } catch (e: any) {
      alert(e?.response?.data?.error || e?.message || 'AI 설명 생성 실패');
    }
  };

  /** 저장 직전: blob src → cid:desc-n 치환 + 파일목록 반환 */
  function prepareDescForSubmit(formId: string, rawHtml: string) {
    const bucket = pendingDescImagesRef.current[formId] ?? new Map<string, File>();
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

  // multipart/form-data 구성
  function buildFormData() {
    const fd = new FormData();

    const dtoPayload = forms.map((f, pIdx) => {
      const rawHtml = editorRefs.current[f.id]?.getHTML?.() || f.desc || '';
      const { htmlWithCids, descFiles } = prepareDescForSubmit(f.id, rawHtml);

      // 설명 이미지 파일 첨부 (product{p}_desc{n})
      descFiles.forEach(({ idx, file }) => {
        fd.append(`product${pIdx}_desc${idx}`, file);
      });

      // 썸네일 파일 첨부 (product{p}_image{n})
      f.images.forEach((img, iIdx) => {
        if (img.file) fd.append(`product${pIdx}_image${iIdx + 1}`, img.file);
      });

      return {
        product: {
          productName: f.name.trim(),
          price: toInt(typeof f.price === 'number' ? f.price : f.aiPrice),
          productDetail: htmlWithCids, // cid 포함
          typeCategoryId: toInt(f.categoryLarge),
          dcategoryId: toInt(f.categorySmall),
          stock: toInt(f.stock),
        },
        // 설명 URL은 서버에서 cid→URL 치환 후 본문에서 재추출하므로 빈 배열 전송
        descriptionImageUrls: [],
      };
    });

    fd.append('dtoList', new Blob([JSON.stringify(dtoPayload)], { type: 'application/json' }));
    return fd;
  }

  const onSubmit = async (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();

    // 간단 검증
    for (let i = 0; i < forms.length; i++) {
      const f = forms[i],
        n = i + 1;
      if (!f.name.trim()) return alert(`${n}번째 상품 이름을 입력해 주세요.`);
      if (!f.price && !f.aiPrice) return alert(`${n}번째 상품의 가격을 입력/선택해 주세요.`);
      if (!f.categoryLarge || !f.categoryMiddle || !f.categorySmall)
        return alert(`${n}번째 상품의 대/중/소 카테고리를 모두 선택해 주세요.`);
      if (!f.stock || Number(f.stock) < 0)
        return alert(`${n}번째 상품의 재고 수량을 0 이상으로 입력해 주세요.`);
      if (f.images.length < 1) return alert(`${n}번째 상품의 사진을 최소 1장 업로드해 주세요.`);
    }

    try {
      const fd = buildFormData();

      const res = await axios.post(`${LEGACY_BASE}/${storeUrl}/seller/productinsert`, fd, {
        withCredentials: true,
      });

      // axios는 기본적으로 2xx에서만 여기로 들어옵니다.
      // 별도 validateStatus를 쓰지 않는 한 추가 체크 불필요
      if (res.status >= 200 && res.status < 300) {
        alert('상품 등록 성공!');
        navigate(`/seller/${storeUrl}/product/list`);
        return;
      }

      // 혹시 모를 예외 상황 대비
      throw new Error(res.statusText || '상품 등록 실패');
    } catch (err: any) {
      console.error(err);
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        '상품 등록 실패';
      alert(msg);
    }
  };

  return (
    <>
      <Header />

      <SellerSidenavbar>
        <div className="space-y-6 sm:space-y-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold">판매 상품 등록</h1>
              <p className="mt-1 text-sm text-gray-500">총 {forms.length}개 상품</p>
            </div>
            <button
              type="button"
              onClick={addNewForm}
              className="px-4 py-2 rounded-lg bg-[#2D4739] text-white font-medium hover:opacity-90"
            >
              + 상품 추가
            </button>
          </div>

          {forms.map((form) => {
            const dOptions = form.categoryMiddle ? (dCatsByU[form.categoryMiddle] ?? []) : [];
            const isAiPriceLoading = isLoadingAiPrice[form.id] || false;

            return (
              <section key={form.id} className="rounded-2xl border bg-white p-4 sm:p-6 lg:p-8">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h2 className="text-lg font-bold">상품 {form.productNumber}</h2>
                    <p className="text-sm text-gray-500">storeUrl: {storeUrl}</p>
                  </div>
                  {forms.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeForm(form.id)}
                      className="px-3 py-1.5 rounded-md border border-red-200 text-red-600 text-sm hover:bg-red-50"
                    >
                      삭제
                    </button>
                  )}
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
                          onChange={(e) => onPickImages(form.id, e)}
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
                              onClick={() => removeImage(form.id, img.id)}
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
                      onChange={(e) => updateForm(form.id, 'name', e.target.value)}
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
                        onChange={(e) =>
                          updateForm(form.id, 'price', guardInt(e.target.value) as number | '')
                        }
                      />
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          className="px-3 py-2 rounded-md border hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400 flex items-center gap-1"
                          onClick={() => genAiPrice(form.id)}
                          disabled={isAiPriceLoading}
                        >
                          {isAiPriceLoading && (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-500"></div>
                          )}
                          {isAiPriceLoading ? 'AI 분석 중...' : 'AI 가격 추천'}
                        </button>
                        <div className="relative flex-1">
                          <input
                            readOnly
                            className="border rounded-md px-3 py-2 w-full bg-gray-50 cursor-help"
                            placeholder="AI 추천가"
                            value={
                              form.aiPrice ? `${Number(form.aiPrice).toLocaleString()} 원` : ''
                            }
                            title={
                              form.aiPrice && aiPredictionInfo[form.id]
                                ? generatePredictionTooltip(form.id)
                                : ''
                            }
                          />
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500">
                      * AI 가격 추천은 첫 번째 상품 사진을 분석하여 시장 가격을 제안합니다.
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
                      onLocalImageAdded={(url, file) => onLocalImageAdded(form.id, url, file)}
                    />

                    <div className="grid gap-2 mt-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">AI 상품 설명 프롬프트/메모</span>
                        <button
                          type="button"
                          className="px-3 py-1.5 rounded-md border text-sm hover:bg-gray-50"
                          onClick={() => genAiDesc(form.id)}
                        >
                          AI 설명 생성
                        </button>
                      </div>
                      <textarea
                        className="border rounded-md px-3 py-2 min-h-[100px]"
                        placeholder="핵심 특징, 소재/사이즈, 사용 상황 등 키워드를 남겨 주세요."
                        value={form.aiDesc}
                        onChange={(e) => updateForm(form.id, 'aiDesc', e.target.value)}
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
                        onChange={(e) => onChangeLarge(form.id, e.target.value)}
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
                        onChange={(e) => onChangeMiddle(form.id, e.target.value)}
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
                        onChange={(e) => updateForm(form.id, 'categorySmall', e.target.value)}
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
                      onChange={(e) =>
                        updateForm(form.id, 'stock', guardInt(e.target.value) as number | '')
                      }
                    />
                  </label>
                </div>
              </section>
            );
          })}

          {/* 하단 버튼 */}
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 sticky bottom-4 bg-white p-4 rounded-xl border shadow-lg">
            <button
              type="button"
              className="w-full sm:w-auto px-6 py-3 rounded-lg bg-[#2D4739] text-white font-medium hover:opacity-90"
              onClick={onSubmit}
            >
              {forms.length}개 상품 모두 저장
            </button>
            <button
              type="button"
              className="w-full sm:w-auto px-6 py-3 rounded-lg border font-medium hover:bg-gray-50"
              onClick={() => setForms([createEmptyProductForm(1)])}
            >
              초기화
            </button>
          </div>
        </div>
      </SellerSidenavbar>
    </>
  );
};

export default ProductInsert;
