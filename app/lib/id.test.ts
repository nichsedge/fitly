import { describe, it, expect } from 'vitest';
import { uuidv4 } from './id';

describe('uuidv4', () => {
  it('produces valid v4-format UUIDs', () => {
    const re = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
    for (let i = 0; i < 100; i++) {
      expect(uuidv4()).toMatch(re);
    }
  });
  it('generates unique ids', () => {
    const set = new Set(Array.from({ length: 500 }, () => uuidv4()));
    expect(set.size).toBe(500);
  });
});
