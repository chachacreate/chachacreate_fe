// src/domains/seller/areas/class/features/insert/pages/ClassInsert.tsx
import type { FC, ChangeEvent, MouseEvent } from 'react';
import { useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { post } from '@src/libs/request';
import Header from '@src/shared/areas/layout/features/header/Header';
import SellerSidenavbar from '@src/shared/areas/navigation/features/sidenavbar/seller/SellerSidenavbar';
import DaumPostcodeEmbed from 'react-daum-postcode';
import EditorAPI, {
  type EditorHandle,
} from '@src/domains/seller/areas/class/features/insert/components/EditorAPI';
import api from '@src/libs/apiService';

type ScheduleRow = {
  id: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  intervalMin: number; // 30/60/90/120...
};

type ClassForm = {
  id: string;
  classNumber: number;
  title: string;
  desc: string;
  aiDesc: string;
  capacity: number | '';
  price: number | '';
  postcode: string;
  address: string;
  addressDetail: string;
  images: { id: string; file?: File; url: string }[];
  schedules: ScheduleRow[];
  holidays: string[];
  reservationNotes: string;
};

const MAX_NUM = 1_000_000_000_000; // 1조
const AI_SAMPLES = [
  '초보자도 따라오기 쉬운 도자기 원데이 클래스입니다. 기본 컵을 만들어보고 유약 색상도 선택해요.',
  '직접 만든 라탄 트레이로 공간에 포인트를 더해보세요. 안전한 재료와 친절한 가이드로 함께 합니다.',
  '가죽 소품 입문반: 카드지갑을 시작으로 스티칭 기초를 익힙니다. 선착순 소수정예!',
  '플라워 클래스: 제철 꽃으로 컬러 조합과 꽃다루는 법을 배워봅니다. 초보 환영!',
];

const timeOptions = Array.from({ length: 48 }, (_, i) => {
  const hh = String(Math.floor(i / 2)).padStart(2, '0');
  const mm = i % 2 === 0 ? '00' : '30';
  return `${hh}:${mm}`;
});
const intervalOptions = [30, 60, 90, 120, 150, 180];

const DEFAULT_RESERVATION_NOTES = `<취소 환불 정책>

1. 클래스 예정일 14일 전까지 취소: 계약금 전액 환급
2. 클래스 예정일 13일 전까지 취소: 총 이용료의 20% 공제 후 환급
3. 클래스 예정일 12일 전까지 취소: 총 이용료의 30% 공제 후 환급
4. 클래스 예정일 10-11일 전까지 취소: 총 이용료의 50%공제 후 환급
5. 클래스 예정일 8-9일 전까지 취소: 총 이용료의 70% 공제 후 환급
6. 클래스 예정일 일주일 내 취소: 총 이용료의 100% 위약금 부과

☆ 날짜 및 시간 변경은 최소 6일 전까지 가능하며, 일주일 전 취소는 어려운 점 양해 부탁드립니다 ☆

<클래스 관련 자주 묻는 질문>

Q. 지각 관련 규칙이 있나요?

A.

Q. 공방 위치는 어디인가요?

A.

Q. 공방 전용 주차장이 있나요?

A.

Q. 당일 예약도 가능한가요?

A.

Q. 키즈는 몇 살부터 진행 가능한가요? 보호자 동반 필수인가요?

A.

Q. 클래스 소요시간은 어떻게 되나요?

A. 

Q. 완성 작품은 당일 픽업 가능한가요?

A.
`;

const createEmptyForm = (classNumber: number = 1): ClassForm => ({
  id: crypto.randomUUID(),
  classNumber,
  title: '',
  desc: '',
  aiDesc: '',
  capacity: '',
  price: '',
  postcode: '',
  address: '',
  addressDetail: '',
  images: [],
  schedules: [
    {
      id: crypto.randomUUID(),
      startDate: '',
      endDate: '',
      startTime: '10:00',
      endTime: '18:00',
      intervalMin: 60,
    },
  ],
  holidays: [],
  reservationNotes: DEFAULT_RESERVATION_NOTES,
});

const ClassInsert: FC = () => {
  const navigate = useNavigate();
  const { storeUrl = 'store' } = useParams();

  const editorRefs = useRef<Record<string, EditorHandle | null>>({});

  // ✅ 판매자 이력 여부 (임시: true → 오버레이 숨김)
  const hasResume = true;

  // 여러 개의 클래스 폼
  const [classForms, setClassForms] = useState<ClassForm[]>([createEmptyForm(1)]);
  const [classCounter, setClassCounter] = useState(1);

  // 우편번호 모달
  const [isPostcodeOpen, setIsPostcodeOpen] = useState(false);
  const [currentFormIndex, setCurrentFormIndex] = useState(0);

  // 각 폼별 임시 휴일 입력
  const [pendingHolidays, setPendingHolidays] = useState<{ [formId: string]: string }>({});

  // 설명 이미지 저장
  const [editorImageUrls, setEditorImageUrls] = useState<string[]>([]);

  // AI 설명 생성 로딩 상태 추가
  const [isLoadingAiDesc, setIsLoadingAiDesc] = useState<Record<string, boolean>>({});

  // 새 폼 추가
  const addNewForm = () => {
    setClassForms((prev) => {
      const nextNo = prev.length + 1;
      const nextForm = { ...createEmptyForm(nextNo), classNumber: nextNo };
      return [nextForm, ...prev];
    });
    setClassCounter((c) => c + 1);
  };

  // 폼 삭제 (총 개수 -1, 번호 재정렬)
  const removeForm = (formId: string) => {
    setClassForms((prev) => {
      if (prev.length === 1) return prev; // 최소 1개 유지

      // ⬇️ 에디터 ref도 같이 정리 (폼 삭제 시 누수 방지)
      delete editorRefs.current[formId];
      setIsLoadingAiDesc((prevDesc) => {
        const { [formId]: _, ...rest } = prevDesc;
        return rest;
      });

      const filtered = prev.filter((f) => f.id !== formId);
      const renumbered = filtered.map((f, i) => ({ ...f, classNumber: i + 1 }));
      setClassCounter(renumbered.length);
      return renumbered;
    });
  };

  // 폼 업데이트
  const updateForm = <K extends keyof ClassForm>(formId: string, key: K, value: ClassForm[K]) => {
    setClassForms((prev) =>
      prev.map((form) => (form.id === formId ? { ...form, [key]: value } : form))
    );
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

  // 이미지 추가/삭제
  const onPickImages = (formId: string, e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !files.length) return;

    const f = files[0];
    const next = {
      id: crypto.randomUUID(),
      file: f,
      url: URL.createObjectURL(f),
    };

    updateForm(formId, 'images', [next]);
    e.target.value = '';
  };

  const removeImage = (formId: string, imageId: string) => {
    const form = classForms.find((f) => f.id === formId);
    if (!form) return;

    updateForm(
      formId,
      'images',
      form.images.filter((i) => i.id !== imageId)
    );
  };

  // // AI 설명 생성
  // const genAiDesc = (formId: string) => {
  //   const pick = AI_SAMPLES[Math.floor(Math.random() * AI_SAMPLES.length)];
  //   updateForm(formId, 'aiDesc', pick);
  // };

  // AI 설명 생성 - 로딩 상태 추가
  const genAiDesc = async (formId: string) => {
    const form = classForms.find((f) => f.id === formId);
    if (!form) return;
    if (!form.title.trim()) return alert('클래스명을 먼저 입력해 주세요.');

    setIsLoadingAiDesc((prev) => ({ ...prev, [formId]: true }));

    try {
      const resp = await api.post('/ai/class-description', {
        title: form.title,
        prompt: form.aiDesc,
      });
      const content = resp.data?.content ?? resp.data?.data ?? '';

      if (!content) throw new Error('AI 응답이 비었습니다.');

      // ✅ 이 폼의 에디터에만 반영
      editorRefs.current[formId]?.setMarkdown(content);

      // (선택) 상태에도 저장
      updateForm(formId, 'desc', content);
    } catch (e: any) {
      alert(e?.response?.data?.message || e?.message || 'AI 설명 생성 실패');
    } finally {
      setIsLoadingAiDesc((prev) => ({ ...prev, [formId]: false }));
    }
  };

  // URL 추출 유틸 추가 (최종 이미지만 저장)
  const extractImageUrlsFromHtml = (html: string): string[] => {
    if (!html) return [];
    const urls: string[] = [];
    const re = /<img[^>]*src=["']([^"']+)["'][^>]*>/g;
    for (const m of html.matchAll(re)) urls.push(m[1]);
    // 중복 제거
    return Array.from(new Set(urls));
  };

  // 스케줄 업데이트
  const updateSchedule = <K extends keyof ScheduleRow>(
    formId: string,
    scheduleId: string,
    key: K,
    value: ScheduleRow[K]
  ) => {
    const form = classForms.find((f) => f.id === formId);
    if (!form) return;

    const updatedSchedules = form.schedules.map((s) =>
      s.id === scheduleId ? { ...s, [key]: value } : s
    );

    updateForm(formId, 'schedules', updatedSchedules);
  };

  // 휴일 관리
  const addHoliday = (formId: string) => {
    const pending = pendingHolidays[formId];
    if (!pending) return;

    const form = classForms.find((f) => f.id === formId);
    if (!form) return;

    if (!form.holidays.includes(pending)) {
      updateForm(formId, 'holidays', [...form.holidays, pending].sort());
    }

    setPendingHolidays((prev) => ({ ...prev, [formId]: '' }));
  };

  const removeHoliday = (formId: string, date: string) => {
    const form = classForms.find((f) => f.id === formId);
    if (!form) return;

    updateForm(
      formId,
      'holidays',
      form.holidays.filter((d) => d !== date)
    );
  };

  // 우편번호 검색
  const openPostcode = (formIndex: number) => {
    setCurrentFormIndex(formIndex);
    setIsPostcodeOpen(true);
  };

  // 제출

  const onSubmit = async (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();

    // === 기존 유효성 검사는 그대로 유지 ===
    for (let i = 0; i < classForms.length; i++) {
      const form = classForms[i];
      const formNum = i + 1;
      if (!form.title.trim()) {
        alert(`${formNum}번째 클래스의 클래스명을 입력해 주세요.`);
        return;
      }
      if (!form.address.trim()) {
        alert(`${formNum}번째 클래스의 장소(주소)를 입력해 주세요.`);
        return;
      }
      if (!form.capacity || Number(form.capacity) <= 0) {
        alert(`${formNum}번째 클래스의 최대 참여 인원을 1 이상으로 입력해 주세요.`);
        return;
      }
      if (!form.price || Number(form.price) <= 0) {
        alert(`${formNum}번째 클래스의 회당 가격을 1 이상으로 입력해 주세요.`);
        return;
      }
      if (form.schedules.some((s) => !s.startDate || !s.endDate)) {
        alert(`${formNum}번째 클래스의 일정 시작/종료 날짜를 입력해 주세요.`);
        return;
      }
      // (선택) 썸네일 최소 1장 가드 – 백엔드도 검사하지만 프론트에서 선제 차단
      if ((form.images ?? []).filter((i) => i.file).length < 1) {
        alert(`${formNum}번째 클래스의 썸네일 이미지를 1장 이상 추가해 주세요.`);
        return;
      }
    }

    // ---------- 폼 → DTO ----------
    const toHHMMSS = (hhmm?: string) => (hhmm && hhmm.length === 5 ? `${hhmm}:00` : hhmm || '');
    const toDateTime = (date?: string, time?: string) =>
      date ? `${date} ${toHHMMSS(time || '00:00')}` : '';

    const cores = classForms.map((f) => {
      const s = f.schedules[0];
      // 에디터(한 개 사용 가정)에서 마크다운 읽기
      const html = editorRefs.current[f.id]?.getHTML() || '';
      const detailImageUrls = extractImageUrlsFromHtml(html);

      return {
        title: f.title?.trim() || '',
        detail: html,
        detailImageUrls,
        price: typeof f.price === 'number' ? f.price : undefined,
        guideline: f.reservationNotes?.trim() || '',
        participant: typeof f.capacity === 'number' ? f.capacity : undefined,
        postNum: f.postcode || '',
        addressRoad: f.address || '',
        addressDetail: f.addressDetail || '',
        addressExtra: '',
        startDate: toDateTime(s?.startDate, s?.startTime), // "yyyy-MM-dd HH:mm:ss"
        endDate: toDateTime(s?.endDate, s?.endTime),
        startTime: toHHMMSS(s?.startTime), // "HH:mm:ss"
        endTime: toHHMMSS(s?.endTime),
        timeInterval: s?.intervalMin ?? 60,
      };
    });

    // ---------- FormData ----------
    const fd = new FormData();
    fd.append('clazzes', JSON.stringify(cores));
    classForms.forEach((f, idx) => {
      (f.images ?? [])
        .map((i) => i.file)
        .filter((file): file is File => !!file)
        .forEach((file) => fd.append(`thumbnails_${idx}`, file));
    });

    // (선택) 디버깅: FormData 내용 확인
    // for (const [k, v] of fd.entries()) console.log('FD:', k, v);

    try {
      const res = await post<number[]>(`/seller/${storeUrl}/classes`, fd);

      // ✅ 진짜 성공인지 판정: id 배열이 왔는지 확인
      const ids = res.data;
      if (!Array.isArray(ids) || ids.length === 0 || !ids.every((n) => typeof n === 'number')) {
        // 서버가 에러를 메시지로 보냈는데 200으로 감쌌을 수도 있음 → 에러로 처리
        throw new Error(res.message || '서버가 생성된 ID를 반환하지 않았습니다.');
      }

      // console.log('✅ 생성된 클래스 ID들:', ids);
      alert(`클래스 ${ids.length}개가 등록되었습니다.`);

      // 성공 시에만 리셋/이동
      setClassForms([createEmptyForm(1)]);
      setPendingHolidays({});
      setClassCounter(1);
      navigate(`/seller/${storeUrl}/class/list`);
    } catch (err: any) {
      console.error(err);
      const msg = err?.response?.data?.message || err?.message || '업로드 실패';
      alert(msg);
    }
  };

  return (
    <>
      <Header />

      <SellerSidenavbar>
        <div className="space-y-6 sm:space-y-8 relative">
          {/* 헤더 - 모바일에서 세로 배치 */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold">클래스 등록</h1>
              <p className="mt-1 text-sm text-gray-500">총 {classForms.length}개 클래스</p>
            </div>
            <button
              type="button"
              onClick={addNewForm}
              className="w-full sm:w-auto px-4 py-2 rounded-lg bg-[#2D4739] text-white font-medium hover:opacity-90"
            >
              + 클래스 추가
            </button>
          </div>

          {/* 클래스 폼들 */}
          {classForms.map((form, formIndex) => {
            const addressSummary =
              form.address && form.addressDetail
                ? `${form.address} ${form.addressDetail}`
                : form.address || '';

            return (
              <section
                key={form.id}
                className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-6 lg:p-8"
              >
                {/* 클래스 헤더 - 모바일에서 세로 배치 */}
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-6">
                  <div>
                    <h2 className="text-lg font-bold">클래스 {form.classNumber}</h2>
                    <p className="text-sm text-gray-500 break-all">storeUrl: {storeUrl}</p>
                  </div>
                  {classForms.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeForm(form.id)}
                      className="w-full sm:w-auto px-3 py-1.5 rounded-md border border-red-200 text-red-600 text-sm hover:bg-red-50 shrink-0"
                    >
                      삭제
                    </button>
                  )}
                </div>

                <div className="grid gap-5">
                  {/* 사진 추가 - 반응형 개선 */}
                  <div className="grid gap-2">
                    <span className="text-sm font-medium">클래스 사진</span>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                      <label className="w-full sm:w-auto px-3 py-2 rounded-md border text-sm cursor-pointer hover:bg-gray-50 text-center">
                        {form.images.length > 0 ? '사진 변경' : '+ 사진 추가'}
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => onPickImages(form.id, e)}
                          className="hidden"
                        />
                      </label>
                      <span className="text-xs text-gray-500 text-center sm:text-left">
                        현재 {form.images.length}/1
                      </span>
                    </div>
                  </div>

                  {/* 이미지 미리보기 */}
                  {form.images.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
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

                  {/* 클래스명 - 전체 너비 */}
                  <div className="grid gap-1">
                    <label className="text-sm font-medium">클래스명</label>
                    <input
                      id="class-name"
                      className="border rounded-md px-3 py-2 w-full"
                      placeholder="예) 도자기 원데이 클래스"
                      value={form.title}
                      onChange={(e) => updateForm(form.id, 'title', e.target.value)}
                    />
                  </div>

                  {/* 장소(우편번호/주소) - 반응형 개선 */}
                  <div className="grid gap-3">
                    <span className="text-sm font-medium">클래스 장소</span>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        className="border rounded-md px-3 py-2 flex-1 sm:flex-none sm:w-40"
                        placeholder="우편번호"
                        value={form.postcode}
                        readOnly
                      />
                      <button
                        type="button"
                        className="w-full sm:w-auto px-3 py-2 rounded-md border hover:bg-gray-50 shrink-0"
                        onClick={() => openPostcode(formIndex)}
                      >
                        우편번호 찾기
                      </button>
                    </div>
                    <input
                      className="border rounded-md px-3 py-2 w-full"
                      placeholder="기본 주소"
                      value={form.address}
                      readOnly
                    />
                    <input
                      className="border rounded-md px-3 py-2 w-full"
                      placeholder="상세 주소"
                      value={form.addressDetail}
                      onChange={(e) => updateForm(form.id, 'addressDetail', e.target.value)}
                    />
                    {addressSummary && (
                      <p className="text-xs text-gray-500 break-all">
                        주소 미리보기: {addressSummary}
                      </p>
                    )}
                  </div>

                  {/* 상세설명 - 로딩 오버레이 추가 */}
                  <fieldset className="grid gap-3 relative">
                    <legend className="text-sm font-medium">클래스 상세설명</legend>

                    {/* AI 로딩 오버레이 */}
                    {isLoadingAiDesc[form.id] && (
                      <div className="absolute inset-0 bg-white bg-opacity-80 backdrop-blur-sm flex items-center justify-center z-50 rounded-lg">
                        <div className="flex flex-col items-center gap-3 p-6">
                          <img
                            src="/images/product_insert/AI_loading.gif"
                            alt="AI 생성 중..."
                            className="w-32 h-32 object-contain"
                          />
                          <div className="text-sm font-medium text-gray-700">
                            AI가 클래스 설명을 생성하고 있습니다...
                          </div>
                          <div className="text-xs text-gray-500">잠시만 기다려주세요</div>
                        </div>
                      </div>
                    )}

                    {/* 에디터를 반응형 컨테이너로 감싸기 */}
                    <div className="w-full overflow-hidden">
                      <EditorAPI
                        ref={(el) => {
                          editorRefs.current[form.id] = el;
                        }}
                        initialValue={form.desc ?? ''}
                      />
                    </div>
                  </fieldset>

                  {/* AI 설명 - 로딩 상태 추가 */}
                  <div className="grid gap-2">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <span className="text-sm font-medium">AI 클래스 설명 프롬프트/메모</span>
                      <button
                        type="button"
                        className="w-full sm:w-auto px-3 py-1.5 rounded-md border text-sm hover:bg-gray-50 shrink-0 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        onClick={() => genAiDesc(form.id)}
                        disabled={isLoadingAiDesc[form.id]}
                      >
                        {isLoadingAiDesc[form.id] && (
                          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-500"></div>
                        )}
                        {isLoadingAiDesc[form.id] ? 'AI 생성 중...' : 'AI 설명 생성'}
                      </button>
                    </div>
                    <textarea
                      className="border rounded-md px-3 py-2 min-h-[100px] w-full resize-y disabled:bg-gray-50 disabled:cursor-not-allowed"
                      placeholder="핵심 특징, 클래스 분위기, 난이도 등 키워드를 남겨 주세요."
                      value={form.aiDesc}
                      onChange={(e) => updateForm(form.id, 'aiDesc', e.target.value)}
                      disabled={isLoadingAiDesc[form.id]}
                    />
                    <p className="text-xs text-gray-500">
                      * 생성 후 내용은 위 에디터에 자동 반영됩니다.
                    </p>
                  </div>

                  {/* 최대 인원 / 가격 - 모바일에서 세로 배치 */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="grid gap-1">
                      <label className="text-sm font-medium">클래스 최대 참여 인원</label>
                      <input
                        inputMode="numeric"
                        className="border rounded-md px-3 py-2 w-full"
                        placeholder="예) 8"
                        value={form.capacity}
                        onChange={(e) =>
                          updateForm(form.id, 'capacity', guardInt(e.target.value) as number | '')
                        }
                      />
                    </div>
                    <div className="grid gap-1">
                      <label className="text-sm font-medium">클래스 회당 가격(원)</label>
                      <input
                        inputMode="numeric"
                        className="border rounded-md px-3 py-2 w-full"
                        placeholder="예) 55000"
                        value={form.price}
                        onChange={(e) =>
                          updateForm(form.id, 'price', guardInt(e.target.value) as number | '')
                        }
                      />
                    </div>
                  </div>

                  {/* 가능 날짜/시간 - 모바일 최적화 */}
                  <div className="grid gap-3">
                    <span className="text-sm font-medium">클래스 가능 날짜/시간</span>
                    <div className="space-y-3">
                      {form.schedules.map((s) => (
                        <div key={s.id} className="rounded-xl border p-3 sm:p-4 space-y-3">
                          {/* 날짜 설정 - 모바일에서 세로 배치 */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="grid gap-1">
                              <label className="text-xs sm:text-sm font-medium">시작 날짜</label>
                              <input
                                type="date"
                                className="border rounded-md px-3 py-2 w-full"
                                value={s.startDate}
                                onChange={(e) =>
                                  updateSchedule(form.id, s.id, 'startDate', e.target.value)
                                }
                              />
                            </div>

                            <div className="grid gap-1">
                              <label className="text-xs sm:text-sm font-medium">종료 날짜</label>
                              <input
                                type="date"
                                className="border rounded-md px-3 py-2 w-full"
                                value={s.endDate}
                                onChange={(e) =>
                                  updateSchedule(form.id, s.id, 'endDate', e.target.value)
                                }
                              />
                            </div>
                          </div>

                          {/* 시간 설정 - 모바일에서 세로 배치 */}
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="grid gap-1">
                              <label className="text-xs sm:text-sm font-medium">시작 시간</label>
                              <select
                                className="border rounded-md px-3 py-2 w-full"
                                value={s.startTime}
                                onChange={(e) =>
                                  updateSchedule(form.id, s.id, 'startTime', e.target.value)
                                }
                              >
                                {timeOptions.map((t) => (
                                  <option key={`st-${s.id}-${t}`} value={t}>
                                    {t}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div className="grid gap-1">
                              <label className="text-xs sm:text-sm font-medium">종료 시간</label>
                              <select
                                className="border rounded-md px-3 py-2 w-full"
                                value={s.endTime}
                                onChange={(e) =>
                                  updateSchedule(form.id, s.id, 'endTime', e.target.value)
                                }
                              >
                                {timeOptions.map((t) => (
                                  <option key={`et-${s.id}-${t}`} value={t}>
                                    {t}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div className="grid gap-1">
                              <label className="text-xs sm:text-sm font-medium">
                                시간 간격(분)
                              </label>
                              <select
                                className="border rounded-md px-3 py-2 w-full"
                                value={s.intervalMin}
                                onChange={(e) =>
                                  updateSchedule(
                                    form.id,
                                    s.id,
                                    'intervalMin',
                                    Number(e.target.value)
                                  )
                                }
                              >
                                {intervalOptions.map((m) => (
                                  <option key={`iv-${s.id}-${m}`} value={m}>
                                    {m}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 휴일 설정 - 반응형 개선 */}
                  <div className="grid gap-2">
                    <span className="text-sm font-medium">클래스 휴일 설정</span>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="date"
                        className="border rounded-md px-3 py-2 flex-1 sm:flex-none sm:w-auto"
                        value={pendingHolidays[form.id] || ''}
                        onChange={(e) =>
                          setPendingHolidays((prev) => ({ ...prev, [form.id]: e.target.value }))
                        }
                      />
                      <button
                        type="button"
                        className="w-full sm:w-auto px-3 py-2 rounded-md border hover:bg-gray-50 shrink-0"
                        onClick={() => addHoliday(form.id)}
                      >
                        + 휴일 추가
                      </button>
                    </div>
                    {form.holidays.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {form.holidays.map((d) => (
                          <span
                            key={d}
                            className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm"
                          >
                            {d}
                            <button
                              type="button"
                              className="text-gray-500 hover:text-gray-900"
                              onClick={() => removeHoliday(form.id, d)}
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* 예약 관련 주의사항 */}
                  <div className="grid gap-1">
                    <label className="text-sm font-medium">예약 관련 주의사항</label>
                    <textarea
                      className="border rounded-md px-3 py-2 min-h-[100px] w-full resize-y"
                      placeholder="환불 규정, 지각/결석 안내 등"
                      value={form.reservationNotes}
                      onChange={(e) => updateForm(form.id, 'reservationNotes', e.target.value)}
                    />
                  </div>
                </div>
              </section>
            );
          })}

          {/* 하단 버튼 - 모바일에서 더 나은 UX */}
          <div className="flex flex-col sm:flex-row gap-3 sticky bottom-4 bg-white p-4 rounded-xl border shadow-lg">
            <button
              type="button"
              className="w-full sm:flex-1 px-6 py-3 rounded-lg bg-[#2D4739] text-white font-medium hover:opacity-90 order-1 sm:order-none"
              onClick={onSubmit}
            >
              {classForms.length}개 클래스 모두 등록
            </button>
            <button
              type="button"
              className="w-full sm:w-auto px-6 py-3 rounded-lg border font-medium hover:bg-gray-50 order-2 sm:order-none shrink-0"
              onClick={() => {
                setClassForms([createEmptyForm()]);
                setPendingHolidays({});
                setClassCounter(1);
              }}
            >
              초기화
            </button>
          </div>

          {/* 이력 안내 오버레이 */}
          <div
            className={[
              'absolute inset-0 flex justify-center p-4 sm:p-6 transition-opacity',
              hasResume
                ? 'opacity-0 pointer-events-none'
                : 'opacity-100 items-start sm:items-center pt-12 sm:pt-0',
            ].join(' ')}
            aria-hidden={hasResume}
          >
            <div className="w-full max-w-[720px] rounded-2xl border bg-white/85 backdrop-blur-md shadow-xl p-4 sm:p-6">
              <h3 className="text-base sm:text-lg font-semibold">판매자 이력 등록이 필요해요</h3>
              <p className="mt-2 text-sm sm:text-base text-gray-700">
                클래스 등록 전에 판매자 이력이 등록되어 있어야 합니다. 먼저 이력 페이지에서
                프로필/경력 정보를 입력해 주세요.
              </p>
              <div className="mt-4 flex flex-col sm:flex-row gap-2 sm:gap-3">
                <button
                  onClick={() => navigate(`/seller/${storeUrl}/resumes`)}
                  className="w-full sm:w-auto px-4 py-2 rounded-md bg-[#2D4739] text-white"
                >
                  이력 등록하러 가기
                </button>
                <button
                  onClick={() => window.history.back()}
                  className="w-full sm:w-auto px-4 py-2 rounded-md border"
                >
                  뒤로가기
                </button>
              </div>
            </div>
          </div>
        </div>
      </SellerSidenavbar>

      {/* 우편번호 모달 */}
      {isPostcodeOpen && (
        <div className="fixed inset-0 z-[100] flex items-start sm:items-center justify-center p-4 bg-black/40">
          <div className="w-full max-w-[520px] rounded-xl overflow-hidden bg-white">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <h4 className="font-semibold">우편번호 찾기</h4>
              <button className="text-gray-500" onClick={() => setIsPostcodeOpen(false)}>
                ×
              </button>
            </div>
            <DaumPostcodeEmbed
              onComplete={(data) => {
                const currentForm = classForms[currentFormIndex];
                if (currentForm) {
                  updateForm(currentForm.id, 'postcode', data.zonecode);
                  updateForm(currentForm.id, 'address', data.address);
                }
                setIsPostcodeOpen(false);
              }}
              style={{ width: '100%', height: '420px' }}
            />
          </div>
        </div>
      )}
    </>
  );
};

export default ClassInsert;
