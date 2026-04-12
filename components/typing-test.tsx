"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, LayoutGroup } from "motion/react";
import { generateWords } from "@/lib/words";
import { getQuote, type QuoteLength } from "@/lib/quotes";
import { cn } from "@/lib/utils";
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/animate-ui/components/animate/tabs";
import {
  IconAt,
  IconClock,
  IconLetterA,
  IconQuote,
  IconMountain,
  IconRefresh,
  IconNumber,
} from "@tabler/icons-react";
import { ResultsScreen, type ResultStats, type WpmSnapshot } from "@/components/results-screen";
import { useSettings } from "@/components/settings-context";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type TestMode = "time" | "words" | "quote" | "zen";
type TimeOption = 15 | 30 | 60 | 120;
type WordOption = 10 | 25 | 50 | 100;

// ---------------------------------------------------------------------------
// WordItem — memoized so only the active word re-renders on every keystroke.
// Using a single stable layoutId "cursor-active" across all words so Framer
// Motion FLIP-animates the cursor across word boundaries when space is pressed.
// ---------------------------------------------------------------------------
interface WordItemProps {
  word: string;
  /** Live `typed` for the active word; finalized input for past; "" for future. */
  displayInput: string;
  isActive: boolean;
  isPast: boolean;
  /** True when a completed word was typed with any error → red underline (MonkeyType style). */
  hasError: boolean;
  elemRef?: React.RefObject<HTMLDivElement | null>;
}

const WordItem = memo(function WordItem({
  word,
  displayInput,
  isActive,
  isPast,
  hasError,
  elemRef,
}: WordItemProps) {
  const cursorAtEnd = isActive && displayInput.length >= word.length;

  return (
    <div
      ref={isActive ? elemRef : undefined}
      className={cn(
        "relative",
        // Error underline on incorrectly completed words
        isPast && hasError && "after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:rounded-full after:bg-destructive/50",
      )}
    >
      {word.split("").map((char, cIdx) => {
        let color = "text-muted-foreground/40";
        if (isPast || isActive) {
          if (cIdx < displayInput.length) {
            color = displayInput[cIdx] === char ? "text-foreground" : "text-destructive";
          }
        }
        const isLastChar = cIdx === word.length - 1;

        return (
          <span key={cIdx} className="relative inline-block">
            {/* Cursor before this char.
                STABLE layoutId "cursor-active" → Framer Motion FLIP-animates
                the cursor smoothly when wordIndex changes (spacebar press). */}
            {isActive && cIdx === displayInput.length && (
              <motion.span
                layoutId="cursor-active"
                className="typing-cursor absolute -left-px top-[2px] h-[1.2em] w-[2px] rounded-full bg-primary"
                transition={{ type: "spring", stiffness: 700, damping: 38, mass: 0.6 }}
              />
            )}
            {/* Cursor after last char when typed at or past end */}
            {isActive && isLastChar && cursorAtEnd && (
              <motion.span
                layoutId="cursor-active"
                className="typing-cursor absolute -right-px top-[2px] h-[1.2em] w-[2px] rounded-full bg-primary"
                transition={{ type: "spring", stiffness: 700, damping: 38, mass: 0.6 }}
              />
            )}
            <span className={cn("transition-colors duration-[60ms]", color)}>
              {char}
            </span>
          </span>
        );
      })}
      {/* Extra chars typed beyond word length */}
      {(isActive || isPast) &&
        displayInput.length > word.length &&
        displayInput.slice(word.length).split("").map((char, eIdx) => (
          <span key={`extra-${eIdx}`} className="text-destructive/60">
            {char}
          </span>
        ))}
    </div>
  );
});

interface TypingTestProps {
  onKeyHighlight?: (key: string | null) => void;
  onFinished?: (finished: boolean) => void;
  onTypingActiveChange?: (active: boolean) => void;
  /** When true, do not steal focus back to the typing input (settings / font popover need focus). */
  pauseTypingInputRefocus?: boolean;
}

export function TypingTest({
  onKeyHighlight,
  onFinished,
  onTypingActiveChange,
  pauseTypingInputRefocus = false,
}: TypingTestProps) {
  const { realtimeWpm } = useSettings();
  const pauseRefocusRef = useRef(false);
  pauseRefocusRef.current = pauseTypingInputRefocus;
  const [mode, setMode] = useState<TestMode>("time");
  const [timeOption, setTimeOption] = useState<TimeOption>(30);
  const [wordOption, setWordOption] = useState<WordOption>(25);
  const [quoteLength, setQuoteLength] = useState<QuoteLength>("medium");
  const [quoteAuthor, setQuoteAuthor] = useState<string | null>(null);
  const [punctuation, setPunctuation] = useState(false);
  const [numbers, setNumbers] = useState(false);

  const [words, setWords] = useState<string[]>([]);
  const [typed, setTyped] = useState("");
  const [wordIndex, setWordIndex] = useState(0);
  const [started, setStarted] = useState(false);
  const [rowOffset, setRowOffset] = useState(0);
  const [finished, setFinished] = useState(false);
  const [timeLeft, setTimeLeft] = useState(30);
  const [startTime, setStartTime] = useState<number | null>(null);

  // Track per-word input for error highlighting
  const [wordInputs, setWordInputs] = useState<string[]>([]);

  // WPM / accuracy
  const [correctChars, setCorrectChars] = useState(0);
  const [totalChars, setTotalChars] = useState(0);
  const [incorrectChars, setIncorrectChars] = useState(0);
  const [extraChars, setExtraChars] = useState(0);
  const [wpm, setWpm] = useState(0);
  const [accuracy, setAccuracy] = useState(100);
  const [wpmHistory, setWpmHistory] = useState<WpmSnapshot[]>([]);

  // Refs for interval-safe access to live values
  const correctCharsRef = useRef(0);
  const allTypedRef = useRef(0);
  const errorsThisSecondRef = useRef(0);
  const elapsedSecondsRef = useRef(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const wordsContainerRef = useRef<HTMLDivElement>(null);
  const activeWordRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tabPressedRef = useRef(false);

  // Focus-mode: controls toolbar hides while typing, restores on mouse move
  const [showControls, setShowControls] = useState(true);
  const controlsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cursor blink pauses while actively typing, resumes after 1 s idle
  const [isActivelyTyping, setIsActivelyTyping] = useState(false);
  const typingIdleRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const markTypingActive = useCallback(() => {
    setIsActivelyTyping(true);
    if (typingIdleRef.current) clearTimeout(typingIdleRef.current);
    typingIdleRef.current = setTimeout(() => setIsActivelyTyping(false), 1000);
  }, []);

  const handleMouseMove = useCallback(() => {
    if (!started || finished) return;
    setShowControls(true);
    if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
    controlsTimerRef.current = setTimeout(() => setShowControls(false), 2500);
  }, [started, finished]);

  const wordCount = useMemo(() => {
    if (mode === "time") return 200;
    if (mode === "words") return wordOption;
    return 100;
  }, [mode, wordOption]);

  const resetTest = useCallback(() => {
    setQuoteAuthor(null);
    if (mode === "quote") {
      const { words: newWords, author } = getQuote(quoteLength);
      setWords(newWords);
      setQuoteAuthor(author);
    } else {
      setWords(generateWords(wordCount, { punctuation, numbers }));
    }
    setTyped("");
    setWordIndex(0);
    setStarted(false);
    setFinished(false);
    setStartTime(null);
    setWordInputs([]);
    setCorrectChars(0);
    setTotalChars(0);
    setIncorrectChars(0);
    setExtraChars(0);
    setWpm(0);
    setAccuracy(100);
    setWpmHistory([]);
    correctCharsRef.current = 0;
    allTypedRef.current = 0;
    errorsThisSecondRef.current = 0;
    elapsedSecondsRef.current = 0;
    if (mode === "time") setTimeLeft(timeOption);
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    setRowOffset(0);
    setShowControls(true);
    setIsActivelyTyping(false);
    onFinished?.(false);
    onTypingActiveChange?.(false);
    inputRef.current?.focus();
  }, [wordCount, mode, timeOption, quoteLength, punctuation, numbers, onFinished, onTypingActiveChange]);

  useEffect(() => { resetTest(); }, [resetTest]);

  // Notify parent when test finishes
  useEffect(() => {
    if (finished) {
      onTypingActiveChange?.(false);
      setShowControls(true);
    }
  }, [finished, onTypingActiveChange]);

  // Translate words wrapper up when active word reaches the 3rd visible row
  useEffect(() => {
    if (!activeWordRef.current) return;
    const word = activeWordRef.current;
    const lineH = word.offsetHeight + 4;
    const row = Math.round(word.offsetTop / lineH);
    const newOffset = Math.max(0, row - 1) * lineH;
    setRowOffset(newOffset);
  }, [wordIndex]);

  // Timer for time mode
  useEffect(() => {
    if (started && mode === "time" && !finished) {
      timerRef.current = setInterval(() => {
        elapsedSecondsRef.current += 1;
        const elapsed = elapsedSecondsRef.current;
        const elapsedMin = elapsed / 60;
        const snapWpm = elapsedMin > 0 ? Math.round(correctCharsRef.current / 5 / elapsedMin) : 0;
        const snapRaw = elapsedMin > 0 ? Math.round(allTypedRef.current / 5 / elapsedMin) : 0;
        setWpmHistory((prev) => [
          ...prev,
          { second: elapsed, wpm: snapWpm, raw: snapRaw, errors: errorsThisSecondRef.current },
        ]);
        errorsThisSecondRef.current = 0;
        setTimeLeft((prev) => (prev <= 1 ? 0 : prev - 1));
      }, 1000);
      return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }
  }, [started, mode, finished]);

  // Time mode: finish when countdown hits 0
  useEffect(() => {
    if (finished) return;
    if (mode !== "time" || !started) return;
    if (timeLeft !== 0) return;
    setFinished(true);
    onFinished?.(true);
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }, [timeLeft, mode, started, finished, onFinished]);

  // Calculate live WPM
  useEffect(() => {
    if (started && startTime && !finished) {
      const elapsed = (Date.now() - startTime) / 1000 / 60;
      if (elapsed > 0) setWpm(Math.round(correctChars / 5 / elapsed));
    }
  }, [correctChars, started, startTime, finished, typed]);

  // Record a WPM snapshot for words/quote mode (called on each word completion)
  const recordWordSnapshot = useCallback((newCorrectChars: number) => {
    if (!startTime || mode === "time") return;
    const elapsedSec = (Date.now() - startTime) / 1000;
    elapsedSecondsRef.current = elapsedSec;
    const elapsedMin = elapsedSec / 60 || 1 / 60;
    const snapWpm = Math.round(newCorrectChars / 5 / elapsedMin);
    const snapRaw = Math.round(allTypedRef.current / 5 / elapsedMin);
    setWpmHistory((prev) => [
      ...prev,
      { second: Math.round(elapsedSec), wpm: snapWpm, raw: snapRaw, errors: errorsThisSecondRef.current },
    ]);
    errorsThisSecondRef.current = 0;
  }, [startTime, mode]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Tab") {
        e.preventDefault();
        tabPressedRef.current = true;
        setTimeout(() => { tabPressedRef.current = false; }, 1000);
        return;
      }

      if (e.key === "Enter" && tabPressedRef.current) {
        e.preventDefault();
        tabPressedRef.current = false;
        resetTest();
        return;
      }

      if (finished) return;

      if (!started) {
        setStarted(true);
        setStartTime(Date.now());
        setShowControls(false);
        onTypingActiveChange?.(true);
      }

      markTypingActive();

      const currentWord = words[wordIndex];

      if (e.key === " ") {
        e.preventDefault();
        if (typed.length === 0) return;

        setWordInputs((prev) => [...prev, typed]);

        let correct = 0;
        let incorrect = 0;
        for (let i = 0; i < Math.min(typed.length, currentWord.length); i++) {
          if (typed[i] === currentWord[i]) correct++;
          else { incorrect++; errorsThisSecondRef.current++; }
        }
        const extra = Math.max(0, typed.length - currentWord.length);
        if (extra > 0) errorsThisSecondRef.current++;

        correctCharsRef.current += correct;
        const newCorrectChars = correctChars + correct;
        setCorrectChars(newCorrectChars);
        setIncorrectChars((prev) => prev + incorrect);
        setExtraChars((prev) => prev + extra);
        setTotalChars((prev) => prev + currentWord.length);

        if (totalChars + currentWord.length > 0) {
          setAccuracy(Math.round((newCorrectChars / (totalChars + currentWord.length)) * 100));
        }

        recordWordSnapshot(newCorrectChars);

        if (wordIndex + 1 >= words.length) {
          setFinished(true);
          onFinished?.(true);
          return;
        }
        setWordIndex((prev) => prev + 1);
        setTyped("");
        onKeyHighlight?.(null);
        return;
      }

      if (e.key === "Backspace") {
        if (typed.length === 0 && wordIndex > 0) {
          const prevInput = wordInputs[wordIndex - 1];
          setWordIndex((prev) => prev - 1);
          setTyped(prevInput);
          setWordInputs((prev) => prev.slice(0, -1));
        } else {
          setTyped((prev) => prev.slice(0, -1));
        }
        return;
      }

      if (e.key.length === 1) {
        allTypedRef.current += 1;
        const nextTyped = typed + e.key;
        setTyped(nextTyped);

        const isLastWord = wordIndex + 1 >= words.length;
        if (isLastWord && nextTyped.length >= currentWord.length && mode !== "time" && mode !== "zen") {
          let correct = 0;
          let incorrect = 0;
          for (let i = 0; i < Math.min(nextTyped.length, currentWord.length); i++) {
            if (nextTyped[i] === currentWord[i]) correct++;
            else { incorrect++; errorsThisSecondRef.current++; }
          }
          const extra = Math.max(0, nextTyped.length - currentWord.length);
          correctCharsRef.current += correct;
          const newCorrectCharsAuto = correctChars + correct;
          setCorrectChars(newCorrectCharsAuto);
          setIncorrectChars((prev) => prev + incorrect);
          setExtraChars((prev) => prev + extra);
          setTotalChars((prev) => prev + currentWord.length);
          setWordInputs((prev) => [...prev, nextTyped]);
          recordWordSnapshot(newCorrectCharsAuto);
          setFinished(true);
          onFinished?.(true);
          return;
        }

        const nextCharIndex = nextTyped.length;
        if (nextCharIndex < currentWord.length) {
          onKeyHighlight?.(currentWord[nextCharIndex]);
        } else {
          onKeyHighlight?.(" ");
        }
      }
    },
    [
      finished,
      started,
      words,
      wordIndex,
      typed,
      correctChars,
      totalChars,
      wordInputs,
      resetTest,
      onKeyHighlight,
      recordWordSnapshot,
      markTypingActive,
      onTypingActiveChange,
    ],
  );

  const handleFocus = () => {
    if (pauseRefocusRef.current) return;
    inputRef.current?.focus();
  };

  useEffect(() => {
    if (finished) return;
    const onGlobalKeyDown = () => {
      if (pauseRefocusRef.current) return;
      if (document.activeElement !== inputRef.current) inputRef.current?.focus();
    };
    document.addEventListener("keydown", onGlobalKeyDown, true);
    return () => document.removeEventListener("keydown", onGlobalKeyDown, true);
  }, [finished]);

  const handleInputBlur = useCallback(() => {
    if (!finished) {
      setTimeout(() => {
        if (!finished && !pauseRefocusRef.current) inputRef.current?.focus();
      }, 100);
    }
  }, [finished]);

  // Results screen
  if (finished) {
    const elapsed = startTime ? (Date.now() - startTime) / 1000 : elapsedSecondsRef.current;
    const elapsedMin = elapsed / 60 || 1 / 60;
    const finalWpm = Math.round(correctChars / 5 / elapsedMin);
    const finalRaw = Math.round(allTypedRef.current / 5 / elapsedMin);

    const wpmValues = wpmHistory.map((s) => s.wpm).filter((v) => v > 0);
    let consistency = 100;
    if (wpmValues.length > 1) {
      const mean = wpmValues.reduce((a, b) => a + b, 0) / wpmValues.length;
      const variance = wpmValues.reduce((a, b) => a + (b - mean) ** 2, 0) / wpmValues.length;
      const stdDev = Math.sqrt(variance);
      consistency = Math.max(0, Math.round(100 - (stdDev / (mean || 1)) * 100));
    }

    const stats: ResultStats = {
      wpm: finalWpm,
      accuracy,
      raw: finalRaw,
      correctChars,
      incorrectChars,
      extraChars,
      missedChars: 0,
      consistency,
      elapsedSeconds: Math.round(elapsed),
      mode,
      modeDetail: mode === "time" ? String(timeOption) : mode === "words" ? String(wordOption) : mode === "quote" ? quoteLength : "",
      wpmHistory,
    };

    return <ResultsScreen stats={stats} onRestart={resetTest} />;
  }

  // Controls are visible when not yet started, or when mouse moved recently
  const controlsVisible = !started || showControls;

  return (
    <div
      className="flex w-full max-w-4xl flex-col items-center gap-3"
      onClick={handleFocus}
      onMouseMove={handleMouseMove}
    >
      {/* ── Controls toolbar — fades out while typing (focus mode) ── */}
      <motion.div
        animate={{ opacity: controlsVisible ? 1 : 0 }}
        transition={{ duration: 0.4, ease: "easeInOut" }}
        className={cn(
          "flex flex-col items-center gap-1 sm:flex-row sm:items-center",
          !controlsVisible && "pointer-events-none select-none",
        )}
      >
        {/* Punctuation toggle */}
        <button
          onClick={() => setPunctuation(!punctuation)}
          className={cn(
            "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
            punctuation ? "text-primary" : "text-muted-foreground hover:text-foreground",
          )}
        >
          <IconAt size={14} />
          punctuation
        </button>

        {/* Numbers toggle */}
        <button
          onClick={() => setNumbers(!numbers)}
          className={cn(
            "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
            numbers ? "text-primary" : "text-muted-foreground hover:text-foreground",
          )}
        >
          <IconNumber size={14} />
          numbers
        </button>

        <div className="hidden h-4 w-px bg-border sm:mx-1 sm:block" />

        {/* Mode tabs */}
        <Tabs value={mode} onValueChange={(v) => setMode(v as TestMode)} className="flex items-center">
          <TabsList>
            {[
              { value: "time",  icon: IconClock,    label: "time"  },
              { value: "words", icon: IconLetterA,   label: "words" },
              { value: "quote", icon: IconQuote,     label: "quote" },
              { value: "zen",   icon: IconMountain,  label: "zen"   },
            ].map(({ value, icon: Icon, label }) => (
              <TabsTrigger key={value} value={value} className="gap-1.5 px-3 text-xs">
                <Icon size={13} />
                {label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="hidden h-4 w-px bg-border sm:mx-1 sm:block" />

        {/* Count / time / quote-length tabs */}
        {mode === "words" ? (
          <Tabs
            value={String(wordOption)}
            onValueChange={(v) => setWordOption(Number(v) as WordOption)}
            className="flex items-center"
          >
            <TabsList>
              {[10, 25, 50, 100].map((w) => (
                <TabsTrigger key={w} value={String(w)} className="px-3 text-xs">{w}</TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        ) : mode === "quote" ? (
          <Tabs
            value={quoteLength}
            onValueChange={(v) => setQuoteLength(v as QuoteLength)}
            className="flex items-center"
          >
            <TabsList>
              {(["short", "medium", "long"] as QuoteLength[]).map((q) => (
                <TabsTrigger key={q} value={q} className="px-3 text-xs">{q}</TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        ) : (
          <Tabs
            value={String(timeOption)}
            onValueChange={(v) => { if (mode === "time") setTimeOption(Number(v) as TimeOption); }}
            className="flex items-center"
          >
            <TooltipProvider>
              <TabsList>
                {[15, 30, 60, 120].map((t) => {
                  const isDisabled = mode !== "time";
                  const trigger = (
                    <TabsTrigger key={t} value={String(t)} disabled={isDisabled} className="px-3 text-xs">
                      {t}
                    </TabsTrigger>
                  );
                  if (!isDisabled) return trigger;
                  return (
                    <Tooltip key={t}>
                      <TooltipTrigger asChild>
                        <span className="inline-flex cursor-not-allowed">{trigger}</span>
                      </TooltipTrigger>
                      <TooltipContent side="bottom">only available in time mode</TooltipContent>
                    </Tooltip>
                  );
                })}
              </TabsList>
            </TooltipProvider>
          </Tabs>
        )}
      </motion.div>

      {/* ── Words display ── */}
      <div className="relative w-full">
        {/* Timer / progress — always reserves space */}
        <div className="mb-3 flex h-8 items-center gap-3">
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
          {mode === "words" && started && (
            <span className="font-mono text-sm text-muted-foreground">
              {wordIndex}/{wordOption}
            </span>
          )}
          {realtimeWpm && started && wpm > 0 && (
            <span className="font-mono text-sm text-muted-foreground transition-opacity duration-200">
              {wpm} <span className="text-xs opacity-60">wpm</span>
            </span>
          )}
        </div>

        <div
          ref={wordsContainerRef}
          className={cn(
            "relative h-44 w-full overflow-hidden text-2xl leading-relaxed",
            // Adds .is-typing so CSS can pause the cursor blink animation
            isActivelyTyping && "is-typing",
          )}
          style={{ fontFamily: "var(--typing-font)" }}
        >
          <input
            ref={inputRef}
            className="absolute opacity-0"
            onKeyDown={handleKeyDown}
            onBlur={handleInputBlur}
            value={typed}
            onChange={() => {}}
            autoFocus
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="none"
            spellCheck={false}
          />

          {/* Top fade — hides scrolled-away rows */}
          {rowOffset > 0 && (
            <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-10 bg-gradient-to-b from-background to-transparent" />
          )}

          <LayoutGroup id="words">
            <motion.div
              className="flex flex-wrap gap-x-2.5 gap-y-1"
              animate={{ y: -rowOffset }}
              transition={{ type: "spring", stiffness: 300, damping: 30, mass: 0.8 }}
            >
              {words.map((word, wIdx) => {
                const isActive = wIdx === wordIndex;
                const isPast = wIdx < wordIndex;
                // Only the active word gets live `typed` (re-renders every keystroke).
                // Past and future words get stable props → React.memo skips them.
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
        </div>
      </div>

      {/* Quote author */}
      {mode === "quote" && quoteAuthor && (
        <p className="text-xs text-muted-foreground/50">— {quoteAuthor}</p>
      )}

      {/* Restart button — stays partially visible while typing */}
      <motion.button
        animate={{ opacity: controlsVisible ? 1 : 0.15 }}
        transition={{ duration: 0.4 }}
        onClick={resetTest}
        className={cn(
          "rounded-lg p-2 text-muted-foreground transition-colors hover:text-foreground",
          !controlsVisible && "pointer-events-none",
        )}
        title="Restart test"
      >
        <IconRefresh size={18} />
      </motion.button>

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
