/**
 * Fix Foreign Keys
 * Add foreign key constraints that failed during migration
 */

export const fixForeignKeysSQL = `
-- Add foreign key constraints
ALTER TABLE user_roles DROP CONSTRAINT IF EXISTS fk_user_roles_user_id;
ALTER TABLE user_roles ADD CONSTRAINT fk_user_roles_user_id
  FOREIGN KEY (user_id) REFERENCES profiles(user_id) ON DELETE CASCADE;

ALTER TABLE projects DROP CONSTRAINT IF EXISTS fk_projects_user_id;
ALTER TABLE projects ADD CONSTRAINT fk_projects_user_id
  FOREIGN KEY (user_id) REFERENCES profiles(user_id) ON DELETE CASCADE;

ALTER TABLE project_stages DROP CONSTRAINT IF EXISTS fk_project_stages_project_id;
ALTER TABLE project_stages ADD CONSTRAINT fk_project_stages_project_id
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;

ALTER TABLE project_ai_results DROP CONSTRAINT IF EXISTS fk_project_ai_results_project_id;
ALTER TABLE project_ai_results ADD CONSTRAINT fk_project_ai_results_project_id
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;

ALTER TABLE project_templates DROP CONSTRAINT IF EXISTS fk_project_templates_user_id;
ALTER TABLE project_templates ADD CONSTRAINT fk_project_templates_user_id
  FOREIGN KEY (user_id) REFERENCES profiles(user_id) ON DELETE CASCADE;

ALTER TABLE course_deployments DROP CONSTRAINT IF EXISTS fk_course_deployments_project_id;
ALTER TABLE course_deployments ADD CONSTRAINT fk_course_deployments_project_id
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;

ALTER TABLE course_feedbacks DROP CONSTRAINT IF EXISTS fk_course_feedbacks_project_id;
ALTER TABLE course_feedbacks ADD CONSTRAINT fk_course_feedbacks_project_id
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;

ALTER TABLE course_feedbacks DROP CONSTRAINT IF EXISTS fk_course_feedbacks_user_id;
ALTER TABLE course_feedbacks ADD CONSTRAINT fk_course_feedbacks_user_id
  FOREIGN KEY (user_id) REFERENCES profiles(user_id) ON DELETE SET NULL;

ALTER TABLE courses DROP CONSTRAINT IF EXISTS fk_courses_owner_id;
ALTER TABLE courses ADD CONSTRAINT fk_courses_owner_id
  FOREIGN KEY (owner_id) REFERENCES profiles(user_id) ON DELETE CASCADE;

ALTER TABLE course_modules DROP CONSTRAINT IF EXISTS fk_course_modules_course_id;
ALTER TABLE course_modules ADD CONSTRAINT fk_course_modules_course_id
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE;

ALTER TABLE lessons DROP CONSTRAINT IF EXISTS fk_lessons_module_id;
ALTER TABLE lessons ADD CONSTRAINT fk_lessons_module_id
  FOREIGN KEY (module_id) REFERENCES course_modules(id) ON DELETE CASCADE;

ALTER TABLE lessons DROP CONSTRAINT IF EXISTS fk_lessons_project_id;
ALTER TABLE lessons ADD CONSTRAINT fk_lessons_project_id
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL;
`;
