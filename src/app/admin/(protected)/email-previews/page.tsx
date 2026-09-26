import Link from 'next/link';

import { ChevronRightIcon } from 'lucide-react';

import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemTitle,
} from '@/components/ui/item';
import { requireNavAccess } from '@/lib/dal';
import { EMAIL_PREVIEWS } from '@/lib/email-previews';

export default async function EmailPreviewsPage() {
  await requireNavAccess('/admin/email-previews');

  return (
    <div className="mx-auto flex w-full flex-col gap-6 lg:w-3xl">
      <h1 className="text-lg font-semibold text-muted-foreground lg:text-2xl">
        E-mail sablonok
      </h1>
      <ItemGroup className="gap-2">
        {EMAIL_PREVIEWS.map((preview) => (
          <Item
            key={preview.slug}
            variant="outline"
            render={<Link href={`/admin/email-previews/${preview.slug}`} />}
            className="bg-card"
          >
            <ItemContent>
              <ItemTitle>{preview.label}</ItemTitle>
              <ItemDescription>{preview.subject}</ItemDescription>
            </ItemContent>
            <ItemActions>
              <ChevronRightIcon className="size-4" />
            </ItemActions>
          </Item>
        ))}
      </ItemGroup>
    </div>
  );
}
