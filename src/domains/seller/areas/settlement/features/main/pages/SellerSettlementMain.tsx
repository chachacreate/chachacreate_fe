// src/domains/seller/settlement/SellerSettlementMain.tsx
import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Header from "@src/shared/areas/layout/features/header/Header";
import Mainnavbar from "@src/shared/areas/navigation/features/navbar/main/Mainnavbar";
import SellerSidenavbar from "@src/shared/areas/navigation/features/sidenavbar/seller/SellerSidenavbar";
import { Package, Receipt, ChevronRight } from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

// ------------------ Types ------------------
type ProductOrderStatus = "신규주문" | "배송 완료" | "취소" | "환불";
type ProductSale = {
  id: string;
  date: string;           // YYYY-MM-DD
  productId: string;
  title: string;
  quantity: number;
  amount: number;         // 환불/취소는 제외할 때 필터로 거름
  status: ProductOrderStatus;
};

type ClassSale = {
  id: string;
  date: string;           // YYYY-MM-DD
  classId: string;
  title: string;
  attendees: number;
  amount: number;
  refunded?: boolean;
};

type SettlementRow = {
  date: string;
  amount: number;
  account: string;
  bank: string;
  holder: string;
  status: "정산 완료" | "정산 예정" | "보류";
  updatedAt: string;
};

// ------------------ MOCK DATA ------------------
// 상품 TX (상태 포함)
const TX_PRODUCT: ProductSale[] = [
  { id: "tp1", date: "2025-08-17", productId: "P-1001", title: "핸드메이드 머그컵", quantity: 2, amount: 36000, status: "신규주문" },
  { id: "tp2", date: "2025-08-17", productId: "P-1002", title: "드라이플라워 소품", quantity: 1, amount: 18000, status: "배송 완료" },
  { id: "tp3", date: "2025-08-18", productId: "P-1003", title: "수채화 엽서 세트", quantity: 5, amount: 25000, status: "배송 완료" },
  { id: "tp4", date: "2025-08-19", productId: "P-1001", title: "핸드메이드 머그컵", quantity: 1, amount: 18000, status: "신규주문" },
  { id: "tp5", date: "2025-08-21", productId: "P-1001", title: "핸드메이드 머그컵", quantity: 3, amount: 54000, status: "배송 완료" },
  { id: "tp6", date: "2025-08-21", productId: "P-1002", title: "드라이플라워 소품", quantity: 1, amount: 18000, status: "환불" }, // 제외
];

// 클래스 TX (환불 여부)
const TX_CLASS: ClassSale[] = [
  { id: "tc1", date: "2025-08-17", classId: "C-3001", title: "도자기 원데이", attendees: 6, amount: 330000 },
  { id: "tc2", date: "2025-08-17", classId: "C-3002", title: "플라워 클래스", attendees: 4, amount: 240000 },
  { id: "tc3", date: "2025-08-18", classId: "C-3003", title: "수채화 입문", attendees: 8, amount: 560000 },
  { id: "tc4", date: "2025-08-19", classId: "C-3001", title: "도자기 원데이", attendees: 5, amount: 275000 },
  { id: "tc5", date: "2025-08-21", classId: "C-3001", title: "도자기 원데이", attendees: 6, amount: 330000 },
  // { id: "tc6", date: "2025-05-20", classId: "C-3004", title: "천연 비누 공방", attendees: 5, amount: 225000, refunded: true },
];

// 정산 테이블(상품+클래스 합쳐서 보여줌)
const SETTLEMENT_CLASS: Record<string, SettlementRow[]> = {
  "C-3001": [
    { date: "2025-08-17", amount: 1000000, account: "1002-858-069-478", bank: "우리은행", holder: "최윤정", status: "정산 완료", updatedAt: "2025-05-17" },
    { date: "2025-08-17", amount: 700000,  account: "3333-28-1047479", bank: "카카오뱅크", holder: "최윤정", status: "정산 예정", updatedAt: "2025-05-20" },
  ],
  "C-3002": [
    { date: "2025-08-17", amount: 240000,  account: "1002-111-222333", bank: "우리은행", holder: "홍길동", status: "정산 완료", updatedAt: "2025-05-18" },
  ],
  "C-3003": [
    { date: "2025-08-19", amount: 560000,  account: "455-66-777777",   bank: "국민은행", holder: "김영희", status: "정산 예정", updatedAt: "2025-05-20" },
  ],
};

const SETTLEMENT_PRODUCT: Record<string, SettlementRow[]> = {
  "P-1001": [
    { date: "2025-05-17", amount: 120000, account: "1002-858-000000", bank: "우리은행", holder: "이상민", status: "정산 완료", updatedAt: "2025-05-17" },
    { date: "2025-06-17", amount: 90000,  account: "3333-28-0000000", bank: "카카오뱅크", holder: "이상민", status: "정산 예정", updatedAt: "2025-05-20" },
  ],
  "P-1002": [
    { date: "2025-05-17", amount: 18000, account: "1002-111-222333", bank: "우리은행", holder: "홍길동", status: "정산 완료", updatedAt: "2025-05-18" },
  ],
  "P-1003": [
    { date: "2025-05-19", amount: 25000, account: "455-66-777777", bank: "국민은행", holder: "김영희", status: "정산 예정", updatedAt: "2025-05-20" },
  ],
};

// ------------------ Utils ------------------
const brand = "#2d4739";
const KRW = new Intl.NumberFormat("ko-KR");
const fmtYMD = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const startOfWeekMon = (d: Date) => {
  const day = d.getDay(); // 0:Sun..6:Sat
  const diff = (day === 0 ? -6 : 1 - day);
  return addDays(d, diff);
};

// ------------------ Component ------------------
type TabKey = "all" | "product_new" | "product_delivered" | "class";

export default function SellerSettlementMain() {
  const { storeUrl = "store" } = useParams();
  const navigate = useNavigate();

  // 탭(버튼)
  const [active, setActive] = useState<TabKey>("all");

  // 주간 anchor (월요일)
  const [weekAnchor, setWeekAnchor] = useState<Date>(() => startOfWeekMon(new Date()));
  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekAnchor, i)),
    [weekAnchor]
  );

  const basePath = `/${storeUrl}/seller/settlement`;

  // 필터링된 TX
  const filteredTx = useMemo(() => {
    const productBase = TX_PRODUCT.filter((p) => p.status !== "환불" && p.status !== "취소");
    const classBase = TX_CLASS.filter((c) => !c.refunded);

    switch (active) {
      case "product_new":
        return productBase.filter((p) => p.status === "신규주문").map((p) => ({ date: p.date, amount: p.amount }));
      case "product_delivered":
        return productBase.filter((p) => p.status === "배송 완료").map((p) => ({ date: p.date, amount: p.amount }));
      case "class":
        return classBase.map((c) => ({ date: c.date, amount: c.amount }));
      case "all":
      default:
        return [
          ...productBase.map((p) => ({ date: p.date, amount: p.amount })),
          ...classBase.map((c) => ({ date: c.date, amount: c.amount })),
        ];
    }
  }, [active]);

  // 주간 일자별 합계 (표/차트 공통)
  const weeklyData = useMemo(() => {
    const map = new Map<string, number>();
    weekDays.forEach((d) => map.set(fmtYMD(d), 0));
    filteredTx.forEach((tx) => {
      if (map.has(tx.date)) map.set(tx.date, (map.get(tx.date) ?? 0) + tx.amount);
    });
    return weekDays.map((d) => {
      const date = fmtYMD(d);
      return {
        date,
        label: `${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
        amount: map.get(date) ?? 0,
      };
    });
  }, [filteredTx, weekDays]);

  const weeklyTotal = useMemo(() => weeklyData.reduce((s, r) => s + r.amount, 0), [weeklyData]);

  // 정산 테이블(상품+클래스 합침, 왼쪽 정렬)
  const settlementRows = useMemo<SettlementRow[]>(
    () => [...Object.values(SETTLEMENT_PRODUCT).flat(), ...Object.values(SETTLEMENT_CLASS).flat()],
    []
  );

  const tabs: { key: TabKey; label: string }[] = [
    { key: "all",              label: "총수익(상품+클래스)" },
    { key: "product_new",      label: "신규주문 총수익" },
    { key: "product_delivered",label: "배송 완료 총수익" },
    { key: "class",            label: "클래스 총수익" },
  ];

  return (
    <>
      <Header />
      <Mainnavbar />

      <SellerSidenavbar>
        <div className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-6">
          {/* Title */}
          <div className="flex flex-col gap-1">
            <h1 className="text-xl sm:text-2xl font-bold">정산 대시보드</h1>
            <p className="text-gray-600">주간 기준으로 전체 매출 합계를 확인하세요. (환불/취소 제외)</p>
          </div>

          {/* 탭 */}
          <div className="mt-4 flex flex-wrap gap-2">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setActive(t.key)}
                className={[
                  "h-10 rounded-xl border px-4 text-sm",
                  active === t.key ? "bg-[#2d4739] text-white border-[#2d4739]" : "bg-white hover:bg-gray-50",
                ].join(" ")}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* 차트 + 표 + 주간 합계 */}
          <div className="mt-4 grid grid-cols-1 xl:grid-cols-5 gap-4">
            {/* 차트 */}
            <div className="xl:col-span-3 rounded-2xl border border-gray-200 p-4 sm:p-6">
              {/* 👉 여기로 주간 이동 UI 이동 */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold">주간 결제 금액</h3>
                  <span className="text-sm text-gray-500">{tabs.find((t) => t.key === active)?.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    className="h-9 rounded-lg border px-3 text-sm hover:bg-gray-50"
                    onClick={() => setWeekAnchor(addDays(weekAnchor, -7))}
                  >
                    이전 주
                  </button>
                  <input
                    type="date"
                    value={fmtYMD(weekAnchor)}
                    onChange={(e) => setWeekAnchor(startOfWeekMon(new Date(e.target.value)))}
                    className="h-9 rounded-lg border px-3 text-sm"
                    aria-label="주 시작일 선택(월요일 기준)"
                    title="주 시작일(월요일)"
                  />
                  <button
                    className="h-9 rounded-lg border px-3 text-sm hover:bg-gray-50"
                    onClick={() => setWeekAnchor(addDays(weekAnchor, 7))}
                  >
                    다음 주
                  </button>
                </div>
              </div>

              <div className="mt-3 h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weeklyData} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="label" fontSize={12} />
                    <YAxis tickFormatter={(v) => KRW.format(v)} fontSize={12} />
                    <Tooltip
                      formatter={(v: number) => `₩ ${KRW.format(v)}`}
                      labelFormatter={(_, payload ) => `날짜: ${payload?.[0]?.payload?.date ?? ""}`}
                    />
                    <Bar dataKey="amount" fill={brand} radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-3 text-sm text-gray-700">
                주간 합계: <span className="font-semibold">₩ {KRW.format(weeklyTotal)}</span>
              </div>
            </div>

            {/* 표(일별 합계) */}
            <div className="xl:col-span-2 rounded-2xl border border-gray-200 bg-white overflow-hidden">
              <div className="p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">일별 합계 표</h3>
                  <span className="text-sm text-gray-500">{tabs.find((t) => t.key === active)?.label}</span>
                </div>
                <table className="mt-4 w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500">
                      <th className="py-2 pr-4 font-medium">날짜</th>
                      <th className="py-2 pr-4 font-medium">금액</th>
                    </tr>
                  </thead>
                  <tbody>
                    {weeklyData.map((r) => (
                      <tr key={r.date} className="border-t border-gray-100">
                        <td className="py-2 pr-4">{r.date}</td>
                        <td className="py-2 pr-4">₩ {KRW.format(r.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* 빠른 이동 */}
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <QuickLink
              to={`${basePath}/product`}
              label="상품별 정산"
              desc="상품ID로 검색하여 상세 매출/정산 내역을 확인합니다."
              icon={<Package className="w-5 h-5" />}
            />
            <QuickLink
              to={`${basePath}/class`}
              label="클래스별 정산"
              desc="클래스ID로 검색하여 상세 매출/정산 내역을 확인합니다."
              icon={<Receipt className="w-5 h-5" />}
            />
          </div>

          {/* 정산 테이블(왼쪽 정렬) */}
          <div className="mt-6 rounded-2xl border border-gray-200 bg-white overflow-x-auto">
            <div className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">정산 내역</h2>
                <span className="text-sm text-gray-500">{settlementRows.length}건</span>
              </div>

              <table className="mt-4 w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500">
                    <th className="py-2 pr-4 font-medium">정산 일자</th>
                    <th className="py-2 pr-4 font-medium">정산 금액</th>
                    <th className="py-2 pr-4 font-medium">계좌번호</th>
                    <th className="py-2 pr-4 font-medium">은행명</th>
                    <th className="py-2 pr-4 font-medium">예금주명</th>
                    <th className="py-2 pr-4 font-medium">정산상태</th>
                    <th className="py-2 pr-4 font-medium">최근 수정일</th>
                  </tr>
                </thead>
                <tbody>
                  {settlementRows.map((s, idx) => (
                    <tr key={`${s.date}-${idx}`} className="border-t border-gray-100">
                      <td className="py-3 pr-4">{s.date}</td>
                      <td className="py-3 pr-4">₩ {KRW.format(s.amount)}</td>
                      <td className="py-3 pr-4">{s.account}</td>
                      <td className="py-3 pr-4">{s.bank}</td>
                      <td className="py-3 pr-4">{s.holder}</td>
                      <td className="py-3 pr-4">
                        <span
                          className={[
                            "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium border",
                            s.status === "정산 완료"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : s.status === "정산 예정"
                              ? "bg-amber-50 text-amber-700 border-amber-200"
                              : "bg-rose-50 text-rose-700 border-rose-200",
                          ].join(" ")}
                        >
                          {s.status}
                        </span>
                      </td>
                      <td className="py-3 pr-4">{s.updatedAt}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </SellerSidenavbar>
    </>
  );
}


// ------------------ QuickLink (Hover 효과 적용 버전) ------------------
function QuickLink({
  to,
  label,
  desc,
  icon,
}: {
  to: string;
  label: string;
  desc: string;
  icon: React.ReactNode;
}) {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate(to)}
      className={[
        "group relative w-full overflow-hidden rounded-2xl",
        "border border-gray-300 bg-transparent text-left outline-none cursor-pointer",
        "transition-all duration-300 ease-out",
        "text-gray-900 hover:text-white", // hover 시 흰색 텍스트
        "hover:shadow-lg", // 띄움 효과
      ].join(" ")}
    >
      {/* ::before — 왼쪽 → 오른쪽 채워짐 효과 */}
      <span
        aria-hidden
        className={[
          "pointer-events-none absolute inset-0 z-0",
         "before:content-[''] before:absolute before:inset-0",
          "before:bg-[#5b7d6a] before:origin-left before:scale-x-0 before:transform",
          "before:transition-transform before:duration-500 before:ease-out",
        "group-hover:before:scale-x-100",
        ].join(" ")}
      />

      {/* 내용 */}
      <div className="relative z-10 p-4 sm:p-6 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className={[
              "rounded-xl border p-2 bg-transparent border-gray-300 text-gray-900",
              "transition-colors duration-300 group-hover:border-white group-hover:text-white",
            ].join(" ")}
          >
            {icon}
          </div>
          <div className="font-[Arial,Helvetica,sans-serif]">
            <div className="font-semibold uppercase">
              <span className="inline-block transition-all duration-300 group-hover:translate-x-2">
                {label}
              </span>
            </div>
            <div className="text-sm text-gray-600 mt-0.5 transition-colors duration-300 group-hover:text-white/90">
              {desc}
            </div>
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-gray-900 transition-all duration-300 group-hover:text-white group-hover:translate-x-1.5" />
      </div>
    </button>
  );
}
