# 2026 redesign — status and remaining work

Context: the `karifoto-landing-skeleton` package (React + Vite, delivered by the
agency) is a **design spec**, not code to merge. The landing page has been
restyled in place against it. This file records what is finished, what is not,
and what is blocked.

Last updated: 2026-09-29.

---

## Done

The **landing page** (`src/app/page.tsx`) is fully on the 2026 identity:

|          |                                                             |
| -------- | ----------------------------------------------------------- |
| Sections | Hero, Sets, Reviews, Pricing, Video, Booking, Faq, Location |
| Chrome   | Header (overlay + mobile menu), Footer, MobileBookingBar    |
| Legal    | `/impresszum`, `/adatkezeles`, `/aszf`                      |

Supporting work: `--ui-font-*` indirection so admin and public can carry
different typography; the `--color-brand-*` palette; Manrope and Cormorant (with
a real italic) moved to `@fontsource-variable`; a shadcn theme preset applied.

---

## Not redesigned yet

Everything below still uses the **old dark-forest palette**. It is not broken —
the old tokens are still defined — but it looks like the previous site, so a
visitor now crosses a visual seam the moment they click a time slot.

### 1. Checkout flow — the priority

This is the revenue path, and it is what a visitor sees immediately after the
redesigned landing page.

| File                                           | Lines | Old-palette hits |
| ---------------------------------------------- | ----: | ---------------: |
| `src/components/BookingFormNew.tsx`            |   740 |               40 |
| `src/components/BookingSummary.tsx`            |   389 |               32 |
| `src/components/BookingReview.tsx`             |   286 |               26 |
| `src/app/success/[bookingIntentId]/page.tsx`   |     — |               15 |
| `src/app/foglalas-veglegesitese/[id]/page.tsx` |     — |               12 |
| `src/app/(foglalas)/layout.tsx`                |     — |                6 |
| `src/components/BookingUnavailable.tsx`        |    25 |                4 |

**The skeleton does not cover any of these.** It only ever mocked the landing
page, so there is no design spec for the booking form, the summary, the review
step or the success page. Someone has to decide what they should look like
before they can be restyled — that is a design task, not an implementation one.

### 2. `/coming-soon`

Deleted at launch together with the coming-soon gate; nothing to restyle.

### 3. Admin

Deliberately **out of scope**. Admin uses the shadcn design system and system
fonts; the whole point of the phase-0 work was to keep the two apart. 12 route
files, 3 components. No action needed.

---

## Blocked

### Deleting the old palette

`--color-forest`, `panel`, `ink`, `cream`, `gold`, `terracotta`, `sage` and
their variants **cannot be removed** while the checkout flow, the success page
and `/coming-soon` still reference them — roughly 200 usages. This unblocks
itself once section 1 above is done.

### Removing the `html.admin` override

Same story. It exists so admin gets system fonts rather than brand fonts. The
plan was to delete it once `app/layout.tsx` is split into `(site)` and `(admin)`
root layouts, each with its own defaults. **That split was deferred** and has
not happened, so the override is still load-bearing.

### Legal content

The three legal pages are **published drafts**. They carry a visible
"Egyeztetési tervezet" banner and server-side `noindex`, but they are linked
from the footer on every page.

The imprint identifies the operator as **Al Sieady Marwan EV.** with a tax
number and registered address that the draft itself flags as taken from
Oktogon and needing confirmation. Placeholders also remain for the studio
address, hosting provider, payment and deposit terms, cancellation rules, image
storage and data processors.

**Verify the operator details before production.** `noindex` keeps these out of
search results; it does not keep them from customers.

---

## Smaller open items

- **`prefers-reduced-motion` is not honoured.** The skeleton has a global block;
  it was not ported. Relevant because the page is anchor-heavy with
  `scroll-behavior: smooth`, plus accordion/collapsible/popover transitions and
  the MobileBookingBar slide. `Reviews` already checks the preference for its
  arrow buttons, so the current behaviour is inconsistent.
- **Photo gallery border** (`#acb9b0`, 1px) may still read as too faint on
  cream. `#9aa89f` is the next step up.
- **`PhotoGallery` image `opacity-95`** was tuned for a dark background; on
  cream it washes light photos toward the background.
- **`PhotoGallery` still imports `ui/carousel` and `ui/dialog`** — the last
  public components depending on shadcn wrappers. See the Base UI convention
  below.
- **`Wordmark.tsx`** defaults to `text-gold` and is no longer used
  anywhere (its only user, `/coming-soon`, was deleted).
- **`Booking.tsx` lines 55+** are a large commented-out form (46 old-palette
  hits). Dead code; delete or revive deliberately.
- **`Experience.tsx`** exists in the skeleton but is intentionally unused — the
  handoff notes say the "Több mint fotózás" block was cut.

---

## Conventions established during the migration

Follow these when continuing:

1. **Public components style Base UI primitives directly**
   (`import { Accordion as AccordionPrimitive } from '@base-ui/react/accordion'`),
   not the shadcn wrappers in `@/components/ui/*`. Those are styled for admin
   and are regenerated by `shadcn apply`, which silently breaks any override
   keyed to their internals. `components/ui/*` is admin-only.
2. **Brand colours are `--color-brand-*`.** Never reuse shadcn's semantic tokens
   (`primary`, `muted`, `destructive`) on public pages — they live on `:root`
   and are shared with admin, so a theme swap would repaint the marketing site.
   Conversely, admin should use the semantic tokens, not brand ones.
3. **Repeated section patterns** are `@layer components` classes in
   `globals.css`: `.brand-section`, `.brand-shell`, `.brand-eyebrow`,
   `.brand-heading`, `.brand-intro`, `.brand-stars`. Only add to these when a
   pattern repeats verbatim across three or more components.
4. **`shadcn apply` resets `menuColor`** in `components.json` on every run.
   Revert it, and check the custom semantic tokens (`--success`, `--warning`,
   `--info`, `--destructive-bg`) survived.
5. **Check computed content width, not `max-width`.** The skeleton expresses the
   same width in different ways depending on whether padding sits on the same
   element.
6. **A skeleton rule relying on CSS source order can invert as utilities.**
   Tailwind sorts shorthand before longhand, so `p-10` loses to `last:pb-0`
   where the original CSS won on source order. Make such classes mutually
   exclusive rather than layered.
7. **`sizes` on a `fill` image describes the rendered width**, which is not the
   container width when `object-cover` runs in a fixed-height box.
