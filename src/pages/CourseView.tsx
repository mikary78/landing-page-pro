import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Loader2, BookOpen, FileText, Presentation, Code, ClipboardCheck, CheckCircle, ArrowLeft, MessageSquare } from "lucide-react";
import CourseFeedback from "@/components/CourseFeedback";

interface ProjectStage {
  id: string;
  stage_name: string;
  stage_order: number;
  content: string | null;
  status: string;
}

interface Project {
  id: string;
  title: string;
  description: string | null;
  education_duration: string | null;
  education_course: string | null;
  education_session: number | null;
}

const stageIcons: Record<string, React.ElementType> = {
  "커리큘럼 설계": BookOpen,
  "수업안 작성": FileText,
  "슬라이드 구성": Presentation,
  "실습 템플릿": Code,
  "평가/퀴즈": ClipboardCheck,
  "최종 검토": CheckCircle,
};

const CourseView = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [stages, setStages] = useState<ProjectStage[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("content");

  useEffect(() => {
    if (id) {
      fetchCourseData();
    }
  }, [id]);

  const fetchCourseData = async () => {
    try {
      // 프로젝트 정보 가져오기 (공개 접근)
      const { data: projectData, error: projectError } = await supabase
        .from("projects")
        .select("id, title, description, education_duration, education_course, education_session")
        .eq("id", id)
        .single();

      if (projectError) throw projectError;
      setProject(projectData);

      // 단계별 콘텐츠 가져오기
      const { data: stagesData, error: stagesError } = await supabase
        .from("project_stages")
        .select("*")
        .eq("project_id", id)
        .eq("status", "completed")
        .order("stage_order", { ascending: true });

      if (stagesError) throw stagesError;
      setStages(stagesData || []);
    } catch (error) {
      console.error("Error fetching course data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <h1 className="text-2xl font-bold mb-4">교육 과정을 찾을 수 없습니다</h1>
        <Button onClick={() => navigate("/")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          홈으로 돌아가기
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* 헤더 */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold mb-2">{project.title}</h1>
              {project.description && (
                <p className="text-muted-foreground">{project.description}</p>
              )}
              <div className="flex flex-wrap gap-2 mt-3">
                {project.education_course && (
                  <Badge variant="secondary">{project.education_course}</Badge>
                )}
                {project.education_duration && (
                  <Badge variant="outline">{project.education_duration}</Badge>
                )}
                {project.education_session && (
                  <Badge variant="outline">{project.education_session}회차</Badge>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* 메인 콘텐츠 */}
      <main className="container mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="content" className="gap-2">
              <BookOpen className="h-4 w-4" />
              교육 콘텐츠
            </TabsTrigger>
            <TabsTrigger value="feedback" className="gap-2">
              <MessageSquare className="h-4 w-4" />
              피드백
            </TabsTrigger>
          </TabsList>

          <TabsContent value="content" className="space-y-6">
            {stages.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <p className="text-muted-foreground">
                    아직 생성된 콘텐츠가 없습니다
                  </p>
                </CardContent>
              </Card>
            ) : (
              stages.map((stage) => {
                const Icon = stageIcons[stage.stage_name] || FileText;
                return (
                  <Card key={stage.id}>
                    <CardHeader>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
                          <Icon className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{stage.stage_name}</CardTitle>
                          <CardDescription>Step {stage.stage_order}</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        <div className="whitespace-pre-wrap text-sm leading-relaxed">
                          {stage.content}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </TabsContent>

          <TabsContent value="feedback">
            {id && <CourseFeedback projectId={id} isOwner={false} />}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default CourseView;
