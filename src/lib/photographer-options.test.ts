import { describe, expect, it } from 'vitest';

import { buildPhotographerOptions } from '@/lib/photographer-options';

const photographers = [
  { id: 'p1', nickname: 'Anna' },
  { id: 'p2', nickname: 'Bence' },
];

describe('buildPhotographerOptions', () => {
  it('lists every photographer, then an unassign option with a null id', () => {
    const options = buildPhotographerOptions(photographers, null);

    expect(options.map(({ id, label }) => ({ id, label }))).toEqual([
      { id: 'p1', label: 'Anna' },
      { id: 'p2', label: 'Bence' },
      { id: null, label: 'Nincs fotós' },
    ]);
  });

  it('marks only the assigned photographer as current', () => {
    const options = buildPhotographerOptions(photographers, 'p2');

    expect(options.filter((o) => o.isCurrent).map((o) => o.id)).toEqual(['p2']);
  });

  it('marks the unassign option as current when nobody is assigned', () => {
    const options = buildPhotographerOptions(photographers, null);

    expect(options.filter((o) => o.isCurrent).map((o) => o.id)).toEqual([null]);
  });
});
