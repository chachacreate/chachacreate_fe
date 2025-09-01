// src/domains/seller/areas/store/features/notice/pages/StoreNotice.tsx
import type { FC, FormEvent } from "react";
import { useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";

import Header from "@src/shared/areas/layout/features/header/Header";
import Mainnavbar from "@src/shared/areas/navigation/features/navbar/main/Mainnavbar";
import SellerSidenavbar from "@src/shared/areas/navigation/features/sidenavbar/seller/SellerSidenavbar";

type Params = {
  storeUrl?: string;
};

type Notice = {
  id: string;
  title: string;
  content: string;
  isImportant: boolean;
  createdAt: string;   // YYYY-MM-DD
  updatedAt: string;   // YYYY-MM-DD
  deletedAt: string | null; // YYYY-MM-DD | null
};

const todayYMD = (): string => new Date().toISOString().slice(0, 10);

// ---- Mock Data ----
const MOCK: Notice[] = [
  {
    id: "N-1003",
    title: "추석 연휴 배송/클래스 운영 안내",
    content:
      "연휴 기간 중 일부 클래스는 휴강되며, 상세 일정은 각 클래스 상세에서 확인 부탁드립니다.",
    isImportant: true,
    createdAt: "2025-08-31",
    updatedAt: "2025-08-31",
    deletedAt: null,
  },
  {
    id: "N-1002",
    title: "스토어 리뉴얼 공지",
    content: "UI/UX 개선을 위한 리뉴얼이 9/10 예정입니다.",
    isImportant: false,
    createdAt: "2025-08-25",
    updatedAt: "2025-08-26",
    deletedAt: null,
  },
  {
    id: "N-1001",
    title: "일부 클래스 일시 중단 안내",
    content: "시설 점검으로 9/3, 9/4 양일간 일부 클래스가 중단됩니다.",
    isImportant: false,
    createdAt: "2025-08-20",
    updatedAt: "2025-08-21",
    deletedAt: "2025-08-28",
  },
];

const PAGE_SIZE = 10;

const StoreNotice: FC = () => {
  const { storeUrl = "" } = useParams<Params>();
  const [notices, setNotices] = useState<Notice[]>(MOCK);
  const [query, setQuery] = useState<string>("");
  const [page, setPage] = useState<number>(1);

  // 폼 패널 상태
  const [panelOpen, setPanelOpen] = useState<boolean>(false);
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [editingId, setEditingId] = useState<string | null>(null);

  // 폼 값
  const [formTitle, setFormTitle] = useState<string>("");
  const [formContent, setFormContent] = useState<string>("");
  const [formImportant, setFormImportant] = useState<boolean>(false);

  const scrollRef = useRef<HTMLDivElement>(null);

  // 검색 필터
  const filtered = useMemo(() => {
    const q = query.trim();
    if (!q) return notices;
    return notices.filter(
      (n) =>
        n.title.toLowerCase().includes(q.toLowerCase()) ||
        n.content.toLowerCase().includes(q.toLowerCase())
    );
  }, [query, notices]);

  // 페이지네이션
  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageSlice = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, currentPage]);

  // 열기/닫기
  const openCreate = (): void => {
    setMode("create");
    setEditingId(null);
    setFormTitle("");
    setFormContent("");
    setFormImportant(false);
    setPanelOpen(true);
    scrollRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const openEdit = (row: Notice): void => {
    setMode("edit");
    setEditingId(row.id);
    setFormTitle(row.title);
    setFormContent(row.content);
    setFormImportant(row.isImportant);
    setPanelOpen(true);
    scrollRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const closePanel = (): void => setPanelOpen(false);

  // 등록/수정
  const handleSubmit = (e: FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    const now = todayYMD();

    if (mode === "create") {
      const newId = `N-${String(Math.floor(Math.random() * 9000) + 1000)}`;
      const next: Notice = {
        id: newId,
        title: formTitle || "(제목 없음)",
        content: formContent || "",
        isImportant: formImportant,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      };
      setNotices((prev) => [next, ...prev]);
      setPanelOpen(false);
      setPage(1);
      return;
    }

    if (mode === "edit" && editingId) {
      setNotices((prev) =>
        prev.map((n) =>
          n.id === editingId
            ? {
                ...n,
                title: formTitle || "(제목 없음)",
                content: formContent || "",
                isImportant: formImportant,
                updatedAt: now,
              }
            : n
        )
      );
      setPanelOpen(false);
    }
  };

  // 삭제 토글
  const toggleDelete = (id: string): void => {
    const now = todayYMD();
    setNotices((prev) =>
      prev.map((n) =>
        n.id === id ? { ...n, deletedAt: n.deletedAt ? null : now, updatedAt: now } : n
      )
    );
  };

  const goPage = (p: number): void => {
    if (p < 1 || p > totalPages) return;
    setPage(p);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    setQuery(e.target.value);
    setPage(1);
  };

  return (
    <>
      <Header />
      <Mainnavbar />

      <SellerSidenavbar>
        {/* 상단으로 스크롤 anchor */}
        <div ref={scrollRef} />

        <div className="space-y-4 sm:space-y-6">
          {/* 타이틀 + 액션 */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold">공지사항</h1>
              <p className="text-sm text-gray-500 mt-1">storeUrl: {storeUrl}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={openCreate}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-[#2D4739] text-white text-sm font-medium hover:bg-[#1f3128]"
              >
                <span className="text-lg leading-none">＋</span>
                새 공지 등록
              </button>
            </div>
          </div>

          {/* 검색 */}
          <div className="rounded-2xl border bg-white p-3 sm:p-4">
            <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
              <div className="flex-1">
                <div className="flex h-9 items-center gap-2 rounded-full border border-gray-300 bg-white px-3 shadow-sm min-w-0 text-gray-700">
                  <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M15.5 14h-.79l-.28-.27a6.471 6.471 0 0 0 1.57-4.23C16 6.01 13.99 4 11.5 4S7 6.01 7 9.5 9.01 15 11.5 15c1.61 0 3.09-.59 4.23-1.57l.27.28v.79L20 19.49 21.49 18 15.5 14Zm-4 0C9.01 14 7 11.99 7 9.5S9.01 5 11.5 5 16 7.01 16 9.5 13.99 14 11.5 14Z" />
                  </svg>
                  <input
                    type="search"
                    value={query}
                    onChange={handleSearchChange}
                    placeholder="제목/내용으로 검색"
                    className="w-full min-w-0 bg-transparent text-sm text-gray-900 placeholder-gray-400 caret-[#2d4739] outline-none ring-0 focus:outline-none"
                    autoComplete="off"
                  />
                  {query && (
                    <button
                      type="button"
                      onClick={() => setQuery("")}
                      className="shrink-0 text-gray-400 hover:text-gray-600"
                      title="검색어 지우기"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
              <div>
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    setPage(1);
                  }}
                  className="px-3 py-2 rounded-md border text-sm hover:bg-gray-50"
                >
                  초기화
                </button>
              </div>
            </div>
          </div>

          {/* 테이블 */}
          <div className="rounded-2xl border bg-white overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full table-fixed min-w-[880px] text-xs sm:text-sm">
                <colgroup>
                  <col className="w-[72px]" />
                  <col className="w-[40%]" />
                  <col className="w-[140px]" />
                  <col className="w-[140px]" />
                  <col className="hidden lg:table-column w-[140px]" />
                  <col className="w-[180px]" />
                </colgroup>
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="px-3 py-3 text-left">번호</th>
                    <th className="px-3 py-3 text-left">제목</th>
                    <th className="px-3 py-3 text-left">작성일</th>
                    <th className="px-3 py-3 text-left">최근 수정일</th>
                    <th className="px-3 py-3 text-left hidden lg:table-cell">최근 삭제일</th>
                    <th className="px-3 py-3 text-right">액션</th>
                  </tr>
                </thead>
                <tbody className="[&>tr:hover]:bg-gray-50/70">
                  {pageSlice.map((n, idx) => {
                    const rowNo = (currentPage - 1) * PAGE_SIZE + idx + 1;
                    const isDeleted = !!n.deletedAt;
                    return (
                      <tr
                        key={n.id}
                        className={[
                          "border-t border-gray-100 align-top",
                          isDeleted ? "opacity-60" : "",
                        ].join(" ")}
                      >
                        <td className="px-3 py-3">{rowNo}</td>
                        <td className="px-3 py-3">
                          <div className="flex items-start gap-2">
                            {/* CHANGED: 중요 배지 -> ⭐ 이모지 */}
                            {n.isImportant && (
                              <span
                                className="mt-0.5 inline-flex items-center justify-center rounded-full text-[13px] leading-none"
                                aria-label="중요 공지"
                                title="중요 공지"
                              >
                                ⭐
                                <span className="sr-only">중요</span>
                              </span>
                            )}
                            <div className="min-w-0">
                              <div className="font-medium truncate" title={n.title}>
                                {n.title}
                              </div>
                              <div
                                className="text-[11px] text-gray-500 truncate max-w-[520px]"
                                title={n.content}
                              >
                                {n.content}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap">{n.createdAt}</td>
                        <td className="px-3 py-3 whitespace-nowrap">{n.updatedAt}</td>
                        <td className="px-3 py-3 whitespace-nowrap hidden lg:table-cell">
                          {n.deletedAt ? n.deletedAt : <span className="text-gray-400">—</span>}
                        </td>
                        <td className="px-3 py-3 text-right">
                          <div className="inline-flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => openEdit(n)}
                              disabled={isDeleted}
                              className="px-2.5 py-1.5 rounded-md border text-xs font-medium hover:bg-gray-50 disabled:opacity-50"
                              title={isDeleted ? "삭제된 공지는 수정할 수 없습니다" : "수정"}
                            >
                              수정
                            </button>
                            <button
                              type="button"
                              onClick={() => toggleDelete(n.id)}
                              className={[
                                "px-2.5 py-1.5 rounded-md border text-xs font-medium",
                                isDeleted
                                  ? "border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                                  : "border-rose-200 text-rose-700 hover:bg-rose-50",
                              ].join(" ")}
                            >
                              {isDeleted ? "삭제 취소" : "삭제"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {pageSlice.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center text-gray-500">
                        공지가 없습니다.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* 페이지네이션 */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-3 sm:px-4 py-3 border-t bg-white">
              <div className="text-xs text-gray-500">
                총 <b>{total}</b>건 · 페이지 <b>{currentPage}</b> / {totalPages}
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  className="px-2.5 py-1.5 rounded-md border text-xs hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={() => goPage(1)}
                  disabled={currentPage === 1}
                >
                  « 처음
                </button>
                <button
                  type="button"
                  className="px-2.5 py-1.5 rounded-md border text-xs hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={() => goPage(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  ‹ 이전
                </button>
                <span className="px-2 text-xs">|</span>
                <button
                  type="button"
                  className="px-2.5 py-1.5 rounded-md border text-xs hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={() => goPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  다음 ›
                </button>
                <button
                  type="button"
                  className="px-2.5 py-1.5 rounded-md border text-xs hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={() => goPage(totalPages)}
                  disabled={currentPage === totalPages}
                >
                  끝 »
                </button>
              </div>
            </div>
          </div>

          {/* 우측 슬라이드 패널 */}
          {panelOpen && (
            <>
              {/* CHANGED: Overlay z-index 업 (z-[190]) */}
              <div
                className="fixed inset-0 bg-black/30 z-[190]"
                onClick={closePanel}
                aria-hidden="true"
              />
              {/* CHANGED: Panel z-index 업 (z-[200]) */}
              <div
                className="fixed inset-y-0 right-0 z-[200] w-full max-w-[560px] bg-white shadow-xl border-l"
                role="dialog"
                aria-modal="true"
              >
                <div className="h-full flex flex-col">
                  {/* Panel Header */}
                  <div className="px-4 sm:px-5 py-3 border-b flex items-center justify-between">
                    <div className="min-w-0">
                      <h3 className="text-base sm:text-lg font-semibold">
                        {mode === "create" ? "공지 등록" : "공지 수정"}
                      </h3>
                      {mode === "edit" && editingId && (
                        <p className="text-xs text-gray-500 mt-0.5">ID: {editingId}</p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={closePanel}
                      className="px-3 py-1.5 rounded-md border text-xs hover:bg-gray-50"
                    >
                      닫기
                    </button>
                  </div>

                  {/* Form */}
                  <form
                    className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4"
                    onSubmit={handleSubmit}
                  >
                    {/* 제목 */}
                    <label className="grid gap-1">
                      <span className="text-xs sm:text-sm font-medium">제목</span>
                      <input
                        type="text"
                        value={formTitle}
                        onChange={(e) => setFormTitle(e.target.value)}
                        placeholder="공지 제목을 입력하세요"
                        className="border rounded-md px-3 py-2"
                      />
                    </label>

                    {/* 내용 */}
                    <label className="grid gap-1">
                      <span className="text-xs sm:text-sm font-medium">내용</span>
                      <textarea
                        value={formContent}
                        onChange={(e) => setFormContent(e.target.value)}
                        placeholder="공지 내용을 입력하세요"
                        rows={8}
                        className="border rounded-md px-3 py-2 resize-y"
                      />
                    </label>

                    {/* 중요 공지 */}
                    <label className="inline-flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formImportant}
                        onChange={(e) => setFormImportant(e.target.checked)}
                        className="rounded"
                      />
                      <span className="text-sm">중요 공지로 표시</span>
                    </label>

                    {/* Actions */}
                    <div className="pt-2 flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={closePanel}
                        className="px-4 py-2 rounded-md border text-sm hover:bg-gray-50"
                      >
                        취소
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 rounded-md bg-[#2D4739] text-white text-sm font-medium hover:bg-[#1f3128]"
                      >
                        {mode === "create" ? "공지 등록" : "수정 저장"}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </>
          )}
        </div>
      </SellerSidenavbar>
    </>
  );
};

export default StoreNotice;
