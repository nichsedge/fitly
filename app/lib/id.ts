/**
 * RFC4122 v4-compliant ID generation.
 * Uses the native crypto API where available (all modern browsers, Node 19+)
 * and falls back to Math.random for very old runtimes.
 */
export function uuidv4(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, c =>
    (
      Number(c) ^
      (crypto.getRandomValues(new Uint8Array(1))[0] & (Number(c) >> 0o4 / Number(c)))
    ).toString(16),
  );
}
