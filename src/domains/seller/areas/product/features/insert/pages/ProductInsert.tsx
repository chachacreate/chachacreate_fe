import type { FC, ChangeEvent, MouseEvent } from "react";
import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Header from "@src/shared/areas/layout/features/header/Header";
import Mainnavbar from "@src/shared/areas/navigation/features/navbar/main/Mainnavbar";
import SellerSidenavbar from "@src/shared/areas/navigation/features/sidenavbar/seller/SellerSidenavbar";

type Params = { storeUrl: string };

type ProductImage = { id: string; file?: File; url: string };

type ProductForm = {
  id: string;
  productNumber: number;             // 폼 번호 표시용 (1부터)
  name: string;                      // 상품명
  price: number | "";                // 가격
  aiPrice: number | "";              // AI 가격 추천 결과 (보기용)
  desc: string;                      // 직접 입력 설명
  aiDesc: string;                    // AI가 생성한 설명
  images: ProductImage[];            // 최대 3장
  stock: number | "";                // 재고 수량
  categoryLarge: string;
  categoryMiddle: string;
  categorySmall: string;

  // 블로그 API 연동 시 옵션 (간단 토글/선택 예시)
  blogOptions: {
    font: string;                    // 글꼴
    bold: boolean;
    italic: boolean;
    strike: boolean;
    divider: boolean;
    quote: boolean;
    bullet: "none" | "dot" | "number" | "check";
    indent: "none" | "left" | "right";
    table: boolean;
    image: boolean;
    link: boolean;
    code: boolean;
    customCB: boolean;               // 요청서의 CB? 항목
  };
};

const MAX_NUM = 1_000_000_000_000; // 1조

// 데모 카테고리 (대/중/소) — 실제 API 연동 시 교체
const CATEGORY_OPTIONS = {
  large: ["주방", "리빙", "패션", "문구", "원예"],
  middle: {
    주방: ["컵/머그", "식기", "수납", "패브릭"],
    리빙: ["가구소품", "조명", "러그/매트"],
    패션: ["가방", "지갑", "액세서리"],
    문구: ["노트", "펜", "데스크정리"],
    원예: ["화분", "수경용품", "가드닝도구"],
  } as Record<string, string[]>,
  small: {
    "컵/머그": ["머그컵", "티컵", "유리컵"],
    식기: ["접시", "볼", "수저/포크"],
    수납: ["보관함", "정리함", "바스켓"],
    패브릭: ["테이블보", "키친크로스", "러너"],
    가구소품: ["미니선반", "트레이", "받침대"],
    조명: ["스탠드", "무드등", "거실등"],
    "러그/매트": ["발매트", "러그", "주방매트"],
    가방: ["토트백", "크로스백", "파우치"],
    지갑: ["카드지갑", "반지갑", "장지갑"],
    액세서리: ["귀걸이", "목걸이", "반지"],
    노트: ["하드커버", "스프링", "리필용지"],
    펜: ["볼펜", "만년필", "마카"],
    데스크정리: ["펜꽂이", "정리함", "북엔드"],
    화분: ["토분", "세라믹", "콘크리트"],
    수경용품: ["유리병", "수경세트", "영양제"],
    가드닝도구: ["삽", "분무기", "장갑"],
  } as Record<string, string[]>,
};

// 데모 AI 설명 샘플
const AI_DESC_SAMPLES = [
  "핸드메이드 감성의 따뜻한 질감을 담은 제품입니다. 집안 어디에 두어도 편안한 포인트가 됩니다.",
  "친환경 소재를 사용해 부드럽고 견고합니다. 일상에서 자주 쓰이는 용도로 설계했어요.",
  "선물용으로도 좋고, 소장가치가 높은 디자인입니다. 작은 디테일까지 정성스럽게 완성했습니다.",
];

// 빈 폼 생성기
const createEmptyProductForm = (productNumber = 1): ProductForm => ({
  id: crypto.randomUUID(),
  productNumber,
  name: "",
  price: "",
  aiPrice: "",
  desc: "",
  aiDesc: "",
  images: [],
  stock: "",
  categoryLarge: "",
  categoryMiddle: "",
  categorySmall: "",
  blogOptions: {
    font: "Noto Sans KR",
    bold: false,
    italic: false,
    strike: false,
    divider: false,
    quote: false,
    bullet: "none",
    indent: "none",
    table: false,
    image: false,
    link: false,
    code: false,
    customCB: false,
  },
});

// 숫자 가드
const guardInt = (v: string) => {
  if (!v) return "";
  const n = Number(v.replace(/[^\d]/g, ""));
  if (Number.isNaN(n)) return "";
  if (n < 0) return 0;
  if (n >= MAX_NUM) return MAX_NUM - 1;
  return n;
};

const ProductInsert: FC = () => {
  const navigate = useNavigate();
  const { storeUrl = "" } = useParams<Params>();

  // 다중 상품 폼
  const [forms, setForms] = useState<ProductForm[]>([createEmptyProductForm(1)]);

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
      const filtered = prev.filter((f) => f.id !== formId);
      return filtered.map((f, idx) => ({ ...f, productNumber: idx + 1 }));
    });
  };

  // 공통 업데이트
  const updateForm = <K extends keyof ProductForm>(formId: string, key: K, value: ProductForm[K]) => {
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
      }),
    );

    e.target.value = "";
  };

  const removeImage = (formId: string, imageId: string) => {
    setForms((prev) =>
      prev.map((f) => (f.id === formId ? { ...f, images: f.images.filter((img) => img.id !== imageId) } : f)),
    );
  };

  // AI 가격 추천 (데모 로직)
  const genAiPrice = (formId: string) => {
    const target = forms.find((f) => f.id === formId);
    const base = (target?.name.length || 6) * 1200;
    const randomized = Math.round((base + Math.random() * 8000) / 100) * 100;
    updateForm(formId, "aiPrice", randomized as number);
  };

  // AI 설명 생성 (데모)
  const genAiDesc = (formId: string) => {
    const pick = AI_DESC_SAMPLES[Math.floor(Math.random() * AI_DESC_SAMPLES.length)];
    updateForm(formId, "aiDesc", pick);
  };

  // 카테고리 체인 (대 → 중 초기화, 중 → 소 초기화)
  const onChangeLarge = (formId: string, large: string) => {
    updateForm(formId, "categoryLarge", large);
    updateForm(formId, "categoryMiddle", "");
    updateForm(formId, "categorySmall", "");
  };
  const onChangeMiddle = (formId: string, middle: string) => {
    updateForm(formId, "categoryMiddle", middle);
    updateForm(formId, "categorySmall", "");
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

    // 저장 처리 (데모)
    console.log("[TEMP] 등록 상품들:", forms);
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

          {/* 사용 가이드 (요약) */}
          <details className="rounded-xl border bg-gray-50 open:bg-white">
            <summary className="cursor-pointer px-4 py-3 text-sm font-medium">입력 가이드</summary>
            <div className="px-4 pb-4 text-sm text-gray-600 leading-relaxed">
              1) 상품 사진은 최소 1장, 최대 3장까지 업로드할 수 있습니다.
              <br />
              2) 가격은 직접 입력 또는 AI 추천가 중 하나를 선택하세요.
              <br />
              3) AI 설명 버튼으로 기본 소개문을 자동 채울 수 있습니다.
              <br />
              4) 블로그 API 옵션은 실제 연동 시 포맷팅 요소로 활용됩니다.
              <br />5) + 버튼으로 동일한 입력 폼을 추가하고, 각 카드의 삭제 버튼으로 갯수를 조정하세요.
            </div>
          </details>

          {/* 폼 목록 */}
          {forms.map((form) => {
            const middles = form.categoryLarge ? CATEGORY_OPTIONS.middle[form.categoryLarge] ?? [] : [];
            const smalls = form.categoryMiddle ? CATEGORY_OPTIONS.small[form.categoryMiddle] ?? [] : [];

            return (
              <section key={form.id} className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-6 lg:p-8">
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
                      onChange={(e) => updateForm(form.id, "name", e.target.value)}
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
                          onChange={(e) => updateForm(form.id, "price", guardInt(e.target.value) as number | "")}
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
                            value={form.aiPrice ? `${Number(form.aiPrice).toLocaleString()} 원` : ""}
                          />
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500">
                      * 직접 입력 또는 AI 추천가 중 하나를 사용하세요. (저장 시 실제 저장가로 결정)
                    </p>
                  </div>

                  {/* 4) 상품 설명: 직접 입력 + AI 설명 */}
                  <div className="grid gap-4">
                    <label className="grid gap-1">
                      <span className="text-sm font-medium">상품 설명 (직접 입력)</span>
                      <textarea
                        className="border rounded-md px-3 py-2 min-h-[120px]"
                        placeholder="소재, 크기, 제작 과정, 관리 방법 등을 자세히 적어주세요."
                        value={form.desc}
                        onChange={(e) => updateForm(form.id, "desc", e.target.value)}
                      />
                    </label>

                    <div className="grid gap-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">AI 상품 설명 멘트</span>
                        <button
                          type="button"
                          className="px-3 py-1.5 rounded-md border text-sm"
                          onClick={() => genAiDesc(form.id)}
                        >
                          생성하기
                        </button>
                      </div>
                      <textarea
                        className="border rounded-md px-3 py-2 min-h-[100px]"
                        placeholder="'생성하기'를 누르면 임시 설명이 채워집니다."
                        value={form.aiDesc}
                        onChange={(e) => updateForm(form.id, "aiDesc", e.target.value)}
                      />
                    </div>

                    {/* 블로그 API 옵션 (요약 토글/선택) */}
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
                              updateForm(form.id, "blogOptions", { ...form.blogOptions, font: e.target.value })
                            }
                          >
                            <option>Noto Sans KR</option>
                            <option>Pretendard</option>
                            <option>Jua</option>
                          </select>
                        </div>

                        <div className="flex flex-wrap gap-3 text-sm">
                          {[
                            ["bold", "볼드"],
                            ["italic", "이탤릭"],
                            ["strike", "중간선"],
                            ["divider", "구분선"],
                            ["quote", "인용"],
                            ["table", "표"],
                            ["image", "사진"],
                            ["link", "링크"],
                            ["code", "코드"],
                            ["customCB", "CB?"],
                          ].map(([key, label]) => {
                            const k = key as keyof ProductForm["blogOptions"];
                            return (
                              <label key={key} className="inline-flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={Boolean(form.blogOptions[k])}
                                  onChange={(e) =>
                                    updateForm(form.id, "blogOptions", {
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
                                updateForm(form.id, "blogOptions", {
                                  ...form.blogOptions,
                                  bullet: e.target.value as ProductForm["blogOptions"]["bullet"],
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
                                updateForm(form.id, "blogOptions", {
                                  ...form.blogOptions,
                                  indent: e.target.value as ProductForm["blogOptions"]["indent"],
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
                          * 실제 블로그 API 연동 시 위 옵션을 기반으로 포맷팅/컴포넌트 삽입이 가능하도록 매핑하면 됩니다.
                        </p>
                      </div>
                    </details>
                  </div>

                  {/* 5) 카테고리 (대/중/소) */}
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
                        <option value="">{form.categoryLarge ? "중분류 선택" : "대분류 먼저 선택"}</option>
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
                        onChange={(e) => updateForm(form.id, "categorySmall", e.target.value)}
                        disabled={!form.categoryMiddle}
                      >
                        <option value="">{form.categoryMiddle ? "소분류 선택" : "중분류 먼저 선택"}</option>
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
                      onChange={(e) => updateForm(form.id, "stock", guardInt(e.target.value) as number | "")}
                    />
                  </label>
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
