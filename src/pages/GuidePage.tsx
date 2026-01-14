/**
 * GuidePage - 사용 가이드 페이지
 * 
 * 서비스 사용법을 단계별로 설명
 * 좌측 TOC + 우측 콘텐츠 레이아웃
 * 
 * 작성일: 2026-01-11
 */

import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  ChevronLeft, ChevronRight, BookOpen, 
  FileText, Sparkles, Download, Settings, Play,
  CheckCircle2, ArrowRight, Lightbulb, AlertCircle
} from "lucide-react";
import logo from "/logo.svg";

// ============================================================
// 가이드 데이터
// ============================================================

interface GuideSection {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  content: React.ReactNode;
}

const GUIDE_SECTIONS: GuideSection[] = [
  {
    id: "getting-started",
    title: "시작하기",
    icon: Play,
    content: (
      <div className="space-y-6">
        <p className="text-lg text-muted-foreground">
          Autopilot을 사용하여 AI 기반 교육 콘텐츠를 생성하는 방법을 알아봅니다.
        </p>
        
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="p-2 rounded-lg bg-primary/10">
                <Lightbulb className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h4 className="font-semibold mb-1">Autopilot이란?</h4>
                <p className="text-sm text-muted-foreground">
                  Autopilot은 AI를 활용하여 교육 콘텐츠를 자동으로 생성하는 플랫폼입니다.
                  브리핑만 입력하면 커리큘럼, 강의안, 슬라이드, 퀴즈까지 전체 교육 자료를 생성합니다.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <h3 className="text-xl font-semibold">사전 준비</h3>
          <ul className="space-y-3">
            <li className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
              <span>이메일 계정 (회원가입용)</span>
            </li>
            <li className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
              <span>생성하고자 하는 교육 주제에 대한 기본 구상</span>
            </li>
            <li className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
              <span>교육 대상, 시간, 회차에 대한 계획</span>
            </li>
          </ul>
        </div>
      </div>
    ),
  },
  {
    id: "create-project",
    title: "프로젝트 생성",
    icon: FileText,
    content: (
      <div className="space-y-6">
        <p className="text-lg text-muted-foreground">
          새 프로젝트를 만들고 브리핑을 입력하여 AI 콘텐츠 생성을 시작합니다.
        </p>

        <div className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-xl font-semibold flex items-center gap-2">
              <Badge>Step 1</Badge>
              새 프로젝트 만들기
            </h3>
            <div className="pl-8 space-y-3">
              <p>대시보드에서 <strong>"새 프로젝트 만들기"</strong> 버튼을 클릭합니다.</p>
              <Card className="bg-muted/50">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-center h-32 border-2 border-dashed rounded-lg">
                    <span className="text-muted-foreground">[스크린샷: 대시보드 화면]</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <h3 className="text-xl font-semibold flex items-center gap-2">
              <Badge>Step 2</Badge>
              기본 정보 입력
            </h3>
            <div className="pl-8 space-y-3">
              <p>교육 콘텐츠의 기본 정보를 입력합니다:</p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                <li><strong>교육 주제:</strong> 생성할 교육의 핵심 주제 (예: "ChatGPT 활용법")</li>
                <li><strong>교육 대상:</strong> 수강자 특성 (예: "직장인", "대학생")</li>
                <li><strong>교육 시간:</strong> 회당 교육 시간</li>
                <li><strong>총 회차:</strong> 전체 교육 회차 수</li>
              </ul>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <h3 className="text-xl font-semibold flex items-center gap-2">
              <Badge>Step 3</Badge>
              상세 브리핑 작성
            </h3>
            <div className="pl-8 space-y-3">
              <p>AI가 더 정확한 콘텐츠를 생성할 수 있도록 상세한 브리핑을 작성합니다:</p>
              <Card className="border-amber-200 bg-amber-50">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-semibold mb-1">좋은 브리핑 작성 팁</h4>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• 구체적인 학습 목표를 명시하세요</li>
                        <li>• 원하는 콘텐츠 스타일이나 톤을 설명하세요</li>
                        <li>• 포함되어야 할 핵심 주제를 나열하세요</li>
                        <li>• 제외해야 할 내용이 있다면 명시하세요</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: "ai-generation",
    title: "AI 콘텐츠 생성",
    icon: Sparkles,
    content: (
      <div className="space-y-6">
        <p className="text-lg text-muted-foreground">
          브리핑을 기반으로 AI가 6단계 파이프라인을 통해 교육 콘텐츠를 자동 생성합니다.
        </p>

        <div className="space-y-4">
          <h3 className="text-xl font-semibold">생성 파이프라인</h3>
          <div className="grid gap-4">
            {[
              { step: 1, title: "커리큘럼 설계", desc: "교육 목표와 회차별 주제 구성" },
              { step: 2, title: "수업안 작성", desc: "각 회차별 상세 수업 계획" },
              { step: 3, title: "슬라이드 구성", desc: "발표용 슬라이드 콘텐츠" },
              { step: 4, title: "실습 가이드", desc: "실습 및 활동 자료" },
              { step: 5, title: "평가 퀴즈", desc: "학습 확인용 평가 문항" },
              { step: 6, title: "최종 검토", desc: "전체 콘텐츠 통합 및 검토" },
            ].map((item) => (
              <Card key={item.step} className="flex items-center gap-4 p-4">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary text-primary-foreground font-bold">
                  {item.step}
                </div>
                <div>
                  <h4 className="font-semibold">{item.title}</h4>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </div>
              </Card>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-xl font-semibold">AI 모델 선택</h3>
          <p className="text-muted-foreground">
            원하는 AI 모델을 선택하여 콘텐츠를 생성할 수 있습니다:
          </p>
          <div className="grid md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Google Gemini</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  빠른 응답과 균형 잡힌 콘텐츠 생성
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Anthropic Claude</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  깊이 있는 분석과 상세한 설명
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">OpenAI ChatGPT</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  창의적이고 다양한 표현
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: "review-edit",
    title: "결과 확인 및 편집",
    icon: Settings,
    content: (
      <div className="space-y-6">
        <p className="text-lg text-muted-foreground">
          생성된 콘텐츠를 확인하고 필요에 따라 수정합니다.
        </p>

        <div className="space-y-4">
          <h3 className="text-xl font-semibold">Generation Studio</h3>
          <p className="text-muted-foreground">
            Generation Studio에서 각 파이프라인 단계별 결과를 확인할 수 있습니다:
          </p>
          <ul className="list-disc list-inside space-y-2 text-muted-foreground pl-4">
            <li>탭을 통해 각 단계별 결과 전환</li>
            <li>종합 강의안에서 전체 내용 확인</li>
            <li>마음에 들지 않으면 다른 AI 모델로 재생성</li>
          </ul>
        </div>

        <Separator />

        <div className="space-y-4">
          <h3 className="text-xl font-semibold flex items-center gap-2">
            <Badge>Step 4</Badge>
            코스빌더로 보내기
          </h3>
          <div className="pl-8 space-y-4">
            <p className="text-muted-foreground">
              생성된 프로젝트를 코스빌더로 가져와 더 세밀하게 편집할 수 있습니다.
            </p>
            
            <div className="space-y-3">
              <Card className="bg-muted/50">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-center h-32 border-2 border-dashed rounded-lg">
                    <span className="text-muted-foreground">[스크린샷: Generation Studio의 "코스빌더로 보내기" 버튼]</span>
                  </div>
                </CardContent>
              </Card>
              
              <p className="text-sm text-muted-foreground">
                Generation Studio 우측 상단의 <strong>"코스빌더로 보내기"</strong> 버튼을 클릭합니다.
              </p>
            </div>

            <div className="space-y-3 mt-4">
              <h4 className="font-semibold">변환 옵션</h4>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                <li><strong>새 코스 생성:</strong> 프로젝트를 새로운 코스로 변환</li>
                <li><strong>기존 코스에 추가:</strong> 이미 만든 코스에 모듈/레슨으로 추가</li>
              </ul>
            </div>

            <Card className="border-green-200 bg-green-50">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold mb-1">자동 변환</h4>
                    <p className="text-sm text-muted-foreground">
                      프로젝트의 각 회차가 코스의 모듈로, 각 회차의 콘텐츠가 레슨으로 자동 변환됩니다.
                      슬라이드, 실습 가이드, 퀴즈 등이 레슨의 콘텐츠 아이템으로 구성됩니다.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <Separator />

        <div className="space-y-4">
          <h3 className="text-xl font-semibold flex items-center gap-2">
            <Badge>Step 5</Badge>
            코스빌더에서 상세 편집
          </h3>
          <div className="pl-8 space-y-4">
            <p className="text-muted-foreground">
              코스빌더에서 다음과 같은 작업을 할 수 있습니다:
            </p>
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="pt-6">
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <ChevronRight className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-medium">모듈/레슨 구조 재편집</span>
                      <p className="text-sm text-muted-foreground">드래그 앤 드롭으로 순서 변경, 삭제, 추가</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <ChevronRight className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-medium">특정 레슨만 AI로 부분 재생성</span>
                      <p className="text-sm text-muted-foreground">전체 파이프라인을 다시 실행하지 않고, 선택한 레슨만 재생성</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <ChevronRight className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-medium">콘텐츠 직접 수정</span>
                      <p className="text-sm text-muted-foreground">텍스트 편집, 이미지 추가, 링크 삽입 등</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <ChevronRight className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-medium">버전 히스토리 관리</span>
                      <p className="text-sm text-muted-foreground">변경 이력 추적 및 이전 버전으로 복원</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <ChevronRight className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-medium">콘텐츠 소스 추적</span>
                      <p className="text-sm text-muted-foreground">AI 생성, 직접 작성, 업로드 등 출처 표시</p>
                    </div>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: "download-export",
    title: "다운로드 및 내보내기",
    icon: Download,
    content: (
      <div className="space-y-6">
        <p className="text-lg text-muted-foreground">
          완성된 콘텐츠를 다양한 형식으로 다운로드합니다.
        </p>

        <div className="space-y-4">
          <h3 className="text-xl font-semibold">지원 포맷</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  문서 형식
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• PDF - 인쇄용 문서</li>
                  <li>• Word (DOCX) - 편집 가능 문서</li>
                  <li>• Markdown - 텍스트 기반</li>
                  <li>• Plain Text - 단순 텍스트</li>
                </ul>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  프레젠테이션
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• PowerPoint (PPTX)</li>
                  <li>• 발표자 노트 포함</li>
                  <li>• 슬라이드별 구성</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>

        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold mb-1">A4 출력 최적화</h4>
                <p className="text-sm text-muted-foreground">
                  PDF와 Word 파일은 A4 용지 출력에 최적화되어 있습니다.
                  깔끔한 레이아웃으로 바로 인쇄하여 사용할 수 있습니다.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    ),
  },
];

// ============================================================
// 컴포넌트
// ============================================================

export default function GuidePage() {
  const [activeSection, setActiveSection] = useState(GUIDE_SECTIONS[0].id);
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  // 스크롤 시 활성 섹션 감지
  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 150;
      
      for (const section of GUIDE_SECTIONS) {
        const element = sectionRefs.current[section.id];
        if (element) {
          const { offsetTop, offsetHeight } = element;
          if (scrollPosition >= offsetTop && scrollPosition < offsetTop + offsetHeight) {
            setActiveSection(section.id);
            break;
          }
        }
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToSection = (sectionId: string) => {
    const element = sectionRefs.current[sectionId];
    if (element) {
      window.scrollTo({
        top: element.offsetTop - 100,
        behavior: "smooth",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* 헤더 */}
      <header className="border-b bg-muted/30 sticky top-0 z-50 backdrop-blur-sm">
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
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" asChild>
                <Link to="/faq">FAQ</Link>
              </Button>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/">
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  홈으로
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* 히어로 */}
      <section className="py-12 bg-gradient-to-b from-muted/50 to-background">
        <div className="container mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary mb-6">
            <BookOpen className="h-4 w-4" />
            사용 가이드
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-4">
            Autopilot 시작하기
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            AI 기반 교육 콘텐츠 생성의 모든 것을 알아보세요.
          </p>
        </div>
      </section>

      {/* 메인 콘텐츠 */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* 좌측 네비게이션 (TOC) */}
            <aside className="lg:w-64 flex-shrink-0">
              <div className="sticky top-24">
                <h3 className="font-semibold mb-4 text-sm text-muted-foreground uppercase tracking-wide">
                  목차
                </h3>
                <nav className="space-y-1">
                  {GUIDE_SECTIONS.map((section) => {
                    const Icon = section.icon;
                    return (
                      <button
                        key={section.id}
                        onClick={() => scrollToSection(section.id)}
                        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm transition-colors ${
                          activeSection === section.id
                            ? "bg-primary text-primary-foreground"
                            : "hover:bg-muted"
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        {section.title}
                      </button>
                    );
                  })}
                </nav>
              </div>
            </aside>

            {/* 우측 콘텐츠 */}
            <main className="flex-1 min-w-0">
              <div className="space-y-16">
                {GUIDE_SECTIONS.map((section) => {
                  const Icon = section.icon;
                  return (
                    <section
                      key={section.id}
                      id={section.id}
                      ref={(el) => (sectionRefs.current[section.id] = el)}
                      className="scroll-mt-24"
                    >
                      <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <Icon className="h-5 w-5 text-primary" />
                        </div>
                        <h2 className="text-2xl font-bold">{section.title}</h2>
                      </div>
                      {section.content}
                    </section>
                  );
                })}
              </div>
            </main>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-2xl font-bold mb-4">준비되셨나요?</h2>
          <p className="text-muted-foreground mb-8">
            지금 바로 AI 교육 콘텐츠 생성을 시작해보세요.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" asChild>
              <Link to="/auth">
                무료로 시작하기
                <ArrowRight className="h-5 w-5 ml-2" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/examples">
                생성 예시 보기
              </Link>
            </Button>
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
