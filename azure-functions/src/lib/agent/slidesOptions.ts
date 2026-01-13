export type SlidesTemplate = 'default' | 'minimal' | 'creative';

export interface SlidesOptions {
  /** PRD 기준: 3~15 */
  slideCount?: number;
  /** PPTX/슬라이드 톤 (프롬프트/내보내기에서 사용) */
  template?: SlidesTemplate;
}

/**
 * 슬라이드 옵션을 안전하게 정규화합니다.
 * - invalid 값은 throw (API에서는 400으로 처리하기 위해)
 */
export function sanitizeSlidesOptions(raw: any): SlidesOptions | undefined {
  if (!raw || typeof raw !== 'object') return undefined;

  const out: SlidesOptions = {};

  if (raw.slideCount !== undefined) {
    const n = Number(raw.slideCount);
    if (!Number.isFinite(n)) {
      throw new Error('Invalid slideCount (number required)');
    }
    const intN = Math.floor(n);
    if (intN < 3 || intN > 15) {
      throw new Error('Invalid slideCount (must be between 3 and 15)');
    }
    out.slideCount = intN;
  }

  if (raw.template !== undefined) {
    const t = String(raw.template);
    if (t !== 'default' && t !== 'minimal' && t !== 'creative') {
      throw new Error('Invalid slides.template (default|minimal|creative)');
    }
    out.template = t as SlidesTemplate;
  }

  return Object.keys(out).length ? out : undefined;
}

export function resolveSlideCount(raw: any, fallback: number): number {
  const n = Number(raw);
  if (Number.isFinite(n) && n >= 3 && n <= 15) return Math.floor(n);
  return fallback;
}

export function resolveTemplate(raw: any): SlidesTemplate | undefined {
  const t = String(raw || '');
  if (t === 'default' || t === 'minimal' || t === 'creative') return t;
  return undefined;
}

