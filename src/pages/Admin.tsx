import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { Enums, Tables } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Shield, Users, LayoutDashboard, BookOpen, FolderOpen } from "lucide-react";
import { toast } from "sonner";

type Project = Tables<"projects">;
type Course = Tables<"courses">;
type Profile = Tables<"profiles">;
type AppRole = Enums<"app_role">;

interface RoleAssignment {
  userId: string;
  role: AppRole;
  displayName: string;
}

const Admin = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { isAdmin, loading: roleLoading, refresh: refreshRoles } = useUserRole(user?.id);

  const [stats, setStats] = useState({ users: 0, projects: 0, courses: 0 });
  const [recentProjects, setRecentProjects] = useState<Project[]>([]);
  const [recentCourses, setRecentCourses] = useState<Course[]>([]);
  const [roleAssignments, setRoleAssignments] = useState<RoleAssignment[]>([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [loading, user, navigate]);

  const fetchCount = useCallback(
    async (table: "profiles" | "projects" | "courses") => {
      const { count, error } = await supabase
        .from(table)
        .select("id", { count: "exact", head: true });

      if (error) {
        throw error;
      }

      return count || 0;
    },
    [],
  );

  const loadStats = useCallback(async () => {
    const [usersCount, projectsCount, coursesCount] = await Promise.all([
      fetchCount("profiles"),
      fetchCount("projects"),
      fetchCount("courses"),
    ]);

    setStats({
      users: usersCount,
      projects: projectsCount,
      courses: coursesCount,
    });
  }, [fetchCount]);

  const loadRecentProjects = useCallback(async () => {
    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(5);

    if (error) {
      throw error;
    }

    setRecentProjects(data || []);
  }, []);

  const loadRecentCourses = useCallback(async () => {
    const { data, error } = await supabase
      .from("courses")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(5);

    if (error) {
      throw error;
    }

    setRecentCourses(data || []);
  }, []);

  const loadRoleAssignments = useCallback(async () => {
    const { data, error } = await supabase
      .from("user_roles")
      .select("user_id, role")
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      throw error;
    }

    const userIds = (data || []).map((role) => role.user_id);
    let profiles: Profile[] = [];

    if (userIds.length > 0) {
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("user_id, display_name")
        .in("user_id", userIds);

      if (profileError) {
        throw profileError;
      }

      profiles = profileData || [];
    }

    const profileMap = new Map(profiles.map((profile) => [profile.user_id, profile.display_name]));
    const assignments = (data || []).map<RoleAssignment>((role) => ({
      userId: role.user_id,
      role: role.role,
      displayName: profileMap.get(role.user_id) || "이름 없음",
    }));

    setRoleAssignments(assignments);
  }, []);

  const loadAdminData = useCallback(async () => {
    if (!user || !isAdmin) {
      return;
    }

    setDataLoading(true);
    try {
      await Promise.all([loadStats(), loadRecentProjects(), loadRecentCourses(), loadRoleAssignments()]);
    } catch (error) {
      console.error("Failed to load admin data", error);
      toast.error("관리자 데이터를 불러오는 중 오류가 발생했습니다.");
    } finally {
      setDataLoading(false);
    }
  }, [user, isAdmin, loadStats, loadRecentProjects, loadRecentCourses, loadRoleAssignments]);

  useEffect(() => {
    loadAdminData();
  }, [loadAdminData]);

  const handleRoleChange = async (userId: string, nextRole: AppRole) => {
    setUpdatingUserId(userId);
    try {
      const { error: deleteError } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId);

      if (deleteError) {
        throw deleteError;
      }

      const { error: insertError } = await supabase
        .from("user_roles")
        .insert({ user_id: userId, role: nextRole });

      if (insertError) {
        throw insertError;
      }

      toast.success("역할이 업데이트되었습니다.");
      await Promise.all([loadRoleAssignments(), loadStats()]);

      if (userId === user?.id) {
        await refreshRoles();
      }
    } catch (error) {
      console.error("Failed to change role", error);
      toast.error("역할 변경에 실패했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setUpdatingUserId(null);
    }
  };

  const isCheckingAccess = loading || roleLoading;
  const counts = useMemo(
    () => [
      { label: "전체 사용자", value: stats.users, icon: Users },
      { label: "프로젝트", value: stats.projects, icon: FolderOpen },
      { label: "코스", value: stats.courses, icon: BookOpen },
    ],
    [stats],
  );

  if (isCheckingAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 px-4">
        <Shield className="h-12 w-12 text-muted-foreground" />
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold">접근 권한이 없습니다</h1>
          <p className="text-muted-foreground">
            관리자 권한이 있는 계정으로 로그인했는지 확인하거나 권한을 요청해 주세요.
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => navigate("/dashboard")}>
            대시보드로 이동
          </Button>
          <Button onClick={() => navigate("/")}>홈으로 이동</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
      <Header />

      <main className="container mx-auto px-4 py-8 space-y-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground mb-2">안전하게 운영 현황을 확인하세요</p>
            <h1 className="text-3xl font-bold">관리자 콘솔</h1>
          </div>
          <Badge variant="secondary" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Admin
          </Badge>
        </div>

        <section>
          <h2 className="text-xl font-semibold mb-4">시스템 요약</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {counts.map((item) => (
              <Card key={item.label}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{item.label}</CardTitle>
                  <item.icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold flex items-center gap-2">
                    {dataLoading ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /> : item.value}
                  </div>
                  <p className="text-xs text-muted-foreground">최근 24시간 데이터 포함</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LayoutDashboard className="h-5 w-5" />
                최근 프로젝트
              </CardTitle>
              <CardDescription>가장 최근에 생성된 프로젝트 5개</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {dataLoading ? (
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  데이터를 불러오는 중입니다...
                </div>
              ) : recentProjects.length === 0 ? (
                <p className="text-sm text-muted-foreground">최근 프로젝트가 없습니다.</p>
              ) : (
                recentProjects.map((project) => (
                  <div
                    key={project.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="space-y-1">
                      <p className="text-sm font-semibold">{project.title}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {project.description || "설명이 없습니다."}
                      </p>
                    </div>
                    <Badge variant="outline">{project.status}</Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                최근 코스
              </CardTitle>
              <CardDescription>최근에 등록된 코스 5개</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {dataLoading ? (
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  데이터를 불러오는 중입니다...
                </div>
              ) : recentCourses.length === 0 ? (
                <p className="text-sm text-muted-foreground">최근 코스가 없습니다.</p>
              ) : (
                recentCourses.map((course) => (
                  <div
                    key={course.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="space-y-1">
                      <p className="text-sm font-semibold">{course.title}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {course.description || "설명이 없습니다."}
                      </p>
                    </div>
                    <Badge variant="outline">{course.status || "draft"}</Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">역할 관리</h2>
              <p className="text-sm text-muted-foreground">
                사용자 역할을 안전하게 관리하고 최소 권한 원칙을 유지하세요.
              </p>
            </div>
            <Button variant="outline" onClick={loadRoleAssignments}>
              새로고침
            </Button>
          </div>

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>사용자</TableHead>
                  <TableHead>역할</TableHead>
                  <TableHead className="text-right">변경</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
            {dataLoading ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-muted-foreground">
                  역할 정보를 불러오는 중입니다...
                </TableCell>
              </TableRow>
            ) : roleAssignments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground">
                      표시할 사용자 역할이 없습니다.
                    </TableCell>
                  </TableRow>
                ) : (
                  roleAssignments.map((assignment) => (
                    <TableRow key={assignment.userId}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-semibold">{assignment.displayName}</span>
                          <span className="text-xs text-muted-foreground">{assignment.userId}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{assignment.role}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Select
                          value={assignment.role}
                          onValueChange={(value) => handleRoleChange(assignment.userId, value as AppRole)}
                          disabled={updatingUserId === assignment.userId}
                        >
                          <SelectTrigger className="w-[160px]">
                            <SelectValue placeholder="역할 선택" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">admin</SelectItem>
                            <SelectItem value="moderator">moderator</SelectItem>
                            <SelectItem value="user">user</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </section>
      </main>
    </div>
  );
};

export default Admin;

