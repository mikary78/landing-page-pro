import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Sparkles, Bot } from "lucide-react";
import { toast } from "sonner";
import { Tables } from "@/integrations/supabase/types";

type Lesson = Tables<"lessons">;
type Project = Tables<"projects">;
type ProjectStage = Tables<"project_stages">;
type ProjectAiResult = Tables<"project_ai_results">;

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
  const [aiResults, setAiResults] = useState<ProjectAiResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selectedAiModel, setSelectedAiModel] = useState<string>("gemini");

  const fetchLessonData = useCallback(async () => {
    try {
      setLoading(true);

      // 레슨 정보 조회
      const { data: lessonData, error: lessonError } = await supabase
        .from("lessons")
        .select("*")
        .eq("id", lessonId)
        .single();

      if (lessonError) throw lessonError;
      setLesson(lessonData);

      // project_id가 있으면 프로젝트 정보 조회
      if (lessonData.project_id) {
        const { data: projectData, error: projectError } = await supabase
          .from("projects")
          .select("*")
          .eq("id", lessonData.project_id)
          .single();

        if (projectError) throw projectError;
        setProject(projectData);

        // AI 결과 조회
        const { data: aiResultsData, error: aiResultsError } = await supabase
          .from("project_ai_results")
          .select("*")
          .eq("project_id", lessonData.project_id);

        if (aiResultsError) throw aiResultsError;
        setAiResults(aiResultsData || []);

        // AI 결과가 있으면 첫 번째 모델 선택
        if (aiResultsData && aiResultsData.length > 0 && !selectedAiModel) {
          setSelectedAiModel(aiResultsData[0].ai_model);
        }
      } else {
        setProject(null);
        setStages([]);
        setAiResults([]);
      }
    } catch (error) {
      console.error("Error fetching lesson data:", error);
      toast.error("레슨 정보를 불러오는 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }, [lessonId, selectedAiModel]);

  const fetchStages = useCallback(async () => {
    if (!lesson?.project_id || !selectedAiModel) {
      setStages([]);
      return;
    }

    try {
      // 모든 상태의 스테이지 조회 (failed 포함)
      const { data: stagesData, error: stagesError } = await supabase
        .from("project_stages")
        .select("*")
        .eq("project_id", lesson.project_id)
        .eq("ai_model", selectedAiModel)
        .order("stage_order", { ascending: true });

      if (stagesError) throw stagesError;
      setStages(stagesData || []);
    } catch (error) {
      console.error("Error fetching stages:", error);
    }
  }, [lesson?.project_id, selectedAiModel]);

  useEffect(() => {
    fetchLessonData();
  }, [fetchLessonData]);

  useEffect(() => {
    fetchStages();
  }, [fetchStages]);

  const handleGenerateContent = async () => {
    if (!lesson) return;

    try {
      setGenerating(true);

      // course에서 owner_id 가져오기
      const { data: courseData, error: courseError } = await supabase
        .from("courses")
        .select("owner_id")
        .eq("id", courseId)
        .single();

      if (courseError) throw courseError;
      if (!courseData) throw new Error("Course not found");

      // project_id가 없으면 프로젝트 생성
      let projectId = lesson.project_id;

      if (!projectId) {
        // 프로필이 없으면 생성 (에러 무시)
        await supabase
          .from("profiles")
          .upsert({
            user_id: courseData.owner_id,
            display_name: "User",
          }, {
            onConflict: 'user_id',
          })
          .then(({ error }) => {
            if (error && error.code !== '23505') {
              console.warn("Profile upsert warning:", error);
            }
          });

        const { data: newProject, error: projectError } = await supabase
          .from("projects")
          .insert({
            user_id: courseData.owner_id,
            title: lesson.title,
            description: lesson.learning_objectives || null,
            document_content: lesson.learning_objectives || lesson.title || "",
            ai_model: selectedAiModel,
            status: "processing",
          })
          .select()
          .single();

        if (projectError) {
          console.error("Error creating project:", projectError);
          throw projectError;
        }
        
        if (!newProject) {
          throw new Error("프로젝트 생성에 실패했습니다.");
        }
        
        projectId = newProject.id;

        // lesson에 project_id 업데이트
        const { error: updateError } = await supabase
          .from("lessons")
          .update({ project_id: projectId })
          .eq("id", lessonId);

        if (updateError) {
          console.error("Error updating lesson:", updateError);
          throw updateError;
        }
      }

      // process-document 호출
      const documentContent = project?.document_content || lesson.learning_objectives || lesson.title || "";
      
      if (!documentContent.trim()) {
        toast.error("레슨 제목이나 학습 목표를 입력해주세요.");
        return;
      }

      const { error: funcError } = await supabase.functions.invoke("process-document", {
        body: {
          projectId: projectId!,
          documentContent: documentContent,
          aiModel: selectedAiModel,
          regenerate: !!lesson.project_id,
        },
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
      }, 3000);
    } catch (error) {
      console.error("Error generating content:", error);
      const errorMessage = error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.";
      toast.error(`콘텐츠 생성 중 오류가 발생했습니다: ${errorMessage}`);
    } finally {
      setGenerating(false);
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
                            onClick={async () => {
                              if (!lesson) return;
                              try {
                                const { error } = await supabase
                                  .from("lessons")
                                  .update({ selected_ai_model: result.ai_model })
                                  .eq("id", lesson.id);

                                if (error) throw error;

                                toast.success(`${result.ai_model} 모델이 최종 선택되었습니다.`);
                                // 레슨 데이터 새로고침
                                const { data: updatedLesson } = await supabase
                                  .from("lessons")
                                  .select("*")
                                  .eq("id", lesson.id)
                                  .single();
                                if (updatedLesson) {
                                  setLesson(updatedLesson);
                                }
                              } catch (error) {
                                console.error("Error updating selected AI model:", error);
                                toast.error("AI 모델 선택 중 오류가 발생했습니다.");
                              }
                            }}
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

      {/* 프로젝트 스테이지 표시 */}
      {project && stages.length > 0 && (
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
                const stage = stages.find((s) => s.stage_order === index + 1);
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

