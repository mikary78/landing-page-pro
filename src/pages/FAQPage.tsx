/**
 * FAQPage - 자주 묻는 질문 페이지
 * 
 * 아코디언 UI로 FAQ 표시
 * 카테고리별 필터링 + 검색 기능
 * 
 * 작성일: 2026-01-11
 */

import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Search, HelpCircle, CreditCard, Settings, Shield, 
  MessageSquare, ChevronLeft, Sparkles, BookOpen, Zap
} from "lucide-react";
import { ContactModal } from "@/components/ContactModal";
import logo from "/logo.svg";

// ============================================================
// FAQ 데이터
// ============================================================

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
}

const FAQ_CATEGORIES = [
  { id: "all", label: "전체", icon: HelpCircle },
  { id: "getting-started", label: "시작하기", icon: HelpCircle },
  { id: "features", label: "기능", icon: Sparkles },
  { id: "pricing", label: "요금", icon: CreditCard },
  { id: "account", label: "계정", icon: Settings },
  { id: "security", label: "보안", icon: Shield },
];

const FAQ_DATA: FAQItem[] = [
  // 시작하기
  {
    id: "1",
    question: "Autopilot은 어떤 서비스인가요?",
    answer: "Autopilot은 AI 기반 교육 콘텐츠 자동 생성 플랫폼입니다. 교육 주제와 대상만 입력하면 커리큘럼 설계부터 슬라이드, 퀴즈, 실습 가이드까지 전체 교육 콘텐츠를 자동으로 생성해드립니다. 브리프 입력부터 완성된 콘텐츠 배포까지 36시간 이내에 가능합니다.",
    category: "getting-started",
  },
  {
    id: "2",
    question: "무료로 사용할 수 있나요?",
    answer: "네, 무료 플랜을 제공하고 있습니다. 무료 플랜에서는 월 3개의 프로젝트를 생성할 수 있으며, 기본적인 AI 생성 기능을 모두 사용할 수 있습니다. 더 많은 프로젝트와 고급 기능이 필요하시면 유료 플랜을 검토해보세요.",
    category: "getting-started",
  },
  {
    id: "3",
    question: "어떻게 시작하나요?",
    answer: "1) 회원가입 후 로그인합니다. 2) 대시보드에서 '새 프로젝트 만들기'를 클릭합니다. 3) 교육 주제, 대상, 시간 등 기본 정보를 입력합니다. 4) AI가 자동으로 커리큘럼과 콘텐츠를 생성합니다. 5) 생성된 결과물을 확인하고 필요시 수정합니다. 6) 완성된 콘텐츠를 다운로드하거나 배포합니다.",
    category: "getting-started",
  },
  // 기능
  {
    id: "4",
    question: "어떤 종류의 콘텐츠를 생성할 수 있나요?",
    answer: "다양한 교육 콘텐츠를 생성할 수 있습니다: 커리큘럼 설계, 수업안/강의안, 프레젠테이션 슬라이드, 실습 가이드, 평가 퀴즈, 요약 자료 등. 각 콘텐츠는 교육 목표와 대상에 맞게 최적화됩니다.",
    category: "features",
  },
  {
    id: "5",
    question: "AI 모델은 어떤 것을 사용하나요?",
    answer: "Google Gemini, Anthropic Claude, OpenAI ChatGPT 세 가지 AI 모델 중 선택하여 사용할 수 있습니다. 각 모델마다 특성이 다르므로, 생성 결과를 비교해보고 원하는 모델을 선택하실 수 있습니다.",
    category: "features",
  },
  {
    id: "6",
    question: "생성된 콘텐츠를 수정할 수 있나요?",
    answer: "네, 물론입니다. 코스빌더 기능을 통해 생성된 콘텐츠를 세밀하게 편집할 수 있습니다. AI로 부분 보강하거나, 특정 섹션만 재생성하거나, 직접 수정할 수 있습니다. 버전 관리 기능으로 변경 이력도 추적됩니다.",
    category: "features",
  },
  {
    id: "7",
    question: "어떤 포맷으로 다운로드할 수 있나요?",
    answer: "PDF, Word(DOCX), PowerPoint(PPTX), Markdown, 텍스트 파일 등 다양한 포맷으로 다운로드할 수 있습니다. 용도에 맞게 원하는 포맷을 선택하세요.",
    category: "features",
  },
  // 요금
  {
    id: "8",
    question: "유료 플랜의 가격은 어떻게 되나요?",
    answer: "현재 베타 서비스 기간으로 무료로 제공되고 있습니다. 정식 출시 후 가격 정책이 공개될 예정입니다. 영업팀 문의를 통해 기업용 맞춤 플랜에 대해 상담받으실 수 있습니다.",
    category: "pricing",
  },
  {
    id: "9",
    question: "기업용 플랜이 있나요?",
    answer: "네, 기업 고객을 위한 엔터프라이즈 플랜을 제공합니다. 무제한 프로젝트, 팀 협업 기능, 전용 고객 지원, API 접근 등이 포함됩니다. 자세한 내용은 영업팀에 문의해주세요.",
    category: "pricing",
  },
  // 계정
  {
    id: "10",
    question: "계정을 삭제하려면 어떻게 하나요?",
    answer: "설정 > 계정 관리에서 계정 삭제를 요청할 수 있습니다. 계정 삭제 시 모든 프로젝트와 데이터가 영구적으로 삭제되며, 이 작업은 되돌릴 수 없습니다. 삭제 전 필요한 데이터를 백업해주세요.",
    category: "account",
  },
  {
    id: "11",
    question: "비밀번호를 잊어버렸어요.",
    answer: "로그인 페이지에서 '비밀번호 찾기'를 클릭하고 가입 시 사용한 이메일을 입력하세요. 비밀번호 재설정 링크가 이메일로 발송됩니다.",
    category: "account",
  },
  // 보안
  {
    id: "12",
    question: "내 데이터는 안전한가요?",
    answer: "네, 보안을 최우선으로 합니다. 모든 데이터는 암호화되어 전송 및 저장됩니다. Azure 클라우드 인프라를 사용하며, 정기적인 보안 감사를 수행합니다. 개인정보 처리방침에 따라 데이터를 안전하게 관리합니다.",
    category: "security",
  },
  {
    id: "13",
    question: "생성된 콘텐츠의 저작권은 누구에게 있나요?",
    answer: "AI가 생성한 콘텐츠의 저작권은 사용자에게 있습니다. 생성된 콘텐츠를 자유롭게 수정, 배포, 상업적으로 활용하실 수 있습니다.",
    category: "security",
  },
];

// ============================================================
// 컴포넌트
// ============================================================

export default function FAQPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  // 필터링된 FAQ 목록
  const filteredFAQs = useMemo(() => {
    return FAQ_DATA.filter((faq) => {
      // 카테고리 필터
      if (selectedCategory !== "all" && faq.category !== selectedCategory) {
        return false;
      }
      // 검색어 필터
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          faq.question.toLowerCase().includes(query) ||
          faq.answer.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [searchQuery, selectedCategory]);

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

      {/* 히어로 섹션 */}
      <section className="py-16 bg-gradient-to-b from-muted/50 to-background">
        <div className="container mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary mb-6">
            <HelpCircle className="h-4 w-4" />
            자주 묻는 질문
          </div>
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
            무엇을 도와드릴까요?
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
            Autopilot 사용에 관한 자주 묻는 질문과 답변을 확인하세요.
            <br />
            원하는 답을 찾지 못하셨다면 언제든 문의해주세요.
          </p>

          {/* 검색 */}
          <div className="max-w-xl mx-auto relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="search"
              placeholder="질문 검색..."
              className="pl-12 h-12 text-lg"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </section>

      {/* 메인 콘텐츠 */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* 카테고리 사이드바 */}
            <aside className="lg:w-64 flex-shrink-0">
              <div className="sticky top-8">
                <h3 className="font-semibold mb-4">카테고리</h3>
                <nav className="space-y-1">
                  {FAQ_CATEGORIES.map((category) => {
                    const Icon = category.icon;
                    const count = category.id === "all" 
                      ? FAQ_DATA.length 
                      : FAQ_DATA.filter(f => f.category === category.id).length;
                    
                    return (
                      <button
                        key={category.id}
                        onClick={() => setSelectedCategory(category.id)}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors ${
                          selectedCategory === category.id
                            ? "bg-primary text-primary-foreground"
                            : "hover:bg-muted"
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <Icon className="h-4 w-4" />
                          {category.label}
                        </span>
                        <Badge variant={selectedCategory === category.id ? "secondary" : "outline"}>
                          {count}
                        </Badge>
                      </button>
                    );
                  })}
                </nav>
              </div>
            </aside>

            {/* FAQ 목록 */}
            <main className="flex-1">
              {filteredFAQs.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Search className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-semibold mb-2">검색 결과가 없습니다</h3>
                    <p className="text-muted-foreground mb-4">
                      다른 검색어로 시도하거나 카테고리를 변경해보세요.
                    </p>
                    <Button variant="outline" onClick={() => {
                      setSearchQuery("");
                      setSelectedCategory("all");
                    }}>
                      필터 초기화
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <Accordion type="single" collapsible className="space-y-4">
                  {filteredFAQs.map((faq) => (
                    <AccordionItem 
                      key={faq.id} 
                      value={faq.id}
                      className="border rounded-lg px-4 data-[state=open]:bg-muted/50"
                    >
                      <AccordionTrigger className="text-left hover:no-underline py-4">
                        <div className="flex items-start gap-3">
                          <HelpCircle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                          <span className="font-medium">{faq.question}</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pb-4 pl-8">
                        <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
                          {faq.answer}
                        </p>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              )}
            </main>
          </div>
        </div>
      </section>

      {/* 추가 도움 섹션 */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <Card>
              <CardHeader className="text-center">
                <CardTitle className="text-2xl">원하는 답을 찾지 못하셨나요?</CardTitle>
                <CardDescription>
                  언제든 문의해주세요. 빠르게 도움을 드리겠습니다.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid sm:grid-cols-3 gap-4">
                  <Card className="border-dashed">
                    <CardContent className="pt-6 text-center">
                      <MessageSquare className="h-8 w-8 mx-auto mb-3 text-primary" />
                      <h4 className="font-semibold mb-1">영업팀 문의</h4>
                      <p className="text-sm text-muted-foreground mb-3">
                        기업 플랜 및 맞춤 상담
                      </p>
                      <ContactModal 
                        trigger={
                          <Button variant="outline" size="sm">
                            문의하기
                          </Button>
                        }
                      />
                    </CardContent>
                  </Card>
                  
                  <Card className="border-dashed">
                    <CardContent className="pt-6 text-center">
                      <BookOpen className="h-8 w-8 mx-auto mb-3 text-primary" />
                      <h4 className="font-semibold mb-1">가이드 문서</h4>
                      <p className="text-sm text-muted-foreground mb-3">
                        상세한 사용 방법
                      </p>
                      <Button variant="outline" size="sm" asChild>
                        <Link to="/guide">가이드 보기</Link>
                      </Button>
                    </CardContent>
                  </Card>
                  
                  <Card className="border-dashed">
                    <CardContent className="pt-6 text-center">
                      <Zap className="h-8 w-8 mx-auto mb-3 text-primary" />
                      <h4 className="font-semibold mb-1">빠른 시작</h4>
                      <p className="text-sm text-muted-foreground mb-3">
                        지금 바로 시작하기
                      </p>
                      <Button variant="outline" size="sm" asChild>
                        <Link to="/auth">시작하기</Link>
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </div>
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
