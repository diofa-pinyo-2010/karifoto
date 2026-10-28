import type { Package } from '@/generated/prisma/enums';

export function isPackageAllowed(
  allowedPackages: readonly Package[],
  pkg: Package,
): boolean {
  return allowedPackages.length === 0 || allowedPackages.includes(pkg);
}

/**
 * A foglalási űrlap kezdő csomagja. A főoldalról hozott (URL-es) választást
 * eldobjuk, ha az idősávon nem foglalható; ha pedig csak egyetlen csomag
 * engedélyezett, azt választjuk ki, hiszen más úgysem lehet.
 */
export function initialPackageForSlot(
  allowedPackages: readonly Package[],
  selected: Package | null,
): Package | null {
  if (selected != null && isPackageAllowed(allowedPackages, selected)) {
    return selected;
  }
  return allowedPackages.length === 1 ? allowedPackages[0] : null;
}
