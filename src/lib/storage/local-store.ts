const PREFIX = "next-portal";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function readJson<T>(key: string): T | null {
  if (!isBrowser()) return null;
  const raw = window.localStorage.getItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function writeJson<T>(key: string, value: T): void {
  if (!isBrowser()) return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

export function readGlobal<T>(key: string): T | null {
  return readJson<T>(`${PREFIX}:${key}`);
}

export function writeGlobal<T>(key: string, value: T): void {
  writeJson(`${PREFIX}:${key}`, value);
}

export function readProjectScoped<T>(projectId: string, key: string): T | null {
  return readJson<T>(`${PREFIX}:project:${projectId}:${key}`);
}

export function writeProjectScoped<T>(projectId: string, key: string, value: T): void {
  writeJson(`${PREFIX}:project:${projectId}:${key}`, value);
}

export function removeProjectScoped(projectId: string, key: string): void {
  if (!isBrowser()) return;
  window.localStorage.removeItem(`${PREFIX}:project:${projectId}:${key}`);
}
