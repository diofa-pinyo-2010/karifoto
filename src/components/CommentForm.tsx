'use client';

import { useActionState, useEffect, useId, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';

import { isAllowedUri, Link } from '@tiptap/extension-link';
import { Mention } from '@tiptap/extension-mention';
import { Strike } from '@tiptap/extension-strike';
import { Placeholder } from '@tiptap/extensions';
import { Markdown } from '@tiptap/markdown';
import {
  EditorContent,
  Extension,
  getMarkRange,
  InputRule,
  markInputRule,
  mergeAttributes,
  useEditor,
  useEditorState,
} from '@tiptap/react';
import { StarterKit } from '@tiptap/starter-kit';
import {
  BoldIcon,
  CodeIcon,
  ItalicIcon,
  LinkIcon,
  ListIcon,
  ListOrderedIcon,
  SendIcon,
  StrikethroughIcon,
} from 'lucide-react';

import {
  MentionSuggestionList,
  useMentionSuggestion,
} from '@/components/MentionSuggestion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Spinner } from '@/components/ui/spinner';
import { filterMentionCandidates } from '@/lib/mentions';
import { cn } from '@/lib/utils';

import type { MentionCandidate } from '@/lib/mentions';
import type { CommentFormState } from '@/server/comments';
import type { Editor } from '@tiptap/react';
import type { LucideIcon } from 'lucide-react';

const SubmitShortcut = Extension.create({
  name: 'submitShortcut',
  addKeyboardShortcuts() {
    return {
      'Mod-Enter': () => {
        if (!this.editor.isEmpty) {
          this.editor.view.dom.closest('form')?.requestSubmit();
        }
        return true;
      },
    };
  },
});

// `example.com` would otherwise become a relative link to our own site
function normalizeHref(href: string) {
  const trimmed = href.trim();
  return /^[a-z][a-z\d+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

/** Typing `[text](url)` turns into a link, like `**text**` turns bold. */
const MarkdownLink = Link.extend({
  addInputRules() {
    return [
      new InputRule({
        find: /\[([^[\]]+)\]\(([^()\s]+)\)$/,
        handler: ({ state, range, match }) => {
          const [, text, rawHref] = match;
          const href = normalizeHref(rawHref);
          if (!isAllowedUri(href, this.options.protocols)) return null;

          state.tr
            .replaceWith(
              range.from,
              range.to,
              state.schema.text(text, [this.type.create({ href })]),
            )
            // Otherwise the next typed characters would extend the link
            .removeStoredMark(this.type);
        },
      }),
    ];
  },
});

/** `~text~` as well as the built-in `~~text~~`; both are GFM strikethrough. */
const SingleTildeStrike = Strike.extend({
  addInputRules() {
    return [
      ...(this.parent?.() ?? []),
      markInputRule({
        // The leading `(?:^|\s)` keeps `~~text~` from firing before the second `~`
        find: /(?:^|\s)(~(?!~)([^~]+)~)$/,
        type: this.type,
      }),
    ];
  },
});

const TOOLBAR: {
  label: string;
  icon: LucideIcon;
  name: string;
  toggle: (editor: Editor) => void;
}[] = [
  {
    label: 'Félkövér',
    icon: BoldIcon,
    name: 'bold',
    toggle: (editor) => editor.chain().focus().toggleBold().run(),
  },
  {
    label: 'Dőlt',
    icon: ItalicIcon,
    name: 'italic',
    toggle: (editor) => editor.chain().focus().toggleItalic().run(),
  },
  {
    label: 'Áthúzott',
    icon: StrikethroughIcon,
    name: 'strike',
    toggle: (editor) => editor.chain().focus().toggleStrike().run(),
  },
  {
    label: 'Kód',
    icon: CodeIcon,
    name: 'code',
    toggle: (editor) => editor.chain().focus().toggleCode().run(),
  },
  {
    label: 'Felsorolás',
    icon: ListIcon,
    name: 'bulletList',
    toggle: (editor) => editor.chain().focus().toggleBulletList().run(),
  },
  {
    label: 'Számozott lista',
    icon: ListOrderedIcon,
    name: 'orderedList',
    toggle: (editor) => editor.chain().focus().toggleOrderedList().run(),
  },
];

function LinkButton({
  editor,
  active,
}: {
  editor: Editor | null;
  active: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [href, setHref] = useState('');
  const [invalid, setInvalid] = useState(false);
  // What the popup edits, captured on open: the whole link, or else the selection
  const [target, setTarget] = useState({ from: 0, to: 0, text: '' });
  const textId = useId();
  const hrefId = useId();
  const hrefRef = useRef<HTMLInputElement>(null);

  function captureTarget(current: Editor) {
    const { selection, doc, schema } = current.state;
    const range = (active &&
      getMarkRange(doc.resolve(selection.from), schema.marks.link)) || {
      from: selection.from,
      to: selection.to,
    };
    const rangeText = doc.textBetween(range.from, range.to);
    setTarget({ ...range, text: rangeText });
    setText(rangeText);
    setHref(current.getAttributes('link').href ?? '');
    setInvalid(false);
  }

  function removeLink() {
    editor
      ?.chain()
      .focus()
      .setTextSelection({ from: target.from, to: target.to })
      .unsetLink()
      .setTextSelection(target.to)
      .run();
    setOpen(false);
  }

  function apply() {
    if (editor == null) return;
    if (href.trim() === '') {
      removeLink();
      return;
    }

    const url = normalizeHref(href);
    if (!isAllowedUri(url)) {
      setInvalid(true);
      return;
    }

    const range = { from: target.from, to: target.to };
    const chain = editor.chain().focus();
    let end = range.to;
    // Unchanged text is only re-marked, so bold/italic inside the link survive
    if (text === target.text && range.from !== range.to) {
      chain.setTextSelection(range).setLink({ href: url });
    } else {
      const linkText = text.trim() === '' ? url : text;
      chain.insertContentAt(range, {
        type: 'text',
        text: linkText,
        marks: [{ type: 'link', attrs: { href: url } }],
      });
      end = range.from + linkText.length;
    }
    // Otherwise the next typed characters would extend the link
    chain.setTextSelection(end).unsetMark('link').run();
    setOpen(false);
  }

  function submitOnEnter(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      event.preventDefault();
      apply();
    }
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        if (next && editor != null) captureTarget(editor);
        setOpen(next);
      }}
    >
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Link"
            aria-pressed={active}
            disabled={editor == null}
            className={cn(active && 'bg-muted')}
          />
        }
      >
        <LinkIcon />
      </PopoverTrigger>
      {/* The editor takes focus back itself; returning it to the button would steal it */}
      <PopoverContent align="start" initialFocus={hrefRef} finalFocus={false}>
        {/* Portalled outside the comment form, so Enter here cannot submit it */}
        <Label htmlFor={textId} className="font-normal text-muted-foreground">
          Szöveg
        </Label>
        <Input
          id={textId}
          value={text}
          placeholder="Ha üres, a link címe jelenik meg"
          onChange={(event) => setText(event.target.value)}
          onKeyDown={submitOnEnter}
        />
        <Label htmlFor={hrefId} className="font-normal text-muted-foreground">
          Link címe
        </Label>
        <Input
          ref={hrefRef}
          id={hrefId}
          type="url"
          inputMode="url"
          value={href}
          placeholder="https://…"
          aria-invalid={invalid ? true : undefined}
          onChange={(event) => {
            setHref(event.target.value);
            setInvalid(false);
          }}
          onKeyDown={submitOnEnter}
        />
        {invalid && (
          <p role="alert" className="text-xs text-destructive">
            Ez nem érvényes link.
          </p>
        )}
        <div className="flex justify-end gap-2">
          {active && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={removeLink}
            >
              Eltávolítás
            </Button>
          )}
          <Button type="button" size="sm" onClick={apply}>
            Mentés
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function CommentForm({
  action,
  mentionables,
}: {
  action: (
    state: CommentFormState,
    formData: FormData,
  ) => Promise<CommentFormState>;
  /** Staff who can be `@`-mentioned: everyone except the author. */
  mentionables: MentionCandidate[];
}) {
  const id = useId();
  const labelId = `${id}-label`;
  const errorId = `${id}-error`;
  const mention = useMentionSuggestion();

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      // Only what has a markdown form and makes sense in a short team note
      StarterKit.configure({
        heading: false,
        horizontalRule: false,
        underline: false,
        link: false,
        strike: false,
      }),
      SingleTildeStrike,
      MarkdownLink.configure({ openOnClick: false }),
      // Saved as `[@ id="…" label="nickname"]`; CommentBody renders it back
      Mention.configure({
        HTMLAttributes: { class: 'mention' },
        renderHTML: ({ options, node }) => [
          'span',
          mergeAttributes(options.HTMLAttributes, {
            title: mentionables.find((member) => member.id === node.attrs.id)
              ?.name,
          }),
          `@${node.attrs.label ?? node.attrs.id}`,
        ],
        suggestion: {
          // Someone already mentioned in this comment is not offered again
          items: ({ query, editor: current }) => {
            const mentioned = new Set<string>();
            current.state.doc.descendants((node) => {
              if (node.type.name === 'mention') mentioned.add(node.attrs.id);
            });
            return filterMentionCandidates(
              mentionables.filter((member) => !mentioned.has(member.id)),
              query,
            );
          },
          render: mention.render,
        },
      }),
      Markdown,
      Placeholder.configure({
        placeholder: 'Pl. a kisállat érkezése, különleges kérés, átadás…',
      }),
      SubmitShortcut,
    ],
    editorProps: {
      attributes: {
        role: 'textbox',
        'aria-multiline': 'true',
        'aria-labelledby': labelId,
        class: 'comment-markdown min-h-24 px-2.5 py-2 outline-none',
      },
    },
  });

  // The editor is not a form control: the markdown is added here, and since
  // React's form reset does not touch it, a failed save keeps the text as is
  const [state, formAction, isPending] = useActionState(
    async (prevState: CommentFormState, formData: FormData) => {
      formData.set('body', editor?.getMarkdown() ?? '');
      const result = await action(prevState, formData);
      if (result != null && 'ok' in result) editor?.commands.clearContent();
      return result;
    },
    undefined,
  );
  const failed = state != null && 'error' in state ? state : undefined;

  const editorState = useEditorState({
    editor,
    selector: ({ editor: current }) => ({
      isEmpty: current?.isEmpty ?? true,
      active: TOOLBAR.map(({ name }) => current?.isActive(name) ?? false),
      isLink: current?.isActive('link') ?? false,
    }),
  });

  useEffect(() => {
    editor?.view.dom.setAttribute('aria-invalid', failed ? 'true' : 'false');
    if (failed) editor?.view.dom.setAttribute('aria-describedby', errorId);
    else editor?.view.dom.removeAttribute('aria-describedby');
  }, [editor, failed, errorId]);

  return (
    <form
      action={formAction}
      className="flex flex-col gap-2 border-b px-4 pb-4"
    >
      <Label
        id={labelId}
        onClick={() => editor?.commands.focus()}
        className="font-normal text-muted-foreground"
      >
        Új megjegyzés a csapatnak
      </Label>
      <div
        data-invalid={failed ? true : undefined}
        className="rounded-lg border border-input bg-transparent text-base transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 data-invalid:border-destructive data-invalid:ring-3 data-invalid:ring-destructive/20 lg:text-sm dark:bg-input/30 dark:data-invalid:border-destructive/50 dark:data-invalid:ring-destructive/40"
      >
        <div
          role="toolbar"
          aria-label="Formázás"
          className="flex gap-0.5 border-b p-1"
        >
          {TOOLBAR.map(({ label, icon: Icon, toggle }, index) => (
            <Button
              key={label}
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={label}
              aria-pressed={editorState?.active[index] ?? false}
              disabled={editor == null}
              onClick={() => editor && toggle(editor)}
              className={cn(editorState?.active[index] && 'bg-muted')}
            >
              <Icon />
            </Button>
          ))}
          <LinkButton editor={editor} active={editorState?.isLink ?? false} />
        </div>
        {/* Same height before hydration so the card does not jump */}
        {editor == null ? (
          <div className="min-h-24" />
        ) : (
          <EditorContent editor={editor} />
        )}
        <MentionSuggestionList {...mention.list} />
      </div>
      {failed && (
        <p id={errorId} role="alert" className="text-sm text-destructive">
          {failed.error}
        </p>
      )}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <span className="hidden text-xs text-muted-foreground sm:inline">
          Ctrl/⌘ + Enter a küldéshez
        </span>
        <Button
          type="submit"
          size="lg"
          disabled={isPending || (editorState?.isEmpty ?? true)}
          className="h-11 w-full sm:h-9 sm:w-auto"
        >
          {isPending ? <Spinner /> : <SendIcon />}
          Hozzászólás
        </Button>
      </div>
    </form>
  );
}
