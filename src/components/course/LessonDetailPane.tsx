/**
 * LessonDetailPane 컴포넌트
 * 
 * 수정일: 2026-01-10
 * 수정 내용: Phase 2 - 단일 콘텐츠 생성/보강/재생성 기능 추가
 * 참고: history/2026-01-10_project-coursebuilder-integration-plan.md
 */

import { useCallback, useEffect, useState } from "react";
import { callAzureFunctionDirect } from "@/lib/azureFunctions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Loader2, Sparkles, Bot, Presentation, CheckSquare, ClipboardList,
  FileText, BookOpen, RefreshCw, Wand2, MessageCircle, Lightbulb, Download, FileDown
} from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ContentSourceBadge, ContentSource } from "./ContentSourceBadge";
import { VersionHistorySheet } from "./VersionHistorySheet";
import { AIModelComparison } from "./AIModelComparison";
import { SlidePreview } from "./SlidePreview";
import { SupplementaryMaterialsPreview } from "./SupplementaryMaterialsPreview";
import { downloadAsJSON, downloadAsMarkdown, downloadAsText, downloadAllAsZip } from "@/lib/downloadUtils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

// ============================================================
// 타입 정의
// ============================================================

interface Lesson {
  id: string;
  module_id: string;
  title: string;
  learning_objectives?: string;
  project_id?: string;
  order_index: number;
  selected_ai_model?: string;
  content_source?: ContentSource;
  current_version?: number;
  created_at: string;
  updated_at: string;
}

interface Project {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  document_content?: string;
  ai_model: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface GeneratedContent {
  contentType: string;
  content: any;
  markdown?: string;
}

interface LessonDetailPaneProps {
  lessonId: string;
  courseId: string;
}

type ContentType = 'lesson_plan' | 'hands_on_activity' | 'assessment' | 'supplementary_materials' | 'discussion_prompts' | 'instructor_notes' | 'slides' | 'infographic';

const AI_MODELS = [
  { value: "gemini", label: "Gemini", description: "Google AI" },
  { value: "claude", label: "Claude", description: "Anthropic" },
  { value: "chatgpt", label: "ChatGPT", description: "OpenAI" },
];

const CONTENT_TYPES: { type: ContentType; label: string; icon: any; description: string; requiresContent?: boolean; special?: boolean }[] = [
  { type: 'lesson_plan', label: '레슨 플랜', icon: BookOpen, description: '상세한 수업 계획 및 학습 활동 구성' },
  { type: 'hands_on_activity', label: '실습 활동', icon: ClipboardList, description: '단계별 실습 가이드 및 예제 코드' },
  { type: 'assessment', label: '평가', icon: CheckSquare, description: '퀴즈, 과제, 루브릭 등 종합 평가' },
  { type: 'supplementary_materials', label: '보충 자료', icon: FileText, description: '참고 문헌, 심화 자료, 사례 연구' },
  { type: 'discussion_prompts', label: '토론 주제', icon: MessageCircle, description: '토론 질문 및 협업 활동 프롬프트' },
  { type: 'instructor_notes', label: '강사 노트', icon: Lightbulb, description: '티칭 가이드, FAQ, 난이도 조절 팁' },
  { type: 'slides', label: '슬라이드', icon: Presentation, description: '완성된 콘텐츠를 바탕으로 프레젠테이션 생성', requiresContent: true, special: true },
  { type: 'infographic', label: '인포그래픽', icon: Sparkles, description: '완성된 콘텐츠를 시각적 다이어그램으로 변환', requiresContent: true, special: true },
];

const STYLE_OPTIONS = [
  { value: '시각적', label: '시각적', description: '다이어그램, 이미지 활용 강조' },
  { value: '간결', label: '간결하게', description: '핵심만 정리' },
  { value: '상세', label: '상세하게', description: '예시와 설명 풍부하게' },
  { value: '초보자', label: '초보자용', description: '쉬운 용어, 기초 설명' },
  { value: '전문가', label: '전문가용', description: '고급 개념, 심화 내용' },
  { value: '실무', label: '실무 중심', description: '실제 적용 사례 중심' },
];

// ============================================================
// 메인 컴포넌트
// ============================================================

const LessonDetailPane = ({ lessonId, courseId }: LessonDetailPaneProps) => {
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  // 생성된 콘텐츠 저장
  const [generatedContents, setGeneratedContents] = useState<Record<ContentType, GeneratedContent | null>>({
    lesson_plan: null,
    slides: null,
    hands_on_activity: null,
    assessment: null,
    supplementary_materials: null,
    discussion_prompts: null,
    instructor_notes: null,
    infographic: null,
  });
  
  // 현재 생성 중인 콘텐츠 타입
  const [generatingType, setGeneratingType] = useState<ContentType | null>(null);
  
  // 보강 다이얼로그 상태
  const [enhanceDialogOpen, setEnhanceDialogOpen] = useState(false);
  const [enhanceTarget, setEnhanceTarget] = useState<ContentType | null>(null);
  const [enhanceRequest, setEnhanceRequest] = useState("");
  
  // 재생성 다이얼로그 상태
  const [regenerateDialogOpen, setRegenerateDialogOpen] = useState(false);
  const [regenerateTarget, setRegenerateTarget] = useState<ContentType | null>(null);
  const [regenerateStyle, setRegenerateStyle] = useState<string>("");

  // 모델 비교 모드
  const [comparisonMode, setComparisonMode] = useState(false);
  const [comparisonContentType, setComparisonContentType] = useState<ContentType | null>(null);

  // AI 모델 필터
  const [selectedAiModel, setSelectedAiModel] = useState<string>('all');
  const [availableAiModels, setAvailableAiModels] = useState<string[]>([]);

  // 모든 레슨 콘텐츠 원본 데이터 (필터링 전)
  const [allLessonContents, setAllLessonContents] = useState<any[]>([]);

  // ============================================================
  // 데이터 로딩
  // ============================================================

  const fetchLessonData = useCallback(async () => {
    try {
      setLoading(true);

      const { data, error } = await callAzureFunctionDirect<{
        success: boolean;
        lesson: Lesson;
        project: Project | null;
        lessonContents?: any[];
      }>(`/api/getlesson/${lessonId}`, 'GET');

      if (error) throw error;

      if (!data?.success || !data.lesson) {
        throw new Error('Lesson not found');
      }

      setLesson(data.lesson);
      setProject(data.project);

      // lessonContents 로드 - 모든 콘텐츠를 불러옴 (필터링 없이)
      if (data.lessonContents && data.lessonContents.length > 0) {
        // AI 모델 목록 추출
        const models = new Set<string>();
        data.lessonContents.forEach((lc: any) => {
          models.add(lc.ai_model);
        });
        setAvailableAiModels(Array.from(models));

        // 모든 콘텐츠를 저장 (나중에 필터링할 원본 데이터)
        setAllLessonContents(data.lessonContents);
      } else {
        setAvailableAiModels([]);
        setAllLessonContents([]);
      }
    } catch (error) {
      console.error("Error fetching lesson data:", error);
      toast.error("레슨 정보를 불러오는 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }, [lessonId]);

  useEffect(() => {
    // 레슨이 변경될 때 AI 모델 필터를 'all'로 리셋
    setSelectedAiModel('all');
    fetchLessonData();
  }, [fetchLessonData]);

  // AI 모델 필터 변경 시 콘텐츠 필터링
  useEffect(() => {
    if (allLessonContents.length === 0) {
      // 데이터가 없으면 초기화
      setGeneratedContents({
        lesson_plan: null,
        slides: null,
        hands_on_activity: null,
        assessment: null,
        supplementary_materials: null,
        discussion_prompts: null,
        instructor_notes: null,
      });
      return;
    }

    const contents: Record<ContentType, GeneratedContent | null> = {
      lesson_plan: null,
      slides: null,
      hands_on_activity: null,
      assessment: null,
      supplementary_materials: null,
      discussion_prompts: null,
      instructor_notes: null,
    };

    // 선택된 AI 모델에 맞는 콘텐츠만 필터링
    allLessonContents.forEach((lc: any) => {
      // 모델 필터가 'all'이거나 일치하는 경우에만
      if (selectedAiModel === 'all' || selectedAiModel === lc.ai_model) {
        const contentType = lc.content_type as ContentType;
        if (contentType in contents && !contents[contentType]) {
          contents[contentType] = {
            contentType: lc.content_type,
            content: lc.content,
            markdown: lc.markdown,
          };
        }
      }
    });

    setGeneratedContents(contents);
  }, [allLessonContents, selectedAiModel]);

  // ============================================================
  // 단일 콘텐츠 생성 (파이프라인 X)
  // ============================================================

  const handleGenerateSingleContent = async (contentType: ContentType) => {
    if (!lesson) return;

    try {
      setGenerating(true);
      setGeneratingType(contentType);

      // 슬라이드와 인포그래픽은 기존 콘텐츠를 취합하여 생성
      let aggregatedContent = null;
      if (contentType === 'slides' || contentType === 'infographic') {
        const existingContents = Object.entries(generatedContents)
          .filter(([key, value]) =>
            key !== 'slides' &&
            key !== 'infographic' &&
            value !== null
          )
          .map(([key, value]) => ({
            type: key,
            content: value?.content,
            markdown: value?.markdown,
          }));

        if (existingContents.length === 0) {
          toast.error('슬라이드/인포그래픽을 생성하려면 최소 1개 이상의 콘텐츠가 필요합니다.');
          return;
        }

        aggregatedContent = existingContents;
      }

      const { data, error } = await callAzureFunctionDirect<{
        success: boolean;
        data: GeneratedContent;
        message: string;
      }>('/api/course/generate-content', 'POST', {
        lessonId: lesson.id,
        contentType,
        context: {
          lessonTitle: lesson.title,
          learningObjectives: lesson.learning_objectives?.split('\n').filter(Boolean) || [],
        },
        aiModel: selectedAiModel,
        aggregatedContent, // 슬라이드/인포그래픽용 취합된 콘텐츠
      });

      if (error) throw error;

      if (data?.success && data.data) {
        setGeneratedContents(prev => ({
          ...prev,
          [contentType]: data.data,
        }));
        toast.success(data.message || `${contentType} 콘텐츠가 생성되었습니다.`);
      } else {
        throw new Error('콘텐츠 생성 실패');
      }
    } catch (error) {
      console.error("Error generating content:", error);
      toast.error(`${contentType} 콘텐츠 생성 중 오류가 발생했습니다.`);
    } finally {
      setGenerating(false);
      setGeneratingType(null);
    }
  };

  // ============================================================
  // 콘텐츠 보강
  // ============================================================

  const handleEnhanceContent = async () => {
    if (!lesson || !enhanceTarget || !enhanceRequest.trim()) return;

    const existingContent = generatedContents[enhanceTarget];
    if (!existingContent) {
      toast.error("보강할 콘텐츠가 없습니다.");
      return;
    }

    try {
      setGenerating(true);
      setGeneratingType(enhanceTarget);
      setEnhanceDialogOpen(false);

      const { data, error } = await callAzureFunctionDirect<{
        success: boolean;
        data: GeneratedContent;
        message: string;
      }>('/api/course/enhance-content', 'POST', {
        lessonId: lesson.id,
        contentType: enhanceTarget,
        existingContent: existingContent.content,
        enhanceRequest: enhanceRequest,
        aiModel: selectedAiModel,
      });

      if (error) throw error;

      if (data?.success && data.data) {
        setGeneratedContents(prev => ({
          ...prev,
          [enhanceTarget]: data.data,
        }));
        toast.success(data.message || `${enhanceTarget} 콘텐츠가 보강되었습니다.`);
      } else {
        throw new Error('콘텐츠 보강 실패');
      }
    } catch (error) {
      console.error("Error enhancing content:", error);
      toast.error(`${enhanceTarget} 콘텐츠 보강 중 오류가 발생했습니다.`);
    } finally {
      setGenerating(false);
      setGeneratingType(null);
      setEnhanceRequest("");
      setEnhanceTarget(null);
    }
  };

  // ============================================================
  // 콘텐츠 재생성
  // ============================================================

  const handleRegenerateSingleContent = async () => {
    if (!lesson || !regenerateTarget) return;

    try {
      setGenerating(true);
      setGeneratingType(regenerateTarget);
      setRegenerateDialogOpen(false);

      const { data, error } = await callAzureFunctionDirect<{
        success: boolean;
        data: GeneratedContent;
        message: string;
      }>('/api/course/regenerate-content', 'POST', {
        lessonId: lesson.id,
        contentType: regenerateTarget,
        aiModel: selectedAiModel,
        style: regenerateStyle || undefined,
      });

      if (error) throw error;

      if (data?.success && data.data) {
        setGeneratedContents(prev => ({
          ...prev,
          [regenerateTarget]: data.data,
        }));
        toast.success(data.message || `${regenerateTarget} 콘텐츠가 재생성되었습니다.`);
      } else {
        throw new Error('콘텐츠 재생성 실패');
      }
    } catch (error) {
      console.error("Error regenerating content:", error);
      toast.error(`${regenerateTarget} 콘텐츠 재생성 중 오류가 발생했습니다.`);
    } finally {
      setGenerating(false);
      setGeneratingType(null);
      setRegenerateStyle("");
      setRegenerateTarget(null);
    }
  };

  // ============================================================
  // 콘텐츠 렌더링
  // ============================================================

  const renderContentPreview = (contentType: ContentType, content: GeneratedContent, lessonTitle: string) => {
    if (content.markdown) {
      return (
        <div className="prose prose-sm max-w-none dark:prose-invert">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {content.markdown}
          </ReactMarkdown>
        </div>
      );
    }

    // JSON 콘텐츠 렌더링
    const data = content.content;

    if (contentType === 'slides' && data.slides) {
      return (
        <SlidePreview
          content={data}
          lessonTitle={lessonTitle}
        />
      );
    }

    if (contentType === 'infographic') {
      return (
        <div className="space-y-6 bg-gradient-to-br from-blue-50 to-purple-50 p-8 rounded-2xl">
          <div className="text-center mb-8">
            <h3 className="text-2xl font-bold mb-2">{data.title || lessonTitle}</h3>
            {data.description && (
              <p className="text-muted-foreground">{data.description}</p>
            )}
          </div>

          {/* 주요 섹션들 */}
          {data.sections && Array.isArray(data.sections) && data.sections.map((section: any, idx: number) => (
            <div key={idx} className="bg-white p-6 rounded-xl shadow-sm">
              <h4 className="text-lg font-bold mb-3 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-blue-500" />
                {section.title}
              </h4>
              {section.items && Array.isArray(section.items) && (
                <ul className="space-y-2">
                  {section.items.map((item: string, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <CheckSquare className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              )}
              {section.content && (
                <div className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {section.content}
                </div>
              )}
            </div>
          ))}

          {/* 다이어그램/플로우차트 */}
          {data.diagram && (
            <div className="bg-white p-6 rounded-xl shadow-sm">
              <h4 className="text-lg font-bold mb-3">프로세스 다이어그램</h4>
              <div className="text-sm whitespace-pre-wrap font-mono bg-slate-50 p-4 rounded-lg">
                {data.diagram}
              </div>
            </div>
          )}
        </div>
      );
    }

    if (contentType === 'assessment' && data.items) {
      return (
        <div className="space-y-4">
          <h4 className="font-semibold">{data.title || '평가'}</h4>
          <div className="grid gap-3">
            {data.items.map((item: any, idx: number) => (
              <div key={idx} className="border rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline">Q{item.questionNumber || idx + 1}</Badge>
                  <Badge variant="secondary">{item.difficulty}</Badge>
                  <Badge variant="outline">{item.points}점</Badge>
                </div>
                <p className="font-medium mb-2">{item.question}</p>
                {item.options && (
                  <div className="text-sm space-y-1">
                    {item.options.map((opt: string, i: number) => (
                      <div key={i} className={`${opt === item.correctAnswer ? 'text-green-600 font-medium' : 'text-muted-foreground'}`}>
                        {i + 1}. {opt}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (contentType === 'supplementary_materials') {
      return (
        <SupplementaryMaterialsPreview
          content={data}
          lessonTitle={lessonTitle}
        />
      );
    }

    if (contentType === 'hands_on_activity' && data.steps) {
      return (
        <div className="space-y-4">
          <h4 className="font-semibold">{data.labTitle || '실습 가이드'}</h4>
          <p className="text-sm text-muted-foreground">예상 시간: {data.estimatedTime}</p>
          <div className="grid gap-3">
            {data.steps.map((step: any, idx: number) => (
              <div key={idx} className="border rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Badge>{step.stepNumber || idx + 1}</Badge>
                  <span className="font-medium">{step.title}</span>
                </div>
                <p className="text-sm text-muted-foreground">{step.instruction}</p>
              </div>
            ))}
          </div>
        </div>
      );
    }

    // 기본 JSON 출력
    return (
      <pre className="text-sm bg-muted p-3 rounded-lg overflow-auto">
        {JSON.stringify(data, null, 2)}
      </pre>
    );
  };

  // ============================================================
  // 로딩 상태
  // ============================================================

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!lesson) {
    return (
      <Card>
        <CardContent className="py-12">
          <p className="text-center text-muted-foreground">레슨을 찾을 수 없습니다.</p>
        </CardContent>
      </Card>
    );
  }

  // ============================================================
  // 렌더링
  // ============================================================

  const hasAnyContent = Object.values(generatedContents).some(c => c !== null);

  return (
    <div className="space-y-6">
      {/* 레슨 정보 */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle>{lesson.title}</CardTitle>
              {lesson.learning_objectives && (
                <CardDescription className="mt-2">
                  {lesson.learning_objectives}
                </CardDescription>
              )}
            </div>
            <div className="flex gap-2">
              {/* 콘텐츠 소스 표시 */}
              <ContentSourceBadge 
                source={lesson.content_source || (lesson.project_id ? 'imported' : undefined)} 
                size="md" 
                showLabel={true}
              />
              {lesson.project_id && lesson.content_source !== 'imported' && (
                <Badge variant="outline">프로젝트 연결됨</Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* AI 모델 필터 (기존 생성된 콘텐츠가 있을 경우에만 표시) */}
          {availableAiModels.length > 0 && (
            <div className="mb-6">
              <Label className="text-sm font-medium mb-2 flex items-center gap-2">
                <Bot className="h-4 w-4" />
                생성된 콘텐츠 필터 (AI 모델별)
              </Label>
              <Select value={selectedAiModel} onValueChange={setSelectedAiModel}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="AI 모델을 선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">모든 모델</SelectItem>
                  {availableAiModels.map((model) => (
                    <SelectItem key={model} value={model}>
                      {model.toUpperCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* 콘텐츠 생성용 AI 모델 선택 */}
          <div className="mb-6">
            <Label className="text-sm font-medium mb-2 flex items-center gap-2">
              <Bot className="h-4 w-4" />
              콘텐츠 생성 AI 모델
            </Label>
            <Select value={lesson.selected_ai_model || 'gemini'} onValueChange={(value) => {
              setLesson(prev => ({ ...prev, selected_ai_model: value } as Lesson));
            }}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="AI 모델을 선택하세요" />
              </SelectTrigger>
              <SelectContent>
                {AI_MODELS.map((model) => (
                  <SelectItem key={model.value} value={model.value}>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{model.label}</span>
                      <span className="text-xs text-muted-foreground">({model.description})</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* 콘텐츠 생성 패널 */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Wand2 className="h-5 w-5" />
                콘텐츠 생성
              </CardTitle>
              <CardDescription>
                레슨에 필요한 콘텐츠를 개별적으로 생성하세요. (파이프라인 전체 실행 X, 빠른 생성 ~1-2분)
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setComparisonMode(!comparisonMode)}
            >
              <Bot className="h-4 w-4 mr-2" />
              {comparisonMode ? '일반 모드' : '모델 비교 모드'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {!comparisonMode ? (
            <div className="space-y-4">
              {/* 일반 콘텐츠 */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {CONTENT_TYPES.filter(ct => !ct.special).map(({ type, label, icon: Icon, description }) => {
                  const hasContent = generatedContents[type] !== null;
                  const isGenerating = generatingType === type;

                  return (
                    <Button
                      key={type}
                      variant={hasContent ? "secondary" : "outline"}
                      className="h-auto py-4 flex-col gap-2"
                      disabled={generating}
                      onClick={() => handleGenerateSingleContent(type)}
                    >
                      {isGenerating ? (
                        <Loader2 className="h-6 w-6 animate-spin" />
                      ) : (
                        <Icon className="h-6 w-6" />
                      )}
                      <span className="font-medium">{label}</span>
                      <span className="text-xs text-muted-foreground">{isGenerating ? '생성 중...' : (hasContent ? '재생성' : '생성')}</span>
                    </Button>
                  );
                })}
              </div>

              {/* 슬라이드 & 인포그래픽 (특별 콘텐츠) */}
              <div className="border-t pt-4">
                <div className="text-sm font-medium mb-3 text-primary">통합 콘텐츠 생성</div>
                <div className="grid grid-cols-2 gap-3">
                  {CONTENT_TYPES.filter(ct => ct.special).map(({ type, label, icon: Icon, description, requiresContent }) => {
                    const hasContent = generatedContents[type] !== null;
                    const isGenerating = generatingType === type;
                    const hasOtherContent = Object.keys(generatedContents).some(
                      key => key !== type && key !== 'slides' && key !== 'infographic' && generatedContents[key] !== null
                    );
                    const isDisabled = requiresContent && !hasOtherContent;

                    return (
                      <Button
                        key={type}
                        variant={hasContent ? "default" : "outline"}
                        className={`h-auto py-4 flex-col gap-2 ${hasContent ? 'bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600' : 'border-primary/50'}`}
                        disabled={generating || isDisabled}
                        onClick={() => handleGenerateSingleContent(type)}
                        title={isDisabled ? '먼저 다른 콘텐츠를 1개 이상 생성하세요' : description}
                      >
                        {isGenerating ? (
                          <Loader2 className="h-6 w-6 animate-spin" />
                        ) : (
                          <Icon className="h-6 w-6" />
                        )}
                        <span className="font-medium">{label}</span>
                        <span className="text-xs opacity-80">
                          {isGenerating ? '생성 중...' : isDisabled ? '콘텐츠 필요' : hasContent ? '재생성' : '생성'}
                        </span>
                      </Button>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground mb-4">
                여러 AI 모델로 동시에 콘텐츠를 생성하고 결과를 비교할 수 있습니다.
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {CONTENT_TYPES.map(({ type, label, icon: Icon }) => (
                  <Dialog
                    key={type}
                    open={comparisonContentType === type}
                    onOpenChange={(open) => {
                      if (!open) setComparisonContentType(null);
                    }}
                  >
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        className="h-auto py-4 flex-col gap-2"
                        onClick={() => setComparisonContentType(type)}
                      >
                        <Icon className="h-6 w-6" />
                        <span className="font-medium">{label}</span>
                        <span className="text-xs text-muted-foreground">모델 비교</span>
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>{label} - AI 모델 비교</DialogTitle>
                        <DialogDescription>
                          여러 AI 모델의 결과를 비교하고 원하는 결과를 선택하세요
                        </DialogDescription>
                      </DialogHeader>
                      <AIModelComparison
                        lessonId={lesson.id}
                        lessonTitle={lesson.title}
                        learningObjectives={lesson.learning_objectives?.split('\n').filter(Boolean)}
                        contentType={type}
                        contentTypeLabel={label}
                        onSelectResult={(content, aiModel) => {
                          // 선택한 결과를 현재 콘텐츠로 설정
                          setGeneratedContents(prev => ({
                            ...prev,
                            [type]: content,
                          }));
                          setComparisonContentType(null);
                          setComparisonMode(false);
                        }}
                      />
                    </DialogContent>
                  </Dialog>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 생성된 콘텐츠 표시 */}
      {hasAnyContent && (
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle>생성된 콘텐츠</CardTitle>
                <CardDescription>
                  각 콘텐츠를 확인하고 필요시 보강하거나 재생성할 수 있습니다.
                </CardDescription>
              </div>
              <div className="flex gap-2">
                {/* 전체 다운로드 버튼 */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    try {
                      await downloadAllAsZip(generatedContents, lesson.title);
                      toast.success("모든 콘텐츠가 다운로드되었습니다.");
                    } catch (error) {
                      toast.error("다운로드 중 오류가 발생했습니다.");
                    }
                  }}
                >
                  <Download className="h-4 w-4 mr-2" />
                  전체 다운로드
                </Button>
                {/* 버전 히스토리 버튼 */}
                <VersionHistorySheet
                  lessonId={lesson.id}
                  currentVersion={lesson.current_version}
                  onRestore={(content, contentType) => {
                    // 복원된 콘텐츠를 상태에 반영
                    if (contentType && content) {
                      setGeneratedContents(prev => ({
                        ...prev,
                        [contentType as ContentType]: {
                          contentType,
                          content,
                        },
                      }));
                      toast.success(`${CONTENT_TYPES.find(c => c.type === contentType)?.label || contentType} 콘텐츠가 복원되었습니다.`);
                    }
                  }}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue={Object.keys(generatedContents).find(k => generatedContents[k as ContentType] !== null) || 'slides'}>
              <TabsList className="mb-4">
                {CONTENT_TYPES.filter(({ type }) => generatedContents[type] !== null).map(({ type, label, icon: Icon }) => (
                  <TabsTrigger key={type} value={type} className="flex items-center gap-1">
                    <Icon className="h-4 w-4" />
                    {label}
                  </TabsTrigger>
                ))}
              </TabsList>
              
              {CONTENT_TYPES.map(({ type, label }) => {
                const content = generatedContents[type];
                if (!content) return null;
                
                return (
                  <TabsContent key={type} value={type}>
                    <div className="space-y-4">
                      {/* 액션 버튼 */}
                      <div className="flex gap-2 justify-end">
                        {/* 다운로드 드롭다운 */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm">
                              <FileDown className="h-4 w-4 mr-2" />
                              다운로드
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => {
                                downloadAsJSON(content, `${lesson.title}_${label}`);
                                toast.success("JSON 파일이 다운로드되었습니다.");
                              }}
                            >
                              <FileText className="h-4 w-4 mr-2" />
                              JSON 형식
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                downloadAsMarkdown(content, `${lesson.title}_${label}`, type);
                                toast.success("Markdown 파일이 다운로드되었습니다.");
                              }}
                            >
                              <FileText className="h-4 w-4 mr-2" />
                              Markdown 형식
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                downloadAsText(content, `${lesson.title}_${label}`, type);
                                toast.success("텍스트 파일이 다운로드되었습니다.");
                              }}
                            >
                              <FileText className="h-4 w-4 mr-2" />
                              텍스트 형식
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>

                        <Dialog open={enhanceDialogOpen && enhanceTarget === type} onOpenChange={(open) => {
                          setEnhanceDialogOpen(open);
                          if (open) setEnhanceTarget(type);
                        }}>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm" disabled={generating}>
                              <Sparkles className="h-4 w-4 mr-2" />
                              AI로 보강
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>{label} 콘텐츠 보강</DialogTitle>
                              <DialogDescription>
                                기존 콘텐츠를 유지하면서 어떤 부분을 개선하고 싶으신가요?
                              </DialogDescription>
                            </DialogHeader>
                            <div className="py-4">
                              <Label htmlFor="enhance-request">보강 요청</Label>
                              <Textarea
                                id="enhance-request"
                                placeholder="예: 더 자세한 예시를 추가해줘, 난이도를 낮춰줘, 실무 사례를 포함해줘..."
                                value={enhanceRequest}
                                onChange={(e) => setEnhanceRequest(e.target.value)}
                                className="mt-2"
                                rows={3}
                              />
                            </div>
                            <DialogFooter>
                              <Button variant="outline" onClick={() => setEnhanceDialogOpen(false)}>
                                취소
                              </Button>
                              <Button onClick={handleEnhanceContent} disabled={!enhanceRequest.trim()}>
                                <Sparkles className="h-4 w-4 mr-2" />
                                보강하기
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>

                        <Dialog open={regenerateDialogOpen && regenerateTarget === type} onOpenChange={(open) => {
                          setRegenerateDialogOpen(open);
                          if (open) setRegenerateTarget(type);
                        }}>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="sm" disabled={generating}>
                              <RefreshCw className="h-4 w-4 mr-2" />
                              재생성
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>{label} 콘텐츠 재생성</DialogTitle>
                              <DialogDescription>
                                기존 콘텐츠를 완전히 새롭게 생성합니다. 원하는 스타일을 선택하세요.
                              </DialogDescription>
                            </DialogHeader>
                            <div className="py-4">
                              <Label>스타일 선택 (선택사항)</Label>
                              <div className="grid grid-cols-2 gap-2 mt-2">
                                {STYLE_OPTIONS.map((style) => (
                                  <Button
                                    key={style.value}
                                    variant={regenerateStyle === style.value ? "default" : "outline"}
                                    size="sm"
                                    className="justify-start"
                                    onClick={() => setRegenerateStyle(
                                      regenerateStyle === style.value ? "" : style.value
                                    )}
                                  >
                                    {style.label}
                                  </Button>
                                ))}
                              </div>
                              {regenerateStyle && (
                                <p className="text-sm text-muted-foreground mt-2">
                                  {STYLE_OPTIONS.find(s => s.value === regenerateStyle)?.description}
                                </p>
                              )}
                            </div>
                            <DialogFooter>
                              <Button variant="outline" onClick={() => setRegenerateDialogOpen(false)}>
                                취소
                              </Button>
                              <Button onClick={handleRegenerateSingleContent}>
                                <RefreshCw className="h-4 w-4 mr-2" />
                                재생성하기
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </div>
                      
                      {/* 콘텐츠 프리뷰 */}
                      <div className={`border rounded-lg ${type === 'slides' ? '' : 'p-4 max-h-[500px] overflow-auto'}`}>
                        {renderContentPreview(type, content, lesson.title)}
                      </div>
                    </div>
                  </TabsContent>
                );
              })}
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* 콘텐츠가 없을 때 가이드 */}
      {!hasAnyContent && !generating && (
        <Card className="border-dashed">
          <CardContent className="py-8">
            <div className="text-center">
              <Wand2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold mb-2">콘텐츠를 생성해보세요</h3>
              <p className="text-sm text-muted-foreground mb-4">
                위의 버튼을 클릭하여 슬라이드, 퀴즈, 실습 가이드 등을 생성할 수 있습니다.
                <br />
                각 콘텐츠는 개별적으로 빠르게 생성됩니다 (~1-2분).
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 생성 중 표시 */}
      {generating && (
        <Card>
          <CardContent className="py-8">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <div className="text-center">
                <p className="font-medium">
                  {generatingType && CONTENT_TYPES.find(c => c.type === generatingType)?.label} 콘텐츠 생성 중...
                </p>
                <p className="text-sm text-muted-foreground">
                  AI가 콘텐츠를 생성하고 있습니다. 잠시만 기다려주세요.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default LessonDetailPane;
