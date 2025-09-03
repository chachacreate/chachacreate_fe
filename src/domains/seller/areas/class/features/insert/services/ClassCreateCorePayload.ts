// src/domains/seller/areas/class/features/insert/services/classApi.ts
import { post } from '@src/libs/request';

export type ClassCreateCorePayload = {
  title: string;
  detail: string;
  price?: number;
  guideline?: string;
  participant?: number;
  postNum?: string;
  addressRoad?: string;
  addressDetail?: string;
  addressExtra?: string;
  startDate?: string; // "yyyy-MM-dd HH:mm:ss"
  endDate?: string;
  startTime?: string; // "HH:mm:ss"
  endTime?: string;
  timeInterval?: number;
};

export async function createClasses(
  storeUrl: string,
  cores: ClassCreateCorePayload[],
  filesPerForm: { thumbnails?: File[]; descriptions?: File[] }[]
) {
  const fd = new FormData();
  fd.append('clazzes', JSON.stringify(cores));
  filesPerForm.forEach((pack, idx) => {
    (pack.thumbnails ?? []).forEach((f) => fd.append(`thumbnails_${idx}`, f));
    (pack.descriptions ?? []).forEach((f) => fd.append(`descriptions_${idx}`, f));
  });
  // 백엔드: POST /api/seller/{storeUrl}/classes
  return post<number[]>(`/seller/${storeUrl}/classes`, fd);
}
