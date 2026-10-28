import { describe, expect, it } from 'vitest';

import { choosePaymentReaderId, getReaderBadge } from '@/lib/sumup/readers';

describe('getReaderBadge', () => {
  it('shows online for a paired, online reader', () => {
    expect(getReaderBadge('paired', { status: 'ONLINE' })).toEqual({
      tone: 'online',
      label: 'Online',
    });
  });

  it('shows offline for a paired, offline reader', () => {
    expect(getReaderBadge('paired', { status: 'OFFLINE' }).tone).toBe(
      'offline',
    );
  });

  it('marks a paired reader without status as unavailable', () => {
    expect(getReaderBadge('paired', null)).toEqual({
      tone: 'unavailable',
      label: 'Állapot nem elérhető',
    });
  });

  it('reports the pairing state of an unpaired reader', () => {
    expect(getReaderBadge('expired', null)).toEqual({
      tone: 'unavailable',
      label: 'Párosítás lejárt',
    });
    expect(getReaderBadge('processing', null).label).toBe(
      'Párosítás folyamatban',
    );
  });

  it('ignores device status when the reader is not paired', () => {
    expect(getReaderBadge('unknown', { status: 'ONLINE' }).tone).toBe(
      'unavailable',
    );
  });
});

const paired = (id: string) => ({ id, status: 'paired' as const });

describe('choosePaymentReaderId', () => {
  it('keeps the selected reader while it is paired', () => {
    expect(
      choosePaymentReaderId('rdr_a', [paired('rdr_a'), paired('rdr_b')]),
    ).toBe('rdr_a');
  });

  it('falls back to the only paired reader when the selection is gone', () => {
    expect(choosePaymentReaderId('rdr_old', [paired('rdr_new')])).toBe(
      'rdr_new',
    );
  });

  it('falls back to the only paired reader when nothing is selected', () => {
    expect(
      choosePaymentReaderId(null, [
        paired('rdr_a'),
        { id: 'rdr_b', status: 'expired' },
      ]),
    ).toBe('rdr_a');
  });

  it('does not guess between several paired readers', () => {
    expect(
      choosePaymentReaderId('rdr_old', [paired('rdr_a'), paired('rdr_b')]),
    ).toBeNull();
  });

  it('does not keep a selected reader that is no longer paired', () => {
    expect(
      choosePaymentReaderId('rdr_a', [{ id: 'rdr_a', status: 'expired' }]),
    ).toBeNull();
  });

  it('returns null without readers', () => {
    expect(choosePaymentReaderId(null, [])).toBeNull();
  });
});
