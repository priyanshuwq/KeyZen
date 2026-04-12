import { generate } from "random-words";

const punctuationMarks = [".", ",", "!", "?", ";", ":"] as const;

export function generateWords(
  count: number,
  options?: { punctuation?: boolean; numbers?: boolean },
): string[] {
  const raw = generate({ exactly: count, minLength: 2, maxLength: 8 }) as string[];

  return raw.map((word) => {
    // Optionally replace ~15% of words with a number
    if (options?.numbers && Math.random() < 0.15) {
      return String(Math.floor(Math.random() * 10000));
    }

    if (!options?.punctuation) return word;

    const rand = Math.random();
    if (rand < 0.1) {
      return word + punctuationMarks[Math.floor(Math.random() * punctuationMarks.length)];
    } else if (rand < 0.15) {
      return `"${word}"`;
    } else if (rand < 0.2) {
      return word.charAt(0).toUpperCase() + word.slice(1);
    }
    return word;
  });
}
