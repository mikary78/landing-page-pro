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
});

