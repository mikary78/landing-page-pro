import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Clock, CheckCircle2, Brain, Sparkles, TrendingUp, ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useState } from "react";

interface InfographicPreviewProps {
  title: string;
  description?: string;
  aiModel: string;
  stages: Array<{
    id: string;
    stage_name: string;
    status: string;
    content?: string;
    stage_order: number;
  }>;
  createdAt: string;
  generatedContent?: string;
}

export const InfographicPreview = ({ 
  title, 
  description, 
  aiModel, 
  stages,
  createdAt,
  generatedContent 
}: InfographicPreviewProps) => {
  const completedStages = stages.filter(s => s.status === 'completed').length;
  const progressPercentage = stages.length > 0 ? (completedStages / stages.length) * 100 : 0;
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});

  // Parse generated content into sections
  const parseSections = (content?: string) => {
    if (!content) return [];
    const sections = content.split(/\n#{1,2}\s+/).filter(Boolean);
    return sections.map((section, index) => {
      const lines = section.split('\n').filter(line => line.trim());
      const sectionTitle = lines[0]?.replace(/^#+\s*/, '') || `섹션 ${index + 1}`;
      const sectionContent = lines.slice(1).join('\n');
      return { title: sectionTitle, content: sectionContent };
    });
  };

  const sections = parseSections(generatedContent);

  const toggleSection = (index: number) => {
    setOpenSections(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
      {/* 헤더 섹션 */}
      <div className="bg-gradient-to-r from-blue-600 via-blue-500 to-blue-400 text-white py-16 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-block px-4 py-2 bg-white/20 rounded-full text-sm mb-6">
            {aiModel.toUpperCase()} 생성 보고서
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">{title}</h1>
          {description && (
            <p className="text-xl text-blue-100">{description}</p>
          )}
        </div>
      </div>

      {/* 메인 컨텐츠 */}
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 왼쪽 메인 컨텐츠 */}
          <div className="lg:col-span-2 space-y-6">
            {/* 개요 카드 */}
            <Card className="border-2 border-blue-100 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-transparent">
                <CardTitle className="flex items-center gap-2 text-blue-700">
                  <Sparkles className="w-5 h-5" />
                  프로젝트 개요
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                {generatedContent ? (
                  <div className="prose prose-sm max-w-none">
                    {sections.slice(0, 1).map((section, index) => (
                      <div key={index}>
                        <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                          {section.content}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">아직 결과물이 생성되지 않았습니다.</p>
                )}
              </CardContent>
            </Card>

            {/* 상세 섹션들 */}
            {sections.slice(1).map((section, index) => (
              <Collapsible
                key={index + 1}
                open={openSections[index + 1] ?? false}
                onOpenChange={() => toggleSection(index + 1)}
              >
                <Card className="border-2 border-blue-100 shadow-lg overflow-hidden">
                  <CollapsibleTrigger className="w-full">
                    <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-400 text-white hover:from-blue-600 hover:to-blue-500 transition-all cursor-pointer">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-sm font-bold">
                            {index + 1}
                          </div>
                          <CardTitle className="text-lg">{section.title}</CardTitle>
                        </div>
                        <ChevronDown 
                          className={`w-5 h-5 transition-transform ${openSections[index + 1] ? 'rotate-180' : ''}`} 
                        />
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="pt-6">
                      <div className="prose prose-sm max-w-none">
                        <div className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                          {section.content}
                        </div>
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            ))}
          </div>

          {/* 오른쪽 사이드바 */}
          <div className="space-y-6">
            {/* 프로젝트 정보 */}
            <Card className="border-2 border-blue-100 shadow-lg sticky top-6">
              <CardHeader className="bg-gradient-to-br from-blue-50 to-transparent">
                <CardTitle className="text-lg text-blue-700">📋 프로젝트 정보</CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <span className="text-sm font-medium text-blue-900">진행률</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 bg-blue-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-blue-500 to-blue-400 transition-all duration-500"
                          style={{ width: `${progressPercentage}%` }}
                        />
                      </div>
                      <span className="text-sm font-bold text-blue-600">
                        {Math.round(progressPercentage)}%
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <span className="text-sm font-medium text-green-900">완료 단계</span>
                    <span className="text-sm font-bold text-green-600">
                      {completedStages} / {stages.length}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                    <span className="text-sm font-medium text-purple-900">AI 모델</span>
                    <Badge className="bg-purple-500 hover:bg-purple-600">
                      {aiModel.toUpperCase()}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm font-medium text-gray-900">생성일</span>
                    <span className="text-xs text-gray-600">
                      {new Date(createdAt).toLocaleDateString('ko-KR')}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 프로세스 단계 */}
            <Card className="border-2 border-blue-100 shadow-lg">
              <CardHeader className="bg-gradient-to-br from-blue-50 to-transparent">
                <CardTitle className="text-lg text-blue-700">🔄 프로세스 단계</CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-3">
                  {stages.map((stage) => {
                    const isCompleted = stage.status === 'completed';
                    const isProcessing = stage.status === 'processing';
                    
                    return (
                      <div 
                        key={stage.id} 
                        className={`flex items-start gap-3 p-3 rounded-lg transition-all ${
                          isCompleted ? 'bg-green-50' :
                          isProcessing ? 'bg-blue-50' :
                          'bg-gray-50'
                        }`}
                      >
                        <div 
                          className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                            isCompleted ? 'bg-green-500' :
                            isProcessing ? 'bg-blue-500 animate-pulse' :
                            'bg-gray-300'
                          }`}
                        >
                          {isCompleted ? (
                            <CheckCircle2 className="w-4 h-4 text-white" />
                          ) : (
                            <span className="text-xs font-bold text-white">
                              {stage.stage_order}
                            </span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium truncate ${
                            isCompleted ? 'text-green-900' :
                            isProcessing ? 'text-blue-900' :
                            'text-gray-600'
                          }`}>
                            {stage.stage_name}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};
