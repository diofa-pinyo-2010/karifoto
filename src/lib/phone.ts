import { parsePhoneNumberFromString } from 'libphonenumber-js';

// Only what people actually type into a phone field. `libphonenumber-js` would
// happily pull a number out of "+36209876543asdasd", so anything else is
// rejected before it gets the chance.
const PHONE_INPUT_CHARS = /^[+\d\s()./-]+$/;

/**
 * Strict check for a phone number typed into one of our forms: the E.164 form
 * ("+36209876543") when it is a valid number, defaulting to Hungary for
 * national formats ("06 20 …", "0036 …"), or `null` otherwise.
 *
 * Unlike `normalizePhoneNumber` in `bookings-csv.ts`, which leniently cleans up
 * values already stored, this decides what may be stored in the first place.
 */
export function parsePhoneNumberInput(value: string): string | null {
  const trimmed = value.trim();

  if (!PHONE_INPUT_CHARS.test(trimmed)) {
    return null;
  }

  const phone = parsePhoneNumberFromString(trimmed.replace(/^00/, '+'), 'HU');

  return phone?.isValid() ? phone.format('E.164') : null;
}
