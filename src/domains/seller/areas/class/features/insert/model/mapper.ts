// src/domains/seller/areas/class/features/insert/model/mapper.ts
import type { ClassCreateCorePayload } from '@src/domains/seller/areas/class/features/insert/services/ClassCreateCorePayload';

export type ScheduleRow = {
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  intervalMin: number;
};

export type ClassForm = {
  title: string;
  desc: string;
  price: number | '';
  reservationNotes: string;
  capacity: number | '';
  postcode: string;
  address: string;
  addressDetail: string;
  schedules: ScheduleRow[];
  images: { file?: File }[];
};

const toHHMMSS = (hhmm?: string) => (hhmm && hhmm.length === 5 ? `${hhmm}:00` : hhmm || '');
const toDateTime = (d?: string, t?: string) => (d ? `${d} ${toHHMMSS(t || '00:00')}` : '');

export const toCorePayload = (f: ClassForm): ClassCreateCorePayload => {
  const s = f.schedules[0];
  return {
    title: f.title?.trim() || '',
    detail: f.desc?.trim() || '',
    price: typeof f.price === 'number' ? f.price : undefined,
    guideline: f.reservationNotes?.trim() || '',
    participant: typeof f.capacity === 'number' ? f.capacity : undefined,
    postNum: f.postcode || '',
    addressRoad: f.address || '',
    addressDetail: f.addressDetail || '',
    addressExtra: '',
    startDate: toDateTime(s?.startDate, s?.startTime),
    endDate: toDateTime(s?.endDate, s?.endTime),
    startTime: toHHMMSS(s?.startTime),
    endTime: toHHMMSS(s?.endTime),
    timeInterval: s?.intervalMin ?? 60,
  };
};
