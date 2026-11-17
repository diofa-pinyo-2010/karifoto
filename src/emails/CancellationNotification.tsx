// CANCELLATION_NOTIFICATION

import {
  Html,
  Head,
  Body,
  Button,
  Container,
  Heading,
  Section,
  Text,
  Tailwind,
  Img,
} from 'react-email';

export const CLIENT_CANCELLATION_NOTIFICATION_SUBJECT =
  'A karácsonyi fotózásotokat töröltük.';

type CancellationNotificationEmailProps = {
  baseUrl: string;
  name: string;
  bookedTime: string;
  refunded: boolean;
  clientPortalLoginLink: string;
};

export default function CancellationNotificationEmail({
  baseUrl,
  name,
  bookedTime,
  refunded,
  clientPortalLoginLink,
}: CancellationNotificationEmailProps) {
  return (
    <Html lang="hu">
      <Tailwind>
        <Head>
          <title>{CLIENT_CANCELLATION_NOTIFICATION_SUBJECT}</title>
        </Head>
        <Body className="m-0 font-sans sm:bg-[#fafafa] sm:py-8">
          <Container className="max-w-140 rounded-lg bg-white px-6 py-8">
            <Img
              src={`${baseUrl}/images/karifoto-logo-arany.png`}
              alt="Karifoto"
              width="100"
              className="mx-auto mb-8"
            />
            <Heading className="text-xl">Kedves {name}!</Heading>
            <Text>
              A fotózásotokat (<span className="font-bold">{bookedTime}</span>)
              töröltük.
            </Text>
            {refunded && (
              <>
                <Text>
                  A már befizetett összeg visszatérítését elindítottuk, pár
                  napon belül meg kell érkeznie a számlátokra.
                </Text>
                <Text>A sztornószámlát megtaláljátok az Ügyfélportálon:</Text>
                <Section className="mb-4 text-center">
                  <Button
                    href={clientPortalLoginLink}
                    className="font-base my-4 inline-block rounded-lg bg-gray-800 px-7 py-4 text-center font-sans leading-6 font-semibold tracking-wide text-white uppercase"
                  >
                    Ügyfélportál
                  </Button>
                </Section>
              </>
            )}
            <Text className="m-0">Üdv.</Text>
            <Text className="m-0 font-semibold">🎄 📸 A Karifoto csapata</Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}

CancellationNotificationEmail.PreviewProps = {
  baseUrl: 'http://localhost:3000',
  name: 'Anna',
  bookedTime: 'December 12., szombat · 11:00',
  refunded: true,
  clientPortalLoginLink: 'https://example.com',
} satisfies CancellationNotificationEmailProps;
