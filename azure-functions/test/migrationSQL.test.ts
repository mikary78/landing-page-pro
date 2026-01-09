import { describe, expect, it } from 'vitest';
import { migrationSQL } from '../src/lib/migrationSQL';

describe('migrationSQL', () => {
  it('should include project_stages ai_model/stage_order official migration', () => {
    expect(migrationSQL).toContain('ALTER TABLE project_stages ADD COLUMN IF NOT EXISTS ai_model');
    expect(migrationSQL).toContain('ALTER TABLE project_stages ADD COLUMN IF NOT EXISTS stage_order');
    expect(migrationSQL).toContain('UPDATE project_stages SET stage_order = order_index');
  });
});

