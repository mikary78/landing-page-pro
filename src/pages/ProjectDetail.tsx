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
import { ArrowLeft, CheckCircle2, Clock, XCircle, Loader2, RefreshCw, FileText, List, Download, Copy, Share2, BarChart3, Save } from "lucide-react";
import { Tables } from "@/integrations/supabase/types";
import { InfographicPreview } from "@/components/InfographicPreview";
import jsPDF from 'jspdf';
import PptxGenJS from 'pptxgenjs';

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
  const [savingTemplate, setSavingTemplate] = useState(false);

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
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'projects',
            filter: `id=eq.${id}`,
          },
          () => {
            fetchProjectDetails();
          }
        )
        .subscribe();

      // stages가 비어있으면 3초마다 재시도 (최대 10번)
      let retryCount = 0;
      const maxRetries = 10;
      const pollingInterval = setInterval(() => {
        if (retryCount >= maxRetries) {
          clearInterval(pollingInterval);
          return;
        }
        
        // stages가 여전히 비어있으면 다시 페칭
        if (stages.length === 0) {
          console.log('Retrying to fetch project details...');
          fetchProjectDetails();
          retryCount++;
        } else {
          clearInterval(pollingInterval);
        }
      }, 3000);

      return () => {
        supabase.removeChannel(channel);
        clearInterval(pollingInterval);
      };
    }
  }, [user, id, stages.length]);

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
        .maybeSingle();

      if (projectError) throw projectError;
      
      if (!projectData) {
        toast({
          title: "프로젝트를 찾을 수 없습니다",
          description: "존재하지 않거나 접근 권한이 없는 프로젝트입니다.",
          variant: "destructive",
        });
        navigate('/dashboard');
        return;
      }
      
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

  const handleDownloadMarkdown = () => {
    if (!project?.generated_content) return;
    
    const content = `# ${project.title}\n\n${project.description || ''}\n\n---\n\n${project.generated_content}`;
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${project.title.replace(/\s+/g, '_')}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast({
      title: "다운로드 완료",
      description: "마크다운 파일이 다운로드되었습니다.",
    });
  };

  const handleDownloadText = () => {
    if (!project?.generated_content) return;
    
    const content = `${project.title}\n\n${project.description || ''}\n\n---\n\n${project.generated_content}`;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${project.title.replace(/\s+/g, '_')}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast({
      title: "다운로드 완료",
      description: "텍스트 파일이 다운로드되었습니다.",
    });
  };

  const handleCopyToClipboard = async () => {
    if (!project?.generated_content) return;
    
    try {
      await navigator.clipboard.writeText(project.generated_content);
      toast({
        title: "복사 완료",
        description: "클립보드에 내용이 복사되었습니다.",
      });
    } catch (error) {
      toast({
        title: "복사 실패",
        description: "클립보드 복사 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  };

  const handleShareLink = async () => {
    const currentUrl = window.location.href;
    
    try {
      await navigator.clipboard.writeText(currentUrl);
      toast({
        title: "링크 복사 완료",
        description: "프로젝트 링크가 클립보드에 복사되었습니다.",
      });
    } catch (error) {
      toast({
        title: "복사 실패",
        description: "링크 복사 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  };

  const handleDownloadPDF = () => {
    if (!project?.generated_content) return;
    
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 20;
      const maxWidth = pageWidth - (margin * 2);
      
      // 제목
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text(project.title, margin, margin);
      
      let yPos = margin + 15;
      
      // 설명
      if (project.description) {
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        const descLines = doc.splitTextToSize(project.description, maxWidth);
        doc.text(descLines, margin, yPos);
        yPos += descLines.length * 7 + 10;
      }
      
      // 구분선
      doc.setDrawColor(200, 200, 200);
      doc.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 10;
      
      // 콘텐츠
      doc.setFontSize(11);
      const contentLines = doc.splitTextToSize(project.generated_content, maxWidth);
      
      contentLines.forEach((line: string) => {
        if (yPos > pageHeight - margin) {
          doc.addPage();
          yPos = margin;
        }
        doc.text(line, margin, yPos);
        yPos += 6;
      });
      
      doc.save(`${project.title.replace(/\s+/g, '_')}.pdf`);
      
      toast({
        title: "PDF 다운로드 완료",
        description: "PDF 파일이 다운로드되었습니다.",
      });
    } catch (error) {
      console.error('PDF generation error:', error);
      toast({
        title: "PDF 생성 실패",
        description: "PDF 생성 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  };

  const handleDownloadPPT = () => {
    if (!project?.generated_content) return;
    
    try {
      const pptx = new PptxGenJS();
      
      // 제목 슬라이드
      const titleSlide = pptx.addSlide();
      titleSlide.background = { color: 'F1F5F9' };
      
      titleSlide.addText(project.title, {
        x: 0.5,
        y: 1.5,
        w: 9,
        h: 1.5,
        fontSize: 44,
        bold: true,
        color: '1e293b',
        align: 'center',
      });
      
      if (project.description) {
        titleSlide.addText(project.description, {
          x: 1,
          y: 3.5,
          w: 8,
          h: 1,
          fontSize: 18,
          color: '64748b',
          align: 'center',
        });
      }
      
      // 콘텐츠를 단락으로 나누기
      const paragraphs = project.generated_content.split('\n\n').filter(p => p.trim());
      
      // 각 단락을 슬라이드로
      paragraphs.forEach((paragraph, index) => {
        const contentSlide = pptx.addSlide();
        contentSlide.background = { color: 'FFFFFF' };
        
        // 슬라이드 번호
        contentSlide.addText(`${index + 1}`, {
          x: 0.5,
          y: 0.3,
          w: 0.5,
          h: 0.5,
          fontSize: 14,
          color: '94a3b8',
        });
        
        // 내용
        const lines = paragraph.split('\n');
        const title = lines[0].substring(0, 60) + (lines[0].length > 60 ? '...' : '');
        const content = lines.slice(1).join('\n').substring(0, 800);
        
        contentSlide.addText(title, {
          x: 0.5,
          y: 0.8,
          w: 9,
          h: 0.8,
          fontSize: 28,
          bold: true,
          color: '1e293b',
        });
        
        contentSlide.addText(content, {
          x: 0.5,
          y: 1.8,
          w: 9,
          h: 4,
          fontSize: 16,
          color: '475569',
          valign: 'top',
        });
      });
      
      pptx.writeFile({ fileName: `${project.title.replace(/\s+/g, '_')}.pptx` });
      
      toast({
        title: "PPT 다운로드 완료",
        description: "PowerPoint 파일이 다운로드되었습니다.",
      });
    } catch (error) {
      console.error('PPT generation error:', error);
      toast({
        title: "PPT 생성 실패",
        description: "PowerPoint 생성 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  };

  const handleSaveAsTemplate = async () => {
    if (!project || !user) return;

    const templateName = prompt("템플릿 이름을 입력하세요:", `${project.title} 템플릿`);
    if (!templateName) return;

    try {
      setSavingTemplate(true);
      const { error } = await supabase
        .from("project_templates")
        .insert({
          user_id: user.id,
          template_name: templateName,
          description: project.description,
          education_session: project.education_session,
          education_duration: project.education_duration,
          education_course: project.education_course,
          ai_model: project.ai_model,
        });

      if (error) throw error;

      toast({
        title: "템플릿 저장 완료",
        description: "프로젝트가 템플릿으로 저장되었습니다.",
      });
    } catch (error) {
      console.error("Error saving template:", error);
      toast({
        title: "오류 발생",
        description: "템플릿 저장 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    } finally {
      setSavingTemplate(false);
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
        <div className="flex items-center justify-between mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate('/dashboard')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            프로젝트 목록으로
          </Button>
          
          {project.status === 'completed' && (
            <Button 
              variant="outline" 
              onClick={handleSaveAsTemplate}
              disabled={savingTemplate}
            >
              {savingTemplate ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              템플릿으로 저장
            </Button>
          )}
        </div>

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
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="pipeline" className="gap-2">
              <List className="h-4 w-4" />
              파이프라인 단계
            </TabsTrigger>
            <TabsTrigger value="infographic" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              인포그래픽 미리보기
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

          {/* 인포그래픽 미리보기 탭 */}
          <TabsContent value="infographic">
            <InfographicPreview
              title={project.title}
              description={project.description || undefined}
              aiModel={project.ai_model}
              stages={stages}
              createdAt={project.created_at}
              generatedContent={project.generated_content || undefined}
            />
          </TabsContent>

          {/* 최종 결과물 탭 */}
          <TabsContent value="final">
            <Card>
              {project.generated_content ? (
                <>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-2xl">최종 생성 결과물</CardTitle>
                        <CardDescription>
                          모든 파이프라인 단계가 완료되어 생성된 최종 콘텐츠입니다
                        </CardDescription>
                      </div>
                      <div className="flex gap-2 flex-wrap justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleShareLink}
                          className="gap-2"
                        >
                          <Share2 className="h-4 w-4" />
                          링크 공유
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleCopyToClipboard}
                          className="gap-2"
                        >
                          <Copy className="h-4 w-4" />
                          복사
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleDownloadText}
                          className="gap-2"
                        >
                          <Download className="h-4 w-4" />
                          TXT
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleDownloadMarkdown}
                          className="gap-2"
                        >
                          <Download className="h-4 w-4" />
                          MD
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleDownloadPDF}
                          className="gap-2"
                        >
                          <Download className="h-4 w-4" />
                          PDF
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleDownloadPPT}
                          className="gap-2"
                        >
                          <Download className="h-4 w-4" />
                          PPT
                        </Button>
                      </div>
                    </div>
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
