import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function DiagramToggle({
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
          <Label className="font-medium">자동 다이어그램 생성</Label>
          <Tooltip>
            <TooltipTrigger asChild>
              <button type="button" className="text-xs text-muted-foreground underline">
                도움말
              </button>
            </TooltipTrigger>
            <TooltipContent>
              프로세스/관계/구조가 필요한 슬라이드에 Mermaid 다이어그램을 생성해 삽입합니다.
            </TooltipContent>
          </Tooltip>
        </div>
        <p className="text-xs text-muted-foreground">Mermaid CLI(mmdc) 렌더링 기반</p>
      </div>
      <Switch checked={value} onCheckedChange={onChange} />
    </div>
  );
}

