import type { ReactNode } from 'react';
import Markdown from 'react-markdown';

import remarkGfm from 'remark-gfm';

import { splitMentions } from '@/lib/mentions';
import { isBareUrl, shortenUrl } from '@/lib/shorten-url';

import type { MentionCandidate } from '@/lib/mentions';

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

interface MdNode {
  type: string;
  value?: string;
  children?: MdNode[];
  data?: Record<string, unknown>;
}

function replaceMentions(
  node: MdNode,
  staffById: Map<string, MentionCandidate>,
) {
  node.children = node.children?.flatMap((child) => {
    if (child.type !== 'text' || child.value == null) {
      replaceMentions(child, staffById);
      return [child];
    }
    return splitMentions(child.value).map((segment) => {
      if (typeof segment === 'string') return { type: 'text', value: segment };

      // The current nickname wins; the stored label covers a deleted staff member
      const member = staffById.get(segment.id);
      const label = member?.nickname ?? segment.label ?? 'Törölt munkatárs';
      return {
        type: 'mention',
        data: {
          hName: 'span',
          hProperties: { className: 'mention', title: member?.name },
          hChildren: [{ type: 'text', value: `@${label}` }],
        },
      };
    });
  });
}

/**
 * TipTap stores a mention as `[@ id="…" label="…"]`, which plain markdown reads
 * as text; this turns it into a `span`. Code is not a text node, so a
 * shortcode inside backticks stays literal.
 */
function remarkMentions(staffById: Map<string, MentionCandidate>) {
  return (tree: MdNode) => replaceMentions(tree, staffById);
}

/**
 * Renders a stored comment as markdown. Raw HTML is ignored by react-markdown
 * and unsafe link protocols are stripped, so the body never needs sanitizing.
 */
export function CommentBody({
  body,
  staffById,
}: {
  body: string;
  staffById: Map<string, MentionCandidate>;
}) {
  return (
    <div className="comment-markdown">
      <Markdown
        remarkPlugins={[remarkGfm, [remarkMentions, staffById]]}
        disallowedElements={DISALLOWED_ELEMENTS}
        unwrapDisallowed
        components={{ a: ExternalLink }}
      >
        {body}
      </Markdown>
    </div>
  );
}
