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
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, CheckCircle2, Clock, XCircle, Loader2, RefreshCw, FileText, List } from "lucide-react";
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

  const completedStages = stages.filter(s => s.status === 'completed').length;
  const progressPercentage = stages.length > 0 ? (completedStages / stages.length) * 100 : 0;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8 md:py-12 max-w-7xl">
        <Button
          variant="ghost"
          onClick={() => navigate('/dashboard')}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          프로젝트 목록으로
        </Button>

        {/* 프로젝트 헤더 */}
        <div className="mb-8">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h1 className="text-3xl md:text-4xl font-bold mb-2">{project.title}</h1>
              {project.description && (
                <p className="text-muted-foreground text-lg">{project.description}</p>
              )}
            </div>
            {getStatusBadge(project.status)}
          </div>
          
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-6">
            <span>생성일: {new Date(project.created_at).toLocaleDateString('ko-KR')}</span>
            <span>•</span>
            <span>AI 모델: {project.ai_model.toUpperCase()}</span>
          </div>

          {/* 진행률 표시 */}
          <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">전체 진행률</span>
                  <Badge variant="outline" className="text-xs">
                    {completedStages} / {stages.length} 단계 완료
                  </Badge>
                </div>
                <span className="text-2xl font-bold text-primary">{Math.round(progressPercentage)}%</span>
              </div>
              <Progress value={progressPercentage} className="h-3" />
            </CardContent>
          </Card>
        </div>

        {/* 탭 네비게이션 */}
        <Tabs defaultValue="pipeline" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="pipeline" className="gap-2">
              <List className="h-4 w-4" />
              파이프라인 단계
            </TabsTrigger>
            <TabsTrigger value="final" className="gap-2">
              <FileText className="h-4 w-4" />
              최종 결과물
            </TabsTrigger>
          </TabsList>

          {/* 파이프라인 탭 */}
          <TabsContent value="pipeline" className="space-y-4">
            {stages.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                  <p className="text-lg font-semibold mb-2">프로젝트 단계를 생성하고 있습니다</p>
                  <p className="text-sm text-muted-foreground">잠시만 기다려주세요...</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {stages.map((stage, index) => (
                  <Card 
                    key={stage.id} 
                    className={`transition-all hover:shadow-md ${
                      stage.status === 'processing' ? 'border-primary shadow-lg ring-2 ring-primary/20' : ''
                    }`}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-3">
                        <div className="flex-shrink-0">
                          {getStageIcon(stage.status)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <CardTitle className="text-lg">
                              단계 {index + 1}: {STAGE_NAMES[stage.stage_order - 1]}
                            </CardTitle>
                            {getStatusBadge(stage.status)}
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    
                    {stage.content && (
                      <CardContent className="space-y-4">
                        <div>
                          <div className="flex items-center gap-2 mb-3">
                            <div className="h-px flex-1 bg-border" />
                            <span className="text-xs font-semibold text-muted-foreground uppercase">생성된 콘텐츠</span>
                            <div className="h-px flex-1 bg-border" />
                          </div>
                          <div className="bg-muted/50 p-5 rounded-lg border max-h-[400px] overflow-y-auto">
                            <p className="text-sm whitespace-pre-wrap leading-relaxed">{stage.content}</p>
                          </div>
                        </div>

                        {stage.status === "completed" && (
                          <div className="space-y-3 pt-2">
                            <div className="flex items-center gap-2">
                              <div className="h-px flex-1 bg-border" />
                              <span className="text-xs font-semibold text-muted-foreground uppercase">수정 요청</span>
                              <div className="h-px flex-1 bg-border" />
                            </div>
                            <Textarea
                              placeholder="이 단계에서 수정하고 싶은 내용을 구체적으로 입력하세요..."
                              value={feedback[stage.id] || ""}
                              onChange={(e) => setFeedback({ ...feedback, [stage.id]: e.target.value })}
                              className="min-h-[120px]"
                            />
                            <Button
                              onClick={() => handleStageRegenerate(stage.id, stage.stage_order)}
                              disabled={processingStage === stage.id}
                              className="w-full"
                              size="lg"
                            >
                              {processingStage === stage.id ? (
                                <>
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  재생성 중...
                                </>
                              ) : (
                                <>
                                  <RefreshCw className="h-4 w-4 mr-2" />
                                  이 단계 재생성
                                </>
                              )}
                            </Button>
                          </div>
                        )}

                        {stage.feedback && (
                          <div className="pt-2">
                            <div className="flex items-center gap-2 mb-3">
                              <div className="h-px flex-1 bg-border" />
                              <span className="text-xs font-semibold text-muted-foreground uppercase">이전 피드백</span>
                              <div className="h-px flex-1 bg-border" />
                            </div>
                            <div className="bg-accent/20 p-4 rounded-lg border border-accent">
                              <p className="text-sm text-muted-foreground italic">{stage.feedback}</p>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* 최종 결과물 탭 */}
          <TabsContent value="final">
            <Card>
              {project.generated_content ? (
                <>
                  <CardHeader>
                    <CardTitle className="text-2xl">최종 생성 결과물</CardTitle>
                    <CardDescription>
                      모든 파이프라인 단계가 완료되어 생성된 최종 콘텐츠입니다
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-muted/50 p-6 rounded-lg border max-h-[600px] overflow-y-auto">
                      <div className="prose prose-sm max-w-none dark:prose-invert">
                        <p className="whitespace-pre-wrap leading-relaxed">{project.generated_content}</p>
                      </div>
                    </div>
                  </CardContent>
                </>
              ) : (
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <Clock className="h-16 w-16 text-muted-foreground/30 mb-4" />
                  <p className="text-lg font-semibold mb-2">최종 결과물이 아직 생성되지 않았습니다</p>
                  <p className="text-sm text-muted-foreground text-center max-w-md">
                    모든 파이프라인 단계가 완료되면 최종 결과물이 여기에 표시됩니다
                  </p>
                </CardContent>
              )}
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default ProjectDetail;
