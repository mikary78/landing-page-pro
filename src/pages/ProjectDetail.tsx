import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, CheckCircle2, Clock, XCircle, Loader2, RefreshCw } from "lucide-react";
import { Tables } from "@/integrations/supabase/types";

type Project = Tables<"projects">;
type ProjectStage = Tables<"project_stages">;

const STAGE_NAMES = [
  "콘텐츠 기획",
  "시나리오 작성",
  "이미지 생성",
  "음성/영상 제작",
  "콘텐츠 조립",
  "배포"
];

const ProjectDetail = () => {
  const { id } = useParams();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [project, setProject] = useState<Project | null>(null);
  const [stages, setStages] = useState<ProjectStage[]>([]);
  const [loadingProject, setLoadingProject] = useState(true);
  const [feedback, setFeedback] = useState<Record<string, string>>({});
  const [processingStage, setProcessingStage] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user && id) {
      fetchProjectDetails();
      
      // 실시간 업데이트 구독
      const channel = supabase
        .channel(`project-${id}-changes`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'project_stages',
            filter: `project_id=eq.${id}`,
          },
          () => {
            fetchProjectDetails();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user, id]);

  const fetchProjectDetails = async () => {
    if (!user || !id) return;
    
    try {
      setLoadingProject(true);
      
      // 프로젝트 정보 가져오기
      const { data: projectData, error: projectError } = await supabase
        .from("projects")
        .select("*")
        .eq("id", id)
        .eq("user_id", user.id)
        .single();

      if (projectError) throw projectError;
      setProject(projectData);

      // 단계 정보 가져오기
      const { data: stagesData, error: stagesError } = await supabase
        .from("project_stages")
        .select("*")
        .eq("project_id", id)
        .order("stage_order", { ascending: true });

      if (stagesError) throw stagesError;
      setStages(stagesData || []);
      
    } catch (error) {
      console.error("Error fetching project details:", error);
      toast({
        title: "오류 발생",
        description: "프로젝트 정보를 불러오는 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    } finally {
      setLoadingProject(false);
    }
  };

  const handleStageRegenerate = async (stageId: string, stageOrder: number) => {
    if (!feedback[stageId]?.trim()) {
      toast({
        title: "피드백 필요",
        description: "수정 요청 사항을 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    try {
      setProcessingStage(stageId);
      
      // 피드백 저장 및 상태 업데이트
      const { error } = await supabase
        .from("project_stages")
        .update({
          feedback: feedback[stageId],
          status: "processing",
        })
        .eq("id", stageId);

      if (error) throw error;

      toast({
        title: "재생성 요청",
        description: "단계가 재생성 중입니다.",
      });

      // Edge function 호출하여 재생성
      const { error: funcError } = await supabase.functions.invoke("process-document", {
        body: {
          projectId: id,
          stageId,
          stageOrder,
          regenerate: true,
        },
      });

      if (funcError) throw funcError;

      setFeedback({ ...feedback, [stageId]: "" });
    } catch (error) {
      console.error("Error regenerating stage:", error);
      toast({
        title: "오류 발생",
        description: "단계 재생성 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    } finally {
      setProcessingStage(null);
    }
  };

  const getStageIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="h-5 w-5 text-success" />;
      case "processing":
        return <Loader2 className="h-5 w-5 text-primary animate-spin" />;
      case "failed":
        return <XCircle className="h-5 w-5 text-destructive" />;
      default:
        return <Clock className="h-5 w-5 text-muted-foreground" />;
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
        return <Badge variant="outline">대기 중</Badge>;
    }
  };

  if (loading || loadingProject) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">로딩 중...</div>
      </div>
    );
  }

  if (!user || !project) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8 md:py-12">
        <Button
          variant="outline"
          onClick={() => navigate('/dashboard')}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          프로젝트 목록으로
        </Button>

        <div className="space-y-6">
          {/* 프로젝트 정보 */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-2xl">{project.title}</CardTitle>
                  {project.description && (
                    <CardDescription className="mt-2">{project.description}</CardDescription>
                  )}
                </div>
                {getStatusBadge(project.status)}
              </div>
              <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
                <span>생성: {new Date(project.created_at).toLocaleDateString('ko-KR')}</span>
                <span>AI 모델: {project.ai_model.toUpperCase()}</span>
              </div>
            </CardHeader>
          </Card>

          {/* 파이프라인 단계 */}
          <Card>
            <CardHeader>
              <CardTitle>프로젝트 파이프라인</CardTitle>
              <CardDescription>
                각 단계의 진행 상황을 확인하고 필요시 수정 요청을 할 수 있습니다
              </CardDescription>
            </CardHeader>
            <CardContent>
              {stages.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  <p>프로젝트 단계가 생성되지 않았습니다</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {stages.map((stage, index) => (
                    <Card key={stage.id} className={`transition-all ${
                      stage.status === 'processing' ? 'border-primary shadow-lg' : ''
                    }`}>
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3 flex-1">
                            {getStageIcon(stage.status)}
                            <div>
                              <CardTitle className="text-lg">
                                {index + 1}. {STAGE_NAMES[stage.stage_order - 1]}
                              </CardTitle>
                              {getStatusBadge(stage.status)}
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {stage.content && (
                          <div>
                            <h4 className="text-sm font-semibold mb-2">생성된 콘텐츠</h4>
                            <div className="bg-muted p-4 rounded-lg">
                              <p className="text-sm whitespace-pre-wrap">{stage.content}</p>
                            </div>
                          </div>
                        )}

                        {stage.status === "completed" && (
                          <div className="space-y-2">
                            <h4 className="text-sm font-semibold">수정 요청</h4>
                            <Textarea
                              placeholder="이 단계에서 수정하고 싶은 내용을 입력하세요..."
                              value={feedback[stage.id] || ""}
                              onChange={(e) => setFeedback({ ...feedback, [stage.id]: e.target.value })}
                              className="min-h-[100px]"
                            />
                            <Button
                              onClick={() => handleStageRegenerate(stage.id, stage.stage_order)}
                              disabled={processingStage === stage.id}
                              className="w-full"
                            >
                              {processingStage === stage.id ? (
                                <>
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  재생성 중...
                                </>
                              ) : (
                                <>
                                  <RefreshCw className="h-4 w-4 mr-2" />
                                  수정 요청 및 재생성
                                </>
                              )}
                            </Button>
                          </div>
                        )}

                        {stage.feedback && (
                          <div>
                            <h4 className="text-sm font-semibold mb-2">이전 피드백</h4>
                            <div className="bg-accent/10 p-3 rounded-lg">
                              <p className="text-sm text-muted-foreground">{stage.feedback}</p>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* 최종 결과물 */}
          {project.generated_content && (
            <Card>
              <CardHeader>
                <CardTitle>최종 생성 결과물</CardTitle>
                <CardDescription>
                  모든 단계가 완료된 최종 콘텐츠입니다
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-muted p-6 rounded-lg">
                  <p className="whitespace-pre-wrap">{project.generated_content}</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
};

export default ProjectDetail;
