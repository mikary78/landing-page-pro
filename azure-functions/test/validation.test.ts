import { describe, expect, it } from 'vitest';
import { isUuid } from '../src/lib/validation';

describe('isUuid', () => {
  it('should accept valid UUID', () => {
    expect(isUuid('11111111-1111-4111-8111-111111111111')).toBe(true);
  });

  it('should reject non-uuid', () => {
    expect(isUuid('61564')).toBe(false);
    expect(isUuid('')).toBe(false);
    expect(isUuid(null)).toBe(false);
  });
});

