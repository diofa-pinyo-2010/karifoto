import type { ReactNode } from 'react';
import Markdown from 'react-markdown';

import remarkGfm from 'remark-gfm';

import { isBareUrl, shortenUrl } from '@/lib/shorten-url';

// The editor cannot produce these; a hand-typed `# ` or `![]()` stays plain text
const DISALLOWED_ELEMENTS = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'hr', 'img'];

function ExternalLink({
  href,
  children,
}: {
  href?: string;
  children?: ReactNode;
}) {
  // Only a link whose text is its own URL is shortened; chosen words stay as written
  const bare =
    href != null && typeof children === 'string' && isBareUrl(children, href);

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      title={bare ? href : undefined}
    >
      {bare ? shortenUrl(href) : children}
    </a>
  );
}

/**
 * Renders a stored comment as markdown. Raw HTML is ignored by react-markdown
 * and unsafe link protocols are stripped, so the body never needs sanitizing.
 */
export function CommentBody({ body }: { body: string }) {
  return (
    <div className="comment-markdown">
      <Markdown
        remarkPlugins={[remarkGfm]}
        disallowedElements={DISALLOWED_ELEMENTS}
        unwrapDisallowed
        components={{ a: ExternalLink }}
      >
        {body}
      </Markdown>
    </div>
  );
}
