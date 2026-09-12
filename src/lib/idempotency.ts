import { redis } from '@/lib/redis';

// Stripe could resend the event within 96 hours
export const EVENT_TTL = 96 * 60 * 60; // 96 hours in seconds

const eventKey = (eventId: string) => `stripe_evt:${eventId}`;

/**
 * Atomically marks an event as processed.
 * Returns true if this is the first time we're seeing this event (should process).
 * Returns false if the event was already processed (should skip).
 */
const markAsProcessed = async (key: string): Promise<boolean> => {
  try {
    const inserted = await redis.set(
      key,
      `processed_at:${new Date().toISOString()}`,
      { nx: true, ex: EVENT_TTL },
    );
    return inserted !== null; // null = already existed, string = newly inserted
  } catch (error) {
    console.error(`Error marking key as processed: ${key}`, error);
    // If Redis is down, process the event to avoid blocking payments
    return true;
  }
};

export const isEventProcessed = async (eventId: string): Promise<boolean> => {
  const inserted = await markAsProcessed(eventKey(eventId));
  return !inserted;
};

/**
 * Drops the marker after a failed run, so Stripe's next retry is processed
 * instead of being turned away by the key we wrote on the way in.
 */
export const releaseEvent = async (eventId: string): Promise<void> => {
  try {
    await redis.del(eventKey(eventId));
  } catch (error) {
    console.error(`Error releasing event: ${eventId}`, error);
  }
};

export const isPaymentIntentProcessed = async (
  paymentIntentId: string,
): Promise<boolean> => {
  const inserted = await markAsProcessed(`stripe_pi:${paymentIntentId}`);
  return !inserted;
};
