/**
 * CurriculumTreePane 컴포넌트
 * 
 * 수정일: 2026-01-02
 * 수정 내용: Supabase → Azure Functions API 마이그레이션
 */

import { useCallback, useEffect, useState } from "react";
import { callAzureFunctionDirect } from "@/lib/azureFunctions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Plus, Loader2, BookOpen, FileText, Edit2, Check, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

// 타입 정의 (Supabase 타입 대신 직접 정의)
interface CourseModule {
  id: string;
  course_id: string;
  title: string;
  description?: string;
  order_index: number;
  created_at: string;
  updated_at: string;
}

interface Lesson {
  id: string;
  module_id: string;
  title: string;
  learning_objectives?: string;
  project_id?: string;
  order_index: number;
  selected_ai_model?: string;
  created_at: string;
  updated_at: string;
}

interface ModuleWithLessons extends CourseModule {
  lessons: Lesson[];
}

interface CurriculumTreePaneProps {
  courseId: string;
  selectedLessonId: string | null;
  onLessonSelect: (lessonId: string | null) => void;
}

const CurriculumTreePane = ({
  courseId,
  selectedLessonId,
  onLessonSelect,
}: CurriculumTreePaneProps) => {
  const [modules, setModules] = useState<ModuleWithLessons[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingModuleId, setEditingModuleId] = useState<string | null>(null);
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null);
  const [editModuleTitle, setEditModuleTitle] = useState("");
  const [editLessonTitle, setEditLessonTitle] = useState("");

  const fetchModules = useCallback(async () => {
    try {
      setLoading(true);
      
      // Azure Functions API로 모듈+레슨 조회
      const { data, error } = await callAzureFunctionDirect<{ 
        success: boolean; 
        modules: ModuleWithLessons[] 
      }>(`/api/getmodules/${courseId}`, 'GET');

      if (error) throw error;
      
      if (data?.success && data.modules) {
        setModules(data.modules);
      } else {
        setModules([]);
      }
    } catch (error) {
      console.error("Error fetching modules:", error);
      toast.error("커리큘럼을 불러오는 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    fetchModules();
  }, [fetchModules]);

  const handleAddModule = async () => {
    try {
      const { data, error } = await callAzureFunctionDirect<{ 
        success: boolean; 
        module: ModuleWithLessons 
      }>('/api/createmodule', 'POST', { courseId });

      if (error) throw error;
      
      if (!data?.success) {
        throw new Error('Failed to create module');
      }
      
      toast.success("모듈이 추가되었습니다.");
      fetchModules();
    } catch (error) {
      console.error("Error adding module:", error);
      toast.error("모듈 추가 중 오류가 발생했습니다.");
    }
  };

  const handleAddLesson = async (moduleId: string) => {
    try {
      const { data, error } = await callAzureFunctionDirect<{ 
        success: boolean; 
        lesson: Lesson 
      }>('/api/createlesson', 'POST', { moduleId });

      if (error) throw error;
      
      if (!data?.success) {
        throw new Error('Failed to create lesson');
      }
      
      toast.success("레슨이 추가되었습니다.");
      fetchModules();
    } catch (error) {
      console.error("Error adding lesson:", error);
      toast.error("레슨 추가 중 오류가 발생했습니다.");
    }
  };

  const handleSaveModuleTitle = async (moduleId: string) => {
    if (!editModuleTitle.trim()) {
      toast.error("모듈 제목을 입력해주세요.");
      return;
    }

    try {
      const { data, error } = await callAzureFunctionDirect<{ 
        success: boolean; 
        module: CourseModule 
      }>(`/api/updatemodule/${moduleId}`, 'PUT', { title: editModuleTitle.trim() });

      if (error) throw error;
      
      if (!data?.success) {
        throw new Error('Failed to update module');
      }
      
      toast.success("모듈 제목이 수정되었습니다.");
      setEditingModuleId(null);
      setEditModuleTitle("");
      fetchModules();
    } catch (error) {
      console.error("Error updating module title:", error);
      toast.error("모듈 제목 수정 중 오류가 발생했습니다.");
    }
  };

  const handleSaveLessonTitle = async (lessonId: string) => {
    if (!editLessonTitle.trim()) {
      toast.error("레슨 제목을 입력해주세요.");
      return;
    }

    try {
      const { data, error } = await callAzureFunctionDirect<{ 
        success: boolean; 
        lesson: Lesson 
      }>(`/api/updatelesson/${lessonId}`, 'PUT', { title: editLessonTitle.trim() });

      if (error) throw error;
      
      if (!data?.success) {
        throw new Error('Failed to update lesson');
      }
      
      toast.success("레슨 제목이 수정되었습니다.");
      setEditingLessonId(null);
      setEditLessonTitle("");
      fetchModules();
    } catch (error) {
      console.error("Error updating lesson title:", error);
      toast.error("레슨 제목 수정 중 오류가 발생했습니다.");
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>커리큘럼</CardTitle>
          <Button size="sm" onClick={handleAddModule}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {modules.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>모듈이 없습니다</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={handleAddModule}
            >
              첫 모듈 추가
            </Button>
          </div>
        ) : (
          <Accordion type="multiple" className="w-full">
            {modules.map((module) => (
              <AccordionItem key={module.id} value={module.id}>
                <div className="flex items-center">
                  <AccordionTrigger className="flex-1">
                    <div className="flex items-center gap-2 flex-1">
                      {editingModuleId === module.id ? (
                        <div className="flex items-center gap-2 flex-1" onClick={(e) => e.stopPropagation()}>
                          <Input
                            value={editModuleTitle}
                            onChange={(e) => setEditModuleTitle(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleSaveModuleTitle(module.id);
                              } else if (e.key === 'Escape') {
                                setEditingModuleId(null);
                                setEditModuleTitle("");
                              }
                            }}
                            className="h-7 text-sm"
                            autoFocus
                          />
                          <div
                            className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-8 w-8 p-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSaveModuleTitle(module.id);
                            }}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                e.stopPropagation();
                                handleSaveModuleTitle(module.id);
                              }
                            }}
                          >
                            <Check className="h-3 w-3" />
                          </div>
                          <div
                            className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-8 w-8 p-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingModuleId(null);
                              setEditModuleTitle("");
                            }}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                e.stopPropagation();
                                setEditingModuleId(null);
                                setEditModuleTitle("");
                              }
                            }}
                          >
                            <X className="h-3 w-3" />
                          </div>
                        </div>
                      ) : (
                        <>
                          <span className="font-semibold">{module.title}</span>
                          <span className="text-xs text-muted-foreground">
                            ({module.lessons.length}개 레슨)
                          </span>
                        </>
                      )}
                    </div>
                  </AccordionTrigger>
                  {editingModuleId !== module.id && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="mr-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingModuleId(module.id);
                        setEditModuleTitle(module.title);
                      }}
                    >
                      <Edit2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
                <AccordionContent>
                  <div className="space-y-2 pl-4">
                    {module.lessons.map((lesson) => (
                      <div
                        key={lesson.id}
                        className={`flex items-center justify-between p-2 rounded-md transition-colors ${
                          selectedLessonId === lesson.id
                            ? "bg-primary/10 border border-primary"
                            : "hover:bg-accent"
                        }`}
                      >
                        {editingLessonId === lesson.id ? (
                          <div className="flex items-center gap-2 flex-1">
                            <Input
                              value={editLessonTitle}
                              onChange={(e) => setEditLessonTitle(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleSaveLessonTitle(lesson.id);
                                } else if (e.key === 'Escape') {
                                  setEditingLessonId(null);
                                  setEditLessonTitle("");
                                }
                              }}
                              className="h-7 text-sm"
                              autoFocus
                            />
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleSaveLessonTitle(lesson.id)}
                            >
                              <Check className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setEditingLessonId(null);
                                setEditLessonTitle("");
                              }}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : (
                          <>
                            <div 
                              className="flex items-center gap-2 flex-1 cursor-pointer"
                              onClick={() => onLessonSelect(lesson.id)}
                            >
                              <FileText className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm">{lesson.title}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              {lesson.project_id && (
                                <span className="text-xs text-muted-foreground">✓</span>
                              )}
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingLessonId(lesson.id);
                                  setEditLessonTitle(lesson.title);
                                }}
                              >
                                <Edit2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start"
                      onClick={() => handleAddLesson(module.id)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      레슨 추가
                    </Button>
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </CardContent>
    </Card>
  );
};

export default CurriculumTreePane;
