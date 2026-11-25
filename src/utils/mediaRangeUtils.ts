export const MAX_MEDIA_RANGE_CHUNK_BYTES = 2 * 1024 * 1024;

export interface ParsedByteRange {
  ok: boolean;
  start: number;
  end: number;
  status: 206 | 416;
}

export function parseCappedByteRange(
  rangeHeader: string | undefined,
  totalBytes: number,
  maxChunkBytes: number = MAX_MEDIA_RANGE_CHUNK_BYTES
): ParsedByteRange | null {
  if (!rangeHeader || !Number.isFinite(totalBytes) || totalBytes <= 0) {
    return null;
  }

  const trimmed = rangeHeader.trim();
  const match = /^bytes=(\d*)-(\d*)(?:\s*,.*)?$/i.exec(trimmed);
  if (!match) {
    return null;
  }

  const [, rawStart, rawEnd] = match;
  if (!rawStart && !rawEnd) {
    return { ok: false, start: 0, end: 0, status: 416 };
  }

  const chunkLimit = Math.max(1, Math.floor(maxChunkBytes));
  let start: number;
  let end: number;

  if (!rawStart && rawEnd) {
    const suffixLength = Number(rawEnd);
    if (!Number.isFinite(suffixLength) || suffixLength <= 0) {
      return { ok: false, start: 0, end: 0, status: 416 };
    }
    start = Math.max(0, totalBytes - suffixLength);
    end = Math.min(totalBytes - 1, start + chunkLimit - 1);
  } else {
    start = Number(rawStart);
    if (!Number.isFinite(start) || start < 0 || start >= totalBytes) {
      return { ok: false, start: 0, end: 0, status: 416 };
    }
    if (rawEnd) {
      const requestedEnd = Number(rawEnd);
      if (!Number.isFinite(requestedEnd) || requestedEnd < start) {
        return { ok: false, start: 0, end: 0, status: 416 };
      }
      end = Math.min(totalBytes - 1, requestedEnd, start + chunkLimit - 1);
    } else {
      end = Math.min(totalBytes - 1, start + chunkLimit - 1);
    }
  }

  return {
    ok: true,
    start,
    end,
    status: 206,
  };
}

export function getMediaContentType(filename: string): string {
  const lower = filename.toLowerCase();
  if (lower.endsWith('.mp3')) return 'audio/mpeg';
  if (lower.endsWith('.wav')) return 'audio/wav';
  if (lower.endsWith('.ogg')) return 'audio/ogg';
  if (lower.endsWith('.m4a')) return 'audio/mp4';
  if (lower.endsWith('.mp4')) return 'video/mp4';
  if (lower.endsWith('.webm')) return 'video/webm';
  return 'application/octet-stream';
}
