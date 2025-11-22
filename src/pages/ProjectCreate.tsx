import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2, FileText } from "lucide-react";

const ProjectCreate = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    documentContent: "",
    aiModel: "gemini",
    educationDuration: "",
    educationCourse: "",
    educationSession: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({
        title: "로그인 필요",
        description: "프로젝트를 생성하려면 로그인이 필요합니다.",
        variant: "destructive",
      });
      navigate("/auth");
      return;
    }

    if (!formData.title.trim()) {
      toast({
        title: "제목 필요",
        description: "프로젝트 제목을 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.documentContent.trim()) {
      toast({
        title: "문서 필요",
        description: "MVP/PRD 문서 내용을 입력해주세요.",
        variant: "destructive",
      });
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

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8 md:py-12">
        <Button
          variant="ghost"
          className="mb-6"
          onClick={() => navigate("/dashboard")}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          대시보드로 돌아가기
        </Button>

        <Card className="max-w-3xl mx-auto">
          <CardHeader>
            <CardTitle className="text-2xl md:text-3xl">새 프로젝트 생성</CardTitle>
            <CardDescription>
              MVP/PRD 문서를 입력하고 AI 모델을 선택하여 교육 콘텐츠를 자동 생성하세요
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title">프로젝트 제목 *</Label>
                <Input
                  id="title"
                  placeholder="예: 신입사원 온보딩 교육"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">프로젝트 설명</Label>
                <Textarea
                  id="description"
                  placeholder="프로젝트에 대한 간단한 설명을 입력하세요"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="educationDuration">교육시간</Label>
                  <Select
                    value={formData.educationDuration}
                    onValueChange={(value) =>
                      setFormData({ ...formData, educationDuration: value })
                    }
                  >
                    <SelectTrigger id="educationDuration" className="bg-background">
                      <SelectValue placeholder="선택하세요" />
                    </SelectTrigger>
                    <SelectContent className="bg-background z-50">
                      <SelectItem value="1시간">1시간</SelectItem>
                      <SelectItem value="2시간">2시간</SelectItem>
                      <SelectItem value="3시간">3시간</SelectItem>
                      <SelectItem value="4시간">4시간</SelectItem>
                      <SelectItem value="반나절">반나절 (4-6시간)</SelectItem>
                      <SelectItem value="하루">하루 (8시간)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="educationCourse">교육과정</Label>
                  <Select
                    value={formData.educationCourse}
                    onValueChange={(value) =>
                      setFormData({ ...formData, educationCourse: value })
                    }
                  >
                    <SelectTrigger id="educationCourse" className="bg-background">
                      <SelectValue placeholder="선택하세요" />
                    </SelectTrigger>
                    <SelectContent className="bg-background z-50">
                      <SelectItem value="기본과정">기본과정</SelectItem>
                      <SelectItem value="심화과정">심화과정</SelectItem>
                      <SelectItem value="실무과정">실무과정</SelectItem>
                      <SelectItem value="전문가과정">전문가과정</SelectItem>
                      <SelectItem value="입문과정">입문과정</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="educationSession">교육 회차</Label>
                  <Select
                    value={formData.educationSession}
                    onValueChange={(value) =>
                      setFormData({ ...formData, educationSession: value })
                    }
                  >
                    <SelectTrigger id="educationSession" className="bg-background">
                      <SelectValue placeholder="선택하세요" />
                    </SelectTrigger>
                    <SelectContent className="bg-background z-50">
                      <SelectItem value="1">1회차</SelectItem>
                      <SelectItem value="2">2회차</SelectItem>
                      <SelectItem value="3">3회차</SelectItem>
                      <SelectItem value="4">4회차</SelectItem>
                      <SelectItem value="5">5회차</SelectItem>
                      <SelectItem value="6">6회차</SelectItem>
                      <SelectItem value="8">8회차</SelectItem>
                      <SelectItem value="10">10회차</SelectItem>
                      <SelectItem value="12">12회차</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="document">MVP/PRD 문서 내용 *</Label>
                <Textarea
                  id="document"
                  placeholder="교육 콘텐츠로 만들고 싶은 MVP 또는 PRD 문서의 내용을 입력하세요..."
                  value={formData.documentContent}
                  onChange={(e) =>
                    setFormData({ ...formData, documentContent: e.target.value })
                  }
                  rows={10}
                  required
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <FileText className="h-3 w-3" />
                  문서의 내용을 복사하여 붙여넣기 하세요
                </p>
              </div>

              <div className="space-y-3">
                <Label>AI 모델 선택</Label>
                <RadioGroup
                  value={formData.aiModel}
                  onValueChange={(value) =>
                    setFormData({ ...formData, aiModel: value })
                  }
                >
                  <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-accent/50 transition-colors">
                    <RadioGroupItem value="gemini" id="gemini" />
                    <Label htmlFor="gemini" className="flex-1 cursor-pointer">
                      <div className="font-semibold">Gemini (추천)</div>
                      <div className="text-xs text-muted-foreground">
                        빠르고 효율적인 콘텐츠 생성
                      </div>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-accent/50 transition-colors">
                    <RadioGroupItem value="claude" id="claude" />
                    <Label htmlFor="claude" className="flex-1 cursor-pointer">
                      <div className="font-semibold">Claude</div>
                      <div className="text-xs text-muted-foreground">
                        깊이 있는 분석과 상세한 설명
                      </div>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-accent/50 transition-colors">
                    <RadioGroupItem value="chatgpt" id="chatgpt" />
                    <Label htmlFor="chatgpt" className="flex-1 cursor-pointer">
                      <div className="font-semibold">ChatGPT</div>
                      <div className="text-xs text-muted-foreground">
                        균형잡힌 성능과 창의성
                      </div>
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <Button type="submit" className="w-full" size="lg" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    생성 중...
                  </>
                ) : (
                  "프로젝트 생성"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default ProjectCreate;
