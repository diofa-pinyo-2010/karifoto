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

import { GOOGLE_REVIEW_URL } from '@/lib/constants';

export const CLIENT_COMPLETED_PROJECT_SUBJECT =
  '🎉 Itt vannak az elkészült karácsonyi fotóitok! 🎄📸';

type CompletedProjectEmailProps = {
  baseUrl: string;
  name: string;
  clientPortalLoginLink: string;
};

export default function CompletedProjectEmail({
  name,
  baseUrl,
  clientPortalLoginLink,
}: CompletedProjectEmailProps) {
  return (
    <Html lang="hu">
      <Tailwind>
        <Head>
          <title>{CLIENT_COMPLETED_PROJECT_SUBJECT}</title>
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
            <Text>Köszönjük a türelmeteket!</Text>
            <Text>
              Elkészültünk a kiválogatott képek utómunkájával. Az alábbi linken
              tudjátok elérni és letölteni a szerkesztett képeket.
            </Text>
            <Section className="mb-0 text-center">
              <Button
                href={clientPortalLoginLink}
                className="font-base my-4 inline-block rounded-lg bg-gray-800 px-7 py-4 text-center font-sans leading-6 font-semibold tracking-wide text-white uppercase"
              >
                Képek megtekintése
              </Button>
            </Section>
            <Text>
              Ha jól éreztétek magatokat, kérjük értékeljetek minket ezen a
              linken:
              <Link
                href={GOOGLE_REVIEW_URL}
                className="block underline underline-offset-4"
              >
                {GOOGLE_REVIEW_URL}
              </Link>
              <span className="text-xs text-gray-500">
                (Ha szeretnétek, bátran töltsetek fel az elkészült képekből is
                ☺️)
              </span>
            </Text>
            <Text className="m-0">Kellemes Ünnepeket kívánunk! ✨</Text>
            <Text className="m-0 font-semibold">🎄 📸 A Karifoto csapata</Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}

CompletedProjectEmail.PreviewProps = {
  baseUrl: 'https://localhost:3000',
  name: 'Anna',
  clientPortalLoginLink: 'https://www.example.com',
} satisfies CompletedProjectEmailProps;
