import { describe, expect, it } from 'vitest';

import { filterMentionCandidates, splitMentions } from '@/lib/mentions';

const ID = '3f2b8c1e-7a4d-4e9b-9c2a-1d5e6f7a8b9c';

describe('splitMentions', () => {
  it('leaves text without mentions whole', () => {
    expect(splitMentions('Nincs itt senki.')).toEqual(['Nincs itt senki.']);
  });

  it('cuts a mention out of the surrounding text', () => {
    expect(
      splitMentions(`Szia [@ id="${ID}" label="Kati"], nézd meg!`),
    ).toEqual(['Szia ', { id: ID, label: 'Kati' }, ', nézd meg!']);
  });

  it('reads attributes in any order and either quote style', () => {
    expect(splitMentions(`[@ label='Kati' id='${ID}']`)).toEqual([
      { id: ID, label: 'Kati' },
    ]);
  });

  it('keeps a mention without a label', () => {
    expect(splitMentions(`[@ id="${ID}"]`)).toEqual([{ id: ID, label: null }]);
  });

  it('leaves a shortcode without a valid id as text', () => {
    const text = '[@ id="nem-uuid" label="Kati"] és [@ label="Kati"]';
    expect(splitMentions(text)).toEqual([text]);
  });

  it('finds adjacent mentions', () => {
    expect(splitMentions(`[@ id="${ID}"][@ id="${ID}"]`)).toEqual([
      { id: ID, label: null },
      { id: ID, label: null },
    ]);
  });
});

describe('filterMentionCandidates', () => {
  const staff = [
    { id: '1', nickname: 'Kati', name: 'Kovács Katalin' },
    { id: '2', nickname: 'Ági', name: 'Szabó Ágnes' },
    { id: '3', nickname: 'Peti', name: 'Nagy Péter' },
  ];

  it('returns everyone for an empty query', () => {
    expect(filterMentionCandidates(staff, '')).toHaveLength(3);
  });

  it('matches the full name or the nickname, ignoring case and accents', () => {
    expect(filterMentionCandidates(staff, 'agn').map((s) => s.id)).toEqual([
      '2',
    ]);
    expect(filterMentionCandidates(staff, 'PETI').map((s) => s.id)).toEqual([
      '3',
    ]);
  });

  it('respects the limit', () => {
    expect(filterMentionCandidates(staff, '', 2)).toHaveLength(2);
  });
});
