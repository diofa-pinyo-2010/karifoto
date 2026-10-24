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

export const COMMENT_MENTION_SUBJECT = '💬 Megemlítettek egy megjegyzésben';

type CommentMentionEmailProps = {
  name: string;
  authorName: string;
  shootingLabel: string;
  commentText: string;
  commentUrl: string;
  baseUrl: string;
};

export default function CommentMentionEmail({
  name,
  authorName,
  shootingLabel,
  commentText,
  commentUrl,
  baseUrl,
}: CommentMentionEmailProps) {
  return (
    <Html lang="hu">
      <Tailwind>
        <Head>
          <title>{COMMENT_MENTION_SUBJECT}</title>
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
              <strong>{authorName}</strong> megemlített egy megjegyzésben ennél
              a fotózásnál: <strong>{shootingLabel}</strong>
            </Text>
            {/* Plain text: the markdown is shown as typed, line breaks kept */}
            <Text className="rounded-lg border-l-4 border-solid border-gray-300 bg-gray-50 px-4 py-3 whitespace-pre-wrap">
              {commentText}
            </Text>
            <Section className="text-center">
              <Button
                href={commentUrl}
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

CommentMentionEmail.PreviewProps = {
  name: 'Kati',
  authorName: 'Maru',
  shootingLabel: 'Kovács Anna · December 14., szombat · 10:00',
  commentText:
    '@Kati a kutya 10 perccel korábban érkezik, kérlek készítsd elő a háttért.\nKöszi!',
  commentUrl: 'http://localhost:3000/admin/photo-shootings/1',
  baseUrl: 'http://localhost:3000',
} satisfies CommentMentionEmailProps;
