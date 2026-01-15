/**
 * Dashboard 페이지
 * 
 * 수정일: 2025-12-31
 * 수정 내용: Azure 인증 전환으로 Supabase 연결 불가, 에러 조용히 처리
 * 
 * TODO: Azure Functions API로 프로젝트/코스 목록 가져오기
 */

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
// import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { DashboardStats } from "@/components/DashboardStats";
import { Plus, Loader2, Trash2, FileText, Zap, Brain, BookOpen } from "lucide-react";
import { toast } from "sonner";
// import { Tables } from "@/integrations/supabase/types";

// Supabase 타입 대신 직접 정의
type Project = {
  id: string;
  title: string;
  description?: string;
  status: string;
  ai_model: string;
  education_course?: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  is_converted_to_course?: boolean;
  cover_image_url?: string;
};

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

const Dashboard = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [deletingProjectId, setDeletingProjectId] = useState<string | null>(null);
  const [deletingCourseId, setDeletingCourseId] = useState<string | null>(null);
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null);
  const [courseToDelete, setCourseToDelete] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;
    
    // 프로젝트 목록 가져오기
    const fetchProjects = async () => {
      try {
        setLoadingProjects(true);
        
        const { callAzureFunctionDirect } = await import('@/lib/azureFunctions');
        const { data, error } = await callAzureFunctionDirect<{ success: boolean; projects: Project[] }>('/api/getprojects', 'GET');
        
        if (error) throw error;
        if (data?.success && data.projects) {
          setProjects(data.projects);
        } else {
          setProjects([]);
        }
      } catch (error) {
        console.error('[Dashboard] Failed to fetch projects:', error);
        setProjects([]);
      } finally {
        setLoadingProjects(false);
      }
    };

    // 코스 목록 가져오기
    const fetchCourses = async () => {
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
        console.error('[Dashboard] Failed to fetch courses:', error);
        setCourses([]);
      } finally {
        setLoadingCourses(false);
      }
    };

    fetchProjects();
    fetchCourses();
    
    // Supabase Realtime 구독 제거 (Azure 인증 전환으로 연결 불가)
    // TODO: Azure Functions WebSocket 또는 Polling으로 실시간 업데이트 구현
    // 
    // const projectsChannel = supabase
    //   .channel('projects-changes')
    //   .on(...)
    //   .subscribe();
    // 
    // const coursesChannel = supabase
    //   .channel('courses-changes')
    //   .on(...)
    //   .subscribe();
    // 
    // return () => {
    //   supabase.removeChannel(projectsChannel);
    //   supabase.removeChannel(coursesChannel);
    // };
  }, [user?.id]); // user?.id만 dependency로 사용하여 무한 루프 방지

  const confirmDeleteProject = async () => {
    if (!projectToDelete) return;

    try {
      setDeletingProjectId(projectToDelete);
      
      const { callAzureFunctionDirect } = await import('@/lib/azureFunctions');
      const { data, error } = await callAzureFunctionDirect<{ success: boolean; message?: string }>(
        `/api/deleteproject/${projectToDelete}`,
        'DELETE'
      );
      
      if (error) throw error;
      if (!data?.success) {
        throw new Error(data?.message || 'Failed to delete project');
      }
      
      // 로컬 상태 업데이트
      setProjects(projects.filter(project => project.id !== projectToDelete));
      toast.success("프로젝트가 성공적으로 삭제되었습니다.");
      setProjectToDelete(null);
    } catch (error) {
      console.error("Error deleting project:", error);
      toast.error("프로젝트 삭제 중 오류가 발생했습니다.");
    } finally {
      setDeletingProjectId(null);
    }
  };

  const confirmDeleteCourse = async () => {
    if (!courseToDelete) return;

    try {
      setDeletingCourseId(courseToDelete);
      
      const { callAzureFunctionDirect } = await import('@/lib/azureFunctions');
      const { data, error } = await callAzureFunctionDirect<{ success: boolean; message?: string }>(
        `/api/deletecourse/${courseToDelete}`,
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
      setDeletingCourseId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-success text-success-foreground">완료</Badge>;
      case "processing":
        return <Badge className="bg-primary text-primary-foreground">처리 중</Badge>;
      case "failed":
        return <Badge variant="destructive">실패</Badge>;
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
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">안녕하세요!</h1>
          <p className="text-muted-foreground">
            AI 기반 교육 자료 생성 서비스에 오신 것을 환영합니다.
          </p>
        </div>

        <Tabs defaultValue="projects" className="mb-8">
          <TabsList>
            <TabsTrigger value="projects">내 프로젝트</TabsTrigger>
            <TabsTrigger value="courses">내 코스</TabsTrigger>
            <TabsTrigger value="stats">통계</TabsTrigger>
          </TabsList>
          
          <TabsContent value="projects" className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Card className="border-dashed cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => navigate("/project/create")}>
                <CardHeader>
                  <div className="flex items-center justify-center h-12 w-12 rounded-full bg-primary/10 mb-4">
                    <Plus className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle>새 프로젝트 생성</CardTitle>
                  <CardDescription>
                    AI로 단일 교육 자료를 빠르게 만들어보세요.
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center justify-center h-12 w-12 rounded-full bg-blue-500/10 mb-4">
                    <FileText className="h-6 w-6 text-blue-500" />
                  </div>
                  <CardTitle>자동화된 생성</CardTitle>
                  <CardDescription>
                    문서를 업로드하면 자동으로 교육 자료가 만들어집니다.
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center justify-center h-12 w-12 rounded-full bg-purple-500/10 mb-4">
                    <Brain className="h-6 w-6 text-purple-500" />
                  </div>
                  <CardTitle>AI 기반 분석</CardTitle>
                  <CardDescription>
                    최신 AI 모델로 분석하고 최적화합니다.
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>

            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold">내 프로젝트</h2>
              </div>
              
              {loadingProjects ? (
                <div className="flex justify-center items-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : projects.length === 0 ? (
                <Card>
                  <CardContent className="py-12">
                    <div className="text-center">
                      <Zap className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">아직 프로젝트가 없습니다</h3>
                      <p className="text-muted-foreground mb-4">
                        새 프로젝트를 생성해 AI 기반 교육 자료를 만들어보세요.
                      </p>
                      <Button onClick={() => navigate("/project/create")}>
                        <Plus className="h-4 w-4 mr-2" />
                        새 프로젝트 생성
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {projects.map((project) => (
                    <Card key={project.id} className="hover:shadow-lg transition-shadow overflow-hidden">
                      {project.cover_image_url && (
                        <div className="w-full h-40 bg-gradient-to-br from-blue-50 to-purple-50 overflow-hidden">
                          <img
                            src={project.cover_image_url}
                            alt={`${project.title} 커버`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="line-clamp-1">{project.title}</CardTitle>
                            <CardDescription className="line-clamp-2 mt-2">
                              {project.description || "설명이 없습니다"}
                            </CardDescription>
                          </div>
                          {getStatusBadge(project.status)}
                        </div>
                        <div className="flex flex-wrap gap-2 mt-4">
                          <Badge variant="outline">{project.ai_model}</Badge>
                          {project.education_course && (
                            <Badge variant="secondary">{project.education_course}</Badge>
                          )}
                          {project.is_converted_to_course && (
                            <Badge className="bg-green-500/10 text-green-600 hover:bg-green-500/20">
                              <BookOpen className="h-3 w-3 mr-1" />
                              코스로 변환됨
                            </Badge>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">
                            {new Date(project.created_at).toLocaleDateString("ko-KR")}
                          </span>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setProjectToDelete(project.id)}
                              disabled={deletingProjectId === project.id}
                            >
                              {deletingProjectId === project.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => navigate(`/project/${project.id}/studio`)}
                            >
                              보기
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="courses" className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Card className="border-dashed cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => navigate("/courses/create")}>
                <CardHeader>
                  <div className="flex items-center justify-center h-12 w-12 rounded-full bg-blue-500/10 mb-4">
                    <Plus className="h-6 w-6 text-blue-500" />
                  </div>
                  <CardTitle>새 코스 생성</CardTitle>
                  <CardDescription>
                    여러 레슨으로 구성된 교육 과정을 만들어보세요.
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center justify-center h-12 w-12 rounded-full bg-green-500/10 mb-4">
                    <BookOpen className="h-6 w-6 text-green-500" />
                  </div>
                  <CardTitle>체계적인 커리큘럼</CardTitle>
                  <CardDescription>
                    모듈과 레슨으로 구성된 체계적인 교육 과정을 설계하세요.
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center justify-center h-12 w-12 rounded-full bg-orange-500/10 mb-4">
                    <Brain className="h-6 w-6 text-orange-500" />
                  </div>
                  <CardTitle>레슨별 AI 생성</CardTitle>
                  <CardDescription>
                    각 레슨마다 AI로 콘텐츠를 자동 생성할 수 있습니다.
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>

            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold">내 코스</h2>
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
                        새 코스를 생성해 체계적인 교육 과정을 만들어보세요.
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
                          {course.status === "published" ? (
                            <Badge className="bg-success text-success-foreground">발행됨</Badge>
                          ) : course.status === "in_review" ? (
                            <Badge className="bg-primary text-primary-foreground">검토 중</Badge>
                          ) : (
                            <Badge variant="outline">초안</Badge>
                          )}
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
                          <div className="flex gap-2 flex-wrap">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/courses/${course.id}/detail`);
                              }}
                            >
                              보기
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
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setCourseToDelete(course.id);
                              }}
                              disabled={deletingCourseId === course.id}
                            >
                              {deletingCourseId === course.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="stats">
            <DashboardStats userId={user.id} />
          </TabsContent>
        </Tabs>
      </main>

      <AlertDialog open={!!projectToDelete} onOpenChange={(open) => !open && setProjectToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>정말 삭제하시겠습니까?</AlertDialogTitle>
            <AlertDialogDescription>
              이 프로젝트를 삭제하면 되돌릴 수 없습니다. 프로젝트와 관련된 모든 데이터가 영구적으로 삭제됩니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>아니오</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteProject}>예</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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

export default Dashboard;
