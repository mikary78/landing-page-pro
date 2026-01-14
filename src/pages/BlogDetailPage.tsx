/**
 * BlogDetailPage - 블로그 상세 페이지
 * 
 * 개별 블로그 글 내용 표시
 * Markdown 렌더링 지원
 * 
 * 작성일: 2026-01-11
 */

import { useParams, Link, Navigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { 
  ChevronLeft, Calendar, User, Clock, 
  ArrowLeft, ArrowRight, Share2
} from "lucide-react";
import { BLOG_POSTS, BlogPost } from "./BlogPage";
import { toast } from "sonner";
import logo from "/logo.svg";

export default function BlogDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  
  const post = BLOG_POSTS.find(p => p.slug === slug);
  
  if (!post) {
    return <Navigate to="/blog" replace />;
  }

  // 이전/다음 글
  const currentIndex = BLOG_POSTS.findIndex(p => p.id === post.id);
  const prevPost = currentIndex > 0 ? BLOG_POSTS[currentIndex - 1] : null;
  const nextPost = currentIndex < BLOG_POSTS.length - 1 ? BLOG_POSTS[currentIndex + 1] : null;

  // 관련 글 (같은 카테고리)
  const relatedPosts = BLOG_POSTS.filter(p => p.category === post.category && p.id !== post.id).slice(0, 2);

  const handleShare = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({
          title: post.title,
          text: post.excerpt,
          url,
        });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success("링크가 복사되었습니다!");
      }
    } catch (error) {
      console.error("Share failed:", error);
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
                <Link to="/blog">
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  블로그
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* 글 헤더 */}
      <section className="py-12 bg-gradient-to-b from-muted/50 to-background">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <div className="text-5xl mb-6">{post.thumbnail}</div>
            <Badge className="mb-4">{post.category === "tips" ? "활용 팁" : post.category === "updates" ? "업데이트" : "AI 트렌드"}</Badge>
            <h1 className="text-3xl md:text-4xl font-bold mb-4">
              {post.title}
            </h1>
            <p className="text-lg text-muted-foreground mb-6">
              {post.excerpt}
            </p>
            <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground">
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
          </div>
        </div>
      </section>

      {/* 글 본문 */}
      <article className="py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            {/* 공유 버튼 */}
            <div className="flex justify-end mb-6">
              <Button variant="outline" size="sm" onClick={handleShare}>
                <Share2 className="h-4 w-4 mr-2" />
                공유
              </Button>
            </div>

            {/* Markdown 콘텐츠 */}
            <div className="prose prose-lg dark:prose-invert max-w-none">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  h1: ({ children }) => (
                    <h1 className="text-3xl font-bold mt-8 mb-4">{children}</h1>
                  ),
                  h2: ({ children }) => (
                    <h2 className="text-2xl font-semibold mt-8 mb-4 pb-2 border-b">{children}</h2>
                  ),
                  h3: ({ children }) => (
                    <h3 className="text-xl font-semibold mt-6 mb-3">{children}</h3>
                  ),
                  p: ({ children }) => (
                    <p className="mb-4 leading-relaxed text-muted-foreground">{children}</p>
                  ),
                  ul: ({ children }) => (
                    <ul className="list-disc list-inside mb-4 space-y-2">{children}</ul>
                  ),
                  ol: ({ children }) => (
                    <ol className="list-decimal list-inside mb-4 space-y-2">{children}</ol>
                  ),
                  li: ({ children }) => (
                    <li className="text-muted-foreground">{children}</li>
                  ),
                  strong: ({ children }) => (
                    <strong className="font-semibold text-foreground">{children}</strong>
                  ),
                  blockquote: ({ children }) => (
                    <blockquote className="border-l-4 border-primary pl-4 italic my-4 text-muted-foreground">
                      {children}
                    </blockquote>
                  ),
                  code: ({ className, children }) => {
                    const isInline = !className;
                    if (isInline) {
                      return (
                        <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono">
                          {children}
                        </code>
                      );
                    }
                    return (
                      <code className="block bg-muted p-4 rounded-lg text-sm font-mono overflow-x-auto my-4">
                        {children}
                      </code>
                    );
                  },
                  table: ({ children }) => (
                    <div className="overflow-x-auto my-6">
                      <table className="min-w-full border-collapse border border-border">
                        {children}
                      </table>
                    </div>
                  ),
                  th: ({ children }) => (
                    <th className="border border-border bg-muted px-4 py-2 text-left font-semibold">
                      {children}
                    </th>
                  ),
                  td: ({ children }) => (
                    <td className="border border-border px-4 py-2">
                      {children}
                    </td>
                  ),
                  hr: () => <Separator className="my-8" />,
                }}
              >
                {post.content}
              </ReactMarkdown>
            </div>

            {/* 태그 */}
            <div className="flex flex-wrap gap-2 mt-8 pt-8 border-t">
              {post.tags.map((tag) => (
                <Badge key={tag} variant="outline">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </article>

      {/* 이전/다음 글 */}
      <section className="py-8 border-t">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <div className="grid md:grid-cols-2 gap-4">
              {prevPost ? (
                <Link to={`/blog/${prevPost.slug}`} className="group">
                  <Card className="h-full hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                        <ArrowLeft className="h-4 w-4" />
                        이전 글
                      </div>
                      <p className="font-medium group-hover:text-primary transition-colors line-clamp-2">
                        {prevPost.title}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              ) : (
                <div />
              )}
              
              {nextPost && (
                <Link to={`/blog/${nextPost.slug}`} className="group">
                  <Card className="h-full hover:shadow-md transition-shadow">
                    <CardContent className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2 text-sm text-muted-foreground mb-2">
                        다음 글
                        <ArrowRight className="h-4 w-4" />
                      </div>
                      <p className="font-medium group-hover:text-primary transition-colors line-clamp-2">
                        {nextPost.title}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 관련 글 */}
      {relatedPosts.length > 0 && (
        <section className="py-12 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-xl font-semibold mb-6">관련 글</h2>
              <div className="grid md:grid-cols-2 gap-4">
                {relatedPosts.map((relatedPost) => (
                  <Link key={relatedPost.id} to={`/blog/${relatedPost.slug}`} className="group">
                    <Card className="h-full hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <span className="text-2xl">{relatedPost.thumbnail}</span>
                          <div>
                            <p className="font-medium group-hover:text-primary transition-colors line-clamp-2 mb-1">
                              {relatedPost.title}
                            </p>
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {relatedPost.excerpt}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="py-12">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-xl font-semibold mb-4">Autopilot을 시작해보세요</h2>
          <p className="text-muted-foreground mb-6">
            AI로 교육 콘텐츠를 빠르고 쉽게 만들어보세요.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild>
              <Link to="/auth">무료로 시작하기</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/blog">
                <ArrowLeft className="h-4 w-4 mr-2" />
                블로그로 돌아가기
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
