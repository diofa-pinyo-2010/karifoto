'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { ArrowDownUpIcon, FilterIcon, SearchIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@/components/ui/input-group';
import { PhotoShootingStatus } from '@/generated/prisma/enums';
import { PHOTO_SHOOTING_STATUS_LABEL } from '@/lib/constants';
import {
  DEFAULT_SHOOTING_ORDER,
  SHOOTING_ORDER_BY,
  SHOOTING_ORDER_LABEL,
  SHOOTING_ORDER_PARAM,
  SHOOTING_SEARCH_PARAM,
  SHOOTING_STATUS_PARAM,
  type ShootingOrder,
} from '@/lib/shooting-order';

type ShootingListControlsProps = {
  search: string;
  order: ShootingOrder;
  status: PhotoShootingStatus | null;
};

const SEARCH_DEBOUNCE_MS = 300;
// A rádiócsoport értéke nem lehet null, ezért az „összes” külön kulcsot kap.
const ALL_STATUSES = 'all';

export function ShootingListControls({
  search,
  order,
  status,
}: ShootingListControlsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [query, setQuery] = useState(search);
  const isFirstRender = useRef(true);

  function navigate(changes: Partial<ShootingListControlsProps>) {
    const next = { search: query.trim(), order, status, ...changes };
    const params = new URLSearchParams();
    if (next.search) params.set(SHOOTING_SEARCH_PARAM, next.search);
    if (next.order !== DEFAULT_SHOOTING_ORDER) {
      params.set(SHOOTING_ORDER_PARAM, next.order);
    }
    if (next.status) params.set(SHOOTING_STATUS_PARAM, next.status);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  }

  // Gépelés közben késleltetve kérdezzük le a szervert.
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    const timeout = setTimeout(() => {
      navigate({});
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- csak a beírt szövegre reagálunk
  }, [query]);

  return (
    <div className="flex flex-col gap-3">
      <InputGroup className="h-10 w-full bg-card">
        <InputGroupAddon>
          <SearchIcon />
        </InputGroupAddon>
        <InputGroupInput
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Keresés név vagy e-mail cím alapján"
          aria-label="Keresés név vagy e-mail cím alapján"
        />
      </InputGroup>
      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="outline" className="w-full bg-card sm:w-auto">
                <FilterIcon />
                {status
                  ? PHOTO_SHOOTING_STATUS_LABEL[status].long
                  : 'Összes státusz'}
              </Button>
            }
          />
          <DropdownMenuContent align="end" className="w-auto">
            <DropdownMenuRadioGroup
              value={status ?? ALL_STATUSES}
              onValueChange={(value) =>
                navigate({
                  status:
                    value === ALL_STATUSES
                      ? null
                      : (value as PhotoShootingStatus),
                })
              }
            >
              <DropdownMenuRadioItem closeOnClick value={ALL_STATUSES}>
                Összes státusz
              </DropdownMenuRadioItem>
              {Object.values(PhotoShootingStatus).map((key) => (
                <DropdownMenuRadioItem closeOnClick key={key} value={key}>
                  {PHOTO_SHOOTING_STATUS_LABEL[key].long}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="outline" className="w-full bg-card sm:w-auto">
                <ArrowDownUpIcon />
                {SHOOTING_ORDER_LABEL[order]}
              </Button>
            }
          />
          <DropdownMenuContent align="end" className="w-auto">
            <DropdownMenuRadioGroup
              value={order}
              onValueChange={(value) =>
                navigate({ order: value as ShootingOrder })
              }
            >
              {(Object.keys(SHOOTING_ORDER_BY) as ShootingOrder[]).map(
                (key) => (
                  <DropdownMenuRadioItem closeOnClick key={key} value={key}>
                    {SHOOTING_ORDER_LABEL[key]}
                  </DropdownMenuRadioItem>
                ),
              )}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
