import { parsePhoneNumberFromString } from 'libphonenumber-js';

import { PhotoShootingStatus } from '@/generated/prisma/enums';
import { PHOTO_SHOOTING_STATUS_LABEL } from '@/lib/constants';
import { csvDateTimeFormatter, formatOffsetDateTime } from '@/lib/formatters';
import { centsToHuf } from '@/lib/utils';

export type BookingCsvRow = {
  createdAt: Date;
  startTime: Date;
  email: string;
  phoneNumber: string;
  /** `totalToBeInvoiced` in fillér; `null` when the shooting has no price snapshot. */
  amountInCents: number | null;
  photoShootingId: string;
  status: PhotoShootingStatus;
};

const HEADER = [
  'foglalas_idopontja',
  'fotozas_idopontja',
  'email',
  'tel',
  'tel_e164',
  'osszeg',
  'penznem',
  'foglalas_azonositoja',
  'statusz',
];

// Excel only reads the file as UTF-8 (ő, ű) when it starts with a BOM.
const BOM = '﻿';

/**
 * E.164 form of a phone number as the client typed it ("06 20 …", "0036…",
 * "+36 20 …", or national digits only), defaulting to Hungary; empty when
 * it is not a valid number. Export-only — the stored value is never touched.
 */
export function normalizePhoneNumber(value: string): string {
  const phone = parsePhoneNumberFromString(
    value.trim().replace(/^00/, '+'),
    'HU',
  );

  return phone?.isValid() ? phone.format('E.164') : '';
}

function escapeCsvField(value: string) {
  return /[",\r\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}

/**
 * The bookings export. `amount` is whole forints, the same value the
 * `booking_completed` event carries (see `buildBookingCompletedEvent`), and
 * dates are Budapest-local; `createdAt` also carries its UTC offset.
 */
export function buildBookingsCsv(rows: BookingCsvRow[]): string {
  const lines = rows.map((row) => [
    // Google Ads offline conversion time: when the booking was made.
    formatOffsetDateTime(row.createdAt),
    csvDateTimeFormatter.format(row.startTime),
    row.email,
    row.phoneNumber,
    normalizePhoneNumber(row.phoneNumber),
    row.amountInCents == null ? '' : String(centsToHuf(row.amountInCents)),
    'HUF',
    row.photoShootingId,
    PHOTO_SHOOTING_STATUS_LABEL[row.status],
  ]);

  return (
    BOM +
    [HEADER, ...lines]
      .map((fields) => fields.map(escapeCsvField).join(','))
      .join('\r\n') +
    '\r\n'
  );
}
