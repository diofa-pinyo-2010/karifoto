import { formatDistanceToNow } from 'date-fns';
import { hu } from 'date-fns/locale';

import {
  Item,
  ItemContent,
  ItemDescription,
  ItemFooter,
  ItemTitle,
} from '@/components/ui/item';
import { shortFullDateFormatter } from '@/lib/formatters';
import { getAdminLeads } from '@/lib/queries';
import { cn } from '@/lib/utils';

export default async function LeadsAdminPage() {
  const res = await getAdminLeads();
  if ('error' in res) {
    return <p>error</p>;
  }

  const { leads } = res;

  return (
    <div className="mx-auto flex w-full flex-col gap-6 lg:w-3xl">
      {leads.length === 0 && <p>Jelenleg nincsenek leadek</p>}
      {leads.length > 0 && (
        <div className="flex flex-col gap-6">
          <h1 className="text-2xl font-medium">Leadek</h1>
          <p className="text-brand-muted">
            Itt azok jelennek meg, akik elkezdtek egy foglalást, ki is töltötték
            az űrlapot, tehát már jártak a foglalás összegző oldalon, de
            valamiért végül nem fizettek (és ez már{' '}
            <strong>legalább 3 órája</strong> történt). Azok, akik újrakezdtek
            egy foglalást, és azt kifizették, azok nem jelennek meg itt.
          </p>
          <div className="flex flex-col gap-3">
            {leads.map(
              ({
                id,
                name,
                createdAt,
                timeSlot,
                optOutFromMarketingEmails,
              }) => {
                const timeSlotTaken = timeSlot?.photoShooting != null;

                return (
                  <Item key={id} variant="outline" className="bg-card">
                    <ItemContent>
                      <ItemTitle>
                        {name} •{' '}
                        <span className="text-brand-muted">
                          Marketing emailek:{' '}
                          {optOutFromMarketingEmails ? '❌' : '✅'}
                        </span>
                      </ItemTitle>
                      <ItemDescription>
                        Választott időpont:{' '}
                        <span
                          className={cn(
                            'font-semibold text-green-600 dark:text-green-500',
                            timeSlotTaken &&
                              'text-brand-muted line-through dark:text-brand-muted',
                          )}
                        >
                          {shortFullDateFormatter.format(timeSlot?.startTime)} (
                          <span>
                            {timeSlotTaken ? 'Már elkelt' : 'Még szabad'}
                          </span>
                          )
                        </span>
                      </ItemDescription>
                    </ItemContent>
                    {/* <ItemActions>Item Actions</ItemActions> */}
                    <ItemFooter>
                      <span className="text-brand-muted">
                        {formatDistanceToNow(createdAt, {
                          addSuffix: true,
                          locale: hu,
                        })}
                      </span>
                    </ItemFooter>
                  </Item>
                );
              },
            )}
          </div>
        </div>
      )}
    </div>
  );
}
