import { describe, expect, it } from 'vitest';

import { getReaderBadge } from '@/lib/sumup/readers';

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
