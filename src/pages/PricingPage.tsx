/**
 * PricingPage - 가격 페이지
 * 
 * 현재 업데이트 중 상태 표시
 * 
 * 작성일: 2026-01-11
 */

import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  ChevronLeft, Clock, Sparkles, 
  ArrowRight, Mail, CheckCircle2
} from "lucide-react";
import { ContactModal } from "@/components/ContactModal";
import logo from "/logo.svg";

export default function PricingPage() {
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

      {/* 메인 콘텐츠 */}
      <main className="py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            {/* 아이콘 */}
            <div className="mx-auto w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mb-8">
              <Clock className="h-12 w-12 text-primary animate-pulse" />
            </div>

            {/* 제목 */}
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              가격 정책 업데이트 중
            </h1>
            <p className="text-xl text-muted-foreground mb-8">
              더 나은 가격 정책을 준비하고 있습니다.
              <br />
              곧 공개될 예정입니다.
            </p>

            {/* 현재 상태 카드 */}
            <Card className="mb-8 border-primary/20 bg-primary/5">
              <CardHeader>
                <CardTitle className="flex items-center justify-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  현재 서비스 상태
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <div className="text-left">
                      <p className="font-semibold">베타 서비스 무료 제공</p>
                      <p className="text-sm text-muted-foreground">
                        현재 베타 기간 동안 모든 기능을 무료로 사용하실 수 있습니다.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <div className="text-left">
                      <p className="font-semibold">정식 출시 준비 중</p>
                      <p className="text-sm text-muted-foreground">
                        정식 출시 후 가격 정책이 공개될 예정입니다.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <div className="text-left">
                      <p className="font-semibold">기업용 맞춤 플랜</p>
                      <p className="text-sm text-muted-foreground">
                        기업 고객을 위한 엔터프라이즈 플랜도 준비 중입니다.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* CTA */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <ContactModal 
                trigger={
                  <Button size="lg" className="gap-2">
                    <Mail className="h-5 w-5" />
                    가격 문의하기
                  </Button>
                }
              />
              <Button size="lg" variant="outline" asChild>
                <Link to="/auth">
                  무료로 시작하기
                  <ArrowRight className="h-5 w-5 ml-2" />
                </Link>
              </Button>
            </div>

            {/* 추가 정보 */}
            <div className="mt-12 pt-8 border-t">
              <p className="text-sm text-muted-foreground">
                가격 정책이 공개되면 이메일로 알려드리겠습니다.
                <br />
                베타 기간 동안은 무료로 모든 기능을 사용하실 수 있습니다.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* 푸터 */}
      <footer className="border-t py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>&copy; 2024 Autopilot. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
