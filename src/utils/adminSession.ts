import { AdminUser } from '../types';

export const ADMIN_STORAGE_KEYS = {
  AUTH: 'BTI2026_ADMIN_AUTH',
  TECH_USER: 'BTI2026_TECH_USER',
  TOKEN: 'BTI2026_ADMIN_TOKEN',
  KEEP_LOGGED_IN: 'BTI2026_KEEP_LOGGED_IN',
} as const;

export const ADMIN_INACTIVITY_LIMIT_MS = 30 * 60 * 1000;
export const ADMIN_WARNING_THRESHOLD_MS = 28 * 60 * 1000;

export function getStoredAdminAuth(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    if (sessionStorage.getItem(ADMIN_STORAGE_KEYS.AUTH) === 'true') return true;
    if (
      localStorage.getItem(ADMIN_STORAGE_KEYS.KEEP_LOGGED_IN) === 'true' &&
      localStorage.getItem(ADMIN_STORAGE_KEYS.AUTH) === 'true'
    ) {
      sessionStorage.setItem(ADMIN_STORAGE_KEYS.AUTH, 'true');
      return true;
    }
  } catch {}
  return false;
}

export function getStoredAdminUser(): AdminUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw =
      sessionStorage.getItem(ADMIN_STORAGE_KEYS.TECH_USER) ||
      (localStorage.getItem(ADMIN_STORAGE_KEYS.KEEP_LOGGED_IN) === 'true'
        ? localStorage.getItem(ADMIN_STORAGE_KEYS.TECH_USER)
        : null);
    if (raw) {
      if (localStorage.getItem(ADMIN_STORAGE_KEYS.KEEP_LOGGED_IN) === 'true') {
        sessionStorage.setItem(ADMIN_STORAGE_KEYS.TECH_USER, raw);
        const tk = localStorage.getItem(ADMIN_STORAGE_KEYS.TOKEN);
        if (tk && !sessionStorage.getItem(ADMIN_STORAGE_KEYS.TOKEN)) {
          sessionStorage.setItem(ADMIN_STORAGE_KEYS.TOKEN, tk);
        }
      }
      return JSON.parse(raw) as AdminUser;
    }
  } catch {}
  return null;
}

export function persistAdminSession(user: AdminUser | null, token?: string, keepLoggedIn?: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(ADMIN_STORAGE_KEYS.AUTH, 'true');
    if (user) {
      sessionStorage.setItem(ADMIN_STORAGE_KEYS.TECH_USER, JSON.stringify(user));
    }
    if (token) {
      sessionStorage.setItem(ADMIN_STORAGE_KEYS.TOKEN, token);
    }
    if (keepLoggedIn) {
      localStorage.setItem(ADMIN_STORAGE_KEYS.KEEP_LOGGED_IN, 'true');
      localStorage.setItem(ADMIN_STORAGE_KEYS.AUTH, 'true');
      if (user) localStorage.setItem(ADMIN_STORAGE_KEYS.TECH_USER, JSON.stringify(user));
      if (token) localStorage.setItem(ADMIN_STORAGE_KEYS.TOKEN, token);
    }
  } catch {}
}

export function clearAdminSession(): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(ADMIN_STORAGE_KEYS.AUTH);
    sessionStorage.removeItem(ADMIN_STORAGE_KEYS.TECH_USER);
    sessionStorage.removeItem(ADMIN_STORAGE_KEYS.TOKEN);
    localStorage.removeItem(ADMIN_STORAGE_KEYS.AUTH);
    localStorage.removeItem(ADMIN_STORAGE_KEYS.TECH_USER);
    localStorage.removeItem(ADMIN_STORAGE_KEYS.TOKEN);
    localStorage.removeItem(ADMIN_STORAGE_KEYS.KEEP_LOGGED_IN);
  } catch {}
}
