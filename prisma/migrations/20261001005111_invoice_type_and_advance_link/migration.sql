-- CreateEnum
CREATE TYPE "InvoiceType" AS ENUM ('NORMAL', 'ADVANCE', 'FINAL', 'STORNO');

-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "advanceInvoiceId" UUID,
ADD COLUMN     "type" "InvoiceType" NOT NULL DEFAULT 'ADVANCE';

-- Kézi szerkesztés. A `type` a sémában default nélküli, kötelező mező: így
-- minden `invoice.create` hívásnak ki kell mondania a dokumentum típusát, nem
-- tud véletlenül típus nélküli számla keletkezni. A meglévő sorok viszont
-- kivétel nélkül előlegszámlák (eddig csak a Stripe-os előleg állított ki
-- számlát), ezért itt ideiglenes defaulttal töltjük fel őket, majd elvesszük a
-- defaultot. NE generáld újra ezt a migrációt.
ALTER TABLE "Invoice" ALTER COLUMN "type" DROP DEFAULT;

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_advanceInvoiceId_key" ON "Invoice"("advanceInvoiceId");

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_advanceInvoiceId_fkey" FOREIGN KEY ("advanceInvoiceId") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;
