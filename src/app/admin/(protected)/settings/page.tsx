import { AutomaticEarlyBirdSwitch } from '@/components/AutomaticEarlyBirdSwitch';
import { DetailRow } from '@/components/DetailRow';
import { EditableComboboxField } from '@/components/EditableComboboxField';
import { requireNavAccess } from '@/lib/dal';
import { getSiteSettings } from '@/lib/queries';
import { fetchEditors, setDefaultEditor } from '@/server/admin';

export default async function SettingsPage() {
  await requireNavAccess('/admin/settings');

  const { automaticEarlyBirdEnabled } = await getSiteSettings();
  const editors = await fetchEditors();
  const defaultEditor = editors.find((editor) => editor.isDefaultEditor);

  return (
    <div className="mx-auto flex w-full flex-col gap-6 lg:w-3xl">
      <h1 className="text-lg font-semibold text-muted-foreground lg:text-2xl">
        Beállítások
      </h1>
      <div className="rounded-lg border bg-card px-4">
        <DetailRow
          label="Alapértelmezett szerkesztő"
          value={
            <EditableComboboxField
              value={
                defaultEditor
                  ? { value: defaultEditor.id, label: defaultEditor.nickname }
                  : null
              }
              items={editors.map((editor) => ({
                value: editor.id,
                label: editor.owner.name,
              }))}
              placeholder="Válassz alapértelmezett szerkesztőt!"
              emptyLabel="Nincs kiválasztva."
              onSave={setDefaultEditor}
            />
          }
        />
        <DetailRow
          label="Automatikus Early Bird"
          value={
            <AutomaticEarlyBirdSwitch
              initial={automaticEarlyBirdEnabled}
              id="automaticEarlyBirdEnabled"
            />
          }
          htmlForId="automaticEarlyBirdEnabled"
        />
      </div>
    </div>
  );
}
