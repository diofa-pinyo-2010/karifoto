import { redirect } from 'next/navigation';

import { APP_URLS } from '@/lib/constants';

// The gallery moved to `/public`, so that it and `/details` are siblings rather
// than one nested inside the other. This URL stays because it's the one clients
// were sharing before the split — a temporary redirect, not permanent, so the
// structure stays ours to change without browsers caching the hop forever.
export default async function ClientPortalShootingPage({
  params,
}: PageProps<'/client/[clientProfileId]/shooting/[photoShootingId]'>) {
  const { clientProfileId, photoShootingId } = await params;

  redirect(
    APP_URLS.clientPortalShootingGallery(clientProfileId, photoShootingId),
  );
}
