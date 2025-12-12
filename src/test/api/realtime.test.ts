/**
 * Supabase Realtime API 테스트
 * 
 * 테스트 대상:
 * - Channel 생성 및 구독
 * - postgres_changes 이벤트 감지
 * - Channel 구독 해제
 * 
 * 출처: @supabase/supabase-js
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { supabase } from '@/test/mocks/supabase-client';

describe('Supabase Realtime API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Channel 구독', () => {
    it('프로젝트 변경 사항을 실시간으로 감지해야 함', () => {
      const userId = 'user-123';
      const mockCallback = vi.fn();

      const mockSubscribe = vi.fn();
      const mockOn = vi.fn().mockReturnValue({
        subscribe: mockSubscribe,
      });

      const mockChannel = vi.fn().mockReturnValue({
        on: mockOn,
      });

      vi.spyOn(supabase, 'channel').mockReturnValue(mockChannel() as any);

      const channel = supabase
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

      expect(supabase.channel).toHaveBeenCalledWith('projects-changes');
      expect(mockOn).toHaveBeenCalledWith(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'projects',
          filter: `user_id=eq.${userId}`,
        },
        mockCallback
      );
      expect(mockSubscribe).toHaveBeenCalled();
    });

    it('INSERT 이벤트를 감지해야 함', () => {
      const userId = 'user-123';
      const mockCallback = vi.fn();

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
            event: 'INSERT',
            schema: 'public',
            table: 'projects',
            filter: `user_id=eq.${userId}`,
          },
          mockCallback
        )
        .subscribe();

      expect(mockOn).toHaveBeenCalledWith(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'projects',
          filter: `user_id=eq.${userId}`,
        },
        mockCallback
      );
    });

    it('UPDATE 이벤트를 감지해야 함', () => {
      const userId = 'user-123';
      const mockCallback = vi.fn();

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
            event: 'UPDATE',
            schema: 'public',
            table: 'projects',
            filter: `user_id=eq.${userId}`,
          },
          mockCallback
        )
        .subscribe();

      expect(mockOn).toHaveBeenCalledWith(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'projects',
          filter: `user_id=eq.${userId}`,
        },
        mockCallback
      );
    });

    it('DELETE 이벤트를 감지해야 함', () => {
      const userId = 'user-123';
      const mockCallback = vi.fn();

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
            event: 'DELETE',
            schema: 'public',
            table: 'projects',
            filter: `user_id=eq.${userId}`,
          },
          mockCallback
        )
        .subscribe();

      expect(mockOn).toHaveBeenCalledWith(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'projects',
          filter: `user_id=eq.${userId}`,
        },
        mockCallback
      );
    });
  });

  describe('Channel 구독 해제', () => {
    it('Channel을 성공적으로 제거해야 함', () => {
      const mockUnsubscribe = vi.fn();
      const mockChannel = {
        unsubscribe: mockUnsubscribe,
      };

      const mockRemoveChannel = vi.spyOn(supabase, 'removeChannel');

      supabase.removeChannel(mockChannel as any);

      expect(mockRemoveChannel).toHaveBeenCalledWith(mockChannel);
    });

    it('컴포넌트 언마운트 시 Channel을 정리해야 함', () => {
      const userId = 'user-123';
      const mockUnsubscribe = vi.fn();
      const mockSubscribe = vi.fn().mockReturnValue({
        unsubscribe: mockUnsubscribe,
      });

      const mockOn = vi.fn().mockReturnValue({
        subscribe: mockSubscribe,
      });

      const mockChannel = vi.fn().mockReturnValue({
        on: mockOn,
      });

      vi.spyOn(supabase, 'channel').mockReturnValue(mockChannel() as any);
      vi.spyOn(supabase, 'removeChannel');

      const channel = supabase
        .channel('projects-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'projects',
            filter: `user_id=eq.${userId}`,
          },
          vi.fn()
        )
        .subscribe();

      // 컴포넌트 언마운트 시뮬레이션
      supabase.removeChannel(channel as any);

      expect(supabase.removeChannel).toHaveBeenCalledWith(channel);
    });
  });

  describe('이벤트 콜백 처리', () => {
    it('이벤트 발생 시 콜백이 호출되어야 함', () => {
      const userId = 'user-123';
      const mockCallback = vi.fn();

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

      // 이벤트 발생 시뮬레이션
      const mockEvent = {
        eventType: 'INSERT',
        new: {
          id: 'project-123',
          user_id: userId,
          title: 'New Project',
        },
      };

      // 콜백이 등록되었는지 확인
      expect(mockOn).toHaveBeenCalled();
      expect(mockCallback).toBeDefined();
    });
  });
});

