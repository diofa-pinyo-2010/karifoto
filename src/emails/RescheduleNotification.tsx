// REMINDER_ON_THE_DAY

import {
  Html,
  Head,
  Body,
  Container,
  Heading,
  Text,
  Tailwind,
  Img,
  Link,
} from 'react-email';

export const CLIENT_RESCHEDULE_NOTIFICATION_SUBJECT =
  '📆 A karácsonyi fotózás időpontod megváltozott!';

type RescheduleNotificationEmailProps = {
  baseUrl: string;
  name: string;
  bookedTime: string;
  oldTime: string;
  addToGoogleCalendarLink: string;
};

export default function RescheduleNotificationEmail({
  baseUrl,
  name,
  bookedTime,
  oldTime,
  addToGoogleCalendarLink,
}: RescheduleNotificationEmailProps) {
  return (
    <Html lang="hu">
      <Tailwind>
        <Head>
          <title>{CLIENT_RESCHEDULE_NOTIFICATION_SUBJECT}</title>
        </Head>
        <Body className="m-0 font-sans sm:bg-[#fafafa] sm:py-8">
          <Container className="max-w-140 rounded-lg bg-white px-6 py-8">
            <Img
              src={`${baseUrl}/images/karifoto-logo-arany.png`}
              alt="Karifotó"
              width="100"
              className="mx-auto mb-8"
            />
            <Heading className="text-xl">Kedves {name}!</Heading>
            <Text>A karácsonyi fotózásotok időpontja megváltozott!</Text>
            <Text className="text-gray-400">
              A régi időpont: <span className="line-through">{oldTime}</span>
            </Text>
            <Text className="mt-8 text-center">
              📸 A fotózásotok időpontja:
            </Text>
            <Text className="text-center text-lg font-bold">{bookedTime}</Text>
            <Link
              href={addToGoogleCalendarLink}
              className="mb-8 block text-center underline underline-offset-4"
            >
              Hozzáadás Google naptárhoz
            </Link>
            <Text>Szeretettel várunk benneteket!</Text>
            <Text className="m-0">Üdvözlettel,</Text>
            <Text className="m-0 font-semibold">🎄 📸 A Karifoto csapata</Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}

RescheduleNotificationEmail.PreviewProps = {
  baseUrl: 'http://localhost:3000',
  name: 'Anna',
  bookedTime: 'Szeptember 29., kedd · 11:00',
  oldTime: 'Szeptember 30., szerda · 14:00',
  addToGoogleCalendarLink: 'https://example.com',
} satisfies RescheduleNotificationEmailProps;
