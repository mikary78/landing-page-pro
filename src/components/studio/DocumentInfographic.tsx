import { useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { toast } from "sonner";

interface DocumentInfographicProps {
  content: string;
  title?: string;
  subtitle?: string;
}

interface ParsedSection {
  heading: string;
  level: number;
  bullets: string[];
  paragraphs: string[];
}

const PALETTE = [
  { bg: "#EEF2FF", border: "#6366f1", text: "#3730a3", accent: "#818cf8" },
  { bg: "#F0FDF4", border: "#22c55e", text: "#166534", accent: "#4ade80" },
  { bg: "#FFF7ED", border: "#f97316", text: "#9a3412", accent: "#fb923c" },
  { bg: "#FDF2F8", border: "#ec4899", text: "#9d174d", accent: "#f472b6" },
  { bg: "#F0F9FF", border: "#0ea5e9", text: "#0c4a6e", accent: "#38bdf8" },
  { bg: "#FAF5FF", border: "#a855f7", text: "#6b21a8", accent: "#c084fc" },
  { bg: "#FFFBEB", border: "#eab308", text: "#854d0e", accent: "#facc15" },
  { bg: "#F0FDFA", border: "#14b8a6", text: "#134e4a", accent: "#2dd4bf" },
];

function parseMarkdownSections(md: string): ParsedSection[] {
  const lines = md.split("\n");
  const sections: ParsedSection[] = [];
  let current: ParsedSection | null = null;

  for (const line of lines) {
    const h1 = line.match(/^# (.+)/);
    const h2 = line.match(/^## (.+)/);
    const h3 = line.match(/^### (.+)/);
    const bullet = line.match(/^[-*] (.+)/);
    const numbered = line.match(/^\d+\.\s+(.+)/);

    if (h1 || h2 || h3) {
      if (current) sections.push(current);
      current = {
        heading: (h1?.[1] || h2?.[1] || h3?.[1] || "").replace(/\*\*/g, ""),
        level: h1 ? 1 : h2 ? 2 : 3,
        bullets: [],
        paragraphs: [],
      };
    } else if (bullet || numbered) {
      const text = (bullet?.[1] || numbered?.[1] || "").replace(/\*\*/g, "").replace(/\*/g, "");
      if (current) {
        current.bullets.push(text);
      } else {
        current = { heading: "", level: 2, bullets: [text], paragraphs: [] };
      }
    } else if (line.trim() && !line.match(/^---/) && !line.match(/^\|/)) {
      const clean = line.trim().replace(/\*\*/g, "").replace(/\*/g, "");
      if (clean.length > 5) {
        if (current) {
          current.paragraphs.push(clean);
        }
      }
    }
  }
  if (current) sections.push(current);

  // Filter out empty or title-only sections
  return sections.filter(s => s.bullets.length > 0 || s.paragraphs.length > 0);
}

function generateInfographicHTML(
  sections: ParsedSection[],
  title?: string,
  subtitle?: string,
): string {
  const sectionCards = sections
    .map((s, i) => {
      const color = PALETTE[i % PALETTE.length];
      const bulletsHtml = s.bullets
        .map(
          (b) => `<li style="display:flex;align-items:flex-start;gap:10px;margin-bottom:10px;line-height:1.7;">
            <span style="color:${color.border};flex-shrink:0;font-size:18px;margin-top:2px;">&#9679;</span>
            <span>${b}</span>
          </li>`
        )
        .join("");
      const parasHtml = s.paragraphs
        .slice(0, 2)
        .map((p) => `<p style="color:#475569;line-height:1.8;margin-bottom:8px;font-size:14px;">${p}</p>`)
        .join("");
      const num = String(i + 1).padStart(2, "0");

      return `<div style="background:${color.bg};border-left:4px solid ${color.border};border-radius:12px;padding:24px 28px;margin-bottom:20px;box-shadow:0 1px 3px rgba(0,0,0,0.06);">
        <div style="display:flex;align-items:center;gap:14px;margin-bottom:16px;">
          <span style="background:${color.border};color:white;width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:14px;flex-shrink:0;">${num}</span>
          <h3 style="font-size:18px;font-weight:700;color:${color.text};margin:0;line-height:1.3;">${s.heading || `Section ${i + 1}`}</h3>
        </div>
        ${parasHtml}
        ${
          bulletsHtml
            ? `<ul style="list-style:none;padding:0;margin:0;font-size:15px;color:#334155;">${bulletsHtml}</ul>`
            : ""
        }
      </div>`;
    })
    .join("\n");

  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title || "Infographic"}</title>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Noto Sans KR', -apple-system, sans-serif;
    background: linear-gradient(160deg, #f8fafc 0%, #eef2ff 30%, #f0fdf4 60%, #faf5ff 100%);
    min-height: 100vh;
    padding: 40px 20px;
  }
  .container { max-width: 800px; margin: 0 auto; }
  .header {
    text-align: center;
    margin-bottom: 48px;
    padding: 40px 30px;
    background: white;
    border-radius: 20px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.06);
  }
  .header h1 {
    font-size: 32px;
    font-weight: 800;
    color: #1e293b;
    margin-bottom: 12px;
    line-height: 1.3;
  }
  .header p {
    font-size: 16px;
    color: #64748b;
    line-height: 1.6;
  }
  .stats {
    display: flex;
    justify-content: center;
    gap: 24px;
    margin-top: 20px;
    padding-top: 20px;
    border-top: 1px solid #e2e8f0;
  }
  .stat {
    text-align: center;
    padding: 0 16px;
  }
  .stat-num { font-size: 28px; font-weight: 800; color: #6366f1; }
  .stat-label { font-size: 12px; color: #94a3b8; margin-top: 2px; }
  .footer {
    text-align: center;
    margin-top: 40px;
    padding: 20px;
    color: #94a3b8;
    font-size: 13px;
  }
  @media print {
    body { padding: 20px; background: white; }
    .header { box-shadow: none; border: 1px solid #e2e8f0; }
  }
</style>
</head>
<body>
<div class="container">
  <div class="header">
    <h1>${title || "교육 콘텐츠 인포그래픽"}</h1>
    ${subtitle ? `<p>${subtitle}</p>` : ""}
    <div class="stats">
      <div class="stat">
        <div class="stat-num">${sections.length}</div>
        <div class="stat-label">섹션</div>
      </div>
      <div class="stat">
        <div class="stat-num">${sections.reduce((sum, s) => sum + s.bullets.length, 0)}</div>
        <div class="stat-label">핵심 포인트</div>
      </div>
    </div>
  </div>
  ${sectionCards}
  <div class="footer">
    Generated by AI Autopilot &middot; ${new Date().toLocaleDateString("ko-KR")}
  </div>
</div>
</body>
</html>`;
}

export function DocumentInfographic({ content, title, subtitle }: DocumentInfographicProps) {
  const sections = useMemo(() => parseMarkdownSections(content), [content]);

  const handleDownloadHTML = useCallback(() => {
    const html = generateInfographicHTML(sections, title, subtitle);
    const blob = new Blob([html], { type: "text/html; charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${title || "infographic"}.html`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("HTML 파일이 다운로드되었습니다.");
  }, [sections, title, subtitle]);

  if (sections.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>인포그래픽으로 표시할 콘텐츠가 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground">
            종합 강의안 인포그래픽
          </h2>
          <p className="text-sm text-muted-foreground">
            {sections.length}개 섹션 &middot; {sections.reduce((sum, s) => sum + s.bullets.length, 0)}개 핵심 포인트
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleDownloadHTML} className="gap-1.5">
          <Download className="h-4 w-4" />
          HTML 다운로드
        </Button>
      </div>

      {/* Sections */}
      <div className="space-y-4">
        {sections.map((section, idx) => {
          const color = PALETTE[idx % PALETTE.length];
          return (
            <div
              key={idx}
              className="rounded-xl p-5 transition-shadow hover:shadow-md"
              style={{
                backgroundColor: color.bg,
                borderLeft: `4px solid ${color.border}`,
              }}
            >
              <div className="flex items-center gap-3 mb-3">
                <span
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                  style={{ backgroundColor: color.border }}
                >
                  {String(idx + 1).padStart(2, "0")}
                </span>
                <h3
                  className="text-base font-bold leading-tight"
                  style={{ color: color.text }}
                >
                  {section.heading || `Section ${idx + 1}`}
                </h3>
              </div>

              {section.paragraphs.length > 0 && (
                <div className="mb-3 pl-11">
                  {section.paragraphs.slice(0, 2).map((p, pIdx) => (
                    <p key={pIdx} className="text-sm text-muted-foreground leading-relaxed mb-1">
                      {p}
                    </p>
                  ))}
                </div>
              )}

              {section.bullets.length > 0 && (
                <ul className="space-y-2 pl-11">
                  {section.bullets.map((bullet, bIdx) => (
                    <li
                      key={bIdx}
                      className="flex items-start gap-2.5 text-sm leading-relaxed"
                    >
                      <span
                        className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                        style={{ backgroundColor: color.accent }}
                      />
                      <span className="text-slate-700 dark:text-slate-300">{bullet}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
