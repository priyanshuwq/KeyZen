

export type WpmCountMode = "time" | "words" | "quote" | "zen"

export interface MonkeytypeStyleCounts {
  correctWordChars: number
  correctSpaces: number
  allCorrectChars: number
  incorrectChars: number
  extraChars: number
  missedChars: number
}

interface CountParams {
  targetWords: string[]
  wordInputs: string[]
  typed: string
  wordIndex: number
  mode: WpmCountMode
  /** When true, uses Monkeytype's "final" rules for the incomplete last word. */
  final: boolean
}

export function countMonkeytypeStyle({
  targetWords,
  wordInputs,
  typed,
  wordIndex,
  mode,
  final,
}: CountParams): MonkeytypeStyleCounts {
  /** Invariant: `wordInputs.length === wordIndex` (slice guards if briefly out of sync). */
  const inputWords = [...wordInputs.slice(0, wordIndex), typed]

  let correctWordChars = 0
  let allCorrectChars = 0
  let incorrectChars = 0
  let extraChars = 0
  let missedChars = 0
  let correctSpaces = 0

  const isTimedTest = mode === "time" || mode === "zen"
  const shouldCountPartialLastWord = !final || (final && isTimedTest)

  for (let i = 0; i < inputWords.length; i++) {
    const inputWord = inputWords[i] as string
    const targetWord = targetWords[i]
    if (targetWord === undefined) break

    if (inputWord === targetWord) {
      correctWordChars += targetWord.length
      allCorrectChars += targetWord.length
      if (i < inputWords.length - 1 && !inputWord.endsWith("\n")) correctSpaces++
    } else if (inputWord.length >= targetWord.length) {
      for (let c = 0; c < inputWord.length; c++) {
        if (c < targetWord.length) {
          if (inputWord[c] === targetWord[c]) allCorrectChars++
          else incorrectChars++
        } else {
          extraChars++
        }
      }
    } else {
      const toAdd = { correct: 0, incorrect: 0, missed: 0 }
      for (let c = 0; c < targetWord.length; c++) {
        if (c < inputWord.length) {
          if (inputWord[c] === targetWord[c]) toAdd.correct++
          else toAdd.incorrect++
        } else {
          toAdd.missed++
        }
      }
      allCorrectChars += toAdd.correct
      incorrectChars += toAdd.incorrect

      if (i === inputWords.length - 1 && shouldCountPartialLastWord) {
        if (toAdd.incorrect === 0) correctWordChars += toAdd.correct
      } else {
        missedChars += toAdd.missed
      }
    }

  }

  return {
    correctWordChars,
    correctSpaces,
    allCorrectChars,
    incorrectChars,
    extraChars,
    missedChars,
  }
}

export function wpmNumeratorFromCounts(c: MonkeytypeStyleCounts): number {
  return c.correctWordChars + c.correctSpaces
}

export function accuracyFromCounts(c: MonkeytypeStyleCounts): number {
  const denom = c.allCorrectChars + c.incorrectChars
  if (denom <= 0) return 100
  return Math.round((c.allCorrectChars / denom) * 100)
}
