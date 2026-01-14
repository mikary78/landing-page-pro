import PptxGenJS from "pptxgenjs";

export type DeckSource = { id: number; title?: string; url: string };
export type SlideLayoutType =
  | "title_slide"
  | "section_header"
  | "title_and_content"
  | "two_column"
  | "content_with_image"
  | "diagram_slide"
  | "conclusion"
  | "sources";
export type SlideJson = {
  title: string;
  bullets?: string[];
  speakerNotes?: string;
  visualHint?: string;
  layoutType?: SlideLayoutType;
  image?: {
    required?: boolean;
    searchKeywords?: string;
    style?: "professional" | "modern" | "minimalist" | "creative";
    /** (선택) 실제 렌더링에 사용할 dataUrl이 있으면 바로 사용 */
    dataUrl?: string;
  };
  diagram?: {
    required?: boolean;
    type?: "flowchart" | "sequence" | "class" | "er" | "gantt" | "pie";
    mermaidCode?: string;
    caption?: string;
    /** (선택) 실제 렌더링에 사용할 dataUrl이 있으면 바로 사용 */
    dataUrl?: string;
  };
};
export type SlidesJson = {
  deckTitle?: string;
  slides?: SlideJson[];
  sources?: DeckSource[];
  deckTheme?: {
    style?: PptxTemplate;
    palette?: {
      primary?: string;
      secondary?: string;
      background?: string;
      text?: string;
      mutedText?: string;
    };
    typography?: { headingFont?: string; bodyFont?: string };
    background?: { type?: "solid" | "gradient" | "image" };
  };
};

// "default/minimal/creative"은 기존 호환, "gamma/canva"는 Canva/Gamma 느낌의 프리셋
export type PptxTemplate = "default" | "minimal" | "creative" | "gamma" | "canva";

export type PptxDesignAssets = {
  background?: { dataUrl?: string };
};

function safeFileName(input: string): string {
  const raw = (input || "presentation").trim() || "presentation";
  // Windows forbidden chars: \ / : * ? " < > |
  return raw
    .replace(/[\\/:*?"<>|]+/g, "_")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function normalizeSlidesJson(
  slidesJson: SlidesJson | null | undefined,
  deckTitleFallback: string
): Required<SlidesJson> {
  const deckTitle = (slidesJson?.deckTitle || "").trim() || deckTitleFallback;
  const slides = Array.isArray(slidesJson?.slides) ? slidesJson!.slides! : [];
  const sources = Array.isArray(slidesJson?.sources) ? slidesJson!.sources! : [];

  return { deckTitle, slides, sources };
}

function ensureSourcesSlide(slidesJson: Required<SlidesJson>): Required<SlidesJson> {
  const hasSourcesSlide = slidesJson.slides.some((s) => {
    const t = (s?.title || "").trim().toLowerCase();
    return t === "sources" || t === "출처";
  });
  if (hasSourcesSlide) return slidesJson;

  const bullets =
    slidesJson.sources.length > 0
      ? slidesJson.sources.slice(0, 20).map((s) => `[${s.id}] ${s.title ? `${s.title} - ` : ""}${s.url}`)
      : ["웹 검색 결과가 없습니다. (TAVILY_API_KEY/SERPER_API_KEY 미설정 가능)"];

  return {
    ...slidesJson,
    slides: [
      ...slidesJson.slides,
      {
        title: "Sources",
        bullets,
        speakerNotes:
          slidesJson.sources.length > 0
            ? "출처 목록 페이지입니다. 앞 슬라이드의 [n] 인용은 본 페이지의 Sources와 매칭됩니다."
            : "웹 검색 결과가 없어 출처를 표시할 수 없습니다.",
        visualHint: "Clean list layout with small font and plenty of whitespace.",
        layoutType: "sources",
      },
    ],
  };
}

function normalizeHex(input: string | undefined, fallback: string): string {
  const s = (input || "").trim();
  if (!s) return fallback;
  const noHash = s.startsWith("#") ? s.slice(1) : s;
  if (/^[0-9a-fA-F]{6}$/.test(noHash)) return noHash.toUpperCase();
  return fallback;
}

function getTemplateTheme(template: PptxTemplate, themeFromJson?: SlidesJson["deckTheme"]) {
  // deckTheme.palette가 있으면 우선 적용(안전한 hex로 normalize)
  const palette = themeFromJson?.palette;
  const typography = themeFromJson?.typography;

  // Gamma: 여백, 큰 타이포, 부드러운 그라데이션 느낌
  if (template === "gamma") {
    return {
      titleColor: normalizeHex(palette?.text, "0B1220"),
      headerColor: normalizeHex(palette?.primary, "0EA5E9"),
      bodyColor: normalizeHex(palette?.text, "0B1220"),
      mutedText: normalizeHex(palette?.mutedText, "475569"),
      accent: normalizeHex(palette?.secondary, "6366F1"),
      bgColor: normalizeHex(palette?.background, "FFFFFF"),
      headingFont: typography?.headingFont || "Malgun Gothic",
      bodyFont: typography?.bodyFont || "Malgun Gothic",
      bgStyle: themeFromJson?.background?.type || "gradient",
    } as const;
  }

  // Canva: 강한 대비, 대담한 포인트, 모던한 카드/도형
  if (template === "canva") {
    return {
      titleColor: normalizeHex(palette?.text, "0B1220"),
      headerColor: normalizeHex(palette?.primary, "111827"),
      bodyColor: normalizeHex(palette?.text, "0B1220"),
      mutedText: normalizeHex(palette?.mutedText, "334155"),
      accent: normalizeHex(palette?.secondary, "F97316"),
      bgColor: normalizeHex(palette?.background, "FFFFFF"),
      headingFont: typography?.headingFont || "Malgun Gothic",
      bodyFont: typography?.bodyFont || "Malgun Gothic",
      bgStyle: themeFromJson?.background?.type || "gradient",
    } as const;
  }

  if (template === "minimal") {
    return {
      titleColor: "0B1220",
      headerColor: "111827",
      bodyColor: "111827",
      mutedText: "475569",
      accent: "111827",
      bgColor: "FFFFFF",
      headingFont: typography?.headingFont || "Malgun Gothic",
      bodyFont: typography?.bodyFont || "Malgun Gothic",
      bgStyle: themeFromJson?.background?.type || "solid",
    };
  }
  if (template === "creative") {
    return {
      titleColor: "0F172A",
      headerColor: "7C3AED",
      bodyColor: "0F172A",
      mutedText: "475569",
      accent: "F97316",
      bgColor: "FFFFFF",
      headingFont: typography?.headingFont || "Malgun Gothic",
      bodyFont: typography?.bodyFont || "Malgun Gothic",
      bgStyle: themeFromJson?.background?.type || "gradient",
    };
  }
  return {
    titleColor: "0B1220",
    headerColor: "1E3A8A",
    bodyColor: "334155",
    mutedText: "475569",
    accent: "2563EB",
    bgColor: "FFFFFF",
    headingFont: typography?.headingFont || "Malgun Gothic",
    bodyFont: typography?.bodyFont || "Malgun Gothic",
    bgStyle: themeFromJson?.background?.type || "solid",
  };
}

function addFullBackgroundImage(slide: any, dataUrl: string) {
  // PptxGenJS wide slide size is ~13.333 x 7.5 (inches)
  slide.addImage({ data: dataUrl, x: 0, y: 0, w: 13.333, h: 7.5 });
}

function addBgDecoration(pptx: PptxGenJS, slide: any, theme: ReturnType<typeof getTemplateTheme>) {
  // bgStyle이 image면 호출부에서 addFullBackgroundImage 처리
  if (theme.bgStyle === "solid") return;

  // 간단한 "그라데이션 느낌" 장식: 좌상단/우하단 원/리본 형태
  // PptxGenJS는 직접 그라데이션 fill이 제한적이어서, 도형 + 투명도로 느낌만 구현
  try {
    slide.addShape(pptx.ShapeType.ellipse, {
      x: -1.2,
      y: -1.0,
      w: 5.0,
      h: 5.0,
      fill: { color: theme.accent, transparency: 75 },
      line: { color: theme.accent, transparency: 100 },
    });
    slide.addShape(pptx.ShapeType.ellipse, {
      x: 10.2,
      y: 4.6,
      w: 5.0,
      h: 5.0,
      fill: { color: theme.headerColor, transparency: 82 },
      line: { color: theme.headerColor, transparency: 100 },
    });
  } catch {
    // ignore decoration errors
  }
}

function addTitleSlide(pptx: PptxGenJS, title: string, description?: string, template: PptxTemplate, themeFromJson?: SlidesJson["deckTheme"]) {
  const theme = getTemplateTheme(template, themeFromJson);
  const s = pptx.addSlide();
  s.background = { color: "F8FAFC" };
  addBgDecoration(pptx, s, theme);

  s.addText(title, {
    x: 0.8,
    y: 2.2,
    w: 11.733,
    h: 1.2,
    fontFace: theme.headingFont,
    fontSize: 44,
    bold: true,
    color: theme.titleColor,
    align: "center",
  });

  if (description?.trim()) {
    s.addText(description.trim(), {
      x: 1.1,
      y: 3.6,
      w: 11.133,
      h: 0.9,
      fontFace: theme.bodyFont,
      fontSize: 18,
      color: theme.mutedText,
      align: "center",
    });
  }
}

function addHeaderBar(pptx: PptxGenJS, slide: any, theme: ReturnType<typeof getTemplateTheme>) {
  try {
    slide.addShape(pptx.ShapeType.rect, {
      x: 0,
      y: 0,
      w: 13.333,
      h: 0.18,
      fill: { color: theme.headerColor, transparency: 15 },
      line: { color: theme.headerColor, transparency: 100 },
    });
  } catch {
    // ignore
  }
}

function addCard(pptx: PptxGenJS, slide: any, x: number, y: number, w: number, h: number, theme: ReturnType<typeof getTemplateTheme>) {
  try {
    slide.addShape(pptx.ShapeType.roundRect, {
      x,
      y,
      w,
      h,
      fill: { color: "FFFFFF", transparency: 0 },
      line: { color: "E2E8F0", transparency: 0 },
      radius: 0.2,
    });
    // 얕은 그림자 느낌은 PPTX에서 제약이 커서 "라인 + 살짝 톤"으로 대체
    slide.addShape(pptx.ShapeType.roundRect, {
      x: x + 0.05,
      y: y + 0.06,
      w,
      h,
      fill: { color: theme.headerColor, transparency: 93 },
      line: { color: theme.headerColor, transparency: 100 },
      radius: 0.2,
    });
  } catch {
    // ignore
  }
}

function addImageBoxOrImage(
  pptx: PptxGenJS,
  slide: any,
  x: number,
  y: number,
  w: number,
  h: number,
  theme: ReturnType<typeof getTemplateTheme>,
  dataUrl?: string,
  caption?: string
) {
  if (dataUrl) {
    try {
      slide.addImage({ data: dataUrl, x, y, w, h });
      return;
    } catch {
      // fallback to placeholder
    }
  }
  try {
    slide.addShape(pptx.ShapeType.roundRect, {
      x,
      y,
      w,
      h,
      fill: { color: theme.headerColor, transparency: 92 },
      line: { color: theme.headerColor, transparency: 75 },
      radius: 0.18,
    });
    slide.addText(caption?.trim() ? caption.trim() : "Visual", {
      x,
      y: y + h / 2 - 0.2,
      w,
      h: 0.5,
      fontFace: theme.bodyFont,
      fontSize: 14,
      color: theme.mutedText,
      align: "center",
      valign: "mid",
    });
  } catch {
    // ignore
  }
}

function addBulletsText(slide: any, bullets: string[], x: number, y: number, w: number, h: number, theme: ReturnType<typeof getTemplateTheme>) {
  const clean = Array.isArray(bullets) ? bullets.filter((b) => typeof b === "string" && b.trim()) : [];
  if (clean.length === 0) return;
  const runs = clean.slice(0, 8).map((b) => ({
    text: b,
    options: {
      bullet: { type: "bullet" as const },
      fontFace: theme.bodyFont,
      fontSize: 18,
      color: theme.bodyColor,
    },
  }));
  slide.addText(runs as any, { x, y, w, h, valign: "top" });
}

function addContentSlide(pptx: PptxGenJS, slide: SlideJson, template: PptxTemplate, bgDataUrl?: string, themeFromJson?: SlidesJson["deckTheme"]) {
  const theme = getTemplateTheme(template, themeFromJson);
  const s = pptx.addSlide();
  s.background = { color: theme.bgColor };

  if (bgDataUrl) {
    try {
      addFullBackgroundImage(s, bgDataUrl);
    } catch {
      // ignore background errors (bad dataUrl etc.)
    }
  }
  addHeaderBar(pptx, s, theme);
  addBgDecoration(pptx, s, theme);

  const layout = (slide.layoutType || "title_and_content") as SlideLayoutType;
  const title = slide.title || "";
  const bullets = Array.isArray(slide.bullets) ? slide.bullets : [];

  // Layout-specific rendering (Canva/Gamma 느낌의 그리드/타이포)
  if (layout === "section_header") {
    s.addText(title, {
      x: 0.9,
      y: 2.7,
      w: 11.533,
      h: 1.2,
      fontFace: theme.headingFont,
      fontSize: 52,
      bold: true,
      color: theme.headerColor,
      align: "left",
    });
    if (bullets.length > 0) {
      s.addText(bullets.slice(0, 2).join(" · "), {
        x: 0.95,
        y: 4.1,
        w: 11.4,
        h: 0.7,
        fontFace: theme.bodyFont,
        fontSize: 18,
        color: theme.mutedText,
      });
    }
  } else if (layout === "title_slide") {
    // 표지: 큰 제목 + 서브 문구(첫 bullet)
    s.addText(title, {
      x: 0.8,
      y: 2.2,
      w: 11.733,
      h: 1.6,
      fontFace: theme.headingFont,
      fontSize: 56,
      bold: true,
      color: theme.titleColor,
      align: "center",
    });
    if (bullets[0]) {
      s.addText(String(bullets[0]), {
        x: 1.1,
        y: 3.95,
        w: 11.133,
        h: 0.8,
        fontFace: theme.bodyFont,
        fontSize: 20,
        color: theme.mutedText,
        align: "center",
      });
    }
  } else if (layout === "two_column") {
    // 좌: bullets, 우: 강조 카드(visualHint/이미지 placeholder)
    s.addText(title, {
      x: 0.8,
      y: 0.7,
      w: 11.733,
      h: 0.8,
      fontFace: theme.headingFont,
      fontSize: 30,
      bold: true,
      color: theme.headerColor,
    });
    addCard(pptx, s, 0.8, 1.65, 6.1, 5.2, theme);
    addBulletsText(s, bullets, 1.05, 1.9, 5.6, 4.7, theme);
    addImageBoxOrImage(pptx, s, 7.2, 1.65, 5.4, 5.2, theme, slide.image?.dataUrl, slide.visualHint || slide.image?.searchKeywords);
  } else if (layout === "content_with_image") {
    // 텍스트 + 이미지(오른쪽) — Gamma/Canva 기본 레이아웃
    s.addText(title, {
      x: 0.8,
      y: 0.7,
      w: 11.733,
      h: 0.8,
      fontFace: theme.headingFont,
      fontSize: 30,
      bold: true,
      color: theme.headerColor,
    });
    addCard(pptx, s, 0.8, 1.65, 6.4, 5.2, theme);
    addBulletsText(s, bullets, 1.05, 1.9, 5.9, 4.7, theme);
    addImageBoxOrImage(pptx, s, 7.45, 1.65, 5.05, 5.2, theme, slide.image?.dataUrl, slide.image?.searchKeywords || slide.visualHint);
  } else if (layout === "diagram_slide") {
    s.addText(title, {
      x: 0.8,
      y: 0.7,
      w: 11.733,
      h: 0.8,
      fontFace: theme.headingFont,
      fontSize: 30,
      bold: true,
      color: theme.headerColor,
    });
    addImageBoxOrImage(pptx, s, 1.0, 1.65, 11.3, 4.9, theme, slide.diagram?.dataUrl, slide.diagram?.caption || slide.visualHint || "Diagram");
    if (bullets.length > 0) {
      s.addText(bullets.slice(0, 2).join(" · "), {
        x: 1.0,
        y: 6.7,
        w: 11.3,
        h: 0.5,
        fontFace: theme.bodyFont,
        fontSize: 14,
        color: theme.mutedText,
      });
    }
  } else if (layout === "conclusion") {
    s.addText(title || "결론", {
      x: 0.9,
      y: 0.9,
      w: 11.533,
      h: 0.9,
      fontFace: theme.headingFont,
      fontSize: 38,
      bold: true,
      color: theme.headerColor,
    });
    addCard(pptx, s, 0.9, 2.0, 11.55, 4.7, theme);
    addBulletsText(s, bullets, 1.2, 2.35, 11.0, 4.1, theme);
  } else {
    // title_and_content + default fallback
    s.addText(title, {
      x: 0.8,
      y: 0.7,
      w: 11.733,
      h: 0.8,
      fontFace: theme.headingFont,
      fontSize: 30,
      bold: true,
      color: theme.headerColor,
    });
    addCard(pptx, s, 0.8, 1.65, 11.8, 5.2, theme);
    addBulletsText(s, bullets, 1.05, 1.9, 11.25, 4.7, theme);
  }

  if (slide.speakerNotes?.trim()) {
    s.addNotes(slide.speakerNotes.trim());
  }
}

export interface GeneratePptxInput {
  projectTitle: string;
  projectDescription?: string;
  slidesJson?: SlidesJson | null;
  assets?: PptxDesignAssets | null;
  template?: PptxTemplate;
}

export async function generatePptxBlob(input: GeneratePptxInput): Promise<{ blob: Blob; fileName: string }> {
  const template = input.template || ((input.slidesJson as any)?.deckTheme?.style as PptxTemplate) || "default";
  const title = (input.projectTitle || "Presentation").trim() || "Presentation";

  const normalized = ensureSourcesSlide(normalizeSlidesJson(input.slidesJson, title));
  const slides = normalized.slides;
  const bgDataUrl = input.assets?.background?.dataUrl;
  const deckTheme = (normalized as any)?.deckTheme as SlidesJson["deckTheme"] | undefined;

  const pptx = new PptxGenJS();
  pptx.author = "AI Autopilot";
  pptx.title = title;
  pptx.layout = "LAYOUT_16x9";

  // Avoid font fallback chaos in Korean decks.
  // (PowerPoint will replace if the font is not installed on the viewer machine.)
  const resolvedTheme = getTemplateTheme(template, deckTheme);
  pptx.theme = { headFontFace: resolvedTheme.headingFont, bodyFontFace: resolvedTheme.bodyFont, lang: "ko-KR" } as any;

  addTitleSlide(pptx, title, input.projectDescription, template, deckTheme);
  for (const s of slides) {
    if (!s || typeof s !== "object") continue;
    addContentSlide(pptx, s, template, bgDataUrl, deckTheme);
  }

  const out = await pptx.write({ outputType: "blob", compression: true } as any);
  const blob = out instanceof Blob ? out : new Blob([out as any], { type: "application/vnd.openxmlformats-officedocument.presentationml.presentation" });

  return { blob, fileName: `${safeFileName(title)}.pptx` };
}

// Test helper (node environment)
export async function generatePptxUint8Array(input: GeneratePptxInput): Promise<Uint8Array> {
  const template = input.template || ((input.slidesJson as any)?.deckTheme?.style as PptxTemplate) || "default";
  const title = (input.projectTitle || "Presentation").trim() || "Presentation";
  const normalized = ensureSourcesSlide(normalizeSlidesJson(input.slidesJson, title));
  const bgDataUrl = input.assets?.background?.dataUrl;
  const deckTheme = (normalized as any)?.deckTheme as SlidesJson["deckTheme"] | undefined;

  const pptx = new PptxGenJS();
  pptx.author = "AI Autopilot";
  pptx.title = title;
  pptx.layout = "LAYOUT_16x9";
  const resolvedTheme = getTemplateTheme(template, deckTheme);
  pptx.theme = { headFontFace: resolvedTheme.headingFont, bodyFontFace: resolvedTheme.bodyFont, lang: "ko-KR" } as any;

  addTitleSlide(pptx, title, input.projectDescription, template, deckTheme);
  for (const s of normalized.slides) addContentSlide(pptx, s, template, bgDataUrl, deckTheme);

  const out = await pptx.write({ outputType: "uint8array", compression: true } as any);
  return out as Uint8Array;
}

