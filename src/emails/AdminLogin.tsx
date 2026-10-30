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

import { formatLoginCode } from '@/lib/token';

export const ADMIN_LOGIN_SUBJECT = '🔓 Belépési kód';

type AdminLoginEmailProps = {
  name: string;
  code: string;
  baseUrl: string;
};

export default function AdminLoginEmail({
  name,
  code,
  baseUrl,
}: AdminLoginEmailProps) {
  return (
    <Html lang="hu">
      <Tailwind>
        <Head>
          <title>{ADMIN_LOGIN_SUBJECT}</title>
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
            <Text>A belépési kódod:</Text>
            <Text className="my-4 rounded-lg bg-gray-100 py-4 text-center font-mono text-3xl font-bold tracking-[0.3em] text-gray-900">
              {formatLoginCode(code)}
            </Text>
            <Text>
              Írd be a megnyitott belépési oldalon, bármelyik böngészőben. 10
              percig érvényes, egyszer használható.
            </Text>
            <Text className="text-sm text-gray-500">
              Ha nem te kérted, nyugodtan hagyd figyelmen kívül.
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
  code: '48219037',
  baseUrl: 'http://localhost:3000',
} satisfies AdminLoginEmailProps;
