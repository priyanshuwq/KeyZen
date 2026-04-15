export interface Language {
  name: string;
  code: string;
  has1k: boolean;
}

let manifestCache: Language[] | null = null;

export async function getLanguageManifest(): Promise<Language[]> {
  if (manifestCache) return manifestCache;
  const res = await fetch("/languages/_manifest.json");
  manifestCache = (await res.json()) as Language[];
  return manifestCache;
}

const wordCache = new Map<string, string[]>();

export async function fetchLanguageWords(
  code: string,
  hard: boolean,
): Promise<string[]> {
  const key = hard ? `${code}_1k` : code;
  if (wordCache.has(key)) return wordCache.get(key)!;

  // Try the requested variant; fall back to base if _1k doesn't exist
  let res = await fetch(`/languages/${key}.json`);
  if (!res.ok && hard) {
    res = await fetch(`/languages/${code}.json`);
  }
  if (!res.ok) {
    // Ultimate fallback: return empty and let caller use random-words
    return [];
  }
  const data = (await res.json()) as { words: string[] };
  wordCache.set(key, data.words);
  return data.words;
}
