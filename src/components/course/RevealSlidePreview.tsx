/**
 * RevealSlidePreview 컴포넌트
 *
 * reveal.js 기반의 전문적인 슬라이드 프레젠테이션
 * 다양한 레이아웃, 전환 효과, 테마를 지원합니다.
 */

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ChevronLeft, ChevronRight, Maximize2, Minimize2,
  Download, FileText, Presentation
} from "lucide-react";
import { toast } from "sonner";
import Reveal from 'reveal.js';
import 'reveal.js/dist/reveal.css';
import 'reveal.js/dist/theme/white.css';
import 'reveal.js/dist/theme/black.css';
import 'reveal.js/dist/theme/league.css';
import 'reveal.js/dist/theme/beige.css';
import 'reveal.js/dist/theme/sky.css';
import 'reveal.js/dist/theme/night.css';
import 'reveal.js/dist/theme/serif.css';
import 'reveal.js/dist/theme/simple.css';
import 'reveal.js/dist/theme/solarized.css';

interface SlideContent {
  bulletPoints?: string[];
  text?: string;
  code?: string;
  quote?: string;
  imageUrl?: string;
  columns?: Array<{ title: string; content: string[] }>;
}

interface RevealSlide {
  slideNumber?: number;
  layout: 'title' | 'content' | 'two-column' | 'image-text' | 'quote' | 'code';
  title: string;
  subtitle?: string;
  content: SlideContent;
  speakerNotes?: string;
  backgroundClass?: string;
  transition?: 'slide' | 'fade' | 'convex' | 'concave' | 'zoom';
}

interface RevealSlideData {
  deckTitle?: string;
  theme?: 'white' | 'black' | 'league' | 'beige' | 'sky' | 'night' | 'serif' | 'simple' | 'solarized';
  slides: RevealSlide[];
}

interface RevealSlidePreviewProps {
  content: any;
  lessonTitle: string;
}

export const RevealSlidePreview = ({ content, lessonTitle }: RevealSlidePreviewProps) => {
  const [fullscreen, setFullscreen] = useState(false);
  const revealRef = useRef<HTMLDivElement>(null);
  const revealInstanceRef = useRef<Reveal.Api | null>(null);

  // 슬라이드 데이터 파싱
  const slideData: RevealSlideData = typeof content === 'string'
    ? JSON.parse(content)
    : content;

  const slides = slideData.slides || [];
  const deckTitle = slideData.deckTitle || lessonTitle;
  const theme = slideData.theme || 'white';

  // reveal.js 초기화
  useEffect(() => {
    if (revealRef.current && slides.length > 0) {
      // 기존 인스턴스 정리
      if (revealInstanceRef.current) {
        revealInstanceRef.current.destroy();
      }

      // 새 인스턴스 생성
      const deck = new Reveal(revealRef.current, {
        embedded: true,
        controls: true,
        progress: true,
        center: true,
        hash: false,
        transition: 'slide',
        width: 960,
        height: 700,
        margin: 0.1,
      });

      deck.initialize().then(() => {
        revealInstanceRef.current = deck;
      });

      return () => {
        if (revealInstanceRef.current) {
          revealInstanceRef.current.destroy();
          revealInstanceRef.current = null;
        }
      };
    }
  }, [slides]);

  const handleDownloadHTML = () => {
    try {
      // HTML 생성 (standalone reveal.js 프레젠테이션)
      const html = generateRevealHTML(slideData, lessonTitle);
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${lessonTitle}_presentation.html`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success("HTML 파일이 다운로드되었습니다.");
    } catch (error) {
      console.error("Error generating HTML:", error);
      toast.error("HTML 생성 중 오류가 발생했습니다.");
    }
  };

  const renderSlideContent = (slide: RevealSlide) => {
    const { layout, title, subtitle, content, backgroundClass } = slide;

    switch (layout) {
      case 'title':
        return (
          <section className={backgroundClass || ''} data-transition={slide.transition || 'slide'}>
            <h1>{title}</h1>
            {subtitle && <h3>{subtitle}</h3>}
            {slide.speakerNotes && (
              <aside className="notes">
                {slide.speakerNotes}
              </aside>
            )}
          </section>
        );

      case 'content':
        return (
          <section className={backgroundClass || ''} data-transition={slide.transition || 'slide'}>
            <h2>{title}</h2>
            {content.bulletPoints && content.bulletPoints.length > 0 && (
              <ul>
                {content.bulletPoints.map((point, idx) => (
                  <li key={idx}>{point}</li>
                ))}
              </ul>
            )}
            {content.text && <p>{content.text}</p>}
            {slide.speakerNotes && (
              <aside className="notes">
                {slide.speakerNotes}
              </aside>
            )}
          </section>
        );

      case 'two-column':
        return (
          <section className={backgroundClass || ''} data-transition={slide.transition || 'slide'}>
            <h2>{title}</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
              {content?.columns?.map((col, idx) => (
                <div key={idx}>
                  <h3>{col.title}</h3>
                  <ul>
                    {col.content?.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            {slide.speakerNotes && (
              <aside className="notes">
                {slide.speakerNotes}
              </aside>
            )}
          </section>
        );

      case 'quote':
        return (
          <section className={backgroundClass || ''} data-transition={slide.transition || 'slide'}>
            <h2>{title}</h2>
            <blockquote style={{ fontSize: '1.5em', fontStyle: 'italic', margin: '2rem 0' }}>
              {content.quote || content.text}
            </blockquote>
            {slide.speakerNotes && (
              <aside className="notes">
                {slide.speakerNotes}
              </aside>
            )}
          </section>
        );

      case 'code':
        return (
          <section className={backgroundClass || ''} data-transition={slide.transition || 'slide'}>
            <h2>{title}</h2>
            <pre><code>{content.code || content.text}</code></pre>
            {slide.speakerNotes && (
              <aside className="notes">
                {slide.speakerNotes}
              </aside>
            )}
          </section>
        );

      case 'image-text':
        return (
          <section className={backgroundClass || ''} data-transition={slide.transition || 'slide'}>
            <h2>{title}</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', alignItems: 'center' }}>
              {content.imageUrl && (
                <div>
                  <img src={content.imageUrl} alt={title} style={{ maxWidth: '100%' }} />
                </div>
              )}
              <div>
                {content.bulletPoints && (
                  <ul>
                    {content.bulletPoints.map((point, idx) => (
                      <li key={idx}>{point}</li>
                    ))}
                  </ul>
                )}
                {content.text && <p>{content.text}</p>}
              </div>
            </div>
            {slide.speakerNotes && (
              <aside className="notes">
                {slide.speakerNotes}
              </aside>
            )}
          </section>
        );

      default:
        return (
          <section className={backgroundClass || ''}>
            <h2>{title}</h2>
            <p>알 수 없는 레이아웃: {layout}</p>
          </section>
        );
    }
  };

  if (slides.length === 0) {
    return (
      <div className="min-h-[400px] flex items-center justify-center bg-slate-50 rounded-lg">
        <div className="text-center p-8">
          <Presentation className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-xl font-bold mb-2">슬라이드가 없습니다</h3>
          <p className="text-muted-foreground">
            슬라이드 콘텐츠를 생성해주세요.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`${fullscreen ? 'fixed inset-0 z-50 bg-black' : ''}`}>
      <div className={`${fullscreen ? 'h-screen' : ''} flex flex-col bg-slate-50`}>
        {/* 헤더 */}
        <div className={`${fullscreen ? 'bg-black/90 text-white' : 'bg-white'} px-6 py-4 border-b flex items-center justify-between`}>
          <div className="flex items-center gap-4">
            <Presentation className={`w-6 h-6 ${fullscreen ? 'text-blue-400' : 'text-blue-600'}`} />
            <div>
              <h3 className="font-bold text-lg">{deckTitle}</h3>
              <p className={`text-sm ${fullscreen ? 'text-gray-400' : 'text-muted-foreground'}`}>
                {slides.length}개 슬라이드 · {theme} 테마
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadHTML}
              className="gap-2"
            >
              <Download className="w-4 h-4" />
              HTML 다운로드
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setFullscreen(!fullscreen)}
            >
              {fullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        {/* reveal.js 프레젠테이션 */}
        <div className="flex-1 overflow-hidden">
          <div className="reveal" ref={revealRef} style={{ height: '100%' }}>
            <div className="slides">
              {slides.map((slide, index) => (
                <div key={index}>
                  {renderSlideContent(slide)}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Standalone HTML 생성 함수
function generateRevealHTML(slideData: RevealSlideData, lessonTitle: string): string {
  const theme = slideData.theme || 'white';
  const slides = slideData.slides || [];
  const deckTitle = slideData.deckTitle || lessonTitle;

  const slidesHTML = slides.map(slide => {
    const { layout, title, subtitle, content, backgroundClass, transition, speakerNotes } = slide;

    let slideContent = '';

    switch (layout) {
      case 'title':
        slideContent = `
          <h1>${title}</h1>
          ${subtitle ? `<h3>${subtitle}</h3>` : ''}
        `;
        break;

      case 'content':
        slideContent = `
          <h2>${title}</h2>
          ${content.bulletPoints ? `<ul>${content.bulletPoints.map(p => `<li>${p}</li>`).join('')}</ul>` : ''}
          ${content.text ? `<p>${content.text}</p>` : ''}
        `;
        break;

      case 'two-column':
        slideContent = `
          <h2>${title}</h2>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem;">
            ${content?.columns ? content.columns.map(col => `
              <div>
                <h3>${col?.title || ''}</h3>
                <ul>${col?.content?.map(item => `<li>${item}</li>`).join('') || ''}</ul>
              </div>
            `).join('') : ''}
          </div>
        `;
        break;

      case 'quote':
        slideContent = `
          <h2>${title}</h2>
          <blockquote style="font-size: 1.5em; font-style: italic; margin: 2rem 0;">
            ${content.quote || content.text}
          </blockquote>
        `;
        break;

      case 'code':
        slideContent = `
          <h2>${title}</h2>
          <pre><code>${content.code || content.text}</code></pre>
        `;
        break;

      case 'image-text':
        slideContent = `
          <h2>${title}</h2>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; align-items: center;">
            ${content.imageUrl ? `<div><img src="${content.imageUrl}" alt="${title}" style="max-width: 100%;" /></div>` : ''}
            <div>
              ${content.bulletPoints ? `<ul>${content.bulletPoints.map(p => `<li>${p}</li>`).join('')}</ul>` : ''}
              ${content.text ? `<p>${content.text}</p>` : ''}
            </div>
          </div>
        `;
        break;
    }

    return `
      <section class="${backgroundClass || ''}" data-transition="${transition || 'slide'}">
        ${slideContent}
        ${speakerNotes ? `<aside class="notes">${speakerNotes}</aside>` : ''}
      </section>
    `;
  }).join('\n');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${deckTitle}</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/reveal.js@5.0.4/dist/reset.css">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/reveal.js@5.0.4/dist/reveal.css">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/reveal.js@5.0.4/dist/theme/${theme}.css">
</head>
<body>
  <div class="reveal">
    <div class="slides">
      ${slidesHTML}
    </div>
  </div>

  <script src="https://cdn.jsdelivr.net/npm/reveal.js@5.0.4/dist/reveal.js"></script>
  <script>
    Reveal.initialize({
      controls: true,
      progress: true,
      center: true,
      hash: true,
      transition: 'slide'
    });
  </script>
</body>
</html>`;
}
