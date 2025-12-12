import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Header from "@/components/Header";
import { Plus, Loader2, BookOpen } from "lucide-react";
import { toast } from "sonner";
import { Tables } from "@/integrations/supabase/types";

type Course = Tables<"courses">;

const CoursesPage = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  const fetchCourses = useCallback(async () => {
    if (!user) return;
    
    try {
      setLoadingCourses(true);
      const { data, error } = await supabase
        .from("courses")
        .select("*")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setCourses(data || []);
    } catch (error) {
      console.error("Error fetching courses:", error);
      toast.error("코스 목록을 불러오는 중 오류가 발생했습니다.");
    } finally {
      setLoadingCourses(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchCourses();
      
      const channel = supabase
        .channel('courses-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'courses',
            filter: `owner_id=eq.${user.id}`,
          },
          () => {
            fetchCourses();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [fetchCourses, user]);

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
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default CoursesPage;





