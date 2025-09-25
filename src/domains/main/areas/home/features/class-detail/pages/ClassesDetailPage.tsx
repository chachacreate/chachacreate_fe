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

/** ========== 시간 비교 유틸리티 ========== */
function isPastTime(date: string, time: string): boolean {
  const now = new Date();
  const slotDateTime = new Date(`${date}T${time}:00`);
  return slotDateTime <= now;
}

function isReservableSlot(
  slot: { reservable: boolean; seatsLeft: number },
  date: string,
  time: string
): boolean {
  const basicReservable = slot.reservable && slot.seatsLeft > 0;
  const timeReservable = !isPastTime(date, time);
  return basicReservable && timeReservable;
}

/** ========== 기존 유틸 ========== */
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
    const parsed = splitSlot(row.slot);
    if (!parsed) return;

    if (onlyReservable) {
      const timeReservable = !isPastTime(parsed.date, parsed.time);
      if (!row.reservable || row.seatsLeft <= 0 || !timeReservable) return;
    }

    const list = byDate.get(parsed.date) ?? [];
    list.push({
      time: parsed.time,
      seatsLeft: row.seatsLeft,
      reservable: row.reservable,
    });
    byDate.set(parsed.date, list);
  });

  for (const [, v] of byDate) v.sort((a, b) => (a.time > b.time ? 1 : a.time < b.time ? -1 : 0));
  return byDate;
}

function toFullCalendarEvents(
  scheduleMap: ScheduleMap,
  selectedEventId?: string | null
): EventInput[] {
  const events: EventInput[] = [];
  for (const [date, slots] of scheduleMap.entries()) {
    slots.forEach((s, i) => {
      const eventId = `${date}-${s.time}-${i}`;
      const isSelected = selectedEventId === eventId;
      const isTimeReservable = !isPastTime(date, s.time);
      const isReservable = s.reservable && s.seatsLeft > 0 && isTimeReservable;

      events.push({
        id: eventId,
        title: isReservable ? `여석 ${s.seatsLeft}` : !isTimeReservable ? '시간경과' : '예약불가',
        start: `${date}T${s.time}:00`,
        allDay: false,
        display: 'block',
        backgroundColor: isSelected
          ? '#3B82F6'
          : isReservable
            ? '#F9FAFB'
            : !isTimeReservable
              ? '#FEF2F2'
              : '#E5E7EB',
        borderColor: isSelected
          ? '#2563EB'
          : isReservable
            ? '#2D4739'
            : !isTimeReservable
              ? '#EF4444'
              : '#D1D5DB',
        textColor: isSelected
          ? '#FFFFFF'
          : isReservable
            ? '#111827'
            : !isTimeReservable
              ? '#DC2626'
              : '#6B7280',
        extendedProps: {
          date,
          time: s.time,
          seatsLeft: s.seatsLeft,
          reservable: s.reservable,
          isSelected,
          isReservable,
          isTimeReservable,
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

  const [activeTab, setActiveTab] = useState<'detail' | 'store'>('detail');

  // 클래스 설명을 위한 CSS 스타일 적용
  useEffect(() => {
    const addClassDescriptionStyles = () => {
      const existingStyle = document.getElementById('class-description-styles');
      if (!existingStyle) {
        const style = document.createElement('style');
        style.id = 'class-description-styles';
        style.textContent = `
          .class-description h1, .class-description h2, .class-description h3,
          .class-description h4, .class-description h5, .class-description h6 {
            font-weight: 600 !important;
            margin-top: 24px !important;
            margin-bottom: 16px !important;
            color: #1f2937 !important;
          }
          .class-description h1 { font-size: 32px !important; }
          .class-description h2 { font-size: 24px !important; }
          .class-description h3 { font-size: 20px !important; }
          .class-description h4 { font-size: 18px !important; }
          .class-description h5 { font-size: 16px !important; }
          .class-description h6 { font-size: 14px !important; }
          .class-description p {
            margin-bottom: 16px !important;
            line-height: 1.7 !important;
            color: #374151 !important;
          }
          .class-description ul, .class-description ol {
            margin-bottom: 16px !important;
            padding-left: 24px !important;
            color: #374151 !important;
          }
          .class-description li {
            margin-bottom: 8px !important;
            line-height: 1.6 !important;
          }
          .class-description strong {
            font-weight: 600 !important;
            color: #1f2937 !important;
          }
          .class-description em {
            font-style: italic !important;
            color: #1f2937 !important;
          }
        `;
        document.head.appendChild(style);
      }
    };

    addClassDescriptionStyles();
    return () => {
      const style = document.getElementById('class-description-styles');
      if (style) {
        style.remove();
      }
    };
  }, []);

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

        const dates = Array.from(schedMap.keys()).sort();
        let firstDate = '';
        let firstReservable = '';
        let firstEventId = '';

        for (const date of dates) {
          const slots = schedMap.get(date) ?? [];
          const reservableSlot = slots.find((t) => isReservableSlot(t, date, t.time));

          if (reservableSlot) {
            firstDate = date;
            firstReservable = reservableSlot.time;
            const slotIndex = slots.findIndex((slot) => slot.time === reservableSlot.time);
            firstEventId = `${date}-${reservableSlot.time}-${slotIndex}`;
            break;
          }
        }

        setSelectedDate(firstDate);
        setSelectedTime(firstReservable);
        setSelectedEventId(firstEventId);
      } catch (err: any) {
        console.error('데이터 로딩 실패:', err);

        const statusCode = err.response?.status;

        switch (statusCode) {
          case 404:
            nav('/error/404', { replace: true });
            break;
          case 401:
            nav('/error/401', { replace: true });
            break;
          case 500:
          case 502:
          case 503:
            nav('/error/500', { replace: true });
            break;
          default:
            setLoadError(err instanceof Error ? err.message : '데이터를 불러오지 못했어요.');
            setTimeout(() => nav('/error/404', { replace: true }), 2000);
        }
      } finally {
        setIsLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [classId, nav]);

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

  const calendarEvents = useMemo<EventSourceInput>(() => {
    return toFullCalendarEvents(scheduleMap, selectedEventId);
  }, [scheduleMap, selectedEventId]);

  /** 액션 */
  const handleApply = () => {
    if (!selectedDate || !selectedTime) {
      alert('예약 가능한 날짜/시간을 선택해주세요.');
      return;
    }

    if (isPastTime(selectedDate, selectedTime)) {
      alert('이미 지난 시간입니다. 다른 시간을 선택해주세요.');
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

  const onDateClick = (arg: DateClickArg) => {
    const date = arg.dateStr;
    if (!scheduleMap.has(date)) return;
    setSelectedDate(date);

    const slots = scheduleMap.get(date) ?? [];
    const firstReservable = slots.find((t) => isReservableSlot(t, date, t.time));

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
      isTimeReservable?: boolean;
    };

    if (!p?.date || !p?.time) return;
    if (!p.isReservable || !p.isTimeReservable) return;

    setSelectedDate(p.date);
    setSelectedTime(p.time);
    setSelectedEventId(arg.event.id);
  };

  // 콘텐츠 처리를 렌더링 시점에서 직접 수행
  const processedContent = summary?.description ? processContent(summary.description) : null;
  const sanitizedDescription = processedContent?.sanitizedDescription || '';
  const contentType = processedContent?.contentType || 'plain';

  return (
    <>
      <Header />
      <Mainnavbar />

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
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: false,
                    }}
                    eventClassNames={(arg) => {
                      const isSelected = arg.event.extendedProps.isSelected;
                      const isReservable = arg.event.extendedProps.isReservable;
                      const isTimeReservable = arg.event.extendedProps.isTimeReservable;

                      return [
                        'transition-all',
                        'duration-200',
                        'cursor-pointer',
                        'rounded-lg',
                        'shadow-sm',
                        'border-l-4',
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
                            : !isTimeReservable
                              ? ['fc-event-past', 'opacity-60', 'cursor-not-allowed']
                              : ['fc-event-disabled', 'opacity-60', 'cursor-not-allowed']),
                      ];
                    }}
                    eventDidMount={(info) => {
                      const isSelected = info.event.extendedProps.isSelected;
                      const isReservable = info.event.extendedProps.isReservable;
                      const isTimeReservable = info.event.extendedProps.isTimeReservable;

                      if (!isReservable || !isTimeReservable) {
                        info.el.style.pointerEvents = 'none';
                      }

                      if (isSelected) {
                        info.el.style.zIndex = '20';
                      }
                    }}
                  />
                </div>

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
                          const isTimeReservable = !isPastTime(selectedDate, t.time);
                          const disabled = !t.reservable || t.seatsLeft <= 0 || !isTimeReservable;

                          return (
                            <button
                              key={`${selectedDate}_${t.time}`}
                              onClick={() => {
                                if (!disabled) {
                                  setSelectedTime(t.time);
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
                                  ? !isTimeReservable
                                    ? 'bg-red-100 text-red-400 cursor-not-allowed'
                                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                  : isSelected
                                    ? 'bg-[#2D4739] text-white shadow-lg scale-105'
                                    : 'bg-gray-50 hover:bg-gray-100 text-gray-700 hover:shadow-md',
                              ].join(' ')}
                            >
                              <div className="flex items-center justify-between">
                                <span>{t.time}</span>
                                <span className="text-xs opacity-80">
                                  {!isTimeReservable ? '시간경과' : `여석 ${t.seatsLeft}`}
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      <button
                        ref={inlineCtaRef}
                        onClick={handleApply}
                        disabled={!selectedTime || isPastTime(selectedDate, selectedTime)}
                        className="w-full py-4 bg-[#2D4739] text-white font-semibold rounded-xl hover:opacity-90 transition-opacity disabled:bg-gray-300 disabled:cursor-not-allowed"
                      >
                        {!selectedTime ? '시간을 선택해주세요' : '신청하기'}
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
                        {summary.description ? (
                          <div
                            className="class-description"
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

                      {/* 상세 이미지 갤러리 */}
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
          {showFixedButton &&
            !isLoading &&
            !loadError &&
            summary &&
            selectedTime &&
            !isPastTime(selectedDate, selectedTime) && (
              <button
                onClick={scrollToCalendar}
                className="fixed bottom-5 right-5 z-50 h-14 px-6 rounded-full bg-[#2D4739] text-white font-semibold shadow-[0_8px_20px_rgba(0,0,0,0.15)] hover:opacity-90 transition-opacity lg:right-8 xl:right-12"
              >
                신청하기
              </button>
            )}
        </div>
      </main>

      {/* 인라인 CSS 스타일 */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
          .class-description h1, .class-description h2, .class-description h3,
          .class-description h4, .class-description h5, .class-description h6 {
            font-weight: 600 !important;
            margin-top: 24px !important;
            margin-bottom: 16px !important;
            color: #1f2937 !important;
          }
          .class-description h1 { font-size: 32px !important; }
          .class-description h2 { font-size: 24px !important; }
          .class-description h3 { font-size: 20px !important; }
          .class-description h4 { font-size: 18px !important; }
          .class-description h5 { font-size: 16px !important; }
          .class-description h6 { font-size: 14px !important; }
          .class-description p {
            margin-bottom: 16px !important;
            line-height: 1.7 !important;
            color: #374151 !important;
          }
          .class-description ul, .class-description ol {
            margin-bottom: 16px !important;
            padding-left: 24px !important;
            color: #374151 !important;
          }
          .class-description li {
            margin-bottom: 8px !important;
            line-height: 1.6 !important;
          }
          .class-description strong {
            font-weight: 600 !important;
            color: #1f2937 !important;
          }
          .class-description em {
            font-style: italic !important;
            color: #1f2937 !important;
          }
          .class-description code {
            background-color: #f3f4f6 !important;
            padding: 2px 6px !important;
            border-radius: 4px !important;
            font-size: 14px !important;
            color: #1f2937 !important;
          }
          .class-description pre {
            background-color: #f3f4f6 !important;
            padding: 16px !important;
            border-radius: 8px !important;
            overflow-x: auto !important;
            margin-bottom: 16px !important;
          }
          .class-description blockquote {
            border-left: 4px solid #d1d5db !important;
            padding-left: 16px !important;
            margin: 16px 0 !important;
            font-style: italic !important;
            color: #6b7280 !important;
          }
          .class-description a {
            color: #2563eb !important;
            text-decoration: none !important;
          }
          .class-description a:hover {
            color: #1d4ed8 !important;
            text-decoration: underline !important;
          }
          .class-description hr {
            border: none !important;
            border-top: 1px solid #e5e7eb !important;
            margin: 24px 0 !important;
          }
          .class-description img {
            max-width: 100% !important;
            height: auto !important;
            border-radius: 8px !important;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1) !important;
            margin: 16px 0 !important;
          }
        `,
        }}
      />
    </>
  );
}
