import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, Loader2 } from "lucide-react";

const CourseCreatePage = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    level: "",
    target_audience: "",
    total_duration: "",
  });

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error("로그인이 필요합니다.");
      navigate("/auth");
      return;
    }

    if (!formData.title.trim()) {
      toast.error("코스 제목을 입력해주세요.");
      return;
    }

    setLoading(true);
    try {
      // profiles 테이블에 프로필이 없으면 생성 (에러 무시 - 이미 존재할 수 있음)
      // handle_new_user 트리거가 있지만, 기존 사용자의 경우 프로필이 없을 수 있음
      await supabase
        .from("profiles")
        .upsert({
          user_id: user.id,
          display_name: user.email?.split('@')[0] || 'User',
        }, {
          onConflict: 'user_id',
        })
        .then(({ error }) => {
          if (error && error.code !== '23505') { // 23505는 중복 키 에러 (무시 가능)
            console.warn("Profile upsert warning:", error);
          }
        });

      // courses 테이블에 코스 생성
      // owner_id는 profiles.user_id를 참조하므로 user.id를 사용
      const { data: course, error } = await supabase
        .from("courses")
        .insert({
          owner_id: user.id, // profiles.user_id와 동일한 값 (auth.users.id)
          title: formData.title,
          description: formData.description || null,
          level: formData.level || null,
          target_audience: formData.target_audience || null,
          total_duration: formData.total_duration || null,
          status: "draft",
        })
        .select()
        .single();

      if (error) throw error;

      toast.success("코스가 성공적으로 생성되었습니다.");
      navigate(`/courses/${course.id}/builder`);
    } catch (error) {
      console.error("Error creating course:", error);
      toast.error("코스 생성 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8 md:py-12 max-w-2xl">
        <Button
          variant="ghost"
          className="mb-6"
          onClick={() => navigate("/courses")}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          코스 목록으로 돌아가기
        </Button>

        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">새 코스 생성</h1>
          <p className="text-muted-foreground">
            교육 과정의 기본 정보를 입력하세요.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>코스 정보</CardTitle>
            <CardDescription>
              코스의 제목, 설명, 난이도 등을 설정하세요.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title">
                  코스 제목 <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="예: 신입사원 오리엔테이션 4주 과정"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">설명</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="코스에 대한 간단한 설명을 입력하세요."
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="level">난이도</Label>
                <Select
                  value={formData.level}
                  onValueChange={(value) => setFormData({ ...formData, level: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="난이도를 선택하세요" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beginner">초급 (Beginner)</SelectItem>
                    <SelectItem value="intermediate">중급 (Intermediate)</SelectItem>
                    <SelectItem value="advanced">고급 (Advanced)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="target_audience">타겟 학습자</Label>
                <Input
                  id="target_audience"
                  value={formData.target_audience}
                  onChange={(e) => setFormData({ ...formData, target_audience: e.target.value })}
                  placeholder="예: 신입 개발자, 경력 3년 이상 개발자"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="total_duration">총 기간</Label>
                <Input
                  id="total_duration"
                  value={formData.total_duration}
                  onChange={(e) => setFormData({ ...formData, total_duration: e.target.value })}
                  placeholder="예: 4주, 16시간"
                />
              </div>

              <div className="flex gap-4 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/courses")}
                  className="flex-1"
                >
                  취소
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                  className="flex-1"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      생성 중...
                    </>
                  ) : (
                    "코스 생성"
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default CourseCreatePage;


