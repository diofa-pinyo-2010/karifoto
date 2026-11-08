/**
 * A Stripe metadata egy értéke legfeljebb 500 karakter, és a jegyzet a fizetős
 * ágon metadatán utazik a webhookig — ezért a textarea is ennyit enged.
 */
export const BEAUTY_RETOUCH_NOTES_MAX_LENGTH = 500;

/**
 * A beauty retus jegyzet csak akkor kötelező (és csak akkor mentjük), ha az
 * ügyfél jelölt képet extra retusra. Ha nem jelölt, a jegyzetet eldobjuk,
 * hogy egy korábban beírt, de már nem érvényes szöveg ne jusson el a
 * szerkesztőhöz.
 */
export function resolveBeautyRetouchNotes(
  retouchedImages: number,
  notes: string | null | undefined,
): { ok: true; notes: string | null } | { ok: false; error: string } {
  if (retouchedImages === 0) return { ok: true, notes: null };

  const trimmed = notes?.trim() ?? '';
  if (trimmed === '') {
    return { ok: false, error: 'Írd le, mit retusáljunk a képeken.' };
  }
  if (trimmed.length > BEAUTY_RETOUCH_NOTES_MAX_LENGTH) {
    return {
      ok: false,
      error: `A retus kérés legfeljebb ${BEAUTY_RETOUCH_NOTES_MAX_LENGTH} karakter lehet.`,
    };
  }
  return { ok: true, notes: trimmed };
}
