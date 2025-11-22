import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, FileText, Rocket, Zap, CheckCircle2, Loader2, Trash2, Eye } from "lucide-react";
import { Tables } from "@/integrations/supabase/types";

type Project = Tables<"projects">;

const Dashboard = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchProjects();
      
      // 실시간 업데이트 구독
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
  }, [user]);

  const fetchProjects = async () => {
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
      toast({
        title: "오류 발생",
        description: "프로젝트 목록을 불러오는 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    } finally {
      setLoadingProjects(false);
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    if (!confirm("정말로 이 프로젝트를 삭제하시겠습니까?")) return;

    try {
      setDeletingId(projectId);
      const { error } = await supabase
        .from("projects")
        .delete()
        .eq("id", projectId);

      if (error) throw error;

      toast({
        title: "삭제 완료",
        description: "프로젝트가 성공적으로 삭제되었습니다.",
      });
    } catch (error) {
      console.error("Error deleting project:", error);
      toast({
        title: "오류 발생",
        description: "프로젝트 삭제 중 오류가 발생했습니다.",
        variant: "destructive",
      });
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
        <div className="animate-pulse text-muted-foreground">로딩 중...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8 md:py-12">
        <div className="mb-8 md:mb-12">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">
            환영합니다, {user.email?.split('@')[0]}님
          </h1>
          <p className="text-muted-foreground">
            MVP/PRD 문서를 업로드하고 교육 콘텐츠를 자동으로 생성해보세요.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
          <Card className="border-2 border-primary/20 hover:border-primary/40 transition-colors cursor-pointer group">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="p-3 rounded-lg bg-gradient-primary">
                  <Plus className="h-6 w-6 text-primary-foreground" />
                </div>
                <Zap className="h-5 w-5 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <CardTitle className="mt-4">새 프로젝트 생성</CardTitle>
              <CardDescription>
                MVP/PRD 문서를 업로드하여 새로운 교육 콘텐츠를 생성합니다
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                className="w-full" 
                size="lg"
                onClick={() => navigate('/project/create')}
              >
                <Plus className="h-4 w-4 mr-2" />
                프로젝트 시작
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="p-3 rounded-lg bg-accent/10 w-fit">
                <FileText className="h-6 w-6 text-accent" />
              </div>
              <CardTitle className="mt-4">6단계 자동 생성</CardTitle>
              <CardDescription>
                브리프부터 배포까지 36시간 안에 완료
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  콘텐츠 기획
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  시나리오 작성
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  이미지 생성
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="p-3 rounded-lg bg-success/10 w-fit">
                <Rocket className="h-6 w-6 text-success" />
              </div>
              <CardTitle className="mt-4">빠른 시작</CardTitle>
              <CardDescription>
                5분 내 설정으로 즉시 생성 가능
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">시간 단축</span>
                  <span className="font-semibold text-primary">36시간</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">NPS 개선</span>
                  <span className="font-semibold text-success">+15점</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>내 프로젝트 관리</CardTitle>
            <CardDescription>
              생성 중이거나 완료된 프로젝트를 확인하고 관리하세요
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingProjects ? (
              <div className="text-center py-12">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                <p className="text-muted-foreground mt-4">프로젝트를 불러오는 중...</p>
              </div>
            ) : projects.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-20" />
                <p>아직 프로젝트가 없습니다</p>
                <p className="text-sm mt-2">새 프로젝트를 생성하여 시작해보세요</p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {projects.map((project) => (
                  <Card 
                    key={project.id} 
                    className="hover:shadow-lg transition-all cursor-pointer group border-2 hover:border-primary/40"
                    onClick={() => navigate(`/project/${project.id}`)}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between mb-2">
                        <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                          <FileText className="h-5 w-5 text-primary" />
                        </div>
                        {getStatusBadge(project.status)}
                      </div>
                      <CardTitle className="text-lg line-clamp-1">{project.title}</CardTitle>
                      {project.description && (
                        <CardDescription className="line-clamp-2 min-h-[40px]">
                          {project.description}
                        </CardDescription>
                      )}
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">생성일</span>
                          <span className="font-medium">{new Date(project.created_at).toLocaleDateString('ko-KR')}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">AI 모델</span>
                          <span className="font-medium">{project.ai_model.toUpperCase()}</span>
                        </div>
                        <div className="pt-2 border-t flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/project/${project.id}`);
                            }}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            상세보기
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteProject(project.id);
                            }}
                            disabled={deletingId === project.id}
                          >
                            {deletingId === project.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Dashboard;
