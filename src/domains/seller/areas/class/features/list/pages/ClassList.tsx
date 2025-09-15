// src/domains/seller/areas/class/features/list/pages/ClassList.tsx
import type { FC } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Header from '@src/shared/areas/layout/features/header/Header';
import Mainnavbar from '@src/shared/areas/navigation/features/navbar/main/Mainnavbar';
import SellerSidenavbar from '@src/shared/areas/navigation/features/sidenavbar/seller/SellerSidenavbar';
import { get } from '@src/libs/request'; // ✅ patch 제거 (동일 오리진 fetch 사용)

/** ===== 라우터 파라미터 ===== */
type Params = { storeUrl: string };

/** ===== API 응답 타입(목록 아이템) ===== */
type SellerClassDTO = {
  classId: number;
  thumbnailUrl?: string | null;
  title: string;
  location: string;
  participant: number;
  price: number;
  period: string; // "YYYY-MM-DD ~ YYYY-MM-DD"
  timeInterval?: number; // 분 단위 간격
  createdAt: string; // ISO
  updatedAt: string; // ISO
  deletedAt?: string | null; // ISO | null
  isDeleted?: boolean;
};

/** ===== 삭제 토글 응답 타입 ===== */
type ClassDeletionToggleResponseDTO = {
  requestedCount?: number;
  toggledToDeletedCount?: number;
  toggledToRestoredCount?: number;
};

/** ===== UI 렌더용 Row 타입 ===== */
type ClassRow = {
  id: string;
  imageUrl?: string;
  title: string;
  place: string;
  capacity: number;
  price: number;
  period: { start: string; end: string };
  intervalMin: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  _disabled: boolean;
};

const KRW = new Intl.NumberFormat('ko-KR');

/** ===== Envelope 언래퍼 ===== */
type Envelope<T> = { status: number; message?: string; data: T };
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

/** ===== 어댑터: SellerClassDTO → ClassRow ===== */
function mapSellerToRow(dto: SellerClassDTO): ClassRow {
  let start = '',
    end = '';
  if (dto.period?.includes('~')) {
    const [s, e] = dto.period.split('~').map((x) => x.trim());
    start = s ?? '';
    end = e ?? '';
  }
  const placeShort = (() => {
    const parts = (dto.location || '').split(' ').filter(Boolean);
    return parts.slice(1, 3).join(' ') || dto.location || '-';
  })();
  const deletedAtDate = dto.deletedAt ? dto.deletedAt.slice(0, 10) : null;
  const disabled = !!deletedAtDate || !!dto.isDeleted;

  return {
    id: String(dto.classId),
    imageUrl: dto.thumbnailUrl || undefined,
    title: dto.title,
    place: placeShort,
    capacity: dto.participant,
    price: dto.price,
    period: { start, end },
    intervalMin: dto.timeInterval ?? 0,
    createdAt: dto.createdAt?.slice(0, 10) || '',
    updatedAt: dto.updatedAt?.slice(0, 10) || '',
    deletedAt: deletedAtDate,
    _disabled: disabled,
  };
}

const ClassList: FC = () => {
  const { storeUrl = '' } = useParams<Params>();
  const navigate = useNavigate();

  const [rows, setRows] = useState<ClassRow[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isToggling, setIsToggling] = useState(false);

  /** ===== 데이터 패치 ===== */
  const fetchClasses = async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const res = await get<SellerClassDTO[] | Envelope<SellerClassDTO[]>>(
        `/seller/${encodeURIComponent(storeUrl)}/classes`
      );
      const list = unwrapData<SellerClassDTO[]>(res);
      const mapped = (list || []).map(mapSellerToRow);
      setRows(mapped);
      setSelected({});
    } catch (e: any) {
      if (e?.response?.data?.status === 404) {
        setRows([]);
        setSelected({});
      } else {
        setLoadError(e instanceof Error ? e.message : '클래스 목록을 불러오지 못했어요.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!storeUrl) return;
    fetchClasses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeUrl]);

  /** ===== 선택 관련 ===== */
  const allChecked = useMemo(
    () => rows.length > 0 && rows.every((r) => selected[r.id]),
    [rows, selected]
  );
  const checkedCount = useMemo(() => rows.filter((r) => selected[r.id]).length, [rows, selected]);

  const toggleAll = () => {
    if (allChecked) {
      setSelected({});
    } else {
      const next: Record<string, boolean> = {};
      rows.forEach((r) => (next[r.id] = true));
      setSelected(next);
    }
  };
  const toggleOne = (id: string) => {
    setSelected((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  /** ===== 동일 오리진 PATCH 유틸 (첫 시도부터 /api 사용) ===== */
  const sameOriginPatch = async <T,>(apiPath: string, body: unknown): Promise<T> => {
    const token = localStorage.getItem('accessToken');
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`/api${apiPath}`, {
      method: 'PATCH',
      credentials: 'include',
      headers,
      body: JSON.stringify(body),
    });
    // 서버가 ApiResponse 래핑이면 .data, 아니면 그대로
    const json = await res.json().catch(() => ({}));
    const data = isObject(json) && 'data' in json ? (json as { data: T }).data : (json as T);
    if (!res.ok) {
      // ❗에러는 throw 하되 console.error는 찍지 않음 (사용자 알림만)
      throw new Error(
        (isObject(json) && (json.message as string)) || `요청 실패: ${res.status} ${res.statusText}`
      );
    }
    return data;
  };

  /** ===== 논리삭제/복구 토글 =====
   *  첫 시도부터 동일 오리진 /api 로 보내 CORS 에러가 콘솔에 안 찍히게 함.
   */
  const toggleDeletion = async () => {
    if (checkedCount === 0 || isToggling) return;
    if (!confirm('선택한 클래스를 삭제/복구 토글하시겠습니까?')) return;

    const ids = Object.entries(selected)
      .filter(([, v]) => v)
      .map(([id]) => Number(id));

    const apiPath = `/seller/${encodeURIComponent(storeUrl)}/classes/delete`;
    const body = { classIds: ids };

    setIsToggling(true);
    try {
      const r = await sameOriginPatch<ClassDeletionToggleResponseDTO>(apiPath, body);
      const del = r?.toggledToDeletedCount ?? 0;
      const restore = r?.toggledToRestoredCount ?? 0;
      alert(`처리 완료: 삭제 ${del}건, 복구 ${restore}건`);
      await fetchClasses();
    } catch (err: any) {
      alert(err?.message || '삭제/복구 처리에 실패했습니다.');
    } finally {
      setIsToggling(false);
    }
  };

  /** ===== 이동 ===== */
  const goEdit = (id: string) => {
    navigate(`/seller/${storeUrl}/class/${encodeURIComponent(id)}/edit`);
  };
  const goDetail = (row: ClassRow) => {
    if (row._disabled) return;
    navigate(`/main/classes/${encodeURIComponent(row.id)}`);
  };

  /** ===== 화면 ===== */
  return (
    <>
      <Header />
      <Mainnavbar />

      <SellerSidenavbar>
        <div className="space-y-4 sm:space-y-6">
          {/* 헤더 */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold">클래스 관리</h1>
            </div>
          </div>

          {/* 로딩/에러 */}
          {isLoading && (
            <div className="rounded-lg border bg-white p-6 text-sm text-gray-600">
              불러오는 중...
            </div>
          )}
          {loadError && !isLoading && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-700">
              {loadError}
            </div>
          )}

          {/* 통계 카드 */}
          {!isLoading && !loadError && (
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white rounded-lg border p-3">
                <div className="text-lg font-bold text-gray-900">
                  {rows.filter((r) => !r._disabled).length}
                </div>
                <div className="text-xs text-gray-500">운영중인 클래스</div>
              </div>
              <div className="bg-white rounded-lg border p-3">
                <div className="text-lg font-bold text-gray-900">
                  {rows.filter((r) => r._disabled).length}
                </div>
                <div className="text-xs text-gray-500">삭제된/비활성 클래스</div>
              </div>
            </div>
          )}

          {/* 상단 액션 바 */}
          {!isLoading && !loadError && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-gray-50 rounded-lg">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    aria-label="전체 선택"
                    checked={allChecked}
                    onChange={toggleAll}
                    className="rounded"
                  />
                  <span className="text-sm font-medium">전체 선택</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={toggleDeletion}
                    disabled={checkedCount === 0 || isToggling}
                    className={[
                      'px-3 py-1.5 rounded-md border text-sm font-medium',
                      checkedCount === 0 || isToggling
                        ? 'opacity-50 cursor-not-allowed bg-gray-100'
                        : 'bg-white hover:bg-gray-50 border-red-200 text-red-600 hover:text-red-700',
                    ].join(' ')}
                  >
                    {isToggling ? '처리 중...' : `선택 삭제/복구 (${checkedCount})`}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 카드뷰(모바일) */}
          {!isLoading && !loadError && (
            <div className="block lg:hidden">
              {rows.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-gray-400 text-lg mb-2">📚</div>
                  <p className="text-gray-500 mb-4">등록된 클래스가 없습니다.</p>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {rows.map((r) => (
                    <div
                      key={r.id}
                      className={[
                        'rounded-xl border bg-white overflow-hidden shadow-sm hover:shadow-md transition-shadow',
                        r._disabled ? 'opacity-50' : '',
                      ].join(' ')}
                    >
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => goDetail(r)}
                          disabled={r._disabled}
                          className={[
                            'block h-48 w-full overflow-hidden',
                            r._disabled ? 'cursor-not-allowed opacity-60' : 'hover:opacity-95',
                          ].join(' ')}
                        >
                          <img
                            src={r.imageUrl}
                            alt={r.title}
                            className="w-full h-full object-cover"
                          />
                        </button>
                        <div className="absolute top-3 left-3">
                          <input
                            type="checkbox"
                            aria-label={`${r.title} 선택`}
                            checked={!!selected[r.id]}
                            onChange={() => toggleOne(r.id)}
                            className="w-4 h-4 rounded bg-white/80 backdrop-blur-sm"
                          />
                        </div>
                        {r._disabled && (
                          <div className="absolute top-3 right-3 px-2 py-1 bg-red-500 text-white text-xs rounded">
                            비활성
                          </div>
                        )}
                      </div>

                      <div className="p-4 space-y-3">
                        <div>
                          <button
                            type="button"
                            onClick={() => goDetail(r)}
                            disabled={r._disabled}
                            className={[
                              'text-left w-full focus:outline-none focus:ring-2 focus:ring-[#2D4739]/50 rounded',
                              r._disabled ? 'cursor-not-allowed opacity-60' : 'hover:underline',
                            ].join(' ')}
                          >
                            <h3 className="font-semibold text-gray-900 line-clamp-2">{r.title}</h3>
                            <p className="text-xs text-gray-500 mt-1">{r.id}</p>
                          </button>
                        </div>

                        <div className="space-y-2 text-sm">
                          <div className="flex items-center justify-between">
                            <span className="text-gray-600">장소</span>
                            <span className="font-medium truncate ml-2 max-w-[60%]" title={r.place}>
                              {r.place}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-gray-600">인원</span>
                            <span className="font-medium">{r.capacity}명</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-gray-600">가격</span>
                            <span className="font-bold text-[#2D4739]">₩{KRW.format(r.price)}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-gray-600">기간</span>
                            <span className="font-medium text-xs">
                              {r.period.start} ~ {r.period.end}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-gray-600">간격</span>
                            <span className="font-medium">{r.intervalMin}분</span>
                          </div>
                        </div>

                        <div className="pt-3 border-t text-xs text-gray-500 space-y-1">
                          <div>등록: {r.createdAt}</div>
                          <div>수정: {r.updatedAt}</div>
                          {r.deletedAt && <div className="text-red-500">삭제: {r.deletedAt}</div>}
                        </div>

                        <div className="pt-3">
                          <button
                            type="button"
                            onClick={() => goEdit(r.id)}
                            className="w-full px-4 py-2 rounded-md border border-gray-300 text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
                            disabled={r._disabled}
                          >
                            {r._disabled ? '비활성 클래스' : '수정하기'}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 테이블(데스크톱) */}
          {!isLoading && !loadError && (
            <div className="hidden lg:block rounded-2xl border border-gray-200 bg-white overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr className="text-left text-gray-600">
                      <th className="px-4 py-3 w-12">
                        <input
                          type="checkbox"
                          aria-label="전체 선택"
                          checked={allChecked}
                          onChange={toggleAll}
                          className="rounded"
                        />
                      </th>
                      <th className="px-4 py-3 w-20">이미지</th>
                      <th className="px-4 py-3 min-w-[160px]">클래스명</th>
                      <th className="px-4 py-3 min-w-[200px]">장소</th>
                      <th className="px-4 py-3 w-20">인원</th>
                      <th className="px-4 py-3 w-24">가격</th>
                      <th className="px-3 py-3 w-32">운영기간</th>
                      <th className="px-3 py-3 w-16 hidden xl:table-cell">간격</th>
                      <th className="px-3 py-3 w-24">최근 활동</th>
                      <th className="px-3 py-3 w-28 text-right">액션</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr
                        key={r.id}
                        className={[
                          'border-t border-gray-100 hover:bg-gray-25',
                          r._disabled ? 'opacity-50' : '',
                        ].join(' ')}
                      >
                        <td className="px-4 py-4 align-top w-12">
                          <input
                            type="checkbox"
                            aria-label={`${r.title} 선택`}
                            checked={!!selected[r.id]}
                            onChange={() => toggleOne(r.id)}
                            className="rounded"
                          />
                        </td>

                        <td className="px-4 py-4 align-top w-20">
                          <button
                            type="button"
                            onClick={() => goDetail(r)}
                            disabled={r._disabled}
                            className={[
                              'block h-12 w-16 overflow-hidden rounded-md border focus:outline-none focus:ring-2 focus:ring-[#2D4739]/50',
                              r._disabled
                                ? 'cursor-not-allowed opacity-60'
                                : 'hover:ring-1 hover:ring-gray-300',
                            ].join(' ')}
                          >
                            <img
                              src={r.imageUrl}
                              alt={r.title}
                              className="h-full w-full object-cover"
                            />
                          </button>
                        </td>

                        <td className="px-4 py-4 align-top min-w-[120px]">
                          <button
                            type="button"
                            onClick={() => goDetail(r)}
                            disabled={r._disabled}
                            className={[
                              'text-left focus:outline-none focus:ring-2 focus:ring-[#2D4739]/50 rounded',
                              r._disabled ? 'cursor-not-allowed opacity-60' : 'hover:underline',
                            ].join(' ')}
                          >
                            <div className="font-medium text-gray-900 truncate">{r.title}</div>
                          </button>
                        </td>

                        <td className="px-3 py-4 align-top min-w-[160px]">
                          <div className="max-w-[160px] truncate text-xs" title={r.place}>
                            {r.place}
                          </div>
                        </td>

                        <td className="px-3 py-4 align-top text-left w-24">
                          <span className="font-medium">{r.capacity}명</span>
                        </td>

                        <td className="px-3 py-4 align-top w-24">
                          <div className="font-bold text-[#2D4739] text-xs">
                            ₩{KRW.format(r.price)}
                          </div>
                        </td>

                        <td className="px-3 py-4 align-top w-32">
                          <div className="text-xs space-y-0.5">
                            <div>{r.period.start}</div>
                            <div>{r.period.end}</div>
                          </div>
                        </td>

                        <td className="px-3 py-4 align-top text-center hidden xl:table-cell w-16">
                          <span className="font-medium text-xs">{r.intervalMin}</span>
                          <div className="text-xs text-gray-500">분</div>
                        </td>

                        <td className="px-3 py-4 align-top w-24">
                          <div className="text-xs text-gray-600 space-y-0.5">
                            <div>수정: {r.updatedAt}</div>
                            {r.deletedAt && <div className="text-red-500">삭제: {r.deletedAt}</div>}
                          </div>
                        </td>

                        <td className="px-3 py-4 align-top text-right w-28">
                          <button
                            type="button"
                            onClick={toggleDeletion}
                            disabled={checkedCount === 0 || isToggling}
                            className={[
                              'mr-2 inline-flex items-center px-2 py-1 rounded-md border text-xs font-medium',
                              checkedCount === 0 || isToggling
                                ? 'opacity-50 cursor-not-allowed bg-gray-100'
                                : 'bg-white hover:bg-gray-50 border-red-200 text-red-600 hover:text-red-700',
                            ].join(' ')}
                          >
                            {isToggling ? '처리 중...' : '선택 삭제/복구'}
                          </button>
                          <button
                            type="button"
                            onClick={() => goEdit(r.id)}
                            disabled={r._disabled}
                            className="inline-flex items-center px-2 py-1 rounded-md border text-xs font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            수정
                          </button>
                        </td>
                      </tr>
                    ))}

                    {rows.length === 0 && (
                      <tr>
                        <td colSpan={10} className="px-4 py-12 text-center">
                          <div className="text-gray-400 text-2xl mb-3">📚</div>
                          <p className="text-gray-500 mb-4">등록된 클래스가 없습니다.</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </SellerSidenavbar>
    </>
  );
};

export default ClassList;
