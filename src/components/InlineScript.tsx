/**
 * Inline script, ami a HTML parse-olásakor fut le (első paint előtt).
 *
 * A kliensen `text/plain` a type, mert ott a script úgysem hajtódna végre —
 * enélkül React dev warning: "Encountered a script tag while rendering React
 * component". A type-eltérést a `suppressHydrationWarning` nyeli le.
 * @see node_modules/next/dist/docs/01-app/02-guides/preventing-flash-before-hydration.md
 */
export function InlineScript({ html }: { html: string }) {
  return (
    <script
      type={typeof window === 'undefined' ? 'text/javascript' : 'text/plain'}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
