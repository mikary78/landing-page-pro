/**
 * 선택된 AI 모델에 맞는 최종 콘텐츠를 반환한다.
 * 우선순위: 선택된 모델의 AI 결과 -> 프로젝트 기본 생성물.
 */
export function getCurrentContent(
  project: { generated_content?: string } | null,
  aiResults: Array<{ ai_model?: string; generated_content?: string }> = [],
  selectedAiModel: string
): string | undefined {
  const currentAiResult = aiResults.find(
    (result) => result.ai_model === selectedAiModel && result.generated_content
  );

  if (currentAiResult?.generated_content) {
    return currentAiResult.generated_content;
  }

  return project?.generated_content;
}
