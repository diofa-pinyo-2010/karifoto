import type { ReactNode } from 'react';
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
  /** The comment already rendered from markdown (see `sendCommentMentionEmail`). */
  comment: ReactNode;
  commentUrl: string;
  baseUrl: string;
};

export default function CommentMentionEmail({
  name,
  authorName,
  shootingLabel,
  comment,
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
            {/* Not <Text>: the rendered markdown brings its own <p> and lists */}
            <Section className="rounded-lg border-l-4 border-solid border-gray-300 bg-gray-50 px-4 text-sm">
              {comment}
            </Section>
            <Section className="text-center">
              <Button
                href={commentUrl}
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

CommentMentionEmail.PreviewProps = {
  name: 'Kati',
  authorName: 'Maru',
  shootingLabel: 'Kovács Anna · December 14., szombat · 10:00 · FAMILY',
  comment: (
    <p>
      @Kati a kutya 10 perccel korábban érkezik, kérlek készítsd elő a{' '}
      <strong>hátteret</strong>. Képek:{' '}
      <a
        href="https://www.picdrop.com/"
        target="_blank"
        rel="noopener noreferrer"
      >
        picdrop.com
      </a>
    </p>
  ),
  commentUrl: 'http://localhost:3000/admin/photo-shootings/1',
  baseUrl: 'http://localhost:3000',
} satisfies CommentMentionEmailProps;
