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
// import { supabase } from "@/integrations/supabase/client";
// import { Enums } from "@/integrations/supabase/types";
// import { toast } from "sonner";

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
      
      // TODO: Azure Functions API로 사용자 역할 가져오기
      // 현재는 Supabase 연결이 불가능하므로 기본값 반환
      // 
      // 예시:
      // const { data, error } = await callAzureFunction('/api/getUserRoles', 'GET');
      // if (error) throw error;
      // setRoles(data.roles || []);
      
      // 임시: 빈 배열 반환 (에러 없이 처리)
      console.log('[useUserRole] User roles API not implemented yet, returning empty roles');
      setRoles([]);
      
      // Supabase 호출 제거 (Azure 인증 전환으로 연결 불가)
      // const { data, error } = await supabase
      //   .from("user_roles")
      //   .select("role")
      //   .eq("user_id", userId);
      // 
      // if (error) {
      //   throw error;
      // }
      // 
      // const mappedRoles = (data || []).map((row) => row.role as AppRole);
      // setRoles(mappedRoles);
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


