import type { ReaderStatus, StatusResponse } from '@sumup/sdk';

export type ReaderDeviceStatus = StatusResponse['data'];

type ReaderState = NonNullable<ReaderDeviceStatus['state']>;
type ReaderConnection = NonNullable<ReaderDeviceStatus['connection_type']>;

const STATE_LABEL = {
  IDLE: 'Készen áll',
  SELECTING_TIP: 'Borravaló választás',
  WAITING_FOR_CARD: 'Kártyára vár',
  WAITING_FOR_PIN: 'PIN-kódra vár',
  WAITING_FOR_SIGNATURE: 'Aláírásra vár',
  UPDATING_FIRMWARE: 'Szoftverfrissítés folyamatban',
} satisfies Record<ReaderState, string>;

const CONNECTION_LABEL = {
  'Wi-Fi': 'Wi-Fi',
  lte: '4G (LTE)',
  umts: '3G',
  edge: '2G (EDGE)',
  gprs: '2G (GPRS)',
  btle: 'Bluetooth',
  usb: 'USB',
} satisfies Record<ReaderConnection, string>;

const PAIRING_LABEL = {
  paired: 'Párosítva',
  processing: 'Párosítás folyamatban',
  expired: 'Párosítás lejárt',
  unknown: 'Ismeretlen párosítás',
} satisfies Record<ReaderStatus, string>;

export function readerStateLabel(state: ReaderState) {
  return STATE_LABEL[state];
}

export function readerConnectionLabel(connection: ReaderConnection) {
  return CONNECTION_LABEL[connection];
}

export type ReaderBadge = {
  tone: 'online' | 'offline' | 'unavailable';
  label: string;
};

/**
 * A kártya fő címkéje. Párosítatlan readertől nem kérünk állapotot, és ha a
 * `getStatus` elhasalt (pl. túl régi Solo firmware), `deviceStatus` `null`.
 */
export function getReaderBadge(
  pairing: ReaderStatus,
  deviceStatus: ReaderDeviceStatus | null,
): ReaderBadge {
  if (pairing !== 'paired') {
    return { tone: 'unavailable', label: PAIRING_LABEL[pairing] };
  }
  if (!deviceStatus) {
    return { tone: 'unavailable', label: 'Állapot nem elérhető' };
  }
  return deviceStatus.status === 'ONLINE'
    ? { tone: 'online', label: 'Online' }
    : { tone: 'offline', label: 'Offline' };
}
