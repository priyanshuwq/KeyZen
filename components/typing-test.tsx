"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
} from "@tabler/icons-react";
import { ResultsScreen, type ResultStats, type WpmSnapshot } from "@/components/results-screen";
import { useSettings } from "@/components/settings-context";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type TestMode = "time" | "words" | "quote" | "zen";
type TimeOption = 15 | 30 | 60 | 120;
type WordOption = 10 | 25 | 50 | 100;

interface TypingTestProps {
  onKeyHighlight?: (key: string | null) => void;
  onFinished?: (finished: boolean) => void;
}

export function TypingTest({ onKeyHighlight, onFinished }: TypingTestProps) {
  const { realtimeWpm } = useSettings();
  const [mode, setMode] = useState<TestMode>("time");
  const [timeOption, setTimeOption] = useState<TimeOption>(30);
  const [wordOption, setWordOption] = useState<WordOption>(25);
  const [quoteLength, setQuoteLength] = useState<QuoteLength>("medium");
  const [quoteAuthor, setQuoteAuthor] = useState<string | null>(null);
  const [punctuation, setPunctuation] = useState(false);

  const [words, setWords] = useState<string[]>([]);
  const [typed, setTyped] = useState("");
  const [wordIndex, setWordIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
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
  const allTypedRef = useRef(0); // every keystroke
  const errorsThisSecondRef = useRef(0);
  const elapsedSecondsRef = useRef(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const wordsContainerRef = useRef<HTMLDivElement>(null);
  const activeWordRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tabPressedRef = useRef(false);

  const wordCount = useMemo(() => {
    if (mode === "time") return 200;
    if (mode === "words") return wordOption;
    return 100;
  }, [mode, wordOption]);

  // Generate words on mount & mode change
  const resetTest = useCallback(() => {
    setQuoteAuthor(null);
    if (mode === "quote") {
      const { words: newWords, author } = getQuote(quoteLength);
      setWords(newWords);
      setQuoteAuthor(author);
    } else {
      setWords(generateWords(wordCount, { punctuation }));
    }
    setTyped("");
    setWordIndex(0);
    setCharIndex(0);
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
    if (mode === "time") {
      setTimeLeft(timeOption);
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setRowOffset(0);
    onFinished?.(false);
    inputRef.current?.focus();
  }, [wordCount, mode, timeOption, quoteLength, punctuation, onFinished]);

  useEffect(() => {
    resetTest();
  }, [resetTest]);

  // Translate words wrapper up when active word reaches the 3rd visible row
  useEffect(() => {
    if (!activeWordRef.current) return;
    const word = activeWordRef.current;
    // row height = word height + gap-y-1 (4px)
    const lineH = word.offsetHeight + 4;
    const row = Math.round(word.offsetTop / lineH);
    // Keep active word in the 2nd visible row (row index 1)
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

        setTimeLeft((prev) => {
          if (prev <= 1) {
            setFinished(true);
            onFinished?.(true);
            if (timerRef.current) clearInterval(timerRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => {
        if (timerRef.current) clearInterval(timerRef.current);
      };
    }
  }, [started, mode, finished]);

  // Calculate WPM
  useEffect(() => {
    if (started && startTime && !finished) {
      const elapsed = (Date.now() - startTime) / 1000 / 60;
      if (elapsed > 0) {
        setWpm(Math.round(correctChars / 5 / elapsed));
      }
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
        // Clear tab state after a short window
        setTimeout(() => {
          tabPressedRef.current = false;
        }, 1000);
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
      }

      const currentWord = words[wordIndex];

      if (e.key === " ") {
        e.preventDefault();
        if (typed.length === 0) return;

        // Record this word's input
        setWordInputs((prev) => [...prev, typed]);

        // Count correct / incorrect / extra chars
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
          setAccuracy(
            Math.round(
              (newCorrectChars / (totalChars + currentWord.length)) * 100,
            ),
          );
        }

        recordWordSnapshot(newCorrectChars);

        // Move to next word
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
          // Go back to previous word and restore its typed input
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

        // Auto-finish when last char of last word is typed (words/quote mode)
        const isLastWord = wordIndex + 1 >= words.length;
        if (isLastWord && nextTyped.length >= currentWord.length && mode !== "time" && mode !== "zen") {
          // Tally the final word
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

        // Highlight next expected key
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
    ],
  );

  const handleFocus = () => inputRef.current?.focus();

  // Keep input focused: re-focus on any keydown anywhere on the page
  useEffect(() => {
    if (finished) return;
    const onGlobalKeyDown = () => {
      if (document.activeElement !== inputRef.current) {
        inputRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onGlobalKeyDown, true);
    return () => document.removeEventListener("keydown", onGlobalKeyDown, true);
  }, [finished]);

  // Re-focus when the input loses focus (e.g. user clicks elsewhere)
  const handleInputBlur = useCallback(() => {
    if (!finished) {
      // Small delay so UI interactions (settings panel, buttons) still work
      setTimeout(() => {
        if (!finished) inputRef.current?.focus();
      }, 100);
    }
  }, [finished]);

  // Results screen
  if (finished) {
    const elapsed = startTime ? (Date.now() - startTime) / 1000 : elapsedSecondsRef.current;
    const elapsedMin = elapsed / 60 || 1/60;
    const finalWpm = Math.round(correctChars / 5 / elapsedMin);
    const finalRaw = Math.round(allTypedRef.current / 5 / elapsedMin);

    // Consistency = 100 - (stdDev / mean * 100)
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

  return (
    <div
      className="flex w-full max-w-4xl flex-col items-center gap-3"
      onClick={handleFocus}
    >
      {/* Mode selector — mobile: stacked col, desktop: single row */}
      <div className="flex flex-col items-center gap-1 sm:flex-row sm:items-center">
        {/* Punctuation — own row on mobile */}
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

        <div className="hidden h-4 w-px bg-border sm:mx-1 sm:block" />

        {/* Mode tabs */}
        <Tabs
          value={mode}
          onValueChange={(v) => setMode(v as TestMode)}
          className="flex items-center"
        >
          <TabsList>
            {[
              { value: "time", icon: IconClock, label: "time" },
              { value: "words", icon: IconLetterA, label: "words" },
              { value: "quote", icon: IconQuote, label: "quote" },
              { value: "zen", icon: IconMountain, label: "zen" },
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
                <TabsTrigger key={w} value={String(w)} className="px-3 text-xs">
                  {w}
                </TabsTrigger>
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
                <TabsTrigger key={q} value={q} className="px-3 text-xs">
                  {q}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        ) : (
          <Tabs
            value={String(timeOption)}
            onValueChange={(v) => {
              if (mode === "time") setTimeOption(Number(v) as TimeOption);
            }}
            className="flex items-center"
          >
            <TooltipProvider>
              <TabsList>
                {[15, 30, 60, 120].map((t) => {
                  const isDisabled = mode !== "time";
                  const trigger = (
                    <TabsTrigger
                      key={t}
                      value={String(t)}
                      disabled={isDisabled}
                      className="px-3 text-xs"
                    >
                      {t}
                    </TabsTrigger>
                  );
                  if (!isDisabled) return trigger;
                  return (
                    <Tooltip key={t}>
                      <TooltipTrigger asChild>
                        <span className="inline-flex cursor-not-allowed">
                          {trigger}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent side="bottom">
                        only available in time mode
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </TabsList>
            </TooltipProvider>
          </Tabs>
        )}
      </div>

      {/* Words display — timer anchored top-left inside, space always reserved */}
      <div className="relative w-full">
        {/* Timer top-left — always occupies space, invisible before start */}
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
        className="relative h-44 w-full overflow-hidden text-2xl leading-relaxed"
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
            const wordInput = isPast ? wordInputs[wIdx] : isActive ? typed : "";
            // cursor sits before typed.length, or after last char if at/past end
            const cursorAtEnd = isActive && typed.length >= word.length;

            return (
              <div
                key={`${word}-${wIdx}`}
                ref={isActive ? activeWordRef : undefined}
                className="relative"
              >
                {word.split("").map((char, cIdx) => {
                  let color = "text-muted-foreground/40";
                  if (isPast || isActive) {
                    if (cIdx < wordInput.length) {
                      color = wordInput[cIdx] === char ? "text-foreground" : "text-destructive";
                    }
                  }
                  const isLastChar = cIdx === word.length - 1;

                  return (
                    <span key={cIdx} className="relative inline-block">
                      {/* Cursor before this char */}
                      {isActive && cIdx === typed.length && (
                        <motion.span
                          layoutId={`cursor-w${wordIndex}`}
                          className="typing-cursor absolute -left-px top-[2px] h-[1.2em] w-[2px] rounded-full bg-primary"
                          transition={{ type: "spring", stiffness: 600, damping: 35 }}
                        />
                      )}
                      {/* Cursor after last char (typed at or past end) */}
                      {isActive && isLastChar && cursorAtEnd && (
                        <motion.span
                          layoutId={`cursor-w${wordIndex}`}
                          className="typing-cursor absolute -right-px top-[2px] h-[1.2em] w-[2px] rounded-full bg-primary"
                          transition={{ type: "spring", stiffness: 600, damping: 35 }}
                        />
                      )}
                      <span className={cn("transition-colors duration-75", color)}>
                        {char}
                      </span>
                    </span>
                  );
                })}
                {/* Extra typed chars beyond word length */}
                {(isActive || isPast) &&
                  wordInput.length > word.length &&
                  wordInput.slice(word.length).split("").map((char, eIdx) => (
                    <span key={`extra-${eIdx}`} className="text-destructive/60">
                      {char}
                    </span>
                  ))}
              </div>
            );
          })}
        </motion.div>
        </LayoutGroup>
      </div>
      </div>{/* end words wrapper */}

      {/* Quote author */}
      {mode === "quote" && quoteAuthor && (
        <p className="text-xs text-muted-foreground/50">— {quoteAuthor}</p>
      )}

      {/* Restart button */}
      <button
        onClick={resetTest}
        className="rounded-lg p-2 text-muted-foreground transition-colors hover:text-foreground"
        title="Restart test"
      >
        <IconRefresh size={18} />
      </button>

      {/* Keyboard shortcuts hint */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span>
          <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px]">
            tab
          </kbd>
          {" + "}
          <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px]">
            enter
          </kbd>
          {" "}- restart test
        </span>
      </div>
    </div>
  );
}
