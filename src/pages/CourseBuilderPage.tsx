/**
 * CourseBuilderPage
 * 
 * 수정일: 2025-12-31
 * 수정 내용: Supabase → Azure Functions API 마이그레이션
 */

import { useParams, useNavigate } from "react-router-dom";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { generateCurriculum, callAzureFunctionDirect } from "@/lib/azureFunctions";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, Sparkles } from "lucide-react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import CurriculumTreePane from "@/components/course/CurriculumTreePane";
import LessonDetailPane from "@/components/course/LessonDetailPane";

// Course 타입 정의 (Supabase 타입 대신)
type Course = {
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
};

const CourseBuilderPage = () => {
  const { id } = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [generatingCurriculum, setGeneratingCurriculum] = useState(false);
  const [selectedAiModel, setSelectedAiModel] = useState<string>("gemini");

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  const fetchCourse = useCallback(async () => {
    if (!id || !user) return;

    try {
      setLoading(true);
      
      // Azure Functions API로 코스 정보 가져오기
      const { data, error } = await callAzureFunctionDirect<{ success: boolean; course: Course }>(
        `/api/getcourse/${id}`,
        'GET'
      );

      if (error) throw error;
      if (!data?.success || !data.course) {
        throw new Error('Course not found');
      }
      
      setCourse(data.course);
    } catch (error) {
      console.error("Error fetching course:", error);
      toast.error("코스를 불러오는 중 오류가 발생했습니다.");
      navigate("/courses");
    } finally {
      setLoading(false);
    }
  }, [id, user, navigate]);

  useEffect(() => {
    if (user && id) {
      fetchCourse();
    }
  }, [fetchCourse, user, id]);

  const handleGenerateCurriculum = async () => {
    if (!course || !user) return;

    try {
      setGeneratingCurriculum(true);

      // 기존 모듈 확인 - 사용자에게 확인
      const confirmed = window.confirm(
        "AI로 커리큘럼을 생성하시겠습니까? 기존 모듈이 있다면 새로운 모듈이 추가됩니다."
      );
      if (!confirmed) {
        setGeneratingCurriculum(false);
        return;
      }

      toast.info("AI가 커리큘럼을 생성하고 있습니다...");

      // Azure Function 호출
      const { error: functionError, data: functionData } = await generateCurriculum({
        courseId: course.id,
        courseTitle: course.title,
        courseDescription: course.description || undefined,
        level: course.level || undefined,
        targetAudience: course.target_audience || undefined,
        totalDuration: course.total_duration || undefined,
        aiModel: selectedAiModel as 'gemini' | 'claude' | 'chatgpt',
      });

      if (functionError) {
        console.error("Curriculum generation error:", functionError);
        throw functionError;
      }

      if (functionData && !functionData.success) {
        throw new Error(functionData.message || "커리큘럼 생성에 실패했습니다.");
      }

      toast.success(
        `커리큘럼이 생성되었습니다. (모듈: ${functionData?.data?.modulesCreated || 0}개, 레슨: ${functionData?.data?.lessonsCreated || 0}개)`
      );

      // 커리큘럼 트리 새로고침을 위해 약간의 지연 후 페이지 새로고침
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      console.error("Error generating curriculum:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "커리큘럼 생성 중 오류가 발생했습니다."
      );
    } finally {
      setGeneratingCurriculum(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || !course) {
    return null;
  }

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      <Header />
      
      <main className="flex-1 overflow-y-auto">
        <div className="container mx-auto px-4 py-6">
          <div className="mb-6 flex items-center justify-between sticky top-0 bg-background z-10 pb-4 border-b">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                onClick={() => navigate("/courses")}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                코스 목록
              </Button>
              <div>
                <h1 className="text-2xl font-bold">{course.title}</h1>
                <p className="text-sm text-muted-foreground">
                  {course.description || "설명이 없습니다"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Select value={selectedAiModel} onValueChange={setSelectedAiModel}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gemini">Gemini</SelectItem>
                  <SelectItem value="claude">Claude</SelectItem>
                  <SelectItem value="chatgpt">ChatGPT</SelectItem>
                </SelectContent>
              </Select>
              <Button
                onClick={handleGenerateCurriculum}
                disabled={generatingCurriculum}
                variant="default"
              >
                {generatingCurriculum ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    생성 중...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    AI로 커리큘럼 생성
                  </>
                )}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 좌측: 커리큘럼 트리 */}
            <div className="lg:col-span-1">
              <CurriculumTreePane
                courseId={course.id}
                selectedLessonId={selectedLessonId}
                onLessonSelect={setSelectedLessonId}
              />
            </div>

            {/* 우측: 레슨 상세 */}
            <div className="lg:col-span-2">
              {selectedLessonId ? (
                <LessonDetailPane
                  lessonId={selectedLessonId}
                  courseId={course.id}
                />
              ) : (
                <div className="flex items-center justify-center h-96 border-2 border-dashed rounded-lg">
                  <div className="text-center">
                    <p className="text-muted-foreground mb-2">
                      좌측에서 레슨을 선택하세요
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default CourseBuilderPage;



