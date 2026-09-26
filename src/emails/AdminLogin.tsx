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
  CodeInline,
} from 'react-email';

type AdminLoginEmailProps = {
  name: string;
  verifyUrl: string;
  baseUrl: string;
};

export default function AdminLoginEmail({
  name,
  verifyUrl,
  baseUrl,
}: AdminLoginEmailProps) {
  return (
    <Html lang="hu">
      <Tailwind>
        <Head />
        <Body className="m-0 font-sans sm:bg-[#f5f5f5] sm:py-8">
          <Container className="max-w-140 rounded-lg bg-white px-6 py-8">
            <Img
              src={`${baseUrl}/images/karifoto-logo-terrakotta.png`}
              alt="Karifotó"
              width="100"
              className="mx-auto mb-8"
            />
            <Heading className="text-xl">Kedves {name}!</Heading>
            <Text>
              Kattints az alábbi linkre a bejelentkezéshez. 15 percig érvényes a
              link, a bejelentkezésed pedig 30 napig:
            </Text>
            <Section className="text-center">
              <Button
                href={verifyUrl}
                className="font-base my-4 inline-block rounded-lg bg-gray-800 px-7 py-4 text-center font-sans leading-6 font-semibold tracking-wide text-white uppercase"
              >
                Bejelentkezés
              </Button>
            </Section>
            <Text>
              Bármikor kérhetsz új linket a{' '}
              <CodeInline className="rounded-sm bg-gray-100 px-1 py-0.5 font-mono">
                /admin/login
              </CodeInline>{' '}
              oldalon.
            </Text>
            <Text className="m-0 font-semibold">📸 Karifoto Team</Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}

AdminLoginEmail.PreviewProps = {
  name: 'Maru',
  verifyUrl: 'http://localhost:3000',
  baseUrl: 'http://localhost:3000',
} satisfies AdminLoginEmailProps;
