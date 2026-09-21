/**
 * Utility for managing Recent QR codes in localStorage.
 * Enables audience and host to quickly retrieve, view, and re-scan previously
 * generated QR codes during the live broadcast.
 */

export interface RecentQrRecord {
  id: string;
  url: string;
  dataUrl?: string; // base64 encoded QR image preview
  caption?: string;
  roundName?: string;
  paletteId?: string;
  paletteName?: string;
  timestamp: number; // unix timestamp ms
  formattedTime: string; // readable time e.g. "10:15:30"
}

const STORAGE_KEY = 'BTI2026_RECENT_QRS_STORAGE';
const MAX_RECENT_ITEMS = 10;

import { getSecureRandomId } from './cryptoUtils';
const EVENT_NAME = 'bti_recent_qrs_changed';

export const recentQrUtils = {
  /**
   * Retrieve all recent QR codes stored in localStorage.
   */
  getRecentQrs(): RecentQrRecord[] {
    if (typeof window === 'undefined' || !window.localStorage) return [];
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
      return [];
    } catch (err) {
      console.warn('Failed to parse recent QRs from localStorage:', err);
      return [];
    }
  },

  /**
   * Save a newly generated QR code into localStorage.
   * If an identical URL+caption was created within the last 60 seconds, updates the timestamp.
   */
  saveRecentQr(record: {
    url: string;
    dataUrl?: string;
    caption?: string;
    roundName?: string;
    paletteId?: string;
    paletteName?: string;
  }): RecentQrRecord {
    if (typeof window === 'undefined' || !window.localStorage) {
      return {
        id: `qr_${Date.now()}`,
        url: record.url,
        dataUrl: record.dataUrl,
        caption: record.caption,
        roundName: record.roundName,
        paletteId: record.paletteId,
        paletteName: record.paletteName,
        timestamp: Date.now(),
        formattedTime: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      };
    }

    try {
      const now = Date.now();
      const timeStr = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const currentList = this.getRecentQrs();

      // Check if duplicate exists (same url & caption within recent time)
      const existingIndex = currentList.findIndex(
        (item) => item.url === record.url && item.caption === record.caption && item.paletteId === record.paletteId
      );

      let newItem: RecentQrRecord;

      if (existingIndex !== -1) {
        // Update existing item to front
        const existing = currentList[existingIndex];
        newItem = {
          ...existing,
          dataUrl: record.dataUrl || existing.dataUrl,
          roundName: record.roundName || existing.roundName,
          timestamp: now,
          formattedTime: timeStr
        };
        currentList.splice(existingIndex, 1);
        currentList.unshift(newItem);
      } else {
        newItem = {
          id: getSecureRandomId(`qr_${now}_`, 7),
          url: record.url,
          dataUrl: record.dataUrl,
          caption: record.caption || '',
          roundName: record.roundName || '',
          paletteId: record.paletteId || 'purple_gold',
          paletteName: record.paletteName || '',
          timestamp: now,
          formattedTime: timeStr
        };
        currentList.unshift(newItem);
      }

      // Cap at MAX_RECENT_ITEMS
      const trimmed = currentList.slice(0, MAX_RECENT_ITEMS);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));

      // Emit custom window event so all open UI elements reactively sync
      window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: trimmed }));

      return newItem;
    } catch (err) {
      console.warn('Failed to save recent QR to localStorage:', err);
      return {
        id: `qr_${Date.now()}`,
        url: record.url,
        dataUrl: record.dataUrl,
        caption: record.caption,
        roundName: record.roundName,
        paletteId: record.paletteId,
        paletteName: record.paletteName,
        timestamp: Date.now(),
        formattedTime: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      };
    }
  },

  /**
   * Remove a single QR item from history.
   */
  removeRecentQr(id: string): void {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      const currentList = this.getRecentQrs();
      const updated = currentList.filter((item) => item.id !== id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: updated }));
    } catch (err) {
      console.warn('Failed to remove recent QR:', err);
    }
  },

  /**
   * Clear all recent QRs from localStorage.
   */
  clearRecentQrs(): void {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      localStorage.removeItem(STORAGE_KEY);
      window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: [] }));
    } catch (err) {
      console.warn('Failed to clear recent QRs:', err);
    }
  },

  /**
   * Subscribe to updates across components and tabs.
   */
  subscribe(callback: (items: RecentQrRecord[]) => void): () => void {
    if (typeof window === 'undefined') return () => {};

    const handleCustomEvent = (e: any) => {
      callback(e.detail || []);
    };

    const handleStorageEvent = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        callback(recentQrUtils.getRecentQrs());
      }
    };

    window.addEventListener(EVENT_NAME, handleCustomEvent);
    window.addEventListener('storage', handleStorageEvent);

    return () => {
      window.removeEventListener(EVENT_NAME, handleCustomEvent);
      window.removeEventListener('storage', handleStorageEvent);
    };
  }
};
