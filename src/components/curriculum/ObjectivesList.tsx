/**
 * 학습 목표 리스트 컴포넌트
 */

import { Target } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ObjectivesListProps {
  objectives: string[];
  title?: string;
}

export function ObjectivesList({ objectives, title = "학습 목표" }: ObjectivesListProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Target className="w-5 h-5 text-blue-600" />
        <h3 className="font-semibold text-lg">{title}</h3>
        <Badge variant="secondary" className="ml-auto">{objectives.length}개</Badge>
      </div>
      <ul className="space-y-2">
        {objectives.map((objective, index) => (
          <li
            key={index}
            className="flex items-start gap-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30"
          >
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white text-sm font-medium flex items-center justify-center mt-0.5">
              {index + 1}
            </span>
            <span className="text-sm text-gray-700 dark:text-gray-300">{objective}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
