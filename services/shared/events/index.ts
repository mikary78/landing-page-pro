/**
 * 공유 이벤트 타입 정의
 * 
 * 모든 마이크로서비스에서 사용하는 이벤트 타입을 정의합니다.
 * Azure Service Bus를 통해 전달되는 이벤트의 스키마입니다.
 */

// ============================================
// Base Event Interface
// ============================================

export interface BaseEvent {
  /** 이벤트 고유 ID */
  id: string;
  /** 이벤트 타입 */
  type: string;
  /** 이벤트 발생 시간 (ISO 8601) */
  timestamp: string;
  /** 이벤트 버전 */
  version: string;
  /** 상관관계 ID (요청 추적용) */
  correlationId?: string;
  /** 이벤트 발생 서비스 */
  source: string;
}

// ============================================
// Project Events
// ============================================

export interface ProjectCreatedEvent extends BaseEvent {
  type: 'PROJECT_CREATED';
  payload: {
    projectId: string;
    userId: string;
    title: string;
    description?: string;
  };
}

export interface ProjectUpdatedEvent extends BaseEvent {
  type: 'PROJECT_UPDATED';
  payload: {
    projectId: string;
    userId: string;
    changes: Record<string, unknown>;
  };
}

export interface ProjectDeletedEvent extends BaseEvent {
  type: 'PROJECT_DELETED';
  payload: {
    projectId: string;
    userId: string;
  };
}

export interface ProjectStageUpdatedEvent extends BaseEvent {
  type: 'PROJECT_STAGE_UPDATED';
  payload: {
    projectId: string;
    stageId: string;
    stageName: string;
    status: string;
  };
}

export type ProjectEvent = 
  | ProjectCreatedEvent 
  | ProjectUpdatedEvent 
  | ProjectDeletedEvent 
  | ProjectStageUpdatedEvent;

// ============================================
// Course Events
// ============================================

export interface CourseCreatedEvent extends BaseEvent {
  type: 'COURSE_CREATED';
  payload: {
    courseId: string;
    projectId?: string;
    userId: string;
    title: string;
  };
}

export interface CourseUpdatedEvent extends BaseEvent {
  type: 'COURSE_UPDATED';
  payload: {
    courseId: string;
    changes: Record<string, unknown>;
  };
}

export interface CourseDeletedEvent extends BaseEvent {
  type: 'COURSE_DELETED';
  payload: {
    courseId: string;
    userId: string;
  };
}

export interface ModuleCreatedEvent extends BaseEvent {
  type: 'MODULE_CREATED';
  payload: {
    moduleId: string;
    courseId: string;
    title: string;
    orderIndex: number;
  };
}

export interface LessonCreatedEvent extends BaseEvent {
  type: 'LESSON_CREATED';
  payload: {
    lessonId: string;
    moduleId: string;
    courseId: string;
    title: string;
  };
}

export interface LessonUpdatedEvent extends BaseEvent {
  type: 'LESSON_UPDATED';
  payload: {
    lessonId: string;
    changes: Record<string, unknown>;
  };
}

export type CourseEvent = 
  | CourseCreatedEvent 
  | CourseUpdatedEvent 
  | CourseDeletedEvent
  | ModuleCreatedEvent
  | LessonCreatedEvent
  | LessonUpdatedEvent;

// ============================================
// AI Events
// ============================================

export interface CurriculumGenerationRequestedEvent extends BaseEvent {
  type: 'CURRICULUM_GENERATION_REQUESTED';
  payload: {
    requestId: string;
    courseId: string;
    userId: string;
    prompt: string;
    model: 'gemini' | 'openai' | 'anthropic';
  };
}

export interface CurriculumGeneratedEvent extends BaseEvent {
  type: 'CURRICULUM_GENERATED';
  payload: {
    requestId: string;
    courseId: string;
    modulesCount: number;
    lessonsCount: number;
    processingTimeMs: number;
  };
}

export interface CurriculumGenerationFailedEvent extends BaseEvent {
  type: 'CURRICULUM_GENERATION_FAILED';
  payload: {
    requestId: string;
    courseId: string;
    error: string;
    errorCode: string;
  };
}

export interface DocumentProcessedEvent extends BaseEvent {
  type: 'DOCUMENT_PROCESSED';
  payload: {
    documentId: string;
    projectId: string;
    fileName: string;
    pageCount: number;
    extractedText?: boolean;
  };
}

export type AIEvent = 
  | CurriculumGenerationRequestedEvent 
  | CurriculumGeneratedEvent 
  | CurriculumGenerationFailedEvent
  | DocumentProcessedEvent;

// ============================================
// User Events
// ============================================

export interface UserCreatedEvent extends BaseEvent {
  type: 'USER_CREATED';
  payload: {
    userId: string;
    email: string;
    role: string;
  };
}

export interface UserUpdatedEvent extends BaseEvent {
  type: 'USER_UPDATED';
  payload: {
    userId: string;
    changes: Record<string, unknown>;
  };
}

export interface UserDeletedEvent extends BaseEvent {
  type: 'USER_DELETED';
  payload: {
    userId: string;
  };
}

export type UserEvent = 
  | UserCreatedEvent 
  | UserUpdatedEvent 
  | UserDeletedEvent;

// ============================================
// Template Events
// ============================================

export interface TemplateCreatedEvent extends BaseEvent {
  type: 'TEMPLATE_CREATED';
  payload: {
    templateId: string;
    userId: string;
    name: string;
    category: string;
  };
}

export interface TemplateUpdatedEvent extends BaseEvent {
  type: 'TEMPLATE_UPDATED';
  payload: {
    templateId: string;
    changes: Record<string, unknown>;
  };
}

export type TemplateEvent = 
  | TemplateCreatedEvent 
  | TemplateUpdatedEvent;

// ============================================
// All Events Union Type
// ============================================

export type DomainEvent = 
  | ProjectEvent 
  | CourseEvent 
  | AIEvent 
  | UserEvent 
  | TemplateEvent;

// ============================================
// Event Topics (Service Bus Topics)
// ============================================

export const EVENT_TOPICS = {
  PROJECT: 'project-events',
  COURSE: 'course-events',
  AI: 'ai-events',
  USER: 'user-events',
  TEMPLATE: 'template-events',
} as const;

export type EventTopic = typeof EVENT_TOPICS[keyof typeof EVENT_TOPICS];

// ============================================
// Helper Functions
// ============================================

/**
 * 이벤트 생성 헬퍼 함수
 */
export function createEvent<T extends DomainEvent>(
  type: T['type'],
  payload: T['payload'],
  source: string,
  correlationId?: string
): T {
  return {
    id: crypto.randomUUID(),
    type,
    timestamp: new Date().toISOString(),
    version: '1.0',
    source,
    correlationId,
    payload,
  } as T;
}

/**
 * 이벤트에서 토픽 결정
 */
export function getTopicForEvent(event: DomainEvent): EventTopic {
  if (event.type.startsWith('PROJECT')) return EVENT_TOPICS.PROJECT;
  if (event.type.startsWith('COURSE') || event.type.startsWith('MODULE') || event.type.startsWith('LESSON')) {
    return EVENT_TOPICS.COURSE;
  }
  if (event.type.startsWith('CURRICULUM') || event.type.startsWith('DOCUMENT')) {
    return EVENT_TOPICS.AI;
  }
  if (event.type.startsWith('USER')) return EVENT_TOPICS.USER;
  if (event.type.startsWith('TEMPLATE')) return EVENT_TOPICS.TEMPLATE;
  
  throw new Error(`Unknown event type: ${event.type}`);
}
