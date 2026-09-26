import Link from 'next/link';
import { notFound } from 'next/navigation';
import { render } from 'react-email';

import { ArrowLeft } from 'lucide-react';

import { EmailPreviewFrame } from '@/components/admin/EmailPreviewFrame';
import { Button } from '@/components/ui/button';
import { requireNavAccess } from '@/lib/dal';
import { EMAIL_PREVIEWS } from '@/lib/email-previews';

export default async function EmailPreviewPage(
  props: PageProps<'/admin/email-previews/[slug]'>,
) {
  await requireNavAccess('/admin/email-previews');

  const { slug } = await props.params;
  const preview = EMAIL_PREVIEWS.find((entry) => entry.slug === slug);
  if (!preview) {
    notFound();
  }

  const html = await render(preview.element());

  return (
    <div className="mx-auto flex w-full flex-col gap-6 lg:w-3xl">
      <div className="flex flex-col gap-2">
        <Button
          variant="outline"
          className="self-start"
          size="lg"
          nativeButton={false}
          render={<Link href="/admin/email-previews" />}
        >
          <ArrowLeft />
          Vissza
        </Button>
        <h1 className="text-lg font-semibold text-muted-foreground lg:text-2xl">
          {preview.label}
        </h1>
        <p className="text-sm text-muted-foreground">
          Tárgy: <span className="text-foreground">{preview.subject}</span>
        </p>
      </div>
      <EmailPreviewFrame html={html} />
    </div>
  );
}
