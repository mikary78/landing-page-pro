/**
 * SlidePreview 컴포넌트
 *
 * 생성된 슬라이드를 프레젠테이션 형식으로 미리보기
 * 구형 (simple) 및 신형 (reveal.js) 형식 모두 지원
 */

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ChevronLeft, ChevronRight, Maximize2, Minimize2,
  Download, FileText, Presentation
} from "lucide-react";
import PptxGenJS from 'pptxgenjs';
import { toast } from "sonner";
import { RevealSlidePreview } from "./RevealSlidePreview";

interface Slide {
  slideNumber?: number;
  title: string;
  bulletPoints?: string[];
  speakerNotes?: string;
  content?: string;
  // reveal.js format fields
  layout?: string;
  subtitle?: string;
}

interface SlideContent {
  deckTitle?: string;
  theme?: string;
  slides: Slide[];
}

interface SlidePreviewProps {
  content: any;
  lessonTitle: string;
}

export const SlidePreview = ({ content, lessonTitle }: SlidePreviewProps) => {
  // 슬라이드 데이터 파싱
  const slideData: SlideContent = typeof content === 'string'
    ? JSON.parse(content)
    : content;

  const slides = slideData.slides || [];
  const deckTitle = slideData.deckTitle || lessonTitle;

  // 신형 reveal.js 형식인지 확인
  const isRevealFormat = slideData.theme || (slides.length > 0 && slides[0].layout);

  // reveal.js 형식이면 RevealSlidePreview 사용 (조기 반환)
  if (isRevealFormat) {
    return <RevealSlidePreview content={content} lessonTitle={lessonTitle} />;
  }

  // 이하는 구형 SlidePreview 컴포넌트로 분리
  return <LegacySlidePreview slides={slides} deckTitle={deckTitle} lessonTitle={lessonTitle} />;
};

// 구형 슬라이드 프리뷰 컴포넌트
const LegacySlidePreview = ({ slides, deckTitle, lessonTitle }: { slides: Slide[], deckTitle: string, lessonTitle: string }) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);

  const handlePrevSlide = useCallback(() => {
    setCurrentSlide(prev => Math.max(0, prev - 1));
  }, []);

  const handleNextSlide = useCallback(() => {
    setCurrentSlide(prev => Math.min(slides.length - 1, prev + 1));
  }, []);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'ArrowLeft') handlePrevSlide();
    if (e.key === 'ArrowRight') handleNextSlide();
    if (e.key === 'Escape') setFullscreen(false);
  }, [handlePrevSlide, handleNextSlide]);

  // 키보드 이벤트 리스너
  useEffect(() => {
    if (fullscreen) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [fullscreen, handleKeyDown]);

  const handleDownloadPPTX = () => {
    try {
      const pptx = new PptxGenJS();

      // 제목 슬라이드
      const titleSlide = pptx.addSlide();
      titleSlide.background = { color: 'F1F5F9' };
      titleSlide.addText(deckTitle, {
        x: 0.5, y: 2, w: 9, h: 1.5,
        fontSize: 44, bold: true, color: '1e293b', align: 'center'
      });

      // 콘텐츠 슬라이드들
      slides.forEach((slide) => {
        const contentSlide = pptx.addSlide();
        contentSlide.background = { color: 'FFFFFF' };

        // 슬라이드 제목
        contentSlide.addText(slide.title, {
          x: 0.5, y: 0.5, w: 9, h: 0.8,
          fontSize: 32, bold: true, color: '1e293b'
        });

        // 불렛 포인트
        if (slide.bulletPoints && slide.bulletPoints.length > 0) {
          const bulletText = slide.bulletPoints.map(point => ({
            text: point,
            options: { bullet: true, fontSize: 18, color: '475569' }
          }));

          contentSlide.addText(bulletText, {
            x: 0.5, y: 1.5, w: 9, h: 4
          });
        }

        // 발표자 노트
        if (slide.speakerNotes) {
          contentSlide.addNotes(slide.speakerNotes);
        }
      });

      pptx.writeFile({ fileName: `${lessonTitle}_슬라이드.pptx` });
      toast.success("PPT 파일이 다운로드되었습니다.");
    } catch (error) {
      console.error("Error generating PPTX:", error);
      toast.error("PPT 생성 중 오류가 발생했습니다.");
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

  const currentSlideData = slides[currentSlide];

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
                슬라이드 {currentSlide + 1} / {slides.length}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadPPTX}
              className="gap-2"
            >
              <Download className="w-4 h-4" />
              PPT 다운로드
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

        {/* 슬라이드 콘텐츠 */}
        <div className={`flex-1 flex items-center justify-center p-8 ${fullscreen ? 'bg-black' : ''}`}>
          <div className={`w-full max-w-5xl ${fullscreen ? 'h-full' : ''} bg-white rounded-2xl shadow-2xl overflow-hidden`}>
            <div className={`${fullscreen ? 'h-full' : 'aspect-video'} p-12 flex flex-col justify-center relative`}>
              {/* 슬라이드 번호 */}
              <Badge
                variant="secondary"
                className="absolute top-4 right-4"
              >
                {currentSlideData.slideNumber || currentSlide + 1}
              </Badge>

              {/* 슬라이드 제목 */}
              <h2 className={`${fullscreen ? 'text-5xl' : 'text-4xl'} font-bold mb-8 text-slate-900`}>
                {currentSlideData.title}
              </h2>

              {/* 불렛 포인트 */}
              {currentSlideData.bulletPoints && currentSlideData.bulletPoints.length > 0 && (
                <ul className="space-y-4">
                  {currentSlideData.bulletPoints.map((point, idx) => (
                    <li
                      key={idx}
                      className={`flex items-start ${fullscreen ? 'text-2xl' : 'text-xl'} text-slate-700`}
                    >
                      <span className="inline-block w-2 h-2 rounded-full bg-blue-600 mr-4 mt-3 flex-shrink-0"></span>
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              )}

              {/* 콘텐츠 (불렛 포인트가 없을 경우) */}
              {!currentSlideData.bulletPoints && currentSlideData.content && (
                <div className={`${fullscreen ? 'text-2xl' : 'text-xl'} text-slate-700 leading-relaxed`}>
                  {currentSlideData.content}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 발표자 노트 (풀스크린 아닐 때만) */}
        {!fullscreen && currentSlideData.speakerNotes && (
          <div className="bg-slate-100 px-6 py-4 border-t">
            <div className="max-w-5xl mx-auto">
              <div className="flex items-start gap-2">
                <FileText className="w-4 h-4 text-slate-500 mt-1" />
                <div>
                  <p className="text-sm font-medium text-slate-600 mb-1">발표자 노트</p>
                  <p className="text-sm text-slate-500">{currentSlideData.speakerNotes}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 네비게이션 */}
        <div className={`${fullscreen ? 'bg-black/90' : 'bg-white'} px-6 py-4 border-t`}>
          <div className="max-w-5xl mx-auto flex items-center justify-between">
            <Button
              variant={fullscreen ? "secondary" : "outline"}
              onClick={handlePrevSlide}
              disabled={currentSlide === 0}
              className="gap-2"
            >
              <ChevronLeft className="w-4 h-4" />
              이전
            </Button>

            {/* 슬라이드 인디케이터 */}
            <div className="flex gap-2">
              {slides.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentSlide(idx)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    idx === currentSlide
                      ? 'bg-blue-600 w-8'
                      : fullscreen ? 'bg-gray-600 hover:bg-gray-500' : 'bg-slate-300 hover:bg-slate-400'
                  }`}
                  aria-label={`슬라이드 ${idx + 1}`}
                />
              ))}
            </div>

            <Button
              variant={fullscreen ? "secondary" : "outline"}
              onClick={handleNextSlide}
              disabled={currentSlide === slides.length - 1}
              className="gap-2"
            >
              다음
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
