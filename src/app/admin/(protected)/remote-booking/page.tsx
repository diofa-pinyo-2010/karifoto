import { RemoteBookingForm } from '@/components/RemoteBookingForm';
import { requireNavAccess } from '@/lib/dal';

export default async function RemoteBookingPage() {
  await requireNavAccess('/admin/remote-booking');

  return (
    <div className="mx-auto flex w-full flex-col gap-6 lg:w-3xl">
      <h1 className="text-lg font-semibold text-muted-foreground lg:text-2xl">
        Telefonos foglalás
      </h1>
      <RemoteBookingForm />
    </div>
  );
}
