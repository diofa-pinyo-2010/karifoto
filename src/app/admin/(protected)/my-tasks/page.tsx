import Link from 'next/link';

import { ArrowRightIcon, FaceSlightlyFrowningIcon } from 'lucide-react';

import { OwnShootingCard } from '@/components/OwnShootingCard';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { verifySession } from '@/lib/dal';
import { fetchOwnPhotoShootings, fetchOwnStaffFees } from '@/lib/queries';
import { cn, formatMoney } from '@/lib/utils';

export default async function MyShootingsPage() {
  const {
    staffProfile: { nickname },
  } = await verifySession();

  const [{ asPhotographer, asEditor }, fees] = await Promise.all([
    fetchOwnPhotoShootings(),
    fetchOwnStaffFees(),
  ]);

  const feeCards = [
    {
      title: 'Várható bevétel',
      amount: fees.expectedInCents,
      description: 'Még nem esedékes díjak',
      estimated: true,
    },
    {
      title: 'Esedékes bevétel',
      amount: fees.dueInCents,
      description: 'Még ki nem fizetett díjak',
      estimated: true,
    },
    {
      title: 'Kifizetve',
      amount: fees.paidInCents,
      description: 'Kifizetett díjak',
      estimated: false,
    },
  ];

  const sections = [
    { title: 'Fotós feladatok', shootings: asPhotographer },
    { title: 'Szerkesztő feladatok', shootings: asEditor },
  ].filter((section) => section.shootings.length > 0);

  return (
    <div className="mx-auto flex w-full flex-col gap-6 lg:w-3xl">
      <h1 className="text-lg font-semibold text-muted-foreground lg:text-2xl">
        Szia, {nickname}!
      </h1>
      <div className="grid gap-4 sm:grid-cols-3">
        {feeCards.map((card) => (
          <Card key={card.title}>
            <CardHeader>
              <CardDescription>{card.title}</CardDescription>
              <CardTitle
                className={cn(
                  'text-2xl font-black tabular-nums',
                  card.estimated && 'font-bold text-brand-muted',
                )}
              >
                {formatMoney(card.amount)}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">
              {card.description}
            </CardContent>
          </Card>
        ))}
      </div>
      <Link
        href="/admin/my-tasks/details"
        className="flex items-center gap-1 text-blue-600 underline underline-offset-4 transition-colors hover:text-blue-500 dark:text-blue-300 hover:dark:text-blue-400"
      >
        <span>Minden hozzám tartozó fotózás</span>
        <ArrowRightIcon className="size-4" />
      </Link>
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
