type OriginalInvoice = {
  id: string;
  invoiceNumber: string;
  amountInCents: number;
};

export type StornoPlan =
  | { action: 'skip' }
  | { action: 'retry' }
  | { action: 'fail' }
  | { action: 'issue'; originalInvoice: OriginalInvoice };

// A sztornó job döntése tisztán: mit csináljon a megkapott DB-állapotból.
export function planStorno(input: {
  refundEntry: { invoiceId: string | null } | null;
  originalInvoice: OriginalInvoice | null;
}): StornoPlan {
  // Soha nem lesz érvényes a payload — nincs mit újrapróbálni.
  if (input.refundEntry == null) return { action: 'fail' };
  // Már van sztornó számla a visszatérítésen.
  if (input.refundEntry.invoiceId != null) return { action: 'skip' };
  // Az eredeti számla job még futhat — újrapróbálás.
  if (input.originalInvoice == null) return { action: 'retry' };
  return { action: 'issue', originalInvoice: input.originalInvoice };
}
