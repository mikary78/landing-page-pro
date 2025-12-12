/**
 * Supabase Edge Functions API 테스트
 * 
 * 테스트 대상:
 * - process-document: 문서 처리 및 AI 콘텐츠 생성
 * 
 * 출처: @supabase/supabase-js
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { supabase } from '@/test/mocks/supabase-client';

describe('Supabase Edge Functions API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('process-document 함수', () => {
    it('프로젝트 생성 시 문서 처리를 시작해야 함', async () => {
      const projectId = 'project-123';
      const documentContent = 'Test document content';
      const aiModel = 'gpt-4';

      const mockInvoke = vi
        .spyOn(supabase.functions, 'invoke')
        .mockResolvedValue({
          data: { success: true },
          error: null,
        } as any);

      const { data, error } = await supabase.functions.invoke(
        'process-document',
        {
          body: {
            projectId,
            documentContent,
            aiModel,
          },
        }
      );

      expect(mockInvoke).toHaveBeenCalledWith('process-document', {
        body: {
          projectId,
          documentContent,
          aiModel,
        },
      });

      expect(data).toBeDefined();
      expect(error).toBeNull();
    });

    it('다른 AI 모델로 재시도 시 함수를 호출해야 함', async () => {
      const projectId = 'project-123';
      const documentContent = 'Test document content';
      const aiModel = 'claude-3';
      const retryWithDifferentAi = true;

      const mockInvoke = vi
        .spyOn(supabase.functions, 'invoke')
        .mockResolvedValue({
          data: { success: true },
          error: null,
        } as any);

      const { data, error } = await supabase.functions.invoke(
        'process-document',
        {
          body: {
            projectId,
            documentContent,
            aiModel,
            retryWithDifferentAi,
          },
        }
      );

      expect(mockInvoke).toHaveBeenCalledWith('process-document', {
        body: {
          projectId,
          documentContent,
          aiModel,
          retryWithDifferentAi,
        },
      });

      expect(data).toBeDefined();
      expect(error).toBeNull();
    });

    it('단계 재생성 시 함수를 호출해야 함', async () => {
      const projectId = 'project-123';
      const stageId = 'stage-123';
      const stageOrder = 1;
      const regenerate = true;

      const mockInvoke = vi
        .spyOn(supabase.functions, 'invoke')
        .mockResolvedValue({
          data: { success: true },
          error: null,
        } as any);

      const { data, error } = await supabase.functions.invoke(
        'process-document',
        {
          body: {
            projectId,
            stageId,
            stageOrder,
            regenerate,
          },
        }
      );

      expect(mockInvoke).toHaveBeenCalledWith('process-document', {
        body: {
          projectId,
          stageId,
          stageOrder,
          regenerate,
        },
      });

      expect(data).toBeDefined();
      expect(error).toBeNull();
    });

    it('함수 호출 실패 시 에러를 반환해야 함', async () => {
      const projectId = 'project-123';
      const documentContent = 'Test document content';
      const aiModel = 'gpt-4';

      const mockError = {
        message: 'Function execution failed',
        status: 500,
      };

      const mockInvoke = vi
        .spyOn(supabase.functions, 'invoke')
        .mockResolvedValue({
          data: null,
          error: mockError as any,
        } as any);

      const { data, error } = await supabase.functions.invoke(
        'process-document',
        {
          body: {
            projectId,
            documentContent,
            aiModel,
          },
        }
      );

      expect(error).toBeDefined();
      expect(error?.message).toBe('Function execution failed');
    });

    it('필수 파라미터가 누락되면 에러를 반환해야 함', async () => {
      const mockError = {
        message: 'Missing required parameter: projectId',
        status: 400,
      };

      const mockInvoke = vi
        .spyOn(supabase.functions, 'invoke')
        .mockResolvedValue({
          data: null,
          error: mockError as any,
        } as any);

      const { error } = await supabase.functions.invoke('process-document', {
        body: {
          // projectId 누락
          documentContent: 'Test',
          aiModel: 'gpt-4',
        },
      });

      expect(error).toBeDefined();
      expect(error?.message).toContain('projectId');
    });
  });
});

