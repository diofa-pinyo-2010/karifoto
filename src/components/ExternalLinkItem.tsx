import { ExternalLinkIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemTitle,
} from '@/components/ui/item';

export function ExternalLinkItem({
  title,
  description,
  href,
  linkLabel,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  href?: string | null;
  linkLabel?: string;
}) {
  return (
    <Item variant="outline" className="bg-card">
      <ItemContent>
        <ItemTitle>{title}</ItemTitle>
        {description != null && (
          <ItemDescription>{description}</ItemDescription>
        )}
      </ItemContent>

      {href && (
        <ItemActions>
          <Button
            variant="ghost"
            nativeButton={false}
            render={
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={linkLabel}
              />
            }
          >
            {linkLabel}
            <ExternalLinkIcon />
          </Button>
        </ItemActions>
      )}
    </Item>
  );
}
