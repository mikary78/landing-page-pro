import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, 
  Brain, 
  CheckCircle2, 
  Sparkles, 
  Clock, 
  TrendingUp,
  ArrowRight,
  Play,
  Pause
} from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const stages = [
  {
    id: 1,
    name: "브리프 입력",
    icon: FileText,
    description: "MVP/PRD 문서 업로드",
    time: "1분",
    color: "from-primary/20 to-primary/10"
  },
  {
    id: 2,
    name: "AI 분석",
    icon: Brain,
    description: "문서 자동 분석 및 구조화",
    time: "5분",
    color: "from-accent/20 to-accent/10"
  },
  {
    id: 3,
    name: "콘텐츠 생성",
    icon: Sparkles,
    description: "교육 자료 자동 생성",
    time: "10분",
    color: "from-success/20 to-success/10"
  },
  {
    id: 4,
    name: "검토 및 수정",
    icon: CheckCircle2,
    description: "AI 추천 기반 최적화",
    time: "15분",
    color: "from-primary/20 to-primary/10"
  },
  {
    id: 5,
    name: "최종 승인",
    icon: TrendingUp,
    description: "품질 검증 완료",
    time: "3분",
    color: "from-accent/20 to-accent/10"
  },
  {
    id: 6,
    name: "배포 준비",
    icon: ArrowRight,
    description: "교육 콘텐츠 배포",
    time: "2분",
    color: "from-success/20 to-success/10"
  }
];

const Demo = () => {
  const [currentStage, setCurrentStage] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const handlePlay = () => {
    setIsPlaying(true);
    const interval = setInterval(() => {
      setCurrentStage((prev) => {
        if (prev >= stages.length - 1) {
          clearInterval(interval);
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, 2000);
  };

  const handleReset = () => {
    setCurrentStage(0);
    setIsPlaying(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Hero Section */}
      <section className="pt-32 pb-16 px-4">
        <div className="container mx-auto max-w-6xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Badge className="mb-4 text-sm px-4 py-2">
              <Sparkles className="w-4 h-4 mr-2" />
              라이브 데모
            </Badge>
            <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-primary via-accent to-success bg-clip-text text-transparent">
              36시간을 2시간으로
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              브리프부터 배포까지, 교육콘텐츠 자동 생성 과정을 직접 체험해보세요
            </p>
          </motion.div>
        </div>
      </section>

      {/* Interactive Pipeline Demo */}
      <section className="py-16 px-4 bg-gradient-to-b from-background to-muted/20">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">자동화 파이프라인 체험</h2>
            <div className="flex items-center justify-center gap-4 mb-8">
              <Button
                onClick={isPlaying ? handleReset : handlePlay}
                size="lg"
                className="gap-2"
              >
                {isPlaying ? (
                  <>
                    <Pause className="w-5 h-5" />
                    일시정지
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5" />
                    시작하기
                  </>
                )}
              </Button>
              <Button onClick={handleReset} variant="outline" size="lg">
                초기화
              </Button>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="relative mb-16">
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-primary via-accent to-success"
                initial={{ width: "0%" }}
                animate={{ 
                  width: `${((currentStage + 1) / stages.length) * 100}%` 
                }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>

          {/* Stages Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
            {stages.map((stage, index) => {
              const Icon = stage.icon;
              const isActive = index === currentStage;
              const isCompleted = index < currentStage;
              
              return (
                <motion.div
                  key={stage.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card
                    className={`relative overflow-hidden transition-all duration-500 cursor-pointer ${
                      isActive 
                        ? "ring-2 ring-primary shadow-lg shadow-primary/20 scale-105" 
                        : isCompleted 
                        ? "opacity-60" 
                        : "opacity-40"
                    }`}
                    onClick={() => !isPlaying && setCurrentStage(index)}
                  >
                    <div className={`absolute inset-0 bg-gradient-to-br ${stage.color} opacity-50`} />
                    
                    <div className="relative p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className={`p-3 rounded-lg ${
                          isActive ? "bg-primary/20" : "bg-muted"
                        }`}>
                          <Icon className={`w-6 h-6 ${
                            isActive ? "text-primary" : "text-muted-foreground"
                          }`} />
                        </div>
                        <Badge variant={isCompleted ? "default" : "outline"}>
                          <Clock className="w-3 h-3 mr-1" />
                          {stage.time}
                        </Badge>
                      </div>
                      
                      <h3 className="font-bold text-lg mb-2">{stage.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {stage.description}
                      </p>
                      
                      {isCompleted && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="absolute top-4 right-4"
                        >
                          <CheckCircle2 className="w-6 h-6 text-success" />
                        </motion.div>
                      )}
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </div>

          {/* Current Stage Detail */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStage}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="p-8 bg-gradient-to-br from-primary/5 to-accent/5">
                <div className="flex items-start gap-6">
                  <div className="p-4 rounded-xl bg-primary/10">
                    {(() => {
                      const Icon = stages[currentStage].icon;
                      return <Icon className="w-12 h-12 text-primary" />;
                    })()}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold mb-2">
                      {stages[currentStage].name}
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      {stages[currentStage].description}
                    </p>
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="w-4 h-4 text-primary" />
                      <span className="font-medium">
                        예상 소요시간: {stages[currentStage].time}
                      </span>
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          </AnimatePresence>
        </div>
      </section>

      {/* Results Comparison */}
      <section className="py-16 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">효과 비교</h2>
            <p className="text-muted-foreground">
              전통적인 방식과 Autopilot의 차이를 확인하세요
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Before */}
            <Card className="p-8 border-2 border-muted">
              <div className="text-center mb-6">
                <Badge variant="outline" className="mb-2">기존 방식</Badge>
                <h3 className="text-2xl font-bold text-muted-foreground">36시간</h3>
              </div>
              <ul className="space-y-4">
                {[
                  "수동 문서 분석 및 구조화",
                  "콘텐츠 기획 및 작성",
                  "여러 번의 검토 사이클",
                  "수동 포맷팅 및 편집",
                  "반복적인 피드백 반영"
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-muted-foreground">
                    <div className="w-2 h-2 rounded-full bg-muted-foreground mt-2" />
                    {item}
                  </li>
                ))}
              </ul>
            </Card>

            {/* After */}
            <Card className="p-8 border-2 border-primary bg-gradient-to-br from-primary/5 to-accent/5">
              <div className="text-center mb-6">
                <Badge className="mb-2">
                  <Sparkles className="w-3 h-3 mr-1" />
                  Autopilot
                </Badge>
                <h3 className="text-2xl font-bold text-primary">2시간</h3>
              </div>
              <ul className="space-y-4">
                {[
                  "AI 기반 자동 문서 분석",
                  "즉각적인 콘텐츠 생성",
                  "실시간 AI 추천 및 최적화",
                  "자동 포맷팅 및 스타일링",
                  "원클릭 피드백 적용"
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
                    <span className="font-medium">{item}</span>
                  </li>
                ))}
              </ul>
            </Card>
          </div>

          <div className="mt-12 text-center">
            <Card className="inline-block p-8 bg-gradient-to-r from-primary/10 via-accent/10 to-success/10">
              <p className="text-4xl font-bold mb-2">
                <span className="text-primary">94.4%</span> 시간 단축
              </p>
              <p className="text-muted-foreground">
                평균 36시간 → 2시간으로 단축
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4 bg-gradient-to-br from-primary/10 via-accent/10 to-success/10">
        <div className="container mx-auto max-w-4xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-4xl font-bold mb-6">
              지금 바로 시작하세요
            </h2>
            <p className="text-xl text-muted-foreground mb-8">
              무료로 Autopilot을 체험하고 교육콘텐츠 제작 시간을 획기적으로 단축하세요
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="gap-2">
                <Sparkles className="w-5 h-5" />
                무료로 시작하기
              </Button>
              <Button size="lg" variant="outline">
                더 알아보기
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Demo;