/**
 * LessonDetailPane 컴포넌트
 * 
 * 수정일: 2026-01-02
 * 수정 내용: Supabase → Azure Functions API 마이그레이션
 */

import { useCallback, useEffect, useState } from "react";
import { callAzureFunctionDirect, processDocument } from "@/lib/azureFunctions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Sparkles, Bot } from "lucide-react";
import { toast } from "sonner";

// 타입 정의 (Supabase 타입 대신 직접 정의)
interface Lesson {
  id: string;
  module_id: string;
  title: string;
  learning_objectives?: string;
  project_id?: string;
  order_index: number;
  selected_ai_model?: string;
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

interface ProjectStage {
  id: string;
  project_id: string;
  ai_model: string;
  stage_order: number;
  content?: string;
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

interface LessonDetailPaneProps {
  lessonId: string;
  courseId: string;
}

const STAGE_NAMES = [
  "커리큘럼 설계",
  "수업안 작성",
  "슬라이드 구성",
  "평가/퀴즈",
  "최종 검토",
];

const AI_MODELS = [
  { value: "gemini", label: "Gemini", description: "Google AI" },
  { value: "claude", label: "Claude", description: "Anthropic" },
  { value: "chatgpt", label: "ChatGPT", description: "OpenAI" },
];

const LessonDetailPane = ({ lessonId, courseId }: LessonDetailPaneProps) => {
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [stages, setStages] = useState<ProjectStage[]>([]);
  const [allStagesByModel, setAllStagesByModel] = useState<Record<string, ProjectStage[]>>({});
  const [aiResults, setAiResults] = useState<AiResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selectedAiModel, setSelectedAiModel] = useState<string>("gemini");

  const fetchLessonData = useCallback(async () => {
    try {
      setLoading(true);

      // Azure Functions API로 레슨 상세 조회
      const { data, error } = await callAzureFunctionDirect<{
        success: boolean;
        lesson: Lesson;
        project: Project | null;
        aiResults: AiResult[];
      }>(`/api/getlesson/${lessonId}`, 'GET');

      if (error) throw error;
      
      if (!data?.success || !data.lesson) {
        throw new Error('Lesson not found');
      }

      setLesson(data.lesson);
      setProject(data.project);
      setAiResults(data.aiResults || []);

      // AI 결과가 있으면 첫 번째 모델 선택
      if (data.aiResults && data.aiResults.length > 0) {
        setSelectedAiModel(data.aiResults[0].ai_model);
      }
    } catch (error) {
      console.error("Error fetching lesson data:", error);
      toast.error("레슨 정보를 불러오는 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }, [lessonId]);

  // 선택된 모델의 stages만 가져오기 (기존 로직 유지)
  const fetchStages = useCallback(async () => {
    if (!lesson?.project_id || !selectedAiModel) {
      setStages([]);
      return;
    }

    try {
      const { data, error } = await callAzureFunctionDirect<{
        success: boolean;
        stages: ProjectStage[];
      }>(`/api/getprojectstages/${lesson.project_id}?aiModel=${selectedAiModel}`, 'GET');

      if (error) throw error;
      setStages(data?.stages || []);
    } catch (error) {
      console.error("Error fetching stages:", error);
    }
  }, [lesson?.project_id, selectedAiModel]);

  // 모든 AI 모델의 stages 가져오기
  const fetchAllStagesByModel = useCallback(async () => {
    if (!project?.id) {
      setAllStagesByModel({});
      return;
    }

    try {
      // 모든 모델에 대해 stages 가져오기
      const modelStages: Record<string, ProjectStage[]> = {};
      const models = ['gemini', 'claude', 'chatgpt'];
      
      await Promise.all(
        models.map(async (model) => {
          try {
            const { data, error } = await callAzureFunctionDirect<{
              success: boolean;
              stages: ProjectStage[];
            }>(`/api/getprojectstages/${project.id}?aiModel=${model}`, 'GET');
            
            if (!error && data?.stages && data.stages.length > 0) {
              modelStages[model] = data.stages;
            }
          } catch (err) {
            // 특정 모델의 stages가 없으면 무시
            console.log(`[LessonDetailPane] No stages for model ${model}`);
          }
        })
      );
      
      console.log('[LessonDetailPane] Fetched stages by model:', Object.keys(modelStages));
      setAllStagesByModel(modelStages);
    } catch (error) {
      console.error("Error fetching all stages by model:", error);
    }
  }, [project?.id]);

  useEffect(() => {
    fetchLessonData();
  }, [fetchLessonData]);

  useEffect(() => {
    fetchStages();
  }, [fetchStages]);

  useEffect(() => {
    if (project?.id) {
      fetchAllStagesByModel();
    }
  }, [project?.id, fetchAllStagesByModel]);

  const handleGenerateContent = async () => {
    if (!lesson) return;

    try {
      setGenerating(true);

      let projectId = lesson.project_id;

      // project_id가 없으면 프로젝트 생성
      if (!projectId) {
        const { data: projectData, error: projectError } = await callAzureFunctionDirect<{
          success: boolean;
          project: Project;
          existed: boolean;
        }>('/api/createlessonproject', 'POST', {
          lessonId: lesson.id,
          aiModel: selectedAiModel,
        });

        if (projectError || !projectData?.success || !projectData.project) {
          throw projectError || new Error('Failed to create project');
        }

        projectId = projectData.project.id;
        
        // 로컬 상태 업데이트
        setLesson({ ...lesson, project_id: projectId });
        setProject(projectData.project);
      }

      // process-document Azure Function 호출
      const documentContent = project?.document_content || lesson.learning_objectives || lesson.title || "";
      
      if (!documentContent.trim()) {
        toast.error("레슨 제목이나 학습 목표를 입력해주세요.");
        return;
      }

      const { error: funcError } = await processDocument({
        projectId: projectId!,
        documentContent: documentContent,
        aiModel: selectedAiModel as 'gemini' | 'claude' | 'chatgpt',
        regenerate: !!lesson.project_id,
      });

      if (funcError) {
        console.error("Error invoking process-document:", funcError);
        throw funcError;
      }

      toast.success("AI 콘텐츠 생성이 시작되었습니다.");
      
      // 데이터 새로고침
      await fetchLessonData();
      
      // 실시간 업데이트를 위해 잠시 후 다시 새로고침
      setTimeout(() => {
        fetchLessonData();
        fetchStages();
        fetchAllStagesByModel();
      }, 3000);
    } catch (error) {
      console.error("Error generating content:", error);
      const errorMessage = error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.";
      toast.error(`콘텐츠 생성 중 오류가 발생했습니다: ${errorMessage}`);
    } finally {
      setGenerating(false);
    }
  };

  const handleSelectAiModel = async (aiModel: string) => {
    if (!lesson) return;
    
    try {
      const { data, error } = await callAzureFunctionDirect<{
        success: boolean;
        lesson: Lesson;
      }>(`/api/updatelesson/${lesson.id}`, 'PUT', {
        selected_ai_model: aiModel,
      });

      if (error) throw error;
      
      if (!data?.success) {
        throw new Error('Failed to update lesson');
      }

      toast.success(`${aiModel} 모델이 최종 선택되었습니다.`);
      setLesson({ ...lesson, selected_ai_model: aiModel });
    } catch (error) {
      console.error("Error updating selected AI model:", error);
      toast.error("AI 모델 선택 중 오류가 발생했습니다.");
    }
  };

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
            {lesson.project_id && (
              <Badge variant="outline">콘텐츠 생성됨</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {/* AI 모델 선택 */}
          <div className="mb-4">
            <label className="text-sm font-medium mb-2 block flex items-center gap-2">
              <Bot className="h-4 w-4" />
              AI 모델 선택
            </label>
            <Select value={selectedAiModel} onValueChange={setSelectedAiModel}>
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

          {!lesson.project_id ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                이 레슨에 대한 AI 콘텐츠가 아직 생성되지 않았습니다.
              </p>
              <Button
                onClick={handleGenerateContent}
                disabled={generating}
                className="w-full"
              >
                {generating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {selectedAiModel.toUpperCase()}로 생성 중...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    {selectedAiModel.toUpperCase()}로 콘텐츠 생성하기
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <Button
                onClick={handleGenerateContent}
                disabled={generating}
                variant="outline"
                className="w-full"
              >
                {generating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {selectedAiModel.toUpperCase()}로 재생성 중...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    {selectedAiModel.toUpperCase()}로 콘텐츠 재생성
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* AI 결과가 있으면 표시 */}
      {project && aiResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>AI 생성 결과</CardTitle>
            <CardDescription>
              여러 AI 모델의 결과를 비교할 수 있습니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={selectedAiModel} onValueChange={setSelectedAiModel}>
              <TabsList>
                {aiResults.map((result) => (
                  <TabsTrigger key={result.id} value={result.ai_model}>
                    {result.ai_model}
                    {result.status === "completed" && (
                      <Badge variant="outline" className="ml-2">완료</Badge>
                    )}
                    {result.status === "failed" && (
                      <Badge variant="destructive" className="ml-2">실패</Badge>
                    )}
                  </TabsTrigger>
                ))}
              </TabsList>
              {aiResults.map((result) => (
                <TabsContent key={result.id} value={result.ai_model}>
                  <div className="space-y-4">
                    {result.generated_content && 
                     !result.generated_content.includes("생성 실패") && 
                     !result.generated_content.includes("Generation Failed") ? (
                      <>
                        <div className="prose prose-sm max-w-none">
                          <pre className="whitespace-pre-wrap text-sm">
                            {result.generated_content}
                          </pre>
                        </div>
                        {lesson && lesson.selected_ai_model !== result.ai_model && (
                          <Button
                            onClick={() => handleSelectAiModel(result.ai_model)}
                            variant="default"
                            className="w-full"
                          >
                            이 모델을 최종 선택
                          </Button>
                        )}
                        {lesson && lesson.selected_ai_model === result.ai_model && (
                          <div className="flex items-center justify-center p-3 bg-primary/10 rounded-md">
                            <span className="text-sm font-medium text-primary">
                              ✓ 최종 선택된 모델
                            </span>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <p className="text-destructive mb-2">콘텐츠 생성에 실패했습니다.</p>
                        <p className="text-sm">콘텐츠 재생성 버튼을 클릭하여 다시 시도해주세요.</p>
                      </div>
                    )}
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* 프로젝트 스테이지 표시 - AI 모델별로 탭으로 구분 */}
      {project && Object.keys(allStagesByModel).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>생성 단계</CardTitle>
            <CardDescription>
              AI 모델별 5단계 파이프라인 진행 상황
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={selectedAiModel} onValueChange={setSelectedAiModel}>
              <TabsList>
                {Object.keys(allStagesByModel).map((model) => (
                  <TabsTrigger key={model} value={model}>
                    {model.toUpperCase()}
                    {allStagesByModel[model].every(s => s.status === 'completed') && (
                      <Badge variant="outline" className="ml-2">완료</Badge>
                    )}
                  </TabsTrigger>
                ))}
              </TabsList>
              {Object.entries(allStagesByModel).map(([model, modelStages]) => (
                <TabsContent key={model} value={model}>
                  <div className="space-y-4">
                    {STAGE_NAMES.map((stageName, index) => {
                      const stage = modelStages.find((s) => (s.stage_order || s.order_index || 0) === index + 1);
                      return (
                        <div key={index} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold">{index + 1}. {stageName}</span>
                              {stage && (
                                <Badge
                                  variant={
                                    stage.status === "completed"
                                      ? "default"
                                      : stage.status === "processing"
                                      ? "secondary"
                                      : stage.status === "failed"
                                      ? "destructive"
                                      : "outline"
                                  }
                                >
                                  {stage.status === "completed" ? "완료" : 
                                   stage.status === "processing" ? "처리 중" :
                                   stage.status === "failed" ? "실패" : stage.status}
                                </Badge>
                              )}
                              {!stage && (
                                <Badge variant="outline">대기 중</Badge>
                              )}
                            </div>
                          </div>
                          {stage?.content && (
                            <div className="mt-2 text-sm text-muted-foreground">
                              <div className="prose prose-sm max-w-none">
                                <pre className="whitespace-pre-wrap">{stage.content}</pre>
                              </div>
                            </div>
                          )}
                          {stage?.status === "failed" && !stage.content && (
                            <div className="mt-2 text-sm text-destructive">
                              이 단계의 생성이 실패했습니다. 콘텐츠 재생성 버튼을 클릭하여 다시 시도해주세요.
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>
      )}
      
      {/* 기존 stages 표시 (하위 호환성) */}
      {project && stages.length > 0 && Object.keys(allStagesByModel).length === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>생성 단계</CardTitle>
            <CardDescription>
              5단계 파이프라인 진행 상황
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {STAGE_NAMES.map((stageName, index) => {
                const stage = stages.find((s) => (s.stage_order || s.order_index || 0) === index + 1);
                return (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{index + 1}. {stageName}</span>
                        {stage && (
                          <Badge
                            variant={
                              stage.status === "completed"
                                ? "default"
                                : stage.status === "processing"
                                ? "secondary"
                                : stage.status === "failed"
                                ? "destructive"
                                : "outline"
                            }
                          >
                            {stage.status === "completed" ? "완료" : 
                             stage.status === "processing" ? "처리 중" :
                             stage.status === "failed" ? "실패" : stage.status}
                          </Badge>
                        )}
                        {!stage && (
                          <Badge variant="outline">대기 중</Badge>
                        )}
                      </div>
                    </div>
                    {stage?.content && (
                      <div className="mt-2 text-sm text-muted-foreground">
                        <div className="prose prose-sm max-w-none">
                          <pre className="whitespace-pre-wrap">{stage.content}</pre>
                        </div>
                      </div>
                    )}
                    {stage?.status === "failed" && !stage.content && (
                      <div className="mt-2 text-sm text-destructive">
                        이 단계의 생성이 실패했습니다. 콘텐츠 재생성 버튼을 클릭하여 다시 시도해주세요.
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default LessonDetailPane;
