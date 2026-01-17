/**
 * 대상 학습자 섹션 컴포넌트
 */

import { Users, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface AudienceSectionProps {
  description: string;
  prerequisites: string[];
}

export function AudienceSection({ description, prerequisites }: AudienceSectionProps) {
  return (
    <Card className="border-purple-200 dark:border-purple-800">
      <CardHeader className="bg-purple-50 dark:bg-purple-950/20">
        <CardTitle className="flex items-center gap-2 text-purple-900 dark:text-purple-100">
          <Users className="w-5 h-5" />
          대상 학습자
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4 space-y-4">
        <div>
          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
            {description}
          </p>
        </div>

        {prerequisites.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-semibold text-sm flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              선수 지식/조건
            </h4>
            <div className="flex flex-wrap gap-2">
              {prerequisites.map((prereq, index) => (
                <Badge
                  key={index}
                  variant="outline"
                  className="bg-green-50 dark:bg-green-950/20 border-green-300 dark:border-green-800 text-green-800 dark:text-green-300"
                >
                  {prereq}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
