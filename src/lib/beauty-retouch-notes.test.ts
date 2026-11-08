import { describe, expect, it } from 'vitest';

import {
  BEAUTY_RETOUCH_NOTES_MAX_LENGTH,
  resolveBeautyRetouchNotes,
} from '@/lib/beauty-retouch-notes';

describe('resolveBeautyRetouchNotes', () => {
  it('drops the notes when no image is flagged for retouch', () => {
    expect(resolveBeautyRetouchNotes(0, 'leftover text')).toEqual({
      ok: true,
      notes: null,
    });
  });

  it('requires notes when an image is flagged for retouch', () => {
    expect(resolveBeautyRetouchNotes(2, '   ').ok).toBe(false);
    expect(resolveBeautyRetouchNotes(2, null).ok).toBe(false);
  });

  it('trims the notes', () => {
    expect(resolveBeautyRetouchNotes(1, '  pattanás  ')).toEqual({
      ok: true,
      notes: 'pattanás',
    });
  });

  it('rejects notes over the Stripe metadata limit', () => {
    const tooLong = 'a'.repeat(BEAUTY_RETOUCH_NOTES_MAX_LENGTH + 1);

    expect(resolveBeautyRetouchNotes(1, tooLong).ok).toBe(false);
  });
});
