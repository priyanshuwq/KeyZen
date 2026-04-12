"use client";

import { useMemo, type ReactNode } from "react";
import { motion } from "motion/react";
import { IconInfoCircle, IconRefresh, IconArrowRight } from "@tabler/icons-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CornerBrackets } from "@/components/corner-brackets";

export interface WpmSnapshot {
  second: number;
  wpm: number;
  raw: number;
  errors: number;
}

export interface ResultStats {
  wpm: number;
  accuracy: number;
  raw: number;
  correctChars: number;
  incorrectChars: number;
  extraChars: number;
  missedChars: number;
  consistency: number;
  elapsedSeconds: number;
  mode: string;
  modeDetail: string;
  wpmHistory: WpmSnapshot[];
}

interface ResultsScreenProps {
  stats: ResultStats;
  onRestart: () => void;
}

function ResultsBracketButton({
  onClick,
  label,
  icon,
}: {
  onClick: () => void;
  label: string;
  icon: ReactNode;
}) {
  return (
    <CornerBrackets className="inline-flex">
      <button
        type="button"
        onClick={onClick}
        className="flex items-center gap-2 px-4 py-2 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-0"
      >
        {icon}
        {label}
      </button>
    </CornerBrackets>
  );
}

const chartConfig: ChartConfig = {
  wpm: {
    label: "WPM",
    color: "var(--color-primary)",
  },
  raw: {
    label: "Raw",
    color: "hsl(var(--muted-foreground))",
  },
};

function WpmChart({ history }: { history: WpmSnapshot[] }) {
  const data = useMemo(
    () =>
      history.map((d) => ({
        second: d.second,
        wpm: d.wpm,
        raw: d.raw,
        errors: d.errors > 0 ? d.errors : undefined,
      })),
    [history],
  );

  const maxVal = Math.max(...history.map((d) => d.raw), 10);

  return (
    <ChartContainer config={chartConfig} className="h-full w-full">
      <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid
          vertical={false}
          stroke="currentColor"
          strokeOpacity={0.06}
        />
        <XAxis
          dataKey="second"
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 11, fill: "currentColor", opacity: 0.35 }}
          interval="preserveStartEnd"
        />
        <YAxis
          domain={[0, Math.ceil(maxVal * 1.2)]}
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 11, fill: "currentColor", opacity: 0.35 }}
          width={36}
          label={{
            value: "WPM",
            angle: -90,
            position: "insideLeft",
            offset: 10,
            style: { fontSize: 10, fill: "currentColor", opacity: 0.25 },
          }}
        />
        <ChartTooltip
          cursor={{ stroke: "currentColor", strokeOpacity: 0.15, strokeWidth: 1 }}
          content={
            <ChartTooltipContent
              labelFormatter={(v) => `second ${v}`}
              formatter={(value, name) => [
                <span key={name} className="font-mono font-bold">
                  {value}
                </span>,
                name === "wpm" ? "WPM" : "Raw",
              ]}
            />
          }
        />
        {/* Raw line */}
        <Line
          dataKey="raw"
          type="monotone"
          stroke="currentColor"
          strokeOpacity={0.25}
          strokeWidth={1.5}
          dot={false}
          activeDot={{ r: 3, strokeWidth: 0 }}
          isAnimationActive={false}
        />
        {/* WPM line */}
        <Line
          dataKey="wpm"
          type="monotone"
          stroke="var(--color-primary)"
          strokeWidth={2}
          dot={{ r: 3, fill: "var(--color-primary)", strokeWidth: 0 }}
          activeDot={{ r: 5, strokeWidth: 0 }}
          animationDuration={600}
          animationEasing="ease-out"
        />
      </LineChart>
    </ChartContainer>
  );
}

function isInvalidTestResult(stats: ResultStats): boolean {
  const keystrokes =
    stats.correctChars + stats.incorrectChars + stats.extraChars
  if (keystrokes === 0) return true
  if (!Number.isFinite(stats.wpm) || !Number.isFinite(stats.raw)) return true
  if (!Number.isFinite(stats.accuracy)) return true
  return false
}

export function ResultsScreen({ stats, onRestart }: ResultsScreenProps) {
  const {
    wpm,
    accuracy,
    raw,
    correctChars,
    incorrectChars,
    extraChars,
    missedChars,
    consistency,
    elapsedSeconds,
    mode,
    modeDetail,
    wpmHistory,
  } = stats

  const invalid = isInvalidTestResult(stats)

  if (invalid) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="flex w-full flex-col gap-8"
      >
        <div className="flex flex-col items-center gap-3 px-2 text-center">
          <p className="font-(family-name:--font-doto) text-3xl font-bold text-muted-foreground md:text-4xl">
            invalid result
          </p>
          <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
            No keystrokes were recorded, so scores can&apos;t be calculated. This
            often happens if the timer ran out before you typed, you left focus,
            or the test ended right after it started.
          </p>
          <p className="text-xs text-muted-foreground/70">
            {mode} {modeDetail}
            {elapsedSeconds > 0 ? ` · ${elapsedSeconds}s` : null}
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 border-t border-border pt-6 pb-2">
          <ResultsBracketButton
            onClick={onRestart}
            label="next test"
            icon={<IconArrowRight size={16} aria-hidden />}
          />
          <ResultsBracketButton
            onClick={onRestart}
            label="restart"
            icon={<IconRefresh size={16} aria-hidden />}
          />
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="flex w-full flex-col gap-6"
    >
      {/* Main block: column on mobile, row from md */}
      <div className="flex flex-col gap-6 md:flex-row md:items-start md:gap-10">
        {/* WPM + ACC + test type */}
        <div className="flex w-full flex-col gap-1 pt-2 md:w-36 md:shrink-0">
          <StatBig label="wpm" value={wpm} />
          <StatBig label="acc" value={`${accuracy}%`} />
          <div className="mt-4 flex flex-col gap-0.5 text-xs text-muted-foreground">
            <span className="text-[10px] uppercase tracking-widest opacity-50">
              test type
            </span>
            <span className="text-primary">
              {mode} {modeDetail}
            </span>
            <span className="opacity-50">english</span>
          </div>
        </div>

        {/* Chart */}
        <div className="h-[220px] w-full md:flex-1">
          {wpmHistory.length > 1 ? (
            <WpmChart history={wpmHistory} />
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-muted-foreground/50">
              not enough data
            </div>
          )}
        </div>
      </div>

      {/* Stats — single column on mobile, row of 4 from md */}
      <div className="grid grid-cols-1 gap-4 border-t border-border pt-5 md:grid-cols-4 md:gap-6">
        <StatBox label="raw" value={raw} />
        <StatBox
          label="characters"
          value={`${correctChars}/${incorrectChars}/${extraChars}/${missedChars}`}
        />
        <StatBox label="consistency" value={`${consistency}%`} />
        <StatBox label="time" value={`${elapsedSeconds}s`} />
      </div>

      {/* Actions */}
      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 pb-2">
        <ResultsBracketButton
          onClick={onRestart}
          label="next test"
          icon={<IconArrowRight size={16} aria-hidden />}
        />
        <ResultsBracketButton
          onClick={onRestart}
          label="restart"
          icon={<IconRefresh size={16} aria-hidden />}
        />
        <CalculationFormulaPopover />
      </div>
    </motion.div>
  );
}

function CalculationFormulaPopover() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-2 rounded-lg px-4 py-2 text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <IconInfoCircle size={16} stroke={1.5} aria-hidden />
          calculation formula
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="start"
        sideOffset={8}
        className="max-h-[min(70vh,28rem)] w-[min(22rem,calc(100vw-2rem))] overflow-y-auto p-4"
      >
          <p className="mb-3 text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
            how it&apos;s calculated
          </p>
          <dl className="space-y-4">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-5">
              <dt className="shrink-0 text-xs font-semibold text-primary sm:w-28">
                wpm
              </dt>
              <dd className="min-w-0">
                <p className="font-mono text-[11px] leading-relaxed text-muted-foreground sm:text-xs">
                  ((correct word chars + correct spaces) ÷ 5) ÷ minutes
                </p>
                <p className="mt-1.5 text-[10px] leading-snug text-muted-foreground">
                  spaces between correct words count; in time/zen, a correct
                  prefix of the last word counts before you press space.
                </p>
              </dd>
            </div>
            <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-5">
              <dt className="shrink-0 text-xs font-semibold text-primary sm:w-28">
                raw
              </dt>
              <dd className="min-w-0 font-mono text-[11px] leading-relaxed text-muted-foreground sm:text-xs">
                (all typed chars ÷ 5) ÷ minutes
              </dd>
            </div>
            <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-5">
              <dt className="shrink-0 text-xs font-semibold text-primary sm:w-28">
                consistency
              </dt>
              <dd className="min-w-0">
                <p className="font-mono text-[11px] leading-relaxed text-muted-foreground sm:text-xs">
                  100 − (σ ÷ μ × 100)
                </p>
                <p className="mt-1.5 text-[10px] leading-snug text-muted-foreground">
                  σ and μ use your WPM at each second of the test: σ is
                  standard deviation, μ is the mean. Higher consistency means
                  steadier pacing.
                </p>
              </dd>
            </div>
          </dl>
      </PopoverContent>
    </Popover>
  );
}

function StatBig({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex flex-col">
      <span className="text-sm text-muted-foreground">{label}</span>
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="font-mono text-6xl font-bold leading-none text-primary"
      >
        {value}
      </motion.span>
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15 }}
        className="font-mono text-2xl font-bold text-primary"
      >
        {value}
      </motion.span>
    </div>
  );
}
