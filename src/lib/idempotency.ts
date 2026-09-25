import { redis } from '@/lib/upstash';

// Stripe could resend the event within 96 hours
export const EVENT_TTL = 96 * 60 * 60; // 96 hours in seconds
const REMINDER_TTL = 48 * 60 * 60; // 48 hours in seconds
const DEPOSIT_INVOICE_CLAIM_TTL = 10 * 60; // 10 minutes
const DEPOSIT_INVOICE_ISSUED_TTL = 30 * 24 * 60 * 60; // 30 days

const eventKey = (eventId: string) => `stripe_evt:${eventId}`;
const emailConfirmKey = (shootingId: string) =>
  `email_confirmation:${shootingId}`;
const reminderKey = (shootingId: string, dayKey: string) =>
  `reminder_on_the_day:${shootingId}:${dayKey}`;
const depositInvoiceKey = (shootingId: string) => `deposit_inv:${shootingId}`;
// Both times in the key: a later, different reschedule gets its own email.
const rescheduleEmailKey = (shootingId: string, oldTime: Date, newTime: Date) =>
  `reschedule_email:${shootingId}:${oldTime.toISOString()}:${newTime.toISOString()}`;
// const googleCalendarEventKey = (shootingId: string) =>
//   `google_cal_evt:${shootingId}`;

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

/** Pure read — does NOT claim. Fail-open: a duplicate email beats a missing one. */
export const wasEmailSent = async (shootingId: string): Promise<boolean> => {
  try {
    return (await redis.exists(emailConfirmKey(shootingId))) === 1;
  } catch (error) {
    console.error(`Error checking email claim: ${shootingId}`, error);
    return false;
  }
};

/** Written only after Resend accepted. Never throws — the email already went out. */
export const markEmailSent = async (shootingId: string): Promise<void> => {
  try {
    await redis.set(
      emailConfirmKey(shootingId),
      `sent_at:${new Date().toISOString()}`,
      {
        ex: EVENT_TTL,
      },
    );
  } catch (error) {
    console.error(`Error marking email sent: ${shootingId}`, error);
  }
};

/** Short-lived "I'm working on it". Throws if Redis is unreachable — the job must retry, never guess. */
/** Pure read — does NOT claim. Fail-open: a duplicate reminder beats a missed one. */
export const wasReminderSent = async (
  shootingId: string,
  dayKey: string,
): Promise<boolean> => {
  try {
    return (await redis.exists(reminderKey(shootingId, dayKey))) === 1;
  } catch (error) {
    console.error(`Error checking reminder claim: ${shootingId}`, error);
    return false;
  }
};

/** Written only after Resend accepted. Never throws — the email already went out. */
export const markReminderSent = async (
  shootingId: string,
  dayKey: string,
): Promise<void> => {
  try {
    await redis.set(
      reminderKey(shootingId, dayKey),
      `sent_at:${new Date().toISOString()}`,
      { ex: REMINDER_TTL },
    );
  } catch (error) {
    console.error(`Error marking reminder sent: ${shootingId}`, error);
  }
};

/** Pure read — does NOT claim. Fail-open: a duplicate email beats a missing one. */
export const wasRescheduleEmailSent = async (
  shootingId: string,
  oldTime: Date,
  newTime: Date,
): Promise<boolean> => {
  try {
    return (
      (await redis.exists(rescheduleEmailKey(shootingId, oldTime, newTime))) ===
      1
    );
  } catch (error) {
    console.error(
      `Error checking reschedule email claim: ${shootingId}`,
      error,
    );
    return false;
  }
};

/** Written only after Resend accepted. Never throws — the email already went out. */
export const markRescheduleEmailSent = async (
  shootingId: string,
  oldTime: Date,
  newTime: Date,
): Promise<void> => {
  try {
    await redis.set(
      rescheduleEmailKey(shootingId, oldTime, newTime),
      `sent_at:${new Date().toISOString()}`,
      { ex: EVENT_TTL },
    );
  } catch (error) {
    console.error(`Error marking reschedule email sent: ${shootingId}`, error);
  }
};

export const claimDepositInvoice = async (
  shootingId: string,
): Promise<boolean> => {
  const inserted = await redis.set(
    depositInvoiceKey(shootingId),
    `claimed_at:${new Date().toISOString()}`,
    { nx: true, ex: DEPOSIT_INVOICE_CLAIM_TTL },
  );
  return inserted !== null; // null = someone already claimed it
};

/**
 * szamlazz.hu issued a real document — upgrade the claim so no retry can ever
 * re-issue it. No `nx`: we are deliberately overwriting our own claim.
 * Never throws; the document exists whether or not Redis agrees.
 */
export const confirmDepositInvoice = async (
  shootingId: string,
  invoiceNumber: string,
): Promise<void> => {
  try {
    await redis.set(depositInvoiceKey(shootingId), `issued:${invoiceNumber}`, {
      ex: DEPOSIT_INVOICE_ISSUED_TTL,
    });
  } catch (error) {
    console.error(`Error confirming deposit invoice: ${shootingId}`, error);
  }
};

export const releaseDepositInvoiceClaim = async (
  shootingId: string,
): Promise<void> => {
  try {
    await redis.del(depositInvoiceKey(shootingId));
  } catch (error) {
    console.error(`Error releasing deposit invioce: ${shootingId}`, error);
  }
};
