'use client';

import { Children, useRef, useState } from 'react';

import { cn } from '@/lib/utils';

// Telefonon az oszlopok egymás mellett, lapozva csúsznak (a következő széle
// kilóg, hogy látszódjon, van még), így az oldal csak függőlegesen görget.
// Desktopon sima négyoszlopos rács.
export function PipelineCarousel({ children }: { children: React.ReactNode }) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const count = Children.count(children);

  function handleScroll() {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    // Az az oszlop az aktív, amelyiknek a bal széle a legközelebb van a
    // görgetési pozícióhoz (snap-start miatt pontosan oda áll be).
    const columns = Array.from(scroller.children) as HTMLElement[];
    const distance = (column: HTMLElement) =>
      Math.abs(column.offsetLeft - columns[0].offsetLeft - scroller.scrollLeft);
    setActiveIndex(
      columns.reduce(
        (best, column, index) =>
          distance(column) < distance(columns[best]) ? index : best,
        0,
      ),
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div
        ref={scrollerRef}
        onScroll={handleScroll}
        className="relative -mx-4 flex snap-x snap-mandatory scroll-px-4 scrollbar-none items-start gap-3 overflow-x-auto px-4 lg:mx-0 lg:grid lg:grid-cols-4 lg:overflow-visible lg:px-0 [&::-webkit-scrollbar]:hidden [&>*]:w-[85%] [&>*]:shrink-0 [&>*]:snap-start lg:[&>*]:w-auto"
      >
        {children}
      </div>

      <div aria-hidden className="flex justify-center gap-1.5 lg:hidden">
        {Array.from({ length: count }, (_, index) => (
          <span
            key={index}
            className={cn(
              'size-1.5 rounded-full transition-colors',
              index === activeIndex
                ? 'bg-foreground'
                : 'bg-muted-foreground/30',
            )}
          />
        ))}
      </div>
    </div>
  );
}
