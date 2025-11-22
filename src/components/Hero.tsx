import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import heroIllustration from "@/assets/hero-illustration.jpg";

const Hero = () => {
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
    <section className="relative overflow-hidden bg-gradient-hero py-20 md:py-32">
      <div className="container mx-auto px-4">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 items-center">
          <div className="space-y-8 animate-fade-in">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
              <Sparkles className="h-4 w-4" />
              교육콘텐츠 자동 생성 플랫폼
            </div>
            
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
              브리프부터 배포까지
              <span className="block bg-gradient-primary bg-clip-text text-transparent">
                36시간으로 단축
              </span>
            </h1>
            
            <p className="text-lg text-muted-foreground md:text-xl max-w-2xl">
              기획 브리프만 입력하면 커리큘럼, 수업안, 슬라이드, 실습 템플릿까지 자동 생성. 
              리뷰부터 배포, 피드백 수집까지 하나의 플랫폼에서.
            </p>
            
            <div className="flex flex-col gap-4 sm:flex-row sm:gap-6">
              <Button 
                size="xl" 
                variant="hero" 
                className="group"
                onClick={handleStartClick}
              >
                무료로 시작하기
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Button>
              <Button size="xl" variant="outline">
                데모 보기
              </Button>
            </div>
            
            <div className="flex flex-wrap gap-8 pt-4">
              <div>
                <div className="text-3xl font-bold text-primary">70%↓</div>
                <div className="text-sm text-muted-foreground">리드타임 단축</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-accent">36시간</div>
                <div className="text-sm text-muted-foreground">브리프→배포</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-success">+20p</div>
                <div className="text-sm text-muted-foreground">NPS 향상</div>
              </div>
            </div>
          </div>
          
          <div className="relative lg:h-[600px] animate-fade-in" style={{ animationDelay: "0.2s" }}>
            <div className="relative h-full rounded-2xl overflow-hidden shadow-2xl">
              <img 
                src={heroIllustration} 
                alt="Autopilot 교육콘텐츠 자동 생성 플랫폼" 
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/20 to-transparent"></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
