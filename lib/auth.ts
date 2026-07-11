import { timingSafeEqual } from 'crypto';

// Length check first because timingSafeEqual throws on mismatched buffer
// lengths rather than returning false, and a plain !== length check
// before it doesn't leak meaningful timing info (only that the header
// was tampered with, which is public information regardless).
export function safeEqual(provided: string, expected: string): boolean {
  if (!expected || provided.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(provided), Buffer.from(expected));
}
