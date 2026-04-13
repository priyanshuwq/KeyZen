"use client";

import { AnimatePresence, motion, LayoutGroup } from "motion/react";
import { useCallback, useRef, useState } from "react";
import { IconPointer, IconRefresh } from "@tabler/icons-react";
import { ResultsScreen } from "@/components/results-screen";
import { TestControls } from "@/components/test-controls";
import { WordItem } from "@/components/word-item";
import { useTypingTest } from "@/hooks/use-typing-test";
import { useSettings } from "@/components/settings-context";
import { cn } from "@/lib/utils";

interface TypingTestProps {
  onKeyHighlight?: (key: string | null) => void;
  onFinished?: (finished: boolean) => void;
  onTypingActiveChange?: (active: boolean) => void;
  onFocusChange?: (focused: boolean) => void;
  pauseTypingInputRefocus?: boolean;
}

export function TypingTest(props: TypingTestProps) {
  const { realtimeWpm, faahMode } = useSettings();
  const faahAudioRef = useRef<HTMLAudioElement | null>(null);

  const onWrongKey = useCallback(() => {
    if (!faahMode) return;
    if (!faahAudioRef.current) {
      faahAudioRef.current = new Audio("/sounds/fahhhhh.mp3");
    }
    faahAudioRef.current.currentTime = 0;
    void faahAudioRef.current.play();
  }, [faahMode]);

  const {
    mode, timeOption, wordOption, quoteLength,
    punctuation, numbers, difficulty,
    words, typed, wordIndex, started, rowOffset,
    timeLeft, wordInputs, isFocused, resetting, isActivelyTyping,
    screenFade, wpm,
    controlsVisible, showResults, frozenStats,
    inputRef, wordsContainerRef, activeWordRef,
    handleKeyDown, handleFocus, handleInputBlur, handleInputFocus,
    handleMouseMove, handleResultsRestart, handleResultsNext,
    onModeChange, onTimeOptionChange, onWordOptionChange, onQuoteLengthChange,
    onPunctuationToggle, onNumbersToggle, onDifficultyToggle, onRestart,
  } = useTypingTest({ ...props, onWrongKey });

  if (showResults) {
    return (
      <div
        className="w-full transition-all duration-150 ease-out"
        style={{ opacity: screenFade, filter: screenFade < 1 ? "blur(4px)" : "none" }}
      >
        <ResultsScreen stats={frozenStats!} onRestart={handleResultsRestart} onNext={handleResultsNext} />
      </div>
    );
  }

  return (
    <div
      className="flex w-full flex-col max-w-5xl items-center gap-3 transition-all duration-150 ease-out"
      style={{ opacity: screenFade, filter: screenFade < 1 ? "blur(4px)" : "none" }}
      onClick={handleFocus}
      onMouseMove={handleMouseMove}
    >
      {/* Controls toolbar */}
      <TestControls
        mode={mode}
        timeOption={timeOption}
        wordOption={wordOption}
        quoteLength={quoteLength}
        punctuation={punctuation}
        numbers={numbers}
        difficulty={difficulty}
        controlsVisible={controlsVisible}
        onModeChange={onModeChange}
        onTimeOptionChange={onTimeOptionChange}
        onWordOptionChange={onWordOptionChange}
        onQuoteLengthChange={onQuoteLengthChange}
        onPunctuationToggle={onPunctuationToggle}
        onNumbersToggle={onNumbersToggle}
        onDifficultyToggle={onDifficultyToggle}
        onRestart={onRestart}
      />

      {/* Words display */}
      <div className="relative w-full">
        {/* Timer / progress — always reserves space */}
        <motion.div
          className="mb-3 flex min-h-8 items-center gap-3"
          animate={{ opacity: resetting ? 0 : 1 }}
          transition={{ duration: 0.15 }}
        >
          {mode === "time" && (
            <span
              className={cn(
                "font-mono text-2xl font-bold text-primary transition-opacity duration-200",
                started ? "opacity-100" : "opacity-0",
              )}
            >
              {timeLeft}
            </span>
          )}
          {mode === "words" && (
            <span
              className={cn(
                "font-mono text-2xl font-bold tabular-nums text-primary transition-opacity duration-200",
                started ? "opacity-100" : "opacity-0",
              )}
            >
              {wordIndex}/{wordOption}
            </span>
          )}
          {realtimeWpm && started && wpm > 0 && (
            <span className="font-mono text-sm text-muted-foreground transition-opacity duration-200">
              {wpm} <span className="text-xs opacity-60">wpm</span>
            </span>
          )}
        </motion.div>

        <div
          ref={wordsContainerRef}
          className={cn(
            "relative h-[7.8rem] w-full overflow-hidden text-2xl leading-relaxed",
            isActivelyTyping && "is-typing",
          )}
          style={{ fontFamily: "var(--typing-font)" }}
        >
          <input
            ref={inputRef}
            className="absolute opacity-0"
            onKeyDown={handleKeyDown}
            onBlur={handleInputBlur}
            onFocus={handleInputFocus}
            value={typed}
            onChange={() => {}}
            autoFocus
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="none"
            spellCheck={false}
          />

          {rowOffset > 0 && (
            <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-10 bg-gradient-to-b from-background to-transparent" />
          )}

          <LayoutGroup id="words">
            <motion.div
              className="flex flex-wrap gap-x-2.5 gap-y-1"
              animate={{
                y: -rowOffset,
                opacity: resetting ? 0 : isFocused ? 1 : 0.15,
                filter: resetting ? "blur(4px)" : "blur(0px)",
              }}
              transition={resetting
                ? { duration: 0.15, ease: "easeOut" }
                : { type: "spring", stiffness: 300, damping: 30, mass: 0.8 }
              }
            >
              {words.map((word, wIdx) => {
                const isActive = wIdx === wordIndex;
                const isPast = wIdx < wordIndex;
                const displayInput = isActive ? typed : isPast ? (wordInputs[wIdx] ?? "") : "";
                const hasError = isPast && wordInputs[wIdx] !== word;

                return (
                  <WordItem
                    key={`${word}-${wIdx}`}
                    word={word}
                    displayInput={displayInput}
                    isActive={isActive}
                    isPast={isPast}
                    hasError={hasError}
                    elemRef={isActive ? activeWordRef : undefined}
                  />
                );
              })}
            </motion.div>
          </LayoutGroup>

          <AnimatePresence>
            {!isFocused && (
              <motion.div
                key="focus-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="absolute inset-0 z-20 flex cursor-pointer items-center justify-center"
                onClick={() => inputRef.current?.focus()}
              >
                <span className="flex items-center gap-2 text-sm font-medium text-primary">
                  <IconPointer size={16} />
                  Click here or press any key to focus
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Restart button */}
      <RestartButton controlsVisible={controlsVisible} onRestart={onRestart} />

      {/* Keyboard shortcuts hint */}
      <motion.div
        animate={{ opacity: controlsVisible ? 1 : 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-center gap-4 text-xs text-muted-foreground"
      >
        <span>
          <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px]">tab</kbd>
          {" + "}
          <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px]">enter</kbd>
          {" "}- restart test
        </span>
      </motion.div>
    </div>
  );
}

function RestartButton({ controlsVisible, onRestart }: { controlsVisible: boolean; onRestart: () => void }) {
  const [spinning, setSpinning] = useState(false);

  function handleClick() {
    setSpinning(true);
    setTimeout(() => setSpinning(false), 600);
    onRestart();
  }

  return (
    <motion.button
      animate={{ opacity: controlsVisible ? 1 : 0.15 }}
      transition={{ duration: 0.4 }}
      onClick={handleClick}
      className={cn(
        "rounded-lg p-2 text-muted-foreground transition-colors hover:text-foreground",
        !controlsVisible && "pointer-events-none",
      )}
      title="Restart test"
    >
      <span
        style={{
          display: "inline-flex",
          transition: "transform 0.6s cubic-bezier(0.4,0,0.2,1)",
          transform: spinning ? "rotate(360deg)" : "rotate(0deg)",
        }}
      >
        <IconRefresh size={18} />
      </span>
    </motion.button>
  );
}
