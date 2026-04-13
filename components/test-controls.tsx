"use client";

import { motion } from "motion/react";
import {
  IconAt, IconClock, IconLetterA, IconQuote,
  IconMountain, IconNumber, IconFeather, IconFlame,
} from "@tabler/icons-react";
import type { QuoteLength } from "@/lib/quotes";
import type { Difficulty } from "@/lib/words";
import { cn } from "@/lib/utils";
import {
  Tabs, TabsList, TabsTrigger,
} from "@/components/animate-ui/components/animate/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { TestMode, TimeOption, WordOption } from "@/lib/test-storage";

export interface TestControlsProps {
  mode: TestMode;
  timeOption: TimeOption;
  wordOption: WordOption;
  quoteLength: QuoteLength;
  punctuation: boolean;
  numbers: boolean;
  difficulty: Difficulty | undefined;
  controlsVisible: boolean;
  onModeChange: (next: TestMode) => void;
  onTimeOptionChange: (next: TimeOption) => void;
  onWordOptionChange: (next: WordOption) => void;
  onQuoteLengthChange: (next: QuoteLength) => void;
  onPunctuationToggle: () => void;
  onNumbersToggle: () => void;
  onDifficultyToggle: (d: Difficulty) => void;
  onRestart: () => void;
}

export function TestControls({
  mode, timeOption, wordOption, quoteLength,
  punctuation, numbers, difficulty,
  controlsVisible,
  onModeChange, onTimeOptionChange, onWordOptionChange, onQuoteLengthChange,
  onPunctuationToggle, onNumbersToggle, onDifficultyToggle, onRestart,
}: TestControlsProps) {
  const btnClass = (active: boolean) => cn(
    "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
    active ? "text-primary" : "text-muted-foreground hover:text-foreground",
  );

  return (
    <motion.div
      animate={{ opacity: controlsVisible ? 1 : 0 }}
      transition={{ duration: 0.4, ease: "easeInOut" }}
      className={cn(
        "flex flex-col items-center gap-2 sm:flex-row sm:items-center sm:gap-1",
        !controlsVisible && "pointer-events-none select-none",
      )}
    >
      {/* Toggles: punctuation / numbers / difficulty */}
      <div className="flex flex-row flex-wrap items-center justify-center gap-1 rounded-lg p-1 bg-zinc-100 dark:bg-zinc-800">
        <button type="button" onClick={onPunctuationToggle} className={btnClass(punctuation)}>
          <IconAt size={14} />
          punctuation
        </button>
        <button type="button" onClick={onNumbersToggle} className={btnClass(numbers)}>
          <IconNumber size={14} />
          numbers
        </button>
        <div className="hidden h-4 w-px bg-border sm:block" />
        <button type="button" onClick={() => onDifficultyToggle("easy")} className={btnClass(difficulty === "easy")}>
          <IconFeather size={14} />
          easy
        </button>
        <button type="button" onClick={() => onDifficultyToggle("hard")} className={btnClass(difficulty === "hard")}>
          <IconFlame size={14} />
          hard
        </button>
      </div>

      <div className="hidden h-4 w-px bg-border sm:mx-1 sm:block" />

      {/* Mode tabs */}
      <Tabs value={mode} onValueChange={(v) => onModeChange(v as TestMode)} className="flex items-center">
        <TabsList>
          {([
            { value: "time",  icon: IconClock,   label: "time"  },
            { value: "words", icon: IconLetterA,  label: "words" },
            { value: "quote", icon: IconQuote,    label: "quote" },
            { value: "zen",   icon: IconMountain, label: "zen"   },
          ] as const).map(({ value, icon: Icon, label }) => (
            <TabsTrigger key={value} value={value} className="gap-1.5 px-3 text-xs">
              <Icon size={13} />
              {label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {mode !== "zen" && (
        <>
          <div className="hidden h-4 w-px bg-border sm:mx-1 sm:block" />

          {/* Count / quote-length / time tabs */}
          {mode === "words" ? (
            <Tabs value={String(wordOption)} onValueChange={(v) => onWordOptionChange(Number(v) as WordOption)} className="flex items-center">
              <TabsList>
                {[10, 25, 50, 100].map((w) => (
                  <TabsTrigger key={w} value={String(w)} className="px-3 text-xs">{w}</TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          ) : mode === "quote" ? (
            <Tabs value={quoteLength} onValueChange={(v) => onQuoteLengthChange(v as QuoteLength)} className="flex items-center">
              <TabsList>
                {(["short", "medium", "long"] as QuoteLength[]).map((q) => (
                  <TabsTrigger key={q} value={q} className="px-3 text-xs">{q}</TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          ) : (
            <Tabs value={String(timeOption)} onValueChange={(v) => onTimeOptionChange(Number(v) as TimeOption)} className="flex items-center">
              <TabsList>
                {[15, 30, 60, 120].map((t) => (
                  <TabsTrigger key={t} value={String(t)} className="px-3 text-xs">{t}</TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          )}

          <div className="hidden h-4 w-px bg-border sm:mx-1 sm:block" />
        </>
      )}

    </motion.div>
  );
}
