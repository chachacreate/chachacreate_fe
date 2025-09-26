import type { FC, ChangeEvent, MouseEvent } from 'react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import Header from '@src/shared/areas/layout/features/header/Header';
import SellerSidenavbar from '@src/shared/areas/navigation/features/sidenavbar/seller/SellerSidenavbar';

import DaumPostcodeEmbed from 'react-daum-postcode';
import EditorAPI, {
  type EditorHandle,
} from '@src/domains/seller/areas/class/features/insert/components/EditorAPI';
import api from '@src/libs/apiService';
import { get, patch } from '@src/libs/request';

type Params = { storeUrl: string; classId: string };

type ScheduleRow = {
  id: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  intervalMin: number;
};

type ClassForm = {
  id: string;
  title: string;
  desc: string;
  aiDesc: string;
  capacity: number | '';
  price: number | '';
  postcode: string;
  address: string;
  addressDetail: string;
  image: { id: string; file?: File; url: string; serverImageId?: number } | null;
  schedules: ScheduleRow[];
  holidays: string[];
  reservationNotes: string;
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
`;

const createEmptyForm = (): ClassForm => ({
  id: crypto.randomUUID(),
  title: '',
  desc: '',
  aiDesc: '',
  capacity: '',
  price: '',
  postcode: '',
  address: '',
  addressDetail: '',
  image: null,
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

const ClassEdit: FC = () => {
  const navigate = useNavigate();
  const { storeUrl = '', classId = '' } = useParams<Params>();

  const [form, setForm] = useState<ClassForm>(createEmptyForm());
  const editorRef = useRef<EditorHandle | null>(null);

  const [isPostcodeOpen, setIsPostcodeOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // 기존 서버 썸네일 삭제 여부
  const [deleteServerImage, setDeleteServerImage] = useState(false);

  // AI 설명 생성 로딩 상태 추가
  const [isLoadingAiDesc, setIsLoadingAiDesc] = useState<boolean>();

  // 엔드포인트 (필요시 상단만 바꿔서 매핑)
  const ENDPOINT_DETAIL = `/seller/${storeUrl}/classes/${classId}`;
  const ENDPOINT_UPDATE = `/seller/${storeUrl}/classes/${classId}`;

  useEffect(() => {
    (async () => {
      if (!classId) return;
      setLoading(true);
      try {
        const response = await get<any>(ENDPOINT_DETAIL, { withCredentials: true });
        const classDetail = response.data?.core ?? {};
        // console.log('클래스 데이터', classDetail);

        // 서버 필드 매핑
        const title = classDetail?.title ?? '';
        const desc = classDetail?.detail ?? '';
        const capacity =
          typeof classDetail?.participant === 'number' ? classDetail.participant : '';
        const price = typeof classDetail?.price === 'number' ? classDetail.price : '';
        const postcode = classDetail?.postNum ?? '';
        const address = classDetail?.addressRoad ?? '';
        const addressDetail = classDetail?.addressDetail ?? '';
        const reservationNotes = classDetail?.guideline ?? DEFAULT_RESERVATION_NOTES;

        // 이미지: thumbnails 배열에서 첫 번째
        const thumb = response.data?.thumbnails?.[0];
        const thumbUrl = thumb?.url ?? '';

        // 스케줄
        const startDate = (classDetail?.startDate || '').slice(0, 10);
        const endDate = (classDetail?.endDate || '').slice(0, 10);
        const toHHMM = (v?: string) => (v && v.length >= 5 ? v.slice(0, 5) : '');
        const startTime = toHHMM(classDetail?.startTime) || '10:00';
        const endTime = toHHMM(classDetail?.endTime) || '18:00';
        const intervalMin = Number(classDetail?.timeInterval ?? 60);

        if (response.status === 200) {
          setForm({
            id: crypto.randomUUID(),
            title,
            desc,
            aiDesc: '',
            capacity,
            price,
            postcode,
            address,
            addressDetail,
            image: thumbUrl
              ? {
                  id: crypto.randomUUID(),
                  url: thumbUrl,
                  serverImageId: undefined, // 서버 이미지 ID는 필요 시 추가
                }
              : null,
            schedules: [
              {
                id: crypto.randomUUID(),
                startDate,
                endDate,
                startTime,
                endTime,
                intervalMin,
              },
            ],
            holidays: [], // holidays 정보가 core 안에 없으면 빈 배열
            reservationNotes,
          });

          // 에디터 초기값
          setTimeout(() => {
            editorRef.current?.setMarkdown?.(desc || '');
          }, 0);
        } else {
          console.error('클래스 정보 조회 실패: ', response.message);
        }
      } catch (error: any) {
        console.error('API 요청 실패: ', error);
        alert(
          error?.response?.data?.message || error?.message || '클래스 정보를 불러오지 못했습니다.'
        );
      } finally {
        setLoading(false);
      }
    })();
  }, [classId, storeUrl]);

  const updateForm = <K extends keyof ClassForm>(key: K, value: ClassForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const updateSchedule = <K extends keyof ScheduleRow>(
    sid: string,
    key: K,
    value: ScheduleRow[K]
  ) => {
    setForm((prev) => ({
      ...prev,
      schedules: prev.schedules.map((s) => (s.id === sid ? { ...s, [key]: value } : s)),
    }));
  };

  const onPickImage = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !files.length) return;
    const f = files[0];
    updateForm('image', { id: crypto.randomUUID(), file: f, url: URL.createObjectURL(f) });
    setDeleteServerImage(false); // 새 파일을 올리면 서버 이미지 삭제 플래그는 의미 없어짐
    e.target.value = '';
  };

  const removeImage = () => {
    // 기존 서버 이미지가 있던 상태라면, 삭제 요청 플래그 세움
    if (form.image?.serverImageId) setDeleteServerImage(true);
    updateForm('image', null);
  };

  // AI 클래스 설명 (Insert와 동일 UX + 로딩 상태 추가)
  const genAiDesc = async () => {
    if (!form.title.trim()) {
      return alert('클래스명을 먼저 입력해 주세요.');
    }

    setIsLoadingAiDesc(true);

    try {
      const resp = await api.post('/ai/class-description', {
        title: form.title,
        prompt: form.aiDesc,
      });

      const content = resp.data?.content ?? resp.data?.data ?? '';
      if (!content) throw new Error('AI 응답이 비었습니다.');

      // 에디터에 반영
      editorRef.current?.setMarkdown(content);

      // 상태에도 반영
      updateForm('desc', content);
    } catch (e: any) {
      alert(e?.response?.data?.message || e?.message || 'AI 설명 생성 실패');
    } finally {
      setIsLoadingAiDesc(false);
    }
  };

  // 제출
  const onSubmit = async (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();

    // 유효성 검사는 Insert와 동일 기준
    if (!form.title.trim()) return alert('클래스명을 입력해 주세요.');
    if (!form.address.trim()) return alert('클래스 장소(주소)를 입력해 주세요.');
    if (!form.capacity || Number(form.capacity) <= 0)
      return alert('최대 참여 인원을 1 이상으로 입력해 주세요.');
    if (!form.price || Number(form.price) <= 0)
      return alert('회당 가격을 1 이상으로 입력해 주세요.');
    const s = form.schedules[0];
    if (!s?.startDate || !s?.endDate) return alert('일정 시작/종료 날짜를 입력해 주세요.');

    const toHHMMSS = (hhmm?: string) => (hhmm && hhmm.length === 5 ? `${hhmm}:00` : hhmm || '');
    const toDateTime = (date?: string, time?: string) =>
      date ? `${date} ${toHHMMSS(time || '00:00')}` : '';

    // 에디터 HTML
    const html = editorRef.current?.getHTML?.() || form.desc || '';

    // DTO
    const core = {
      title: form.title.trim(),
      detail: html,
      detailImageUrls: Array.from(
        new Set(
          (html.match(/<img[^>]*src=["']([^"']+)["'][^>]*>/g) || []).map((tag) => {
            const m = tag.match(/src=["']([^"']+)["']/i);
            return m ? m[1] : '';
          })
        )
      ).filter(Boolean),
      price: typeof form.price === 'number' ? form.price : Number(form.price),
      guideline: form.reservationNotes?.trim() || '',
      participant: typeof form.capacity === 'number' ? form.capacity : Number(form.capacity),
      postNum: form.postcode || '',
      addressRoad: form.address || '',
      addressDetail: form.addressDetail || '',
      addressExtra: '',
      startDate: toDateTime(s?.startDate, s?.startTime),
      endDate: toDateTime(s?.endDate, s?.endTime),
      startTime: toHHMMSS(s?.startTime),
      endTime: toHHMMSS(s?.endTime),
      timeInterval: s?.intervalMin ?? 60,
      holidays: form.holidays ?? [],
      // 이미지 관련 플래그
      deleteThumbnailId: deleteServerImage ? (form.image?.serverImageId ?? null) : null,
    };

    const fd = new FormData();
    fd.append('clazz', new Blob([JSON.stringify(core)], { type: 'application/json' }));
    if (form.image?.file) {
      fd.append('thumbnail', form.image.file);
    }

    try {
      await patch(ENDPOINT_UPDATE, fd);
      alert('클래스 수정이 완료되었습니다.');
      navigate(`/seller/${storeUrl}/class/list`);
    } catch (error: any) {
      console.error('API 요청 실패: ', error);
      const msg =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message ||
        '수정 실패';
      alert(msg);
    }
  };

  return (
    <>
      <Header />

      <SellerSidenavbar>
        <div className="space-y-6 sm:space-y-8">
          {/* 상단 타이틀 (추가와 동일 톤, 추가 버튼 없음) */}
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold">클래스 수정</h1>
              <p className="mt-1 text-sm text-gray-500">
                storeUrl: {storeUrl} · classId: {classId}
              </p>
            </div>
          </div>

          {/* 수정 폼 */}
          <section className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-6 lg:p-8">
            <div className="grid gap-5">
              {/* 썸네일 */}
              <div className="flex flex-wrap gap-2">
                <label className="px-3 py-2 rounded-md border text-sm cursor-pointer hover:bg-gray-50">
                  {form.image ? '사진 변경' : '+ 사진 추가'}
                  <input type="file" accept="image/*" onChange={onPickImage} className="hidden" />
                </label>
                {form.image && (
                  <button
                    type="button"
                    onClick={removeImage}
                    className="px-3 py-2 rounded-md border text-sm hover:bg-gray-50"
                  >
                    삭제
                  </button>
                )}
              </div>

              {form.image && (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  <div className="relative rounded-lg overflow-hidden border">
                    <img src={form.image.url} alt="preview" className="w-full h-40 object-cover" />
                  </div>
                </div>
              )}

              {/* 클래스명 */}
              <label className="grid gap-1">
                <span className="text-sm font-medium">클래스명</span>
                <input
                  className="border rounded-md px-3 py-2"
                  placeholder="예) 도자기 원데이 클래스"
                  value={form.title}
                  onChange={(e) => updateForm('title', e.target.value)}
                />
              </label>

              {/* 장소 */}
              <div className="grid gap-3">
                <span className="text-sm font-medium">클래스 장소</span>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    className="border rounded-md px-3 py-2 sm:w-40"
                    placeholder="우편번호"
                    value={form.postcode}
                    readOnly
                  />
                  <button
                    type="button"
                    className="px-3 py-2 rounded-md border"
                    onClick={() => setIsPostcodeOpen(true)}
                  >
                    우편번호 찾기
                  </button>
                </div>
                <input
                  className="border rounded-md px-3 py-2"
                  placeholder="기본 주소"
                  value={form.address}
                  readOnly
                />
                <input
                  className="border rounded-md px-3 py-2"
                  placeholder="상세 주소"
                  value={form.addressDetail}
                  onChange={(e) => updateForm('addressDetail', e.target.value)}
                />
              </div>

              {/* 상세설명 - 로딩 오버레이 추가 */}
              <fieldset className="grid gap-3 relative">
                <legend className="text-sm font-medium">클래스 상세설명</legend>

                {/* AI 로딩 오버레이 */}
                {isLoadingAiDesc && (
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

                {/* 에디터 */}
                <div className="w-full overflow-hidden">
                  <EditorAPI ref={editorRef} initialValue={form.desc ?? ''} />
                </div>
              </fieldset>

              {/* AI 설명 */}
              <div className="grid gap-2">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <span className="text-sm font-medium">AI 클래스 설명 멘트</span>
                  <button
                    type="button"
                    className="w-full sm:w-auto px-3 py-1.5 rounded-md border text-sm hover:bg-gray-50 shrink-0 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    onClick={genAiDesc}
                    disabled={isLoadingAiDesc}
                  >
                    {isLoadingAiDesc && (
                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-500"></div>
                    )}
                    {isLoadingAiDesc ? 'AI 생성 중...' : '생성하기'}
                  </button>
                </div>
                <textarea
                  className="border rounded-md px-3 py-2 min-h-[100px] w-full resize-y disabled:bg-gray-50 disabled:cursor-not-allowed"
                  placeholder="'생성하기'를 누르면 자동으로 설명이 채워집니다."
                  value={form.aiDesc}
                  onChange={(e) => updateForm('aiDesc', e.target.value)}
                  disabled={isLoadingAiDesc}
                />
                <p className="text-xs text-gray-500">
                  * 생성 후 내용은 위 에디터에 자동 반영됩니다.
                </p>
              </div>

              {/* 최대 인원 / 가격 */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <label className="grid gap-1">
                  <span className="text-sm font-medium">클래스 최대 참여 인원</span>
                  <input
                    inputMode="numeric"
                    className="border rounded-md px-3 py-2"
                    placeholder="예) 8"
                    value={form.capacity}
                    onChange={(e) =>
                      updateForm('capacity', guardInt(e.target.value) as number | '')
                    }
                  />
                </label>
                <label className="grid gap-1">
                  <span className="text-sm font-medium">클래스 회당 가격(원)</span>
                  <input
                    inputMode="numeric"
                    className="border rounded-md px-3 py-2"
                    placeholder="예) 55000"
                    value={form.price}
                    onChange={(e) => updateForm('price', guardInt(e.target.value) as number | '')}
                  />
                </label>
              </div>

              {/* 가능 날짜/시간 */}
              <div className="grid gap-3">
                <span className="text-sm font-medium">클래스 가능 날짜/시간</span>
                {form.schedules.map((s) => (
                  <div
                    key={s.id}
                    className="rounded-xl border p-3 sm:p-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5 lg:items-end"
                  >
                    <label className="grid gap-1 lg:col-span-1">
                      <span className="text-xs sm:text-sm font-medium">시작 날짜</span>
                      <input
                        type="date"
                        className="border rounded-md px-3 py-2"
                        value={s.startDate}
                        onChange={(e) => updateSchedule(s.id, 'startDate', e.target.value)}
                      />
                    </label>

                    <label className="grid gap-1 lg:col-span-1">
                      <span className="text-xs sm:text-sm font-medium">종료 날짜</span>
                      <input
                        type="date"
                        className="border rounded-md px-3 py-2"
                        value={s.endDate}
                        onChange={(e) => updateSchedule(s.id, 'endDate', e.target.value)}
                      />
                    </label>

                    <label className="grid gap-1 lg:col-span-1">
                      <span className="text-xs sm:text-sm font-medium">시작 시간</span>
                      <select
                        className="border rounded-md px-3 py-2"
                        value={s.startTime}
                        onChange={(e) => updateSchedule(s.id, 'startTime', e.target.value)}
                      >
                        {timeOptions.map((t) => (
                          <option key={`st-${s.id}-${t}`} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="grid gap-1 lg:col-span-1">
                      <span className="text-xs sm:text-sm font-medium">종료 시간</span>
                      <select
                        className="border rounded-md px-3 py-2"
                        value={s.endTime}
                        onChange={(e) => updateSchedule(s.id, 'endTime', e.target.value)}
                      >
                        {timeOptions.map((t) => (
                          <option key={`et-${s.id}-${t}`} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="grid gap-1 lg:col-span-1">
                      <span className="text-xs sm:text-sm font-medium">시간 간격(분)</span>
                      <select
                        className="border rounded-md px-3 py-2"
                        value={s.intervalMin}
                        onChange={(e) =>
                          updateSchedule(s.id, 'intervalMin', Number(e.target.value))
                        }
                      >
                        {intervalOptions.map((m) => (
                          <option key={`iv-${s.id}-${m}`} value={m}>
                            {m}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                ))}
              </div>

              {/* 휴일 */}
              {!!form.holidays?.length && (
                <div className="grid gap-2">
                  <span className="text-sm font-medium">휴일</span>
                  <div className="flex flex-wrap gap-2">
                    {form.holidays.map((d) => (
                      <span
                        key={d}
                        className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm"
                      >
                        {d}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* 예약 관련 주의사항 */}
              <label className="grid gap-1">
                <span className="text-sm font-medium">예약 관련 주의사항</span>
                <textarea
                  className="border rounded-md px-3 py-2 min-h-[100px]"
                  placeholder="환불 규정, 지각/결석 안내 등"
                  value={form.reservationNotes}
                  onChange={(e) => updateForm('reservationNotes', e.target.value)}
                />
              </label>
            </div>
          </section>

          {/* ✅ 하단 버튼: 페이지 맨 아래 고정(비-스티키) */}
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <button
              type="button"
              className="w-full sm:w-auto px-6 py-3 rounded-lg bg-[#2D4739] text-white font-medium hover:opacity-90"
              onClick={onSubmit}
              disabled={loading}
            >
              클래스 수정 저장
            </button>
            <button
              type="button"
              className="w-full sm:w-auto px-6 py-3 rounded-lg border font-medium hover:bg-gray-50"
              onClick={() => navigate(`/seller/${storeUrl}/class/list`)}
              disabled={loading}
            >
              취소
            </button>
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
                updateForm('postcode', data.zonecode);
                updateForm('address', data.address);
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

export default ClassEdit;
