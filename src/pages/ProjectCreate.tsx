import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
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

      if (error) {
        console.error("Supabase templates error details:", {
          message: error.message,
          code: error.code,
          status: error.status,
          details: (error as any).details,
        });

        // If the project_templates table or user_id column is missing, fall back gracefully.
        if ((error as any).code === '42703' || error.status === 404 || /does not exist/.test(String(error.message))) {
          console.warn('Templates table missing or column absent; returning empty templates list');
          setTemplates([]);
          return;
        }

        throw error;
      }
      setTemplates(data || []);
    } catch (error) {
      console.error("Error fetching templates:", error);
      const message = typeof error === 'object' && error !== null && 'message' in error
        ? String((error as { message?: string }).message ?? '')
        : '';
      if (message.toLowerCase().includes('jwt') || message.toLowerCase().includes('auth')) {
        toast.error('인증 에러가 발생했습니다. 다시 로그인해주세요.');
        navigate('/auth');
        return;
      }
      // toast.error('템플릿을 불러오는 중 오류가 발생했습니다. 나중에 다시 시도해주세요.');
    } finally {
      setLoadingTemplates(false);
    }
  }, [user, navigate]);

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
    if (loading) return; // prevent duplicate submissions
    const trimmedTitle = formData.title.trim();
    if (!trimmedTitle) {
      toast.error("제목을 입력해주세요.");
      return;
    }
    if (!user) {
      toast.error("Login required.");
      navigate("/auth");
      return;
    }

    setLoading(true);
    try {
      const sessionValue = Number(formData.educationSession);
      const educationSession = Number.isFinite(sessionValue) ? sessionValue : undefined;

      // Build insert payload dynamically - some columns might not exist on remote DB
      const insertPayload: Record<string, any> = {
        // Required columns (must always be present for RLS/NOT NULL)
        title: trimmedTitle,
        user_id: user.id,
        document_content: formData.documentContent,
        ai_model: formData.aiModel,
        status: "processing",
      };

      // Optional columns
      if (formData.description) insertPayload.description = formData.description;
      if (formData.educationDuration) insertPayload.education_duration = formData.educationDuration;
      if (formData.educationCourse) insertPayload.education_course = formData.educationCourse;
      if (educationSession !== undefined) insertPayload.education_session = educationSession;

      let project;
      let projectError;
      
      // First attempt with all fields
      const firstAttempt = await supabase
        .from("projects")
        .insert(insertPayload)
        .select()
        .single();
      
      projectError = firstAttempt.error;
      project = firstAttempt.data;

      // If column doesn't exist, retry with fewer columns
      if (projectError && ((projectError.message?.includes('could not find') || (projectError as any).code === 'PGRST204'))) {
        console.warn('Some columns missing on remote DB, retrying with essential columns only');
        const minimalPayload: Record<string, any> = {
          // Required columns (must remain to satisfy NOT NULL + RLS)
          title: trimmedTitle,
          user_id: user.id,
          document_content: formData.documentContent,
          ai_model: formData.aiModel,
          status: "processing",
        };
        
        const retryAttempt = await supabase
          .from("projects")
          .insert(minimalPayload)
          .select()
          .single();
        
        projectError = retryAttempt.error;
        project = retryAttempt.data;
      }

      if (projectError || !project) {
        console.error("Project insert failed:", projectError);
        const errMsg = typeof projectError === 'object' && projectError !== null && 'message' in projectError
          ? String((projectError as { message?: string }).message ?? '')
          : '';
        toast.error(`Project insert failed${errMsg ? `: ${errMsg}` : ''}`);
        throw projectError ?? new Error("Project insert failed");
      }

      // Start AI processing immediately and surface failures.
      const { data: functionData, error: functionError } = await supabase.functions.invoke("process-document", {
        body: {
          projectId: project.id,
          documentContent: formData.documentContent,
          aiModel: formData.aiModel,
        },
      });

      console.log("Function invoke result:", { functionData, functionError });

      if (functionError) {
        console.error("Function error details:", functionError);
        await supabase.from("projects").update({ status: "failed" }).eq("id", project.id);
        const errorMessage = typeof functionError === 'object' && functionError !== null && 'message' in functionError
          ? (functionError as { message?: string }).message
          : String(functionError);
        toast.error(`AI processing failed: ${errorMessage}. Please reopen the project and retry.`);
      } else {
        toast.success("AI has started generating content.");
      }

      navigate(`/project/${project.id}`);
    } catch (error) {
      console.error("Error creating project:", error);
      toast.error("Project creation failed.");
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

          <div className="relative">
            {loading && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm">
                <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                <p className="text-lg font-semibold">프로젝트 생성 중...</p>
                <p className="text-sm text-muted-foreground">잠시만 기다려주세요</p>
              </div>
            )}
            <BriefWizard 
              onComplete={handleWizardComplete} 
              onCancel={handleCancel}
              initialData={getInitialData()}
            />
          </div>
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
