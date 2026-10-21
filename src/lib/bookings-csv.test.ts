import { describe, expect, it } from 'vitest';

import { PhotoShootingStatus } from '@/generated/prisma/enums';
import { BookingCsvRow, buildBookingsCsv } from '@/lib/bookings-csv';

const ROW: BookingCsvRow = {
  createdAt: new Date('2026-10-21T08:05:00Z'),
  startTime: new Date('2026-12-05T13:00:00Z'),
  email: 'anna@example.com',
  phoneNumber: '+36301234567',
  amountInCents: 59_000_00,
  photoShootingId: '3b9f6c1e-2d4a-4f7b-8e15-6a0c9d2b7e31',
  status: PhotoShootingStatus.WAITING_FOR_THE_DATE,
};

function lines(csv: string) {
  return csv.replace(/^﻿/, '').trimEnd().split('\r\n');
}

describe('buildBookingsCsv', () => {
  it('starts with a BOM and a header row', () => {
    const csv = buildBookingsCsv([]);

    expect(csv.startsWith('﻿')).toBe(true);
    expect(lines(csv)).toEqual([
      'foglalas_idopontja,fotozas_idopontja,email,tel,osszeg,penznem,foglalas_azonositoja,statusz',
    ]);
  });

  it('writes Budapest-local dates and whole forints', () => {
    expect(lines(buildBookingsCsv([ROW]))[1]).toBe(
      '2026-10-21 10:05:00+02:00,2026-12-05 14:00,anna@example.com,+36301234567,59000,HUF,3b9f6c1e-2d4a-4f7b-8e15-6a0c9d2b7e31,Várunk a fotózásra',
    );
  });

  it('writes createdAt with the Budapest offset of that date', () => {
    const createdAtColumn = (createdAt: Date) =>
      lines(buildBookingsCsv([{ ...ROW, createdAt }]))[1].split(',')[0];

    // nyári időszámítás
    expect(createdAtColumn(new Date('2026-07-15T08:00:00Z'))).toBe(
      '2026-07-15 10:00:00+02:00',
    );
    // téli időszámítás
    expect(createdAtColumn(new Date('2026-12-15T09:00:00Z'))).toBe(
      '2026-12-15 10:00:00+01:00',
    );
  });

  it('leaves the amount empty without a price snapshot', () => {
    const [, row] = lines(buildBookingsCsv([{ ...ROW, amountInCents: null }]));

    expect(row.split(',')[4]).toBe('');
  });

  it('quotes fields containing commas or quotes', () => {
    const [, row] = lines(
      buildBookingsCsv([{ ...ROW, email: 'a,"b"@example.com' }]),
    );

    expect(row).toContain(',"a,""b""@example.com",');
  });
});
