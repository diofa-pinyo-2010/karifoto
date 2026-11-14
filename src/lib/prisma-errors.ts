/**
 * Whether a P2002's `meta` names `field` as (part of) the violated unique
 * constraint. Takes the raw meta, not the error, so it stays a pure function.
 *
 * Prisma 7 with `@prisma/adapter-pg` has no `target`: the constraint sits under
 * `driverAdapterError.cause.constraint`, as the Postgres index name
 * (`PhotoShooting_giftCode_key`) or, failing that, the key's quoted fields.
 * `target` is still read in case a future engine brings it back.
 */
export function isUniqueViolationOnField(meta: unknown, field: string) {
  if (!isRecord(meta)) {
    return false;
  }

  const cause = isRecord(meta.driverAdapterError)
    ? meta.driverAdapterError.cause
    : undefined;
  const constraint = isRecord(cause) ? cause.constraint : undefined;

  const names = [
    meta.target,
    isRecord(constraint) ? constraint.index : undefined,
    isRecord(constraint) ? constraint.fields : undefined,
  ];

  return names.some((name) => {
    if (typeof name === 'string') {
      // An index name: `<Model>_<field>[_<field>…]_key`.
      return name.split('_').includes(field);
    }
    if (Array.isArray(name)) {
      return name.some(
        (item) =>
          typeof item === 'string' && item.replaceAll('"', '') === field,
      );
    }
    return false;
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === 'object';
}
