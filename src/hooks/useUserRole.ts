/**
 * 사용자 역할 Hook
 * 
 * 수정일: 2025-12-31
 * 수정 내용: Azure 인증 전환으로 인해 Supabase 연결이 불가능하므로,
 *            에러를 조용히 처리하고 기본값 반환
 * 
 * TODO: Azure Functions API 엔드포인트 추가 필요
 */

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

// Supabase 타입 대신 직접 정의
type AppRole = "admin" | "moderator" | "user";

interface UseUserRoleResult {
  roles: AppRole[];
  isAdmin: boolean;
  loading: boolean;
  refresh: () => Promise<void>;
}

export const useUserRole = (userId?: string): UseUserRoleResult => {
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState<boolean>(!!userId);

  const fetchRoles = useCallback(async () => {
    if (!userId) {
      setRoles([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // NOTE:
      // - Admin 페이지/기존 기능에서 Supabase를 사용하고 있어 역할 조회도 Supabase로 수행합니다.
      // - Supabase 연결이 불가능한 환경(예: Azure Auth 전환 중)에서는 catch로 떨어져 빈 roles를 반환합니다.
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);

      if (error) {
        throw error;
      }

      const mappedRoles = (data || []).map((row: any) => row.role as AppRole);
      setRoles(mappedRoles);
    } catch (error) {
      // 에러를 조용히 처리 (Supabase 연결 실패는 예상된 동작)
      console.warn('[useUserRole] Failed to fetch user roles (expected with Azure auth):', error);
      setRoles([]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  return {
    roles,
    isAdmin: roles.includes("admin"),
    loading,
    refresh: fetchRoles,
  };
};


