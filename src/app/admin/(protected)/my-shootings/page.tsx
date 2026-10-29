import { FaceSlightlyFrowningIcon } from 'lucide-react';

import { OwnShootingCard } from '@/components/OwnShootingCard';
import { APP_URLS } from '@/lib/constants';
import { requireNavAccess } from '@/lib/dal';
import { fetchOwnPhotoShootings } from '@/lib/queries';

export default async function MyShootingsPage() {
  await requireNavAccess(APP_URLS.ownShootings);

  const { asPhotographer, asEditor } = await fetchOwnPhotoShootings();

  const sections = [
    { title: 'Fotósként', shootings: asPhotographer },
    { title: 'Utómunkásként', shootings: asEditor },
  ].filter((section) => section.shootings.length > 0);

  return (
    <div className="mx-auto flex w-full flex-col gap-6 lg:w-3xl">
      <h1 className="text-lg font-semibold text-muted-foreground lg:text-2xl">
        Saját fotózások
      </h1>
      {sections.length === 0 ? (
        <div className="flex items-center justify-center gap-2 rounded-[22px] border border-border bg-muted px-5 py-8 text-center text-sm text-muted-foreground">
          <FaceSlightlyFrowningIcon
            strokeWidth={2}
            className="size-5 shrink-0 opacity-60"
          />
          Jelenleg nincs hozzád rendelt fotózás.
        </div>
      ) : (
        sections.map((section) => (
          <section key={section.title} className="flex flex-col gap-3">
            <h2 className="text-xl font-bold">{section.title}</h2>
            {section.shootings.map((shooting) => (
              <OwnShootingCard key={shooting.id} shooting={shooting} />
            ))}
          </section>
        ))
      )}
    </div>
  );
}
