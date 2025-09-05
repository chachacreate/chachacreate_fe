import type { FC, ChangeEvent, MouseEvent } from 'react';
import { useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Header from '@src/shared/areas/layout/features/header/Header';
import Mainnavbar from '@src/shared/areas/navigation/features/navbar/main/Mainnavbar';
import SellerSidenavbar from '@src/shared/areas/navigation/features/sidenavbar/seller/SellerSidenavbar';
import api from '@src/libs/apiService';
import EditorAPI, {
  type EditorHandle,
} from '@src/domains/seller/areas/class/features/insert/components/EditorAPI';

type Params = { storeUrl: string };

type ProductImage = { id: string; file?: File; url: string };

type ProductForm = {
  id: string;
  productNumber: number; // 폼 번호 표시용 (1부터)
  name: string; // 상품명
  price: number | ''; // 가격
  aiPrice: number | ''; // AI 가격 추천 결과 (보기용)
  desc: string; // (상태 보관용) 에디터 HTML을 여기에도 저장해 둠
  aiDesc: string; // AI 프롬프트/메모(요청 키워드)
  images: ProductImage[]; // 최대 3장
  stock: number | ''; // 재고 수량
  categoryLarge: string;
  categoryMiddle: string;
  categorySmall: string;

  blogOptions: {
    font: string;
    bold: boolean;
    italic: boolean;
    strike: boolean;
    divider: boolean;
    quote: boolean;
    bullet: 'none' | 'dot' | 'number' | 'check';
    indent: 'none' | 'left' | 'right';
    table: boolean;
    image: boolean;
    link: boolean;
    code: boolean;
    customCB: boolean;
  };
};

const MAX_NUM = 1_000_000_000_000; // 1조

const CATEGORY_OPTIONS = {
  large: ['주방', '리빙', '패션', '문구', '원예'],
  middle: {
    주방: ['컵/머그', '식기', '수납', '패브릭'],
    리빙: ['가구소품', '조명', '러그/매트'],
    패션: ['가방', '지갑', '액세서리'],
    문구: ['노트', '펜', '데스크정리'],
    원예: ['화분', '수경용품', '가드닝도구'],
  } as Record<string, string[]>,
  small: {
    '컵/머그': ['머그컵', '티컵', '유리컵'],
    식기: ['접시', '볼', '수저/포크'],
    수납: ['보관함', '정리함', '바스켓'],
    패브릭: ['테이블보', '키친크로스', '러너'],
    가구소품: ['미니선반', '트레이', '받침대'],
    조명: ['스탠드', '무드등', '거실등'],
    '러그/매트': ['발매트', '러그', '주방매트'],
    가방: ['토트백', '크로스백', '파우치'],
    지갑: ['카드지갑', '반지갑', '장지갑'],
    액세서리: ['귀걸이', '목걸이', '반지'],
    노트: ['하드커버', '스프링', '리필용지'],
    펜: ['볼펜', '만년필', '마카'],
    데스크정리: ['펜꽂이', '정리함', '북엔드'],
    화분: ['토분', '세라믹', '콘크리트'],
    수경용품: ['유리병', '수경세트', '영양제'],
    가드닝도구: ['삽', '분무기', '장갑'],
  } as Record<string, string[]>,
};

// 숫자 가드
const guardInt = (v: string) => {
  if (!v) return '';
  const n = Number(v.replace(/[^\d]/g, ''));
  if (Number.isNaN(n)) return '';
  if (n < 0) return 0;
  if (n >= MAX_NUM) return MAX_NUM - 1;
  return n;
};

// 에디터 HTML에서 <img src="..."> URL만 뽑기(중복 제거)
const extractImageUrlsFromHtml = (html: string): string[] => {
  if (!html) return [];
  const urls: string[] = [];
  const re = /<img[^>]*src=["']([^"']+)["'][^>]*>/g;
  for (const m of html.matchAll(re)) urls.push(m[1]);
  return Array.from(new Set(urls));
};

// 빈 폼
const createEmptyProductForm = (productNumber = 1): ProductForm => ({
  id: crypto.randomUUID(),
  productNumber,
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
  blogOptions: {
    font: 'Noto Sans KR',
    bold: false,
    italic: false,
    strike: false,
    divider: false,
    quote: false,
    bullet: 'none',
    indent: 'none',
    table: false,
    image: false,
    link: false,
    code: false,
    customCB: false,
  },
});

const ProductInsert: FC = () => {
  const navigate = useNavigate();
  const { storeUrl = '' } = useParams<Params>();

  // 다중 상품 폼
  const [forms, setForms] = useState<ProductForm[]>([createEmptyProductForm(1)]);

  // ✅ 폼별 Editor ref
  const editorRefs = useRef<Record<string, EditorHandle | null>>({});

  // 폼 추가
  const addNewForm = () => {
    setForms((prev) => {
      const nextNo = prev.length + 1;
      const nextForm = { ...createEmptyProductForm(nextNo), productNumber: nextNo };
      return [nextForm, ...prev];
    });
  };

  // 폼 삭제 (최소 1개 유지) + 번호 재정렬
  const removeForm = (formId: string) => {
    setForms((prev) => {
      if (prev.length === 1) return prev;
      // ref 정리
      delete editorRefs.current[formId];

      const filtered = prev.filter((f) => f.id !== formId);
      return filtered.map((f, idx) => ({ ...f, productNumber: idx + 1 }));
    });
  };

  // 공통 업데이트
  const updateForm = <K extends keyof ProductForm>(
    formId: string,
    key: K,
    value: ProductForm[K]
  ) => {
    setForms((prev) => prev.map((f) => (f.id === formId ? { ...f, [key]: value } : f)));
  };

  // 이미지 선택 (최대 3장)
  const onPickImages = (formId: string, e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !files.length) return;

    const chosen = Array.from(files).slice(0, 3);
    setForms((prev) =>
      prev.map((f) => {
        if (f.id !== formId) return f;
        const current = f.images ?? [];
        const remainSlots = Math.max(0, 3 - current.length);
        const toAdd = chosen.slice(0, remainSlots).map((file) => ({
          id: crypto.randomUUID(),
          file,
          url: URL.createObjectURL(file),
        }));
        return { ...f, images: [...current, ...toAdd] };
      })
    );

    e.target.value = '';
  };

  const removeImage = (formId: string, imageId: string) => {
    setForms((prev) =>
      prev.map((f) =>
        f.id === formId ? { ...f, images: f.images.filter((img) => img.id !== imageId) } : f
      )
    );
  };

  // AI 가격 추천 (데모 로직)
  const genAiPrice = (formId: string) => {
    const target = forms.find((f) => f.id === formId);
    const base = (target?.name.length || 6) * 1200;
    const randomized = Math.round((base + Math.random() * 8000) / 100) * 100;
    updateForm(formId, 'aiPrice', randomized as number);
  };

  // ✅ AI 상품 설명 생성 → /api/ai/product-description 호출
  const genAiDesc = async (formId: string) => {
    const form = forms.find((f) => f.id === formId);
    if (!form) return;

    // 폼 기본 유효성(이름 정도는 있어야 더 좋은 결과)
    if (!form.name.trim()) {
      alert('상품 이름을 먼저 입력해 주세요.');
      return;
    }

    try {
      const payload = {
        name: form.name,
        prompt: form.aiDesc, // 판매자 메모/키워드
        // 가격은 직접입력 우선, 없으면 AI추천가 사용
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
      const content = resp?.data?.content ?? resp?.data?.data ?? '';

      if (!content) throw new Error('AI 응답이 비었습니다.');

      // 에디터에 주입
      editorRefs.current[formId]?.setMarkdown(content);

      // 상태에도 HTML 저장(저장 버튼 누를 때 다시 getHTML 하겠지만 미리 보관)
      const html = editorRefs.current[formId]?.getHTML() || '';
      updateForm(formId, 'desc', html);
    } catch (e: any) {
      alert(e?.response?.data?.error || e?.message || 'AI 설명 생성 실패');
    }
  };

  // 카테고리 체인
  const onChangeLarge = (formId: string, large: string) => {
    updateForm(formId, 'categoryLarge', large);
    updateForm(formId, 'categoryMiddle', '');
    updateForm(formId, 'categorySmall', '');
  };
  const onChangeMiddle = (formId: string, middle: string) => {
    updateForm(formId, 'categoryMiddle', middle);
    updateForm(formId, 'categorySmall', '');
  };

  // 제출
  const onSubmit = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();

    // 간단 유효성
    for (let i = 0; i < forms.length; i++) {
      const f = forms[i];
      const n = i + 1;

      if (!f.name.trim()) {
        alert(`${n}번째 상품의 이름을 입력해 주세요.`);
        return;
      }
      if (!f.price && !f.aiPrice) {
        alert(`${n}번째 상품의 가격(직접 입력 또는 AI 추천)을 입력/선택해 주세요.`);
        return;
      }
      if (!f.categoryLarge || !f.categoryMiddle || !f.categorySmall) {
        alert(`${n}번째 상품의 대/중/소 카테고리를 모두 선택해 주세요.`);
        return;
      }
      if (!f.stock || Number(f.stock) < 0) {
        alert(`${n}번째 상품의 재고 수량을 0 이상으로 입력해 주세요.`);
        return;
      }
      if (f.images.length < 1) {
        alert(`${n}번째 상품의 사진을 최소 1장 업로드해 주세요. (최대 3장)`);
        return;
      }
    }

    // ⬇️ 실제 저장 시 전송할 payload 예시 (데모로 콘솔 출력)
    const payload = forms.map((f) => {
      const editorHtml = editorRefs.current[f.id]?.getHTML() || f.desc || '';
      const detailImageUrls = extractImageUrlsFromHtml(editorHtml);

      return {
        name: f.name,
        price:
          typeof f.price === 'number' ? f.price : typeof f.aiPrice === 'number' ? f.aiPrice : 0,
        stock: typeof f.stock === 'number' ? f.stock : 0,
        categoryLarge: f.categoryLarge,
        categoryMiddle: f.categoryMiddle,
        categorySmall: f.categorySmall,
        // 저장용 본문(HTML)
        detail: editorHtml,
        // 본문 내 이미지 URL(선택)
        detailImageUrls,
        // 썸네일 파일들(실서버에선 FormData 업로드)
        thumbnails: f.images.filter((i) => i.file).map((i) => i.file?.name),
      };
    });

    console.log('[상품 저장 payload 예시]', payload);
    alert(`상품 ${forms.length}개 등록 완료 (데모)\n상세 상품 관리 페이지로 이동합니다.`);
    navigate(`/seller/${storeUrl}/product/list`);
  };

  return (
    <>
      <Header />
      <Mainnavbar />

      <SellerSidenavbar>
        <div className="space-y-6 sm:space-y-8">
          {/* 상단 + 버튼 */}
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

          {/* 폼 목록 */}
          {forms.map((form) => {
            const middles = form.categoryLarge
              ? (CATEGORY_OPTIONS.middle[form.categoryLarge] ?? [])
              : [];
            const smalls = form.categoryMiddle
              ? (CATEGORY_OPTIONS.small[form.categoryMiddle] ?? [])
              : [];

            return (
              <section
                key={form.id}
                className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-6 lg:p-8"
              >
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
                  {/* 1) 상품 사진 3개 입력 */}
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

                  {/* 2) 상품 이름 */}
                  <label className="grid gap-1">
                    <span className="text-sm font-medium">상품 이름</span>
                    <input
                      className="border rounded-md px-3 py-2"
                      placeholder="예) 핸드메이드 머그컵"
                      value={form.name}
                      onChange={(e) => updateForm(form.id, 'name', e.target.value)}
                    />
                  </label>

                  {/* 3) 가격 (직접 입력 or AI 추천) */}
                  <div className="grid gap-2">
                    <span className="text-sm font-medium">가격</span>
                    <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-2">
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
                            className="px-3 py-2 rounded-md border hover:bg-gray-50"
                            onClick={() => genAiPrice(form.id)}
                          >
                            AI 가격 추천
                          </button>
                          <input
                            readOnly
                            className="border rounded-md px-3 py-2 flex-1 bg-gray-50"
                            placeholder="AI 추천가"
                            value={
                              form.aiPrice ? `${Number(form.aiPrice).toLocaleString()} 원` : ''
                            }
                          />
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500">
                      * 직접 입력 또는 AI 추천가 중 하나를 사용하세요. (저장 시 실제 저장가로 결정)
                    </p>
                  </div>

                  {/* 4) 상품 상세설명: Toast UI 에디터 + AI 생성 */}
                  <fieldset className="grid gap-2">
                    <legend className="text-sm font-medium">상품 상세설명</legend>

                    {/* ✅ Toast UI Editor */}
                    <EditorAPI
                      ref={(el) => {
                        editorRefs.current[form.id] = el;
                      }}
                      initialValue={form.desc ?? ''}
                    />

                    {/* ✅ AI 프롬프트 & 생성 */}
                    <div className="grid gap-2 mt-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">AI 상품 설명 프롬프트/메모</span>
                        <button
                          type="button"
                          className="px-3 py-1.5 rounded-md border text-sm"
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

                  {/* 5) 상품 카테고리 (대/중/소) */}
                  <div className="grid gap-2">
                    <span className="text-sm font-medium">상품 카테고리</span>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      {/* 대분류 */}
                      <select
                        className="border rounded-md px-3 py-2"
                        value={form.categoryLarge}
                        onChange={(e) => onChangeLarge(form.id, e.target.value)}
                      >
                        <option value="">대분류 선택</option>
                        {CATEGORY_OPTIONS.large.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>

                      {/* 중분류 */}
                      <select
                        className="border rounded-md px-3 py-2"
                        value={form.categoryMiddle}
                        onChange={(e) => onChangeMiddle(form.id, e.target.value)}
                        disabled={!form.categoryLarge}
                      >
                        <option value="">
                          {form.categoryLarge ? '중분류 선택' : '대분류 먼저 선택'}
                        </option>
                        {form.categoryLarge &&
                          (CATEGORY_OPTIONS.middle[form.categoryLarge] ?? []).map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                      </select>

                      {/* 소분류 */}
                      <select
                        className="border rounded-md px-3 py-2"
                        value={form.categorySmall}
                        onChange={(e) => updateForm(form.id, 'categorySmall', e.target.value)}
                        disabled={!form.categoryMiddle}
                      >
                        <option value="">
                          {form.categoryMiddle ? '소분류 선택' : '중분류 먼저 선택'}
                        </option>
                        {form.categoryMiddle &&
                          (CATEGORY_OPTIONS.small[form.categoryMiddle] ?? []).map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>

                  {/* 6) 재고 수량 */}
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

                  {/* (선택) 데코/블로그 옵션 – 기존 유지 */}
                  <details className="rounded-lg border bg-gray-50 open:bg-white">
                    <summary className="cursor-pointer px-3 py-2 text-sm font-medium">
                      블로그 API 옵션 (서식/요소)
                    </summary>
                    <div className="p-3 grid gap-3">
                      <div className="grid gap-1">
                        <span className="text-xs text-gray-600">글꼴</span>
                        <select
                          className="border rounded-md px-3 py-2 w-full sm:w-60"
                          value={form.blogOptions.font}
                          onChange={(e) =>
                            updateForm(form.id, 'blogOptions', {
                              ...form.blogOptions,
                              font: e.target.value,
                            })
                          }
                        >
                          <option>Noto Sans KR</option>
                          <option>Pretendard</option>
                          <option>Jua</option>
                        </select>
                      </div>

                      <div className="flex flex-wrap gap-3 text-sm">
                        {[
                          ['bold', '볼드'],
                          ['italic', '이탤릭'],
                          ['strike', '중간선'],
                          ['divider', '구분선'],
                          ['quote', '인용'],
                          ['table', '표'],
                          ['image', '사진'],
                          ['link', '링크'],
                          ['code', '코드'],
                          ['customCB', 'CB?'],
                        ].map(([key, label]) => {
                          const k = key as keyof ProductForm['blogOptions'];
                          return (
                            <label key={key} className="inline-flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={Boolean(form.blogOptions[k])}
                                onChange={(e) =>
                                  updateForm(form.id, 'blogOptions', {
                                    ...form.blogOptions,
                                    [k]: e.target.checked,
                                  })
                                }
                              />
                              {label}
                            </label>
                          );
                        })}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                        <label className="grid gap-1">
                          <span className="text-xs text-gray-600">글머리 기호</span>
                          <select
                            className="border rounded-md px-3 py-2"
                            value={form.blogOptions.bullet}
                            onChange={(e) =>
                              updateForm(form.id, 'blogOptions', {
                                ...form.blogOptions,
                                bullet: e.target.value as ProductForm['blogOptions']['bullet'],
                              })
                            }
                          >
                            <option value="none">없음</option>
                            <option value="dot">기본</option>
                            <option value="number">숫자</option>
                            <option value="check">체크</option>
                          </select>
                        </label>

                        <label className="grid gap-1">
                          <span className="text-xs text-gray-600">들여쓰기</span>
                          <select
                            className="border rounded-md px-3 py-2"
                            value={form.blogOptions.indent}
                            onChange={(e) =>
                              updateForm(form.id, 'blogOptions', {
                                ...form.blogOptions,
                                indent: e.target.value as ProductForm['blogOptions']['indent'],
                              })
                            }
                          >
                            <option value="none">없음</option>
                            <option value="left">왼쪽</option>
                            <option value="right">오른쪽</option>
                          </select>
                        </label>
                      </div>
                      <p className="text-xs text-gray-500">
                        * 실제 블로그 API 연동 시 위 옵션을 기반으로 포맷팅/컴포넌트 삽입이
                        가능하도록 매핑하면 됩니다.
                      </p>
                    </div>
                  </details>
                </div>
              </section>
            );
          })}

          {/* 하단 고정 버튼영역 */}
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
