/**
 * BlogPage - 블로그 목록 페이지
 * 
 * AI 교육, 활용 팁, 업데이트 소식 등 콘텐츠 제공
 * 정적 데이터 기반 MVP 구현
 * 
 * 작성일: 2026-01-11
 */

import { useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  ChevronLeft, Search, Calendar, User, Clock, 
  ArrowRight, BookOpen, Lightbulb, TrendingUp, Megaphone
} from "lucide-react";
import logo from "/logo.svg";

// ============================================================
// 블로그 데이터
// ============================================================

export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  category: string;
  author: string;
  publishedAt: string;
  readTime: number;
  thumbnail: string;
  tags: string[];
  featured?: boolean;
}

const BLOG_CATEGORIES = [
  { id: "all", label: "전체", icon: BookOpen },
  { id: "tips", label: "활용 팁", icon: Lightbulb },
  { id: "updates", label: "업데이트", icon: Megaphone },
  { id: "trends", label: "AI 트렌드", icon: TrendingUp },
];

export const BLOG_POSTS: BlogPost[] = [
  {
    id: "1",
    slug: "ai-education-trends-2026",
    title: "2026년 AI 교육 콘텐츠 트렌드 5가지",
    excerpt: "올해 주목해야 할 AI 기반 교육 콘텐츠 제작의 핵심 트렌드와 실무 적용 방법을 알아봅니다.",
    content: `
# 2026년 AI 교육 콘텐츠 트렌드 5가지

AI 기술의 발전과 함께 교육 콘텐츠 제작 방식도 빠르게 변화하고 있습니다. 올해 주목해야 할 핵심 트렌드를 살펴보겠습니다.

## 1. 개인화된 학습 경험

AI는 학습자의 수준과 선호도를 분석하여 맞춤형 콘텐츠를 제공합니다. 같은 주제라도 초급자와 고급자에게 다른 난이도의 자료를 자동으로 생성할 수 있습니다.

## 2. 실시간 콘텐츠 업데이트

최신 정보와 트렌드를 반영한 콘텐츠가 실시간으로 업데이트됩니다. 더 이상 오래된 교육 자료를 걱정할 필요가 없습니다.

## 3. 다양한 포맷 자동 변환

하나의 콘텐츠를 슬라이드, 영상 스크립트, 퀴즈 등 다양한 포맷으로 자동 변환할 수 있습니다.

## 4. 인터랙티브 요소 증가

단순한 텍스트 기반 교육에서 벗어나 퀴즈, 시뮬레이션, 실습 가이드 등 인터랙티브 요소가 기본으로 포함됩니다.

## 5. 협업 중심 제작

여러 전문가가 AI와 함께 협업하여 더 풍부한 콘텐츠를 제작하는 방식이 확산되고 있습니다.

---

이러한 트렌드를 반영하여 Autopilot은 지속적으로 기능을 개선하고 있습니다.
    `,
    category: "trends",
    author: "Autopilot 팀",
    publishedAt: "2026-01-10",
    readTime: 5,
    thumbnail: "📈",
    tags: ["AI", "교육 트렌드", "2026"],
    featured: true,
  },
  {
    id: "2",
    slug: "effective-prompting-tips",
    title: "효과적인 교육 콘텐츠 브리핑 작성법",
    excerpt: "AI에게 더 좋은 결과를 얻기 위한 브리핑 작성 팁과 예시를 공유합니다.",
    content: `
# 효과적인 교육 콘텐츠 브리핑 작성법

AI가 생성하는 콘텐츠의 품질은 입력하는 브리핑의 질에 크게 좌우됩니다. 좋은 브리핑을 작성하는 방법을 알아봅시다.

## 좋은 브리핑의 핵심 요소

### 1. 구체적인 학습 목표
- "ChatGPT 사용법 교육" (X)
- "실무자가 ChatGPT를 활용해 보고서 작성 시간을 50% 단축하는 방법" (O)

### 2. 명확한 대상 정의
- "직장인 대상" (X)
- "IT 기업 마케팅 부서 신입사원 (입사 1년 미만, 기초 디지털 리터러시 보유)" (O)

### 3. 원하는 스타일 명시
- 실습 중심 vs 이론 중심
- 가벼운 톤 vs 전문적인 톤
- 많은 예시 포함 vs 핵심만 간결하게

### 4. 제외할 내용
꼭 다루지 않았으면 하는 내용도 명시하면 좋습니다.

## 브리핑 예시

**Before:**
> Python 교육 만들어줘

**After:**
> 비전공 직장인을 위한 Python 기초 교육을 만들어주세요.
> - 대상: 엑셀은 사용하지만 프로그래밍 경험이 없는 사무직
> - 목표: 반복 작업을 자동화하는 간단한 스크립트 작성
> - 구성: 실습 70%, 이론 30%
> - 제외: 복잡한 개념 (클래스, 상속 등)
    `,
    category: "tips",
    author: "김교육",
    publishedAt: "2026-01-08",
    readTime: 4,
    thumbnail: "✍️",
    tags: ["브리핑", "팁", "품질 향상"],
  },
  {
    id: "3",
    slug: "new-feature-course-builder",
    title: "[업데이트] 코스빌더 기능 출시",
    excerpt: "생성된 콘텐츠를 더 세밀하게 편집할 수 있는 코스빌더 기능이 새롭게 추가되었습니다.",
    content: `
# 코스빌더 기능 출시

프로젝트 생성으로 빠르게 콘텐츠를 만들고, 코스빌더에서 세밀하게 다듬을 수 있습니다.

## 주요 기능

### 1. 모듈/레슨 구조 편집
드래그 앤 드롭으로 콘텐츠 구조를 자유롭게 재편집하세요.

### 2. 부분 AI 재생성
전체를 다시 생성하지 않고, 특정 레슨만 AI로 다시 생성할 수 있습니다.

### 3. 콘텐츠 소스 추적
AI 생성, 직접 작성, 업로드 등 콘텐츠의 출처를 한눈에 확인하세요.

### 4. 버전 관리
변경 이력을 저장하고, 필요시 이전 버전으로 복원할 수 있습니다.

## 사용 방법

1. Generation Studio에서 "코스빌더로 보내기" 클릭
2. 새 코스 생성 또는 기존 코스에 추가
3. 코스빌더에서 상세 편집 시작

더 자세한 사용법은 가이드 문서를 참조하세요.
    `,
    category: "updates",
    author: "Autopilot 팀",
    publishedAt: "2026-01-05",
    readTime: 3,
    thumbnail: "🎉",
    tags: ["업데이트", "코스빌더", "신기능"],
    featured: true,
  },
  {
    id: "4",
    slug: "ai-quiz-generation-best-practices",
    title: "AI 퀴즈 생성 품질 높이기",
    excerpt: "학습 효과를 높이는 퀴즈를 AI로 생성하는 방법과 검토 포인트를 알아봅니다.",
    content: `
# AI 퀴즈 생성 품질 높이기

퀴즈는 학습 효과를 높이는 핵심 도구입니다. AI가 생성한 퀴즈의 품질을 높이는 방법을 알아봅시다.

## 좋은 퀴즈의 특징

1. **학습 목표와 연계**: 핵심 개념을 정확히 평가
2. **적절한 난이도**: 너무 쉽거나 어렵지 않게
3. **명확한 문항**: 모호하지 않은 질문
4. **좋은 오답 선택지**: 그럴듯하지만 명확히 구분 가능

## AI 퀴즈 검토 체크리스트

- [ ] 정답이 명확한가?
- [ ] 오답 선택지가 너무 쉽게 배제되지 않는가?
- [ ] 문항이 이중 부정이나 혼란스러운 표현을 포함하지 않는가?
- [ ] 난이도가 적절한가?

## 재생성 요청 팁

"퀴즈 난이도를 조금 높여주세요" 보다는
"실무 적용 시나리오 기반의 문제를 추가해주세요"처럼 구체적으로 요청하면 더 좋은 결과를 얻을 수 있습니다.
    `,
    category: "tips",
    author: "이콘텐츠",
    publishedAt: "2026-01-03",
    readTime: 4,
    thumbnail: "❓",
    tags: ["퀴즈", "팁", "품질"],
  },
  {
    id: "5",
    slug: "llm-comparison-for-education",
    title: "교육 콘텐츠 생성에 적합한 AI 모델 비교",
    excerpt: "Gemini, Claude, ChatGPT - 각 AI 모델의 특성과 교육 콘텐츠 생성에 적합한 상황을 비교합니다.",
    content: `
# 교육 콘텐츠 생성에 적합한 AI 모델 비교

Autopilot은 세 가지 AI 모델을 지원합니다. 각 모델의 특성을 알아봅시다.

## Google Gemini
- **강점**: 빠른 응답, 균형 잡힌 출력
- **적합한 경우**: 빠르게 초안을 만들고 싶을 때, 범용적인 콘텐츠

## Anthropic Claude
- **강점**: 깊이 있는 분석, 논리적 구조
- **적합한 경우**: 복잡한 주제, 전문적인 교육 콘텐츠

## OpenAI ChatGPT
- **강점**: 창의적 표현, 다양한 스타일
- **적합한 경우**: 흥미로운 표현이 필요한 콘텐츠, 스토리텔링

## 모델 선택 가이드

| 상황 | 추천 모델 |
|------|----------|
| 빠른 초안 필요 | Gemini |
| 기술 문서/전문 교육 | Claude |
| 워크숍/참여형 교육 | ChatGPT |

실제로 여러 모델로 생성해보고 비교하는 것을 권장합니다!
    `,
    category: "tips",
    author: "박AI",
    publishedAt: "2025-12-28",
    readTime: 5,
    thumbnail: "🤖",
    tags: ["AI 모델", "비교", "선택 가이드"],
  },
];

// ============================================================
// 컴포넌트
// ============================================================

function BlogCard({ post }: { post: BlogPost }) {
  return (
    <Card className="group hover:shadow-lg transition-all duration-300 overflow-hidden h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-3xl">{post.thumbnail}</span>
          <Badge variant="secondary">
            {BLOG_CATEGORIES.find(c => c.id === post.category)?.label}
          </Badge>
        </div>
        <CardTitle className="text-lg group-hover:text-primary transition-colors line-clamp-2">
          {post.title}
        </CardTitle>
        <CardDescription className="line-clamp-2">
          {post.excerpt}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col justify-end">
        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
          <span className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            {post.publishedAt}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            {post.readTime}분
          </span>
        </div>
        <Button variant="ghost" className="w-full justify-between group-hover:bg-primary group-hover:text-primary-foreground transition-colors" asChild>
          <Link to={`/blog/${post.slug}`}>
            자세히 읽기
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

function FeaturedPost({ post }: { post: BlogPost }) {
  return (
    <Card className="group overflow-hidden bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
      <div className="md:flex">
        <div className="md:w-1/3 flex items-center justify-center p-8 bg-primary/10">
          <span className="text-7xl">{post.thumbnail}</span>
        </div>
        <div className="md:w-2/3 p-6">
          <div className="flex items-center gap-2 mb-3">
            <Badge>추천</Badge>
            <Badge variant="outline">
              {BLOG_CATEGORIES.find(c => c.id === post.category)?.label}
            </Badge>
          </div>
          <h2 className="text-2xl font-bold mb-3 group-hover:text-primary transition-colors">
            {post.title}
          </h2>
          <p className="text-muted-foreground mb-4">
            {post.excerpt}
          </p>
          <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
            <span className="flex items-center gap-1">
              <User className="h-4 w-4" />
              {post.author}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              {post.publishedAt}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {post.readTime}분
            </span>
          </div>
          <Button asChild>
            <Link to={`/blog/${post.slug}`}>
              자세히 읽기
              <ArrowRight className="h-4 w-4 ml-2" />
            </Link>
          </Button>
        </div>
      </div>
    </Card>
  );
}

export default function BlogPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  const featuredPosts = BLOG_POSTS.filter(p => p.featured);
  
  const filteredPosts = BLOG_POSTS.filter((post) => {
    if (selectedCategory !== "all" && post.category !== selectedCategory) {
      return false;
    }
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        post.title.toLowerCase().includes(query) ||
        post.excerpt.toLowerCase().includes(query) ||
        post.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }
    return true;
  });

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
      <section className="py-12 bg-gradient-to-b from-muted/50 to-background">
        <div className="container mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary mb-6">
            <BookOpen className="h-4 w-4" />
            블로그
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-4">
            인사이트 & 업데이트
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
            AI 교육 콘텐츠 제작 팁, 최신 트렌드, 그리고 Autopilot의 새로운 소식을 만나보세요.
          </p>

          {/* 검색 */}
          <div className="max-w-xl mx-auto relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="search"
              placeholder="검색..."
              className="pl-12 h-12"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </section>

      {/* 카테고리 필터 */}
      <section className="py-6 border-b">
        <div className="container mx-auto px-4">
          <div className="flex flex-wrap justify-center gap-2">
            {BLOG_CATEGORIES.map((category) => {
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

      {/* 추천 글 */}
      {selectedCategory === "all" && !searchQuery && featuredPosts.length > 0 && (
        <section className="py-12">
          <div className="container mx-auto px-4">
            <h2 className="text-xl font-semibold mb-6">추천 글</h2>
            <div className="space-y-6">
              {featuredPosts.map((post) => (
                <FeaturedPost key={post.id} post={post} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 글 목록 */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          <h2 className="text-xl font-semibold mb-6">
            {selectedCategory === "all" ? "모든 글" : BLOG_CATEGORIES.find(c => c.id === selectedCategory)?.label}
            <span className="text-muted-foreground ml-2">({filteredPosts.length})</span>
          </h2>
          
          {filteredPosts.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Search className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">검색 결과가 없습니다</h3>
                <p className="text-muted-foreground mb-4">
                  다른 검색어나 카테고리를 시도해보세요.
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
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredPosts.map((post) => (
                <BlogCard key={post.id} post={post} />
              ))}
            </div>
          )}
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
