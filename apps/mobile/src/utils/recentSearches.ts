import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "encore.recentSearches";
const MAX_ITEMS = 8;

export async function getRecentSearches(): Promise<string[]> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as string[];
  } catch {
    return [];
  }
}

export async function addRecentSearch(query: string): Promise<string[]> {
  const trimmed = query.trim();
  if (!trimmed) return getRecentSearches();

  const existing = await getRecentSearches();
  const next = [trimmed, ...existing.filter((q) => q.toLowerCase() !== trimmed.toLowerCase())].slice(0, MAX_ITEMS);
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
  return next;
}

export async function clearRecentSearches(): Promise<void> {
  await AsyncStorage.removeItem(KEY);
}
