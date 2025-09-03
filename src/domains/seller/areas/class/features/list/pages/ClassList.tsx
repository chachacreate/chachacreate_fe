// src/domains/seller/areas/class/features/list/pages/ClassList.tsx
import type { FC } from "react";
import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Header from "@src/shared/areas/layout/features/header/Header";
import Mainnavbar from "@src/shared/areas/navigation/features/navbar/main/Mainnavbar";
import SellerSidenavbar from "@src/shared/areas/navigation/features/sidenavbar/seller/SellerSidenavbar";

type Params = { storeUrl: string };

type ClassRow = {
  id: string;
  imageUrl?: string;
  title: string;
  place: string;             // 주소 요약
  capacity: number;          // 최대 인원
  price: number;             // 회당 가격
  period: { start: string; end: string }; // YYYY-MM-DD
  intervalMin: number;       // 시간 간격(분)
  createdAt: string;         // YYYY-MM-DD
  updatedAt: string;         // YYYY-MM-DD
  deletedAt: string | null;  // YYYY-MM-DD | null
};

const KRW = new Intl.NumberFormat("ko-KR");

const PLACEHOLDER_IMG =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='240' height='160'>
      <rect width='100%' height='100%' fill='%23f3f4f6'/>
      <text x='50%' y='52%' dominant-baseline='middle' text-anchor='middle' font-size='14' fill='%239ca3af'>IMAGE</text>
    </svg>`
  );

const mockRows: ClassRow[] = [
  {
    id: "c1",
    imageUrl: "",
    title: "도자기 원데이",
    place: "서울 마포구 서교동 123-45",
    capacity: 8,
    price: 55000,
    period: { start: "2025-09-05", end: "2025-09-30" },
    intervalMin: 60,
    createdAt: "2025-08-20",
    updatedAt: "2025-08-28",
    deletedAt: null,
  },
  {
    id: "c2",
    imageUrl: "",
    title: "라탄 트레이 만들기",
    place: "서울 성동구 성수동 22-10",
    capacity: 10,
    price: 60000,
    period: { start: "2025-09-10", end: "2025-10-10" },
    intervalMin: 90,
    createdAt: "2025-08-15",
    updatedAt: "2025-08-25",
    deletedAt: "2025-08-30",
  },
  {
    id: "c3",
    imageUrl: "",
    title: "플라워 클래스",
    place: "서울 강남구 신사동 77-1",
    capacity: 6,
    price: 70000,
    period: { start: "2025-09-12", end: "2025-09-28" },
    intervalMin: 60,
    createdAt: "2025-08-22",
    updatedAt: "2025-08-29",
    deletedAt: null,
  },
];

const ClassList: FC = () => {
  const { storeUrl = "" } = useParams<Params>();
  const navigate = useNavigate();

  const [rows, setRows] = useState<ClassRow[]>(mockRows);
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  const allChecked = useMemo(
    () => rows.length > 0 && rows.every((r) => selected[r.id]),
    [rows, selected]
  );
  const checkedCount = useMemo(
    () => rows.filter((r) => selected[r.id]).length,
    [rows, selected]
  );

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

  // 임시 다중 삭제: 선택된 항목의 deletedAt을 오늘로 세팅
  const bulkDelete = () => {
    if (checkedCount === 0) return;
    const today = new Date().toISOString().slice(0, 10);
    setRows((prev) =>
      prev.map((r) => (selected[r.id] ? { ...r, deletedAt: today } : r))
    );
    setSelected({});
  };

  const goEdit = (id: string) => {
    navigate(`/seller/${storeUrl}/class/insert?edit=${encodeURIComponent(id)}`);
  };

  const goDetail = (row: ClassRow) => {
  if (row.deletedAt) return; // 삭제된 클래스는 이동 금지
  navigate(`/main/classes/${encodeURIComponent(row.id)}`);
};

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
              <p className="text-sm text-gray-500 mt-1">storeUrl: {storeUrl}</p>
            </div>
          </div>

          {/* 통계 카드 (작게 상단 배치) */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-lg border p-3">
              <div className="text-lg font-bold text-gray-900">{rows.filter(r => !r.deletedAt).length}</div>
              <div className="text-xs text-gray-500">운영중인 클래스</div>
            </div>
            <div className="bg-white rounded-lg border p-3">
              <div className="text-lg font-bold text-gray-900">{rows.filter(r => r.deletedAt).length}</div>
              <div className="text-xs text-gray-500">삭제된 클래스</div>
            </div>
          </div>

          {/* 상단 액션 바 */}
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
                  onClick={bulkDelete}
                  disabled={checkedCount === 0}
                  className={[
                    "px-3 py-1.5 rounded-md border text-sm font-medium",
                    checkedCount === 0
                      ? "opacity-50 cursor-not-allowed bg-gray-100"
                      : "bg-white hover:bg-gray-50 border-red-200 text-red-600 hover:text-red-700",
                  ].join(" ")}
                >
                  선택 삭제 ({checkedCount})
                </button>
              </div>
            </div>
          </div>

          {/* 카드 뷰 (모바일용) */}
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
                      "rounded-xl border bg-white overflow-hidden shadow-sm hover:shadow-md transition-shadow",
                      r.deletedAt ? "opacity-50" : "",
                    ].join(" ")}
                  >
                    {/* 이미지 & 체크박스 */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => goDetail(r)}
                        disabled={!!r.deletedAt}
                        className={[
                        "block h-48 w-full overflow-hidden",
                        r.deletedAt ? "cursor-not-allowed opacity-60" : "hover:opacity-95"
                        ].join(" ")}
                        aria-disabled={!!r.deletedAt}
                        title={r.deletedAt ? "삭제된 클래스는 이동할 수 없습니다" : `${r.title} 상세보기`}
                    >
                        <img
                        src={r.imageUrl || PLACEHOLDER_IMG}
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
                      {r.deletedAt && (
                        <div className="absolute top-3 right-3 px-2 py-1 bg-red-500 text-white text-xs rounded">
                          삭제됨
                        </div>
                      )}
                    </div>

                    {/* 콘텐츠 */}
                    <div className="p-4 space-y-3">
                      <div>
                        <button
                        type="button"
                        onClick={() => goDetail(r)}
                        disabled={!!r.deletedAt}
                        className={[
                            "text-left w-full focus:outline-none focus:ring-2 focus:ring-[#2D4739]/50 rounded",
                            r.deletedAt ? "cursor-not-allowed opacity-60" : "hover:underline"
                        ].join(" ")}
                        aria-disabled={!!r.deletedAt}
                        title={r.deletedAt ? "삭제된 클래스는 이동할 수 없습니다" : `${r.title} 상세보기`}
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

                      {/* 날짜 정보 */}
                      <div className="pt-3 border-t text-xs text-gray-500 space-y-1">
                        <div>등록: {r.createdAt}</div>
                        <div>수정: {r.updatedAt}</div>
                        {r.deletedAt && <div className="text-red-500">삭제: {r.deletedAt}</div>}
                      </div>

                      {/* 액션 버튼 */}
                      <div className="pt-3">
                        <button
                          type="button"
                          onClick={() => goEdit(r.id)}
                          className="w-full px-4 py-2 rounded-md border border-gray-300 text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
                          disabled={!!r.deletedAt}
                        >
                          {r.deletedAt ? "삭제된 클래스" : "수정하기"}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 테이블 뷰 (데스크톱용) */}
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
                    <th className="px-3 py-3 w-20 text-right">액션</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className={[
                      "border-t border-gray-100 hover:bg-gray-25",
                      r.deletedAt ? "opacity-50" : ""
                    ].join(" ")}>
                      {/* 체크박스 */}
                      <td className="px-4 py-4 align-top w-12">
                        <input
                          type="checkbox"
                          aria-label={`${r.title} 선택`}
                          checked={!!selected[r.id]}
                          onChange={() => toggleOne(r.id)}
                          className="rounded"
                        />
                      </td>

                      {/* 이미지 */}
                        <td className="px-4 py-4 align-top w-20">
                        <button
                            type="button"
                            onClick={() => goDetail(r)}
                            disabled={!!r.deletedAt}
                            className={[
                            "block h-12 w-16 overflow-hidden rounded-md border focus:outline-none focus:ring-2 focus:ring-[#2D4739]/50",
                            r.deletedAt ? "cursor-not-allowed opacity-60" : "hover:ring-1 hover:ring-gray-300"
                            ].join(" ")}
                            aria-disabled={!!r.deletedAt}
                            title={r.deletedAt ? "삭제된 클래스는 이동할 수 없습니다" : `${r.title} 상세보기`}
                        >
                            <img
                            src={r.imageUrl || PLACEHOLDER_IMG}
                            alt={r.title}
                            className="h-full w-full object-cover"
                            />
                        </button>
                        </td>

                        {/* 클래스명 */}
                        <td className="px-4 py-4 align-top min-w-[120px]">
                        <button
                            type="button"
                            onClick={() => goDetail(r)}
                            disabled={!!r.deletedAt}
                            className={[
                            "text-left focus:outline-none focus:ring-2 focus:ring-[#2D4739]/50 rounded",
                            r.deletedAt ? "cursor-not-allowed opacity-60" : "hover:underline"
                            ].join(" ")}
                            aria-disabled={!!r.deletedAt}
                            title={r.deletedAt ? "삭제된 클래스는 이동할 수 없습니다" : `${r.title} 상세보기`}
                        >
                            <div className="font-medium text-gray-900 truncate">{r.title}</div>
                            <div className="text-xs text-gray-500 mt-1">{r.id}</div>
                        </button>
                        </td>

                      {/* 장소 */}
                      <td className="px-3 py-4 align-top min-w-[160px]">
                        <div className="max-w-[160px] truncate text-xs" title={r.place}>
                          {r.place.split(' ').slice(0, 2).join(' ')}
                        </div>
                      </td>

                      {/* 인원 */}
                      <td className="px-3 py-4 align-top text-left w-24">
                        <span className="font-medium">{r.capacity}명</span>
                      </td>

                      {/* 가격 */}
                      <td className="px-3 py-4 align-top w-24">
                        <div className="font-bold text-[#2D4739] text-xs">₩{KRW.format(r.price)}</div>
                      </td>

                      {/* 기간 */}
                      <td className="px-3 py-4 align-top w-32">
                        <div className="text-xs space-y-0.5">
                          <div>{r.period.start}</div>
                          <div>{r.period.end}</div>
                        </div>
                      </td>

                      {/* 간격 (xl 이상에서만 표시) */}
                      <td className="px-3 py-4 align-top text-center hidden xl:table-cell w-16">
                        <span className="font-medium text-xs">{r.intervalMin}</span>
                        <div className="text-xs text-gray-500">분</div>
                      </td>

                      {/* 최근 활동 (수정일/삭제일 통합) */}
                      <td className="px-3 py-4 align-top w-24">
                        <div className="text-xs text-gray-600 space-y-0.5">
                          <div>수정: {r.updatedAt}</div>
                          {r.deletedAt && <div className="text-red-500">삭제: {r.deletedAt}</div>}
                        </div>
                      </td>

                      {/* 액션 */}
                      <td className="px-3 py-4 align-top text-right w-20">
                        <button
                          type="button"
                          onClick={() => goEdit(r.id)}
                          disabled={!!r.deletedAt}
                          className="inline-flex items-center px-2 py-1 rounded-md border text-xs font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          수정
                        </button>
                      </td>
                    </tr>
                  ))}

                  {rows.length === 0 && (
                    <tr>
                      <td colSpan={9} className="px-4 py-12 text-center">
                        <div className="text-gray-400 text-2xl mb-3">📚</div>
                        <p className="text-gray-500 mb-4">등록된 클래스가 없습니다.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </SellerSidenavbar>
    </>
  );
};

export default ClassList;