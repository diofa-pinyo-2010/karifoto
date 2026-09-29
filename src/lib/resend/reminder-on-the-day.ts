import { STUDIO_ADDRESS } from '@/lib/constants';
import { timeFormatter } from '@/lib/formatters';
import { sendClientEmail } from '@/lib/resend/send-client-email';

type ReminderOnTheDayEmailParams = {
  to: string;
  name: string;
  startTime: Date;
  shootingId: string;
  clientId: string;
};

export function sendReminderOnTheDayEmail({
  to,
  name,
  startTime,
  shootingId,
  clientId,
}: ReminderOnTheDayEmailParams) {
  return sendClientEmail({
    type: 'REMINDER_ON_THE_DAY',
    to,
    clientId,
    photoShootingId: shootingId,
    props: {
      name,
      hourAndMinuteString: timeFormatter.format(startTime),
      studioAddress: STUDIO_ADDRESS,
    },
    tags: [{ name: 'shootingId', value: shootingId }],
  });
}
