
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { processDocument } from "@/lib/azureFunctions";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, CheckCircle2, Clock, XCircle, Loader2, RefreshCw, FileText, List, Download, Copy, Share2, BarChart3, Save, Sparkles, Rocket, MessageSquare } from "lucide-react";
import { Tables } from "@/integrations/supabase/types";
import { InfographicPreview } from "@/components/InfographicPreview";
import CourseDeployment from "@/components/CourseDeployment";
import CourseFeedback from "@/components/CourseFeedback";
import jsPDF from 'jspdf';
import PptxGenJS from 'pptxgenjs';
import { getCurrentContent } from "@/utils/contentSelector";

type Project = Tables<"projects">;
type ProjectStage = Tables<"project_stages">;

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
  const [aiResults, setAiResults] = useState<any[]>([]);
  const [retryingWithAi, setRetryingWithAi] = useState(false);
  const hasLoadedStagesRef = useRef(false);
  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user && id) {
      fetchProjectDetails();
      
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
          async () => {
            // 선택된 AI 모델의 stages만 다시 가져오기
            if (selectedAiModel) {
              const { data: stagesData, error: stagesError } = await supabase
                .from("project_stages")
                .select("*")
                .eq("project_id", id!)
                .eq("ai_model", selectedAiModel)
                .order("stage_order", { ascending: true });

              if (!stagesError && stagesData) {
                setStages(stagesData);
              }
            } else {
              fetchProjectDetails();
            }
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
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'project_ai_results',
            filter: `project_id=eq.${id}`,
          },
          () => {
            fetchProjectDetails();
          }
        )
        .subscribe();

      let retryCount = 0;
      const maxRetries = 10;
      const pollingInterval = setInterval(() => {
        if (retryCount >= maxRetries) {
          clearInterval(pollingInterval);
          return;
        }

        if (!hasLoadedStagesRef.current) {
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
  }, [user, id, selectedAiModel]);

  const fetchProjectDetails = async () => {
    if (!user || !id) return;
    
    try {
      setLoadingProject(true);
      
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
      
      // AI 모델 설정 (프로젝트의 ai_model 사용)
      const currentAiModel = projectData.ai_model || "gemini";
      setSelectedAiModel(currentAiModel);

      // AI 결과 가져오기
      const { data: aiResultsData, error: aiResultsError } = await supabase
        .from("project_ai_results")
        .select("*")
        .eq("project_id", id)
        .order("created_at", { ascending: false });

      if (aiResultsError) throw aiResultsError;
      setAiResults(aiResultsData || []);

      // 단계 정보 가져오기 (프로젝트의 AI 모델의 stages)
      const { data: stagesData, error: stagesError } = await supabase
        .from("project_stages")
        .select("*")
        .eq("project_id", id)
        .eq("ai_model", currentAiModel)
        .order("stage_order", { ascending: true });

      if (stagesError) throw stagesError;
      setStages(stagesData || []);
      if ((stagesData || []).length > 0) {
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
      // 새 창에서 PDF용 HTML 생성 후 인쇄 다이얼로그 열기
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        toast({
          title: "팝업 차단",
          description: "팝업을 허용해주세요.",
          variant: "destructive",
        });
        return;
      }

      // 마크다운 형식을 HTML로 변환
      const formatContent = (text: string) => {
        return text
          .split('\n')
          .map(line => {
            const trimmed = line.trim();
            if (trimmed.startsWith('### ')) {
              return `<h3 style="font-size: 16px; font-weight: bold; margin: 20px 0 10px 0; color: #1e40af;">${trimmed.slice(4)}</h3>`;
            }
            if (trimmed.startsWith('## ')) {
              return `<h2 style="font-size: 18px; font-weight: bold; margin: 24px 0 12px 0; color: #1e3a8a;">${trimmed.slice(3)}</h2>`;
            }
            if (trimmed.startsWith('# ')) {
              return `<h1 style="font-size: 22px; font-weight: bold; margin: 28px 0 14px 0; color: #172554;">${trimmed.slice(2)}</h1>`;
            }
            if (trimmed.startsWith('**') && trimmed.endsWith('**')) {
              return `<p style="font-weight: bold; margin: 16px 0 8px 0; color: #334155;">${trimmed.slice(2, -2)}</p>`;
            }
            if (trimmed.match(/^[•\-*]\s+/)) {
              return `<li style="margin: 4px 0; margin-left: 20px;">${trimmed.replace(/^[•\-*]\s+/, '')}</li>`;
            }
            if (trimmed.match(/^\d+[.)]\s+/)) {
              return `<li style="margin: 4px 0; margin-left: 20px;">${trimmed.replace(/^\d+[.)]\s+/, '')}</li>`;
            }
            if (trimmed === '') {
              return '<br/>';
            }
            return `<p style="margin: 6px 0; line-height: 1.7;">${trimmed}</p>`;
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
            @media print {
              body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            }
            body {
              font-family: 'Noto Sans KR', -apple-system, BlinkMacSystemFont, 'Malgun Gothic', '맑은 고딕', sans-serif;
              max-width: 800px;
              margin: 0 auto;
              padding: 40px;
              line-height: 1.6;
              color: #1e293b;
            }
            h1.title {
              font-size: 28px;
              font-weight: bold;
              color: #1e3a8a;
              margin-bottom: 12px;
              padding-bottom: 12px;
              border-bottom: 3px solid #3b82f6;
            }
            p.description {
              font-size: 16px;
              color: #64748b;
              margin-bottom: 24px;
            }
            .meta {
              font-size: 12px;
              color: #94a3b8;
              margin-bottom: 32px;
            }
            hr {
              border: none;
              border-top: 1px solid #e2e8f0;
              margin: 24px 0;
            }
            .content {
              font-size: 14px;
            }
          </style>
        </head>
        <body>
          <h1 class="title">${project.title}</h1>
          ${project.description ? `<p class="description">${project.description}</p>` : ''}
          <div class="meta">
            생성일: ${new Date(project.created_at).toLocaleDateString('ko-KR')} | AI 모델: ${project.ai_model.toUpperCase()}
          </div>
          <hr/>
          <div class="content">
            ${formatContent(currentContent)}
          </div>
        </body>
        </html>
      `;

      printWindow.document.write(htmlContent);
      printWindow.document.close();
      
      // 폰트 로딩 대기 후 인쇄
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
        }, 500);
      };
      
      toast({
        title: "PDF 다운로드",
        description: "인쇄 다이얼로그에서 'PDF로 저장'을 선택하세요.",
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
    if (!project || !currentContent) return;
    
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
      const paragraphs = currentContent.split('\n\n').filter(p => p.trim());
      
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
  const handleAiModelChange = async (newModel: string, skipAutoRetry = false) => {
    // 이미 같은 모델이 선택되어 있으면 변경하지 않음 (자동 재시도가 아닌 경우)
    if (!skipAutoRetry && selectedAiModel === newModel) return;
    
    // skipAutoRetry가 true인 경우에도 모델이 다르면 변경
    if (selectedAiModel !== newModel) {
      setSelectedAiModel(newModel);
    }
    
    // 선택한 AI 모델의 stages 불러오기
    try {
      const { data: stagesData, error } = await supabase
        .from("project_stages")
        .select("*")
        .eq("project_id", id!)
        .eq("ai_model", newModel)
        .order("stage_order", { ascending: true });

      if (error) throw error;
      setStages(stagesData || []);

      // 선택한 모델의 결과 확인
      const existingResult = aiResults.find(r => r.ai_model === newModel);
      
      // 결과가 없거나 실패 상태이거나 stages가 없을 때 자동으로 재생성 시작 (skipAutoRetry가 false인 경우만)
      if (!skipAutoRetry) {
        const hasNoResult = !existingResult;
        const hasFailedResult = existingResult?.status === 'failed';
        const hasNoStages = !stagesData || stagesData.length === 0;
        const allStagesFailed = stagesData && stagesData.length > 0 && stagesData.every(s => s.status === 'failed');

        if (hasNoResult || hasFailedResult || hasNoStages || allStagesFailed) {
          console.log(`Auto-retrying with ${newModel} model. Reason:`, {
            hasNoResult,
            hasFailedResult,
            hasNoStages,
            allStagesFailed,
          });
          
          // 자동으로 재생성 시작 (비동기로 실행하여 UI 블로킹 방지)
          handleRetryWithAi(newModel).catch((error) => {
            console.error("Auto-retry failed:", error);
            toast({
              title: "자동 재생성 실패",
              description: "AI 재생성을 시작하는 중 오류가 발생했습니다.",
              variant: "destructive",
            });
          });
          return; // handleRetryWithAi가 비동기로 실행되므로 여기서 종료
        }
      }
    } catch (error) {
      console.error("Error fetching stages for AI model:", error);
    }
  };

  const handleRetryWithAi = async (aiModel: string) => {
    if (!project || !user) return;

    try {
      setRetryingWithAi(true);
      
      // 선택한 AI 모델로 결과가 이미 있는지 확인
      const existingResult = aiResults.find(r => r.ai_model === aiModel);
      if (existingResult && existingResult.status === 'completed') {
        toast({
          title: "이미 생성된 결과가 있습니다",
          description: "해당 AI 모델의 결과를 선택해서 확인하세요.",
        });
        // 자동 재시도 방지하고 stages만 불러오기
        await handleAiModelChange(aiModel, true);
        return;
      }

      // 프로젝트 상태 업데이트
      await supabase
        .from("projects")
        .update({ status: "processing" })
        .eq("id", project.id);

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

      // 선택한 AI 모델로 변경 (stages는 실시간 업데이트로 자동 새로고침됨)
      setSelectedAiModel(aiModel);
      
      // stages 다시 불러오기 (자동 재시도 방지)
      const { data: stagesData, error: stagesError } = await supabase
        .from("project_stages")
        .select("*")
        .eq("project_id", project.id)
        .eq("ai_model", aiModel)
        .order("stage_order", { ascending: true });

      if (!stagesError && stagesData) {
        setStages(stagesData);
      }
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

          {/* 프로세싱 중 대형 로딩 카드 */}
          {project.status === 'processing' && (
            <Card className="border-primary/50 bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5 mb-6 overflow-hidden">
              <CardContent className="pt-8 pb-8">
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <Loader2 className="h-10 w-10 animate-spin text-primary" />
                        <div className="absolute inset-0 h-10 w-10 animate-ping opacity-20 rounded-full bg-primary" />
                      </div>
                      <div>
                        <p className="text-xl font-bold mb-1">AI 콘텐츠 생성 중</p>
                        <p className="text-sm text-muted-foreground">
                          {(() => {
                            const processingStage = stages.find(s => s.status === 'processing');
                            if (processingStage) return processingStage.stage_name;
                            const completedCount = stages.filter(s => s.status === 'completed').length;
                            if (completedCount === 0) return '준비 중...';
                            if (completedCount === stages.length) return '최종 검토 중...';
                            return stages[completedCount]?.stage_name || '처리 중...';
                          })()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-4xl font-bold text-primary mb-1">
                        {Math.round((stages.filter(s => s.status === 'completed').length / STAGE_NAMES.length) * 100)}%
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {stages.filter(s => s.status === 'completed').length} / {STAGE_NAMES.length} 완료
                      </p>
                    </div>
                  </div>
                  
                  <Progress 
                    value={(stages.filter(s => s.status === 'completed').length / STAGE_NAMES.length) * 100} 
                    className="h-3" 
                  />
                  
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                    {STAGE_NAMES.map((stageName, idx) => {
                      const stage = stages.find(s => s.stage_name === stageName);
                      const status = stage?.status || 'pending';
                      return (
                        <div 
                          key={idx}
                          className={`relative flex flex-col items-center gap-2 px-4 py-3 rounded-xl text-sm transition-all duration-500 ${
                            status === 'completed' 
                              ? 'bg-green-500/10 border-2 border-green-500/30 text-green-700 dark:text-green-400' 
                              : status === 'processing'
                              ? 'bg-primary/10 border-2 border-primary text-primary scale-105 shadow-lg'
                              : 'bg-muted/50 border border-border text-muted-foreground'
                          }`}
                        >
                          <div className={`h-3 w-3 rounded-full transition-all ${
                            status === 'completed' 
                              ? 'bg-green-500 shadow-lg shadow-green-500/50' 
                              : status === 'processing'
                              ? 'bg-primary animate-pulse shadow-lg shadow-primary/50'
                              : 'bg-muted-foreground/30'
                          }`} />
                          <span className="text-center font-medium text-xs leading-tight">{stageName}</span>
                          {status === 'processing' && (
                            <div className="absolute inset-0 rounded-xl border-2 border-primary animate-pulse" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-6">
            <span>생성일: {new Date(project.created_at).toLocaleDateString('ko-KR')}</span>
            <span>?</span>
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
                <span>?</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs">생성된 AI 결과: </span>
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
                      <Badge variant="outline" className="text-xs">
                        {completedStages} / {stages.length} 단계 완료
                      </Badge>
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
                        <Button
                          key={model}
                          size="sm"
                          variant="outline"
                          onClick={() => handleRetryWithAi(model)}
                          disabled={retryingWithAi}
                        >
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
                        <CardDescription>
                          {selectedAiModel.toUpperCase()} 모델이 생성한 최종 콘텐츠입니다
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
                        <p className="whitespace-pre-wrap leading-relaxed">{currentContent}</p>
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
