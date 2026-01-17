/**
 * AIModelComparison 컴포넌트
 *
 * 여러 AI 모델로 동시에 콘텐츠를 생성하고 결과를 비교할 수 있는 UI
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Loader2, Bot, CheckCircle2, Download } from "lucide-react";
import { callAzureFunctionDirect } from "@/lib/azureFunctions";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { downloadAsJSON, downloadAsMarkdown } from "@/lib/downloadUtils";
import { ContentType } from "@/types/content";

interface GeneratedContent {
  contentType: string;
  content: any;
  markdown?: string;
}

interface AIModel {
  value: string;
  label: string;
  description: string;
}

interface AIModelComparisonProps {
  lessonId: string;
  lessonTitle: string;
  learningObjectives?: string[];
  contentType: ContentType;
  contentTypeLabel: string;
  onSelectResult?: (content: GeneratedContent, aiModel: string) => void;
}

const AI_MODELS: AIModel[] = [
  { value: "gemini", label: "Gemini", description: "Google AI" },
  { value: "claude", label: "Claude", description: "Anthropic" },
  { value: "chatgpt", label: "ChatGPT", description: "OpenAI" },
];

export const AIModelComparison = ({
  lessonId,
  lessonTitle,
  learningObjectives = [],
  contentType,
  contentTypeLabel,
  onSelectResult,
}: AIModelComparisonProps) => {
  const [selectedModels, setSelectedModels] = useState<string[]>(["gemini", "claude"]);
  const [generating, setGenerating] = useState(false);
  const [results, setResults] = useState<Record<string, GeneratedContent | null>>({
    gemini: null,
    claude: null,
    chatgpt: null,
  });
  const [generationStatus, setGenerationStatus] = useState<Record<string, 'idle' | 'loading' | 'success' | 'error'>>({
    gemini: 'idle',
    claude: 'idle',
    chatgpt: 'idle',
  });

  const handleModelToggle = (modelValue: string) => {
    setSelectedModels(prev =>
      prev.includes(modelValue)
        ? prev.filter(m => m !== modelValue)
        : [...prev, modelValue]
    );
  };

  const handleGenerateAll = async () => {
    if (selectedModels.length === 0) {
      toast.error("최소 1개 이상의 AI 모델을 선택해주세요.");
      return;
    }

    setGenerating(true);

    // 모든 선택된 모델의 상태를 loading으로 초기화
    const initialStatus: Record<string, 'idle' | 'loading' | 'success' | 'error'> = {};
    selectedModels.forEach(model => {
      initialStatus[model] = 'loading';
    });
    setGenerationStatus(prev => ({ ...prev, ...initialStatus }));

    // 각 모델에 대해 병렬로 생성 요청
    const promises = selectedModels.map(async (aiModel) => {
      try {
        const { data, error } = await callAzureFunctionDirect<{
          success: boolean;
          data: GeneratedContent;
          message: string;
        }>('/api/course/generate-content', 'POST', {
          lessonId,
          contentType,
          context: {
            lessonTitle,
            learningObjectives,
          },
          aiModel,
        });

        if (error) throw error;

        if (data?.success && data.data) {
          setResults(prev => ({
            ...prev,
            [aiModel]: data.data,
          }));
          setGenerationStatus(prev => ({
            ...prev,
            [aiModel]: 'success',
          }));
        } else {
          throw new Error('생성 실패');
        }
      } catch (error) {
        console.error(`Error generating content with ${aiModel}:`, error);
        setGenerationStatus(prev => ({
          ...prev,
          [aiModel]: 'error',
        }));
        toast.error(`${aiModel} 모델 생성 실패`);
      }
    });

    await Promise.all(promises);
    setGenerating(false);

    const successCount = selectedModels.filter(m => generationStatus[m] === 'success').length;
    if (successCount > 0) {
      toast.success(`${successCount}개 모델의 콘텐츠가 생성되었습니다.`);
    }
  };

  const renderContentPreview = (content: GeneratedContent) => {
    if (content.markdown) {
      return (
        <div className="prose prose-sm max-w-none dark:prose-invert">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {content.markdown}
          </ReactMarkdown>
        </div>
      );
    }

    // 간단한 JSON 미리보기
    return (
      <pre className="text-sm bg-muted p-3 rounded-lg overflow-auto max-h-96">
        {JSON.stringify(content.content, null, 2)}
      </pre>
    );
  };

  const hasAnyResults = Object.values(results).some(r => r !== null);

  return (
    <div className="space-y-6">
      {/* 모델 선택 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            AI 모델 선택
          </CardTitle>
          <CardDescription>
            비교할 AI 모델을 선택하고 동시에 생성해보세요
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              {AI_MODELS.map((model) => (
                <div key={model.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`model-${model.value}`}
                    checked={selectedModels.includes(model.value)}
                    onCheckedChange={() => handleModelToggle(model.value)}
                    disabled={generating}
                  />
                  <Label
                    htmlFor={`model-${model.value}`}
                    className="flex flex-col cursor-pointer"
                  >
                    <span className="font-medium">{model.label}</span>
                    <span className="text-xs text-muted-foreground">{model.description}</span>
                  </Label>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleGenerateAll}
                disabled={generating || selectedModels.length === 0}
                className="flex-1"
              >
                {generating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    생성 중...
                  </>
                ) : (
                  <>
                    <Bot className="h-4 w-4 mr-2" />
                    선택한 모델로 생성
                  </>
                )}
              </Button>
            </div>

            {/* 생성 상태 표시 */}
            {generating && (
              <div className="grid grid-cols-3 gap-2">
                {selectedModels.map((modelValue) => {
                  const model = AI_MODELS.find(m => m.value === modelValue);
                  const status = generationStatus[modelValue];

                  return (
                    <div key={modelValue} className="flex items-center gap-2 text-sm">
                      {status === 'loading' && <Loader2 className="h-4 w-4 animate-spin" />}
                      {status === 'success' && <CheckCircle2 className="h-4 w-4 text-green-600" />}
                      {status === 'error' && <span className="h-4 w-4 text-red-600">✗</span>}
                      <span>{model?.label}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 결과 비교 */}
      {hasAnyResults && (
        <Card>
          <CardHeader>
            <CardTitle>생성 결과 비교</CardTitle>
            <CardDescription>
              각 AI 모델의 생성 결과를 비교하고 원하는 결과를 선택하세요
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue={selectedModels.find(m => results[m] !== null) || selectedModels[0]}>
              <TabsList className="mb-4">
                {AI_MODELS.filter(model => results[model.value] !== null).map((model) => (
                  <TabsTrigger key={model.value} value={model.value} className="flex items-center gap-2">
                    <Bot className="h-4 w-4" />
                    {model.label}
                  </TabsTrigger>
                ))}
              </TabsList>

              {AI_MODELS.map((model) => {
                const content = results[model.value];
                if (!content) return null;

                return (
                  <TabsContent key={model.value} value={model.value}>
                    <div className="space-y-4">
                      {/* 액션 버튼 */}
                      <div className="flex gap-2 justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            downloadAsJSON(content, `${lessonTitle}_${contentTypeLabel}_${model.label}`);
                            toast.success("JSON 파일이 다운로드되었습니다.");
                          }}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          JSON
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            downloadAsMarkdown(content, `${lessonTitle}_${contentTypeLabel}_${model.label}`, contentType);
                            toast.success("Markdown 파일이 다운로드되었습니다.");
                          }}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Markdown
                        </Button>
                        {onSelectResult && (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => {
                              onSelectResult(content, model.value);
                              toast.success(`${model.label} 결과가 선택되었습니다.`);
                            }}
                          >
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            이 결과 사용
                          </Button>
                        )}
                      </div>

                      {/* 모델 정보 */}
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{model.label}</Badge>
                        <span className="text-sm text-muted-foreground">{model.description}</span>
                      </div>

                      {/* 콘텐츠 미리보기 */}
                      <div className="border rounded-lg p-4 max-h-[600px] overflow-auto">
                        {renderContentPreview(content)}
                      </div>
                    </div>
                  </TabsContent>
                );
              })}
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* 결과가 없을 때 가이드 */}
      {!hasAnyResults && !generating && (
        <Card className="border-dashed">
          <CardContent className="py-8">
            <div className="text-center">
              <Bot className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold mb-2">AI 모델을 선택하고 생성해보세요</h3>
              <p className="text-sm text-muted-foreground">
                여러 AI 모델의 결과를 한 번에 비교할 수 있습니다.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
