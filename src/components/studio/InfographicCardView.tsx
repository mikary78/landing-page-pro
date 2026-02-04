import { useRef, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Download, ChevronLeft, ChevronRight, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface InfographicSection {
  heading?: string;
  title?: string;
  bullets?: string[];
  items?: string[];
  content?: string;
  iconHint?: string;
}

interface InfographicData {
  title?: string;
  subtitle?: string;
  description?: string;
  palette?: string[];
  sections?: InfographicSection[];
  diagram?: string;
}

interface InfographicCardViewProps {
  data?: InfographicData | null;
  assets?: any;
  enableDownload?: boolean;
}

const DEFAULT_PALETTE = [
  "#6366f1", "#8b5cf6", "#a855f7", "#d946ef",
  "#ec4899", "#f43f5e", "#f97316", "#eab308",
];

const ICON_MAP: Record<string, string> = {
  target: "🎯", goal: "🎯", objective: "🎯",
  book: "📚", study: "📚", learn: "📚", education: "📚",
  tool: "🛠️", tools: "🛠️", practice: "🛠️",
  chart: "📊", data: "📊", analysis: "📊", metric: "📊",
  idea: "💡", tip: "💡", insight: "💡",
  people: "👥", team: "👥", group: "👥", audience: "👥",
  check: "✅", done: "✅", complete: "✅",
  clock: "⏰", time: "⏰", schedule: "⏰",
  star: "⭐", key: "🔑", warning: "⚠️",
  rocket: "🚀", start: "🚀", launch: "🚀",
  camera: "📷", video: "🎬", media: "🎬",
  phone: "📱", mobile: "📱", app: "📱",
  link: "🔗", web: "🌐", internet: "🌐",
};

function getIconForHint(hint?: string): string {
  if (!hint) return "📌";
  const lower = hint.toLowerCase();
  for (const [key, icon] of Object.entries(ICON_MAP)) {
    if (lower.includes(key)) return icon;
  }
  return "📌";
}

export function InfographicCardView({ data, assets, enableDownload = true }: InfographicCardViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const palette = useMemo(() => {
    return data?.palette?.length ? data.palette : DEFAULT_PALETTE;
  }, [data?.palette]);

  const sections = useMemo(() => {
    if (!data?.sections || !Array.isArray(data.sections)) return [];
    return data.sections.map((s) => ({
      heading: s.heading || s.title || "섹션",
      bullets: s.bullets || s.items || (s.content ? [s.content] : []),
      iconHint: s.iconHint,
    }));
  }, [data?.sections]);

  const scroll = useCallback((direction: "left" | "right") => {
    if (!scrollRef.current) return;
    const amount = 320;
    scrollRef.current.scrollBy({
      left: direction === "left" ? -amount : amount,
      behavior: "smooth",
    });
  }, []);

  const handleDownloadHTML = useCallback(() => {
    if (!data) return;
    const html = generateInfographicHTML(data, sections, palette);
    const blob = new Blob([html], { type: "text/html; charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${data.title || "infographic"}.html`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("HTML 파일이 다운로드되었습니다.");
  }, [data, sections, palette]);

  if (!data || sections.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>인포그래픽 데이터가 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-blue-950/30 dark:via-indigo-950/30 dark:to-purple-950/30 rounded-2xl p-6 pb-2">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            {data.title && (
              <h2 className="text-2xl font-bold text-foreground mb-1">
                {data.title}
              </h2>
            )}
            {(data.subtitle || data.description) && (
              <p className="text-sm text-muted-foreground">
                {data.subtitle || data.description}
              </p>
            )}
          </div>
          {enableDownload && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadHTML}
              className="flex-shrink-0 gap-1.5"
            >
              <Download className="h-4 w-4" />
              HTML
            </Button>
          )}
        </div>

        {/* Navigation arrows */}
        <div className="flex items-center gap-2 mb-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full bg-white/70 dark:bg-slate-800/70 hover:bg-white dark:hover:bg-slate-800 flex-shrink-0"
            onClick={() => scroll("left")}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1 text-xs text-muted-foreground text-center">
            좌우로 스크롤하여 모든 섹션을 확인하세요
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full bg-white/70 dark:bg-slate-800/70 hover:bg-white dark:hover:bg-slate-800 flex-shrink-0"
            onClick={() => scroll("right")}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Scrollable cards */}
        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto pb-6 snap-x snap-mandatory scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent"
          style={{ scrollbarWidth: "thin" }}
        >
          {sections.map((section, idx) => {
            const color = palette[idx % palette.length];
            const icon = getIconForHint(section.iconHint);

            return (
              <div
                key={idx}
                className="min-w-[280px] max-w-[320px] snap-start flex-shrink-0 bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-border/50 overflow-hidden transition-shadow hover:shadow-md"
              >
                {/* Card accent bar */}
                <div className="h-1.5" style={{ backgroundColor: color }} />

                <div className="p-5">
                  {/* Card header */}
                  <div className="flex items-start gap-3 mb-4">
                    <span className="text-2xl flex-shrink-0">{icon}</span>
                    <div>
                      <span className="text-xs font-medium text-muted-foreground">
                        {String(idx + 1).padStart(2, "0")}
                      </span>
                      <h3 className="text-base font-semibold text-foreground leading-tight">
                        {section.heading}
                      </h3>
                    </div>
                  </div>

                  {/* Card bullets */}
                  {section.bullets.length > 0 && (
                    <ul className="space-y-2">
                      {section.bullets.map((bullet, bIdx) => (
                        <li
                          key={bIdx}
                          className="flex items-start gap-2 text-sm text-muted-foreground leading-relaxed"
                        >
                          <CheckCircle2
                            className="h-4 w-4 mt-0.5 flex-shrink-0"
                            style={{ color }}
                          />
                          <span>{bullet}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function generateInfographicHTML(
  data: InfographicData,
  sections: Array<{ heading: string; bullets: string[]; iconHint?: string }>,
  palette: string[]
): string {
  const sectionsHtml = sections
    .map((s, i) => {
      const color = palette[i % palette.length];
      const icon = getIconForHint(s.iconHint);
      const bulletsHtml = s.bullets
        .map(
          (b) => `<li style="display:flex;align-items:flex-start;gap:8px;margin-bottom:8px;">
            <span style="color:${color};flex-shrink:0;">&#10003;</span>
            <span>${b}</span>
          </li>`
        )
        .join("");

      return `<div style="flex:0 0 280px;background:#fff;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,0.1);overflow:hidden;border:1px solid #e5e7eb;">
        <div style="height:6px;background:${color};"></div>
        <div style="padding:20px;">
          <div style="display:flex;align-items:flex-start;gap:12px;margin-bottom:16px;">
            <span style="font-size:28px;">${icon}</span>
            <div>
              <span style="font-size:12px;color:#9ca3af;font-weight:500;">${String(i + 1).padStart(2, "0")}</span>
              <h3 style="font-size:16px;font-weight:600;margin:0;color:#1f2937;line-height:1.3;">${s.heading}</h3>
            </div>
          </div>
          <ul style="list-style:none;padding:0;margin:0;font-size:14px;color:#6b7280;line-height:1.6;">
            ${bulletsHtml}
          </ul>
        </div>
      </div>`;
    })
    .join("\n");

  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${data.title || "Infographic"}</title>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Noto Sans KR', sans-serif; background: linear-gradient(135deg, #eff6ff 0%, #eef2ff 50%, #faf5ff 100%); min-height: 100vh; padding: 40px 20px; }
  .container { max-width: 1200px; margin: 0 auto; }
  .header { text-align: center; margin-bottom: 40px; }
  .header h1 { font-size: 28px; font-weight: 700; color: #1f2937; margin-bottom: 8px; }
  .header p { font-size: 16px; color: #6b7280; }
  .cards { display: flex; gap: 20px; overflow-x: auto; padding-bottom: 20px; }
  @media print { .cards { flex-wrap: wrap; } }
</style>
</head>
<body>
<div class="container">
  <div class="header">
    <h1>${data.title || ""}</h1>
    <p>${data.subtitle || data.description || ""}</p>
  </div>
  <div class="cards">
    ${sectionsHtml}
  </div>
</div>
</body>
</html>`;
}
