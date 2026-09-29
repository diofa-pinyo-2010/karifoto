import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  APP_URLS,
  DECOR_SET_LABEL,
  PACKAGE_LABEL,
  PHOTO_SHOOTING_STATUS_CLIENT_BADGE_CLASSNAME,
  PHOTO_SHOOTING_STATUS_CLIENT_LABEL,
} from '@/lib/constants';
import { formatLongDate } from '@/lib/formatters';
import { prisma } from '@/lib/prisma';
import alomkastelyDiszlet from '@/photos/alomkastely-diszlet.jpg';
import hofeherDiszlet from '@/photos/hofeher-diszlet.jpg';

import type { DecorSet } from '@/generated/prisma/client';

// A díszlet saját fotója, ember nélkül — a kártya az időpontot hirdeti, nem egy
// másik család képét. `decorSet` nullázható (régi foglalások), ezért van
// tartalék.
const DECOR_SET_IMAGE: Record<DecorSet, typeof hofeherDiszlet> = {
  HOFEHER: hofeherDiszlet,
  ALOMKASTELY: alomkastelyDiszlet,
};

// Public on purpose. The only thing protecting this page is the
// clientProfileId being an unguessable UUID — and since that id also prefixes
// the shareable per-shooting URL, anyone the client shares a gallery with can
// reach this list too. That's an accepted tradeoff, which is why nothing
// sensitive (amounts, invoices, billing) may ever be rendered here.
export default async function ClientPortalHomePage({
  params,
}: PageProps<'/client/[clientProfileId]'>) {
  const { clientProfileId } = await params;

  const clientProfile = await prisma.clientProfile.findUnique({
    where: { id: clientProfileId },
    select: {
      id: true,
      owner: { select: { name: true } },
      photoShootings: {
        select: {
          id: true,
          status: true,
          package: true,
          decorSet: true,
          timeSlot: { select: { startTime: true } },
        },
        orderBy: { timeSlot: { startTime: 'desc' } },
      },
    },
  });

  if (!clientProfile) {
    notFound();
  }

  return (
    <section className="mx-auto w-full max-w-180 px-6 pt-14 pb-20 sm:px-10">
      <p className="brand-eyebrow">Ügyfélportál</p>

      <h1 className="font-display text-[clamp(30px,5vw,44px)] leading-[1.07] font-medium text-pretty">
        Üdv újra itt, {clientProfile.owner.name}!
      </h1>
      <p className="mt-5 text-[15px] leading-[1.85] text-pretty text-brand-muted">
        Itt találjátok a fotózásaitokat.
      </p>

      {clientProfile.photoShootings.length === 0 ? (
        <p className="mt-7 text-[15px] leading-[1.85] text-pretty text-brand-muted">
          Még nincs rögzített fotózásotok.
        </p>
      ) : (
        <ul className="mt-8 grid gap-6">
          {clientProfile.photoShootings.map((shooting) => {
            const cover = DECOR_SET_IMAGE[shooting.decorSet ?? 'HOFEHER'];
            const decorLabel =
              shooting.decorSet == null
                ? null
                : DECOR_SET_LABEL[shooting.decorSet];

            return (
              <li key={shooting.id}>
                <Card className="relative h-full border-0 bg-brand-paper pt-0 text-brand-ink ring-[#d9d3c7]">
                  {/* A képre ülő fátyol sávként testvér, nem szülő: a Card
                      `img:first-child` szabályai csak közvetlen gyerekre
                      illeszkednek. */}
                  <div className="absolute inset-x-0 top-0 z-10 aspect-video bg-brand-ink/25" />
                  <Image
                    src={cover}
                    alt={
                      decorLabel == null
                        ? 'A stúdió karácsonyi díszlete'
                        : `${decorLabel} díszlet`
                    }
                    placeholder="blur"
                    sizes="(min-width: 640px) 50vw, 100vw"
                    className="aspect-video w-full object-cover"
                  />

                  <CardHeader>
                    <CardAction>
                      <Badge
                        className={
                          PHOTO_SHOOTING_STATUS_CLIENT_BADGE_CLASSNAME[
                            shooting.status
                          ]
                        }
                      >
                        {PHOTO_SHOOTING_STATUS_CLIENT_LABEL[shooting.status]}
                      </Badge>
                    </CardAction>

                    <CardTitle className="text-lg font-medium">
                      {formatLongDate(shooting.timeSlot.startTime)}
                    </CardTitle>
                    <CardDescription className="text-brand-muted">
                      {[PACKAGE_LABEL[shooting.package], decorLabel]
                        .filter(Boolean)
                        .join(' · ')}
                    </CardDescription>
                  </CardHeader>

                  <CardFooter className="border-t-[#d9d3c7] bg-transparent">
                    <Button
                      render={
                        <Link
                          href={APP_URLS.clientPortalShooting(
                            clientProfile.id,
                            shooting.id,
                          )}
                        />
                      }
                      nativeButton={false}
                      size="lg"
                      className="w-full bg-brand-champagne font-semibold text-[#152b2e] hover:bg-brand-champagne hover:opacity-90"
                    >
                      Megnézem
                    </Button>
                  </CardFooter>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
