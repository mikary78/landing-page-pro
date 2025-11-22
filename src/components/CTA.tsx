import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

const CTA = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleStartClick = () => {
    if (user) {
      navigate('/dashboard');
    } else {
      navigate('/auth');
    }
  };

  return (
    <section className="py-20 md:py-32 bg-gradient-primary">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto text-center space-y-8 text-primary-foreground">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-2 text-sm font-medium backdrop-blur-sm">
            <Sparkles className="h-4 w-4" />
            지금 바로 시작하세요
          </div>
          
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl lg:text-6xl">
            교육 콘텐츠 제작의
            <span className="block">새로운 표준을 경험하세요</span>
          </h2>
          
          <p className="text-lg md:text-xl text-primary-foreground/90 max-w-2xl mx-auto">
            브리프 입력부터 배포까지 36시간. 설문 수집부터 자동 개선까지. 
            모든 것이 하나의 플랫폼에서 자동으로 진행됩니다.
          </p>
          
          <div className="flex flex-col gap-4 sm:flex-row sm:gap-6 justify-center pt-4">
            <Button 
              size="xl" 
              variant="secondary"
              className="group shadow-2xl hover:shadow-3xl"
              onClick={handleStartClick}
            >
              무료로 시작하기
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Button>
            <Button 
              size="xl" 
              variant="outline"
              className="bg-white/10 border-white/30 text-white hover:bg-white/20 backdrop-blur-sm"
            >
              영업팀 문의
            </Button>
          </div>
          
          <div className="pt-8 flex flex-wrap justify-center gap-8 text-sm text-primary-foreground/80">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-success"></div>
              신용카드 불필요
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-success"></div>
              5분 내 설정 완료
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-success"></div>
              즉시 생성 가능
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTA;
