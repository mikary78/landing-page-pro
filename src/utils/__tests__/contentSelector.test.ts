import { describe, expect, it } from "vitest";
import { getCurrentContent } from "../contentSelector";

describe("getCurrentContent", () => {
  const project = { generated_content: "project content" };
  const aiResults = [
    { ai_model: "gemini", generated_content: "gemini content" },
    { ai_model: "claude", generated_content: "claude content" },
  ];

  it("선택된 AI 결과가 있으면 해당 결과를 반환한다", () => {
    const result = getCurrentContent(project, aiResults, "claude");
    expect(result).toBe("claude content");
  });

  it("선택된 AI 결과가 없으면 프로젝트 기본 콘텐츠를 반환한다", () => {
    const result = getCurrentContent(project, aiResults, "chatgpt");
    expect(result).toBe("project content");
  });

  it("프로젝트와 결과 둘 다 없으면 undefined를 반환한다", () => {
    const result = getCurrentContent(null, [], "gemini");
    expect(result).toBeUndefined();
  });
});
