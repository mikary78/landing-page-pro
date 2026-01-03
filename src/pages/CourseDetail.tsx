/**
 * CourseDetail 페이지
 * 
 * 코스 생성 결과를 프로젝트 상세 페이지와 동일하게 파이프라인 단계, 인포그래픽, 최종 결과물을 볼 수 있는 페이지
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { callAzureFunctionDirect } from "@/lib/azureFunctions";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, CheckCircle2, Clock, XCircle, Loader2, FileText, List, BarChart3, Sparkles } from "lucide-react";
import { InfographicPreview } from "@/components/InfographicPreview";

// 타입 정의
interface Course {
  id: string;
  title: string;
  description?: string;
  level?: string;
  target_audience?: string;
  total_duration?: string;
  status: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

interface Lesson {
  id: string;
  module_id: string;
  project_id: string | null;
  title: string;
  order_index: number;
  learning_objectives?: string;
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

const CourseDetail = () => {
  const { id } = useParams();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [course, setCourse] = useState<Course | null>(null);
  const [modules, setModules] = useState<Array<{
    id: string;
    course_id: string;
    title: string;
    order_index: number;
    lessons: Lesson[];
  }>>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [projects, setProjects] = useState<Record<string, Project>>({});
  const [allStages, setAllStages] = useState<ProjectStage[]>([]);
  const [allAiResults, setAllAiResults] = useState<AiResult[]>([]);
  const [loadingCourse, setLoadingCourse] = useState(true);
  const [loadingStages, setLoadingStages] = useState(false);
  const [selectedAiModel, setSelectedAiModel] = useState<string>("gemini");
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user && id) {
      fetchCourseDetails();
    }
  }, [user, id]);

  // AI 모델 선택 시 stages는 이미 allStages에 있으므로 필터링만 하면 됨
  // useEffect 제거 - selectedAiModel 변경 시 자동으로 filteredStages가 업데이트됨

  const fetchCourseDetails = async () => {
    if (!user || !id) return;
    
    try {
      setLoadingCourse(true);
      
      // 코스 정보 가져오기
      const { data: courseData, error: courseError } = await callAzureFunctionDirect<{
        success: boolean;
        course: Course;
      }>(`/api/getcourse/${id}`, 'GET');

      if (courseError) throw courseError;
      
      if (!courseData?.success || !courseData.course) {
        toast({
          title: "코스를 찾을 수 없습니다",
          description: "존재하지 않거나 접근 권한이 없는 코스입니다.",
          variant: "destructive",
        });
        navigate('/courses');
        return;
      }
      
      setCourse(courseData.course);

      // 코스의 모든 모듈과 레슨 가져오기
      const { data: modulesData, error: modulesError } = await callAzureFunctionDirect<{
        success: boolean;
        modules: Array<{
          id: string;
          course_id: string;
          title: string;
          order_index: number;
          lessons: Lesson[];
        }>;
      }>(`/api/getmoduleswithlessons/${id}`, 'GET');

      if (modulesError) throw modulesError;
      
      const modulesList = modulesData?.modules || [];
      setModules(modulesList);
      
      const allLessons: Lesson[] = [];
      modulesList.forEach(module => {
        allLessons.push(...module.lessons);
      });
      
      setLessons(allLessons);

      // 각 레슨의 프로젝트 정보 가져오기
      const projectIds = allLessons
        .map(lesson => lesson.project_id)
        .filter((id): id is string => id !== null && id !== undefined);

      if (projectIds.length > 0) {
        setLoadingStages(true);
        const projectsMap: Record<string, Project> = {};
        const stagesList: ProjectStage[] = [];
        const aiResultsList: AiResult[] = [];

        // 모든 프로젝트 정보 병렬로 가져오기
        await Promise.all(
          projectIds.map(async (projectId) => {
            try {
              // 프로젝트 정보 가져오기
              const { data: projectData, error: projectError } = await callAzureFunctionDirect<{
                success: boolean;
                project: Project;
                aiResults: AiResult[];
                stages: ProjectStage[];
              }>(`/api/getproject/${projectId}`, 'GET');

              if (!projectError && projectData?.success && projectData.project) {
                projectsMap[projectId] = projectData.project;
                if (projectData.aiResults) {
                  aiResultsList.push(...projectData.aiResults);
                }
                
                // 모든 stages 가져오기 (aiModel 파라미터 없이 - 모든 AI 모델의 stages 포함)
                const { data: stagesData, error: stagesError } = await callAzureFunctionDirect<{
                  success: boolean;
                  stages: ProjectStage[];
                }>(`/api/getprojectstages/${projectId}`, 'GET');
                
                if (!stagesError && stagesData?.success && stagesData.stages) {
                  console.log(`[CourseDetail] Fetched ${stagesData.stages.length} stages for project ${projectId}`);
                  const models = [...new Set(stagesData.stages.map(s => s.ai_model || 'NULL'))];
                  console.log(`[CourseDetail] Available ai_model values for project ${projectId}:`, models);
                  
                  // 각 stage의 상세 정보 로그
                  stagesData.stages.forEach((stage, idx) => {
                    console.log(`[CourseDetail] Stage ${idx + 1} for project ${projectId}:`, {
                      id: stage.id,
                      ai_model: stage.ai_model,
                      stage_order: stage.stage_order,
                      status: stage.status,
                      hasContent: !!stage.content,
                      contentLength: stage.content?.length || 0
                    });
                  });
                  
                  stagesList.push(...stagesData.stages);
                } else {
                  // Fallback: projectData의 stages 사용
                  if (projectData.stages) {
                    console.log(`[CourseDetail] Using stages from projectData for project ${projectId}:`, projectData.stages.length);
                    const models = [...new Set(projectData.stages.map(s => s.ai_model || 'NULL'))];
                    console.log(`[CourseDetail] Available ai_model values from projectData for project ${projectId}:`, models);
                    stagesList.push(...projectData.stages);
                  }
                  if (stagesError) {
                    console.error(`[CourseDetail] Error fetching stages for project ${projectId}:`, stagesError);
                  }
                }
              }
            } catch (error) {
              console.error(`Error fetching project ${projectId}:`, error);
            }
          })
        );

          setProjects(projectsMap);
        setAllAiResults(aiResultsList);
        setAllStages(stagesList); // stages도 설정

        // 모든 stages에서 사용 가능한 AI 모델 확인
        const availableModels = [...new Set(stagesList.map(s => s.ai_model?.toLowerCase()).filter(Boolean))];
        console.log('[CourseDetail] ===== STAGES SUMMARY =====');
        console.log('[CourseDetail] Total stages loaded:', stagesList.length);
        console.log('[CourseDetail] Available AI models from stages:', availableModels);
        console.log('[CourseDetail] Stage count by model:', 
          stagesList.reduce((acc, s) => {
            const model = s.ai_model || 'NULL';
            acc[model] = (acc[model] || 0) + 1;
            return acc;
          }, {} as Record<string, number>)
        );
        
        // ChatGPT stages가 있는지 확인
        const chatgptStages = stagesList.filter(s => {
          const model = s.ai_model?.toLowerCase() || '';
          return model === 'chatgpt' || model.includes('gpt') || model.includes('chat');
        });
        console.log('[CourseDetail] ChatGPT-related stages found:', chatgptStages.length);
        if (chatgptStages.length > 0) {
          console.log('[CourseDetail] ChatGPT stages details:', chatgptStages.map(s => ({
            id: s.id,
            ai_model: s.ai_model,
            project_id: s.project_id,
            status: s.status,
            hasContent: !!s.content
          })));
        } else {
          console.warn('[CourseDetail] ⚠️ No ChatGPT stages found! All stages:', stagesList.map(s => ({
            id: s.id,
            ai_model: s.ai_model,
            project_id: s.project_id
          })));
        }
        console.log('[CourseDetail] =========================');
        
        // 초기 AI 모델 설정 (ChatGPT 우선, 없으면 첫 번째 사용 가능한 모델)
        let initialAiModel = "gemini";
        if (availableModels.length > 0) {
          // ChatGPT 우선 선택
          const chatgptModel = availableModels.find(m => m === 'chatgpt' || m === 'gpt-4' || m === 'gpt-3.5');
          if (chatgptModel) {
            initialAiModel = chatgptModel;
          } else {
            // ChatGPT가 없으면 첫 번째 사용 가능한 모델 선택
            initialAiModel = availableModels[0];
          }
        } else if (Object.keys(projectsMap).length > 0) {
          // stages가 없으면 프로젝트의 AI 모델 사용
          const firstProject = Object.values(projectsMap)[0];
          if (firstProject.ai_model) {
            initialAiModel = firstProject.ai_model.toLowerCase();
          }
        }
        console.log('[CourseDetail] Setting initial AI model to:', initialAiModel);
        setSelectedAiModel(initialAiModel);
        setLoadingStages(false);
      } else {
        setLoadingStages(false);
      }
      
    } catch (error) {
      console.error("Error fetching course details:", error);
      toast({
        title: "오류 발생",
        description: "코스 정보를 불러오는 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    } finally {
      setLoadingCourse(false);
    }
  };

  // stage에 해당하는 레슨과 모듈 찾기
  const getLessonAndModuleForStage = (stage: ProjectStage) => {
    const lesson = lessons.find(l => l.project_id === stage.project_id);
    if (!lesson) return { lesson: null, module: null };
    
    const module = modules.find(m => m.lessons.some(l => l.id === lesson.id));
    return { lesson, module };
  };

  // 사용 가능한 AI 모델 목록
  const availableAiModels = useMemo(() => {
    const modelsFromStages = [...new Set(allStages.map(s => s.ai_model?.toLowerCase()).filter(Boolean))];
    
    // ChatGPT 관련 변형들을 'chatgpt'로 통일
    const normalizedModels = modelsFromStages.map(m => {
      if (m === 'chatgpt' || m === 'gpt-4' || m === 'gpt-3.5' || m === 'gpt-4o' || m === 'gpt-4o-mini' || m.includes('gpt')) {
        return 'chatgpt';
      }
      return m;
    });
    
    // 기본 모델들도 추가 (데이터가 없어도 선택 가능하도록)
    const defaultModels = ['gemini', 'claude', 'chatgpt'];
    const allModels = [...new Set([...defaultModels, ...normalizedModels])];
    
    console.log('[CourseDetail] Available AI models:', allModels, '(from stages:', modelsFromStages, ')');
    
    return allModels;
  }, [allStages]);

  // 선택된 모듈의 레슨 목록
  const availableLessons = useMemo(() => {
    if (!selectedModuleId) return lessons;
    const module = modules.find(m => m.id === selectedModuleId);
    return module ? module.lessons : [];
  }, [selectedModuleId, modules, lessons]);

  // 선택된 AI 모델, 모듈, 레슨에 맞는 stages 필터링
  const filteredStages = useMemo(() => {
    const selectedModel = selectedAiModel.toLowerCase();
    
    // 디버깅: 모든 stages의 ai_model 값 확인
    if (allStages.length > 0) {
      const uniqueModels = [...new Set(allStages.map(s => s.ai_model).filter(Boolean))];
      console.log(`[CourseDetail] All unique ai_model values in stages:`, uniqueModels);
      console.log(`[CourseDetail] Selected AI model: ${selectedAiModel} (normalized: ${selectedModel})`);
    }
    
    let filtered = allStages.filter(stage => {
      const stageModelRaw = stage.ai_model || '';
      const stageModel = stageModelRaw.toLowerCase().trim();
      
      // AI 모델 매칭 (대소문자 구분 없이, 다양한 형식 지원)
      let matchesModel = false;
      
      // 정확한 매칭
      if (stageModel === selectedModel) {
        matchesModel = true;
      }
      // ChatGPT 관련 변형들 (더 포괄적으로)
      else if (selectedModel === 'chatgpt') {
        matchesModel = stageModel === 'chatgpt' || 
                      stageModel === 'gpt-4' || 
                      stageModel === 'gpt-3.5' ||
                      stageModel === 'gpt-4o' ||
                      stageModel === 'gpt-4o-mini' ||
                      stageModel.startsWith('gpt') ||
                      stageModel.includes('gpt') ||
                      stageModel.includes('chat');
      }
      // 역방향 매칭 (gpt-4 선택 시 chatgpt도 포함)
      else if (selectedModel.includes('gpt') && (stageModel === 'chatgpt' || stageModel.includes('gpt'))) {
        matchesModel = true;
      }
      // ai_model이 없는 경우도 포함 (하위 호환성)
      else if (!stageModelRaw && selectedModel === 'gemini') {
        // 기본값이 gemini일 수 있음
        matchesModel = true;
      }
      
      const isValid = matchesModel && stage.status === "completed" && stage.content;
      
      // 디버깅: 모든 stage 정보 로그
      console.log(`[CourseDetail] Stage check: id=${stage.id}, ai_model="${stageModelRaw}" (normalized: "${stageModel}"), selected="${selectedAiModel}" (normalized: "${selectedModel}"), matchesModel=${matchesModel}, status="${stage.status}", hasContent=${!!stage.content}, isValid=${isValid}`);
      
      return isValid;
    });

    // 모듈 필터링
    if (selectedModuleId) {
      const module = modules.find(m => m.id === selectedModuleId);
      if (module) {
        const moduleLessonIds = new Set(module.lessons.map(l => l.id));
        filtered = filtered.filter(stage => {
          const lesson = lessons.find(l => l.project_id === stage.project_id);
          return lesson && moduleLessonIds.has(lesson.id);
        });
      }
    }

    // 레슨 필터링
    if (selectedLessonId) {
      filtered = filtered.filter(stage => {
        const lesson = lessons.find(l => l.project_id === stage.project_id);
        return lesson && lesson.id === selectedLessonId;
      });
    }

    // 정렬
    filtered.sort((a, b) => {
      // 먼저 stage_order로 정렬, 같으면 project_id로 정렬
      if (a.stage_order !== b.stage_order) {
        return a.stage_order - b.stage_order;
      }
      return a.project_id.localeCompare(b.project_id);
    });
    
    console.log(`[CourseDetail] Filtered stages: ${filtered.length} out of ${allStages.length} (model: ${selectedAiModel}, module: ${selectedModuleId || 'all'}, lesson: ${selectedLessonId || 'all'})`);
    
    return filtered;
  }, [allStages, selectedAiModel, selectedModuleId, selectedLessonId, modules, lessons]);

  // 최종 결과물 콘텐츠 생성 (모든 프로젝트의 stages 통합)
  const currentContent = useMemo(() => {
    if (filteredStages.length === 0) return null;

    // 프로젝트별로 그룹화
    const stagesByProject: Record<string, ProjectStage[]> = {};
    filteredStages.forEach(stage => {
      if (!stagesByProject[stage.project_id]) {
        stagesByProject[stage.project_id] = [];
      }
      stagesByProject[stage.project_id].push(stage);
    });

    // 각 프로젝트의 콘텐츠를 합치기
    const projectContents: string[] = [];
    Object.entries(stagesByProject).forEach(([projectId, stages]) => {
      const project = projects[projectId];
      const lesson = lessons.find(l => l.project_id === projectId);
      const module = lesson ? modules.find(m => m.lessons.some(l => l.id === lesson.id)) : null;
      
      if (project) {
        const sortedStages = [...stages].sort((a, b) => 
          (a.stage_order || 0) - (b.stage_order || 0)
        );
        
        // 헤더에 모듈/레슨 정보 포함
        let header = `## ${project.title}`;
        if (module && lesson) {
          header = `## 모듈 ${module.order_index}: ${module.title} - 레슨 ${lesson.order_index}: ${lesson.title}`;
        }
        
        const content = sortedStages
          .map((stage, index) => {
            const stageName = stage.stage_name || STAGE_NAMES[index] || `단계 ${index + 1}`;
            return `### ${stageName}\n\n${stage.content || '(내용 없음)'}`;
          })
          .join('\n\n---\n\n');
        projectContents.push(`${header}\n\n${content}`);
      }
    });

    return projectContents.join('\n\n## 다음 레슨\n\n---\n\n');
  }, [filteredStages, projects, lessons, modules]);

  // 진행률 계산
  const progressPercentage = useMemo(() => {
    if (filteredStages.length === 0) return 0;
    const completedStages = filteredStages.filter(s => s.status === "completed").length;
    return (completedStages / filteredStages.length) * 100;
  }, [filteredStages]);

  const getStageIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="h-6 w-6 text-green-600" />;
      case "processing":
        return <Loader2 className="h-6 w-6 text-blue-600 animate-spin" />;
      case "failed":
        return <XCircle className="h-6 w-6 text-red-600" />;
      default:
        return <Clock className="h-6 w-6 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge variant="default" className="bg-green-600">완료</Badge>;
      case "processing":
        return <Badge variant="default" className="bg-blue-600">처리 중</Badge>;
      case "failed":
        return <Badge variant="destructive">실패</Badge>;
      default:
        return <Badge variant="outline">대기 중</Badge>;
    }
  };

  if (loading || loadingCourse) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!course) {
    return null;
  }

  const completedStages = filteredStages.filter(s => s.status === "completed").length;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8 max-w-7xl">
        {/* 헤더 */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate("/courses")}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            코스 목록
          </Button>
          
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold mb-2">{course.title}</h1>
              {course.description && (
                <p className="text-muted-foreground mb-4">{course.description}</p>
              )}
              <div className="flex flex-wrap gap-2">
                {course.level && <Badge variant="secondary">{course.level}</Badge>}
                {course.total_duration && <Badge variant="outline">{course.total_duration}</Badge>}
                {course.target_audience && <Badge variant="outline">{course.target_audience}</Badge>}
              </div>
            </div>
            
            <div className="flex items-center gap-2 flex-wrap">
              <Select value={selectedAiModel} onValueChange={setSelectedAiModel}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="AI 모델 선택" />
                </SelectTrigger>
                <SelectContent>
                  {availableAiModels.map(model => (
                    <SelectItem key={model} value={model}>
                      {model === 'chatgpt' ? 'ChatGPT' : model === 'gemini' ? 'Gemini' : model === 'claude' ? 'Claude' : model.toUpperCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select 
                value={selectedModuleId || "all"} 
                onValueChange={(value) => {
                  setSelectedModuleId(value === "all" ? null : value);
                  setSelectedLessonId(null); // 모듈 변경 시 레슨 선택 초기화
                }}
              >
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="모듈 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체 모듈</SelectItem>
                  {modules
                    .sort((a, b) => a.order_index - b.order_index)
                    .map(module => (
                      <SelectItem key={module.id} value={module.id}>
                        모듈 {module.order_index}: {module.title}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              
              <Select 
                value={selectedLessonId || "all"} 
                onValueChange={(value) => setSelectedLessonId(value === "all" ? null : value)}
                disabled={!selectedModuleId}
              >
                <SelectTrigger className="w-48" disabled={!selectedModuleId}>
                  <SelectValue placeholder={selectedModuleId ? "레슨 선택" : "먼저 모듈을 선택하세요"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체 레슨</SelectItem>
                  {availableLessons
                    .sort((a, b) => a.order_index - b.order_index)
                    .map(lesson => (
                      <SelectItem key={lesson.id} value={lesson.id}>
                        레슨 {lesson.order_index}: {lesson.title}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* 진행률 */}
          {filteredStages.length > 0 && (
            <div className="grid gap-4 md:grid-cols-2 mb-6">
              <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">전체 진행률</span>
                      <Badge variant="outline" className="text-xs">{completedStages} / {filteredStages.length} 단계</Badge>
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
                      <p className="text-sm font-semibold mb-1">레슨 수</p>
                      <p className="text-xs text-muted-foreground">{lessons.length}개의 레슨이 포함되어 있습니다</p>
                    </div>
                    <div className="text-2xl font-bold text-primary">{lessons.length}</div>
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
            {loadingStages ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                  <p className="text-lg font-semibold mb-2">코스 단계를 불러오는 중입니다</p>
                  <p className="text-sm text-muted-foreground">잠시만 기다려주세요...</p>
                </CardContent>
              </Card>
            ) : filteredStages.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-lg font-semibold mb-2">{selectedAiModel.toUpperCase()} 모델로 생성된 단계가 없습니다</p>
                  <p className="text-sm text-muted-foreground">
                    다른 AI 모델을 선택하거나, 레슨에서 콘텐츠를 생성해주세요.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {filteredStages.map((stage, index) => {
                  const project = projects[stage.project_id];
                  const { lesson, module } = getLessonAndModuleForStage(stage);
                  
                  return (
                    <Card key={stage.id} className={`transition-all hover:shadow-md ${stage.status === 'processing' ? 'border-primary shadow-lg ring-2 ring-primary/20' : ''}`}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center gap-3">
                          <div className="flex-shrink-0">{getStageIcon(stage.status)}</div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <CardTitle className="text-lg">
                                {module && lesson ? (
                                  <>
                                    모듈 {module.order_index}: {module.title} - 레슨 {lesson.order_index}: {lesson.title}
                                  </>
                                ) : project ? (
                                  `${project.title}`
                                ) : (
                                  '레슨'
                                )}
                                {' - '}
                                단계 {stage.stage_order}: {STAGE_NAMES[stage.stage_order - 1] || stage.stage_name}
                              </CardTitle>
                              {getStatusBadge(stage.status)}
                            </div>
                            <div className="flex flex-wrap gap-2 mt-2">
                              {module && (
                                <Badge variant="outline" className="text-xs">
                                  모듈: {module.title}
                                </Badge>
                              )}
                              {lesson && (
                                <Badge variant="outline" className="text-xs">
                                  레슨: {lesson.title}
                                </Badge>
                              )}
                              {project && (
                                <Badge variant="secondary" className="text-xs">
                                  프로젝트: {project.title}
                                </Badge>
                              )}
                            </div>
                            {project && project.description && (
                              <CardDescription className="mt-2">{project.description}</CardDescription>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      
                      {stage.content && (
                        <CardContent>
                          <div className="bg-muted/50 p-5 rounded-lg border max-h-[400px] overflow-y-auto">
                            <p className="text-sm whitespace-pre-wrap leading-relaxed">{stage.content}</p>
                          </div>
                        </CardContent>
                      )}
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* 인포그래픽 탭 */}
          <TabsContent value="infographic">
            {currentContent ? (
              <InfographicPreview
                title={course.title}
                description={course.description || undefined}
                aiModel={selectedAiModel}
                stages={filteredStages}
                createdAt={course.created_at}
                generatedContent={currentContent}
              />
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                  <p className="text-lg font-semibold mb-2">인포그래픽을 준비하고 있습니다</p>
                  <p className="text-sm text-muted-foreground">콘텐츠가 생성되면 자동으로 표시됩니다.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* 최종 결과물 탭 */}
          <TabsContent value="final">
            {currentContent ? (
              <Card>
                <CardHeader>
                  <CardTitle>최종 결과물</CardTitle>
                  <CardDescription>
                    {selectedAiModel.toUpperCase()} 모델로 생성된 전체 콘텐츠
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="bg-muted/50 p-6 rounded-lg border max-h-[600px] overflow-y-auto">
                    <pre className="whitespace-pre-wrap text-sm leading-relaxed font-sans">
                      {currentContent}
                    </pre>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                  <p className="text-lg font-semibold mb-2">최종 결과물을 준비하고 있습니다</p>
                  <p className="text-sm text-muted-foreground">콘텐츠가 생성되면 자동으로 표시됩니다.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default CourseDetail;

