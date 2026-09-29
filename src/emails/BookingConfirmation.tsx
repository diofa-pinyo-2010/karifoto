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
  Link,
} from 'react-email';

export const CLIENT_BOOKING_CONFIRMATION_SUBJECT =
  '🗓️ Időpontfoglalásod beérkezett hozzánk';

type BookingConfirmationEmailProps = {
  baseUrl: string;
  name: string;
  bookedTime: string;
  addToGoogleCalendarLink: string;
  clientPortalLoginLink: string;
};

export default function BookingConfirmationEmail({
  baseUrl,
  name,
  bookedTime,
  addToGoogleCalendarLink,
  clientPortalLoginLink,
}: BookingConfirmationEmailProps) {
  return (
    <Html lang="hu">
      <Tailwind>
        <Head>
          <title>{CLIENT_BOOKING_CONFIRMATION_SUBJECT}</title>
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
              Köszönjük, hogy a Karifotot választottátok! Az előleg megérkezett
              hozzánk, a foglalásotokat pedig rögzítettük.
            </Text>
            <Text className="text-center mt-8">
              📸 A fotózásotok időpontja:
            </Text>
            <Text className="font-bold text-lg text-center">{bookedTime}</Text>
            <Link
              href={addToGoogleCalendarLink}
              className="mb-8 block text-center underline underline-offset-4"
            >
              Hozzáadás Google naptárhoz
            </Link>
            <Text>
              Várunk titeket szeretettel a stúdiónkba, addig is a foglalás
              részleteit az Ügyfélportálunkon keresztül tudjátok megnézni.
            </Text>
            <Section className="text-center mb-0">
              <Button
                href={clientPortalLoginLink}
                className="font-base my-4 inline-block rounded-lg bg-gray-800 px-7 py-4 text-center font-sans leading-6 font-semibold tracking-wide text-white uppercase"
              >
                Ügyfélportál
              </Button>
            </Section>
            <Text className="text-slate-500 text-sm mt-0">
              A végleges fotók készhezvételéig minden részletet itt tudtok majd
              nyomon követni, bejelentkezni pedig mindig ezzel a gombbal fogtok
              tudni, tehát érdemes megtartani ezt az emailt :)
            </Text>
            <Text className="m-0">Üdvözlettel,</Text>
            <Text className="m-0 font-semibold">🎄 📸 A Karifoto csapata</Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}

BookingConfirmationEmail.PreviewProps = {
  baseUrl: 'http://localhost:3000',
  name: 'Anna',
  bookedTime: 'Szeptember 29., kedd · 11:00',
  addToGoogleCalendarLink: 'https://example.com',
  clientPortalLoginLink: 'https://example.com',
} satisfies BookingConfirmationEmailProps;
