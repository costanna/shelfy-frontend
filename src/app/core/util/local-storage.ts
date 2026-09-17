export function tryGetLocalStorage(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function trySetLocalStorage(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {}
}
