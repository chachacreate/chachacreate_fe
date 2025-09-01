// src/domains/seller/areas/class/features/reservation/pages/ClassReservation.tsx
import type { FC } from "react";
import { useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import Header from "@src/shared/areas/layout/features/header/Header";
import Mainnavbar from "@src/shared/areas/navigation/features/navbar/main/Mainnavbar";
import SellerSidenavbar from "@src/shared/areas/navigation/features/sidenavbar/seller/SellerSidenavbar";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

// 타입 정의
type Params = { storeUrl: string };

type ReservationRow = {
  id: string;
  date: string;          // YYYY-MM-DD
  classId: string;
  className: string;
  time: string;          // HH:mm
  customerName: string;
  customerPhone: string;
  paymentMethod: string;
  amount: number;
  status: "예약완료" | "수강완료" | "취소요청";
  updatedAt: string;     // YYYY-MM-DD
};

// 금액 포맷
const KRW = new Intl.NumberFormat("ko-KR");
const BRAND = "#2D4739";
const fmtKRW = (v: number) => `₩ ${KRW.format(v)}`;

// 24시간 데이터 생성 함수
const generate24HourData = (baseMultiplier = 1) => {
  const hours = [];
  for (let i = 0; i < 24; i++) {
    const hour = i.toString().padStart(2, '0') + ':00';
    const count = Math.floor(Math.random() * 15 * baseMultiplier) + 1;
    const revenue = count * (Math.floor(Math.random() * 30000) + 40000);
    hours.push({ key: hour, count, revenue });
  }
  return hours;
};

// 주별 데이터 생성 함수
const generateWeekData = (weekStart: string, baseMultiplier = 1) => {
  const weekdays = ['월', '화', '수', '목', '금', '토', '일'];
  return weekdays.map(day => {
    const count = Math.floor(Math.random() * 20 * baseMultiplier) + 5;
    const revenue = count * (Math.floor(Math.random() * 40000) + 50000);
    return { key: day, count, revenue };
  });
};

// 현재 주의 시작일 계산
const getCurrentWeekStart = () => {
  const today = new Date();
  const day = today.getDay();
  const diff = today.getDate() - day + (day === 0 ? -6 : 1); // 월요일이 시작
  const monday = new Date(today.setDate(diff));
  return monday.toISOString().split('T')[0];
};

// 더미 예약 데이터 (더 많은 데이터와 다양한 클래스)
const mockReservations: ReservationRow[] = [
  {
    id: "R-1001",
    date: "2025-09-01",
    classId: "C-3001",
    className: "도자기 원데이",
    time: "10:00",
    customerName: "김철수",
    customerPhone: "010-1111-2222",
    paymentMethod: "카드",
    amount: 55000,
    status: "예약완료",
    updatedAt: "2025-08-30",
  },
  {
    id: "R-1002",
    date: "2025-09-02",
    classId: "C-3002",
    className: "라탄 트레이",
    time: "11:00",
    customerName: "이영희",
    customerPhone: "010-3333-4444",
    paymentMethod: "계좌이체",
    amount: 60000,
    status: "수강완료",
    updatedAt: "2025-08-31",
  },
  {
    id: "R-1003",
    date: "2025-09-03",
    classId: "C-3003",
    className: "플라워 클래스",
    time: "14:00",
    customerName: "박민수",
    customerPhone: "010-5555-6666",
    paymentMethod: "카드",
    amount: 70000,
    status: "취소요청",
    updatedAt: "2025-09-01",
  },
  {
    id: "R-1004",
    date: "2025-08-15",
    classId: "C-3001",
    className: "도자기 원데이",
    time: "15:00",
    customerName: "정수진",
    customerPhone: "010-7777-8888",
    paymentMethod: "카드",
    amount: 55000,
    status: "수강완료",
    updatedAt: "2025-08-15",
  },
  {
    id: "R-1005",
    date: "2025-08-20",
    classId: "C-3004",
    className: "캔들 만들기",
    time: "16:30",
    customerName: "한지민",
    customerPhone: "010-9999-0000",
    paymentMethod: "계좌이체",
    amount: 45000,
    status: "예약완료",
    updatedAt: "2025-08-18",
  },
  {
    id: "R-1006",
    date: "2025-09-05",
    classId: "C-3002",
    className: "라탄 트레이",
    time: "13:00",
    customerName: "최민호",
    customerPhone: "010-1234-5678",
    paymentMethod: "카드",
    amount: 60000,
    status: "예약완료",
    updatedAt: "2025-09-02",
  },
];

// 클래스 목록
const classOptions = [
  { id: "ALL", name: "전체" },
  { id: "C-3001", name: "도자기 원데이" },
  { id: "C-3002", name: "라탄 트레이" },
  { id: "C-3003", name: "플라워 클래스" },
  { id: "C-3004", name: "캔들 만들기" },
];

const ClassReservation: FC = () => {
  const { storeUrl = "" } = useParams<Params>();
  const [globalMode, setGlobalMode] = useState<"hour" | "weekday">("hour");
  const [classMode, setClassMode] = useState<"hour" | "weekday">("hour");
  const [selectedMonth, setSelectedMonth] = useState<string>("2025-09");
  const [selectedWeek, setSelectedWeek] = useState<string>(getCurrentWeekStart());
  const [selectedClassWeek, setSelectedClassWeek] = useState<string>(getCurrentWeekStart());
  const [selectedClass, setSelectedClass] = useState<string>("C-3001");
  const [tableClassFilter, setTableClassFilter] = useState<string>("ALL");

  // 전체 통계 데이터
  const globalStats = useMemo(() => {
    if (globalMode === "hour") {
      return generate24HourData(1);
    } else {
      return generateWeekData(selectedWeek, 1);
    }
  }, [globalMode, selectedWeek]);

  // 클래스별 통계 데이터
  const classStats = useMemo(() => {
    if (classMode === "hour") {
      return generate24HourData(0.6); // 클래스별은 전체보다 조금 적게
    } else {
      return generateWeekData(selectedClassWeek, 0.6);
    }
  }, [classMode, selectedClassWeek, selectedClass]);

  // 테이블 필터링된 예약 데이터
  const filteredReservations = useMemo(() => {
    return mockReservations.filter(reservation => {
      const monthMatch = reservation.date.startsWith(selectedMonth);
      const classMatch = tableClassFilter === "ALL" || reservation.classId === tableClassFilter;
      return monthMatch && classMatch;
    });
  }, [selectedMonth, tableClassFilter]);

  return (
    <>
      <Header />
      <Mainnavbar />

      <SellerSidenavbar>
        <div className="space-y-8">
          {/* 전체 클래스 예약 통계 */}
          <section className="rounded-2xl border bg-white">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 px-4 sm:px-6 py-4 border-b">
              <h2 className="text-base sm:text-lg font-semibold">전체 클래스 예약 통계</h2>
              <div className="flex items-center gap-4">
                {globalMode === "weekday" && (
                  <div className="flex items-center gap-2">
                    <label className="text-xs sm:text-sm text-gray-600">주 선택</label>
                    <input
                      type="week"
                      value={selectedWeek}
                      onChange={(e) => setSelectedWeek(e.target.value)}
                      className="border rounded-md px-3 py-1.5 text-xs sm:text-sm"
                    />
                  </div>
                )}
                <div className="bg-gray-100 rounded-md p-1 inline-flex">
                  <button
                    type="button"
                    onClick={() => setGlobalMode("hour")}
                    className={[
                      "px-3 py-1.5 rounded text-xs sm:text-sm",
                      globalMode === "hour" ? "bg-white shadow" : "text-gray-600",
                    ].join(" ")}
                  >
                    시간별 (24시간)
                  </button>
                  <button
                    type="button"
                    onClick={() => setGlobalMode("weekday")}
                    className={[
                      "px-3 py-1.5 rounded text-xs sm:text-sm",
                      globalMode === "weekday" ? "bg-white shadow" : "text-gray-600",
                    ].join(" ")}
                  >
                    요일별
                  </button>
                </div>
              </div>
            </div>

            <div className="p-3 sm:p-6 h-[280px] sm:h-[360px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={globalStats} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="key" 
                    tick={{ fontSize: 12 }}
                    interval={globalMode === "hour" ? 1 : 0}
                  />
                  <YAxis yAxisId="count" tick={{ fontSize: 12 }} />
                  <YAxis
                    yAxisId="revenue"
                    orientation="right"
                    tickFormatter={(v) => KRW.format(v)}
                  />
                  <Tooltip
                    formatter={(v: number, name) =>
                      name === "예약 건수" ? [`${v} 건`, name] : [fmtKRW(v), name]
                    }
                  />
                  <Legend />
                  <Bar yAxisId="count" dataKey="count" name="예약 건수" fill="#8884d8" radius={[6, 6, 0, 0]} />
                  <Bar yAxisId="revenue" dataKey="revenue" name="결제 금액" fill={BRAND} radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* 클래스별 예약 통계 */}
          <section className="rounded-2xl border bg-white">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 px-4 sm:px-6 py-4 border-b">
              <div className="flex items-center gap-4">
                <h2 className="text-base sm:text-lg font-semibold">클래스별 예약 통계</h2>
                <div className="flex items-center gap-2">
                  <label className="text-xs sm:text-sm text-gray-600">클래스 선택</label>
                  <select
                    value={selectedClass}
                    onChange={(e) => setSelectedClass(e.target.value)}
                    className="border rounded-md px-3 py-1.5 text-xs sm:text-sm"
                  >
                    {classOptions.slice(1).map(option => (
                      <option key={option.id} value={option.id}>
                        {option.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-4">
                {classMode === "weekday" && (
                  <div className="flex items-center gap-2">
                    <label className="text-xs sm:text-sm text-gray-600">주 선택</label>
                    <input
                      type="week"
                      value={selectedClassWeek}
                      onChange={(e) => setSelectedClassWeek(e.target.value)}
                      className="border rounded-md px-3 py-1.5 text-xs sm:text-sm"
                    />
                  </div>
                )}
                <div className="bg-gray-100 rounded-md p-1 inline-flex">
                  <button
                    type="button"
                    onClick={() => setClassMode("hour")}
                    className={[
                      "px-3 py-1.5 rounded text-xs sm:text-sm",
                      classMode === "hour" ? "bg-white shadow" : "text-gray-600",
                    ].join(" ")}
                  >
                    시간별 (24시간)
                  </button>
                  <button
                    type="button"
                    onClick={() => setClassMode("weekday")}
                    className={[
                      "px-3 py-1.5 rounded text-xs sm:text-sm",
                      classMode === "weekday" ? "bg-white shadow" : "text-gray-600",
                    ].join(" ")}
                  >
                    요일별
                  </button>
                </div>
              </div>
            </div>

            <div className="p-3 sm:p-6 h-[280px] sm:h-[360px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={classStats} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="key" 
                    tick={{ fontSize: 12 }}
                    interval={classMode === "hour" ? 1 : 0}
                  />
                  <YAxis yAxisId="count" tick={{ fontSize: 12 }} />
                  <YAxis
                    yAxisId="revenue"
                    orientation="right"
                    tickFormatter={(v) => KRW.format(v)}
                  />
                  <Tooltip
                    formatter={(v: number, name) =>
                      name === "예약 건수" ? [`${v} 건`, name] : [fmtKRW(v), name]
                    }
                  />
                  <Legend />
                  <Bar yAxisId="count" dataKey="count" name="예약 건수" fill="#82ca9d" radius={[6, 6, 0, 0]} />
                  <Bar yAxisId="revenue" dataKey="revenue" name="결제 금액" fill={BRAND} radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* 클래스 예약 확인 테이블 */}
          <section className="rounded-2xl border bg-white">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between px-4 sm:px-6 py-4 border-b gap-3">
              <h2 className="text-base sm:text-lg font-semibold">클래스 예약 확인</h2>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <label className="text-xs sm:text-sm text-gray-600">클래스 필터</label>
                  <select
                    value={tableClassFilter}
                    onChange={(e) => setTableClassFilter(e.target.value)}
                    className="border rounded-md px-3 py-1.5 text-xs sm:text-sm"
                  >
                    {classOptions.map(option => (
                      <option key={option.id} value={option.id}>
                        {option.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs sm:text-sm text-gray-600">월 선택</label>
                  <input
                    type="month"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="border rounded-md px-3 py-1.5 text-xs sm:text-sm"
                  />
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[960px] text-xs sm:text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="px-3 py-3 text-left">예약 일자</th>
                    <th className="px-3 py-3 text-left">클래스명</th>
                    <th className="px-3 py-3 text-left">예약 시간</th>
                    <th className="px-3 py-3 text-left">예약자명</th>
                    <th className="px-3 py-3 text-left">연락처</th>
                    <th className="px-3 py-3 text-left">결제 방법</th>
                    <th className="px-3 py-3 text-right">결제 금액</th>
                    <th className="px-3 py-3 text-left">예약 상태</th>
                    <th className="px-3 py-3 text-left">최근 수정일</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReservations.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-3 py-8 text-center text-gray-500">
                        선택한 조건에 해당하는 예약이 없습니다.
                      </td>
                    </tr>
                  ) : (
                    filteredReservations.map((r) => (
                      <tr key={r.id} className="border-t border-gray-100">
                        <td className="px-3 py-3">{r.date}</td>
                        <td className="px-3 py-3">{r.className}</td>
                        <td className="px-3 py-3">{r.time}</td>
                        <td className="px-3 py-3">{r.customerName}</td>
                        <td className="px-3 py-3">{r.customerPhone}</td>
                        <td className="px-3 py-3">{r.paymentMethod}</td>
                        <td className="px-3 py-3 text-right">₩ {KRW.format(r.amount)}</td>
                        <td className="px-3 py-3">
                          {r.status === "예약완료" && (
                            <span className="px-2 py-1 rounded-full text-xs bg-emerald-100 text-emerald-700">
                              예약완료
                            </span>
                          )}
                          {r.status === "수강완료" && (
                            <span className="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-700">
                              수강완료
                            </span>
                          )}
                          {r.status === "취소요청" && (
                            <span className="px-2 py-1 rounded-full text-xs bg-rose-100 text-rose-700">
                              취소요청
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-3">{r.updatedAt}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* 테이블 요약 정보 */}
            {filteredReservations.length > 0 && (
              <div className="px-4 sm:px-6 py-3 border-t bg-gray-50 text-xs sm:text-sm text-gray-600">
                총 {filteredReservations.length}건 | 
                총 금액: {fmtKRW(filteredReservations.reduce((sum, r) => sum + r.amount, 0))}
              </div>
            )}
          </section>
        </div>
      </SellerSidenavbar>
    </>
  );
};

export default ClassReservation;