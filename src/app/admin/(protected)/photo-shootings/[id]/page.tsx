import Link from 'next/link';

import { ArrowLeft } from 'lucide-react';

import { Button } from '@/components/ui/button';

export default async function PhotoShootingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="flex flex-col gap-4">
      <Button
        variant="ghost"
        size="sm"
        className="w-fit"
        nativeButton={false}
        render={<Link href="/admin/bookings" />}
      >
        <ArrowLeft />
        Vissza a fotózásokhoz
      </Button>
      <h1 className="text-lg font-semibold">Fotózás részletei</h1>
      <p className="text-sm text-muted-foreground">Azonosító: {id}</p>
    </div>
  );
}
