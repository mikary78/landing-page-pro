/**
 * AboutPage - 회사 소개 페이지
 * 
 * 작성일: 2026-01-11
 */

import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  ChevronLeft, Target, Users, Lightbulb, 
  Heart, ArrowRight, Zap, Globe
} from "lucide-react";
import logo from "/logo.svg";

const VALUES = [
  {
    icon: Target,
    title: "사용자 중심",
    description: "모든 결정에서 사용자 경험을 최우선으로 생각합니다.",
  },
  {
    icon: Lightbulb,
    title: "혁신",
    description: "AI 기술을 통해 교육의 미래를 만들어갑니다.",
  },
  {
    icon: Heart,
    title: "신뢰",
    description: "투명하고 정직한 서비스를 제공합니다.",
  },
  {
    icon: Users,
    title: "협력",
    description: "팀워크를 통해 더 나은 결과를 만들어냅니다.",
  },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* 헤더 */}
      <header className="border-b bg-muted/30">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2">
              <img 
                src={logo} 
                alt="Autopilot Logo" 
                className="w-8 h-8"
              />
              <span className="text-lg font-bold">Autopilot</span>
            </Link>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/">
                <ChevronLeft className="h-4 w-4 mr-1" />
                홈으로
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* 히어로 */}
      <section className="py-20 bg-gradient-to-b from-muted/50 to-background">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            교육의 미래를 만들어갑니다
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Autopilot은 AI 기술을 활용하여 누구나 쉽고 빠르게 
            고품질 교육 콘텐츠를 만들 수 있도록 돕는 플랫폼입니다.
          </p>
        </div>
      </section>

      {/* 미션 */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-6">우리의 미션</h2>
            <p className="text-lg text-muted-foreground leading-relaxed">
              교육 콘텐츠 제작에는 많은 시간과 전문성이 필요합니다. 
              우리는 AI의 힘을 빌려 이 과정을 혁신하고, 
              더 많은 사람들이 양질의 교육을 제공하고 받을 수 있는 세상을 만들고자 합니다.
            </p>
          </div>
        </div>
      </section>

      {/* 핵심 가치 */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">핵심 가치</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
            {VALUES.map((value) => {
              const Icon = value.icon;
              return (
                <Card key={value.title} className="text-center">
                  <CardContent className="pt-6">
                    <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="font-semibold mb-2">{value.title}</h3>
                    <p className="text-sm text-muted-foreground">{value.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* 숫자로 보는 Autopilot */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">숫자로 보는 Autopilot</h2>
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto text-center">
            <div>
              <div className="text-4xl font-bold text-primary mb-2">1,000+</div>
              <p className="text-muted-foreground">생성된 프로젝트</p>
            </div>
            <div>
              <div className="text-4xl font-bold text-primary mb-2">36시간</div>
              <p className="text-muted-foreground">평균 콘텐츠 제작 시간</p>
            </div>
            <div>
              <div className="text-4xl font-bold text-primary mb-2">98%</div>
              <p className="text-muted-foreground">고객 만족도</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-gradient-primary">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-primary-foreground mb-4">
            함께 교육의 미래를 만들어가요
          </h2>
          <p className="text-primary-foreground/80 mb-8">
            지금 바로 Autopilot을 시작해보세요
          </p>
          <Button size="lg" variant="secondary" asChild>
            <Link to="/auth">
              무료로 시작하기
              <ArrowRight className="h-5 w-5 ml-2" />
            </Link>
          </Button>
        </div>
      </section>

      {/* 푸터 */}
      <footer className="border-t py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>&copy; 2024 Autopilot. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
