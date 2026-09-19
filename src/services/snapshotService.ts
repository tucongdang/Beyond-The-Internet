import html2canvas from 'html2canvas-pro';
import { GameState, UserResponse, StageSnapshotRecord } from '../types';
import { soundFx } from './audioEffects';
import { syncService } from './syncService';
import { driveService } from './driveService';

const SNAPSHOT_STORAGE_KEY = 'BTI2026_BROADCAST_SNAPSHOT_HISTORY';

export class SnapshotService {
  /**
   * Retrieve all saved snapshot records from storage
   */
  public getSnapshots(): StageSnapshotRecord[] {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(SNAPSHOT_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Failed to parse snapshot history from localStorage:', e);
    }
    return [];
  }

  /**
   * Save snapshot records to storage
   */
  public saveSnapshots(snapshots: StageSnapshotRecord[]): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(SNAPSHOT_STORAGE_KEY, JSON.stringify(snapshots));
    } catch (e) {
      console.error('Failed to save snapshot history to localStorage:', e);
    }
  }

  /**
   * Capture screenshot of the target DOM element and save it to history
   */
  public async captureAndSave(
    targetElement: HTMLElement,
    gameState: GameState,
    responses: Record<string, UserResponse>,
    activeCount: number,
    customNote?: string,
    tag: StageSnapshotRecord['broadcast_tag'] = 'GENERAL'
  ): Promise<StageSnapshotRecord | null> {
    try {
      // Shutter sound effect
      soundFx.playCameraShutter();

      // High-quality canvas render using html2canvas-pro
      const canvas = await html2canvas(targetElement, {
        scale: 1.5,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#190839',
        logging: false,
        imageTimeout: 5000,
        width: targetElement.scrollWidth,
        height: targetElement.scrollHeight,
        windowWidth: targetElement.scrollWidth,
        windowHeight: targetElement.scrollHeight,
        ignoreElements: (element) => {
          return element.classList.contains('no-screenshot');
        }
      });

      const highResDataUrl = canvas.toDataURL('image/png', 0.95);
      const thumbDataUrl = canvas.toDataURL('image/jpeg', 0.15);
      const submittedCount = Object.keys(responses || {}).length;

      // Extract top distribution stats if applicable
      const topDistribution: Array<{ label: string; count: number; percent: number }> = [];
      if (gameState.options && Object.keys(gameState.options).length > 0 && submittedCount > 0) {
        const counts: Record<string, number> = {};
        Object.values(responses).forEach(r => {
          const c = (r.choice || '').toUpperCase();
          if (c) counts[c] = (counts[c] || 0) + 1;
        });

        Object.entries(gameState.options).forEach(([k, label]) => {
          const count = counts[k.toUpperCase()] || 0;
          const percent = submittedCount > 0 ? Math.round((count / submittedCount) * 100) : 0;
          topDistribution.push({ label: `${k}. ${label}`, count, percent });
        });
      }

      const newRecord: StageSnapshotRecord = {
        id: `snap_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        timestamp: Date.now(),
        question_id: gameState.question_id || 'STANDBY',
        question_text: gameState.question_text || (gameState.status === 'STANDBY' ? 'Màn Hình Chờ' : 'Sân Khấu Live'),
        round_name: gameState.round_name || 'Vòng Thi Đấu',
        round_type: gameState.round_type,
        status: gameState.status,
        response_count: submittedCount,
        active_count: activeCount,
        image_data_url: thumbDataUrl,
        top_distribution: topDistribution.length > 0 ? topDistribution : undefined,
        note: customNote || undefined,
        broadcast_tag: tag
      };
      
      // Try to upload high-res to Google Drive asynchronously
      (async () => {
        try {
           const timeStr = new Date(newRecord.timestamp).toTimeString().split(' ')[0].replace(/:/g, '-');
           const qCode = (newRecord.question_id || 'STAGE').replace(/[^a-zA-Z0-9_-]/g, '');
           const filename = `BTI2026_Snapshot_${qCode}_${timeStr}.png`;
           const driveId = await driveService.uploadImage(highResDataUrl, filename);
           if (driveId) {
             console.log("Successfully saved snapshot to Google Drive. File ID:", driveId);
             syncService.logActivity('SYSTEM_EVENT', 'Google Drive Sync', `Đã đồng bộ ảnh chụp lên Google Drive (Tên: ${filename})`);
           }
        } catch (e) {
           console.warn("Could not save snapshot to Google Drive:", e);
        }
      })();

      const existing = this.getSnapshots();
      const updated = [newRecord, ...existing];
      
      // Limit to latest 20 snapshots to prevent excessive localStorage growth
      const trimmed = updated.slice(0, 20);
      this.saveSnapshots(trimmed);

      syncService.logActivity('SCREENSHOT_SAVED', 'Lưu Ảnh Chụp Sân Khấu', `Đã lưu ảnh chụp trạng thái câu hỏi ${gameState.question_id} (Tag: ${tag}).`, { snapshotId: newRecord.id, tag });

      return newRecord;
    } catch (err) {
      console.error('Failed to capture stage snapshot:', err);
      soundFx.playError();
      return null;
    }
  }

  /**
   * Delete a snapshot by ID
   */
  public deleteSnapshot(id: string): StageSnapshotRecord[] {
    const existing = this.getSnapshots();
    const updated = existing.filter(s => s.id !== id);
    this.saveSnapshots(updated);
    return updated;
  }

  /**
   * Update note or tag of a snapshot
   */
  public updateSnapshot(id: string, updates: Partial<StageSnapshotRecord>): StageSnapshotRecord[] {
    const existing = this.getSnapshots();
    const updated = existing.map(s => (s.id === id ? { ...s, ...updates } : s));
    this.saveSnapshots(updated);
    return updated;
  }

  /**
   * Clear all snapshots
   */
  public clearAllSnapshots(): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem(SNAPSHOT_STORAGE_KEY);
    } catch (e) {
      console.error('Failed to clear snapshots:', e);
    }
  }

  /**
   * Trigger direct PNG file download
   */
  public downloadImage(record: StageSnapshotRecord): void {
    if (typeof window === 'undefined') return;
    try {
      const link = document.createElement('a');
      const timeStr = new Date(record.timestamp).toTimeString().split(' ')[0].replace(/:/g, '-');
      const qCode = (record.question_id || 'STAGE').replace(/[^a-zA-Z0-9_-]/g, '');
      link.download = `BTI2026_Snapshot_${qCode}_${timeStr}.png`;
      link.href = record.image_data_url;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.error('Failed to trigger download:', e);
    }
  }
}

export const snapshotService = new SnapshotService();
