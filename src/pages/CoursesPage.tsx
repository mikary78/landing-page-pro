/**
 * Courses 페이지
 * 
 * 수정일: 2025-12-31
 * 수정 내용: Azure 인증 전환으로 Supabase 연결 불가, 에러 조용히 처리
 * 
 * TODO: Azure Functions API로 코스 목록 가져오기
 */

import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
// import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import Header from "@/components/Header";
import { Plus, Loader2, BookOpen, Trash2 } from "lucide-react";
import { toast } from "sonner";
// import { Tables } from "@/integrations/supabase/types";

// Supabase 타입 대신 직접 정의
type Course = {
  id: string;
  title: string;
  description?: string;
  status: string;
  level?: string;
  total_duration?: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
};

const CoursesPage = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [courseToDelete, setCourseToDelete] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  const fetchCourses = useCallback(async () => {
    if (!user) return;
    
    try {
      setLoadingCourses(true);
      
      const { callAzureFunctionDirect } = await import('@/lib/azureFunctions');
      const { data, error } = await callAzureFunctionDirect<{ success: boolean; courses: Course[] }>('/api/getCourses', 'GET');
      
      if (error) throw error;
      if (data?.success && data.courses) {
        setCourses(data.courses);
      } else {
        setCourses([]);
      }
    } catch (error) {
      console.error('[CoursesPage] Failed to fetch courses:', error);
      setCourses([]);
    } finally {
      setLoadingCourses(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchCourses();

      // Supabase Realtime 구독 제거 (Azure 인증 전환으로 연결 불가)
      // TODO: Azure Functions WebSocket 또는 Polling으로 실시간 업데이트 구현
      // 
      // const channel = supabase
      //   .channel('courses-changes')
      //   .on(...)
      //   .subscribe();
      // 
      // return () => {
      //   supabase.removeChannel(channel);
      // };
    }
  }, [fetchCourses, user]);

  const confirmDeleteCourse = async () => {
    if (!courseToDelete) return;

    try {
      setDeletingId(courseToDelete);
      
      const { callAzureFunctionDirect } = await import('@/lib/azureFunctions');
      const { data, error } = await callAzureFunctionDirect<{ success: boolean; message?: string }>(
        `/api/deleteCourse/${courseToDelete}`,
        'DELETE'
      );
      
      if (error) throw error;
      if (!data?.success) {
        throw new Error(data?.message || 'Failed to delete course');
      }
      
      // 로컬 상태 업데이트
      setCourses(courses.filter(course => course.id !== courseToDelete));
      toast.success("코스가 성공적으로 삭제되었습니다.");
      setCourseToDelete(null);
    } catch (error) {
      console.error("Error deleting course:", error);
      toast.error("코스 삭제 중 오류가 발생했습니다.");
    } finally {
      setDeletingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "published":
        return <Badge className="bg-success text-success-foreground">발행됨</Badge>;
      case "in_review":
        return <Badge className="bg-primary text-primary-foreground">검토 중</Badge>;
      case "draft":
        return <Badge variant="outline">초안</Badge>;
      case "archived":
        return <Badge variant="secondary">보관됨</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
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
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2">내 코스</h1>
            <p className="text-muted-foreground">
              교육 과정을 만들고 관리하세요.
            </p>
          </div>
          <Button onClick={() => navigate("/courses/create")}>
            <Plus className="h-4 w-4 mr-2" />
            새 코스 생성
          </Button>
        </div>

        {loadingCourses ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : courses.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">아직 코스가 없습니다</h3>
                <p className="text-muted-foreground mb-4">
                  새 코스를 생성해 교육 과정을 만들어보세요.
                </p>
                <Button onClick={() => navigate("/courses/create")}>
                  <Plus className="h-4 w-4 mr-2" />
                  새 코스 생성
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {courses.map((course) => (
              <Card 
                key={course.id} 
                className="hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => navigate(`/courses/${course.id}/builder`)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="line-clamp-1">{course.title}</CardTitle>
                      <CardDescription className="line-clamp-2 mt-2">
                        {course.description || "설명이 없습니다"}
                      </CardDescription>
                    </div>
                    {getStatusBadge(course.status)}
                  </div>
                  <div className="flex flex-wrap gap-2 mt-4">
                    {course.level && (
                      <Badge variant="outline">{course.level}</Badge>
                    )}
                    {course.total_duration && (
                      <Badge variant="secondary">{course.total_duration}</Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      {new Date(course.created_at).toLocaleDateString("ko-KR")}
                    </span>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setCourseToDelete(course.id);
                        }}
                        disabled={deletingId === course.id}
                      >
                        {deletingId === course.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/courses/${course.id}/builder`);
                        }}
                      >
                        빌더 열기
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      <AlertDialog open={!!courseToDelete} onOpenChange={(open) => !open && setCourseToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>정말 삭제하시겠습니까?</AlertDialogTitle>
            <AlertDialogDescription>
              이 코스를 삭제하면 되돌릴 수 없습니다. 코스와 관련된 모든 데이터가 영구적으로 삭제됩니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>아니오</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteCourse}>예</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CoursesPage;













