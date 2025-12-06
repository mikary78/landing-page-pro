import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Header from "@/components/Header";
import { DashboardStats } from "@/components/DashboardStats";
import { Plus, Loader2, Trash2, FileText, Zap, Brain } from "lucide-react";
import { toast } from "sonner";
import { Tables } from "@/integrations/supabase/types";

type Project = Tables<"projects">;

const Dashboard = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  const fetchProjects = useCallback(async () => {
    if (!user) return;
    
    try {
      setLoadingProjects(true);
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      console.error("Error fetching projects:", error);
      toast.error("프로젝트 목록을 불러오는 중 오류가 발생했습니다.");
    } finally {
      setLoadingProjects(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchProjects();
      
      const channel = supabase
        .channel('projects-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'projects',
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            fetchProjects();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [fetchProjects, user]);

  const handleDeleteProject = async (projectId: string) => {
    if (!confirm("정말 프로젝트를 삭제하시겠습니까?")) return;

    try {
      setDeletingId(projectId);
      const { error } = await supabase
        .from("projects")
        .delete()
        .eq("id", projectId);

      if (error) throw error;

      toast.success("프로젝트가 성공적으로 삭제되었습니다.");
    } catch (error) {
      console.error("Error deleting project:", error);
      toast.error("프로젝트 삭제 중 오류가 발생했습니다.");
    } finally {
      setDeletingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-success text-success-foreground">완료</Badge>;
      case "processing":
        return <Badge className="bg-primary text-primary-foreground">처리 중</Badge>;
      case "failed":
        return <Badge variant="destructive">실패</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">안녕하세요!</h1>
          <p className="text-muted-foreground">
            AI 기반 교육 자료 생성 서비스에 오신 것을 환영합니다.
          </p>
        </div>

        <Tabs defaultValue="projects" className="mb-8">
          <TabsList>
            <TabsTrigger value="projects">내 프로젝트</TabsTrigger>
            <TabsTrigger value="stats">통계</TabsTrigger>
          </TabsList>
          
          <TabsContent value="projects" className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Card className="border-dashed cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => navigate("/project/create")}>
                <CardHeader>
                  <div className="flex items-center justify-center h-12 w-12 rounded-full bg-primary/10 mb-4">
                    <Plus className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle>새 프로젝트 생성</CardTitle>
                  <CardDescription>
                    AI로 교육 자료를 빠르게 만들어보세요.
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center justify-center h-12 w-12 rounded-full bg-blue-500/10 mb-4">
                    <FileText className="h-6 w-6 text-blue-500" />
                  </div>
                  <CardTitle>자동화된 생성</CardTitle>
                  <CardDescription>
                    문서를 업로드하면 자동으로 교육 자료가 만들어집니다.
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center justify-center h-12 w-12 rounded-full bg-purple-500/10 mb-4">
                    <Brain className="h-6 w-6 text-purple-500" />
                  </div>
                  <CardTitle>AI 기반 분석</CardTitle>
                  <CardDescription>
                    최신 AI 모델로 분석하고 최적화합니다.
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>

            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold">내 프로젝트</h2>
              </div>
              
              {loadingProjects ? (
                <div className="flex justify-center items-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : projects.length === 0 ? (
                <Card>
                  <CardContent className="py-12">
                    <div className="text-center">
                      <Zap className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">아직 프로젝트가 없습니다</h3>
                      <p className="text-muted-foreground mb-4">
                        새 프로젝트를 생성해 AI 기반 교육 자료를 만들어보세요.
                      </p>
                      <Button onClick={() => navigate("/project/create")}>
                        <Plus className="h-4 w-4 mr-2" />
                        새 프로젝트 생성
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {projects.map((project) => (
                    <Card key={project.id} className="hover:shadow-lg transition-shadow">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="line-clamp-1">{project.title}</CardTitle>
                            <CardDescription className="line-clamp-2 mt-2">
                              {project.description || "설명이 없습니다"}
                            </CardDescription>
                          </div>
                          {getStatusBadge(project.status)}
                        </div>
                        <div className="flex flex-wrap gap-2 mt-4">
                          <Badge variant="outline">{project.ai_model}</Badge>
                          {project.education_course && (
                            <Badge variant="secondary">{project.education_course}</Badge>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">
                            {new Date(project.created_at).toLocaleDateString("ko-KR")}
                          </span>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteProject(project.id)}
                              disabled={deletingId === project.id}
                            >
                              {deletingId === project.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => navigate(`/project/${project.id}`)}
                            >
                              보기
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="stats">
            <DashboardStats userId={user.id} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Dashboard;
