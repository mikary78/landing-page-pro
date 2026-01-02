/**
 * ProjectDetail 페이지
 * 
 * 수정일: 2026-01-02
 * 수정 내용: Supabase → Azure Functions API 마이그레이션
 * 실시간 업데이트: Supabase Realtime → 폴링 방식으로 대체
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { processDocument, callAzureFunctionDirect } from "@/lib/azureFunctions";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, CheckCircle2, Clock, XCircle, Loader2, RefreshCw, FileText, List, Download, Copy, Share2, BarChart3, Save, Sparkles } from "lucide-react";
import { InfographicPreview } from "@/components/InfographicPreview";
import PptxGenJS from 'pptxgenjs';
import { getCurrentContent } from "@/utils/contentSelector";

// 타입 정의 (Supabase 타입 대신 직접 정의)
interface Project {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  document_content?: string;
  ai_model: string;
  status: string;
  education_session?: number;
  education_duration?: string;
  education_course?: string;
  created_at: string;
  updated_at: string;
}

interface ProjectStage {
  id: string;
  project_id: string;
  ai_model: string;
  stage_order: number;
  stage_name?: string;
  content?: string;
  feedback?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface AiResult {
  id: string;
  project_id: string;
  ai_model: string;
  status: string;
  generated_content?: string;
  created_at: string;
  updated_at: string;
}

const STAGE_NAMES = [
  "커리큘럼 설계",
  "수업안 작성",
  "슬라이드 구성",
  "평가/퀴즈",
  "최종 검토"
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
  const [selectedAiModel, setSelectedAiModel] = useState<string>("");
  const [aiResults, setAiResults] = useState<AiResult[]>([]);
  const [retryingWithAi, setRetryingWithAi] = useState(false);
  const hasLoadedStagesRef = useRef(false);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user && id) {
      fetchProjectDetails(false); // 초기 로드 시에만 로딩 화면 표시
      
      // 폴링으로 실시간 업데이트 대체
      pollingIntervalRef.current = setInterval(() => {
        if (project?.status === 'processing') {
          fetchProjectDetails(true); // 폴링 시에는 로딩 화면 표시 안 함
        }
      }, 5000);

      return () => {
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
        }
      };
    }
  }, [user, id]);

  // selectedAiModel이 변경되면 해당 모델의 stages 가져오기
  // hasLoadedStagesRef를 사용하여 초기 로드 후에만 실행
  useEffect(() => {
    if (selectedAiModel && id && hasLoadedStagesRef.current) {
      fetchStagesForModel(selectedAiModel);
    }
  }, [selectedAiModel, id]);

  const fetchProjectDetails = async (isPolling: boolean = false) => {
    if (!user || !id) return;
    
    try {
      // 폴링 시에는 로딩 화면을 표시하지 않음
      if (!isPolling) {
        setLoadingProject(true);
      }
      
      const { data, error } = await callAzureFunctionDirect<{
        success: boolean;
        project: Project;
        aiResults: AiResult[];
        stages: ProjectStage[];
      }>(`/api/getproject/${id}`, 'GET');

      if (error) throw error;
      
      if (!data?.success || !data.project) {
        toast({
          title: "프로젝트를 찾을 수 없습니다",
          description: "존재하지 않거나 접근 권한이 없는 프로젝트입니다.",
          variant: "destructive",
        });
        navigate('/dashboard');
        return;
      }
      
      setProject(data.project);
      setAiResults(data.aiResults || []);
      
      // AI 모델 설정 (프로젝트의 ai_model 사용)
      const currentAiModel = data.project.ai_model || "gemini";
      if (!selectedAiModel) {
        setSelectedAiModel(currentAiModel);
      }

      setStages(data.stages || []);
      if ((data.stages || []).length > 0) {
        hasLoadedStagesRef.current = true;
      }
      
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

  const fetchStagesForModel = async (aiModel: string) => {
    if (!id) return;
    
    try {
      const { data, error } = await callAzureFunctionDirect<{
        success: boolean;
        stages: ProjectStage[];
      }>(`/api/getprojectstages/${id}?aiModel=${aiModel}`, 'GET');

      if (error) throw error;
      setStages(data?.stages || []);
    } catch (error) {
      console.error("Error fetching stages for AI model:", error);
    }
  };

  const handleStageRegenerate = async (stageId: string, stageOrder: number) => {
    if (!feedback[stageId]?.trim() || !project) {
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
      const { error: updateError } = await callAzureFunctionDirect(
        `/api/updateprojectstage/${stageId}`,
        'PUT',
        { feedback: feedback[stageId], status: 'processing' }
      );

      if (updateError) throw updateError;

      toast({
        title: "재생성 요청",
        description: "단계가 재생성 중입니다.",
      });

      // Azure Function 호출하여 재생성
      const { error: funcError } = await processDocument({
        projectId: id!,
        aiModel: project.ai_model as 'gemini' | 'claude' | 'chatgpt',
        stageId,
        stageOrder,
        regenerate: true,
      });

      if (funcError) throw funcError;

      setFeedback({ ...feedback, [stageId]: "" });
      
      // 데이터 새로고침 (로딩 화면 없이)
      setTimeout(() => fetchProjectDetails(true), 2000);
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

  const currentContent = useMemo(
    () => getCurrentContent(project, aiResults, selectedAiModel),
    [project, aiResults, selectedAiModel]
  );

  const handleDownloadMarkdown = () => {
    if (!project || !currentContent) return;
    
    const content = `# ${project.title}\n\n${project.description || ''}\n\n---\n\n${currentContent}`;
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
    if (!project || !currentContent) return;
    
    const content = `${project.title}\n\n${project.description || ''}\n\n---\n\n${currentContent}`;
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
    if (!currentContent) return;
    
    try {
      await navigator.clipboard.writeText(currentContent);
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
    if (!project || !currentContent) return;
    
    try {
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        toast({
          title: "팝업 차단",
          description: "팝업을 허용해주세요.",
          variant: "destructive",
        });
        return;
      }

      const formatContent = (text: string) => {
        return text
          .split('\n')
          .map(line => {
            const trimmed = line.trim();
            if (trimmed.startsWith('### ')) return `<h3>${trimmed.slice(4)}</h3>`;
            if (trimmed.startsWith('## ')) return `<h2>${trimmed.slice(3)}</h2>`;
            if (trimmed.startsWith('# ')) return `<h1>${trimmed.slice(2)}</h1>`;
            if (trimmed === '') return '<br/>';
            return `<p>${trimmed}</p>`;
          })
          .join('\n');
      };

      const htmlContent = `
        <!DOCTYPE html>
        <html lang="ko">
        <head>
          <meta charset="UTF-8">
          <title>${project.title}</title>
          <style>
            body { font-family: sans-serif; max-width: 800px; margin: 0 auto; padding: 40px; }
            h1 { font-size: 28px; border-bottom: 2px solid #333; padding-bottom: 10px; }
            h2 { font-size: 20px; margin-top: 24px; }
            h3 { font-size: 16px; margin-top: 20px; }
            p { line-height: 1.6; }
          </style>
        </head>
        <body>
          <h1>${project.title}</h1>
          ${project.description ? `<p style="color:#666">${project.description}</p>` : ''}
          <hr/>
          ${formatContent(currentContent)}
        </body>
        </html>
      `;

      printWindow.document.write(htmlContent);
      printWindow.document.close();
      printWindow.onload = () => setTimeout(() => printWindow.print(), 500);
      
      toast({
        title: "PDF 다운로드",
        description: "인쇄 다이얼로그에서 'PDF로 저장'을 선택하세요.",
      });
    } catch (error) {
      toast({
        title: "PDF 생성 실패",
        description: "PDF 생성 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  };

  const handleDownloadPPT = () => {
    if (!project || !currentContent) return;
    
    try {
      const pptx = new PptxGenJS();
      
      const titleSlide = pptx.addSlide();
      titleSlide.background = { color: 'F1F5F9' };
      titleSlide.addText(project.title, { x: 0.5, y: 1.5, w: 9, h: 1.5, fontSize: 44, bold: true, color: '1e293b', align: 'center' });
      
      if (project.description) {
        titleSlide.addText(project.description, { x: 1, y: 3.5, w: 8, h: 1, fontSize: 18, color: '64748b', align: 'center' });
      }
      
      const paragraphs = currentContent.split('\n\n').filter(p => p.trim());
      paragraphs.forEach((paragraph, index) => {
        const contentSlide = pptx.addSlide();
        const lines = paragraph.split('\n');
        const title = lines[0].substring(0, 60);
        const content = lines.slice(1).join('\n').substring(0, 800);
        
        contentSlide.addText(title, { x: 0.5, y: 0.8, w: 9, h: 0.8, fontSize: 28, bold: true, color: '1e293b' });
        contentSlide.addText(content, { x: 0.5, y: 1.8, w: 9, h: 4, fontSize: 16, color: '475569', valign: 'top' });
      });
      
      pptx.writeFile({ fileName: `${project.title.replace(/\s+/g, '_')}.pptx` });
      
      toast({
        title: "PPT 다운로드 완료",
        description: "PowerPoint 파일이 다운로드되었습니다.",
      });
    } catch (error) {
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
      
      const { error } = await callAzureFunctionDirect(
        '/api/savetemplate',
        'POST',
        { projectId: project.id, templateName }
      );

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

  const handleAiModelChange = async (newModel: string) => {
    if (selectedAiModel === newModel) return;
    setSelectedAiModel(newModel);
  };

  const handleRetryWithAi = async (aiModel: string) => {
    if (!project || !user) return;

    try {
      setRetryingWithAi(true);
      
      const existingResult = aiResults.find(r => r.ai_model === aiModel);
      if (existingResult && existingResult.status === 'completed') {
        toast({
          title: "이미 생성된 결과가 있습니다",
          description: "해당 AI 모델의 결과를 선택해서 확인하세요.",
        });
        setSelectedAiModel(aiModel);
        return;
      }

      // 프로젝트 상태 업데이트
      await callAzureFunctionDirect(
        `/api/updateproject/${project.id}`,
        'PUT',
        { status: 'processing' }
      );

      toast({
        title: "AI 처리 시작",
        description: `${aiModel.toUpperCase()} 모델로 콘텐츠를 생성하고 있습니다.`,
      });

      // Azure Function 호출
      const { error: funcError } = await processDocument({
        projectId: project.id,
        documentContent: project.document_content,
        aiModel: aiModel as 'gemini' | 'claude' | 'chatgpt',
        retryWithDifferentAi: true,
      });

      if (funcError) throw funcError;

      setSelectedAiModel(aiModel);
      
      // 데이터 새로고침 (로딩 화면 없이)
      setTimeout(() => fetchProjectDetails(true), 3000);
    } catch (error) {
      console.error("Error retrying with AI:", error);
      toast({
        title: "오류 발생",
        description: "AI 재시도 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    } finally {
      setRetryingWithAi(false);
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
          <Button variant="ghost" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            프로젝트 목록으로
          </Button>
          
          {project.status === 'completed' && (
            <Button variant="outline" onClick={handleSaveAsTemplate} disabled={savingTemplate}>
              {savingTemplate ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              템플릿으로 저장
            </Button>
          )}
        </div>

        {/* 프로젝트 헤더 */}
        <div className="mb-8">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h1 className="text-3xl md:text-4xl font-bold mb-2">{project.title}</h1>
              {project.description && <p className="text-muted-foreground text-lg">{project.description}</p>}
            </div>
            {getStatusBadge(project.status)}
          </div>

          {/* 프로세싱 중 로딩 카드 */}
          {project.status === 'processing' && (
            <Card className="border-primary/50 bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5 mb-6">
              <CardContent className="pt-8 pb-8">
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Loader2 className="h-10 w-10 animate-spin text-primary" />
                      <div>
                        <p className="text-xl font-bold mb-1">AI 콘텐츠 생성 중</p>
                        <p className="text-sm text-muted-foreground">잠시만 기다려주세요...</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-4xl font-bold text-primary mb-1">
                        {Math.round((completedStages / STAGE_NAMES.length) * 100)}%
                      </div>
                      <p className="text-xs text-muted-foreground">{completedStages} / {STAGE_NAMES.length} 완료</p>
                    </div>
                  </div>
                  <Progress value={(completedStages / STAGE_NAMES.length) * 100} className="h-3" />
                </div>
              </CardContent>
            </Card>
          )}
          
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-6">
            <span>생성일: {new Date(project.created_at).toLocaleDateString('ko-KR')}</span>
            <span>·</span>
            <div className="flex items-center gap-2">
              <span>AI 모델:</span>
              <Select value={selectedAiModel} onValueChange={handleAiModelChange}>
                <SelectTrigger className="w-[140px] h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gemini">Gemini</SelectItem>
                  <SelectItem value="claude">Claude</SelectItem>
                  <SelectItem value="chatgpt">ChatGPT</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {aiResults.length > 0 && (
              <>
                <span>·</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs">생성된 AI 결과:</span>
                  {aiResults.map((result) => (
                    <Badge 
                      key={result.id} 
                      variant={result.ai_model === selectedAiModel ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => handleAiModelChange(result.ai_model)}
                    >
                      {result.ai_model.toUpperCase()}
                    </Badge>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* 진행률 표시 - 완료된 프로젝트만 */}
          {project.status === 'completed' && (
            <div className="grid gap-4 md:grid-cols-2">
              <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">전체 진행률</span>
                      <Badge variant="outline" className="text-xs">{completedStages} / {stages.length} 단계</Badge>
                    </div>
                    <span className="text-2xl font-bold text-primary">{Math.round(progressPercentage)}%</span>
                  </div>
                  <Progress value={progressPercentage} className="h-3" />
                </CardContent>
              </Card>

              <Card className="border-dashed">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold mb-1">다른 AI 모델로 재시도</p>
                      <p className="text-xs text-muted-foreground">다양한 AI의 결과를 비교해보세요</p>
                    </div>
                    <div className="flex gap-2">
                      {['gemini', 'claude', 'chatgpt'].filter(m => m !== selectedAiModel).map((model) => (
                        <Button key={model} size="sm" variant="outline" onClick={() => handleRetryWithAi(model)} disabled={retryingWithAi}>
                          <Sparkles className="h-3 w-3 mr-1" />
                          {model.toUpperCase()}
                        </Button>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {/* 탭 네비게이션 */}
        <Tabs defaultValue="pipeline" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="pipeline" className="gap-2"><List className="h-4 w-4" />파이프라인 단계</TabsTrigger>
            <TabsTrigger value="infographic" className="gap-2"><BarChart3 className="h-4 w-4" />인포그래픽</TabsTrigger>
            <TabsTrigger value="final" className="gap-2"><FileText className="h-4 w-4" />최종 결과물</TabsTrigger>
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
                  <Card key={stage.id} className={`transition-all hover:shadow-md ${stage.status === 'processing' ? 'border-primary shadow-lg ring-2 ring-primary/20' : ''}`}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-3">
                        <div className="flex-shrink-0">{getStageIcon(stage.status)}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <CardTitle className="text-lg">단계 {index + 1}: {STAGE_NAMES[stage.stage_order - 1]}</CardTitle>
                            {getStatusBadge(stage.status)}
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    
                    {stage.content && (
                      <CardContent className="space-y-4">
                        <div className="bg-muted/50 p-5 rounded-lg border max-h-[400px] overflow-y-auto">
                          <p className="text-sm whitespace-pre-wrap leading-relaxed">{stage.content}</p>
                        </div>

                        {stage.status === "completed" && (
                          <div className="space-y-3 pt-2">
                            <Textarea
                              placeholder="수정하고 싶은 내용을 입력하세요..."
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
                                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />재생성 중...</>
                              ) : (
                                <><RefreshCw className="h-4 w-4 mr-2" />이 단계 재생성</>
                              )}
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* 인포그래픽 탭 */}
          <TabsContent value="infographic">
            <InfographicPreview
              title={project.title}
              description={project.description || undefined}
              aiModel={project.ai_model}
              stages={stages}
              createdAt={project.created_at}
              generatedContent={currentContent || undefined}
            />
          </TabsContent>

          {/* 최종 결과물 탭 */}
          <TabsContent value="final">
            <Card>
              {currentContent ? (
                <>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <CardTitle className="text-2xl">최종 생성 결과물</CardTitle>
                          <Badge variant="secondary">{selectedAiModel.toUpperCase()}</Badge>
                        </div>
                        <CardDescription>{selectedAiModel.toUpperCase()} 모델이 생성한 최종 콘텐츠입니다</CardDescription>
                      </div>
                      <div className="flex gap-2 flex-wrap justify-end">
                        <Button variant="outline" size="sm" onClick={handleShareLink} className="gap-2">
                          <Share2 className="h-4 w-4" />공유
                        </Button>
                        <Button variant="outline" size="sm" onClick={handleCopyToClipboard} className="gap-2">
                          <Copy className="h-4 w-4" />복사
                        </Button>
                        <Button variant="outline" size="sm" onClick={handleDownloadText} className="gap-2">
                          <Download className="h-4 w-4" />TXT
                        </Button>
                        <Button variant="outline" size="sm" onClick={handleDownloadMarkdown} className="gap-2">
                          <Download className="h-4 w-4" />MD
                        </Button>
                        <Button variant="outline" size="sm" onClick={handleDownloadPDF} className="gap-2">
                          <Download className="h-4 w-4" />PDF
                        </Button>
                        <Button variant="outline" size="sm" onClick={handleDownloadPPT} className="gap-2">
                          <Download className="h-4 w-4" />PPT
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-muted/50 p-6 rounded-lg border max-h-[600px] overflow-y-auto">
                      <p className="whitespace-pre-wrap leading-relaxed">{currentContent}</p>
                    </div>
                  </CardContent>
                </>
              ) : (
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <Clock className="h-16 w-16 text-muted-foreground/30 mb-4" />
                  <p className="text-lg font-semibold mb-2">최종 결과물이 아직 생성되지 않았습니다</p>
                  <p className="text-sm text-muted-foreground text-center max-w-md">
                    모든 파이프라인 단계가 완료되면 최종 결과물이 표시됩니다
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
