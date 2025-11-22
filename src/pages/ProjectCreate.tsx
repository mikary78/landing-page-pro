import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import BriefWizard, { BriefData } from "@/components/BriefWizard";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2 } from "lucide-react";

const ProjectCreate = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleWizardComplete = async (formData: BriefData) => {
    if (!user) {
      toast({
        title: "로그인 필요",
        description: "프로젝트를 생성하려면 로그인이 필요합니다.",
        variant: "destructive",
      });
      navigate("/auth");
      return;
    }

    setLoading(true);
    try {
      // 프로젝트 생성
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

      toast({
        title: "프로젝트 생성 완료",
        description: "AI가 콘텐츠를 생성하고 있습니다. 실시간으로 진행 상황을 확인하세요.",
      });

      // 상세 페이지로 먼저 이동
      navigate(`/project/${project.id}`);

      // AI 처리 시작 (백그라운드에서 실행)
      setTimeout(async () => {
        try {
          const { error: functionError } = await supabase.functions.invoke("process-document", {
            body: {
              projectId: project.id,
              documentContent: formData.documentContent,
              aiModel: formData.aiModel,
            },
          });

          if (functionError) {
            console.error("AI processing error:", functionError);
          }
        } catch (err) {
          console.error("Failed to start AI processing:", err);
        }
      }, 100);
    } catch (error) {
      console.error("Error creating project:", error);
      toast({
        title: "오류 발생",
        description: "프로젝트 생성 중 오류가 발생했습니다. 다시 시도해주세요.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8 md:py-12 max-w-4xl">
        <Button
          variant="ghost"
          className="mb-6"
          onClick={() => navigate("/dashboard")}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          대시보드로 돌아가기
        </Button>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-lg font-semibold">프로젝트 생성 중...</p>
            <p className="text-sm text-muted-foreground">잠시만 기다려주세요</p>
          </div>
        ) : (
          <BriefWizard onComplete={handleWizardComplete} onCancel={handleCancel} />
        )}
      </main>
    </div>
  );
};

export default ProjectCreate;
