/**
 * Curriculum 컴포넌트용 타입 정의
 */

export interface SessionPlan {
  sessionNumber: number;
  title: string;
  duration: string;
  keyTopics: string[];
  learningObjectives: string[];
  expectedOutcome: string;
}

export interface CurriculumData {
  title: string;
  totalDuration: string;
  targetAudienceAnalysis: string;
  learningObjectives: string[];
  sessions: SessionPlan[];
  prerequisites: string[];
  assessmentStrategy: string;
}
