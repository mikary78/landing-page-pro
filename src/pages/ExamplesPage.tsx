/**
 * ExamplesPage - 생성 예시 페이지
 * 
 * AI로 생성된 교육 콘텐츠 예시를 갤러리 형태로 표시
 * 다양한 분야/주제의 생성 결과물 미리보기
 * 
 * 작성일: 2026-01-11
 */

import { useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  ChevronLeft, Sparkles, BookOpen, Presentation, 
  CheckSquare, FileText, Clock, Users, Eye, ArrowRight,
  Code, Briefcase, Heart, Palette, Globe, TrendingUp
} from "lucide-react";
import logo from "/logo.svg";

// ============================================================
// 예시 데이터
// ============================================================

interface ExampleProject {
  id: string;
  title: string;
  description: string;
  category: string;
  targetAudience: string;
  duration: string;
  sessions: number;
  thumbnail: string;
  tags: string[];
  curriculum: {
    title: string;
    sessions: { number: number; title: string; topics: string[] }[];
  };
  slides: { title: string; points: string[] }[];
  quiz: { question: string; options: string[]; correct: number }[];
}

const CATEGORIES = [
  { id: "all", label: "전체", icon: Sparkles },
  { id: "tech", label: "IT/기술", icon: Code },
  { id: "business", label: "비즈니스", icon: Briefcase },
  { id: "health", label: "건강/웰빙", icon: Heart },
  { id: "creative", label: "크리에이티브", icon: Palette },
  { id: "language", label: "언어/소통", icon: Globe },
];

const EXAMPLE_PROJECTS: ExampleProject[] = [
  {
    id: "1",
    title: "ChatGPT 비즈니스 활용법",
    description: "업무 생산성을 높이는 ChatGPT 프롬프트 작성법과 실무 적용 사례",
    category: "tech",
    targetAudience: "직장인",
    duration: "2시간",
    sessions: 1,
    thumbnail: "🤖",
    tags: ["AI", "생산성", "프롬프트"],
    curriculum: {
      title: "ChatGPT 비즈니스 활용 마스터",
      sessions: [
        {
          number: 1,
          title: "ChatGPT 기초와 프롬프트 엔지니어링",
          topics: ["ChatGPT 작동 원리", "효과적인 프롬프트 구조", "역할 지정 기법", "실무 적용 사례"]
        }
      ]
    },
    slides: [
      { title: "ChatGPT란?", points: ["대규모 언어 모델(LLM)", "자연어 처리 AI", "다양한 업무 지원 가능"] },
      { title: "프롬프트 기본 구조", points: ["역할 지정", "맥락 제공", "구체적 지시", "출력 형식 지정"] },
      { title: "비즈니스 활용 사례", points: ["이메일 작성", "보고서 요약", "데이터 분석", "아이디어 브레인스토밍"] },
    ],
    quiz: [
      { question: "ChatGPT에게 역할을 지정하는 이유는?", options: ["응답 품질 향상", "속도 증가", "비용 절감", "보안 강화"], correct: 0 },
      { question: "좋은 프롬프트의 특징이 아닌 것은?", options: ["구체적이다", "맥락이 있다", "애매하다", "출력 형식을 지정한다"], correct: 2 },
    ]
  },
  {
    id: "2",
    title: "신입사원 온보딩 교육",
    description: "새로 입사한 직원을 위한 조직 문화, 업무 프로세스, 협업 도구 교육",
    category: "business",
    targetAudience: "신입사원",
    duration: "8시간",
    sessions: 4,
    thumbnail: "👋",
    tags: ["온보딩", "조직문화", "협업"],
    curriculum: {
      title: "신입사원 온보딩 프로그램",
      sessions: [
        { number: 1, title: "회사 소개와 조직 문화", topics: ["회사 역사", "비전과 미션", "핵심 가치", "조직 구조"] },
        { number: 2, title: "업무 프로세스와 시스템", topics: ["업무 흐름", "사용 시스템", "보안 정책", "커뮤니케이션 채널"] },
        { number: 3, title: "협업 도구 활용", topics: ["Slack 사용법", "Notion 활용", "화상회의 에티켓", "일정 관리"] },
        { number: 4, title: "성장과 평가", topics: ["성과 관리", "피드백 문화", "경력 개발", "복지 제도"] },
      ]
    },
    slides: [
      { title: "환영합니다!", points: ["회사에 오신 것을 환영합니다", "함께 성장하는 여정", "서로를 존중하는 문화"] },
      { title: "우리의 핵심 가치", points: ["고객 중심", "도전과 혁신", "투명한 소통", "함께하는 성장"] },
      { title: "업무 시스템", points: ["ERP 시스템", "프로젝트 관리 도구", "문서 협업 도구", "내부 커뮤니케이션"] },
    ],
    quiz: [
      { question: "회사의 핵심 가치 중 하나는?", options: ["경쟁", "폐쇄", "고객 중심", "개인주의"], correct: 2 },
      { question: "긴급한 업무 연락은 어느 채널로?", options: ["이메일", "Slack 긴급 채널", "우편", "팩스"], correct: 1 },
    ]
  },
  {
    id: "3",
    title: "스트레스 관리와 마음 건강",
    description: "직장인을 위한 스트레스 관리 기법과 마음 챙김 실천법",
    category: "health",
    targetAudience: "직장인",
    duration: "3시간",
    sessions: 2,
    thumbnail: "🧘",
    tags: ["스트레스", "웰빙", "마음챙김"],
    curriculum: {
      title: "마음 건강 관리 프로그램",
      sessions: [
        { number: 1, title: "스트레스 이해하기", topics: ["스트레스의 원인", "몸과 마음의 반응", "자가 진단", "경고 신호"] },
        { number: 2, title: "실천적 관리 기법", topics: ["호흡법", "마음챙김 명상", "시간 관리", "경계 설정"] },
      ]
    },
    slides: [
      { title: "스트레스란?", points: ["외부 자극에 대한 반응", "적절한 스트레스는 동기부여", "만성 스트레스의 위험"] },
      { title: "4-7-8 호흡법", points: ["4초간 숨 들이쉬기", "7초간 숨 참기", "8초간 천천히 내쉬기", "하루 2회 실천"] },
    ],
    quiz: [
      { question: "만성 스트레스의 신호가 아닌 것은?", options: ["수면 장애", "집중력 저하", "에너지 증가", "소화 문제"], correct: 2 },
    ]
  },
  {
    id: "4",
    title: "UX/UI 디자인 기초",
    description: "비디자이너를 위한 사용자 경험 디자인 원칙과 실무 적용",
    category: "creative",
    targetAudience: "기획자/PM",
    duration: "4시간",
    sessions: 2,
    thumbnail: "🎨",
    tags: ["UX", "UI", "디자인"],
    curriculum: {
      title: "UX/UI 디자인 입문",
      sessions: [
        { number: 1, title: "UX 디자인 기초", topics: ["UX vs UI", "사용자 중심 설계", "페르소나", "사용자 여정 맵"] },
        { number: 2, title: "UI 디자인 원칙", topics: ["시각적 계층", "일관성", "피드백", "접근성"] },
      ]
    },
    slides: [
      { title: "UX vs UI", points: ["UX: 경험 설계", "UI: 인터페이스 설계", "둘 다 중요!", "사용자 중심 사고"] },
      { title: "좋은 UX의 원칙", points: ["유용성", "사용성", "접근성", "매력성"] },
    ],
    quiz: [
      { question: "UX 디자인의 핵심은?", options: ["예쁜 화면", "사용자 중심", "최신 기술", "빠른 개발"], correct: 1 },
    ]
  },
  {
    id: "5",
    title: "비즈니스 영어 이메일 작성",
    description: "글로벌 비즈니스를 위한 영어 이메일 작성 핵심 스킬",
    category: "language",
    targetAudience: "직장인",
    duration: "2시간",
    sessions: 1,
    thumbnail: "✉️",
    tags: ["영어", "이메일", "비즈니스"],
    curriculum: {
      title: "비즈니스 영어 이메일 마스터",
      sessions: [
        { number: 1, title: "효과적인 영어 이메일", topics: ["이메일 구조", "톤과 매너", "상황별 템플릿", "흔한 실수 피하기"] },
      ]
    },
    slides: [
      { title: "이메일 기본 구조", points: ["Subject: 명확하게", "Greeting: 상황에 맞게", "Body: 간결하게", "Closing: 정중하게"] },
      { title: "자주 쓰는 표현", points: ["I hope this email finds you well.", "Please find attached...", "I look forward to hearing from you.", "Best regards,"] },
    ],
    quiz: [
      { question: "공식적인 이메일의 마무리로 적절한 것은?", options: ["See ya!", "Best regards,", "Bye!", "Later!"], correct: 1 },
    ]
  },
  {
    id: "6",
    title: "데이터 분석 기초 with Excel",
    description: "엑셀을 활용한 기본적인 데이터 분석 및 시각화 방법",
    category: "tech",
    targetAudience: "직장인",
    duration: "6시간",
    sessions: 3,
    thumbnail: "📊",
    tags: ["Excel", "데이터분석", "시각화"],
    curriculum: {
      title: "Excel 데이터 분석 입문",
      sessions: [
        { number: 1, title: "데이터 정리와 가공", topics: ["데이터 형식", "필터와 정렬", "중복 제거", "텍스트 함수"] },
        { number: 2, title: "핵심 분석 함수", topics: ["VLOOKUP/XLOOKUP", "피벗 테이블", "조건부 함수", "통계 함수"] },
        { number: 3, title: "데이터 시각화", topics: ["차트 선택", "차트 디자인", "대시보드 구성", "인사이트 도출"] },
      ]
    },
    slides: [
      { title: "데이터 분석이란?", points: ["데이터에서 의미 찾기", "의사결정 지원", "패턴과 트렌드 발견"] },
      { title: "피벗 테이블 활용", points: ["대량 데이터 요약", "다양한 관점 분석", "드래그 앤 드롭", "실시간 업데이트"] },
    ],
    quiz: [
      { question: "피벗 테이블의 주요 용도는?", options: ["이미지 편집", "데이터 요약", "프레젠테이션", "이메일 작성"], correct: 1 },
    ]
  },
];

// ============================================================
// 컴포넌트
// ============================================================

function ExampleCard({ example, onView }: { example: ExampleProject; onView: () => void }) {
  return (
    <Card className="group hover:shadow-lg transition-all duration-300 overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="text-4xl mb-2">{example.thumbnail}</div>
          <Badge variant="secondary">{CATEGORIES.find(c => c.id === example.category)?.label}</Badge>
        </div>
        <CardTitle className="text-lg group-hover:text-primary transition-colors">
          {example.title}
        </CardTitle>
        <CardDescription className="line-clamp-2">
          {example.description}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-1 mb-4">
          {example.tags.map((tag) => (
            <Badge key={tag} variant="outline" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>
        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
          <span className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            {example.targetAudience}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            {example.duration}
          </span>
        </div>
        <Button variant="outline" className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors" onClick={onView}>
          <Eye className="h-4 w-4 mr-2" />
          상세 보기
        </Button>
      </CardContent>
    </Card>
  );
}

function ExampleDetailDialog({ example, open, onClose }: { example: ExampleProject | null; open: boolean; onClose: () => void }) {
  if (!example) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <span className="text-3xl">{example.thumbnail}</span>
            <div>
              <DialogTitle className="text-xl">{example.title}</DialogTitle>
              <p className="text-sm text-muted-foreground">{example.description}</p>
            </div>
          </div>
        </DialogHeader>
        
        <ScrollArea className="h-[60vh] pr-4">
          <Tabs defaultValue="curriculum" className="mt-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="curriculum" className="flex items-center gap-1">
                <BookOpen className="h-4 w-4" />
                커리큘럼
              </TabsTrigger>
              <TabsTrigger value="slides" className="flex items-center gap-1">
                <Presentation className="h-4 w-4" />
                슬라이드
              </TabsTrigger>
              <TabsTrigger value="quiz" className="flex items-center gap-1">
                <CheckSquare className="h-4 w-4" />
                퀴즈
              </TabsTrigger>
            </TabsList>

            {/* 커리큘럼 탭 */}
            <TabsContent value="curriculum" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">{example.curriculum.title}</CardTitle>
                  <CardDescription>총 {example.sessions}회차 / {example.duration}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {example.curriculum.sessions.map((session) => (
                    <div key={session.number} className="border rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge>{session.number}회차</Badge>
                        <span className="font-semibold">{session.title}</span>
                      </div>
                      <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                        {session.topics.map((topic, i) => (
                          <li key={i}>{topic}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            {/* 슬라이드 탭 */}
            <TabsContent value="slides" className="mt-4">
              <div className="grid gap-4">
                {example.slides.map((slide, idx) => (
                  <Card key={idx} className="bg-gradient-to-br from-primary/5 to-primary/10">
                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{idx + 1}</Badge>
                        <CardTitle className="text-base">{slide.title}</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {slide.points.map((point, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-primary mt-1">•</span>
                            <span>{point}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* 퀴즈 탭 */}
            <TabsContent value="quiz" className="mt-4">
              <div className="space-y-4">
                {example.quiz.map((q, idx) => (
                  <Card key={idx}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-2">
                        <Badge>Q{idx + 1}</Badge>
                        <CardTitle className="text-base">{q.question}</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-2">
                        {q.options.map((option, i) => (
                          <div 
                            key={i} 
                            className={`p-3 rounded-lg border ${i === q.correct ? 'bg-green-50 border-green-200 text-green-700' : 'bg-muted/50'}`}
                          >
                            <span className="font-medium mr-2">{i + 1}.</span>
                            {option}
                            {i === q.correct && <Badge variant="outline" className="ml-2 text-green-600">정답</Badge>}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </ScrollArea>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>닫기</Button>
          <Button asChild>
            <Link to="/auth">
              이런 콘텐츠 만들기
              <ArrowRight className="h-4 w-4 ml-2" />
            </Link>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function ExamplesPage() {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedExample, setSelectedExample] = useState<ExampleProject | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const filteredExamples = selectedCategory === "all" 
    ? EXAMPLE_PROJECTS 
    : EXAMPLE_PROJECTS.filter(e => e.category === selectedCategory);

  const handleViewExample = (example: ExampleProject) => {
    setSelectedExample(example);
    setDialogOpen(true);
  };

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
      <section className="py-16 bg-gradient-to-b from-muted/50 to-background">
        <div className="container mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary mb-6">
            <Sparkles className="h-4 w-4" />
            AI 생성 예시
          </div>
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
            AI가 만든 교육 콘텐츠
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            다양한 분야의 실제 생성 예시를 확인하세요.
            <br />
            커리큘럼, 슬라이드, 퀴즈까지 모두 AI가 자동으로 생성했습니다.
          </p>
        </div>
      </section>

      {/* 카테고리 필터 */}
      <section className="py-8 border-b">
        <div className="container mx-auto px-4">
          <div className="flex flex-wrap justify-center gap-2">
            {CATEGORIES.map((category) => {
              const Icon = category.icon;
              return (
                <Button
                  key={category.id}
                  variant={selectedCategory === category.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(category.id)}
                  className="flex items-center gap-2"
                >
                  <Icon className="h-4 w-4" />
                  {category.label}
                </Button>
              );
            })}
          </div>
        </div>
      </section>

      {/* 예시 그리드 */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredExamples.map((example) => (
              <ExampleCard 
                key={example.id} 
                example={example} 
                onView={() => handleViewExample(example)}
              />
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-gradient-primary">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-primary-foreground mb-4">
            나만의 교육 콘텐츠를 만들어보세요
          </h2>
          <p className="text-primary-foreground/80 mb-8">
            브리핑만 입력하면 AI가 전체 교육 콘텐츠를 자동으로 생성합니다
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

      {/* 상세 다이얼로그 */}
      <ExampleDetailDialog 
        example={selectedExample} 
        open={dialogOpen} 
        onClose={() => setDialogOpen(false)} 
      />
    </div>
  );
}
