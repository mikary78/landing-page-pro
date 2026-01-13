import { describe, expect, it } from 'vitest';
import { resolveSlideCount, resolveTemplate, sanitizeSlidesOptions } from '../src/lib/agent/slidesOptions';

describe('slidesOptions', () => {
  it('resolveSlideCount clamps by fallback when invalid', () => {
    expect(resolveSlideCount(undefined, 8)).toBe(8);
    expect(resolveSlideCount('abc', 8)).toBe(8);
    expect(resolveSlideCount(2, 8)).toBe(8);
    expect(resolveSlideCount(16, 8)).toBe(8);
  });

  it('resolveSlideCount accepts 3~15 and floors', () => {
    expect(resolveSlideCount(3, 8)).toBe(3);
    expect(resolveSlideCount(15, 8)).toBe(15);
    expect(resolveSlideCount(10.9, 8)).toBe(10);
  });

  it('resolveTemplate returns only known templates', () => {
    expect(resolveTemplate('default')).toBe('default');
    expect(resolveTemplate('minimal')).toBe('minimal');
    expect(resolveTemplate('creative')).toBe('creative');
    expect(resolveTemplate('unknown')).toBeUndefined();
  });

  it('sanitizeSlidesOptions validates slideCount range and template', () => {
    expect(sanitizeSlidesOptions({ slideCount: 10, template: 'minimal' })).toEqual({ slideCount: 10, template: 'minimal' });
    expect(sanitizeSlidesOptions({})).toBeUndefined();
    expect(() => sanitizeSlidesOptions({ slideCount: 2 })).toThrow();
    expect(() => sanitizeSlidesOptions({ slideCount: 99 })).toThrow();
    expect(() => sanitizeSlidesOptions({ template: 'weird' })).toThrow();
  });
});

