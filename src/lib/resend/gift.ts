import { sendClientEmail } from '@/lib/resend/send-client-email';

type SendGiftReceivedEmailParams = {
  to: string;
  name: string;
  buyerName: string;
  bookedTimeString: string;
  addToGoogleCalendarLink: string;
  clientPortalLoginLink: string;
  shootingId: string;
  clientId: string;
};

export function sendGiftReceivedEmail({
  to,
  name,
  buyerName,
  bookedTimeString,
  addToGoogleCalendarLink,
  clientPortalLoginLink,
  shootingId,
  clientId,
}: SendGiftReceivedEmailParams) {
  return sendClientEmail({
    type: 'GIFT_RECEIVED',
    to,
    clientId,
    photoShootingId: shootingId,
    props: {
      name,
      buyerName,
      bookedTime: bookedTimeString,
      addToGoogleCalendarLink,
      clientPortalLoginLink,
    },
    tags: [{ name: 'shootingId', value: shootingId }],
  });
}

type SendGiftRedeemedEmailParams = {
  to: string;
  name: string;
  recipientName: string;
  bookedTimeString: string;
  shootingId: string;
  clientId: string;
};

export function sendGiftRedeemedEmail({
  to,
  name,
  recipientName,
  bookedTimeString,
  shootingId,
  clientId,
}: SendGiftRedeemedEmailParams) {
  return sendClientEmail({
    type: 'GIFT_REDEEMED',
    to,
    clientId,
    photoShootingId: shootingId,
    props: { name, recipientName, bookedTime: bookedTimeString },
    tags: [{ name: 'shootingId', value: shootingId }],
  });
}
