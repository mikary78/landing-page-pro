import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { processDocument } from "@/lib/azureFunctions";
import Header from "@/components/Header";
import BriefWizard, { BriefData } from "@/components/BriefWizard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft, Loader2, FileText, Plus } from "lucide-react";
import { Tables } from "@/integrations/supabase/types";

type ProjectTemplate = Tables<"project_templates">;

const ProjectCreate = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const [templates, setTemplates] = useState<ProjectTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<ProjectTemplate | null>(null);

  const fetchTemplates = useCallback(async () => {
    if (!user) return;
    
    try {
      setLoadingTemplates(true);
      const { data, error } = await supabase
        .from("project_templates")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error("Error fetching templates:", error);
      toast.error("템플릿 목록을 불러오는 중 오류가 발생했습니다.");
    } finally {
      setLoadingTemplates(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchTemplates();
    }
  }, [fetchTemplates, user]);

  const handleSelectTemplate = (template: ProjectTemplate | null) => {
    setSelectedTemplate(template);
    setShowWizard(true);
  };

  const getInitialData = (): Partial<BriefData> | undefined => {
    if (!selectedTemplate) return undefined;
    
    return {
      title: "",
      description: selectedTemplate.description || "",
      educationDuration: selectedTemplate.education_duration || "",
      educationCourse: selectedTemplate.education_course || "",
      educationSession: selectedTemplate.education_session?.toString() || "",
      aiModel: selectedTemplate.ai_model,
    };
  };

  const handleWizardComplete = async (formData: BriefData) => {
    if (!user) {
      toast.error("로그인이 필요합니다.");
      navigate("/auth");
      return;
    }

    setLoading(true);
    try {
      const { data: project, error: projectError } = await supabase
        .from("projects")
        .insert({
          user_id: user.id,
          title: formData.title,
          description: formData.description,
          document_content: formData.documentContent,
          ai_model: formData.aiModel,
          status: "processing",
          education_duration: formData.educationDuration || null,
          education_course: formData.educationCourse || null,
          education_session: formData.educationSession ? parseInt(formData.educationSession) : null,
        })
        .select()
        .single();

      if (projectError) throw projectError;

      toast.success("AI가 콘텐츠를 생성하고 있습니다.");

      // Azure Function 호출 (프로젝트 생성 직후)
      try {
        const { error: functionError, data: functionData } = await processDocument({
          projectId: project.id,
          documentContent: formData.documentContent,
          aiModel: formData.aiModel as 'gemini' | 'claude' | 'chatgpt',
        });

        if (functionError) {
          console.error("AI processing error:", functionError);
          toast.error("AI 콘텐츠 생성 시작 중 오류가 발생했습니다. 프로젝트 상세 페이지에서 다시 시도해주세요.");
        } else {
          console.log("AI processing started:", functionData);
        }
      } catch (err) {
        console.error("Failed to start AI processing:", err);
        toast.error("AI 콘텐츠 생성 시작 중 오류가 발생했습니다. 프로젝트 상세 페이지에서 다시 시도해주세요.");
      }

      // 프로젝트 상세 페이지로 이동
      navigate(`/project/${project.id}`);
    } catch (error) {
      console.error("Error creating project:", error);
      toast.error("프로젝트 생성 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (showWizard) {
      setShowWizard(false);
      setSelectedTemplate(null);
    } else {
      navigate("/dashboard");
    }
  };

  if (showWizard) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        
        <main className="container mx-auto px-4 py-8 md:py-12 max-w-4xl">
          <Button
            variant="ghost"
            className="mb-6"
            onClick={handleCancel}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            템플릿 선택으로 돌아가기
          </Button>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
              <p className="text-lg font-semibold">프로젝트 생성 중...</p>
              <p className="text-sm text-muted-foreground">잠시만 기다려주세요</p>
            </div>
          ) : (
            <BriefWizard 
              onComplete={handleWizardComplete} 
              onCancel={handleCancel}
              initialData={getInitialData()}
            />
          )}
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8 md:py-12 max-w-6xl">
        <Button
          variant="ghost"
          className="mb-6"
          onClick={() => navigate("/dashboard")}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          대시보드로 돌아가기
        </Button>

        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">새 프로젝트 생성</h1>
          <p className="text-muted-foreground">
            처음부터 시작하거나 저장된 템플릿을 선택하세요.
          </p>
        </div>

        {loadingTemplates ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card 
              className="border-2 border-dashed cursor-pointer hover:border-primary transition-colors"
              onClick={() => handleSelectTemplate(null)}
            >
              <CardHeader>
                <div className="flex items-center justify-center h-12 w-12 rounded-full bg-primary/10 mb-4">
                  <Plus className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>처음부터 생성</CardTitle>
                <CardDescription>
                  새 프로젝트를 처음부터 만듭니다.
                </CardDescription>
              </CardHeader>
            </Card>

            {templates.map((template) => (
              <Card 
                key={template.id}
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => handleSelectTemplate(template)}
              >
                <CardHeader>
                  <div className="flex items-center justify-center h-12 w-12 rounded-full bg-blue-500/10 mb-4">
                    <FileText className="h-6 w-6 text-blue-500" />
                  </div>
                  <CardTitle className="line-clamp-1">{template.template_name}</CardTitle>
                  <CardDescription className="line-clamp-2">
                    {template.description || "설명이 없습니다"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    {template.ai_model && (
                      <span>모델: {template.ai_model}</span>
                    )}
                    {template.education_course && (
                      <span>코스: {template.education_course}</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default ProjectCreate;
