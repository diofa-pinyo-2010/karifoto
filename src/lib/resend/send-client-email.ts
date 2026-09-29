import { createElement } from 'react';
import type { ComponentProps, FunctionComponent, ReactNode } from 'react';

import BookingConfirmationEmail, {
  CLIENT_BOOKING_CONFIRMATION_SUBJECT,
} from '@/emails/BookingConfirmation';
import DepositRequestEmail, {
  CLIENT_DEPOSIT_REQUEST_SUBJECT,
} from '@/emails/DepositRequest';
import ReminderOnTheDayEmail, {
  CLIENT_REMINDER_ON_THE_DAY_SUBJECT,
} from '@/emails/ReminderOnTheDay';
import RescheduleNotificationEmail, {
  CLIENT_RESCHEDULE_NOTIFICATION_SUBJECT,
} from '@/emails/RescheduleNotification';
import { BASE_URL_PROD } from '@/lib/constants';
import { prisma } from '@/lib/prisma';
import { sendReactEmail } from '@/lib/resend/send-react-email';

import type { EmailType, Prisma } from '@/generated/prisma/client';

// One entry per `EmailType` — adding an enum value without a template here is
// a type error.
const CLIENT_EMAILS = {
  CLIENT_BOOKING_CONFIRMATION: {
    component: BookingConfirmationEmail,
    subject: CLIENT_BOOKING_CONFIRMATION_SUBJECT,
  },
  DEPOSIT_REQUEST: {
    component: DepositRequestEmail,
    subject: CLIENT_DEPOSIT_REQUEST_SUBJECT,
  },
  REMINDER_ON_THE_DAY: {
    component: ReminderOnTheDayEmail,
    subject: CLIENT_REMINDER_ON_THE_DAY_SUBJECT,
  },
  RESCHEDULE_NOTIFICATION: {
    component: RescheduleNotificationEmail,
    subject: CLIENT_RESCHEDULE_NOTIFICATION_SUBJECT,
  },
} satisfies Record<
  EmailType,
  { component: (props: never) => ReactNode; subject: string }
>;

// `baseUrl` is filled in here, so callers don't pass it and it isn't recorded.
type ClientEmailProps<T extends EmailType> = Omit<
  ComponentProps<(typeof CLIENT_EMAILS)[T]['component']>,
  'baseUrl'
>;

const REDACTED = '[redacted]';

// Email props are persisted verbatim into SentEmail.variables, which is
// readable from /admin. Some of them carry credentials — the client portal
// login link embeds a reusable, year-long token — so strip those before the
// row is written. Done generically rather than per-prop so a future email
// carrying a token is covered without anyone having to remember.
function redactTokens(props: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(props).map(([key, value]) => {
      if (typeof value !== 'string' || !URL.canParse(value)) {
        return [key, value];
      }

      const url = new URL(value);
      if (!url.searchParams.has('token')) {
        return [key, value];
      }

      url.searchParams.set('token', REDACTED);
      return [key, url.toString()];
    }),
  );
}

type SendClientEmailParams<T extends EmailType> = {
  type: T;
  to: string;
  props: ClientEmailProps<T>;
  tags?: { name: string; value: string }[];
  clientId?: string;
  photoShootingId?: string;
};

// Sends a client email and records it in `SentEmail`. Recording failures are
// logged, not thrown — the email is already out, and throwing would make the
// QStash jobs retry and send it twice.
export async function sendClientEmail<T extends EmailType>({
  type,
  to,
  props,
  tags,
  clientId,
  photoShootingId,
}: SendClientEmailParams<T>) {
  const { component, subject } = CLIENT_EMAILS[type];

  // TS can't narrow the component union through the generic `T`; the
  // `props` type above already ties `type` and `props` together.
  const react = createElement(
    component as unknown as FunctionComponent<
      ClientEmailProps<T> & { baseUrl: string }
    >,
    { ...props, baseUrl: BASE_URL_PROD },
  );

  const result = await sendReactEmail({ type, to, subject, react, tags });

  if (result.data != null) {
    try {
      await prisma.sentEmail.create({
        data: {
          resendId: result.data.id,
          type,
          to,
          subject,
          // Every email prop is a string, so this is plain JSON. The sent
          // email keeps the real links — only this audit row is scrubbed.
          variables: redactTokens(props) as Prisma.InputJsonObject,
          clientId,
          photoShootingId,
        },
      });
    } catch (error) {
      console.error('[sendClientEmail] failed to record sent email', {
        resendId: result.data.id,
        type,
        error,
      });
    }
  }

  return result;
}
