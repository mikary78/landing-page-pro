import { describe, expect, it } from 'vitest';
import { planGenerationSteps } from '../src/lib/agent/plan';

describe('planGenerationSteps', () => {
  it('should always include interpret first', () => {
    const steps = planGenerationSteps({ document: true }, {});
    expect(steps[0].stepType).toBe('interpret');
  });

  it('should include requested outputs in order', () => {
    const steps = planGenerationSteps({ document: true, infographic: true, slides: true }, {});
    const types = steps.map((s) => s.stepType);
    expect(types).toEqual([
      'interpret',
      'generate_document',
      'generate_infographic',
      'generate_slides',
    ]);
  });

  it('should include web_search when enabled', () => {
    const steps = planGenerationSteps({ document: true }, { enableWebSearch: true });
    expect(steps.map((s) => s.stepType)).toEqual(['interpret', 'web_search', 'generate_document']);
  });

  it('should include design_assets when image generation enabled and any output selected', () => {
    const steps = planGenerationSteps({ infographic: true }, { enableImageGeneration: true });
    expect(steps.map((s) => s.stepType)).toEqual(['interpret', 'generate_infographic', 'design_assets']);
  });
});

