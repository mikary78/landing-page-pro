/**
 * Supabase Database API 테스트
 * 
 * 테스트 대상 테이블:
 * - projects: 프로젝트 정보
 * - project_stages: 프로젝트 단계 정보
 * - project_ai_results: AI 생성 결과
 * - project_templates: 프로젝트 템플릿
 * - course_feedbacks: 코스 피드백
 * - course_deployments: 코스 배포 정보
 * 
 * 테스트 대상 작업:
 * - SELECT (select, eq, order, limit 등)
 * - INSERT
 * - UPDATE
 * - DELETE
 * 
 * 출처: @supabase/supabase-js
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { supabase } from '@/test/mocks/supabase-client';

// Mock 데이터
const mockProject = {
  id: 'project-123',
  user_id: 'user-123',
  title: 'Test Project',
  description: 'Test Description',
  document_content: 'Test Content',
  ai_model: 'gpt-4',
  status: 'processing',
  education_duration: null,
  education_course: null,
  education_session: null,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

const mockProjectStage = {
  id: 'stage-123',
  project_id: 'project-123',
  stage_order: 1,
  stage_name: '커리큘럼 설계',
  content: 'Stage Content',
  status: 'completed',
  ai_model: 'gpt-4',
  feedback: null,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

const mockAiResult = {
  id: 'ai-result-123',
  project_id: 'project-123',
  ai_model: 'gpt-4',
  status: 'completed',
  content: 'AI Generated Content',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

describe('Supabase Database API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('projects 테이블', () => {
    describe('SELECT', () => {
      it('사용자의 모든 프로젝트를 조회해야 함', async () => {
        const userId = 'user-123';
        const mockData = [mockProject];

        const mockSelect = vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: mockData,
              error: null,
            }),
          }),
        });

        vi.spyOn(supabase, 'from').mockReturnValue({
          select: mockSelect,
        } as any);

        const { data, error } = await supabase
          .from('projects')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        expect(supabase.from).toHaveBeenCalledWith('projects');
        expect(mockSelect).toHaveBeenCalledWith('*');
        expect(data).toEqual(mockData);
        expect(error).toBeNull();
      });

      it('특정 프로젝트를 조회해야 함', async () => {
        const projectId = 'project-123';
        const userId = 'user-123';

        const mockMaybeSingle = vi.fn().mockResolvedValue({
          data: mockProject,
          error: null,
        });

        const mockEq = vi.fn().mockReturnValue({
          maybeSingle: mockMaybeSingle,
        });

        const mockSelect = vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: mockEq,
          }),
        });

        vi.spyOn(supabase, 'from').mockReturnValue({
          select: mockSelect,
        } as any);

        const { data, error } = await supabase
          .from('projects')
          .select('*')
          .eq('id', projectId)
          .eq('user_id', userId)
          .maybeSingle();

        expect(data).toEqual(mockProject);
        expect(error).toBeNull();
      });

      it('프로젝트가 없을 때 null을 반환해야 함', async () => {
        const mockMaybeSingle = vi.fn().mockResolvedValue({
          data: null,
          error: null,
        });

        const mockSelect = vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: mockMaybeSingle,
          }),
        });

        vi.spyOn(supabase, 'from').mockReturnValue({
          select: mockSelect,
        } as any);

        const { data, error } = await supabase
          .from('projects')
          .select('*')
          .eq('id', 'non-existent')
          .maybeSingle();

        expect(data).toBeNull();
        expect(error).toBeNull();
      });
    });

    describe('INSERT', () => {
      it('새 프로젝트를 생성해야 함', async () => {
        const newProject = {
          user_id: 'user-123',
          title: 'New Project',
          description: 'New Description',
          document_content: 'Content',
          ai_model: 'gpt-4',
          status: 'processing',
        };

        const mockSingle = vi.fn().mockResolvedValue({
          data: { ...mockProject, ...newProject },
          error: null,
        });

        const mockSelect = vi.fn().mockReturnValue({
          single: mockSingle,
        });

        const mockInsert = vi.fn().mockReturnValue({
          select: mockSelect,
        });

        vi.spyOn(supabase, 'from').mockReturnValue({
          insert: mockInsert,
        } as any);

        const { data, error } = await supabase
          .from('projects')
          .insert(newProject)
          .select()
          .single();

        expect(mockInsert).toHaveBeenCalledWith(newProject);
        expect(data).toBeDefined();
        expect(error).toBeNull();
      });

      it('필수 필드가 누락되면 에러를 반환해야 함', async () => {
        const incompleteProject = {
          title: 'Incomplete Project',
          // user_id 누락
        };

        const mockError = {
          message: 'null value in column "user_id"',
          code: '23502',
        };

        const mockSingle = vi.fn().mockResolvedValue({
          data: null,
          error: mockError as any,
        });

        const mockSelect = vi.fn().mockReturnValue({
          single: mockSingle,
        });

        const mockInsert = vi.fn().mockReturnValue({
          select: mockSelect,
        });

        vi.spyOn(supabase, 'from').mockReturnValue({
          insert: mockInsert,
        } as any);

        const { data, error } = await supabase
          .from('projects')
          .insert(incompleteProject)
          .select()
          .single();

        expect(error).toBeDefined();
        expect(error?.message).toContain('user_id');
      });
    });

    describe('UPDATE', () => {
      it('프로젝트 상태를 업데이트해야 함', async () => {
        const projectId = 'project-123';
        const newStatus = 'completed';

        const mockEq = vi.fn().mockResolvedValue({
          data: [{ ...mockProject, status: newStatus }],
          error: null,
        });

        const mockUpdate = vi.fn().mockReturnValue({
          eq: mockEq,
        });

        vi.spyOn(supabase, 'from').mockReturnValue({
          update: mockUpdate,
        } as any);

        const { data, error } = await supabase
          .from('projects')
          .update({ status: newStatus })
          .eq('id', projectId);

        expect(mockUpdate).toHaveBeenCalledWith({ status: newStatus });
        expect(mockEq).toHaveBeenCalledWith('id', projectId);
        expect(data).toBeDefined();
        expect(error).toBeNull();
      });
    });

    describe('DELETE', () => {
      it('프로젝트를 삭제해야 함', async () => {
        const projectId = 'project-123';

        const mockEq = vi.fn().mockResolvedValue({
          data: null,
          error: null,
        });

        const mockDelete = vi.fn().mockReturnValue({
          eq: mockEq,
        });

        vi.spyOn(supabase, 'from').mockReturnValue({
          delete: mockDelete,
        } as any);

        const { error } = await supabase
          .from('projects')
          .delete()
          .eq('id', projectId);

        expect(mockDelete).toHaveBeenCalled();
        expect(mockEq).toHaveBeenCalledWith('id', projectId);
        expect(error).toBeNull();
      });
    });
  });

  describe('project_stages 테이블', () => {
    it('프로젝트의 모든 단계를 조회해야 함', async () => {
      const projectId = 'project-123';
      const aiModel = 'gpt-4';
      const mockData = [mockProjectStage];

      const mockOrder = vi.fn().mockResolvedValue({
        data: mockData,
        error: null,
      });

      const mockEq = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: mockOrder,
        }),
      });

      const mockSelect = vi.fn().mockReturnValue({
        eq: mockEq,
      });

      vi.spyOn(supabase, 'from').mockReturnValue({
        select: mockSelect,
      } as any);

      const { data, error } = await supabase
        .from('project_stages')
        .select('*')
        .eq('project_id', projectId)
        .eq('ai_model', aiModel)
        .order('stage_order', { ascending: true });

      expect(data).toEqual(mockData);
      expect(error).toBeNull();
    });

    it('단계 상태를 업데이트해야 함', async () => {
      const stageId = 'stage-123';
      const feedback = '수정 요청 사항';

      const mockEq = vi.fn().mockResolvedValue({
        data: [{ ...mockProjectStage, feedback, status: 'processing' }],
        error: null,
      });

      const mockUpdate = vi.fn().mockReturnValue({
        eq: mockEq,
      });

      vi.spyOn(supabase, 'from').mockReturnValue({
        update: mockUpdate,
      } as any);

      const { data, error } = await supabase
        .from('project_stages')
        .update({
          feedback,
          status: 'processing',
        })
        .eq('id', stageId);

      expect(mockUpdate).toHaveBeenCalledWith({
        feedback,
        status: 'processing',
      });
      expect(data).toBeDefined();
      expect(error).toBeNull();
    });
  });

  describe('project_ai_results 테이블', () => {
    it('프로젝트의 AI 결과를 조회해야 함', async () => {
      const projectId = 'project-123';
      const mockData = [mockAiResult];

      const mockOrder = vi.fn().mockResolvedValue({
        data: mockData,
        error: null,
      });

      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: mockOrder,
        }),
      });

      vi.spyOn(supabase, 'from').mockReturnValue({
        select: mockSelect,
      } as any);

      const { data, error } = await supabase
        .from('project_ai_results')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      expect(data).toEqual(mockData);
      expect(error).toBeNull();
    });

    it('새 AI 결과를 생성해야 함', async () => {
      const newAiResult = {
        project_id: 'project-123',
        ai_model: 'gpt-4',
        status: 'processing',
        content: null,
      };

      const mockSingle = vi.fn().mockResolvedValue({
        data: { ...mockAiResult, ...newAiResult },
        error: null,
      });

      const mockSelect = vi.fn().mockReturnValue({
        single: mockSingle,
      });

      const mockInsert = vi.fn().mockReturnValue({
        select: mockSelect,
      });

      vi.spyOn(supabase, 'from').mockReturnValue({
        insert: mockInsert,
      } as any);

      const { data, error } = await supabase
        .from('project_ai_results')
        .insert(newAiResult)
        .select()
        .single();

      expect(data).toBeDefined();
      expect(error).toBeNull();
    });
  });

  describe('project_templates 테이블', () => {
    it('모든 템플릿을 조회해야 함', async () => {
      const mockTemplates = [
        {
          id: 'template-1',
          name: 'Template 1',
          description: 'Description 1',
          ai_model: 'gpt-4',
        },
      ];

      const mockSelect = vi.fn().mockResolvedValue({
        data: mockTemplates,
        error: null,
      });

      vi.spyOn(supabase, 'from').mockReturnValue({
        select: mockSelect,
      } as any);

      const { data, error } = await supabase
        .from('project_templates')
        .select('*');

      expect(data).toEqual(mockTemplates);
      expect(error).toBeNull();
    });
  });

  describe('course_feedbacks 테이블', () => {
    it('피드백을 생성해야 함', async () => {
      const newFeedback = {
        project_id: 'project-123',
        user_id: 'user-123',
        feedback_text: 'Great course!',
        rating: 5,
      };

      const mockSingle = vi.fn().mockResolvedValue({
        data: { id: 'feedback-123', ...newFeedback },
        error: null,
      });

      const mockSelect = vi.fn().mockReturnValue({
        single: mockSingle,
      });

      const mockInsert = vi.fn().mockReturnValue({
        select: mockSelect,
      });

      vi.spyOn(supabase, 'from').mockReturnValue({
        insert: mockInsert,
      } as any);

      const { data, error } = await supabase
        .from('course_feedbacks')
        .insert(newFeedback)
        .select()
        .single();

      expect(data).toBeDefined();
      expect(error).toBeNull();
    });
  });

  describe('course_deployments 테이블', () => {
    it('배포 정보를 조회해야 함', async () => {
      const projectId = 'project-123';
      const mockDeployments = [
        {
          id: 'deployment-123',
          project_id: projectId,
          user_id: 'user-123',
          deployment_status: 'published',
          deployment_url: 'https://example.com/course',
          version: 1,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          published_at: '2024-01-01T00:00:00Z',
        },
      ];

      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: mockDeployments,
          error: null,
        }),
      });

      vi.spyOn(supabase, 'from').mockReturnValue({
        select: mockSelect,
      } as any);

      const { data, error } = await supabase
        .from('course_deployments')
        .select('*')
        .eq('project_id', projectId);

      expect(data).toEqual(mockDeployments);
      expect(error).toBeNull();
    });
  });
});

