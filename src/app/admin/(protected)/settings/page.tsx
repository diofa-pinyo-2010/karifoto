import { requireNavAccess } from '@/lib/dal';

export default async function SettingsPage() {
  await requireNavAccess('/admin/settings');

  return <h1 className="text-lg font-semibold">Beállítások</h1>;
}
