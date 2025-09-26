// src/shared/components/analytics/ClassStatsCard.tsx
import type { FC } from 'react';
import { useEffect, useRef } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';

const KRW = new Intl.NumberFormat('ko-KR');
const fmtKRW = (v: number) => `₩ ${KRW.format(v)}`;

export type ClassStatsMode = 'hour' | 'weekday';
export type ClassStatsDatum = { key: string; count: number; revenue: number };

type Props = {
  title?: string;
  mode: ClassStatsMode;
  onModeChange: (m: ClassStatsMode) => void;
  monthValue?: string;
  onMonthChange?: (v: string) => void;
  data: ClassStatsDatum[];
  onClick?: () => void;
  /** 초록(브랜드) 색상 — 기본: #2D4739 */
  brandColor?: string;
  /** 주 선택 입력 노출 조건 */
  showWeekInputWhen?: 'weekday' | 'always' | 'never';
};

const ClassStatsCard: FC<Props> = ({
  title = '전체 클래스 예약 통계',
  mode,
  onModeChange,
  monthValue = '',
  onMonthChange,
  data,
  onClick,
  brandColor = '#2D4739',
  showWeekInputWhen = 'weekday',
}) => {
  // ✅ 애니메이션 제어: 첫 렌더 or 모드 변경시에만 ON
  const firstMountRef = useRef(true);
  const prevModeRef = useRef<ClassStatsMode>(mode);
  const prevWeekRef = useRef<string>(monthValue);
  const shouldAnimate =
    firstMountRef.current || prevModeRef.current !== mode || prevWeekRef.current !== monthValue;

  useEffect(() => {
    firstMountRef.current = false;
    prevModeRef.current = mode;
  }, [mode]);

  const showWeek =
    showWeekInputWhen === 'always' || (showWeekInputWhen === 'weekday' && mode === 'weekday');

  const Wrapper: FC<{ children: React.ReactNode }> = ({ children }) =>
    onClick ? (
      <button
        type="button"
        onClick={onClick}
        className="block w-full text-left"
        title="클릭하여 상세로 이동"
      >
        {children}
      </button>
    ) : (
      <>{children}</>
    );

  return (
    <section className="rounded-2xl border bg-white">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 px-4 sm:px-6 py-4 border-b">
        <h2 className="text-base sm:text-lg font-semibold">{title}</h2>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <input
              type="month"
              value={monthValue}
              onChange={(e) => onMonthChange?.(e.target.value)}
              className="border rounded-md px-3 py-1.5 text-xs sm:text-sm"
            />
          </div>

          <div className="bg-gray-100 rounded-md p-1 inline-flex">
            <button
              type="button"
              onClick={() => onModeChange('hour')}
              className={[
                'px-3 py-1.5 rounded text-xs sm:text-sm',
                mode === 'hour' ? 'bg-white shadow' : 'text-gray-600',
              ].join(' ')}
            >
              시간별 (24시간)
            </button>
            <button
              type="button"
              onClick={() => onModeChange('weekday')}
              className={[
                'px-3 py-1.5 rounded text-xs sm:text-sm',
                mode === 'weekday' ? 'bg-white shadow' : 'text-gray-600',
              ].join(' ')}
            >
              요일별
            </button>
          </div>
        </div>
      </div>

      <Wrapper>
        <div className="p-3 sm:p-6 h-[280px] sm:h-[360px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="key" tick={{ fontSize: 12 }} interval={mode === 'hour' ? 1 : 0} />
              <YAxis
                yAxisId="count"
                tick={{ fontSize: 12 }}
                domain={[0, (dataMax: number) => dataMax * 1.2]}
              />
              <YAxis
                yAxisId="revenue"
                orientation="right"
                tickFormatter={(v) => KRW.format(v)}
                domain={[0, (dataMax: number) => dataMax * 1.2]}
              />
              <Tooltip
                formatter={(v: number, name) =>
                  name === '예약 건수' ? [`${v} 건`, name] : [fmtKRW(v), name]
                }
              />
              <Legend />
              {/* 팔레트 통일: 건수=보라, 금액=초록(브랜드) */}
              <Bar
                yAxisId="count"
                dataKey="count"
                name="예약 건수"
                fill="#8884d8"
                radius={[6, 6, 0, 0]}
                isAnimationActive={shouldAnimate}
              />
              <Bar
                yAxisId="revenue"
                dataKey="revenue"
                name="결제 금액"
                fill={brandColor}
                radius={[6, 6, 0, 0]}
                isAnimationActive={shouldAnimate}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Wrapper>
    </section>
  );
};

export default ClassStatsCard;
