/**
 * 전체 커리큘럼 카드 컴포넌트
 */

import { Clock, GraduationCap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ObjectivesList } from "./ObjectivesList";
import { SessionTable } from "./SessionTable";
import { AudienceSection } from "./AudienceSection";
import type { CurriculumData } from "./types";

interface CurriculumCardProps {
  curriculum: CurriculumData;
}

export function CurriculumCard({ curriculum }: CurriculumCardProps) {
  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <Card className="border-2 border-primary">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <CardTitle className="text-2xl flex items-center gap-2">
                <GraduationCap className="w-6 h-6 text-primary" />
                {curriculum.title}
              </CardTitle>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  총 교육 시간: <span className="font-semibold text-primary">{curriculum.totalDuration}</span>
                </div>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* 대상 학습자 */}
      <AudienceSection
        description={curriculum.targetAudienceAnalysis}
        prerequisites={curriculum.prerequisites}
      />

      {/* 학습 목표 */}
      <Card>
        <CardContent className="pt-6">
          <ObjectivesList objectives={curriculum.learningObjectives} />
        </CardContent>
      </Card>

      {/* 세션 구성 */}
      <Card>
        <CardContent className="pt-6">
          <SessionTable sessions={curriculum.sessions} />
        </CardContent>
      </Card>

      {/* 평가 전략 */}
      {curriculum.assessmentStrategy && (
        <Card className="border-amber-200 dark:border-amber-800">
          <CardHeader className="bg-amber-50 dark:bg-amber-950/20">
            <CardTitle className="text-base flex items-center gap-2 text-amber-900 dark:text-amber-100">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              평가 전략
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
              {curriculum.assessmentStrategy}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
