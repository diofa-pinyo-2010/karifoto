import { RemoteBookingForm } from '@/components/RemoteBookingForm';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { requireNavAccess } from '@/lib/dal';

export default async function RemoteBookingPage() {
  await requireNavAccess('/admin/remote-booking');

  return (
    <div className="mx-auto flex w-full flex-col gap-6 lg:w-3xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl lg:text-2xl">
            Telefonos foglalás
          </CardTitle>
          <CardDescription className="mt-2 mb-4">
            Itt felvehetsz egy foglalást egy ügyfélnek, és a végén kiküldhetsz
            neki az előleg bekérő emailt. A következő oldalon kedvezményeket
            (pl. early bird) is hozzáadhatsz.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RemoteBookingForm />
        </CardContent>
      </Card>
    </div>
  );
}
