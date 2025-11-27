import { ArrowRight, BookOpen, FileText, Presentation, Code, ClipboardCheck, CheckCircle } from "lucide-react";
import { Card } from "@/components/ui/card";

const pipelineSteps = [
  {
    step: "1",
    title: "커리큘럼 설계",
    description: "학습 목표 & 구조 설계",
    icon: BookOpen,
    time: "~2분",
  },
  {
    step: "2",
    title: "수업안 작성",
    description: "세션별 상세 계획",
    icon: FileText,
    time: "~3분",
  },
  {
    step: "3",
    title: "슬라이드 구성",
    description: "프레젠테이션 구조화",
    icon: Presentation,
    time: "~3분",
  },
  {
    step: "4",
    title: "실습 템플릿",
    description: "실습 가이드 생성",
    icon: Code,
    time: "~2분",
  },
  {
    step: "5",
    title: "평가/퀴즈",
    description: "학습 평가 문항",
    icon: ClipboardCheck,
    time: "~2분",
  },
  {
    step: "6",
    title: "최종 검토",
    description: "품질 검토 & 완성",
    icon: CheckCircle,
    time: "~1분",
  },
];

const Pipeline = () => {
  return (
    <section className="py-20 md:py-32 bg-secondary/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16 space-y-4">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
            6단계 자동 생성 파이프라인
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            브리프만 입력하면 커리큘럼, 수업안, 슬라이드, 실습 템플릿까지 자동 생성
          </p>
        </div>

        <div className="relative max-w-6xl mx-auto">
          {/* Desktop: Horizontal layout */}
          <div className="hidden lg:block">
            <div className="flex items-center justify-between mb-8">
              {pipelineSteps.map((step, index) => {
                const Icon = step.icon;
                return (
                  <div key={index} className="flex items-center flex-1">
                    <Card className="w-full p-6 text-center hover:shadow-lg transition-all duration-300 hover:scale-105 animate-fade-in" style={{ animationDelay: `${index * 0.1}s` }}>
                      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gradient-primary text-primary-foreground mb-3">
                        <Icon className="h-5 w-5" />
                      </div>
                      <h3 className="font-semibold mb-1 text-sm">{step.title}</h3>
                      <p className="text-xs text-muted-foreground mb-2">{step.description}</p>
                      <span className="text-xs text-primary font-medium">{step.time}</span>
                    </Card>
                    {index < pipelineSteps.length - 1 && (
                      <ArrowRight className="h-6 w-6 text-primary mx-2 flex-shrink-0" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Mobile: Vertical layout */}
          <div className="lg:hidden space-y-4">
            {pipelineSteps.map((step, index) => {
              const Icon = step.icon;
              return (
                <div key={index} className="animate-fade-in" style={{ animationDelay: `${index * 0.1}s` }}>
                  <Card className="p-6 hover:shadow-lg transition-all duration-300">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 inline-flex items-center justify-center w-12 h-12 rounded-full bg-gradient-primary text-primary-foreground">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold mb-1">{step.title}</h3>
                        <p className="text-sm text-muted-foreground">{step.description}</p>
                      </div>
                      <span className="text-sm text-primary font-medium">{step.time}</span>
                    </div>
                  </Card>
                  {index < pipelineSteps.length - 1 && (
                    <div className="flex justify-center py-2">
                      <ArrowRight className="h-6 w-6 text-primary rotate-90" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-12 text-center">
            <p className="text-sm text-muted-foreground">
              ⚡ 총 예상 생성 시간: <span className="font-semibold text-primary">약 13분</span> | 각 단계에서 피드백 반영 및 재생성 가능
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Pipeline;
