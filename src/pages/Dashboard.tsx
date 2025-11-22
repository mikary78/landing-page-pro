import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, FileText, Rocket, Zap, CheckCircle2 } from "lucide-react";

const Dashboard = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">로딩 중...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8 md:py-12">
        <div className="mb-8 md:mb-12">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">
            환영합니다, {user.email?.split('@')[0]}님
          </h1>
          <p className="text-muted-foreground">
            MVP/PRD 문서를 업로드하고 교육 콘텐츠를 자동으로 생성해보세요.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
          <Card className="border-2 border-primary/20 hover:border-primary/40 transition-colors cursor-pointer group">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="p-3 rounded-lg bg-gradient-primary">
                  <Plus className="h-6 w-6 text-primary-foreground" />
                </div>
                <Zap className="h-5 w-5 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <CardTitle className="mt-4">새 프로젝트 생성</CardTitle>
              <CardDescription>
                MVP/PRD 문서를 업로드하여 새로운 교육 콘텐츠를 생성합니다
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                className="w-full" 
                size="lg"
                onClick={() => navigate('/project/create')}
              >
                <Plus className="h-4 w-4 mr-2" />
                프로젝트 시작
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="p-3 rounded-lg bg-accent/10 w-fit">
                <FileText className="h-6 w-6 text-accent" />
              </div>
              <CardTitle className="mt-4">6단계 자동 생성</CardTitle>
              <CardDescription>
                브리프부터 배포까지 36시간 안에 완료
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  콘텐츠 기획
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  시나리오 작성
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  이미지 생성
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="p-3 rounded-lg bg-success/10 w-fit">
                <Rocket className="h-6 w-6 text-success" />
              </div>
              <CardTitle className="mt-4">빠른 시작</CardTitle>
              <CardDescription>
                5분 내 설정으로 즉시 생성 가능
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">시간 단축</span>
                  <span className="font-semibold text-primary">36시간</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">NPS 개선</span>
                  <span className="font-semibold text-success">+15점</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>진행 중인 프로젝트</CardTitle>
            <CardDescription>
              생성 중이거나 완료된 프로젝트를 확인하세요
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>아직 프로젝트가 없습니다</p>
              <p className="text-sm mt-2">새 프로젝트를 생성하여 시작해보세요</p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Dashboard;
