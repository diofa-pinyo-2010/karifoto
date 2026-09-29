import {
  Html,
  Head,
  Body,
  Container,
  Heading,
  Text,
  Button,
  Tailwind,
  Img,
  Section,
} from 'react-email';

export const CLIENT_DEPOSIT_REQUEST_SUBJECT =
  '🗓️ Az időpontod már majdnem lefoglalva...';

type DepositRequestEmailProps = {
  baseUrl: string;
  name: string;
  bookedTime: string;
  depositAmount: string;
  summaryUrl: string;
};

export default function DepositRequestEmail({
  baseUrl,
  name,
  bookedTime,
  depositAmount,
  summaryUrl,
}: DepositRequestEmailProps) {
  return (
    <Html lang="hu">
      <Tailwind>
        <Head>
          <title>{CLIENT_DEPOSIT_REQUEST_SUBJECT}</title>
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
              Az időpontodat karácsonyi fotózásra előkészítettük, már csak egy
              lépés hiányzik, hogy véglegesítsd.
            </Text>
            <Text>
              📸 A fotózásotok időpontja: <strong>{bookedTime}</strong>
            </Text>
            <Text>
              Az alábbi gombra kattintva befizetheted a fotózás előlegét, ezzel
              véglegesíted a foglalást. Az előleg összege {depositAmount}.
            </Text>
            <Section className="mb-0 text-center">
              <Button
                href={summaryUrl}
                className="font-base my-4 inline-block rounded-lg bg-gray-800 px-7 py-4 text-center font-sans leading-6 font-semibold tracking-wide text-white uppercase"
              >
                Előleg befizetése
              </Button>
            </Section>
            <Text>
              Bármilyen kérdésed merülne fel, keress minket bizalommal, akár
              erre az email-re válaszolva.
            </Text>
            <Text className="m-0">Üdvözlettel,</Text>
            <Text className="m-0 font-semibold">🎄 📸 A Karifoto csapata</Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}

DepositRequestEmail.PreviewProps = {
  baseUrl: 'http://localhost:3000',
  name: 'Anna',
  bookedTime: 'Szeptember 29., kedd · 11:00',
  summaryUrl: 'https://example.com',
  depositAmount: '10 000 Ft',
} satisfies DepositRequestEmailProps;
