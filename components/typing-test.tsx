"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, LayoutGroup } from "motion/react";
import { generateWords, type Difficulty } from "@/lib/words";
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
  IconPointer,
  IconFeather,
  IconFlame,
} from "@tabler/icons-react";
import { ResultsScreen, type ResultStats, type WpmSnapshot } from "@/components/results-screen";
import { useSettings } from "@/components/settings-context";
import {
  accuracyFromCounts,
  countMonkeytypeStyle,
  wpmNumeratorFromCounts,
} from "@/lib/wpm-count";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type TestMode = "time" | "words" | "quote" | "zen";
type TimeOption = 15 | 30 | 60 | 120;
type WordOption = 10 | 25 | 50 | 100;

const TIME_OPTION_STORAGE_KEY = "tc-time-option";
const VALID_TIME_OPTIONS: readonly TimeOption[] = [15, 30, 60, 120];

function readStoredTimeOption(): TimeOption | undefined {
  if (typeof window === "undefined") return undefined;
  const raw = localStorage.getItem(TIME_OPTION_STORAGE_KEY);
  if (raw === null) return undefined;
  const n = Number(raw);
  if (!Number.isFinite(n) || !VALID_TIME_OPTIONS.includes(n as TimeOption)) return undefined;
  return n as TimeOption;
}

const PUNCTUATION_STORAGE_KEY = "tc-punctuation";
const NUMBERS_STORAGE_KEY = "tc-numbers";

function readStoredBool(key: string): boolean | undefined {
  if (typeof window === "undefined") return undefined;
  const raw = localStorage.getItem(key);
  if (raw === "true") return true;
  if (raw === "false") return false;
  return undefined;
}

const TEST_MODE_STORAGE_KEY = "tc-test-mode";
const WORD_OPTION_STORAGE_KEY = "tc-word-option";
const QUOTE_LENGTH_STORAGE_KEY = "tc-quote-length";

const VALID_TEST_MODES: readonly TestMode[] = ["time", "words", "quote", "zen"];
const VALID_WORD_OPTIONS: readonly WordOption[] = [10, 25, 50, 100];
const VALID_QUOTE_LENGTHS: readonly QuoteLength[] = ["short", "medium", "long"];

const DIFFICULTY_STORAGE_KEY = "tc-difficulty";
const VALID_DIFFICULTIES: readonly Difficulty[] = ["easy", "hard"];

function readStoredDifficulty(): Difficulty | undefined {
  if (typeof window === "undefined") return undefined;
  const raw = localStorage.getItem(DIFFICULTY_STORAGE_KEY);
  if (raw === null) return undefined;
  if (!(VALID_DIFFICULTIES as readonly string[]).includes(raw)) return undefined;
  return raw as Difficulty;
}

function readStoredTestMode(): TestMode | undefined {
  if (typeof window === "undefined") return undefined;
  const raw = localStorage.getItem(TEST_MODE_STORAGE_KEY);
  if (raw === null) return undefined;
  if (!(VALID_TEST_MODES as readonly string[]).includes(raw)) return undefined;
  return raw as TestMode;
}

function readStoredWordOption(): WordOption | undefined {
  if (typeof window === "undefined") return undefined;
  const raw = localStorage.getItem(WORD_OPTION_STORAGE_KEY);
  if (raw === null) return undefined;
  const n = Number(raw);
  if (!Number.isFinite(n) || !(VALID_WORD_OPTIONS as readonly number[]).includes(n)) return undefined;
  return n as WordOption;
}

function readStoredQuoteLength(): QuoteLength | undefined {
  if (typeof window === "undefined") return undefined;
  const raw = localStorage.getItem(QUOTE_LENGTH_STORAGE_KEY);
  if (raw === null) return undefined;
  if (!(VALID_QUOTE_LENGTHS as readonly string[]).includes(raw)) return undefined;
  return raw as QuoteLength;
}


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
  onFocusChange?: (focused: boolean) => void;
  pauseTypingInputRefocus?: boolean;
}

export function TypingTest({
  onKeyHighlight,
  onFinished,
  onTypingActiveChange,
  onFocusChange,
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
  const [difficulty, setDifficulty] = useState<Difficulty | undefined>(undefined);

  useEffect(() => {
    const storedMode = readStoredTestMode();
    if (storedMode !== undefined) setMode(storedMode);
    const storedTime = readStoredTimeOption();
    if (storedTime !== undefined) setTimeOption(storedTime);
    const storedWordOption = readStoredWordOption();
    if (storedWordOption !== undefined) setWordOption(storedWordOption);
    const storedQuoteLength = readStoredQuoteLength();
    if (storedQuoteLength !== undefined) setQuoteLength(storedQuoteLength);
    const storedPunctuation = readStoredBool(PUNCTUATION_STORAGE_KEY);
    if (storedPunctuation !== undefined) setPunctuation(storedPunctuation);
    const storedNumbers = readStoredBool(NUMBERS_STORAGE_KEY);
    if (storedNumbers !== undefined) setNumbers(storedNumbers);
    const storedDifficulty = readStoredDifficulty();
    if (storedDifficulty !== undefined) setDifficulty(storedDifficulty);
  }, []);

  const [words, setWords] = useState<string[]>([]);
  const [typed, setTyped] = useState("");
  const [wordIndex, setWordIndex] = useState(0);
  const [started, setStarted] = useState(false);
  const [rowOffset, setRowOffset] = useState(0);
  const [finished, setFinished] = useState(false);
  const [timeLeft, setTimeLeft] = useState(30);
  const [startTime, setStartTime] = useState<number | null>(null);

 
  const [wordInputs, setWordInputs] = useState<string[]>([]);


  const [wpm, setWpm] = useState(0);
  const [wpmHistory, setWpmHistory] = useState<WpmSnapshot[]>([]);

  const correctCharsRef = useRef(0);
  const allTypedRef = useRef(0);
  const errorsThisSecondRef = useRef(0);
  const elapsedSecondsRef = useRef(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const wordsContainerRef = useRef<HTMLDivElement>(null);
  const activeWordRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tabPressedRef = useRef(false);


  const [showControls, setShowControls] = useState(true);
  const controlsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);


  const [isFocused, setIsFocused] = useState(true);
  const [resetting, setResetting] = useState(false);


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

  const mtCounts = useMemo(
    () =>
      countMonkeytypeStyle({
        targetWords: words,
        wordInputs,
        typed,
        wordIndex,
        mode,
        final: finished,
      }),
    [words, wordInputs, typed, wordIndex, mode, finished],
  );

  const wpmNumerator = wpmNumeratorFromCounts(mtCounts);
  const accuracy = accuracyFromCounts(mtCounts);

  correctCharsRef.current = wpmNumerator;

  const resetTestImmediate = useCallback(() => {
    setQuoteAuthor(null);
    if (mode === "quote") {
      const { words: newWords, author } = getQuote(quoteLength);
      setWords(newWords);
      setQuoteAuthor(author);
    } else {
      setWords(generateWords(wordCount, { punctuation, numbers, difficulty }));
    }
    setTyped("");
    setWordIndex(0);
    setStarted(false);
    setFinished(false);
    setStartTime(null);
    setWordInputs([]);
    setWpm(0);
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
  }, [wordCount, mode, timeOption, quoteLength, punctuation, numbers, difficulty, onFinished, onTypingActiveChange]);

  const resetAnimRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetTest = useCallback(() => {
    // Prevent overlapping resets
    if (resetAnimRef.current) clearTimeout(resetAnimRef.current);
    // Phase 1: fade out
    setResetting(true);
    // Phase 2: swap words after fade-out completes, then fade in
    resetAnimRef.current = setTimeout(() => {
      resetTestImmediate();
      setResetting(false);
      resetAnimRef.current = null;
    }, 150);
  }, [resetTestImmediate]);

  const isFirstMount = useRef(true);
  useEffect(() => {
    if (isFirstMount.current) {
      // No fade animation on initial mount
      isFirstMount.current = false;
      resetTestImmediate();
    } else {
      resetTest();
    }
  }, [resetTest, resetTestImmediate]);


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


  useEffect(() => {
    if (finished) return;
    if (mode !== "time" || !started) return;
    if (timeLeft !== 0) return;
    setFinished(true);
    onFinished?.(true);
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }, [timeLeft, mode, started, finished, onFinished]);


  useEffect(() => {
    if (started && startTime && !finished) {
      const elapsed = (Date.now() - startTime) / 1000 / 60;
      if (elapsed > 0) setWpm(Math.round(wpmNumerator / 5 / elapsed));
    }
  }, [wpmNumerator, started, startTime, finished, typed]);


  const recordWordSnapshot = useCallback(
    (
      snapshotWordInputs: string[],
      snapshotTyped: string,
      snapshotWordIndex: number,
    ) => {
      if (!startTime || mode === "time") return;
      const snapCounts = countMonkeytypeStyle({
        targetWords: words,
        wordInputs: snapshotWordInputs,
        typed: snapshotTyped,
        wordIndex: snapshotWordIndex,
        mode,
        final: false,
      });
      const snapNum = wpmNumeratorFromCounts(snapCounts);
      const elapsedSec = (Date.now() - startTime) / 1000;
      elapsedSecondsRef.current = elapsedSec;
      const elapsedMin = elapsedSec / 60 || 1 / 60;
      const snapWpm = Math.round(snapNum / 5 / elapsedMin);
      const snapRaw = Math.round(allTypedRef.current / 5 / elapsedMin);
      setWpmHistory((prev) => [
        ...prev,
        { second: Math.round(elapsedSec), wpm: snapWpm, raw: snapRaw, errors: errorsThisSecondRef.current },
      ]);
      errorsThisSecondRef.current = 0;
    },
    [startTime, mode, words],
  );

  /** Clear the whole current word at once (macOS option+⌫); if already empty, jump to the previous word. */
  const clearWordOrNavigateBack = useCallback(() => {
    if (typed.length > 0) {
      setTyped("");
      const cw = words[wordIndex];
      onKeyHighlight?.(cw && cw.length > 0 ? cw[0] : null);
      return;
    }
    if (wordIndex <= 0) return;
    const prevInput = wordInputs[wordIndex - 1];
    const prevWord = words[wordIndex - 1];
    setWordIndex((prev) => prev - 1);
    setTyped(prevInput);
    setWordInputs((prev) => prev.slice(0, -1));
    if (prevInput.length < prevWord.length) onKeyHighlight?.(prevWord[prevInput.length]);
    else onKeyHighlight?.(" ");
  }, [typed, wordIndex, wordInputs, words, onKeyHighlight]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      const isAltWordDelete =
        e.altKey &&
        !e.metaKey &&
        !e.ctrlKey &&
        !e.shiftKey &&
        (e.key === "Backspace" || e.key === "Delete");
      const isCtrlBackspaceWordNav =
        e.ctrlKey && !e.altKey && !e.metaKey && !e.shiftKey && e.key === "Backspace";

      if (isAltWordDelete || isCtrlBackspaceWordNav) {
        e.preventDefault();
        if (finished) return;
        if (!started) {
          setStarted(true);
          setStartTime(Date.now());
          setShowControls(false);
          onTypingActiveChange?.(true);
        }
        markTypingActive();
        clearWordOrNavigateBack();
        return;
      }

      // Ignore any shortcut with a modifier key (Cmd+L, Ctrl+W, Alt+…, etc.)
      if (e.metaKey || e.ctrlKey || e.altKey) return;

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

        for (let i = 0; i < Math.min(typed.length, currentWord.length); i++) {
          if (typed[i] !== currentWord[i]) errorsThisSecondRef.current++;
        }
        if (typed.length > currentWord.length) errorsThisSecondRef.current++;

        const nextInputs = [...wordInputs, typed];
        const nextIndex = wordIndex + 1;
        recordWordSnapshot(nextInputs, "", nextIndex);

        if (wordIndex + 1 >= words.length) {
          setWordInputs(nextInputs);
          setFinished(true);
          onFinished?.(true);
          return;
        }
        setWordInputs(nextInputs);
        setWordIndex(nextIndex);
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
          for (let i = 0; i < Math.min(nextTyped.length, currentWord.length); i++) {
            if (nextTyped[i] !== currentWord[i]) errorsThisSecondRef.current++;
          }
          if (nextTyped.length > currentWord.length) errorsThisSecondRef.current++;
          const nextInputs = [...wordInputs, nextTyped];
          setWordInputs(nextInputs);
          recordWordSnapshot(nextInputs, "", wordIndex + 1);
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
      wordInputs,
      resetTest,
      onKeyHighlight,
      recordWordSnapshot,
      markTypingActive,
      onTypingActiveChange,
      clearWordOrNavigateBack,
    ],
  );

  const handleFocus = () => {
    if (pauseRefocusRef.current) return;
    inputRef.current?.focus();
  };

  // Show the focus overlay when the input loses focus (unless paused for settings/popovers)
  const handleInputBlur = useCallback(() => {
    if (pauseRefocusRef.current) return;
    setIsFocused(false);
    onFocusChange?.(false);
  }, [onFocusChange]);

  const handleInputFocus = useCallback(() => {
    setIsFocused(true);
    onFocusChange?.(true);
  }, [onFocusChange]);

  // Freeze stats the moment the test finishes so they stay stable during reset animations.
  const frozenStatsRef = useRef<ResultStats | null>(null);

  if (finished && !frozenStatsRef.current) {
    const elapsed = startTime ? (Date.now() - startTime) / 1000 : elapsedSecondsRef.current;
    const elapsedMin = elapsed / 60 || 1 / 60;
    const finalWpm = Math.round(wpmNumerator / 5 / elapsedMin);
    const finalRaw = Math.round(allTypedRef.current / 5 / elapsedMin);

    const wpmValues = wpmHistory.map((s) => s.wpm).filter((v) => v > 0);
    let consistency = 100;
    if (wpmValues.length > 1) {
      const mean = wpmValues.reduce((a, b) => a + b, 0) / wpmValues.length;
      const variance = wpmValues.reduce((a, b) => a + (b - mean) ** 2, 0) / wpmValues.length;
      const stdDev = Math.sqrt(variance);
      consistency = Math.max(0, Math.round(100 - (stdDev / (mean || 1)) * 100));
    }

    frozenStatsRef.current = {
      wpm: finalWpm,
      accuracy,
      raw: finalRaw,
      correctChars: mtCounts.correctWordChars,
      incorrectChars: mtCounts.incorrectChars,
      extraChars: mtCounts.extraChars,
      missedChars: mtCounts.missedChars,
      consistency,
      elapsedSeconds: Math.round(elapsed),
      mode,
      modeDetail: mode === "time" ? String(timeOption) : mode === "words" ? String(wordOption) : mode === "quote" ? quoteLength : "",
      wpmHistory,
    };
  }

  if (!finished) {
    frozenStatsRef.current = null;
  }

  // Controls are visible when not yet started, or when mouse moved recently
  const controlsVisible = !started || showControls;
  const showResults = finished && frozenStatsRef.current;

  // Fade state for results ↔ typing transitions
  const [screenFade, setScreenFade] = useState(1);
  const screenFadeRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleResultsRestart = useCallback(() => {
    // Phase 1: fade out results
    setScreenFade(0);
    if (screenFadeRef.current) clearTimeout(screenFadeRef.current);
    screenFadeRef.current = setTimeout(() => {
      // Phase 2: reset test (switches to typing view), then fade in
      resetTestImmediate();
      requestAnimationFrame(() => setScreenFade(1));
      screenFadeRef.current = null;
    }, 150);
  }, [resetTestImmediate]);

  // Also fade when test finishes (typing → results)
  const prevFinishedRef = useRef(false);
  useEffect(() => {
    if (finished && !prevFinishedRef.current) {
      setScreenFade(0);
      requestAnimationFrame(() => setScreenFade(1));
    }
    prevFinishedRef.current = finished;
  }, [finished]);

  if (showResults) {
    return (
      <div
        className="w-full transition-all duration-150 ease-out"
        style={{ opacity: screenFade, filter: screenFade < 1 ? "blur(4px)" : "none" }}
      >
        <ResultsScreen stats={frozenStatsRef.current!} onRestart={handleResultsRestart} />
      </div>
    );
  }

  return (
    <div
      className="flex w-full flex-col items-center gap-3 transition-all duration-150 ease-out"
      style={{ opacity: screenFade, filter: screenFade < 1 ? "blur(4px)" : "none" }}
      onClick={handleFocus}
      onMouseMove={handleMouseMove}
    >
      {/* ── Controls toolbar — fades out while typing (focus mode) ── */}
      <motion.div
        animate={{ opacity: controlsVisible ? 1 : 0 }}
        transition={{ duration: 0.4, ease: "easeInOut" }}
        className={cn(
          "flex flex-col items-center gap-2 sm:flex-row sm:items-center sm:gap-1",
          !controlsVisible && "pointer-events-none select-none",
        )}
      >
        <div className="flex flex-row flex-wrap items-center justify-center gap-2">
          {/* Punctuation toggle */}
          <button
            type="button"
            onClick={() => {
              const next = !punctuation;
              setPunctuation(next);
              localStorage.setItem(PUNCTUATION_STORAGE_KEY, String(next));
            }}
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
            type="button"
            onClick={() => {
              const next = !numbers;
              setNumbers(next);
              localStorage.setItem(NUMBERS_STORAGE_KEY, String(next));
            }}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
              numbers ? "text-primary" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <IconNumber size={14} />
            numbers
          </button>

          <div className="hidden h-4 w-px bg-border sm:block" />

          {/* Difficulty toggles */}
          <button
            type="button"
            onClick={() => {
              const next = difficulty === "easy" ? undefined : "easy" as Difficulty;
              setDifficulty(next);
              if (next) localStorage.setItem(DIFFICULTY_STORAGE_KEY, next);
              else localStorage.removeItem(DIFFICULTY_STORAGE_KEY);
            }}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
              difficulty === "easy" ? "text-primary" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <IconFeather size={14} />
            easy
          </button>
          <button
            type="button"
            onClick={() => {
              const next = difficulty === "hard" ? undefined : "hard" as Difficulty;
              setDifficulty(next);
              if (next) localStorage.setItem(DIFFICULTY_STORAGE_KEY, next);
              else localStorage.removeItem(DIFFICULTY_STORAGE_KEY);
            }}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
              difficulty === "hard" ? "text-primary" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <IconFlame size={14} />
            hard
          </button>
        </div>

        <div className="hidden h-4 w-px bg-border sm:mx-1 sm:block" />

        {/* Mode tabs */}
        <Tabs
          value={mode}
          onValueChange={(v) => {
            const next = v as TestMode;
            setMode(next);
            localStorage.setItem(TEST_MODE_STORAGE_KEY, next);
          }}
          className="flex items-center"
        >
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
            onValueChange={(v) => {
              const next = Number(v) as WordOption;
              setWordOption(next);
              localStorage.setItem(WORD_OPTION_STORAGE_KEY, String(next));
            }}
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
            onValueChange={(v) => {
              const next = v as QuoteLength;
              setQuoteLength(next);
              localStorage.setItem(QUOTE_LENGTH_STORAGE_KEY, next);
            }}
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
            onValueChange={(v) => {
              if (mode !== "time") return;
              const next = Number(v) as TimeOption;
              setTimeOption(next);
              localStorage.setItem(TIME_OPTION_STORAGE_KEY, String(next));
            }}
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
            onFocus={handleInputFocus}
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

          {/* Focus overlay — shown when the input has lost focus */}
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
        className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground"
      >
        <span>
          <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px]">tab</kbd>
          {" + "}
          <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px]">enter</kbd>
          {" "}- restart test
        </span>
        <span>
          <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px]">option</kbd>
          {" + "}
          <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px]">⌫</kbd>
          {" · "}
          <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px]">ctrl</kbd>
          {" + "}
          <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px]">⌫</kbd>
          {" "}- clear whole word (back if empty)
        </span>
      </motion.div>
    </div>
  );
}
