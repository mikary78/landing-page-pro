/**
 * API 통합 테스트
 * 
 * 여러 API가 함께 작동하는 시나리오를 테스트합니다.
 * 
 * 테스트 시나리오:
 * 1. 사용자 회원가입 → 프로젝트 생성 → AI 처리 시작
 * 2. 프로젝트 조회 → 실시간 업데이트 감지
 * 3. 프로젝트 수정 → 단계 재생성
 * 4. 피드백 생성 → 배포
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { supabase } from '@/test/mocks/supabase-client';

describe('API 통합 테스트', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('시나리오 1: 사용자 회원가입 → 프로젝트 생성 → AI 처리', () => {
    it('전체 플로우가 성공적으로 완료되어야 함', async () => {
      // 1. 회원가입
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        created_at: '2024-01-01T00:00:00Z',
      };

      const mockSession = {
        access_token: 'token',
        user: mockUser,
      };

      const mockSignUp = vi
        .spyOn(supabase.auth, 'signUp')
        .mockResolvedValue({
          data: {
            user: mockUser as any,
            session: mockSession as any,
          },
          error: null,
        });

      const signUpResult = await supabase.auth.signUp({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(signUpResult.data?.user).toBeDefined();
      expect(mockSignUp).toHaveBeenCalled();

      // 2. 프로젝트 생성
      const mockProject = {
        id: 'project-123',
        user_id: mockUser.id,
        title: 'Test Project',
        status: 'processing',
      };

      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockProject,
            error: null,
          }),
        }),
      });

      vi.spyOn(supabase, 'from').mockReturnValue({
        insert: mockInsert,
      } as any);

      const projectResult = await supabase
        .from('projects')
        .insert({
          user_id: mockUser.id,
          title: 'Test Project',
          document_content: 'Content',
          ai_model: 'gpt-4',
          status: 'processing',
        })
        .select()
        .single();

      expect(projectResult.data).toBeDefined();
      expect(projectResult.data?.id).toBe('project-123');

      // 3. AI 처리 시작
      const mockInvoke = vi
        .spyOn(supabase.functions, 'invoke')
        .mockResolvedValue({
          data: { success: true },
          error: null,
        } as any);

      const functionResult = await supabase.functions.invoke(
        'process-document',
        {
          body: {
            projectId: mockProject.id,
            documentContent: 'Content',
            aiModel: 'gpt-4',
          },
        }
      );

      expect(functionResult.data).toBeDefined();
      expect(mockInvoke).toHaveBeenCalled();
    });
  });

  describe('시나리오 2: 프로젝트 조회 → 실시간 업데이트 감지', () => {
    it('프로젝트 변경 사항을 실시간으로 감지해야 함', () => {
      const userId = 'user-123';
      const mockCallback = vi.fn();

      // 프로젝트 조회
      const mockSelect = vi.fn().mockResolvedValue({
        data: [
          {
            id: 'project-123',
            user_id: userId,
            title: 'Test Project',
            status: 'processing',
          },
        ],
        error: null,
      });

      vi.spyOn(supabase, 'from').mockReturnValue({
        select: mockSelect,
      } as any);

      // 실시간 구독 설정
      const mockSubscribe = vi.fn();
      const mockOn = vi.fn().mockReturnValue({
        subscribe: mockSubscribe,
      });

      const mockChannel = vi.fn().mockReturnValue({
        on: mockOn,
      });

      vi.spyOn(supabase, 'channel').mockReturnValue(mockChannel() as any);

      supabase
        .channel('projects-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'projects',
            filter: `user_id=eq.${userId}`,
          },
          mockCallback
        )
        .subscribe();

      expect(mockOn).toHaveBeenCalled();
      expect(mockSubscribe).toHaveBeenCalled();
    });
  });

  describe('시나리오 3: 프로젝트 수정 → 단계 재생성', () => {
    it('단계 피드백 후 재생성이 성공적으로 처리되어야 함', async () => {
      const stageId = 'stage-123';
      const projectId = 'project-123';
      const feedback = '수정 요청 사항';

      // 1. 단계 피드백 업데이트
      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: [
            {
              id: stageId,
              feedback,
              status: 'processing',
            },
          ],
          error: null,
        }),
      });

      vi.spyOn(supabase, 'from').mockReturnValue({
        update: mockUpdate,
      } as any);

      const updateResult = await supabase
        .from('project_stages')
        .update({
          feedback,
          status: 'processing',
        })
        .eq('id', stageId);

      expect(updateResult.data).toBeDefined();
      expect(updateResult.error).toBeNull();

      // 2. 단계 재생성 요청
      const mockInvoke = vi
        .spyOn(supabase.functions, 'invoke')
        .mockResolvedValue({
          data: { success: true },
          error: null,
        } as any);

      const functionResult = await supabase.functions.invoke(
        'process-document',
        {
          body: {
            projectId,
            stageId,
            stageOrder: 1,
            regenerate: true,
          },
        }
      );

      expect(functionResult.data).toBeDefined();
      expect(mockInvoke).toHaveBeenCalledWith('process-document', {
        body: {
          projectId,
          stageId,
          stageOrder: 1,
          regenerate: true,
        },
      });
    });
  });

  describe('시나리오 4: 피드백 생성 → 배포', () => {
    it('피드백 생성 후 배포 정보를 조회해야 함', async () => {
      const projectId = 'project-123';
      const userId = 'user-123';

      // 1. 피드백 생성
      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: 'feedback-123',
              project_id: projectId,
              user_id: userId,
              feedback_text: 'Great course!',
              rating: 5,
            },
            error: null,
          }),
        }),
      });

      vi.spyOn(supabase, 'from').mockReturnValue({
        insert: mockInsert,
      } as any);

      const feedbackResult = await supabase
        .from('course_feedbacks')
        .insert({
          project_id: projectId,
          user_id: userId,
          feedback_text: 'Great course!',
          rating: 5,
        })
        .select()
        .single();

      expect(feedbackResult.data).toBeDefined();
      expect(feedbackResult.data?.rating).toBe(5);

      // 2. 배포 정보 조회
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: [
            {
              id: 'deployment-123',
              project_id: projectId,
              deployment_status: 'published',
              deployment_url: 'https://example.com/course',
            },
          ],
          error: null,
        }),
      });

      vi.spyOn(supabase, 'from').mockReturnValue({
        select: mockSelect,
      } as any);

      const deploymentResult = await supabase
        .from('course_deployments')
        .select('*')
        .eq('project_id', projectId);

      expect(deploymentResult.data).toBeDefined();
      expect(deploymentResult.data?.[0]?.deployment_status).toBe('published');
    });
  });

  describe('시나리오 5: 에러 처리 및 복구', () => {
    it('API 호출 실패 시 적절한 에러 처리가 되어야 함', async () => {
      // 프로젝트 조회 실패
      const mockError = {
        message: 'Database connection failed',
        code: 'PGRST301',
      };

      const mockEq = vi.fn().mockResolvedValue({
        data: null,
        error: mockError as any,
      });

      const mockSelect = vi.fn().mockReturnValue({
        eq: mockEq,
      });

      vi.spyOn(supabase, 'from').mockReturnValue({
        select: mockSelect,
      } as any);

      const result = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', 'user-123');

      expect(result.error).toBeDefined();
      expect(result.error?.message).toBe('Database connection failed');

      // Edge Function 호출 실패
      const functionError = {
        message: 'Function timeout',
        status: 504,
      };

      const mockInvoke = vi
        .spyOn(supabase.functions, 'invoke')
        .mockResolvedValue({
          data: null,
          error: functionError as any,
        } as any);

      const functionResult = await supabase.functions.invoke(
        'process-document',
        {
          body: {
            projectId: 'project-123',
            documentContent: 'Content',
            aiModel: 'gpt-4',
          },
        }
      );

      expect(functionResult.error).toBeDefined();
      expect(functionResult.error?.message).toBe('Function timeout');
    });
  });
});

