We want to introduce a new model: `PhotoShootingPricing` and abstract all the pricing related things of the `PhotoShooting` here.

```prisma
model PhotoShootingPricing {
  id              String        @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  photoShooting   PhotoShooting @relation(fields: [photoShootingId], references: [id])
  photoShootingId String        @unique @db.Uuid

  // Snapshotted at booking time from package config
  packagePriceInCents                Int
  packageEditedImagesAllowance       Int

  // Snapshotted at booking time from pricing config
  extraPeopleThreshold               Int
  extraPeopleRateInCents             Int
  extraPetRateInCents                Int

  extraEditedImageRateInCents        Int
  extraRetouchedImageRateInCents     Int

  // Filled in by editor after image selection
  totalEditedImages                  Int @default(0)
  totalRetouchedImages               Int @default(0)

  createdAt DateTime @default(now())
  updatedAt DateTime @default(now()) @updatedAt
}
```

Another new model for price adjustments with text reasons: `PriceAdjustment`

```prisma
model PriceAdjustment {
  id              String              @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  type            PriceAdjustmentType
  amountInCents   Int
  reason          String?

  // One of these will be set, the other null
  bookingIntent   BookingIntent? @relation(fields: [bookingIntentId], references: [id])
  bookingIntentId String?        @db.Uuid

  photoShooting   PhotoShooting?       @relation(fields: [photoShootingId], references: [id])
  photoShootingId String?              @db.Uuid

  createdAt DateTime @default(now())
  updatedAt DateTime @default(now()) @updatedAt

  @@index([photoShootingId])
  @@index([bookingIntentId])
}

enum PriceAdjustmentType {
  DISCOUNT
  DEDUCTION
}
```

Add relations to `PhotoShooting`:

```prisma
pricing        PhotoShootingPricing?
adjustments    PriceAdjustment[]
```

And to `BookingIntent`:

```prisma
adjustments    PriceAdjustment[]
```

The one thing to enforce in the application layer: always check that exactly one of the two foreign keys is set when creating or updating a PriceAdjustment. Postgres can't enforce that natively without a check constraint, which Prisma doesn't support directly, but you can add it as a raw migration:

```bash
npx prisma migrate dev --create-only --name add_price_adjustment_one_owner_constraint
```

```sql
ALTER TABLE "PriceAdjustment"
ADD CONSTRAINT "price_adjustment_one_owner"
CHECK (
  ("bookingIntentId" IS NOT NULL)::int +
  ("photoShootingId" IS NOT NULL)::int = 1
);
```

Then when a `BookingIntent` is converted to a `PhotoShooting`, you migrate the adjustments over:

```ts
await prisma.priceAdjustment.updateMany({
  where: { bookingIntentId: intent.id },
  data: {
    bookingIntentId: null,
    photoShootingId: newShooting.id,
  },
});
```

Application logic
At booking creation — snapshot everything

```ts
await prisma.photoShootingPricing.create({
  data: {
    photoShootingId: shooting.id,
    packagePriceInCents: PACKAGE_PRICES[shooting.package],
    packageEditedImagesAllowance: PACKAGE_EDITED_ALLOWANCE[shooting.package],
    extraPeopleThreshold: PRICING_CONFIG.extraPeopleThreshold,
    extraPeopleRateInCents: PRICING_CONFIG.extraPeopleRateInCents,
    extraPetRateInCents: PRICING_CONFIG.extraPetRateInCents,
    extraEditedImageRateInCents: PRICING_CONFIG.extraEditedImageRateInCents,
    extraRetouchedImageRateInCents:
      PRICING_CONFIG.extraRetouchedImageRateInCents,
  },
});
```

### Remaining amount — pure computed function

```ts
function calculateRemainingAmount({
  pricing,
  shooting,
  adjustments,
  ledgerEntries,
}: {
  pricing: PhotoShootingPricing;
  shooting: PhotoShooting;
  adjustments: PriceAdjustment[];
  ledgerEntries: LedgerEntry[];
}): number {
  const extraPeople = Math.max(
    0,
    shooting.numberOfGuests - pricing.extraPeopleThreshold,
  );
  const extraEdited = Math.max(
    0,
    pricing.totalEditedImages - pricing.packageEditedImagesAllowance,
  );

  const totalCharges =
    pricing.packagePriceInCents +
    extraPeople * pricing.extraPeopleRateInCents +
    shooting.numberOfPets * pricing.extraPetRateInCents +
    extraEdited * pricing.extraEditedImageRateInCents +
    pricing.totalRetouchedImages * pricing.extraRetouchedImageRateInCents;

  const totalDeductions = adjustments.reduce(
    (sum, a) => sum + a.amountInCents,
    0,
  );

  const totalPaid = ledgerEntries
    .filter((e) => e.category.startsWith('INCOME'))
    .reduce((sum, e) => sum + e.amountInCents, 0);

  return totalCharges - totalDeductions - totalPaid;
}
```

## What stays unchanged

| Field            | Where           | Why                                       |
| ---------------- | --------------- | ----------------------------------------- |
| `numberOfGuests` | `PhotoShooting` | Describes the booking, not pricing        |
| `numberOfPets`   | `PhotoShooting` | Same                                      |
| `package`        | `PhotoShooting` | The booking fact; pricing is the snapshot |
| `LedgerEntry`    | unchanged       | Already handles all payment records       |

---

The `PhotoShootingStatus` flow needs one more status between `FINAL_PHOTOS_UPLOAD` and `COMPLETED` to handle the "waiting for payment" state:

(Btw this is already added. The previous list is stale.)

```prisma
enum PhotoShootingStatus {
  PHOTOGRAPHER_SELECTION
  WAITING_FOR_THE_DATE
  RAW_PHOTOS_UPLOAD
  EDITOR_SELECTION
  FINAL_PHOTOS_UPLOAD
  WAITING_FOR_PAYMENT  // 👈 new
  COMPLETED
  CLOSED
}
```

And in `resolveStatus`:

```ts
function resolveStatus({
  current,
  updates,
  pricing,
  adjustments,
  ledgerEntries,
}: {
  current: PhotoShootingWithTimeSlot;
  updates: PhotoShootingUpdateInput;
  pricing: PhotoShootingPricing;
  adjustments: PriceAdjustment[];
  ledgerEntries: LedgerEntry[];
}): PhotoShootingStatus {
  // code...

  if (merged.finalImagesUrl == null)
    return PhotoShootingStatus.FINAL_PHOTOS_UPLOAD;

  const remaining = calculateRemainingAmount({
    pricing,
    shooting: merged,
    adjustments,
    ledgerEntries,
  });
  if (remaining > 0) return PhotoShootingStatus.WAITING_FOR_PAYMENT;

  return PhotoShootingStatus.COMPLETED;
}
```

The `updatePhotoShooting` service function needs to handle this:

```ts
// I am leaving this code snippet here for learning purposes.
// Also a subtle issue: if the package changed, current.pricing is now stale — it reflects the old package price. You'd want to pass the updated pricing instead:

async function updatePhotoShooting(
  id: string,
  updates: PhotoShootingUpdateInput,
) {
  const current = await prisma.photoShooting.findUniqueOrThrow({
    where: { id },
    include: {
      timeSlot: true,
      pricing: true,
      adjustments: true, // 👈
      ledgerEntries: true, // 👈
    },
  });

  return prisma.$transaction(async (tx) => {
    // If package changed, update the pricing snapshot
    if (updates.package != null && updates.package !== current.package) {
      await tx.photoShootingPricing.update({
        where: { photoShootingId: id },
        data: {
          packagePriceInCents: PACKAGE_PRICES[updates.package],
          packageEditedImagesAllowance:
            PACKAGE_EDITED_ALLOWANCE[updates.package],
        },
      });
    }

    const status = resolveStatus({
      current,
      updates,
      pricing: current.pricing, // 👈 stale if package changed!!!
      adjustments: current.adjustments,
      ledgerEntries: current.ledgerEntries,
    });

    return tx.photoShooting.update({
      where: { id },
      data: { ...updates, status },
    });
  });
}
```

This one is correct:

```ts
async function updatePhotoShooting(
  id: string,
  updates: PhotoShootingUpdateInput,
) {
  const current = await prisma.photoShooting.findUniqueOrThrow({
    where: { id },
    include: {
      timeSlot: true,
      pricing: true,
      adjustments: true,
      ledgerEntries: true,
    },
  });

  return prisma.$transaction(async (tx) => {
    let effectivePricing = current.pricing;

    // If package changed, update the pricing snapshot
    if (updates.package != null && updates.package !== current.package) {
      await tx.photoShootingPricing.update({
        where: { photoShootingId: id },
        data: {
          packagePriceInCents: PACKAGE_PRICES[updates.package],
          packageEditedImagesAllowance:
            PACKAGE_EDITED_ALLOWANCE[updates.package],
        },
      });

      // Keep effectivePricing in sync so resolveStatus sees the new values
      effectivePricing = {
        ...current.pricing,
        packagePriceInCents: PACKAGE_PRICES[updates.package],
        packageEditedImagesAllowance: PACKAGE_EDITED_ALLOWANCE[updates.package],
      };
    }

    const status = resolveStatus({
      current,
      updates,
      pricing: effectivePricing,
      adjustments: current.adjustments,
      ledgerEntries: current.ledgerEntries,
    });

    return tx.photoShooting.update({
      where: { id },
      data: { ...updates, status },
    });
  });
}
```
