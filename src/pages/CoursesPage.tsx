/**
 * Courses 페이지
 *
 * 프로젝트 대시보드와 동일한 카드 UI 스타일 적용
 */

import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
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
import { Plus, Loader2, BookOpen, Trash2, Clock } from "lucide-react";
import { toast } from "sonner";

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

const COURSE_GRADIENTS = [
  ['#0ea5e9', '#6366f1'],
  ['#8b5cf6', '#d946ef'],
  ['#10b981', '#059669'],
  ['#f59e0b', '#ea580c'],
  ['#06b6d4', '#0284c7'],
  ['#a855f7', '#7c3aed'],
];
const COURSE_ICONS = ['📖', '🎓', '📝', '🧪', '💡', '🔧'];

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
      const { data, error } = await callAzureFunctionDirect<{ success: boolean; courses: Course[] }>('/api/getcourses', 'GET');

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
    }
  }, [fetchCourses, user]);

  const confirmDeleteCourse = async () => {
    if (!courseToDelete) return;

    try {
      setDeletingId(courseToDelete);

      const { callAzureFunctionDirect } = await import('@/lib/azureFunctions');
      const { data, error } = await callAzureFunctionDirect<{ success: boolean; message?: string }>(
        `/api/deletecourse/${courseToDelete}`,
        'DELETE'
      );

      if (error) throw error;
      if (!data?.success) {
        throw new Error(data?.message || 'Failed to delete course');
      }

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
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {courses.map((course) => {
              const idx = course.title.length % COURSE_GRADIENTS.length;
              const gradient = COURSE_GRADIENTS[idx];
              const icon = COURSE_ICONS[idx];

              return (
                <Card
                  key={course.id}
                  className="group hover:shadow-xl transition-all duration-300 overflow-hidden cursor-pointer border-border/50"
                  onClick={() => navigate(`/courses/${course.id}/builder`)}
                >
                  {/* Icon + Gradient Banner */}
                  <div
                    className="w-full h-44 overflow-hidden relative flex items-center justify-center"
                    style={{ background: `linear-gradient(135deg, ${gradient[0]}, ${gradient[1]})` }}
                  >
                    <div className="text-center text-white/90">
                      <span className="text-6xl block mb-1 drop-shadow-lg group-hover:scale-110 transition-transform duration-300">{icon}</span>
                      <p className="text-sm font-medium opacity-70">{course.level || '코스'}</p>
                    </div>
                    <div className="absolute top-3 right-3">
                      {getStatusBadge(course.status)}
                    </div>
                  </div>

                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg line-clamp-1 group-hover:text-primary transition-colors">
                      {course.title}
                    </CardTitle>
                    <CardDescription className="line-clamp-2 mt-1">
                      {course.description || "설명이 없습니다"}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="pt-0">
                    {/* Tags */}
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {course.level && (
                        <Badge variant="outline" className="text-xs">{course.level}</Badge>
                      )}
                      {course.total_duration && (
                        <Badge variant="secondary" className="text-xs">{course.total_duration}</Badge>
                      )}
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between pt-2 border-t border-border/50">
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {new Date(course.created_at).toLocaleDateString("ko-KR")}
                      </span>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            setCourseToDelete(course.id);
                          }}
                          disabled={deletingId === course.id}
                        >
                          {deletingId === course.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                        </Button>
                        <Button
                          variant="default"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/courses/${course.id}/builder`);
                          }}
                        >
                          빌더
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
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
