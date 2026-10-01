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

export const CLIENT_IMAGE_SELECTION_SUBJECT =
  '🖼️ Itt vannak a nyers képek a fotózásról!';

type ImageSelectionEmailProps = {
  baseUrl: string;
  name: string;
  clientPortalLoginLink: string;
};

export default function ImageSelectionEmail({
  baseUrl,
  name,
  clientPortalLoginLink,
}: ImageSelectionEmailProps) {
  return (
    <Html lang="hu">
      <Tailwind>
        <Head>
          <title>{CLIENT_IMAGE_SELECTION_SUBJECT}</title>
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
              Feltöltöttük a fotózásotokon készült nyers képeket egy online
              galériába. Lépj be az ügyfélportálba, és válaszd ki azokat a
              képeket, amiket szerkeszteni fogunk.
            </Text>
            <Section className="mb-0 text-center">
              <Button
                href={clientPortalLoginLink}
                className="font-base my-4 inline-block rounded-lg bg-gray-800 px-7 py-4 text-center font-sans leading-6 font-semibold tracking-wide text-white uppercase"
              >
                Képek kiválasztása
              </Button>
            </Section>
            <Text className="m-0">Üdvözlettel,</Text>
            <Text className="m-0 font-semibold">🎄 📸 A Karifoto csapata</Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}

ImageSelectionEmail.PreviewProps = {
  baseUrl: 'http://localhost:3000',
  name: 'Anna',
  clientPortalLoginLink: 'https://example.com',
} satisfies ImageSelectionEmailProps;
