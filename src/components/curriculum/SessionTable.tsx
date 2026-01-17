/**
 * 세션 정보 테이블 컴포넌트 (아코디언 형태)
 */

import { useState } from "react";
import { Clock, ChevronDown, ChevronRight, BookOpen } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import type { SessionPlan } from "./types";

interface SessionTableProps {
  sessions: SessionPlan[];
}

export function SessionTable({ sessions }: SessionTableProps) {
  const [expandedSessions, setExpandedSessions] = useState<Set<number>>(new Set([1])); // 첫 번째 세션만 열림

  const toggleSession = (sessionNumber: number) => {
    setExpandedSessions((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(sessionNumber)) {
        newSet.delete(sessionNumber);
      } else {
        newSet.add(sessionNumber);
      }
      return newSet;
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-4">
        <BookOpen className="w-5 h-5 text-indigo-600" />
        <h3 className="font-semibold text-lg">세션 구성</h3>
        <Badge variant="secondary" className="ml-auto">{sessions.length}개 세션</Badge>
      </div>

      <div className="rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50 dark:bg-gray-900">
              <TableHead className="w-12"></TableHead>
              <TableHead className="w-20">회차</TableHead>
              <TableHead>세션 제목</TableHead>
              <TableHead className="w-32">
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  시간
                </div>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sessions.map((session) => {
              const isExpanded = expandedSessions.has(session.sessionNumber);
              return (
                <Collapsible
                  key={session.sessionNumber}
                  open={isExpanded}
                  onOpenChange={() => toggleSession(session.sessionNumber)}
                  asChild
                >
                  <>
                    <TableRow className={`cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900 ${isExpanded ? "bg-indigo-50 dark:bg-indigo-950/20" : ""}`}>
                      <TableCell>
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </Button>
                        </CollapsibleTrigger>
                      </TableCell>
                      <TableCell className="font-medium">
                        <Badge variant="outline" className="font-mono">
                          {session.sessionNumber}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{session.title}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{session.duration}</Badge>
                      </TableCell>
                    </TableRow>

                    {isExpanded && (
                      <TableRow>
                        <TableCell colSpan={4} className="bg-indigo-50/50 dark:bg-indigo-950/10">
                          <CollapsibleContent>
                            <div className="p-4 space-y-4">
                              {/* 핵심 주제 */}
                              <div>
                                <h4 className="text-sm font-semibold text-indigo-900 dark:text-indigo-100 mb-2">
                                  📌 핵심 주제
                                </h4>
                                <div className="flex flex-wrap gap-2">
                                  {session.keyTopics.map((topic, idx) => (
                                    <Badge
                                      key={idx}
                                      variant="outline"
                                      className="bg-white dark:bg-gray-900"
                                    >
                                      {topic}
                                    </Badge>
                                  ))}
                                </div>
                              </div>

                              {/* 학습 목표 */}
                              <div>
                                <h4 className="text-sm font-semibold text-indigo-900 dark:text-indigo-100 mb-2">
                                  🎯 학습 목표
                                </h4>
                                <ul className="space-y-1">
                                  {session.learningObjectives.map((objective, idx) => (
                                    <li key={idx} className="text-sm text-gray-700 dark:text-gray-300 flex items-start gap-2">
                                      <span className="text-indigo-600 dark:text-indigo-400 mt-0.5">•</span>
                                      <span>{objective}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>

                              {/* 기대 성과 */}
                              <div>
                                <h4 className="text-sm font-semibold text-indigo-900 dark:text-indigo-100 mb-2">
                                  ✨ 기대 성과
                                </h4>
                                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed bg-white dark:bg-gray-900 p-3 rounded-md border border-indigo-100 dark:border-indigo-900">
                                  {session.expectedOutcome}
                                </p>
                              </div>
                            </div>
                          </CollapsibleContent>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                </Collapsible>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
