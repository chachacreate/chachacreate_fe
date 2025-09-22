import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Header from '@src/shared/areas/layout/features/header/Header';
import Mainnavbar from '@src/shared/areas/navigation/features/navbar/main/Mainnavbar';
import { get } from '@src/libs/request';
import { processContent, getContentCssClasses } from '@src/shared/util/contentUtil';

/** ===== FullCalendar ===== */
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import './fullCalendar.pcss';
// type-only
import type { DateClickArg } from '@fullcalendar/interaction';
import type { EventClickArg, EventInput, EventSourceInput } from '@fullcalendar/core';

/** ========== DTO ========== */
interface SummaryDTO {
  classId: number;
  title: string;
  description?: string;
  guideline?: string;
  price: number;
  postNum?: string;
  addressRoad?: string;
  addressDetail?: string;
  addressExtra?: string;
  storeId?: number;
  storeName?: string;
  storeContent?: string;
  storeUrl?: string;
}

interface ImageItemDTO {
  url: string;
  thumbnailUrl?: string;
  sequence?: number;
}

interface ClassImagesDTO {
  classId: number;
  images: ImageItemDTO[];
}

interface SlotDTO {
  slot: string;
  seatsLeft: number;
  reservable: boolean;
}

/** ========== 응답 언래퍼 ========== */
type Envelope<T> = { status: number; message: string; data: T };
function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}
function unwrapData<T>(res: unknown): T {
  if (isObject(res) && 'data' in res) {
    const inner = (res as { data: unknown }).data;
    if (isObject(inner) && 'data' in inner && 'status' in inner) {
      return (inner as Envelope<T>).data;
    }
    return inner as T;
  }
  if (isObject(res) && 'data' in res && 'status' in res) {
    return (res as Envelope<T>).data;
  }
  return res as T;
}

/** ========== 유틸 ========== */
function sanitizeImageUrl(url?: string): string {
  if (!url) return '';
  const s = url.trim();
  if (s.startsWith('http://') || s.startsWith('https://')) return s;
  if (s.startsWith('//')) return 'https:' + s;
  return s;
}

function normalizeImages(payload: ClassImagesDTO | ImageItemDTO[] | undefined): ImageItemDTO[] {
  const raw: ImageItemDTO[] = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.images)
      ? payload!.images
      : [];
  return [...raw].sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0));
}

function pickImageSrc(item: ImageItemDTO): string {
  const full = sanitizeImageUrl(item.url);
  const thumb = item.thumbnailUrl ? sanitizeImageUrl(item.thumbnailUrl) : '';
  const badThumb =
    !thumb || thumb.endsWith('_thumb_thumb.webp') || /https?:\/\/[^/]+\/https?:\/\//i.test(thumb);
  return badThumb ? full : thumb;
}

type DaySlot = { time: string; seatsLeft: number; reservable: boolean };
type ScheduleMap = Map<string, DaySlot[]>;

function splitSlot(slotRaw: string): { date: string; time: string } | null {
  const s = slotRaw
    .replace('T', ' ')
    .replace(/([+-]\d{2}:\d{2}|Z)$/i, '')
    .trim();
  const [date, timeRaw] = s.split(/\s+/);
  if (!date || !timeRaw) return null;
  const hhmm = timeRaw.slice(0, 5);
  return /^\d{4}-\d{2}-\d{2}$/.test(date) && /^\d{2}:\d{2}$/.test(hhmm)
    ? { date, time: hhmm }
    : null;
}

function buildScheduleMap(rows: SlotDTO[], onlyReservable = false): ScheduleMap {
  const byDate: ScheduleMap = new Map();
  rows.forEach((row) => {
    if (onlyReservable && (!row.reservable || row.seatsLeft <= 0)) return;
    const parsed = splitSlot(row.slot);
    if (!parsed) return;
    const list = byDate.get(parsed.date) ?? [];
    list.push({ time: parsed.time, seatsLeft: row.seatsLeft, reservable: row.reservable });
    byDate.set(parsed.date, list);
  });
  for (const [, v] of byDate) v.sort((a, b) => (a.time > b.time ? 1 : a.time < b.time ? -1 : 0));
  return byDate;
}

// 개선된 FullCalendar 이벤트 생성 함수
function toFullCalendarEvents(
  scheduleMap: ScheduleMap,
  selectedEventId?: string | null
): EventInput[] {
  const events: EventInput[] = [];
  for (const [date, slots] of scheduleMap.entries()) {
    slots.forEach((s, i) => {
      const eventId = `${date}-${s.time}-${i}`;
      const isSelected = selectedEventId === eventId;
      const isReservable = s.reservable && s.seatsLeft > 0;

      events.push({
        id: eventId,
        title: isReservable ? `여석 ${s.seatsLeft}` : '예약불가',
        start: `${date}T${s.time}:00`,
        allDay: false,
        display: 'block',
        // 선택 상태에 따른 동적 색상 설정
        backgroundColor: isSelected
          ? '#3B82F6' // blue-500
          : isReservable
            ? '#F9FAFB' // gray-50
            : '#E5E7EB', // gray-200
        borderColor: isSelected
          ? '#2563EB' // blue-600
          : isReservable
            ? '#2D4739' // 기존 브랜드 컬러
            : '#D1D5DB', // gray-300
        textColor: isSelected
          ? '#FFFFFF' // white
          : isReservable
            ? '#111827' // gray-900
            : '#6B7280', // gray-500
        extendedProps: {
          date,
          time: s.time,
          seatsLeft: s.seatsLeft,
          reservable: s.reservable,
          isSelected,
          isReservable,
        },
      });
    });
  }
  return events;
}

const formatCurrency = (n?: number | null) => Intl.NumberFormat('ko-KR').format(n ?? 0);

/** ========== 페이지 ========== */
export default function ClassesDetailPage() {
  const { classId } = useParams<{ classId: string }>();
  const nav = useNavigate();

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [summary, setSummary] = useState<SummaryDTO | null>(null);
  const [imageList, setImageList] = useState<ImageItemDTO[]>([]);
  const [scheduleMap, setScheduleMap] = useState<ScheduleMap>(new Map());

  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');

  const calendarSectionRef = useRef<HTMLDivElement | null>(null);
  const inlineCtaRef = useRef<HTMLButtonElement | null>(null);
  const [showFixedButton, setShowFixedButton] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  /** 탭 상태 */
  const [activeTab, setActiveTab] = useState<'detail' | 'store'>('detail');

  /** 데이터 패치 */
  useEffect(() => {
    let alive = true;
    (async () => {
      if (!classId) {
        setIsLoading(false);
        setLoadError('잘못된 경로입니다.');
        return;
      }
      setIsLoading(true);
      setLoadError(null);
      try {
        const [sumRes, imgRes, schRes] = await Promise.all([
          get<SummaryDTO>(`/main/classes/${classId}`),
          get<ClassImagesDTO>(`/main/classes/${classId}/images`),
          get<SlotDTO[]>(`/main/classes/${classId}/schedule`),
        ]);
        if (!alive) return;

        const summaryPayload = unwrapData<SummaryDTO>(sumRes);
        const imagesPayload = unwrapData<ClassImagesDTO | ImageItemDTO[] | undefined>(imgRes);
        const schedulePayload = unwrapData<SlotDTO[] | { slots?: SlotDTO[] } | undefined>(schRes);

        const imgs = normalizeImages(imagesPayload);
        const slotsArray = Array.isArray(schedulePayload)
          ? schedulePayload
          : isObject(schedulePayload) &&
              Array.isArray((schedulePayload as { slots?: SlotDTO[] }).slots)
            ? (schedulePayload as { slots: SlotDTO[] }).slots
            : [];
        const schedMap = buildScheduleMap(slotsArray, false);

        setSummary(summaryPayload);
        setImageList(imgs);
        setScheduleMap(schedMap);

        const dates = Array.from(schedMap.keys());
        const firstDate = dates[0] ?? '';
        const firstReservable = firstDate
          ? ((schedMap.get(firstDate) ?? []).find((t) => t.reservable && t.seatsLeft > 0)?.time ??
            '')
          : '';
        setSelectedDate(firstDate);
        setSelectedTime(firstReservable);

        // 첫 번째 예약 가능한 이벤트를 선택 상태로 설정
        if (firstDate && firstReservable) {
          const firstSlots = schedMap.get(firstDate) ?? [];
          const slotIndex = firstSlots.findIndex((slot) => slot.time === firstReservable);
          if (slotIndex >= 0) {
            setSelectedEventId(`${firstDate}-${firstReservable}-${slotIndex}`);
          }
        }
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : '데이터를 불러오지 못했어요.');
      } finally {
        setIsLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [classId]);

  /** 인라인 CTA 가시성 */
  useEffect(() => {
    const target = inlineCtaRef.current;
    if (!target) return;
    const io = new IntersectionObserver(([entry]) => setShowFixedButton(!entry.isIntersecting), {
      root: null,
      threshold: 0.01,
    });
    io.observe(target);
    return () => io.disconnect();
  }, [inlineCtaRef.current]);

  /** 파생 값 */
  const address = useMemo(() => {
    const road = summary?.addressRoad ?? '';
    const detail = summary?.addressDetail ?? '';
    const extra = summary?.addressExtra ?? '';
    return road || detail || extra ? [road, detail, extra].filter(Boolean).join(' ') : '';
  }, [summary]);

  const firstImageSrc = useMemo(() => {
    if (!imageList.length) return undefined;
    return pickImageSrc(imageList[0]);
  }, [imageList]);

  const detailImages = useMemo(() => {
    if (imageList.length <= 1) return [];
    return imageList.slice(1).map(pickImageSrc);
  }, [imageList]);

  const timeList = useMemo(
    () => (selectedDate ? (scheduleMap.get(selectedDate) ?? []) : []),
    [selectedDate, scheduleMap]
  );

  /** 개선된 FullCalendar 이벤트 소스 */
  const calendarEvents = useMemo<EventSourceInput>(() => {
    return toFullCalendarEvents(scheduleMap, selectedEventId);
  }, [scheduleMap, selectedEventId]);

  /** 콘텐츠 처리 */
  const { sanitizedDescription, contentType } = useMemo(() => {
    return processContent(summary?.description);
  }, [summary?.description]);

  const contentCssClasses = useMemo(() => {
    return getContentCssClasses(contentType);
  }, [contentType]);

  /** 액션 */
  const handleApply = () => {
    if (!selectedDate || !selectedTime) {
      alert('예약 가능한 날짜/시간을 선택해주세요.');
      return;
    }
    nav('/main/classes/order', {
      state: {
        classId,
        date: selectedDate,
        time: selectedTime,
        item: summary,
        image: firstImageSrc,
        storeId: summary?.storeId,
        storeName: summary?.storeName,
      },
    });
  };

  const handleStoreInfo = () => {
    const storeUrl = summary?.storeUrl ?? '';
    window.location.href = `/${storeUrl}/info`;
  };

  const scrollToCalendar = () => {
    const el = calendarSectionRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const absoluteTop = rect.top + window.scrollY;
    const centerOffset = (window.innerHeight - rect.height) / 2;
    const targetTop = absoluteTop - Math.max(centerOffset, 0);
    window.scrollTo({ top: targetTop, behavior: 'smooth' });
    el.classList.add('ring-2', 'ring-[#2D4739]', 'ring-offset-2', 'rounded-2xl');
    window.setTimeout(() => {
      el.classList.remove('ring-2', 'ring-[#2D4739]', 'ring-offset-2', 'rounded-2xl');
    }, 700);
  };

  /** 개선된 FullCalendar 핸들러 */
  const onDateClick = (arg: DateClickArg) => {
    const date = arg.dateStr;
    if (!scheduleMap.has(date)) return;
    setSelectedDate(date);

    const slots = scheduleMap.get(date) ?? [];
    const firstReservable = slots.find((t) => t.reservable && t.seatsLeft > 0);

    if (firstReservable) {
      setSelectedTime(firstReservable.time);
      const slotIndex = slots.findIndex((slot) => slot.time === firstReservable.time);
      setSelectedEventId(`${date}-${firstReservable.time}-${slotIndex}`);
    } else {
      setSelectedTime('');
      setSelectedEventId(null);
    }
  };

  const onEventClick = (arg: EventClickArg) => {
    const p = arg.event.extendedProps as {
      date?: string;
      time?: string;
      seatsLeft?: number;
      reservable?: boolean;
      isReservable?: boolean;
    };

    if (!p?.date || !p?.time) return;
    if (!p.isReservable) return; // 예약 불가능한 이벤트 클릭 방지

    setSelectedDate(p.date);
    setSelectedTime(p.time);
    setSelectedEventId(arg.event.id);
  };

  /** 렌더 */
  return (
    <>
      <Header />
      <Mainnavbar />

      {/* 1920px 기준 양옆 240px 패딩, 내부 콘텐츠 1440px */}
      <main className="max-w-[1920px] mx-auto px-4 sm:px-6 md:px-8 lg:px-16 xl:px-[240px]">
        <div className="max-w-[1440px] mx-auto">
          {isLoading ? (
            <div className="py-12">
              <div className="rounded-2xl border border-gray-200 bg-white p-8 animate-pulse">
                <div className="h-6 w-1/3 bg-gray-200 rounded mb-2" />
                <div className="h-4 w-2/3 bg-gray-200 rounded mb-6" />
                <div className="h-10 w-24 bg-gray-200 rounded" />
              </div>
            </div>
          ) : loadError ? (
            <div className="py-12">
              <div className="rounded-2xl border border-red-200 bg-red-50 p-8">
                <h1 className="text-lg font-semibold text-red-700">오류가 발생했어요</h1>
                <p className="text-sm text-red-600 mt-1">{loadError}</p>
                <button
                  onClick={() => window.location.reload()}
                  className="mt-6 h-10 px-4 rounded-xl border border-red-300 hover:bg-red-100 text-red-700"
                >
                  다시 시도
                </button>
              </div>
            </div>
          ) : !summary ? (
            <div className="py-12">
              <div className="rounded-2xl border border-gray-200 bg-white p-8">
                <h1 className="text-lg font-semibold">클래스를 찾을 수 없습니다</h1>
                <p className="text-sm text-gray-500 mt-1">존재하지 않거나 삭제되었을 수 있어요.</p>
                <button
                  onClick={() => nav(-1)}
                  className="mt-6 h-10 px-4 rounded-xl border border-gray-300 hover:bg-gray-50"
                >
                  이전으로
                </button>
              </div>
            </div>
          ) : (
            <div className="py-8 lg:py-12">
              {/* 상단: 이미지 + 기본 정보 */}
              <section className="mb-10">
                <div className="flex flex-col xl:flex-row items-start gap-8 xl:gap-[120px]">
                  {/* 왼쪽: 이미지 */}
                  <div className="w-full xl:w-[670px]">
                    <div className="rounded-2xl overflow-hidden border border-gray-200">
                      <div className="relative w-full aspect-[2/1]">
                        {firstImageSrc ? (
                          <img
                            src={firstImageSrc}
                            alt={summary.title}
                            className="absolute inset-0 w-full h-full object-cover"
                            loading="eager"
                            decoding="async"
                            fetchPriority="high"
                            width={800}
                            height={400}
                            onError={(e) =>
                              console.warn('CARD IMG ERROR', e.currentTarget.currentSrc)
                            }
                          />
                        ) : (
                          <div className="absolute inset-0 bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
                            <span className="text-gray-500">클래스 이미지</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 오른쪽: 텍스트/가격 */}
                  <div className="flex-1 xl:max-w-[503px] xl:h-[335px] flex flex-col justify-between">
                    <div className="flex flex-col gap-2.5">
                      <h1 className="text-[16px] sm:text-[24px] xl:text-[28px] leading-[1.5] font-bold">
                        {summary.title}
                      </h1>
                      <p className="text-[#3d3d3d] text-[12px] sm:text-[20px] xl:text-[28px] leading-[1.5]">
                        {summary.storeName ? `${summary.storeName}의 클래스` : '{store}의 클래스'}
                      </p>
                      <p className="text-[#3d3d3d] text-[12px] sm:text-[20px] xl:text-[24px] leading-[1.5]">
                        {address || '서울특별시 마포구'}
                      </p>
                    </div>
                    <p className="mt-6 xl:mt-0 text-black text-[22px] sm:text-[26px] xl:text-[32px] leading-[1.5] font-bold">
                      {formatCurrency(summary.price)} 원
                    </p>
                  </div>
                </div>
              </section>

              {/* 중간: FullCalendar + 시간표 */}
              <section
                ref={calendarSectionRef}
                className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10"
              >
                {/* 왼쪽: 개선된 FullCalendar */}
                <div className="bg-white border border-gray-200 rounded-2xl p-4">
                  <h3 className="text-lg font-semibold mb-3">날짜/타임 일정</h3>
                  <FullCalendar
                    plugins={[dayGridPlugin, interactionPlugin]}
                    initialView="dayGridMonth"
                    headerToolbar={{ left: 'prev,next today', center: 'title', right: '' }}
                    height="auto"
                    dayMaxEvents={3}
                    events={calendarEvents}
                    dateClick={onDateClick}
                    eventClick={onEventClick}
                    fixedWeekCount={false}
                    firstDay={0}
                    locale="ko"
                    eventTimeFormat={{
                      hour: '2-digit', // 두 자리 숫자
                      minute: '2-digit', // 분 표시
                      hour12: false, // 24시간제 (오전/오후 제거)
                    }}
                    // Tailwind 클래스를 적용하는 eventClassNames
                    eventClassNames={(arg) => {
                      const isSelected = arg.event.extendedProps.isSelected;
                      const isReservable = arg.event.extendedProps.isReservable;

                      return [
                        // 기본 스타일
                        'transition-all',
                        'duration-200',
                        'cursor-pointer',
                        'rounded-lg',
                        'shadow-sm',
                        'border-l-4',

                        // 상태에 따른 스타일
                        ...(isSelected
                          ? [
                              'fc-event-selected',
                              'transform',
                              'scale-105',
                              'shadow-lg',
                              'ring-2',
                              'ring-blue-300',
                              'ring-offset-1',
                              'z-10',
                            ]
                          : isReservable
                            ? ['fc-event-reservable', 'hover:shadow-md', 'hover:scale-102']
                            : ['fc-event-disabled', 'opacity-60', 'cursor-not-allowed']),
                      ];
                    }}
                    // 추가적인 DOM 조작
                    eventDidMount={(info) => {
                      const isSelected = info.event.extendedProps.isSelected;
                      const isReservable = info.event.extendedProps.isReservable;

                      // 예약 불가능한 이벤트는 클릭 방지
                      if (!isReservable) {
                        info.el.style.pointerEvents = 'none';
                      }

                      // 선택된 이벤트는 z-index 조정
                      if (isSelected) {
                        info.el.style.zIndex = '20';
                      }
                    }}
                  />
                </div>

                {/* 오른쪽: 시간표 */}
                <div className="bg-white border border-gray-200 rounded-2xl p-6">
                  <h3 className="text-lg font-semibold mb-2">시간 선택</h3>
                  {!selectedDate ? (
                    <p className="text-sm text-gray-500">날짜를 먼저 선택해주세요.</p>
                  ) : timeList.length > 0 ? (
                    <>
                      <p className="text-sm text-gray-500 mb-3">{selectedDate}</p>
                      <div className="grid grid-cols-2 gap-3 mb-6">
                        {timeList.map((t) => {
                          const isSelected = selectedTime === t.time;
                          const disabled = !t.reservable || t.seatsLeft <= 0;
                          return (
                            <button
                              key={`${selectedDate}_${t.time}`}
                              onClick={() => {
                                if (!disabled) {
                                  setSelectedTime(t.time);
                                  // 해당 시간의 이벤트 ID 찾아서 설정
                                  const slotIndex = timeList.findIndex(
                                    (slot) => slot.time === t.time
                                  );
                                  setSelectedEventId(`${selectedDate}-${t.time}-${slotIndex}`);
                                }
                              }}
                              disabled={disabled}
                              className={[
                                'py-3 px-4 rounded-lg text-sm font-medium transition-all text-left',
                                disabled
                                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                  : isSelected
                                    ? 'bg-[#2D4739] text-white shadow-lg scale-105'
                                    : 'bg-gray-50 hover:bg-gray-100 text-gray-700 hover:shadow-md',
                              ].join(' ')}
                            >
                              <div className="flex items-center justify-between">
                                <span>{t.time}</span>
                                <span className="text-xs opacity-80">여석 {t.seatsLeft}</span>
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      <button
                        ref={inlineCtaRef}
                        onClick={handleApply}
                        className="w-full py-4 bg-[#2D4739] text-white font-semibold rounded-xl hover:opacity-90 transition-opacity"
                      >
                        신청하기
                      </button>
                    </>
                  ) : (
                    <div className="text-sm text-gray-500">
                      선택 가능한 시간이 없습니다. (모든 타임이 예약 불가)
                    </div>
                  )}
                </div>
              </section>

              {/* 하단: 탭 네비게이션 + 콘텐츠 */}
              <section className="bg-white border border-gray-200 rounded-2xl">
                <nav className="flex border-b border-gray-200">
                  <button
                    onClick={() => setActiveTab('detail')}
                    className={[
                      'flex-1 py-4 px-6 text-center font-medium transition-colors',
                      activeTab === 'detail'
                        ? 'text-[#2D4739] border-b-2 border-[#2D4739]'
                        : 'text-gray-600 hover:text-gray-900',
                    ].join(' ')}
                  >
                    상세보기
                  </button>
                  <button
                    onClick={() => setActiveTab('store')}
                    className={[
                      'flex-1 py-4 px-6 text-center font-medium transition-colors',
                      activeTab === 'store'
                        ? 'text-[#2D4739] border-b-2 border-[#2D4739]'
                        : 'text-gray-600 hover:text-gray-900',
                    ].join(' ')}
                  >
                    스토어 정보 보기
                  </button>
                </nav>

                <div className="p-6">
                  {activeTab === 'detail' ? (
                    <div className="prose max-w-none">
                      <h3 className="text-xl font-semibold mb-4">클래스 상세 정보</h3>

                      <div className="space-y-4 text-gray-700">
                        {sanitizedDescription ? (
                          <div
                            className={`content-wrapper ${contentCssClasses}`}
                            dangerouslySetInnerHTML={{ __html: sanitizedDescription }}
                          />
                        ) : (
                          <div>
                            <p>"{summary.title}" 클래스에 오신 것을 환영합니다.</p>
                            <p>클래스 설명이 없습니다.</p>
                          </div>
                        )}

                        {summary.guideline && (
                          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                            <h4 className="font-semibold mb-2 text-yellow-800">⚠️ 주의사항</h4>
                            <p className="text-yellow-700">{summary.guideline}</p>
                          </div>
                        )}
                      </div>

                      {/* 상세 이미지 갤러리 (대표 제외) */}
                      {detailImages.length > 0 && (
                        <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                          {detailImages.map((src, idx) => (
                            <div
                              key={idx}
                              className="relative aspect-[4/3] rounded-lg overflow-hidden shadow-sm border border-gray-200"
                            >
                              <img
                                src={src}
                                alt={`클래스 상세 이미지 ${idx + 1}`}
                                className="w-full h-full object-cover hover:scale-105 transition-transform"
                                loading="lazy"
                                onError={(e) => {
                                  e.currentTarget.replaceWith(
                                    Object.assign(document.createElement('div'), {
                                      className: 'w-full h-full bg-gray-200',
                                    })
                                  );
                                }}
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div>
                      <h3 className="text-xl font-semibold mb-4">스토어 정보</h3>
                      <div className="bg-gray-50 p-4 rounded-xl mb-4">
                        <h4 className="font-semibold mb-2">{summary.storeName ?? '스토어'}</h4>
                        <p className="text-gray-600 mb-3">
                          {summary.storeContent ?? '스토어 소개가 없습니다.'}
                        </p>
                        <button
                          onClick={handleStoreInfo}
                          className="px-4 py-2 bg-[#2D4739] text-white rounded-lg hover:opacity-90"
                        >
                          스토어 상세 정보 보기
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </section>
            </div>
          )}

          {/* 플로팅 CTA */}
          {showFixedButton && !isLoading && !loadError && summary && (
            <button
              onClick={scrollToCalendar}
              className="fixed bottom-5 right-5 z-50 h-14 px-6 rounded-full bg-[#2D4739] text-white font-semibold shadow-[0_8px_20px_rgba(0,0,0,0.15)] hover:opacity-90 transition-opacity lg:right-8 xl:right-12"
            >
              신청하기
            </button>
          )}
        </div>
      </main>
    </>
  );
}
