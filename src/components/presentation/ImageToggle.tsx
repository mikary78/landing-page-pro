import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function ImageToggle({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border p-4">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Label className="font-medium">자동 이미지 삽입</Label>
          <Tooltip>
            <TooltipTrigger asChild>
              <button type="button" className="text-xs text-muted-foreground underline">
                도움말
              </button>
            </TooltipTrigger>
            <TooltipContent>
              슬라이드 내용에 맞는 이미지를 Unsplash/Pexels에서 검색하여 삽입합니다.
            </TooltipContent>
          </Tooltip>
        </div>
        <p className="text-xs text-muted-foreground">고품질 무료 이미지 소스(Unsplash/Pexels) 기반</p>
      </div>
      <Switch checked={value} onCheckedChange={onChange} />
    </div>
  );
}

