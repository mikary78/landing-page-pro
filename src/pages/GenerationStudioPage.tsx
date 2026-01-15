import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Header from "@/components/Header";
import { useAuth } from "@/hooks/useAuth";
import {
  getGenerationJob,
  callAzureFunctionDirect,
  generationChat,
  cancelGenerationJob,
  startGenerationJob,
  type GenerationArtifactDto,
  type JobSummary,
} from "@/lib/azureFunctions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  ArrowLeft, Loader2, RefreshCw, Square, SendHorizonal, 
  ChevronDown, ChevronRight, CheckCircle2, Clock, AlertCircle, Play,
  Download, Copy, FileText, Presentation, BookOpen, Target, 
  ClipboardList, CheckSquare, Award, Sparkles, RotateCcw, Send
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { InfographicCanvas } from "@/components/studio/InfographicCanvas";
import { SlidesCanvas } from "@/components/studio/SlidesCanvas";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Document, Packer, Paragraph, HeadingLevel, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, PageBreak } from "docx";
import { saveAs } from "file-saver";
import { generatePptxBlob } from "@/lib/pptxExport";

interface Project {
  id: string;
  title: string;
  description?: string;
  document_content?: string;
  ai_model?: string;
  status?: string;
  education_duration?: string;
  education_course?: string;
  education_session?: number;
}

interface StepData {
  id: string;
  step_type: string;
  title: string;
  status: string;
  log?: string;
  error?: string;
  output?: any;
  order_index: number;
}

// 단계별 아이콘 매핑
const stepIcons: Record<string, React.ReactNode> = {
  web_search: <Target className="h-4 w-4" />,
  curriculum_design: <BookOpen className="h-4 w-4" />,
  lesson_plan: <FileText className="h-4 w-4" />,
  slides: <Presentation className="h-4 w-4" />,
  lab_template: <ClipboardList className="h-4 w-4" />,
  assessment: <CheckSquare className="h-4 w-4" />,
  final_review: <Award className="h-4 w-4" />,
};

export default function GenerationStudioPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [project, setProject] = useState<Project | null>(null);
  const [jobState, setJobState] = useState<{
    job: any | null;
    steps: StepData[];
    artifacts: GenerationArtifactDto[];
  }>({ job: null, steps: [], artifacts: [] });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [previewTab, setPreviewTab] = useState<"pipeline" | "document" | "infographic" | "slides">("pipeline");
  const [pptxTemplate, setPptxTemplate] = useState<"default" | "minimal" | "creative" | "gamma" | "canva">("gamma");
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());
  const [selectedAiModel, setSelectedAiModel] = useState<string>("");
  const [retryingWithAi, setRetryingWithAi] = useState(false);
  const [jobsList, setJobsList] = useState<JobSummary[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);

  // 코스빌더로 보내기 다이얼로그 상태
  const [showConvertDialog, setShowConvertDialog] = useState(false);
  const [convertMode, setConvertMode] = useState<"new" | "existing">("new");
  const [newCourseTitle, setNewCourseTitle] = useState("");
  const [existingCourses, setExistingCourses] = useState<Array<{ id: string; title: string }>>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const [converting, setConverting] = useState(false);

  // Chat UI state
  const [chatInput, setChatInput] = useState("");
  const [chatSending, setChatSending] = useState(false);
  const [chatMessages, setChatMessages] = useState<
    Array<{ role: "user" | "assistant"; content: string; createdAt: string }>
  >([]);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  // Polling을 위한 ref
  const jobStateRef = useRef(jobState);
  useEffect(() => {
    jobStateRef.current = jobState;
  }, [jobState]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [authLoading, user, navigate]);

  const fetchAll = useCallback(async (isPolling = false, jobIdToFetch?: string) => {
    if (!id) return;
    if (!isPolling) setLoading(true);
    try {
      const [projRes, jobRes] = await Promise.all([
        callAzureFunctionDirect<{ success: boolean; project: Project }>(`/api/getproject/${id}`, "GET"),
        getGenerationJob(id, jobIdToFetch || selectedJobId || undefined),
      ]);

      if (projRes.error) throw projRes.error;
      if (projRes.data?.success) {
        setProject(projRes.data.project);
        // AI 모델 설정 (프로젝트 또는 Job의 ai_model 사용)
        if (!selectedAiModel) {
          setSelectedAiModel(projRes.data.project.ai_model || "gemini");
        }
      }

      if (jobRes.error) throw jobRes.error;
      if (jobRes.data?.success) {
        const newSteps = jobRes.data.steps || [];
        setJobState({
          job: jobRes.data.job,
          steps: newSteps,
          artifacts: jobRes.data.artifacts || [],
        });
        
        // 모든 Job 목록 업데이트
        if (jobRes.data.jobs && jobRes.data.jobs.length > 0) {
          setJobsList(jobRes.data.jobs);
          // 현재 Job ID 설정
          if (!selectedJobId && jobRes.data.job) {
            setSelectedJobId(jobRes.data.job.id);
            setSelectedAiModel(jobRes.data.job.ai_model || "gemini");
          }
        }
        
        // 진행 중인 단계를 자동 확장
        const processingStep = newSteps.find((s: StepData) => s.status === "processing");
        if (processingStep) {
          setExpandedSteps((prev) => new Set([...prev, processingStep.id]));
        }
        
        // 첫 번째 완료된 단계를 자동 선택
        if (!selectedStepId) {
          const firstCompleted = newSteps.find((s: StepData) => s.status === "completed");
          if (firstCompleted) {
            setSelectedStepId(firstCompleted.id);
          }
        }
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id, selectedStepId]);

  useEffect(() => {
    fetchAll(false);
    
    // 폴링: 진행 중이면 2초마다 갱신
    const t = setInterval(() => {
      const currentStatus = jobStateRef.current.job?.status;
      if (currentStatus === "processing" || currentStatus === "queued") {
        fetchAll(true);
      }
    }, 2000);
    
    return () => clearInterval(t);
  }, [fetchAll]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages.length]);

  const artifactsByType = useMemo(() => {
    const map = new Map<string, GenerationArtifactDto>();
    for (const a of jobState.artifacts) map.set(a.artifact_type, a);
    return map;
  }, [jobState.artifacts]);

  const webSources = useMemo(() => {
    const webStep = jobState.steps.find((s) => s.step_type === "web_search" && s.status === "completed");
    const sources = webStep?.output?.sources;
    return Array.isArray(sources) ? sources : [];
  }, [jobState.steps]);

  const slidesDeckSources = useMemo(() => {
    const s = artifactsByType.get("slides")?.content_json?.sources;
    return Array.isArray(s) ? s : [];
  }, [artifactsByType]);

  // 완료된 단계 수 계산
  const completedSteps = useMemo(() => {
    return jobState.steps.filter((s) => s.status === "completed").length;
  }, [jobState.steps]);

  const totalSteps = jobState.steps.length;
  const progress = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

  // 선택된 단계의 output
  const selectedStep = useMemo(() => {
    return jobState.steps.find((s) => s.id === selectedStepId);
  }, [jobState.steps, selectedStepId]);

  // 종합 강의안 (final_review의 combinedDocument 또는 모든 단계 종합)
  const combinedDocument = useMemo(() => {
    const completedSteps = jobState.steps.filter((s) => s.status === "completed");
    if (completedSteps.length === 0) return null;

    // 1. final_review 단계의 combinedDocument 우선 사용
    const finalReviewStep = completedSteps.find((s) => s.step_type === "final_review");
    if (finalReviewStep?.output?.combinedDocument) {
      return finalReviewStep.output.combinedDocument;
    }
    if (finalReviewStep?.output?.finalReview) {
      return finalReviewStep.output.finalReview;
    }

    // 2. artifact에서 document 가져오기
    const docArtifact = artifactsByType.get("document");
    if (docArtifact?.content_text) {
      return docArtifact.content_text;
    }

    // 3. 각 단계의 콘텐츠 수동 종합
    const sections: string[] = [];
    const contentKeys = ["curriculum", "lessonPlan", "labTemplate", "assessment"];
    
    for (const step of completedSteps) {
      if (!step.output) continue;
      for (const key of contentKeys) {
        if (step.output[key] && typeof step.output[key] === "string") {
          sections.push(step.output[key]);
        }
      }
    }

    return sections.length > 0 ? sections.join("\n\n---\n\n") : null;
  }, [jobState.steps, artifactsByType]);

  const statusBadge = (status?: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-500/20 text-green-700 border-green-300"><CheckCircle2 className="h-3 w-3 mr-1" />완료</Badge>;
      case "processing":
        return <Badge className="bg-blue-500/20 text-blue-700 border-blue-300"><Loader2 className="h-3 w-3 mr-1 animate-spin" />진행중</Badge>;
      case "pending":
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />대기</Badge>;
      case "failed":
        return <Badge variant="destructive"><AlertCircle className="h-3 w-3 mr-1" />실패</Badge>;
      case "queued":
        return <Badge className="bg-yellow-500/20 text-yellow-700 border-yellow-300"><Play className="h-3 w-3 mr-1" />대기열</Badge>;
      default:
        return <Badge variant="outline">{status || "준비중"}</Badge>;
    }
  };

  const toggleStepExpand = (stepId: string) => {
    setExpandedSteps((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(stepId)) {
        newSet.delete(stepId);
      } else {
        newSet.add(stepId);
      }
      return newSet;
    });
  };

  // 단계별 output을 시각적으로 렌더링
  const renderStepOutput = (step: StepData) => {
    if (!step.output) return <div className="text-muted-foreground text-sm">아직 출력이 없습니다.</div>;

    // 웹 검색 결과 - 특별 렌더링
    if (step.step_type === "web_search") {
      const { queries, sources } = step.output;
      return (
        <div className="space-y-4">
          {queries && queries.length > 0 && (
            <div>
              <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                <Target className="h-4 w-4 text-blue-500" />
                검색 쿼리
              </h4>
              <div className="flex flex-wrap gap-2">
                {queries.map((q: string, i: number) => (
                  <Badge key={i} variant="secondary" className="text-xs">{q}</Badge>
                ))}
              </div>
            </div>
          )}
          {sources && sources.length > 0 ? (
            <div>
              <h4 className="font-medium text-sm mb-2">검색 결과 ({sources.length}건)</h4>
              <ul className="space-y-2">
                {sources.slice(0, 5).map((s: any, i: number) => (
                  <li key={i} className="text-sm p-2 bg-muted/50 rounded-lg">
                    <a href={s.url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline font-medium">
                      {s.title || s.url}
                    </a>
                    {s.snippet && <p className="text-xs text-muted-foreground mt-1">{s.snippet}</p>}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground p-3 bg-yellow-50 rounded-lg">
              {queries && queries.length > 0 ? (
                <>
                  ⚠️ 검색 쿼리는 생성되었지만 결과를 가져오지 못했습니다.
                  <br />
                  <span className="text-xs mt-1 block">
                    Azure Functions 환경 변수에 TAVILY_API_KEY 또는 SERPER_API_KEY가 설정되어 있는지 확인해주세요.
                  </span>
                </>
              ) : (
                <>
                  ⚠️ 검색 결과 없음 (TAVILY_API_KEY 또는 SERPER_API_KEY 설정 필요)
                </>
              )}
            </div>
          )}
        </div>
      );
    }

    // 슬라이드 결과 - 특별 렌더링
    // output 구조: { slides: { deckTitle, slides: [...] } } 또는 { slides: [...] }
    if (step.step_type === "slides" && step.output.slides) {
      const slidesData = step.output.slides;
      // slides가 객체인 경우 (백엔드에서 { deckTitle, slides } 형태로 래핑)
      const deckTitle = typeof slidesData === "object" && !Array.isArray(slidesData) 
        ? slidesData.deckTitle 
        : step.output.deckTitle;
      const slidesArray = Array.isArray(slidesData) 
        ? slidesData 
        : (slidesData.slides || []);
      
      if (!Array.isArray(slidesArray) || slidesArray.length === 0) {
        return (
          <div className="text-muted-foreground text-sm p-3 bg-yellow-50 rounded-lg">
            ⚠️ 슬라이드 데이터를 파싱할 수 없습니다.
            <details className="mt-2">
              <summary className="cursor-pointer text-xs">원본 데이터 보기</summary>
              <pre className="text-xs mt-2 overflow-auto">{JSON.stringify(step.output, null, 2)}</pre>
            </details>
          </div>
        );
      }
      
      return (
        <div className="space-y-4">
          <h3 className="text-lg font-bold">{deckTitle || "슬라이드 덱"}</h3>
          <div className="grid gap-3">
            {slidesArray.map((slide: any, i: number) => (
              <div key={i} className="p-4 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 rounded-lg border shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-bold">
                    {i + 1}
                  </span>
                  <h4 className="font-semibold">{slide.title}</h4>
                </div>
                {slide.bullets && Array.isArray(slide.bullets) && (
                  <ul className="list-disc list-inside text-sm space-y-1 ml-8">
                    {slide.bullets.map((b: string, j: number) => (
                      <li key={j}>{b}</li>
                    ))}
                  </ul>
                )}
                {slide.speakerNotes && (
                  <details className="mt-2">
                    <summary className="text-xs text-muted-foreground cursor-pointer">발표자 노트</summary>
                    <p className="text-xs mt-1 p-2 bg-muted/50 rounded">{slide.speakerNotes}</p>
                  </details>
                )}
              </div>
            ))}
          </div>
        </div>
      );
    }

    // Markdown 콘텐츠 렌더링
    const contentKeys = ["curriculum", "lessonPlan", "labTemplate", "assessment", "finalReview"];
    for (const key of contentKeys) {
      if (step.output[key] && typeof step.output[key] === "string") {
        return (
          <div className="prose prose-sm max-w-none dark:prose-invert 
            prose-headings:text-foreground prose-p:text-foreground
            prose-table:w-full prose-table:border-collapse prose-table:border prose-table:border-slate-300
            prose-th:bg-slate-100 prose-th:dark:bg-slate-800 prose-th:p-2 prose-th:border prose-th:border-slate-300 prose-th:text-left prose-th:font-semibold
            prose-td:p-2 prose-td:border prose-td:border-slate-300">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{step.output[key]}</ReactMarkdown>
          </div>
        );
      }
    }

    // 프로젝트 커버 이미지 생성 결과 - 특별 렌더링
    if (step.step_type === "design_assets" || step.step_type === "design_illustration") {
      const output = step.output || {};

      // 프로젝트 커버는 'cover' artifact에서 가져오기
      const coverAssets = artifactsByType.get("cover")?.assets;
      const imageDataUrl = coverAssets?.background?.dataUrl
        || output.cover?.dataUrl
        || output.background?.dataUrl
        || output.dataUrl;

      if (imageDataUrl) {
        const imageInfo = coverAssets?.background || output.cover || output.background || {};
        return (
          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-sm mb-2">생성된 프로젝트 커버</h4>
              <div className="border rounded-lg overflow-hidden bg-muted/50">
                <img
                  src={imageDataUrl}
                  alt="Generated project cover"
                  className="w-full h-auto max-h-96 object-contain"
                />
              </div>
            </div>
            {imageInfo && (
              <div className="text-xs text-muted-foreground">
                <p>모델: {imageInfo.model || 'dall-e-3'}</p>
                {imageInfo.createdAt && (
                  <p>생성일: {new Date(imageInfo.createdAt).toLocaleString('ko-KR')}</p>
                )}
              </div>
            )}
          </div>
        );
      }
      
      // 이미지가 없고 JSON만 있는 경우
      if (typeof output === "object") {
        return (
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground p-3 bg-yellow-50 rounded-lg">
              ⚠️ 이미지 생성 결과가 없습니다. (OPENAI_API_KEY 설정 필요 또는 생성 실패)
            </div>
            <details>
              <summary className="cursor-pointer text-xs text-muted-foreground">원본 데이터 보기</summary>
              <pre className="text-xs whitespace-pre-wrap font-mono bg-muted/50 p-3 rounded-lg overflow-auto max-h-96 mt-2">
                {JSON.stringify(output, null, 2)}
              </pre>
            </details>
          </div>
        );
      }
    }

    // 기타 JSON
    if (typeof step.output === "object") {
      return <pre className="text-xs whitespace-pre-wrap font-mono bg-muted/50 p-3 rounded-lg overflow-auto max-h-96">{JSON.stringify(step.output, null, 2)}</pre>;
    }

    return <div className="text-muted-foreground text-sm">알 수 없는 형식</div>;
  };

  // 프로젝트 커버 다운로드
  const handleDownloadBackgroundImage = () => {
    const coverArtifact = jobState.artifacts.find(a => a.artifact_type === 'cover');

    // 프로젝트 커버 이미지 가져오기
    const backgroundDataUrl = coverArtifact?.assets?.background?.dataUrl;

    if (!backgroundDataUrl) {
      toast.error("프로젝트 커버가 생성되지 않았습니다.");
      return;
    }

    // Data URL을 Blob으로 변환
    const arr = backgroundDataUrl.split(',');
    const mimeMatch = arr[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : 'image/png';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    const blob = new Blob([u8arr], { type: mime });

    // 다운로드
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${project?.title || '프로젝트'}_커버이미지.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);

    toast.success("프로젝트 커버가 다운로드되었습니다.");
  };

  // 다운로드 기능들
  const handleDownloadMarkdown = () => {
    if (!project || !combinedDocument) return;
    
    const content = `# ${project.title}\n\n${project.description || ''}\n\n---\n\n${combinedDocument}`;
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${project.title.replace(/\s+/g, '_')}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast.success("마크다운 파일이 다운로드되었습니다.");
  };

  const handleDownloadText = () => {
    if (!project || !combinedDocument) return;
    
    // Markdown 태그 제거
    const plainText = combinedDocument.replace(/[#*_`~[\]]/g, '').replace(/\n{3,}/g, '\n\n');
    const content = `${project.title}\n\n${project.description || ''}\n\n---\n\n${plainText}`;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${project.title.replace(/\s+/g, '_')}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast.success("텍스트 파일이 다운로드되었습니다.");
  };

  const handleCopyToClipboard = async () => {
    if (!combinedDocument) return;
    
    try {
      await navigator.clipboard.writeText(combinedDocument);
      toast.success("클립보드에 복사되었습니다.");
    } catch {
      toast.error("복사 실패");
    }
  };

  // Markdown을 HTML로 변환하는 헬퍼 함수 (A4 용지 기준, 테이블 지원)
  const markdownToHtml = (md: string): string => {
    let html = md;
    
    // Markdown 테이블을 HTML 테이블로 변환
    const tableRegex = /(\\|.+\\|[\r\n]+\\|[-: |]+\\|[\r\n]+(?:\\|.+\\|[\r\n]*)+)/g;
    html = html.replace(tableRegex, (tableMatch) => {
      const rows = tableMatch.trim().split('\n').filter(row => row.trim());
      if (rows.length < 2) return tableMatch;
      
      let tableHtml = '<table style="width:100%; border-collapse:collapse; margin:15px 0; font-size:10pt;">';
      
      // 헤더 행
      const headerCells = rows[0].split('|').filter(cell => cell.trim());
      tableHtml += '<thead><tr style="background:#f1f5f9;">';
      headerCells.forEach(cell => {
        tableHtml += `<th style="border:1px solid #cbd5e1; padding:10px; text-align:left; font-weight:bold;">${cell.trim()}</th>`;
      });
      tableHtml += '</tr></thead>';
      
      // 데이터 행 (구분자 행 제외)
      tableHtml += '<tbody>';
      for (let i = 2; i < rows.length; i++) {
        const cells = rows[i].split('|').filter(cell => cell.trim());
        tableHtml += '<tr>';
        cells.forEach(cell => {
          tableHtml += `<td style="border:1px solid #cbd5e1; padding:10px;">${cell.trim()}</td>`;
        });
        tableHtml += '</tr>';
      }
      tableHtml += '</tbody></table>';
      
      return tableHtml;
    });
    
    // 헤딩
    html = html
      .replace(/^### (.*$)/gm, '<h3 style="color:#1d4ed8; margin-top:20px; margin-bottom:10px; font-size:16px;">$1</h3>')
      .replace(/^## (.*$)/gm, '<h2 style="color:#1e40af; margin-top:30px; margin-bottom:15px; font-size:18px; border-bottom:1px solid #e2e8f0; padding-bottom:8px;">$1</h2>')
      .replace(/^# (.*$)/gm, '<h1 style="color:#1e3a8a; margin-top:40px; margin-bottom:20px; font-size:22px; border-bottom:2px solid #3b82f6; padding-bottom:10px;">$1</h1>')
      // 볼드/이탤릭
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>')
      // 리스트
      .replace(/^- (.*$)/gm, '<li style="margin-bottom:6px;">$1</li>')
      .replace(/^(\d+)\. (.*$)/gm, '<li style="margin-bottom:6px;">$2</li>')
      // 구분선 -> 페이지 나눔 힌트
      .replace(/^---$/gm, '<div style="page-break-before:always; margin:30px 0;"></div>')
      // 빈 줄
      .replace(/\n\n/g, '</p><p style="margin-bottom:12px; line-height:1.8;">')
      .replace(/\n/g, '<br>');
    
    return html;
  };

  const handleDownloadPDF = () => {
    if (!project || !combinedDocument) return;
    
    try {
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        toast.error("팝업을 허용해주세요.");
        return;
      }
      
      const htmlContent = markdownToHtml(combinedDocument);
      
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>${project.title}</title>
          <style>
            @page {
              size: A4;
              margin: 25mm 20mm 25mm 20mm;
            }
            body { 
              font-family: 'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif; 
              line-height: 1.8; 
              font-size: 11pt;
              color: #1e293b;
              max-width: 170mm;
              margin: 0 auto;
            }
            h1 { color: #1e3a8a; border-bottom: 2px solid #3b82f6; padding-bottom: 10px; font-size: 22pt; margin-top: 0; }
            h2 { color: #1e40af; margin-top: 25px; font-size: 16pt; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; }
            h3 { color: #1d4ed8; margin-top: 20px; font-size: 13pt; }
            p { margin-bottom: 12px; text-align: justify; }
            table { border-collapse: collapse; width: 100%; margin: 15px 0; font-size: 10pt; }
            th, td { border: 1px solid #cbd5e1; padding: 10px; text-align: left; }
            th { background: #f1f5f9; font-weight: bold; }
            ul, ol { padding-left: 25px; margin: 15px 0; }
            li { margin-bottom: 8px; }
            .header-info { color: #64748b; font-size: 10pt; margin-bottom: 20px; }
            .footer { position: fixed; bottom: 10mm; width: 100%; text-align: center; font-size: 9pt; color: #94a3b8; }
            @media print { 
              body { padding: 0; }
              .page-break { page-break-before: always; }
            }
          </style>
        </head>
        <body>
          <h1>${project.title}</h1>
          ${project.description ? `<p class="header-info">${project.description}</p>` : ''}
          ${project.education_duration || project.education_course || project.education_session ? `
            <p class="header-info">
              ${project.education_duration ? `⏱️ ${project.education_duration}` : ''} 
              ${project.education_course ? `| 📖 ${project.education_course}` : ''} 
              ${project.education_session ? `| 🔢 ${project.education_session}회차` : ''}
            </p>
          ` : ''}
          <hr style="border:none; border-top:1px solid #e2e8f0; margin:20px 0;">
          <p style="margin-bottom:12px; line-height:1.8;">${htmlContent}</p>
          <div class="footer">Generated by AI Autopilot · ${new Date().toLocaleDateString('ko-KR')}</div>
        </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.onload = () => setTimeout(() => printWindow.print(), 500);
      
      toast.info("인쇄 다이얼로그에서 'PDF로 저장'을 선택하세요.");
    } catch {
      toast.error("PDF 생성 중 오류가 발생했습니다.");
    }
  };

  // 워드(.docx) 다운로드
  const handleDownloadWord = async () => {
    if (!project || !combinedDocument) return;
    
    try {
      // Markdown을 docx 문서 요소로 변환
      const children: any[] = [];
      
      // 제목
      children.push(
        new Paragraph({
          text: project.title,
          heading: HeadingLevel.TITLE,
          spacing: { after: 400 },
        })
      );
      
      // 설명
      if (project.description) {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: project.description, color: "64748b", size: 22 })],
            spacing: { after: 200 },
          })
        );
      }
      
      // 교육 설정
      if (project.education_duration || project.education_course || project.education_session) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({ 
                text: `${project.education_duration ? `⏱️ ${project.education_duration}` : ''} ${project.education_course ? `| 📖 ${project.education_course}` : ''} ${project.education_session ? `| 🔢 ${project.education_session}회차` : ''}`,
                color: "64748b",
                size: 20,
              })
            ],
            spacing: { after: 400 },
          })
        );
      }
      
      // Markdown 테이블 파싱 헬퍼
      const parseMarkdownTable = (tableText: string): any => {
        const rows = tableText.trim().split('\n').filter(row => row.trim());
        if (rows.length < 2) return null;
        
        const parseRow = (row: string) => row.split('|').filter(cell => cell.trim()).map(cell => cell.trim());
        const headerCells = parseRow(rows[0]);
        const dataRows = rows.slice(2).map(parseRow); // Skip header and separator
        
        const tableRows = [
          // Header row
          new TableRow({
            children: headerCells.map(cell => 
              new TableCell({
                children: [new Paragraph({ children: [new TextRun({ text: cell, bold: true })] })],
                shading: { fill: "E2E8F0" },
              })
            ),
          }),
          // Data rows
          ...dataRows.map(cells => 
            new TableRow({
              children: cells.map(cell => 
                new TableCell({
                  children: [new Paragraph({ text: cell })],
                })
              ),
            })
          ),
        ];
        
        return new Table({
          rows: tableRows,
          width: { size: 100, type: WidthType.PERCENTAGE },
        });
      };
      
      // 테이블 블록 먼저 추출
      const content = combinedDocument;
      const tableRegex = /(\\|.+\\|[\r\n]+\\|[-: |]+\\|[\r\n]+(?:\\|.+\\|[\r\n]*)+)/g;
      const tables: { index: number; table: string }[] = [];
      let tableMatch;
      
      while ((tableMatch = tableRegex.exec(content)) !== null) {
        tables.push({ index: tableMatch.index, table: tableMatch[1] });
      }
      
      // 테이블을 플레이스홀더로 대체
      let processedContent = content;
      tables.forEach((t, i) => {
        processedContent = processedContent.replace(t.table, `__TABLE_PLACEHOLDER_${i}__`);
      });
      
      // 본문 파싱
      const lines = processedContent.split('\n');
      for (const line of lines) {
        // 테이블 플레이스홀더 처리
        const tablePlaceholderMatch = line.match(/__TABLE_PLACEHOLDER_(\d+)__/);
        if (tablePlaceholderMatch) {
          const tableIndex = parseInt(tablePlaceholderMatch[1]);
          const table = parseMarkdownTable(tables[tableIndex].table);
          if (table) {
            children.push(table);
          }
        } else if (line.startsWith('# ')) {
          children.push(
            new Paragraph({
              text: line.substring(2),
              heading: HeadingLevel.HEADING_1,
              spacing: { before: 400, after: 200 },
            })
          );
        } else if (line.startsWith('## ')) {
          children.push(
            new Paragraph({
              text: line.substring(3),
              heading: HeadingLevel.HEADING_2,
              spacing: { before: 300, after: 150 },
            })
          );
        } else if (line.startsWith('### ')) {
          children.push(
            new Paragraph({
              text: line.substring(4),
              heading: HeadingLevel.HEADING_3,
              spacing: { before: 200, after: 100 },
            })
          );
        } else if (line.startsWith('- ')) {
          children.push(
            new Paragraph({
              text: line.substring(2),
              bullet: { level: 0 },
              spacing: { after: 80 },
            })
          );
        } else if (line.match(/^\d+\. /)) {
          children.push(
            new Paragraph({
              text: line.replace(/^\d+\. /, ''),
              numbering: { reference: "default-numbering", level: 0 },
              spacing: { after: 80 },
            })
          );
        } else if (line === '---') {
          // 페이지 나눔
          children.push(
            new Paragraph({
              children: [new PageBreak()],
            })
          );
        } else if (line.trim()) {
          // 일반 텍스트 (볼드/이탤릭 처리)
          const runs: TextRun[] = [];
          const remaining = line;
          
          // 볼드 처리
          const boldRegex = /\*\*([^*]+)\*\*/g;
          let match;
          let lastIndex = 0;
          
          while ((match = boldRegex.exec(remaining)) !== null) {
            if (match.index > lastIndex) {
              runs.push(new TextRun({ text: remaining.substring(lastIndex, match.index) }));
            }
            runs.push(new TextRun({ text: match[1], bold: true }));
            lastIndex = match.index + match[0].length;
          }
          
          if (lastIndex < remaining.length) {
            runs.push(new TextRun({ text: remaining.substring(lastIndex) }));
          }
          
          if (runs.length === 0) {
            runs.push(new TextRun({ text: line }));
          }
          
          children.push(
            new Paragraph({
              children: runs,
              spacing: { after: 120 },
              alignment: AlignmentType.JUSTIFIED,
            })
          );
        }
      }
      
      const doc = new Document({
        sections: [{
          properties: {
            page: {
              size: { width: 11906, height: 16838 }, // A4
              margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }, // 1 inch = 1440 twips
            },
          },
          children,
        }],
        numbering: {
          config: [{
            reference: "default-numbering",
            levels: [{
              level: 0,
              format: "decimal",
              text: "%1.",
              alignment: AlignmentType.START,
            }],
          }],
        },
      });
      
      const blob = await Packer.toBlob(doc);
      saveAs(blob, `${project.title.replace(/\s+/g, '_')}.docx`);
      toast.success("Word 파일이 다운로드되었습니다.");
    } catch (e) {
      console.error("Word download error:", e);
      toast.error("Word 파일 생성 중 오류가 발생했습니다.");
    }
  };

  const handleDownloadPPT = async () => {
    if (!project) return;
    
    try {
      // 우선: backend artifact(slides.content_json) 사용 (Sources, speakerNotes 표준화 포함)
      const slidesArtifact = artifactsByType.get("slides");
      const slidesJson = (slidesArtifact?.content_json || null) as any;
      const slidesAssets = (slidesArtifact?.assets || null) as any;

      // fallback: step output에서 추출 (과거 데이터 호환)
      let fallbackSlidesJson: any = null;
      const slidesStep = jobState.steps.find((s) => s.step_type === "slides" && s.status === "completed");
      if (!slidesJson && slidesStep?.output?.slides) {
        const slidesData = slidesStep.output.slides;
        if (typeof slidesData === "object" && !Array.isArray(slidesData)) {
          fallbackSlidesJson = { deckTitle: slidesData.deckTitle, slides: slidesData.slides, sources: slidesData.sources };
        } else if (Array.isArray(slidesData)) {
          fallbackSlidesJson = { deckTitle: project.title, slides: slidesData };
        }
      }

      // 마지막 fallback: 문서(Markdown) 기반으로 최소 deck 생성
      if (!slidesJson && !fallbackSlidesJson && combinedDocument) {
        const sections = combinedDocument.split(/\n## /);
        const slides = [];
        for (const section of sections.slice(0, 15)) {
          const lines = section.split("\n");
          const title = lines[0]?.replace(/^#+ /, "") || "내용";
          const contentLines = lines.slice(1).filter((l) => l.trim());
          const bullets = contentLines
            .filter((l) => l.startsWith("- ") || l.match(/^\d+\. /))
            .map((l) => l.replace(/^- /, "").replace(/^\d+\. /, ""))
            .slice(0, 8);
          if (title && bullets.length > 0) {
            slides.push({ title, bullets });
          }
        }
        fallbackSlidesJson = { deckTitle: project.title, slides };
      }

      const effectiveSlidesJson = slidesJson || fallbackSlidesJson;
      if (!effectiveSlidesJson) {
        toast.error("슬라이드 산출물이 없어 PPTX를 만들 수 없습니다. (슬라이드 생성 후 다시 시도해주세요)");
        return;
      }

      const { blob, fileName } = await generatePptxBlob({
        projectTitle: project.title,
        projectDescription: project.description,
        slidesJson: effectiveSlidesJson,
        assets: slidesAssets,
        template: pptxTemplate,
      });
      saveAs(blob, fileName);
      toast.success("PowerPoint 파일이 다운로드되었습니다.");
    } catch (e) {
      console.error("PPT download error:", e);
      toast.error("PowerPoint 생성 중 오류가 발생했습니다.");
    }
  };

  // ============================================================
  // 코스빌더로 보내기 기능
  // ============================================================

  // 다이얼로그 열기 - 기존 코스 목록 로드
  const handleOpenConvertDialog = async () => {
    setShowConvertDialog(true);
    setNewCourseTitle(project?.title || "");
    setConvertMode("new");
    setSelectedCourseId("");
    
    // 기존 코스 목록 로드
    try {
      const { data, error } = await callAzureFunctionDirect<{
        success: boolean;
        courses: Array<{ id: string; title: string }>;
      }>("/api/getcourses", "GET");
      
      if (!error && data?.courses) {
        setExistingCourses(data.courses);
      }
    } catch (e) {
      console.error("Failed to load courses:", e);
    }
  };

  // 코스빌더로 변환 실행
  const handleConvertToCourse = async () => {
    if (!project || !id) return;
    
    // 유효성 검사
    if (convertMode === "new" && !newCourseTitle.trim()) {
      toast.error("코스 제목을 입력해주세요.");
      return;
    }
    if (convertMode === "existing" && !selectedCourseId) {
      toast.error("기존 코스를 선택해주세요.");
      return;
    }
    
    try {
      setConverting(true);
      
      const requestBody: any = {
        projectId: id,
      };
      
      if (convertMode === "new") {
        requestBody.newCourseTitle = newCourseTitle.trim();
      } else {
        requestBody.targetCourseId = selectedCourseId;
      }
      
      const { data, error } = await callAzureFunctionDirect<{
        success: boolean;
        data?: {
          courseId: string;
          courseTitle: string;
          modulesCreated: number;
          lessonsCreated: number;
        };
        message?: string;
        error?: string;
      }>("/api/project/convert-to-course", "POST", requestBody);
      
      if (error || !data?.success) {
        throw new Error(data?.error || error?.message || "변환 실패");
      }
      
      toast.success(data.message || "코스빌더로 변환되었습니다.");
      setShowConvertDialog(false);
      
      // 코스빌더로 이동 확인
      const goToCourse = window.confirm(
        `코스빌더로 이동하시겠습니까?\n\n생성된 코스: ${data.data?.courseTitle}\n모듈: ${data.data?.modulesCreated}개, 레슨: ${data.data?.lessonsCreated}개`
      );
      
      if (goToCourse && data.data?.courseId) {
        navigate(`/courses/${data.data.courseId}/builder`);
      }
    } catch (e: any) {
      toast.error(`변환 실패: ${e?.message || e}`);
    } finally {
      setConverting(false);
    }
  };

  // 프로젝트 재실행 (현재 AI 모델로)
  const handleRerun = async () => {
    if (!project || !user || !id) return;
    
    try {
      setRetryingWithAi(true);
      
      // 새 Generation Job 시작
      const { data, error } = await startGenerationJob({
        projectId: id,
        documentContent: project.document_content || project.description || "",
        aiModel: (selectedAiModel || project.ai_model || "gemini") as "gemini" | "claude" | "chatgpt",
        outputs: { document: true, infographic: true, slides: true },
        options: { enableWebSearch: true, enableImageGeneration: true },
      });

      if (error) throw error;

      // 새로 생성된 Job ID로 상태 업데이트
      if (data?.jobId) {
        setSelectedJobId(data.jobId);
        setSelectedStepId(null); // 단계 선택 초기화
      }

      toast.success("프로젝트 재실행을 시작했습니다.");

      // 새 Job ID로 데이터 새로고침
      await fetchAll(false, data?.jobId);
    } catch (e: any) {
      toast.error(`재실행 실패: ${e?.message || e}`);
    } finally {
      setRetryingWithAi(false);
    }
  };

  // 다른 AI 모델로 재시도
  const handleRetryWithAi = async (aiModel: string) => {
    if (!project || !user || !id) return;
    
    try {
      setRetryingWithAi(true);
      
      // 새 Generation Job 시작 (다른 AI 모델)
      const { data, error } = await startGenerationJob({
        projectId: id,
        documentContent: project.document_content || project.description || "",
        aiModel: aiModel as "gemini" | "claude" | "chatgpt",
        outputs: { document: true, infographic: true, slides: true },
        options: { enableWebSearch: true, enableImageGeneration: true },
      });

      if (error) throw error;

      // 새로 생성된 Job ID로 상태 업데이트
      if (data?.jobId) {
        setSelectedJobId(data.jobId);
        setSelectedStepId(null); // 단계 선택 초기화
      }

      setSelectedAiModel(aiModel);
      toast.success(`${aiModel.toUpperCase()} 모델로 재생성을 시작했습니다.`);

      // 새 Job ID로 데이터 새로고침
      await fetchAll(false, data?.jobId);
    } catch (e: any) {
      toast.error(`재시도 실패: ${e?.message || e}`);
    } finally {
      setRetryingWithAi(false);
    }
  };

  // AI 모델 변경 - 해당 모델의 Job이 있으면 불러오기
  const handleAiModelChange = async (newModel: string) => {
    if (selectedAiModel === newModel) return;

    // 재실행 중이면 모델만 변경하고 메시지 표시 안 함
    if (retryingWithAi) {
      setSelectedAiModel(newModel);
      return;
    }

    setSelectedAiModel(newModel);

    // 해당 모델의 Job 찾기
    const jobForModel = jobsList.find(j => j.ai_model === newModel);
    if (jobForModel) {
      setSelectedJobId(jobForModel.id);
      setSelectedStepId(null); // 단계 선택 초기화
      await fetchAll(false, jobForModel.id);
      toast.success(`${newModel.toUpperCase()} 모델의 결과를 불러왔습니다.`);
    } else {
      // Job이 없는 경우에만 안내 메시지 표시
      toast.info(`${newModel.toUpperCase()} 모델로 생성된 결과가 없습니다. '재실행' 버튼으로 생성하세요.`);
    }
  };
  
  // 특정 Job 선택
  const handleSelectJob = async (jobId: string) => {
    const job = jobsList.find(j => j.id === jobId);
    if (job) {
      setSelectedJobId(jobId);
      setSelectedAiModel(job.ai_model);
      setSelectedStepId(null);
      await fetchAll(false, jobId);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={() => navigate('/dashboard')} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              프로젝트 목록으로
            </Button>
            <div>
              <div className="text-lg font-semibold">{project?.title || "프로젝트"}</div>
              <div className="text-xs text-muted-foreground flex items-center gap-2">
                스튜디오 · Job {statusBadge(jobState.job?.status)}
                <span>·</span>
                <span>AI: {selectedAiModel?.toUpperCase() || "미설정"}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* AI 모델 선택 */}
            <Select value={selectedAiModel} onValueChange={handleAiModelChange}>
              <SelectTrigger className="w-[120px] h-8">
                <SelectValue placeholder="AI 모델" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gemini">Gemini</SelectItem>
                <SelectItem value="claude">Claude</SelectItem>
                <SelectItem value="chatgpt">ChatGPT</SelectItem>
              </SelectContent>
            </Select>

            {/* 재실행 버튼 */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleRerun}
              disabled={retryingWithAi || jobState.job?.status === "processing"}
              className="gap-1"
            >
              {retryingWithAi ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RotateCcw className="h-4 w-4" />
              )}
              재실행
            </Button>

            {/* 생성된 AI 결과 선택 (드롭다운) */}
            {jobsList.length > 0 && (
              <Select
                value={selectedJobId || ""}
                onValueChange={(value) => handleSelectJob(value)}
              >
                <SelectTrigger className="w-[160px] h-8 text-xs">
                  <div className="flex items-center gap-1">
                    <span className="text-muted-foreground">결과:</span>
                    <SelectValue placeholder="결과 선택" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {jobsList.map((job, index) => (
                    <SelectItem 
                      key={job.id} 
                      value={job.id}
                      disabled={job.status !== "completed"}
                    >
                      <div className="flex items-center gap-2">
                        <span>{job.ai_model.toUpperCase()}</span>
                        {jobsList.filter(j => j.ai_model === job.ai_model).length > 1 && (
                          <span className="text-muted-foreground">
                            #{jobsList.filter(j => j.ai_model === job.ai_model).indexOf(job) + 1}
                          </span>
                        )}
                        {job.status === "processing" && <Loader2 className="h-3 w-3 animate-spin" />}
                        {job.status === "completed" && <CheckCircle2 className="h-3 w-3 text-green-500" />}
                        {job.status === "failed" && <AlertCircle className="h-3 w-3 text-red-500" />}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* 다른 AI로 재시도 (드롭다운) */}
            {jobState.job?.status === "completed" && (
              <Select
                value=""
                onValueChange={(model) => handleRetryWithAi(model)}
                disabled={retryingWithAi}
              >
                <SelectTrigger className="w-[120px] h-8 text-xs">
                  <div className="flex items-center gap-1">
                    <Sparkles className="h-3 w-3" />
                    <span>다른 AI</span>
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {['gemini', 'claude', 'chatgpt'].map((model) => (
                    <SelectItem key={model} value={model}>
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-3 w-3" />
                        {model.toUpperCase()}로 생성
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* 다운로드 버튼 (드롭다운) */}
            {jobState.job?.status === "completed" && (
              <Select
                value={pptxTemplate}
                onValueChange={(v) => setPptxTemplate(v as any)}
              >
                <SelectTrigger className="w-[150px] h-8 text-xs">
                  <div className="flex items-center gap-1">
                    <Presentation className="h-3 w-3" />
                    <span>PPT 템플릿</span>
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Modern (default)</SelectItem>
                  <SelectItem value="minimal">Minimal</SelectItem>
                  <SelectItem value="creative">Creative</SelectItem>
                  <SelectItem value="gamma">Gamma (추천)</SelectItem>
                  <SelectItem value="canva">Canva (추천)</SelectItem>
                </SelectContent>
              </Select>
            )}

            {/* 다운로드 버튼 (드롭다운) */}
            {jobState.job?.status === "completed" && (
              <Select
                value=""
                onValueChange={(action) => {
                  switch (action) {
                    case "copy": handleCopyToClipboard(); break;
                    case "txt": handleDownloadText(); break;
                    case "md": handleDownloadMarkdown(); break;
                    case "pdf": handleDownloadPDF(); break;
                    case "docx": handleDownloadWord(); break;
                    case "ppt": handleDownloadPPT(); break;
                    case "bg-image": handleDownloadBackgroundImage(); break;
                  }
                }}
              >
                <SelectTrigger className="w-[120px] h-8 text-xs">
                  <div className="flex items-center gap-1">
                    <Download className="h-3 w-3" />
                    <span>다운로드</span>
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="copy">
                    <div className="flex items-center gap-2">
                      <Copy className="h-3 w-3" />클립보드 복사
                    </div>
                  </SelectItem>
                  <SelectItem value="txt" disabled={!combinedDocument}>
                    <div className="flex items-center gap-2">
                      <FileText className="h-3 w-3" />TXT 파일
                    </div>
                  </SelectItem>
                  <SelectItem value="md" disabled={!combinedDocument}>
                    <div className="flex items-center gap-2">
                      <FileText className="h-3 w-3" />Markdown 파일
                    </div>
                  </SelectItem>
                  <SelectItem value="pdf" disabled={!combinedDocument}>
                    <div className="flex items-center gap-2">
                      <FileText className="h-3 w-3" />PDF 파일
                    </div>
                  </SelectItem>
                  <SelectItem value="docx" disabled={!combinedDocument}>
                    <div className="flex items-center gap-2">
                      <FileText className="h-3 w-3" />Word 문서 (DOCX)
                    </div>
                  </SelectItem>
                  <SelectItem
                    value="ppt"
                    disabled={
                      !(
                        artifactsByType.get("slides")?.content_json ||
                        jobState.steps.some((s) => s.step_type === "slides" && s.status === "completed") ||
                        combinedDocument
                      )
                    }
                  >
                    <div className="flex items-center gap-2">
                      <Presentation className="h-3 w-3" />슬라이드 만들기 (PPTX)
                    </div>
                  </SelectItem>
                  <SelectItem value="bg-image">
                    <div className="flex items-center gap-2">
                      <Download className="h-3 w-3" />프로젝트 커버 (PNG)
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            )}
            
            {/* 코스빌더로 보내기 버튼 */}
            {jobState.job?.status === "completed" && (
              <Button
                variant="secondary"
                size="sm"
                onClick={handleOpenConvertDialog}
                className="h-8 text-xs"
              >
                <Send className="h-3 w-3 mr-1" />
                코스빌더로 보내기
              </Button>
            )}
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setRefreshing(true);
                fetchAll(false);
              }}
              className="gap-2"
              disabled={refreshing}
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              새로고침
            </Button>
          </div>
        </div>

        {/* 진행 상태 바 - 처리 중이거나 재실행 중일 때 표시 */}
        {(retryingWithAi || (jobState.job && (jobState.job.status === "processing" || jobState.job.status === "queued"))) && (
          <div className="mb-4 rounded-lg border bg-blue-50 dark:bg-blue-950/30 p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                <span className="font-medium">
                  {retryingWithAi ? `${selectedAiModel.toUpperCase()} 모델로 재생성 중...` : "AI 콘텐츠 생성 중..."}
                </span>
              </div>
              <span className="text-2xl font-bold text-blue-600">{retryingWithAi ? 0 : progress}%</span>
            </div>
            <div className="w-full bg-blue-200 rounded-full h-3">
              <div 
                className="bg-blue-600 h-3 rounded-full transition-all duration-500" 
                style={{ width: `${retryingWithAi ? 5 : progress}%` }}
              />
            </div>
            <div className="text-sm text-muted-foreground mt-2">
              {retryingWithAi ? "작업 시작 대기 중..." : `${completedSteps} / ${totalSteps} 단계 완료`}
            </div>
          </div>
        )}

        <div className="grid gap-4 lg:grid-cols-[380px_1fr]">
          {/* Left: 파이프라인 */}
          <Card className="h-[calc(100vh-220px)]">
            <CardHeader className="py-3">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-base">📋 파이프라인</CardTitle>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1 h-7 text-xs"
                  onClick={async () => {
                    if (!id) return;
                    try {
                      const res = await cancelGenerationJob({ projectId: id, reason: "Cancelled by user" });
                      if (res.error) throw res.error;
                      toast.success("작업 중단을 요청했습니다.");
                      await fetchAll(false);
                    } catch (e: any) {
                      toast.error(`중단 요청 실패: ${e?.message || e}`);
                    }
                  }}
                  disabled={!jobState.job || jobState.job?.status === "completed" || jobState.job?.status === "failed"}
                >
                  <Square className="h-3 w-3" />
                  중단
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[calc(100vh-340px)] px-4">
                <div className="space-y-2 pb-4">
                  {/* 교육 설정 */}
                  {(project?.education_duration || project?.education_course || project?.education_session) && (
                    <div className="rounded-lg border bg-blue-50 dark:bg-blue-950/30 p-3">
                      <div className="text-xs text-muted-foreground mb-2 font-medium">📚 교육 설정</div>
                      <div className="flex flex-wrap gap-2 text-xs">
                        {project?.education_duration && (
                          <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/50 rounded">⏱️ {project.education_duration}</span>
                        )}
                        {project?.education_course && (
                          <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/50 rounded">📖 {project.education_course}</span>
                        )}
                        {project?.education_session && (
                          <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/50 rounded">🔢 {project.education_session}회차</span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* 파이프라인 단계 */}
                  {jobState.steps.map((s, idx) => (
                    <div 
                      key={s.id}
                      className={`rounded-lg border transition-all cursor-pointer ${
                        s.status === "processing" 
                          ? "bg-blue-50 dark:bg-blue-950/30 border-blue-300 ring-2 ring-blue-400" 
                          : s.status === "completed"
                          ? "bg-green-50/50 dark:bg-green-950/20 hover:bg-green-50 dark:hover:bg-green-950/30"
                          : "hover:bg-muted/50"
                      } ${selectedStepId === s.id ? "ring-2 ring-primary" : ""}`}
                      onClick={() => {
                        setSelectedStepId(s.id);
                        if (s.status === "completed") {
                          toggleStepExpand(s.id);
                        }
                      }}
                    >
                      <div className="p-3">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                              {stepIcons[s.step_type] || idx + 1}
                            </span>
                            <span className="font-medium text-sm">{s.title}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            {statusBadge(s.status)}
                            {s.status === "completed" && (
                              expandedSteps.has(s.id) ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />
                            )}
                          </div>
                        </div>
                        {s.status === "processing" && (
                          <div className="text-xs text-blue-600 mt-2 flex items-center gap-1 ml-8">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            처리 중...
                          </div>
                        )}
                        {s.error && <div className="text-xs text-destructive mt-2 ml-8">{s.error}</div>}
                      </div>
                      
                      {/* 펼침 내용 */}
                      {expandedSteps.has(s.id) && s.status === "completed" && s.output && (
                        <div className="border-t bg-background p-3 max-h-48 overflow-auto">
                          <div className="text-xs">
                            {renderStepOutput(s)}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  
                  {jobState.steps.length === 0 && (
                    <div className="text-sm text-muted-foreground p-3 flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      파이프라인을 준비하고 있습니다...
                    </div>
                  )}
                </div>
              </ScrollArea>

              {/* Chat */}
              <div className="border-t p-3">
                <div className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                  💬 AI 수정 요청
                </div>
                <div className="flex gap-2">
                  <Textarea
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="수정 요청..."
                    className="min-h-[40px] text-sm resize-none"
                    rows={1}
                  />
                  <Button
                    size="sm"
                    onClick={async () => {
                      if (!id) return;
                      const msg = chatInput.trim();
                      if (!msg) return;

                      setChatSending(true);
                      setChatInput("");
                      setChatMessages((prev) => [...prev, { role: "user", content: msg, createdAt: new Date().toISOString() }]);

                      try {
                        const targets = { document: true };
                        const res = await generationChat({ projectId: id, message: msg, targets });
                        if (res.error) throw res.error;
                        const assistant = res.data?.assistantMessage || "요청을 접수했습니다.";
                        setChatMessages((prev) => [
                          ...prev,
                          { role: "assistant", content: assistant, createdAt: new Date().toISOString() },
                        ]);
                        await fetchAll(false);
                      } catch (e: any) {
                        setChatMessages((prev) => [
                          ...prev,
                          { role: "assistant", content: `오류: ${e?.message || e}`, createdAt: new Date().toISOString() },
                        ]);
                      } finally {
                        setChatSending(false);
                      }
                    }}
                    disabled={chatSending}
                    className="h-10"
                  >
                    {chatSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <SendHorizonal className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Right: Preview */}
          <Card className="h-[calc(100vh-220px)]">
            <CardHeader className="py-3">
              <CardTitle className="text-base">📄 결과물</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <Tabs value={previewTab} onValueChange={(v) => setPreviewTab(v as any)} className="w-full">
                <TabsList className="w-full justify-start">
                  <TabsTrigger value="pipeline" className="gap-1"><FileText className="h-4 w-4" />단계별 보기</TabsTrigger>
                  <TabsTrigger value="document" className="gap-1"><BookOpen className="h-4 w-4" />종합 강의안</TabsTrigger>
                  <TabsTrigger value="infographic" className="gap-1">📊 인포그래픽</TabsTrigger>
                  <TabsTrigger value="slides" className="gap-1"><Presentation className="h-4 w-4" />슬라이드</TabsTrigger>
                  <TabsTrigger value="assets" className="gap-1"><Download className="h-4 w-4" />디자인 에셋</TabsTrigger>
                </TabsList>

                {/* 단계별 보기 탭 */}
                <TabsContent value="pipeline" className="mt-4">
                  <ScrollArea className="h-[calc(100vh-380px)]">
                    <div className="rounded-xl border bg-white dark:bg-slate-900 shadow-sm p-6 min-h-[400px]">
                      {selectedStep ? (
                        <>
                          <div className="flex items-center justify-between mb-4 pb-4 border-b">
                            <div className="flex items-center gap-3">
                              <span className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                {stepIcons[selectedStep.step_type] || <FileText className="h-5 w-5" />}
                              </span>
                              <div>
                                <h3 className="text-lg font-semibold">{selectedStep.title}</h3>
                                <p className="text-xs text-muted-foreground">{selectedStep.log}</p>
                              </div>
                            </div>
                            {statusBadge(selectedStep.status)}
                          </div>
                          {selectedStep.status === "completed" && selectedStep.output ? (
                            renderStepOutput(selectedStep)
                          ) : selectedStep.status === "processing" ? (
                            <div className="flex items-center justify-center py-12">
                              <div className="text-center">
                                <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
                                <p className="text-lg font-medium">콘텐츠를 생성하고 있습니다...</p>
                              </div>
                            </div>
                          ) : (
                            <div className="text-muted-foreground py-12 text-center">
                              아직 이 단계가 실행되지 않았습니다.
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="text-center py-12 text-muted-foreground">
                          <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p className="text-lg mb-2">👈 왼쪽 파이프라인에서 단계를 선택하세요</p>
                          <p className="text-sm">각 단계를 클릭하면 생성된 내용을 확인할 수 있습니다.</p>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </TabsContent>

                {/* 종합 강의안 탭 */}
                <TabsContent value="document" className="mt-4">
                  <ScrollArea className="h-[calc(100vh-380px)]">
                    <div className="rounded-xl border bg-white dark:bg-slate-900 shadow-sm p-6 min-h-[400px]">
                      {combinedDocument ? (
                        <article className="prose prose-sm max-w-none dark:prose-invert 
                          prose-headings:text-foreground prose-headings:font-bold
                          prose-h1:text-2xl prose-h1:border-b prose-h1:pb-2 prose-h1:mb-4
                          prose-h2:text-xl prose-h2:mt-8 prose-h2:mb-4 prose-h2:text-primary
                          prose-h3:text-lg prose-h3:mt-6 prose-h3:mb-3
                          prose-p:text-foreground prose-p:leading-relaxed
                          prose-li:text-foreground
                          prose-table:w-full prose-table:border-collapse prose-table:border prose-table:border-slate-300 prose-table:my-4
                          prose-thead:bg-slate-100 prose-thead:dark:bg-slate-800
                          prose-th:p-3 prose-th:border prose-th:border-slate-300 prose-th:text-left prose-th:font-semibold
                          prose-td:p-3 prose-td:border prose-td:border-slate-300
                          prose-tr:hover:bg-slate-50 prose-tr:dark:hover:bg-slate-900
                          prose-strong:text-foreground
                          prose-ul:my-4 prose-ol:my-4">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>{combinedDocument}</ReactMarkdown>
                        </article>
                      ) : (
                        <div className="text-center py-12 text-muted-foreground">
                          <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p>강의안이 아직 생성되지 않았습니다.</p>
                          <p className="text-sm mt-2">파이프라인이 완료되면 여기에 종합 강의안이 표시됩니다.</p>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </TabsContent>

                {/* 인포그래픽 탭 */}
                <TabsContent value="infographic" className="mt-4">
                  <ScrollArea className="h-[calc(100vh-380px)]">
                    <div className="rounded-xl border bg-white dark:bg-slate-900 shadow-sm p-6 min-h-[400px]">
                      <InfographicCanvas
                        data={artifactsByType.get("infographic")?.content_json}
                        assets={artifactsByType.get("infographic")?.assets}
                      />
                      {webSources.length > 0 && (
                        <div className="mt-6 pt-4 border-t">
                          <h4 className="text-sm font-medium mb-2">참고 출처</h4>
                          <ul className="text-xs space-y-1 list-disc pl-5">
                            {webSources.slice(0, 6).map((s: any) => (
                              <li key={s.url}>
                                <a className="text-blue-600 hover:underline" href={s.url} target="_blank" rel="noreferrer">
                                  {s.title || s.url}
                                </a>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </TabsContent>

                {/* 슬라이드 탭 */}
                <TabsContent value="slides" className="mt-4">
                  <ScrollArea className="h-[calc(100vh-380px)]">
                    <div className="rounded-xl border bg-white dark:bg-slate-900 shadow-sm p-6 min-h-[400px]">
                      <SlidesCanvas
                        data={artifactsByType.get("slides")?.content_json}
                        assets={artifactsByType.get("slides")?.assets}
                      />
                      {(slidesDeckSources.length > 0 || webSources.length > 0) && (
                        <div className="mt-6 pt-4 border-t">
                          <h4 className="text-sm font-medium mb-2">참고 출처</h4>
                          <ul className="text-xs space-y-1 list-disc pl-5">
                            {(slidesDeckSources.length > 0 ? slidesDeckSources : webSources)
                              .slice(0, 8)
                              .map((s: any) => (
                                <li key={s.url}>
                                  <a className="text-blue-600 hover:underline" href={s.url} target="_blank" rel="noreferrer">
                                    {s.title || s.url}
                                  </a>
                                </li>
                              ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </TabsContent>

                {/* 디자인 에셋 탭 */}
                <TabsContent value="assets" className="mt-4">
                  <ScrollArea className="h-[calc(100vh-380px)]">
                    <div className="rounded-xl border bg-white dark:bg-slate-900 shadow-sm p-6 min-h-[400px]">
                      {(() => {
                        // 모든 생성된 이미지 수집
                        const allImages: Array<{ type: string; dataUrl: string; prompt?: string; model?: string; createdAt?: string; source: string }> = [];

                        // 프로젝트 커버
                        const coverArtifact = artifactsByType.get("cover");
                        if (coverArtifact?.assets?.background?.dataUrl) {
                          allImages.push({
                            type: '프로젝트 커버',
                            dataUrl: coverArtifact.assets.background.dataUrl,
                            prompt: coverArtifact.assets.background.prompt,
                            model: coverArtifact.assets.background.model,
                            createdAt: coverArtifact.assets.background.createdAt,
                            source: 'cover'
                          });
                        }

                        // 기타 에셋들 (향후 확장 가능)
                        jobState.artifacts.forEach(artifact => {
                          if (artifact.assets && typeof artifact.assets === 'object') {
                            const assets = artifact.assets as any;
                            // illustrations, diagrams 등 추가 에셋
                            if (assets.illustrations && Array.isArray(assets.illustrations)) {
                              assets.illustrations.forEach((img: any, idx: number) => {
                                if (img.dataUrl) {
                                  allImages.push({
                                    type: `삽화 ${idx + 1}`,
                                    dataUrl: img.dataUrl,
                                    prompt: img.prompt,
                                    model: img.model,
                                    createdAt: img.createdAt,
                                    source: artifact.artifact_type
                                  });
                                }
                              });
                            }
                          }
                        });

                        if (allImages.length === 0) {
                          return (
                            <div className="flex flex-col items-center justify-center h-[300px] text-slate-400">
                              <Download className="h-12 w-12 mb-3" />
                              <p className="text-sm">생성된 디자인 에셋이 없습니다.</p>
                              <p className="text-xs mt-1">프로젝트 생성 시 이미지 생성 옵션을 활성화하세요.</p>
                            </div>
                          );
                        }

                        return (
                          <div className="space-y-4">
                            <div className="flex items-center justify-between mb-4">
                              <h3 className="text-lg font-semibold">생성된 디자인 에셋</h3>
                              <span className="text-sm text-slate-500">{allImages.length}개 이미지</span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              {allImages.map((img, idx) => (
                                <div key={idx} className="border rounded-lg p-4 space-y-3 bg-slate-50 dark:bg-slate-800/50">
                                  {/* 이미지 미리보기 */}
                                  <div className="relative aspect-video rounded-lg overflow-hidden bg-white dark:bg-slate-900 border">
                                    <img
                                      src={img.dataUrl}
                                      alt={img.type}
                                      className="w-full h-full object-contain"
                                    />
                                  </div>

                                  {/* 메타데이터 */}
                                  <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                      <span className="text-sm font-medium">{img.type}</span>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => {
                                          const arr = img.dataUrl.split(',');
                                          const mimeMatch = arr[0].match(/:(.*?);/);
                                          const mime = mimeMatch ? mimeMatch[1] : 'image/png';
                                          const bstr = atob(arr[1]);
                                          let n = bstr.length;
                                          const u8arr = new Uint8Array(n);
                                          while (n--) {
                                            u8arr[n] = bstr.charCodeAt(n);
                                          }
                                          const blob = new Blob([u8arr], { type: mime });

                                          const link = document.createElement('a');
                                          link.href = URL.createObjectURL(blob);
                                          link.download = `${project?.title || '프로젝트'}_${img.type}_${idx + 1}.png`;
                                          document.body.appendChild(link);
                                          link.click();
                                          document.body.removeChild(link);
                                          URL.revokeObjectURL(link.href);

                                          toast.success(`${img.type} 이미지가 다운로드되었습니다.`);
                                        }}
                                      >
                                        <Download className="h-3 w-3 mr-1" />
                                        다운로드
                                      </Button>
                                    </div>

                                    {img.model && (
                                      <div className="text-xs text-slate-500">
                                        <span className="font-medium">생성 모델:</span> {img.model}
                                      </div>
                                    )}

                                    {img.createdAt && (
                                      <div className="text-xs text-slate-500">
                                        <span className="font-medium">생성 시각:</span> {new Date(img.createdAt).toLocaleString('ko-KR')}
                                      </div>
                                    )}

                                    {img.prompt && (
                                      <div className="text-xs text-slate-600 dark:text-slate-400 mt-2 p-2 bg-white dark:bg-slate-900 rounded border">
                                        <span className="font-medium">프롬프트:</span>
                                        <p className="mt-1 line-clamp-2">{img.prompt}</p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </ScrollArea>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* 코스빌더로 보내기 다이얼로그 */}
      <Dialog open={showConvertDialog} onOpenChange={setShowConvertDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="h-5 w-5 text-primary" />
              코스빌더로 보내기
            </DialogTitle>
            <DialogDescription>
              생성된 프로젝트를 코스빌더로 가져와 세밀한 편집을 진행할 수 있습니다.
              커리큘럼의 각 세션이 모듈/레슨으로 자동 매핑됩니다.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-6">
            <RadioGroup
              value={convertMode}
              onValueChange={(v) => setConvertMode(v as "new" | "existing")}
              className="space-y-3"
            >
              <div className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                <RadioGroupItem value="new" id="new-course" className="mt-1" />
                <div className="flex-1">
                  <Label htmlFor="new-course" className="font-medium cursor-pointer">
                    새 코스로 생성
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    새로운 코스를 만들고 프로젝트 내용을 가져옵니다.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                <RadioGroupItem value="existing" id="existing-course" className="mt-1" />
                <div className="flex-1">
                  <Label htmlFor="existing-course" className="font-medium cursor-pointer">
                    기존 코스에 추가
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    기존 코스의 끝에 새 모듈로 추가합니다.
                  </p>
                </div>
              </div>
            </RadioGroup>

            {convertMode === "new" && (
              <div className="space-y-2">
                <Label htmlFor="course-title">코스 제목</Label>
                <Input
                  id="course-title"
                  value={newCourseTitle}
                  onChange={(e) => setNewCourseTitle(e.target.value)}
                  placeholder="코스 제목을 입력하세요"
                />
              </div>
            )}

            {convertMode === "existing" && (
              <div className="space-y-2">
                <Label>기존 코스 선택</Label>
                {existingCourses.length > 0 ? (
                  <Select value={selectedCourseId} onValueChange={setSelectedCourseId}>
                    <SelectTrigger>
                      <SelectValue placeholder="코스를 선택하세요" />
                    </SelectTrigger>
                    <SelectContent>
                      {existingCourses.map((course) => (
                        <SelectItem key={course.id} value={course.id}>
                          {course.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="p-4 text-center text-sm text-muted-foreground border rounded-lg">
                    기존 코스가 없습니다. "새 코스로 생성"을 선택해주세요.
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowConvertDialog(false)}
              disabled={converting}
            >
              취소
            </Button>
            <Button
              onClick={handleConvertToCourse}
              disabled={converting || (convertMode === "existing" && !selectedCourseId)}
            >
              {converting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  변환 중...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  코스빌더로 보내기
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
