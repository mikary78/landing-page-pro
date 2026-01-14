import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { wrapText } from "@/components/studio/canvasText";
import { ChevronLeft, ChevronRight } from "lucide-react";

type SlidesJson = {
  deckTitle?: string;
  deckTheme?: {
    style?: "default" | "minimal" | "creative" | "gamma" | "canva";
    palette?: {
      primary?: string;
      secondary?: string;
      background?: string;
      text?: string;
      mutedText?: string;
    };
    background?: { type?: "solid" | "gradient" | "image" };
  };
  slides?: Array<{
    title: string;
    bullets: string[];
    speakerNotes?: string;
    visualHint?: string;
    layoutType?:
      | "title_slide"
      | "section_header"
      | "title_and_content"
      | "two_column"
      | "content_with_image"
      | "diagram_slide"
      | "conclusion"
      | "sources";
    image?: { dataUrl?: string; searchKeywords?: string };
    diagram?: { dataUrl?: string; caption?: string };
  }>;
  sources?: Array<{ id: number; title?: string; url: string }>;
};

export function SlidesCanvas({
  data,
  assets,
}: {
  data?: SlidesJson | null;
  assets?: any;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(900);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect?.width;
      if (w) setWidth(Math.max(320, Math.floor(w)));
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  const height = 520;
  const slides = useMemo(() => {
    const base = Array.isArray(data?.slides) ? data!.slides! : [];
    const hasSourcesSlide = base.some((s) => {
      const t = (s?.title || "").trim().toLowerCase();
      return t === "sources" || t === "출처";
    });

    // Backward compatibility: older artifacts may not include Sources slide yet.
    if (hasSourcesSlide) return base;

    const deckSources = Array.isArray((data as any)?.sources) ? (data as any).sources : [];
    const bullets =
      deckSources.length > 0
        ? deckSources.slice(0, 12).map((s: any) => `[${s.id}] ${s.title ? `${s.title} - ` : ""}${s.url}`)
        : ["웹 검색 결과가 없습니다. (TAVILY_API_KEY/SERPER_API_KEY 미설정 가능)"];

    return [
      ...base,
      {
        title: "Sources",
        bullets,
        speakerNotes:
          deckSources.length > 0
            ? "출처 목록 페이지입니다. 앞 슬라이드의 [n] 인용은 본 페이지의 Sources와 매칭됩니다."
            : "웹 검색 결과가 없어 출처를 표시할 수 없습니다.",
        visualHint: "Clean list layout with small font and plenty of whitespace.",
      },
    ];
  }, [data]);
  const current = slides[idx] || null;

  useEffect(() => {
    if (idx > 0 && idx >= slides.length) setIdx(0);
  }, [idx, slides.length]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    ctx.clearRect(0, 0, width, height);

    const style = (data as any)?.deckTheme?.style as string | undefined;
    const palette = (data as any)?.deckTheme?.palette || {};
    const bgColor = palette.background || (style === "minimal" ? "#ffffff" : "#0b1220");
    const textColor = palette.text || "#0b1220";
    const mutedText = palette.mutedText || "rgba(17,24,39,0.62)";
    const primary = palette.primary || (style === "creative" || style === "canva" ? "#f97316" : "#2563eb");
    const secondary = palette.secondary || (style === "gamma" ? "#6366f1" : "#64748b");

    // slide background
    const bg = assets?.background?.dataUrl as string | undefined;
    const drawBg = () => {
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, width, height);
      if (style !== "minimal") {
        const grad = ctx.createLinearGradient(0, 0, width, height);
        grad.addColorStop(0, "rgba(255,255,255,0.10)");
        grad.addColorStop(1, "rgba(255,255,255,0.02)");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);

        // Gamma/Canva 느낌 장식(상단 좌/하단 우)
        ctx.save();
        ctx.globalAlpha = 0.18;
        ctx.fillStyle = secondary;
        ctx.beginPath();
        ctx.arc(-40, -20, 180, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = primary;
        ctx.beginPath();
        ctx.arc(width + 40, height + 20, 200, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // inner content area
      ctx.fillStyle = "rgba(255,255,255,0.92)";
      ctx.strokeStyle = "rgba(0,0,0,0.10)";
      roundRect(ctx, 18, 18, width - 36, height - 36, 16);
      ctx.fill();
      ctx.stroke();

      // top accent bar
      ctx.fillStyle = primary;
      ctx.globalAlpha = 0.22;
      ctx.fillRect(18, 18, width - 36, 8);
      ctx.globalAlpha = 1;
    };

    if (bg) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, width, height);
        ctx.fillStyle = "rgba(255,255,255,0.65)";
        ctx.fillRect(0, 0, width, height);
        drawBg();
        drawContent();
      };
      img.onerror = () => {
        drawBg();
        drawContent();
      };
      img.src = bg;
    } else {
      drawBg();
      drawContent();
    }

    function drawContent() {
      const pad = 34;
      const x = pad;
      let y = pad + 12;
      const maxW = width - pad * 2;

      ctx.fillStyle = textColor;
      ctx.font = "700 20px system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
      wrapText(ctx, data?.deckTitle || "Slide Deck", x, y, maxW, 26, 1);

      y += 36;

      if (!current) {
        ctx.fillStyle = "rgba(11,18,32,0.65)";
        ctx.font = "500 14px system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
        wrapText(ctx, "슬라이드 산출물이 아직 없습니다.", x, y, maxW, 18, 3);
        return;
      }

      const layout = (current as any)?.layoutType as string | undefined;

      // 레이아웃별 렌더 (Canva/Gamma 느낌)
      if (layout === "section_header") {
        ctx.fillStyle = "#111827";
        ctx.font = "900 46px system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
        y = wrapText(ctx, current.title || `Section`, x, y + 40, maxW, 54, 2);
        y += 10;
        ctx.fillStyle = mutedText;
        ctx.font = "600 16px system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
        const hint = (current.bullets || []).slice(0, 2).join(" · ");
        if (hint) wrapText(ctx, hint, x, y, maxW, 22, 2);
      } else if (layout === "title_slide") {
        ctx.fillStyle = "#0b1220";
        ctx.font = "900 52px system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
        y = wrapText(ctx, current.title || data?.deckTitle || "Title", x, y + 40, maxW, 60, 2);
        y += 10;
        ctx.fillStyle = mutedText;
        ctx.font = "600 18px system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
        const sub = (current.bullets || [])[0];
        if (sub) wrapText(ctx, sub, x, y, maxW, 24, 2);
      } else if (layout === "content_with_image" || layout === "two_column" || layout === "diagram_slide") {
        // Title
        ctx.fillStyle = "#111827";
        ctx.font = "900 26px system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
        y = wrapText(ctx, current.title || `Slide ${idx + 1}`, x, y, maxW, 32, 2);
        y += 10;

        // Content grid
        const leftW = Math.floor(maxW * 0.58);
        const rightW = maxW - leftW - 14;
        const leftX = x;
        const rightX = x + leftW + 14;
        const boxY = y;
        const boxH = 300;

        // left card
        ctx.fillStyle = "rgba(255,255,255,1)";
        ctx.strokeStyle = "rgba(2,6,23,0.08)";
        roundRect(ctx, leftX, boxY, leftW, boxH, 14);
        ctx.fill();
        ctx.stroke();

        // right placeholder
        ctx.fillStyle = "rgba(2,6,23,0.05)";
        ctx.strokeStyle = "rgba(2,6,23,0.10)";
        roundRect(ctx, rightX, boxY, rightW, boxH, 14);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = mutedText;
        ctx.font = "700 12px system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
        ctx.fillText(
          layout === "diagram_slide" ? "DIAGRAM" : "IMAGE",
          rightX + 14,
          boxY + 22
        );

        // bullets (left)
        let by = boxY + 24;
        ctx.fillStyle = "rgba(17,24,39,0.82)";
        ctx.font = "600 14px system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
        for (const b of (current.bullets || []).slice(0, 6)) {
          ctx.fillText("•", leftX + 16, by);
          by = wrapText(ctx, b, leftX + 32, by, leftW - 46, 20, 2);
          by += 6;
        }
      } else {
        // title_and_content / conclusion / sources 등: 기본 카드형
        ctx.fillStyle = "#111827";
        ctx.font = "900 26px system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
        y = wrapText(ctx, current.title || `Slide ${idx + 1}`, x, y, maxW, 32, 2);
        y += 10;

        ctx.fillStyle = "rgba(17,24,39,0.82)";
        ctx.font = "600 14px system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
        for (const b of (current.bullets || []).slice(0, 7)) {
          ctx.fillText("•", x, y);
          y = wrapText(ctx, b, x + 16, y, maxW - 16, 20, 2);
          y += 4;
        }
      }

      // visual hint / notes
      const hint = current.visualHint || "";
      if (hint) {
        y += 10;
        ctx.fillStyle = mutedText;
        ctx.font = "500 12px system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
        wrapText(ctx, `Visual hint: ${hint}`, x, y, maxW, 16, 3);
      }

      // footer
      ctx.fillStyle = "rgba(17,24,39,0.55)";
      ctx.font = "600 11px system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
      ctx.fillText(`Slide ${idx + 1} / ${slides.length}`, width - pad - 90, height - pad + 6);
    }

    function roundRect(
      c: CanvasRenderingContext2D,
      x: number,
      y: number,
      w: number,
      h: number,
      r: number
    ) {
      const rr = Math.min(r, w / 2, h / 2);
      c.beginPath();
      c.moveTo(x + rr, y);
      c.lineTo(x + w - rr, y);
      c.quadraticCurveTo(x + w, y, x + w, y + rr);
      c.lineTo(x + w, y + h - rr);
      c.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
      c.lineTo(x + rr, y + h);
      c.quadraticCurveTo(x, y + h, x, y + h - rr);
      c.lineTo(x, y + rr);
      c.quadraticCurveTo(x, y, x + rr, y);
      c.closePath();
    }
  }, [assets?.background?.dataUrl, current, data?.deckTitle, height, idx, slides, width]);

  return (
    <div ref={containerRef} className="w-full space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {slides.length ? `Slide ${idx + 1} / ${slides.length}` : "슬라이드 없음"}
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIdx((v) => Math.max(0, v - 1))}
            disabled={idx <= 0}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIdx((v) => Math.min(slides.length - 1, v + 1))}
            disabled={idx >= slides.length - 1}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <canvas ref={canvasRef} className="block w-full rounded-lg border bg-white" />
    </div>
  );
}

