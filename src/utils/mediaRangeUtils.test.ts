import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MAX_MEDIA_RANGE_CHUNK_BYTES,
  getMediaContentType,
  parseCappedByteRange,
} from './mediaRangeUtils.ts';

const MP3_SIZE = 22_081_536;

test('caps open-ended Range bytes=0- to MAX_MEDIA_RANGE_CHUNK_BYTES (2 MiB)', () => {
  const parsed = parseCappedByteRange('bytes=0-', MP3_SIZE);
  assert.deepEqual(parsed, {
    ok: true,
    start: 0,
    end: MAX_MEDIA_RANGE_CHUNK_BYTES - 1,
    status: 206,
  });
});

test('caps oversized explicit Range requests to maxChunkBytes while honoring smaller ranges', () => {
  const capped = parseCappedByteRange('bytes=1024-20000000', MP3_SIZE);
  assert.deepEqual(capped, {
    ok: true,
    start: 1024,
    end: 1024 + MAX_MEDIA_RANGE_CHUNK_BYTES - 1,
    status: 206,
  });

  const small = parseCappedByteRange('bytes=0-1', MP3_SIZE);
  assert.deepEqual(small, {
    ok: true,
    start: 0,
    end: 1,
    status: 206,
  });
});

test('handles tail offsets, suffix ranges, and out-of-bounds ranges', () => {
  const tail = parseCappedByteRange(`bytes=${MP3_SIZE - 500}-`, MP3_SIZE);
  assert.deepEqual(tail, {
    ok: true,
    start: MP3_SIZE - 500,
    end: MP3_SIZE - 1,
    status: 206,
  });

  const suffix = parseCappedByteRange('bytes=-1024', MP3_SIZE);
  assert.deepEqual(suffix, {
    ok: true,
    start: MP3_SIZE - 1024,
    end: MP3_SIZE - 1,
    status: 206,
  });

  const oob = parseCappedByteRange(`bytes=${MP3_SIZE}-`, MP3_SIZE);
  assert.deepEqual(oob, {
    ok: false,
    start: 0,
    end: 0,
    status: 416,
  });
});

test('returns null when Range header is absent and maps audio MIME types', () => {
  assert.equal(parseCappedByteRange(undefined, MP3_SIZE), null);
  assert.equal(getMediaContentType('track.mp3'), 'audio/mpeg');
  assert.equal(getMediaContentType('clip.webm'), 'video/webm');
});
