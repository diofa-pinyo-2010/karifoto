'use client';

import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';

import { Item, ItemContent, ItemTitle } from '@/components/ui/item';
import { Popover, PopoverContent } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

import type { MentionCandidate } from '@/lib/mentions';
import type {
  SuggestionKeyDownProps,
  SuggestionOptions,
  SuggestionProps,
} from '@tiptap/suggestion';

type Suggestion = SuggestionProps<MentionCandidate>;

function choose(suggestion: Suggestion, index: number) {
  const item = suggestion.items[index];
  if (item != null) suggestion.command({ id: item.id, label: item.nickname });
}

/**
 * Bridges TipTap's suggestion callbacks to React state: `render` goes into the
 * Mention extension's `suggestion` option, `list` into `MentionSuggestionList`.
 */
export function useMentionSuggestion() {
  const [state, setState] = useState<{
    suggestion: Suggestion;
    index: number;
  } | null>(null);
  // onKeyDown is called by the editor, outside React, so it reads the latest state here
  const stateRef = useRef(state);
  useLayoutEffect(() => {
    stateRef.current = state;
  }, [state]);

  const render = useCallback<
    NonNullable<SuggestionOptions<MentionCandidate>['render']>
  >(
    () => ({
      onStart: (suggestion) => setState({ suggestion, index: 0 }),
      onUpdate: (suggestion) => setState({ suggestion, index: 0 }),
      onExit: () => setState(null),
      onKeyDown: ({ event }: SuggestionKeyDownProps) => {
        const current = stateRef.current;
        const count = current?.suggestion.items.length ?? 0;
        if (current == null || count === 0) return false;

        switch (event.key) {
          case 'ArrowDown':
            setState({ ...current, index: (current.index + 1) % count });
            return true;
          case 'ArrowUp':
            setState({
              ...current,
              index: (current.index - 1 + count) % count,
            });
            return true;
          case 'Enter':
          case 'Tab':
            // Ctrl/⌘ + Enter still submits the comment
            if (event.metaKey || event.ctrlKey) return false;
            choose(current.suggestion, current.index);
            return true;
          default:
            return false;
        }
      },
    }),
    [],
  );

  return {
    render,
    list: {
      suggestion: state?.suggestion ?? null,
      index: state?.index ?? 0,
      setIndex: (index: number) =>
        setState((current) => current && { ...current, index }),
      close: () => setState(null),
    },
  };
}

export function MentionSuggestionList({
  suggestion,
  index,
  setIndex,
  close,
}: ReturnType<typeof useMentionSuggestion>['list']) {
  const clientRect = suggestion?.clientRect;
  const anchor = useMemo(
    () => ({
      getBoundingClientRect: () => clientRect?.() ?? new DOMRect(),
    }),
    [clientRect],
  );

  const items = suggestion?.items ?? [];

  return (
    <Popover
      open={items.length > 0}
      onOpenChange={(open) => {
        if (!open) close();
      }}
    >
      <PopoverContent
        anchor={anchor}
        align="start"
        initialFocus={false}
        finalFocus={false}
        // eslint-disable-next-line jsx-a11y/prefer-tag-over-role -- a <select> cannot be driven from the editor's caret
        role="listbox"
        aria-label="Munkatársak"
        className="w-60 gap-0 p-1"
      >
        {items.map((item, itemIndex) => (
          <Item
            key={item.id}
            size="xs"
            // eslint-disable-next-line jsx-a11y/prefer-tag-over-role -- <option> is only valid inside a <select>
            role="option"
            aria-selected={itemIndex === index}
            // Keeps the editor focused, so the mention lands at the caret
            onMouseDown={(event) => event.preventDefault()}
            onMouseEnter={() => setIndex(itemIndex)}
            onClick={() => suggestion && choose(suggestion, itemIndex)}
            className={cn('cursor-pointer', itemIndex === index && 'bg-muted')}
          >
            <ItemContent>
              <ItemTitle>{item.name}</ItemTitle>
            </ItemContent>
          </Item>
        ))}
      </PopoverContent>
    </Popover>
  );
}
