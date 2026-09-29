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
} from 'react-email';

export const CLIENT_REMINDER_ON_THE_DAY_SUBJECT =
  '🗓️ Ma találkozunk a stúdiónkban! ☺️';

type ReminderOnTheDayEmailProps = {
  baseUrl: string;
  name: string;
  hourAndMinuteString: string;
  studioAddress: string;
};

export default function ReminderOnTheDayEmail({
  baseUrl,
  name,
  hourAndMinuteString,
  studioAddress,
}: ReminderOnTheDayEmailProps) {
  return (
    <Html lang="hu">
      <Tailwind>
        <Head>
          <title>{CLIENT_REMINDER_ON_THE_DAY_SUBJECT}</title>
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
            <Text>
              Egy gyors emlékeztető, hogy a mai nap lesz a karácsonyi
              fotózásotok a Karifoto-nál 😊
            </Text>
            <Text>
              ⏰ Az időpont: A mai napon <strong>{hourAndMinuteString}</strong>{' '}
              órakor.
            </Text>
            <Text>
              📍 Címünk: <strong>{studioAddress}</strong>
            </Text>
            <Text>Szeretettel várunk benneteket!</Text>
            <Text className="m-0">Üdvözlettel,</Text>
            <Text className="m-0 font-semibold">🎄 📸 A Karifoto csapata</Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}

ReminderOnTheDayEmail.PreviewProps = {
  baseUrl: 'http://localhost:3000',
  name: 'Anna',
  hourAndMinuteString: '11:00',
  studioAddress: '1111 Budapest, Deák tér 1.',
} satisfies ReminderOnTheDayEmailProps;
