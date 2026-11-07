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

export const EDITOR_SELECTION_COMPLETED_SUBJECT =
  '🖼️ Elkészült egy képválogatás';

type EditorSelectionCompletedEmailProps = {
  name: string;
  shootingLabel: string;
  editedImages: number;
  retouchedImages: number;
  isExpressPostProduction: boolean;
  /** Already formatted in Budapest time by the sender. */
  deadline: string;
  shootingUrl: string;
  baseUrl: string;
};

export default function EditorSelectionCompletedEmail({
  name,
  shootingLabel,
  editedImages,
  retouchedImages,
  isExpressPostProduction,
  deadline,
  shootingUrl,
  baseUrl,
}: EditorSelectionCompletedEmailProps) {
  return (
    <Html lang="hu">
      <Tailwind>
        <Head>
          <title>{EDITOR_SELECTION_COMPLETED_SUBJECT}</title>
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
              Az ügyfél beküldte a képválogatását ennél a fotózásnál:{' '}
              <strong>{shootingLabel}</strong>
            </Text>
            <Section className="rounded-lg bg-gray-50 px-4 text-sm">
              <Text>
                Szerkesztésre: <strong>{editedImages} db</strong>
                <br />
                Extra retusra: <strong>{retouchedImages} db</strong>
                <br />
                Expressz utómunka:{' '}
                <strong>{isExpressPostProduction ? 'igen ⚡' : 'nem'}</strong>
                <br />
                Határidő: <strong>{deadline}</strong>
              </Text>
            </Section>
            <Section className="text-center">
              <Button
                href={shootingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-base my-4 inline-block rounded-lg bg-gray-800 px-7 py-4 text-center font-sans leading-6 font-semibold tracking-wide text-white uppercase"
              >
                Megnyitás
              </Button>
            </Section>
            <Text className="m-0 font-semibold">📸 Karifoto Team</Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}

EditorSelectionCompletedEmail.PreviewProps = {
  name: 'Kati',
  shootingLabel: 'Kovács Anna · December 14., szombat · 10:00 · FAMILY',
  editedImages: 15,
  retouchedImages: 2,
  isExpressPostProduction: true,
  deadline: 'December 17.',
  shootingUrl: 'http://localhost:3000/admin/photo-shootings/1',
  baseUrl: 'http://localhost:3000',
} satisfies EditorSelectionCompletedEmailProps;
