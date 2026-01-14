import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { ImageToggle } from "@/components/presentation/ImageToggle";
import { DiagramToggle } from "@/components/presentation/DiagramToggle";

/**
 * PRD v2.0 "Enhanced Form Component" 예제 기반 폼.
 *
 * NOTE:
 * - 현재 레포는 Azure Functions 기반이므로, 이 컴포넌트는 UI 스펙(토글/입력) 구현에 초점을 둡니다.
 * - 실제 API 연동은 backend(FastAPI) 또는 기존 Azure Functions 라우팅 정책에 맞춰 추가 연결하면 됩니다.
 */
export function PresentationForm() {
  const [topic, setTopic] = useState("");
  const [numSlides, setNumSlides] = useState(7);
  const [enableImages, setEnableImages] = useState(true);
  const [enableDiagrams, setEnableDiagrams] = useState(true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: API 연동 (FastAPI /api/presentations/generate 또는 Azure Functions 대응 엔드포인트)
    // 요청 payload 예:
    // { topic, num_slides: numSlides, template: "default", language: "ko", enable_images: enableImages, enable_diagrams: enableDiagrams }
    // eslint-disable-next-line no-console
    console.log("submit", { topic, numSlides, enableImages, enableDiagrams });
  };

  return (
    <div className="mx-auto max-w-2xl p-6">
      <Card>
        <CardHeader>
          <CardTitle>AI 프레젠테이션 생성기</CardTitle>
          <CardDescription>주제 입력 + 이미지/다이어그램 옵션으로 PPT 생성 파이프라인을 시작합니다.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="topic">프레젠테이션 주제 *</Label>
              <Input
                id="topic"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="예: AI 기술의 비즈니스 활용"
                minLength={3}
                required
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>슬라이드 수</Label>
                <div className="text-sm text-muted-foreground">{numSlides}장</div>
              </div>
              <Slider
                value={[numSlides]}
                onValueChange={(v) => setNumSlides(v?.[0] ?? 7)}
                min={3}
                max={15}
                step={1}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>3</span>
                <span>15</span>
              </div>
            </div>

            <div className="space-y-3">
              <div className="text-sm font-medium">고급 옵션</div>
              <ImageToggle value={enableImages} onChange={setEnableImages} />
              <DiagramToggle value={enableDiagrams} onChange={setEnableDiagrams} />
            </div>

            <Button type="submit" disabled={topic.trim().length < 3} className="w-full">
              생성하기
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

