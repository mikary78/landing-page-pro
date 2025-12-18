import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, BookOpen, Sparkles, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

const ProjectVsCourse = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleNavigate = (path: string) => {
    if (user) {
      navigate(path);
    } else {
      navigate('/auth');
    }
  };

  return (
    <section className="py-20 md:py-32 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16 space-y-4">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
            프로젝트와 코스, 어떻게 시작할까요?
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            단일 콘텐츠를 빠르게 만들고 싶다면 프로젝트, 체계적인 교육 과정을 만들고 싶다면 코스를 선택하세요.
          </p>
        </div>
        
        <div className="grid gap-8 md:grid-cols-2 max-w-5xl mx-auto">
          {/* 프로젝트 카드 */}
          <Card className="p-6 hover:shadow-lg transition-all duration-300 border-2 hover:border-primary/20">
            <div className="inline-flex p-3 rounded-lg bg-primary/10 mb-4">
              <FileText className="h-6 w-6 text-primary" />
            </div>
            <CardHeader className="px-0 pt-0">
              <CardTitle className="text-2xl mb-2">프로젝트 생성</CardTitle>
              <CardDescription className="text-base">
                단일 교육 콘텐츠를 빠르게 생성하고 싶을 때
              </CardDescription>
            </CardHeader>
            <CardContent className="px-0 space-y-4">
              <ul className="space-y-2 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>브리프 입력 후 6단계 자동 생성</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>기획 → 시나리오 → 이미지 → 음성/영상 → 조립 → 배포</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>단일 세션 또는 특정 주제의 콘텐츠 제작에 적합</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>빠른 프로토타이핑과 테스트에 최적화</span>
                </li>
              </ul>
              <Button 
                className="w-full mt-6" 
                onClick={() => handleNavigate('/project/create')}
              >
                <Sparkles className="h-4 w-4 mr-2" />
                프로젝트 생성하기
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </CardContent>
          </Card>

          {/* 코스 카드 */}
          <Card className="p-6 hover:shadow-lg transition-all duration-300 border-2 hover:border-accent/20">
            <div className="inline-flex p-3 rounded-lg bg-accent/10 mb-4">
              <BookOpen className="h-6 w-6 text-accent" />
            </div>
            <CardHeader className="px-0 pt-0">
              <CardTitle className="text-2xl mb-2">코스 생성</CardTitle>
              <CardDescription className="text-base">
                체계적인 교육 과정을 만들고 관리하고 싶을 때
              </CardDescription>
            </CardHeader>
            <CardContent className="px-0 space-y-4">
              <ul className="space-y-2 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-accent mt-1">•</span>
                  <span>모듈과 레슨으로 구성된 커리큘럼 관리</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-accent mt-1">•</span>
                  <span>각 레슨별로 AI 콘텐츠 자동 생성</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-accent mt-1">•</span>
                  <span>여러 주차/단원으로 구성된 전체 과정 제작</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-accent mt-1">•</span>
                  <span>Coursera 스타일의 코스 빌더 제공</span>
                </li>
              </ul>
              <Button 
                className="w-full mt-6" 
                variant="outline"
                onClick={() => handleNavigate('/courses/create')}
              >
                <Sparkles className="h-4 w-4 mr-2" />
                코스 생성하기
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="mt-12 text-center">
          <p className="text-sm text-muted-foreground mb-4">
            이미 계정이 있으신가요?
          </p>
          <Button 
            variant="link"
            onClick={() => handleNavigate('/dashboard')}
          >
            대시보드에서 둘 다 확인하기 →
          </Button>
        </div>
      </div>
    </section>
  );
};

export default ProjectVsCourse;









