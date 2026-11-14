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

export const CLIENT_GIFT_REDEEMED_SUBJECT = '🎁 Az ajándékod beváltották';

type GiftRedeemedEmailProps = {
  baseUrl: string;
  name: string;
  recipientName: string;
  bookedTime: string;
};

export default function GiftRedeemedEmail({
  baseUrl,
  name,
  recipientName,
  bookedTime,
}: GiftRedeemedEmailProps) {
  return (
    <Html lang="hu">
      <Tailwind>
        <Head>
          <title>{CLIENT_GIFT_REDEEMED_SUBJECT}</title>
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
              🎁 {recipientName} beváltotta a(z){' '}
              <span className="font-bold">{bookedTime}</span> időpontra szóló
              fotózás-ajándékodat. Innentől minden tudnivalót ő kap meg tőlünk.
            </Text>
            <Text>Köszönjük, hogy minket választottál!</Text>
            <Text className="m-0">Üdvözlettel,</Text>
            <Text className="m-0 font-semibold">🎄 📸 A Karifoto csapata</Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}

GiftRedeemedEmail.PreviewProps = {
  baseUrl: 'http://localhost:3000',
  name: 'Péter',
  recipientName: 'Anna',
  bookedTime: 'Szeptember 29., kedd · 11:00',
} satisfies GiftRedeemedEmailProps;
