const STORAGE_KEY = "viabrain.selectedRepoIds";

export function loadSelectedRepoIds(availableIds: string[]): string[] {
  const available = new Set(availableIds);
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return availableIds;
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return availableIds;
    const ids = parsed.filter(
      (id): id is string => typeof id === "string" && available.has(id),
    );
    return ids.length > 0 ? ids : availableIds;
  } catch {
    return availableIds;
  }
}

export function saveSelectedRepoIds(ids: string[]): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch {
    // ignore quota / private mode
  }
}
