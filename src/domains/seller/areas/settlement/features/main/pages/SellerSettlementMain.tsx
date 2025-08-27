import { useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  BarChart3,
  CalendarRange,
  ChevronRight,
  Download,
  Package,
  Receipt,
  TrendingUp,
  Wallet,
} from "lucide-react";
import Header from "@src/shared/areas/layout/features/header/Header";
import Mainnavbar from "@src/shared/areas/navigation/features/navbar/main/Mainnavbar";
import SellerSidenavbar from "@src/shared/areas/navigation/features/sidenavbar/seller/SellerSidenavbar";

type Tx = {
  id: string;
  date: string; // YYYY-MM-DD
  itemId: string;
  itemType: "product" | "class";
  title: string;
  amount: number; // 결제 금액(양수)
  fee: number; // 수수료(양수)
  refunded?: boolean; // 환불 여부
};

// ------- Mock Data (후에 API 교체) -------
const TXS: Tx[] = [
  { id: "t01", date: "2025-08-21", itemId: "P-1001", itemType: "product", title: "핸드메이드 컵", amount: 38000, fee: 1900 },
  { id: "t02", date: "2025-08-22", itemId: "C-3001", itemType: "class",   title: "도자기 원데이(9/2)", amount: 55000, fee: 2750 },
  { id: "t03", date: "2025-08-25", itemId: "P-1002", itemType: "product", title: "우든 커틀러리 세트", amount: 42000, fee: 2100 },
  { id: "t04", date: "2025-08-26", itemId: "C-3002", itemType: "class",   title: "플라워 클래스(9/15)", amount: 60000, fee: 3000 },
  { id: "t05", date: "2025-08-27", itemId: "P-1001", itemType: "product", title: "핸드메이드 컵", amount: 38000, fee: 1900, refunded: true },
  { id: "t06", date: "2025-08-27", itemId: "C-3003", itemType: "class",   title: "수채화 입문(9/20)", amount: 70000, fee: 3500 },
  { id: "t07", date: "2025-08-10", itemId: "P-2001", itemType: "product", title: "가죽 카드지갑", amount: 52000, fee: 2600 },
  { id: "t08", date: "2025-07-30", itemId: "C-3004", itemType: "class",   title: "천연 비누 공방(7/15)", amount: 45000, fee: 2250 },
];

const brand = "#2d4739";
const KRW = new Intl.NumberFormat("ko-KR");

function useQuery() {
  const { search } = useLocation();
  return new URLSearchParams(search);
}

function formatDate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function SellerSettlementMain() {
  const { storeUrl = "store" } = useParams();
  const query = useQuery();
  const navigate = useNavigate();

  // 기본 기간: 최근 30일
  const today = new Date();
  const defaultTo = formatDate(today);
  const defaultFrom = formatDate(new Date(today.getTime() - 29 * 86400000));

  const [from, setFrom] = useState(query.get("from") || defaultFrom);
  const [to, setTo] = useState(query.get("to") || defaultTo);

  // URL 동기화
  const applyRange = (f: string, t: string) => {
    navigate(`/seller/${storeUrl}/settlement?from=${f}&to=${t}`, { replace: true });
    setFrom(f);
    setTo(t);
  };

  const setPreset = (preset: "7D" | "30D" | "MTD" | "YTD") => {
    const now = new Date();
    if (preset === "7D") {
      applyRange(formatDate(new Date(now.getTime() - 6 * 86400000)), formatDate(now));
    } else if (preset === "30D") {
      applyRange(formatDate(new Date(now.getTime() - 29 * 86400000)), formatDate(now));
    } else if (preset === "MTD") {
      applyRange(formatDate(new Date(now.getFullYear(), now.getMonth(), 1)), formatDate(now));
    } else if (preset === "YTD") {
      applyRange(formatDate(new Date(now.getFullYear(), 0, 1)), formatDate(now));
    }
  };

  // 필터링된 거래
  const filtered = useMemo(() => {
    const fromTs = new Date(from).getTime();
    const toTs = new Date(to).getTime();
    return TXS.filter((tx) => {
      const ts = new Date(tx.date).getTime();
      return ts >= fromTs && ts <= toTs;
    });
  }, [from, to]);

  // 지표 계산
  const metrics = useMemo(() => {
    let gross = 0;   // 총 매출(환불 제외)
    let refunds = 0; // 환불 금액
    let fee = 0;     // 수수료
    let orders = 0;

    filtered.forEach((tx) => {
      orders += 1;
      fee += tx.fee;
      if (tx.refunded) refunds += tx.amount;
      else gross += tx.amount;
    });

    const payout = Math.max(gross - fee - refunds, 0);
    return { gross, refunds, fee, payout, orders };
  }, [filtered]);

  // 상위 품목(금액 기준)
  const topItems = useMemo(() => {
    const map = new Map<
      string,
      { itemId: string; itemType: Tx["itemType"]; title: string; amount: number; orders: number }
    >();
    filtered.forEach((tx) => {
      const key = `${tx.itemType}:${tx.itemId}`;
      const prev = map.get(key) || {
        itemId: tx.itemId,
        itemType: tx.itemType,
        title: tx.title,
        amount: 0,
        orders: 0,
      };
      // 환불건은 매출 합산 제외
      if (!tx.refunded) prev.amount += tx.amount;
      prev.orders += 1;
      map.set(key, prev);
    });
    return Array.from(map.values())
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);
  }, [filtered]);

  const basePath = `/${storeUrl}/seller/settlement`;

  return (
    <>
      <Header />
      <Mainnavbar />

      {/* 좌측 사이드 + 우측 콘텐츠 */}
      <SellerSidenavbar>
        <div className="w-full">
          {/* 상단 바: 기간 선택 + 프리셋 + 다운로드 */}
          <div className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-6">
            <div className="flex flex-col lg:flex-row lg:items-center gap-4">
              <div className="flex items-center gap-2">
                <CalendarRange className="w-5 h-5" style={{ color: brand }} />
                <span className="font-semibold">정산 기간</span>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:ml-auto">
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={from}
                    onChange={(e) => setFrom(e.target.value)}
                    className="h-10 rounded-lg border border-gray-300 px-3 text-sm"
                  />
                  <span className="text-gray-500">~</span>
                  <input
                    type="date"
                    value={to}
                    onChange={(e) => setTo(e.target.value)}
                    className="h-10 rounded-lg border border-gray-300 px-3 text-sm"
                  />
                  <button
                    onClick={() => applyRange(from, to)}
                    className="h-10 rounded-lg px-3 text-sm text-white"
                    style={{ backgroundColor: brand }}
                  >
                    적용
                  </button>
                </div>

                <div className="flex flex-wrap gap-2">
                  {(["7D", "30D", "MTD", "YTD"] as const).map((p) => (
                    <button
                      key={p}
                      onClick={() => setPreset(p)}
                      className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm hover:bg-gray-50"
                    >
                      {p}
                    </button>
                  ))}
                </div>

                <button className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm inline-flex items-center gap-2 hover:bg-gray-50">
                  <Download className="w-4 h-4" />
                  내보내기
                </button>
              </div>
            </div>
          </div>

          {/* 요약 카드 4개 */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 mt-4">
            <SummaryCard
              title="총 매출(환불 제외)"
              value={`₩ ${KRW.format(metrics.gross)}`}
              icon={<TrendingUp className="w-5 h-5" />}
            />
            <SummaryCard
              title="환불 금액"
              value={`₩ ${KRW.format(metrics.refunds)}`}
              icon={<Receipt className="w-5 h-5" />}
            />
            <SummaryCard
              title="수수료"
              value={`₩ ${KRW.format(metrics.fee)}`}
              icon={<BarChart3 className="w-5 h-5" />}
            />
            <SummaryCard
              title="정산 예상금"
              value={`₩ ${KRW.format(metrics.payout)}`}
              icon={<Wallet className="w-5 h-5" />}
            />
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

          {/* 상위 품목 테이블 */}
          <div className="rounded-2xl border border-gray-200 bg-white mt-4 overflow-x-auto">
            <div className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">상위 매출 품목</h2>
              </div>
              <table className="mt-4 w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500">
                    <th className="py-2 pr-4 font-medium">유형</th>
                    <th className="py-2 pr-4 font-medium">ID</th>
                    <th className="py-2 pr-4 font-medium">제목</th>
                    <th className="py-2 pr-4 font-medium">주문수</th>
                    <th className="py-2 pr-4 font-medium text-right">매출합계</th>
                    <th className="py-2 pl-4 font-medium text-right">바로가기</th>
                  </tr>
                </thead>
                <tbody>
                  {topItems.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-gray-500">
                        기간 내 매출 데이터가 없습니다.
                      </td>
                    </tr>
                  ) : (
                    topItems.map((it) => (
                      <tr key={`${it.itemType}:${it.itemId}`} className="border-t border-gray-100">
                        <td className="py-3 pr-4">
                          <span
                            className={[
                              "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                              it.itemType === "product"
                                ? "bg-blue-50 text-blue-700 border border-blue-200"
                                : "bg-emerald-50 text-emerald-700 border border-emerald-200",
                            ].join(" ")}
                          >
                            {it.itemType === "product" ? "상품" : "클래스"}
                          </span>
                        </td>
                        <td className="py-3 pr-4">{it.itemId}</td>
                        <td className="py-3 pr-4">{it.title}</td>
                        <td className="py-3 pr-4">{KRW.format(it.orders)}</td>
                        <td className="py-3 pl-4 text-right">₩ {KRW.format(it.amount)}</td>
                        <td className="py-3 pl-4 text-right">
                          <a
                            href={
                              it.itemType === "product"
                                ? `${basePath}/product?keyword=${encodeURIComponent(it.itemId)}`
                                : `${basePath}/class?keyword=${encodeURIComponent(it.itemId)}`
                            }
                            className="inline-flex items-center gap-1 text-[#2d4739] hover:opacity-80"
                          >
                            상세보기 <ChevronRight className="w-4 h-4" />
                          </a>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* 간단 추세 카드 (Placeholder) */}
          <div className="rounded-2xl border border-gray-200 bg-white mt-4 p-6">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              매출 추세 (요약)
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              간단한 요약 카드입니다. 실제 라인/바 차트는 Recharts 등으로 이후 교체 가능합니다.
            </p>
            <div className="mt-4 h-40 w-full rounded-xl bg-gradient-to-r from-gray-100 to-gray-200" />
          </div>
        </div>
      </SellerSidenavbar>
    </>
  );
}

/** ---------------- UI Components ---------------- */

function SummaryCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm text-gray-600">{title}</div>
          <div className="mt-1 text-xl font-bold">{value}</div>
        </div>
        <div
          className="rounded-xl border p-2"
          style={{ borderColor: "#e5e7eb", color: brand }}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

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
  return (
    <a
      href={to}
      className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-6 hover:shadow-sm transition"
    >
      <div className="flex items-start gap-3">
        <div
          className="rounded-xl border p-2 shrink-0"
          style={{ borderColor: "#e5e7eb", color: brand }}
        >
          {icon}
        </div>
        <div className="min-w-0">
          <div className="text-base font-semibold">{label}</div>
          <div className="text-sm text-gray-600 mt-1">{desc}</div>
        </div>
      </div>
    </a>
  );
}
