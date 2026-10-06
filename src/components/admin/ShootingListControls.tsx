'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { ArrowDownUpIcon, SearchIcon } from 'lucide-react';

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
import {
  DEFAULT_SHOOTING_ORDER,
  SHOOTING_ORDER_BY,
  SHOOTING_ORDER_LABEL,
  SHOOTING_ORDER_PARAM,
  SHOOTING_SEARCH_PARAM,
  type ShootingOrder,
} from '@/lib/shooting-order';

type ShootingListControlsProps = {
  search: string;
  order: ShootingOrder;
};

const SEARCH_DEBOUNCE_MS = 300;

export function ShootingListControls({
  search,
  order,
}: ShootingListControlsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [query, setQuery] = useState(search);
  const isFirstRender = useRef(true);

  function navigate(nextSearch: string, nextOrder: ShootingOrder) {
    const params = new URLSearchParams();
    if (nextSearch) params.set(SHOOTING_SEARCH_PARAM, nextSearch);
    if (nextOrder !== DEFAULT_SHOOTING_ORDER) {
      params.set(SHOOTING_ORDER_PARAM, nextOrder);
    }
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
      navigate(query.trim(), order);
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
          placeholder="Keresés e-mail cím alapján"
          aria-label="Keresés e-mail cím alapján"
        />
      </InputGroup>
      <div className="flex justify-end">
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="outline" className="bg-card">
                <ArrowDownUpIcon />
                {SHOOTING_ORDER_LABEL[order]}
              </Button>
            }
          />
          <DropdownMenuContent align="end" className="w-auto">
            <DropdownMenuRadioGroup
              value={order}
              onValueChange={(value) =>
                navigate(query.trim(), value as ShootingOrder)
              }
            >
              {(Object.keys(SHOOTING_ORDER_BY) as ShootingOrder[]).map(
                (key) => (
                  <DropdownMenuRadioItem key={key} value={key}>
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
