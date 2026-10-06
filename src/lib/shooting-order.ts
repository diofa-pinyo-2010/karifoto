import type { Prisma } from '@/generated/prisma/client';

export const SHOOTING_ORDER_PARAM = 'rendezes';
export const SHOOTING_SEARCH_PARAM = 'q';

export const SHOOTING_ORDER_BY = {
  'start-asc': { timeSlot: { startTime: 'asc' } },
  'start-desc': { timeSlot: { startTime: 'desc' } },
  'created-asc': { createdAt: 'asc' },
  'created-desc': { createdAt: 'desc' },
} as const satisfies Record<
  string,
  Prisma.PhotoShootingOrderByWithRelationInput
>;

export type ShootingOrder = keyof typeof SHOOTING_ORDER_BY;

export const DEFAULT_SHOOTING_ORDER: ShootingOrder = 'start-asc';

export const SHOOTING_ORDER_LABEL: Record<ShootingOrder, string> = {
  'start-asc': 'Fotózás ideje (legkorábbi elöl)',
  'start-desc': 'Fotózás ideje (legkésőbbi elöl)',
  'created-asc': 'Foglalás ideje (legrégebbi elöl)',
  'created-desc': 'Foglalás ideje (legújabb elöl)',
};

export function parseShootingOrder(value: unknown): ShootingOrder {
  return typeof value === 'string' && value in SHOOTING_ORDER_BY
    ? (value as ShootingOrder)
    : DEFAULT_SHOOTING_ORDER;
}
