import { describe, expect, it } from 'vitest';

import { sanitizeAdminRedirect } from '@/lib/session';

describe('sanitizeAdminRedirect', () => {
  it('keeps an admin path', () => {
    expect(sanitizeAdminRedirect('/admin/shootings')).toBe('/admin/shootings');
  });

  it.each([
    '//evil.com',
    'https://evil.com',
    '/admin/login',
    '/admin/login/verify',
    undefined,
    42,
  ])('rejects %j', (value) => {
    expect(sanitizeAdminRedirect(value)).toBeNull();
  });
});
