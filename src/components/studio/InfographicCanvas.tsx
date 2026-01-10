import { useEffect, useMemo, useRef, useState } from "react";
import { wrapText } from "@/components/studio/canvasText";

type InfographicJson = {
  title?: string;
  subtitle?: string;
  palette?: string[];
  sections?: Array<{ heading: string; bullets: string[]; iconHint?: string }>;
};

export function InfographicCanvas({
  data,
  assets,
}: {
  data?: InfographicJson | null;
  assets?: any;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(900);

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

  const palette = useMemo(() => {
    const p = data?.palette;
    if (Array.isArray(p) && p.length) return p;
    return ["#111827", "#0ea5e9", "#22c55e", "#f59e0b"];
  }, [data?.palette]);

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

    // background
    ctx.clearRect(0, 0, width, height);
    const bg = assets?.background?.dataUrl as string | undefined;
    const drawBase = () => {
      const grad = ctx.createLinearGradient(0, 0, width, height);
      grad.addColorStop(0, palette[0] || "#111827");
      grad.addColorStop(0.55, palette[1] || "#0ea5e9");
      grad.addColorStop(1, palette[2] || "#22c55e");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      // overlay card
      ctx.fillStyle = "rgba(255,255,255,0.92)";
      ctx.strokeStyle = "rgba(0,0,0,0.08)";
      ctx.lineWidth = 1;
      const pad = 18;
      const r = 16;
      roundRect(ctx, pad, pad, width - pad * 2, height - pad * 2, r);
      ctx.fill();
      ctx.stroke();
    };

    if (bg) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, width, height);
        // soften
        ctx.fillStyle = "rgba(255,255,255,0.7)";
        ctx.fillRect(0, 0, width, height);
        drawBase();
        drawContent();
      };
      img.onerror = () => {
        drawBase();
        drawContent();
      };
      img.src = bg;
    } else {
      drawBase();
      drawContent();
    }

    function drawContent() {
      const pad = 34;
      let x = pad;
      let y = pad + 10;
      const maxW = width - pad * 2;

      // title
      ctx.fillStyle = "#0b1220";
      ctx.font = "700 24px system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
      y = wrapText(ctx, data?.title || "Infographic Preview", x, y, maxW, 28, 2);

      // subtitle
      if (data?.subtitle) {
        ctx.fillStyle = "rgba(11,18,32,0.7)";
        ctx.font = "500 14px system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
        y = wrapText(ctx, data.subtitle, x, y + 6, maxW, 18, 2);
      }

      y += 14;

      const sections = Array.isArray(data?.sections) ? data!.sections! : [];
      if (!sections.length) {
        ctx.fillStyle = "rgba(11,18,32,0.65)";
        ctx.font = "500 14px system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
        wrapText(ctx, "인포그래픽 설계(JSON)가 아직 없습니다.", x, y, maxW, 18, 3);
        return;
      }

      // grid: 2 columns
      const cols = width >= 760 ? 2 : 1;
      const gap = 14;
      const boxW = cols === 2 ? (maxW - gap) / 2 : maxW;
      let col = 0;
      let rowY = y;
      let nextRowY = y;

      for (const s of sections.slice(0, 6)) {
        const bx = x + col * (boxW + gap);
        const by = rowY;
        const boxH = 120;

        // box
        ctx.fillStyle = "rgba(255,255,255,0.95)";
        ctx.strokeStyle = "rgba(0,0,0,0.08)";
        roundRect(ctx, bx, by, boxW, boxH, 12);
        ctx.fill();
        ctx.stroke();

        // heading
        ctx.fillStyle = "#0b1220";
        ctx.font = "700 14px system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
        wrapText(ctx, s.heading || "Section", bx + 12, by + 20, boxW - 24, 18, 1);

        // bullets
        ctx.fillStyle = "rgba(11,18,32,0.78)";
        ctx.font = "500 12px system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
        let yy = by + 42;
        const bullets = Array.isArray(s.bullets) ? s.bullets.slice(0, 4) : [];
        for (const b of bullets) {
          ctx.fillText("•", bx + 12, yy);
          yy = wrapText(ctx, b, bx + 26, yy, boxW - 38, 16, 2);
          yy += 2;
        }

        nextRowY = Math.max(nextRowY, by + boxH + gap);
        col++;
        if (col >= cols) {
          col = 0;
          rowY = nextRowY;
        }
      }

      // sources badge
      const sources = assets?.sources;
      if (Array.isArray(sources) && sources.length) {
        const text = `Sources: ${sources.length}`;
        ctx.font = "600 11px system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
        const m = ctx.measureText(text);
        const bx = width - pad - m.width - 18;
        const by = height - pad + 2;
        ctx.fillStyle = "rgba(11,18,32,0.08)";
        roundRect(ctx, bx, by, m.width + 18, 18, 9);
        ctx.fill();
        ctx.fillStyle = "rgba(11,18,32,0.8)";
        ctx.fillText(text, bx + 9, by + 13);
      }
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
  }, [assets?.background?.dataUrl, assets?.sources, data, height, palette, width]);

  return (
    <div ref={containerRef} className="w-full">
      <canvas ref={canvasRef} className="block w-full rounded-lg border bg-white" />
    </div>
  );
}

