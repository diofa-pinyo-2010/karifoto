// Client-safe (no node:crypto): shared by the verify form's paste handling and
// normalizeLoginCode on the server. The email shows the code as `4821 9037`, so
// a pasted code may carry that space — or a dash, or surrounding whitespace.
export function stripLoginCodeSeparators(input: string) {
  return input.replace(/[\s-]/g, '');
}
