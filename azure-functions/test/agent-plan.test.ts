import { describe, expect, it } from 'vitest';
import { planGenerationSteps } from '../src/lib/agent/plan';

describe('planGenerationSteps', () => {
  it('should use the 6-stage pipeline by default (starts with curriculum_design)', () => {
    const steps = planGenerationSteps({ document: true }, {});
    expect(steps[0].stepType).toBe('curriculum_design');
  });

  it('should include web_search first when enabled (6-stage default)', () => {
    const steps = planGenerationSteps({ document: true }, { enableWebSearch: true });
    expect(steps.map((s) => s.stepType).slice(0, 2)).toEqual(['web_search', 'curriculum_design']);
  });

  it('should append optional infographic + design_assets after the fixed 6 stages', () => {
    const steps = planGenerationSteps(
      { infographic: true },
      { enableWebSearch: true, enableImageGeneration: true }
    );
    expect(steps.map((s) => s.stepType)).toEqual([
      'web_search',
      'curriculum_design',
      'lesson_plan',
      'slides',
      'lab_template',
      'assessment',
      'final_review',
      'generate_infographic',
      'design_assets',
    ]);
  });

  it('should support legacy pipeline when useSixStagePipeline is false', () => {
    const steps = planGenerationSteps(
      { document: true, slides: true },
      { useSixStagePipeline: false, enableWebSearch: true, enableImageGeneration: true }
    );
    expect(steps.map((s) => s.stepType)).toEqual([
      'interpret',
      'web_search',
      'generate_document',
      'generate_slides',
      'design_assets',
    ]);
  });
});

