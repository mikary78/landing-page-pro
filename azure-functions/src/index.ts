/**
 * Azure Functions Entry Point
 * Import all function modules to register them
 */

import './functions/hello';
import './functions/processDocument';
import './functions/generateCurriculum';
import './functions/runMigration';
import './functions/getProjects';
import './functions/getCourses';
import './functions/getCourse';
import './functions/getTemplates';
import './functions/createProject';
import './functions/createCourse';
import './functions/deleteProject';
import './functions/deleteCourse';
import './functions/getStats';

// Module/Lesson Management APIs
import './functions/getModulesWithLessons';
import './functions/createModule';
import './functions/updateModule';
import './functions/createLesson';
import './functions/updateLesson';

// Lesson Detail & Project APIs
import './functions/getLessonDetail';
import './functions/getProjectStages';
import './functions/createLessonProject';
import './functions/getProjectDetail';
import './functions/updateProjectStage';
import './functions/updateProject';
import './functions/saveTemplate';

// Public & Deployment APIs
import './functions/getCoursePublic';
import './functions/deploymentApi';
import './functions/feedbackApi';

// Migrations
import './functions/addAiModelColumn';
