import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ArrowRight, CheckCircle2, FileText, Clock, BookOpen, Brain, Eye } from "lucide-react";

interface BriefWizardProps {
  onComplete: (data: BriefData) => void;
  onCancel: () => void;
  initialData?: Partial<BriefData>;
}

export interface BriefData {
  title: string;
  description: string;
  educationDuration: string;
  educationCourse: string;
  educationSession: string;
  documentContent: string;
  aiModel: string;
}

const BriefWizard = ({ onComplete, onCancel, initialData }: BriefWizardProps) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<BriefData>({
    title: initialData?.title || "",
    description: initialData?.description || "",
    educationDuration: initialData?.educationDuration || "",
    educationCourse: initialData?.educationCourse || "",
    educationSession: initialData?.educationSession || "",
    documentContent: initialData?.documentContent || "",
    aiModel: initialData?.aiModel || "gemini",
  });

  const totalSteps = 5;
  const progress = (currentStep / totalSteps) * 100;

  const steps = [
    { number: 1, title: "기본 정보", icon: FileText },
    { number: 2, title: "교육 설정", icon: Clock },
    { number: 3, title: "문서 내용", icon: BookOpen },
    { number: 4, title: "AI 모델", icon: Brain },
    { number: 5, title: "검토", icon: Eye },
  ];

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        return formData.title.trim() !== "";
      case 2:
        return true; // 교육 설정은 선택사항
      case 3:
        return formData.documentContent.trim() !== "";
      case 4:
        return formData.aiModel !== "";
      case 5:
        return true;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (!validateStep(currentStep)) {
      return;
    }
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete(formData);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">프로젝트 제목 *</Label>
              <Input
                id="title"
                placeholder="예: 인스타그램 릴스 만들기"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="text-lg"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">프로젝트 설명</Label>
              <Textarea
                id="description"
                placeholder="이 프로젝트에 대한 간단한 설명을 입력하세요"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={4}
              />
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="educationDuration">교육시간</Label>
              <Select
                value={formData.educationDuration}
                onValueChange={(value) => setFormData({ ...formData, educationDuration: value })}
              >
                <SelectTrigger id="educationDuration" className="bg-background">
                  <SelectValue placeholder="선택하세요" />
                </SelectTrigger>
                <SelectContent className="bg-background z-50">
                  <SelectItem value="1시간">1시간</SelectItem>
                  <SelectItem value="2시간">2시간</SelectItem>
                  <SelectItem value="3시간">3시간</SelectItem>
                  <SelectItem value="4시간">4시간</SelectItem>
                  <SelectItem value="반나절">반나절 (4-6시간)</SelectItem>
                  <SelectItem value="하루">하루 (8시간)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="educationCourse">교육과정</Label>
              <Select
                value={formData.educationCourse}
                onValueChange={(value) => setFormData({ ...formData, educationCourse: value })}
              >
                <SelectTrigger id="educationCourse" className="bg-background">
                  <SelectValue placeholder="선택하세요" />
                </SelectTrigger>
                <SelectContent className="bg-background z-50">
                  <SelectItem value="기본과정">기본과정</SelectItem>
                  <SelectItem value="심화과정">심화과정</SelectItem>
                  <SelectItem value="실무과정">실무과정</SelectItem>
                  <SelectItem value="전문가과정">전문가과정</SelectItem>
                  <SelectItem value="입문과정">입문과정</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="educationSession">교육 회차</Label>
              <Select
                value={formData.educationSession}
                onValueChange={(value) => setFormData({ ...formData, educationSession: value })}
              >
                <SelectTrigger id="educationSession" className="bg-background">
                  <SelectValue placeholder="선택하세요" />
                </SelectTrigger>
                <SelectContent className="bg-background z-50">
                  <SelectItem value="1">1회차</SelectItem>
                  <SelectItem value="2">2회차</SelectItem>
                  <SelectItem value="3">3회차</SelectItem>
                  <SelectItem value="4">4회차</SelectItem>
                  <SelectItem value="5">5회차</SelectItem>
                  <SelectItem value="6">6회차</SelectItem>
                  <SelectItem value="8">8회차</SelectItem>
                  <SelectItem value="10">10회차</SelectItem>
                  <SelectItem value="12">12회차</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="document">교육 콘텐츠 내용 *</Label>
              <Textarea
                id="document"
                placeholder="교육 콘텐츠로 만들고 싶은 내용(목적, 소재, 교육 목표 등)을 입력하세요..."
                value={formData.documentContent}
                onChange={(e) => setFormData({ ...formData, documentContent: e.target.value })}
                rows={12}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <FileText className="h-3 w-3" />
                기존 문서의 내용을 복사하여 붙여넣기 하세요
              </p>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <Label>AI 모델 선택</Label>
            <RadioGroup
              value={formData.aiModel}
              onValueChange={(value) => setFormData({ ...formData, aiModel: value })}
              className="space-y-3"
            >
              <div className="flex items-center space-x-3 p-4 border-2 rounded-lg hover:bg-accent/50 transition-colors cursor-pointer has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                <RadioGroupItem value="gemini" id="gemini" />
                <Label htmlFor="gemini" className="flex-1 cursor-pointer">
                  <div className="font-semibold text-base">Gemini</div>
                  <div className="text-sm text-muted-foreground">
                    빠르고 효율적인 콘텐츠 생성 (추천)
                  </div>
                </Label>
                <Badge variant="secondary">추천</Badge>
              </div>

              <div className="flex items-center space-x-3 p-4 border-2 rounded-lg hover:bg-accent/50 transition-colors cursor-pointer has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                <RadioGroupItem value="claude" id="claude" />
                <Label htmlFor="claude" className="flex-1 cursor-pointer">
                  <div className="font-semibold text-base">Claude</div>
                  <div className="text-sm text-muted-foreground">
                    깊이 있는 분석과 상세한 설명
                  </div>
                </Label>
              </div>

              <div className="flex items-center space-x-3 p-4 border-2 rounded-lg hover:bg-accent/50 transition-colors cursor-pointer has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                <RadioGroupItem value="chatgpt" id="chatgpt" />
                <Label htmlFor="chatgpt" className="flex-1 cursor-pointer">
                  <div className="font-semibold text-base">ChatGPT</div>
                  <div className="text-sm text-muted-foreground">
                    균형잡힌 성능과 창의성
                  </div>
                </Label>
              </div>
            </RadioGroup>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle2 className="h-5 w-5 text-success" />
              <h3 className="text-lg font-semibold">입력하신 정보를 확인해주세요</h3>
            </div>

            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold text-muted-foreground">기본 정보</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div>
                    <span className="text-xs text-muted-foreground">제목</span>
                    <p className="font-medium">{formData.title}</p>
                  </div>
                  {formData.description && (
                    <div>
                      <span className="text-xs text-muted-foreground">설명</span>
                      <p className="text-sm">{formData.description}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {(formData.educationDuration || formData.educationCourse || formData.educationSession) && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold text-muted-foreground">교육 설정</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-3 gap-4">
                    {formData.educationDuration && (
                      <div>
                        <span className="text-xs text-muted-foreground">시간</span>
                        <p className="text-sm font-medium">{formData.educationDuration}</p>
                      </div>
                    )}
                    {formData.educationCourse && (
                      <div>
                        <span className="text-xs text-muted-foreground">과정</span>
                        <p className="text-sm font-medium">{formData.educationCourse}</p>
                      </div>
                    )}
                    {formData.educationSession && (
                      <div>
                        <span className="text-xs text-muted-foreground">회차</span>
                        <p className="text-sm font-medium">{formData.educationSession}회차</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold text-muted-foreground">문서 내용</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-muted/50 p-3 rounded-lg max-h-32 overflow-y-auto">
                    <p className="text-xs font-mono whitespace-pre-wrap">{formData.documentContent}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold text-muted-foreground">AI 모델</CardTitle>
                </CardHeader>
                <CardContent>
                  <Badge variant="outline" className="text-sm">
                    {formData.aiModel === "gemini" && "Gemini"}
                    {formData.aiModel === "claude" && "Claude"}
                    {formData.aiModel === "chatgpt" && "ChatGPT"}
                  </Badge>
                </CardContent>
              </Card>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* 진행 상황 */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">브리프 위저드</h2>
          <span className="text-sm text-muted-foreground">
            {currentStep} / {totalSteps} 단계
          </span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* 단계 표시 */}
      <div className="flex items-center justify-between gap-2 overflow-x-auto pb-2">
        {steps.map((step) => {
          const Icon = step.icon;
          const isActive = currentStep === step.number;
          const isCompleted = currentStep > step.number;

          return (
            <div
              key={step.number}
              className={`flex flex-col items-center gap-2 min-w-[80px] ${
                isActive ? "opacity-100" : isCompleted ? "opacity-70" : "opacity-40"
              }`}
            >
              <div
                className={`flex items-center justify-center w-12 h-12 rounded-full border-2 transition-colors ${
                  isActive
                    ? "border-primary bg-primary text-primary-foreground"
                    : isCompleted
                    ? "border-success bg-success text-success-foreground"
                    : "border-muted bg-background"
                }`}
              >
                {isCompleted ? (
                  <CheckCircle2 className="h-5 w-5" />
                ) : (
                  <Icon className="h-5 w-5" />
                )}
              </div>
              <span className="text-xs font-medium text-center">{step.title}</span>
            </div>
          );
        })}
      </div>

      {/* 단계 내용 */}
      <Card>
        <CardHeader>
          <CardTitle>{steps[currentStep - 1].title}</CardTitle>
          <CardDescription>
            {currentStep === 1 && "프로젝트의 기본 정보를 입력해주세요"}
            {currentStep === 2 && "교육 관련 설정을 선택해주세요 (선택사항)"}
            {currentStep === 3 && "교육 콘텐츠의 기반이 될 문서를 입력해주세요"}
            {currentStep === 4 && "콘텐츠 생성에 사용할 AI 모델을 선택해주세요"}
            {currentStep === 5 && "입력하신 정보가 맞는지 확인해주세요"}
          </CardDescription>
        </CardHeader>
        <CardContent>{renderStepContent()}</CardContent>
      </Card>

      {/* 네비게이션 버튼 */}
      <div className="flex items-center justify-between gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={currentStep === 1 ? onCancel : handlePrevious}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          {currentStep === 1 ? "취소" : "이전"}
        </Button>
        <Button
          type="button"
          onClick={handleNext}
          disabled={!validateStep(currentStep)}
          className="gap-2"
        >
          {currentStep === totalSteps ? (
            <>
              <CheckCircle2 className="h-4 w-4" />
              프로젝트 생성
            </>
          ) : (
            <>
              다음
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default BriefWizard;
