import PptxGenJS from "pptxgenjs";

export type DeckSource = { id: number; title?: string; url: string };
export type SlideJson = {
  title: string;
  bullets?: string[];
  speakerNotes?: string;
  visualHint?: string;
};
export type SlidesJson = {
  deckTitle?: string;
  slides?: SlideJson[];
  sources?: DeckSource[];
};

export type PptxTemplate = "default" | "minimal" | "creative";

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
      },
    ],
  };
}

function getTemplateTheme(template: PptxTemplate) {
  if (template === "minimal") {
    return {
      titleColor: "0B1220",
      headerColor: "111827",
      bodyColor: "111827",
      accent: "111827",
      bgColor: "FFFFFF",
    };
  }
  if (template === "creative") {
    return {
      titleColor: "0F172A",
      headerColor: "7C3AED",
      bodyColor: "0F172A",
      accent: "F97316",
      bgColor: "FFFFFF",
    };
  }
  return {
    titleColor: "0B1220",
    headerColor: "1E3A8A",
    bodyColor: "334155",
    accent: "2563EB",
    bgColor: "FFFFFF",
  };
}

function addFullBackgroundImage(slide: any, dataUrl: string) {
  // PptxGenJS wide slide size is ~13.333 x 7.5 (inches)
  slide.addImage({ data: dataUrl, x: 0, y: 0, w: 13.333, h: 7.5 });
}

function addTitleSlide(pptx: PptxGenJS, title: string, description?: string, template: PptxTemplate) {
  const theme = getTemplateTheme(template);
  const s = pptx.addSlide();
  s.background = { color: "F1F5F9" };

  s.addText(title, {
    x: 0.8,
    y: 2.2,
    w: 11.733,
    h: 1.2,
    fontFace: "Malgun Gothic",
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
      fontFace: "Malgun Gothic",
      fontSize: 18,
      color: "64748B",
      align: "center",
    });
  }
}

function addContentSlide(pptx: PptxGenJS, slide: SlideJson, template: PptxTemplate, bgDataUrl?: string) {
  const theme = getTemplateTheme(template);
  const s = pptx.addSlide();
  s.background = { color: theme.bgColor };

  if (bgDataUrl) {
    try {
      addFullBackgroundImage(s, bgDataUrl);
    } catch {
      // ignore background errors (bad dataUrl etc.)
    }
  }

  // Title
  s.addText(slide.title || "", {
    x: 0.8,
    y: 0.6,
    w: 11.733,
    h: 0.8,
    fontFace: "Malgun Gothic",
    fontSize: 28,
    bold: true,
    color: theme.headerColor,
  });

  // Bullets
  const bullets = Array.isArray(slide.bullets) ? slide.bullets.filter((b) => typeof b === "string" && b.trim()) : [];
  if (bullets.length > 0) {
    const bulletRuns = bullets.slice(0, 8).map((b) => ({
      text: b,
      options: { bullet: { type: "bullet" as const }, fontFace: "Malgun Gothic", fontSize: 18, color: theme.bodyColor },
    }));

    s.addText(bulletRuns as any, {
      x: 1.0,
      y: 1.65,
      w: 11.2,
      h: 4.9,
      valign: "top",
    });
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
  const template = input.template || "default";
  const title = (input.projectTitle || "Presentation").trim() || "Presentation";

  const normalized = ensureSourcesSlide(normalizeSlidesJson(input.slidesJson, title));
  const slides = normalized.slides;
  const bgDataUrl = input.assets?.background?.dataUrl;

  const pptx = new PptxGenJS();
  pptx.author = "AI Autopilot";
  pptx.title = title;
  pptx.layout = "LAYOUT_16x9";

  // Avoid font fallback chaos in Korean decks.
  // (PowerPoint will replace if the font is not installed on the viewer machine.)
  pptx.theme = { headFontFace: "Malgun Gothic", bodyFontFace: "Malgun Gothic", lang: "ko-KR" } as any;

  addTitleSlide(pptx, title, input.projectDescription, template);
  for (const s of slides) {
    if (!s || typeof s !== "object") continue;
    addContentSlide(pptx, s, template, bgDataUrl);
  }

  const out = await pptx.write({ outputType: "blob", compression: true } as any);
  const blob = out instanceof Blob ? out : new Blob([out as any], { type: "application/vnd.openxmlformats-officedocument.presentationml.presentation" });

  return { blob, fileName: `${safeFileName(title)}.pptx` };
}

// Test helper (node environment)
export async function generatePptxUint8Array(input: GeneratePptxInput): Promise<Uint8Array> {
  const template = input.template || "default";
  const title = (input.projectTitle || "Presentation").trim() || "Presentation";
  const normalized = ensureSourcesSlide(normalizeSlidesJson(input.slidesJson, title));
  const bgDataUrl = input.assets?.background?.dataUrl;

  const pptx = new PptxGenJS();
  pptx.author = "AI Autopilot";
  pptx.title = title;
  pptx.layout = "LAYOUT_16x9";
  pptx.theme = { headFontFace: "Malgun Gothic", bodyFontFace: "Malgun Gothic", lang: "ko-KR" } as any;

  addTitleSlide(pptx, title, input.projectDescription, template);
  for (const s of normalized.slides) addContentSlide(pptx, s, template, bgDataUrl);

  const out = await pptx.write({ outputType: "uint8array", compression: true } as any);
  return out as Uint8Array;
}

