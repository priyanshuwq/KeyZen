"use client";

import { useMemo } from "react";
import { motion } from "motion/react";
import { IconRefresh, IconArrowRight } from "@tabler/icons-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

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
  } = stats;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="flex w-full flex-col gap-6"
    >
      {/* Main row */}
      <div className="flex items-start gap-10">
        {/* Left: WPM + ACC */}
        <div className="flex w-36 shrink-0 flex-col gap-1 pt-2">
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
        <div className="flex-1" style={{ height: 220 }}>
          {wpmHistory.length > 1 ? (
            <WpmChart history={wpmHistory} />
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-muted-foreground/30">
              not enough data
            </div>
          )}
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-6 border-t border-border pt-5">
        <StatBox label="raw" value={raw} />
        <StatBox
          label="characters"
          value={`${correctChars}/${incorrectChars}/${extraChars}/${missedChars}`}
        />
        <StatBox label="consistency" value={`${consistency}%`} />
        <StatBox label="time" value={`${elapsedSeconds}s`} />
      </div>

      {/* Formula */}
      <p className="text-center text-[11px] text-muted-foreground/30">
        wpm = (correct chars ÷ 5) ÷ minutes &nbsp;·&nbsp; raw = (all chars ÷ 5) ÷ minutes &nbsp;·&nbsp; consistency = 100 − (σ/μ × 100)
      </p>

      {/* Actions */}
      <div className="flex items-center justify-center gap-4 pb-2">
        <button
          onClick={onRestart}
          className="flex items-center gap-2 rounded-lg px-4 py-2 text-muted-foreground transition-colors hover:text-foreground"
        >
          <IconArrowRight size={16} />
          next test
        </button>
        <button
          onClick={onRestart}
          className="flex items-center gap-2 rounded-lg px-4 py-2 text-muted-foreground transition-colors hover:text-foreground"
        >
          <IconRefresh size={16} />
          restart
        </button>
      </div>
    </motion.div>
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
