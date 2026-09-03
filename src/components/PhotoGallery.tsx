'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import {
  RowsPhotoAlbum,
  type Photo,
  type RenderImageContext,
  type RenderImageProps,
} from 'react-photo-album';

import 'react-photo-album/rows.css';

import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from '@/components/ui/carousel';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

const lightboxButtonClass =
  'border border-white/20 bg-neutral-500/40 text-white shadow-lg backdrop-blur-sm hover:bg-neutral-500/60 hover:text-white';

function renderNextImage(
  { alt = '', title, sizes }: RenderImageProps,
  { photo, width, height }: RenderImageContext,
) {
  return (
    <div
      style={{
        width: '100%',
        position: 'relative',
        aspectRatio: `${width}/${height}`,
      }}
      className="group cursor-pointer overflow-hidden rounded-lg border border-cream/30"
    >
      <Image
        fill
        src={photo}
        alt={alt}
        title={title}
        sizes={sizes}
        placeholder={'blurDataURL' in photo ? 'blur' : undefined}
        className="object-cover opacity-95 transition-all duration-300 ease-out group-hover:scale-108 group-hover:opacity-100"
      />
    </div>
  );
}

export function PhotoGallery({ photos }: { photos: Photo[] }) {
  const isMobile = useIsMobile();
  const [index, setIndex] = useState<number | null>(null);
  const open = index != null;

  return (
    <>
      <RowsPhotoAlbum
        photos={photos}
        render={{ image: renderNextImage }}
        spacing={12}
        // 5000 is just "a number bigger than any image could ever be tall," used as a trick.
        targetRowHeight={isMobile ? 5000 : 370}
        // sizes={{
        //   size: '1168px',
        //   sizes: [
        //     { viewport: '(max-width: 640px)', size: '100vw' },
        //     { viewport: '(max-width: 1024px)', size: '50vw' },
        //   ],
        // }}
        onClick={({ index: idx }) => setIndex(idx)}
      />
      <Dialog open={open} onOpenChange={(o) => !o && setIndex(null)}>
        <DialogContent
          className="h-dvh w-full max-w-none overflow-hidden border-0 bg-black/90 p-0 sm:max-w-none sm:rounded-none"
          closeButtonClassName={cn(
            lightboxButtonClass,
            'top-3 right-3 z-50 size-11 sm:top-6 sm:right-6 sm:size-12',
          )}
        >
          <DialogTitle className="sr-only">Image viewer</DialogTitle>
          {open && <Lightbox photos={photos} startIndex={index} />}
        </DialogContent>
      </Dialog>
    </>
  );
}

// --- Lightbox (Embla under shadcn Carousel) -------------------------------
function Lightbox({
  photos,
  startIndex,
}: {
  photos: Photo[];
  startIndex: number;
}) {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(startIndex);

  useEffect(() => {
    if (!api) {
      return;
    }

    setCurrent(api.selectedScrollSnap());
    const onSelect = () => setCurrent(api.selectedScrollSnap());
    api.on('select', onSelect);

    return () => {
      api.off('select', onSelect);
    };
  }, [api]);

  return (
    <Carousel
      setApi={setApi}
      opts={{ loop: true, startIndex }}
      className="h-full w-full"
    >
      <CarouselContent className="ml-0 h-dvh">
        {photos.map((photo, i) => (
          <CarouselItem
            key={i}
            className="flex items-center justify-center pl-0"
          >
            <div className="relative h-dvh w-full">
              <Image
                src={photo}
                alt={photo.alt ?? ''}
                fill
                sizes="100vw"
                className="object-contain"
                placeholder={'blurDataURL' in photo ? 'blur' : undefined}
                priority={i === startIndex}
              />
            </div>
          </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselPrevious
        size="icon-lg"
        className={cn(
          lightboxButtonClass,
          'left-3 size-11 sm:left-6 sm:size-12',
        )}
      />
      <CarouselNext
        size="icon-lg"
        className={cn(
          lightboxButtonClass,
          'right-3 size-11 sm:right-6 sm:size-12',
        )}
      />
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-3 py-1 text-sm text-white tabular-nums">
        {current + 1} / {photos.length}
      </div>
    </Carousel>
  );
}
