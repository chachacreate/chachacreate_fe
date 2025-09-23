// src/domains/buyer/areas/notice/StoreNotice.tsx
import { useEffect, useMemo, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { legacyGet } from '@src/libs/request';
import Header from '@src/shared/areas/layout/features/header/Header';
import Storenavbar from '@src/shared/areas/navigation/features/navbar/store/Storenavbar';
import Footer from '@src/shared/areas/layout/features/footer/Footer';
import { Search, ChevronDown, ChevronUp, AlertCircle, RefreshCw } from 'lucide-react';

type Notice = {
  noticeId?: number | string;
  noticeTitle: string;
  noticeDate: string;
  noticeText?: string;
  noticeCheck?: number; // 1이면 고정(중요) 공지
};

type LegacyNoticeResponse = {
  status?: number;
  message?: string;
  data: Notice[]; // 레거시가 data에 배열을 담아줌
};

const NOTICES_PER_PAGE = 10;

function useStoreSegment() {
  const { storeUrl, store } = useParams<{ storeUrl?: string; store?: string }>();
  const location = useLocation();
  return useMemo(
    () => storeUrl ?? store ?? (location.pathname.split('/')[1] || 'main'),
    [storeUrl, store, location.pathname]
  );
}

function formatDate(d: string) {
  // YYYY-MM-DD로 표시(파arsing 실패 시 원문)
  const date = new Date(d);
  if (isNaN(date.getTime())) return d || '-';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function StoreNotice() {
  const segment = useStoreSegment();

  const [all, setAll] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [openRowKey, setOpenRowKey] = useState<string | number | null>(null);

  const fetchNotices = async () => {
    try {
      setLoading(true);
      setErr(null);
      // 레거시: `/${storeUrl}/seller/management/noticeselect`
      const res = await legacyGet<LegacyNoticeResponse>(`/${segment}/seller/management/noticeselect`);
      const list = Array.isArray(res?.data) ? res.data : [];

      // 고정공지 먼저
      const pinned = list.filter(n => Number(n.noticeCheck) === 1);
      const normal = list.filter(n => Number(n.noticeCheck) !== 1);
      setAll([...pinned, ...normal]);
      setPage(1);
      setOpenRowKey(null);
    } catch (e) {
      console.error(e);
      setErr('공지사항을 불러오는 데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [segment]);

  // 검색 적용 목록
  const filtered = useMemo(() => {
    if (!q.trim()) return all;
    const kw = q.trim().toLowerCase();
    return all.filter(n => (n.noticeTitle || '').toLowerCase().includes(kw));
  }, [all, q]);

  // 검색 중에는 레거시처럼 페이징 비활성화(전체 노출)
  const showing = useMemo(() => {
    if (q.trim()) return filtered;
    const start = (page - 1) * NOTICES_PER_PAGE;
    return filtered.slice(start, start + NOTICES_PER_PAGE);
  }, [filtered, page, q]);

  const totalPages = useMemo(() => Math.ceil(filtered.length / NOTICES_PER_PAGE) || 1, [filtered.length]);
  const group = Math.floor((page - 1) / 5);
  const startPage = group * 5 + 1;
  const endPage = Math.min(startPage + 4, totalPages);

  const handleToggle = (rowKey: string | number) => {
    setOpenRowKey(prev => (prev === rowKey ? null : rowKey));
  };

  const rowNumber = (idx: number) =>
    q.trim() ? idx + 1 : idx + 1 + (page - 1) * NOTICES_PER_PAGE;

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <Storenavbar />
      <main className="flex-1 w-full">
        <div className="mx-auto max-w-[1920px] px-4 sm:px-6 lg:px-[240px]">
          <div className="mx-auto max-w-[1440px] py-8 sm:py-10 lg:py-12">
            {/* 타이틀 + 새로고침 */}
            <div className="mb-6 flex items-center justify-between gap-3">
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">스토어 공지</h1>
              <button
                onClick={fetchNotices}
                className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium shadow-sm hover:bg-gray-50 active:translate-y-[1px]"
                disabled={loading}
                title="새로고침"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                새로고침
              </button>
            </div>

            {/* 검색바 */}
            <div className="mb-4">
              <div className="relative">
                <input
                  type="text"
                  value={q}
                  onChange={(e) => {
                    setQ(e.target.value);
                    setPage(1);
                    setOpenRowKey(null);
                  }}
                  placeholder="제목으로 검색"
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 pr-10 text-sm outline-none ring-0 focus:border-gray-300"
                />
                <Search className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              </div>
              {q.trim() && (
                <p className="mt-2 text-sm text-gray-500">
                  검색 결과: <span className="font-medium">{filtered.length}</span>건
                </p>
              )}
            </div>

            {/* 에러 표시 */}
            {err && (
              <div className="mb-4 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
                <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0" />
                <div className="text-sm">{err}</div>
              </div>
            )}

            {/* 테이블 카드 */}
            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
              {/* 헤더 */}
              <div className="hidden grid-cols-12 gap-4 border-b border-gray-100 px-4 py-3 text-sm font-semibold text-gray-700 sm:grid">
                <div className="col-span-2 sm:col-span-1">No</div>
                <div className="col-span-7 sm:col-span-8">제목</div>
                <div className="col-span-3 sm:col-span-3">등록 날짜</div>
              </div>

              {/* 목록 */}
              <ul className="divide-y divide-gray-100">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <li key={i} className="px-4 py-4">
                      <div className="grid grid-cols-12 items-center gap-4">
                        <div className="col-span-2 sm:col-span-1">
                          <div className="h-5 w-8 animate-pulse rounded bg-gray-100" />
                        </div>
                        <div className="col-span-7 sm:col-span-8">
                          <div className="h-5 w-3/4 animate-pulse rounded bg-gray-100" />
                        </div>
                        <div className="col-span-3 sm:col-span-3">
                          <div className="h-5 w-24 animate-pulse rounded bg-gray-100" />
                        </div>
                      </div>
                    </li>
                  ))
                ) : showing.length === 0 ? (
                  <li className="px-4 py-12 text-center text-sm text-gray-500">
                    공지사항이 없습니다.
                  </li>
                ) : (
                  showing.map((n, idx) => {
                    const key = n.noticeId ?? `${rowNumber(idx)}-${n.noticeTitle}`;
                    const open = openRowKey === key;
                    return (
                      <li key={key} className="px-4">
                        {/* 행 */}
                        <button
                          type="button"
                          className="grid w-full grid-cols-12 items-center gap-4 py-4 text-left"
                          onClick={() => handleToggle(key)}
                          aria-expanded={open}
                          aria-controls={`notice-panel-${key}`}
                        >
                          <div className="col-span-2 text-sm text-gray-600 sm:col-span-1">
                            {rowNumber(idx)}
                          </div>
                          <div className="col-span-7 sm:col-span-8">
                            <div className="flex items-center gap-2">
                              {Number(n.noticeCheck) === 1 && (
                                <span className="rounded-md bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800">
                                  고정
                                </span>
                              )}
                              <span className="line-clamp-1 text-sm font-medium">
                                {n.noticeTitle || '-'}
                              </span>
                            </div>
                          </div>
                          <div className="col-span-3 text-sm text-gray-600 sm:col-span-3">
                            {formatDate(n.noticeDate)}
                          </div>
                          <div className="col-span-12 flex justify-end sm:hidden">
                            {open ? (
                              <ChevronUp className="h-5 w-5 text-gray-400" />
                            ) : (
                              <ChevronDown className="h-5 w-5 text-gray-400" />
                            )}
                          </div>
                        </button>

                        {/* 상세(토글) */}
                        {n.noticeText && (
                          <div
                            id={`notice-panel-${key}`}
                            className={`${open ? 'block' : 'hidden'} pb-5`}
                          >
                            <div className="rounded-xl bg-gray-50 p-4 text-sm leading-7 text-gray-800">
                              {n.noticeText}
                            </div>
                          </div>
                        )}
                      </li>
                    );
                  })
                )}
              </ul>
            </div>

            {/* 페이징(검색 중엔 숨김) */}
            {!loading && !q.trim() && filtered.length > 0 && (
              <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
                {page > 1 && (
                  <button
                    className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm hover:bg-gray-50"
                    onClick={() => setPage(1)}
                    aria-label="첫 페이지"
                  >
                    «
                  </button>
                )}

                {startPage > 1 && (
                  <button
                    className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm hover:bg-gray-50"
                    onClick={() => setPage(startPage - 1)}
                    aria-label="이전 페이지 그룹"
                  >
                    ...
                  </button>
                )}

                {Array.from({ length: endPage - startPage + 1 }).map((_, i) => {
                  const p = startPage + i;
                  const active = p === page;
                  return (
                    <button
                      key={p}
                      className={`rounded-lg px-3 py-2 text-sm ${
                        active
                          ? 'border border-gray-900 bg-gray-900 text-white'
                          : 'border border-gray-200 bg-white hover:bg-gray-50'
                      }`}
                      onClick={() => setPage(p)}
                      aria-current={active ? 'page' : undefined}
                    >
                      {p}
                    </button>
                  );
                })}

                {endPage < totalPages && (
                  <button
                    className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm hover:bg-gray-50"
                    onClick={() => setPage(endPage + 1)}
                    aria-label="다음 페이지 그룹"
                  >
                    ...
                  </button>
                )}

                {page < totalPages && (
                  <button
                    className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm hover:bg-gray-50"
                    onClick={() => setPage(totalPages)}
                    aria-label="마지막 페이지"
                  >
                    »
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
