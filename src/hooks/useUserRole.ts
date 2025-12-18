import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Enums } from "@/integrations/supabase/types";
import { toast } from "sonner";

type AppRole = Enums<"app_role">;

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
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);

      if (error) {
        throw error;
      }

      const mappedRoles = (data || []).map((row) => row.role as AppRole);
      setRoles(mappedRoles);
    } catch (error) {
      console.error("Failed to fetch user roles", error);
      toast.error("역할 정보를 불러오는 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.");
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


