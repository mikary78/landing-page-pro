// @vitest-environment node
import { describe, expect, it } from "vitest";
import { generatePptxUint8Array } from "@/lib/pptxExport";

describe("pptxExport", () => {
  it("generates a valid .pptx zip payload (starts with PK)", async () => {
    const bytes = await generatePptxUint8Array({
      projectTitle: "테스트 발표자료",
      projectDescription: "슬라이드 만들기 기능 테스트",
      slidesJson: {
        deckTitle: "테스트 덱",
        slides: [
          { title: "개요", bullets: ["목표", "범위", "가정"], speakerNotes: "Sources: [1]" },
          { title: "결론", bullets: ["요약", "다음 단계"], speakerNotes: "Sources: [1]" },
        ],
        sources: [{ id: 1, title: "Example", url: "https://example.com" }],
      },
    });

    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(bytes.length).toBeGreaterThan(5000);
    // ZIP header "PK"
    expect(bytes[0]).toBe(0x50);
    expect(bytes[1]).toBe(0x4b);
  });

  it("supports Canva/Gamma style templates and layoutType without throwing", async () => {
    const bytes = await generatePptxUint8Array({
      projectTitle: "디자인 테스트 덱",
      projectDescription: "Canva/Gamma 스타일 렌더 테스트",
      template: "gamma",
      slidesJson: {
        deckTitle: "디자인 테스트",
        deckTheme: {
          style: "gamma",
          palette: { primary: "#0EA5E9", secondary: "#6366F1", background: "#FFFFFF", text: "#0B1220" },
          background: { type: "gradient" },
        },
        slides: [
          { title: "섹션", bullets: ["왜 중요한가"], speakerNotes: "Sources: [1]", layoutType: "section_header" },
          { title: "개요", bullets: ["핵심 1", "핵심 2", "핵심 3"], speakerNotes: "Sources: [1]", layoutType: "two_column" },
          { title: "도식", bullets: ["흐름", "관계"], speakerNotes: "Sources: [1]", layoutType: "diagram_slide" },
          { title: "결론", bullets: ["요약", "다음 단계"], speakerNotes: "Sources: [1]", layoutType: "conclusion" },
        ],
        sources: [{ id: 1, title: "Example", url: "https://example.com" }],
      },
    });

    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(bytes.length).toBeGreaterThan(5000);
    expect(bytes[0]).toBe(0x50);
    expect(bytes[1]).toBe(0x4b);
  });

  it("supports canva preset too", async () => {
    const bytes = await generatePptxUint8Array({
      projectTitle: "Canva 프리셋",
      template: "canva",
      slidesJson: {
        deckTitle: "Canva 프리셋",
        deckTheme: { style: "canva" },
        slides: [{ title: "타이틀", bullets: ["서브"], speakerNotes: "Sources: [1]", layoutType: "title_slide" }],
        sources: [{ id: 1, url: "https://example.com" }],
      },
    });
    expect(bytes[0]).toBe(0x50);
    expect(bytes[1]).toBe(0x4b);
  });
});

