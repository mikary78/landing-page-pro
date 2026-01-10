import { query } from './database';

type ProjectStagesSchema = {
  hasAiModel: boolean;
  hasStageOrder: boolean;
};

let cached: ProjectStagesSchema | null = null;
let cachedAt = 0;

/**
 * project_stages의 컬럼 존재 여부를 캐시합니다.
 * - TTL을 둬서 컨테이너 재사용 시에도 최신 스키마 변경을 따라갈 수 있게 합니다.
 */
export async function getProjectStagesSchema(ttlMs = 60_000): Promise<ProjectStagesSchema> {
  const now = Date.now();
  if (cached && now - cachedAt < ttlMs) return cached;

  const rows = await query<{ column_name: string }>(
    `
    SELECT column_name
    FROM information_schema.columns
    WHERE table_name = 'project_stages'
      AND column_name IN ('ai_model', 'stage_order')
    `
  );

  const set = new Set(rows.map((r) => r.column_name));
  cached = {
    hasAiModel: set.has('ai_model'),
    hasStageOrder: set.has('stage_order'),
  };
  cachedAt = now;
  return cached;
}

