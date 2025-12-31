import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  BookOpen, Target, Users, Clock, Lightbulb, CheckSquare, 
  Presentation, Brain, Award, Star, Zap,
  Layout, FileText, Sparkles, 
  GraduationCap, CheckCircle2, Route, ClipboardCheck, Calendar,
  ArrowRight, User, Layers, PlayCircle, Code, X, Copy, Check
} from "lucide-react";
import { useMemo, useState } from "react";

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

// ===== 콘텐츠 분석 및 섹션 추출 =====
interface ExtractedSection {
  type: 'objectives' | 'audience' | 'overview' | 'sessions' | 'path' | 'assessment' | 'summary' | 'other';
  title: string;
  items: string[];
  subsections?: Array<{ title: string; items: string[] }>;
}

// 전체 콘텐츠에서 섹션 추출
const extractSections = (allContent: string): ExtractedSection[] => {
  const sections: ExtractedSection[] = [];
  
  // **섹션명** 또는 ## 섹션명 패턴으로 분리
  const sectionPattern = /(?:\*\*([^*]+)\*\*|\n##\s*([^\n]+))/g;
  const matches = [...allContent.matchAll(sectionPattern)];
  
  if (matches.length === 0) {
    // 패턴이 없으면 전체를 하나의 섹션으로
    return [{
      type: 'other',
      title: '콘텐츠',
      items: allContent.split('\n').filter(l => l.trim()).map(l => l.replace(/^[•\-*]\s*/, '').trim()),
    }];
  }
  
  // 각 섹션 추출
  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];
    const title = (match[1] || match[2]).trim();
    const startIdx = match.index! + match[0].length;
    const endIdx = matches[i + 1]?.index || allContent.length;
    const content = allContent.slice(startIdx, endIdx).trim();
    
    // 섹션 타입 결정
    const type = detectSectionType(title);
    
    // 서브섹션 추출 (세션 내부의 **세션 1:** 등)
    const subsectionPattern = /\*\*([^*]+):\*\*/g;
    const subsectionMatches = [...content.matchAll(subsectionPattern)];
    
    if (subsectionMatches.length > 0 && (type === 'overview' || type === 'sessions')) {
      const subsections: Array<{ title: string; items: string[] }> = [];
      
      for (let j = 0; j < subsectionMatches.length; j++) {
        const subMatch = subsectionMatches[j];
        const subTitle = subMatch[1].trim();
        const subStartIdx = subMatch.index! + subMatch[0].length;
        const subEndIdx = subsectionMatches[j + 1]?.index || content.length;
        const subContent = content.slice(subStartIdx, subEndIdx).trim();
        
        subsections.push({
          title: subTitle,
          items: parseListItems(subContent),
        });
      }
      
      sections.push({ type, title, items: [], subsections });
    } else {
      sections.push({
        type,
        title,
        items: parseListItems(content),
      });
    }
  }
  
  return sections;
};

// 리스트 아이템 파싱
const parseListItems = (content: string): string[] => {
  return content
    .split('\n')
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('**'))
    .map(line => line.replace(/^[•\-*]\s*/, '').replace(/^\d+[.)]\s*/, '').trim())
    .filter(line => line.length > 0);
};

// 섹션 타입 감지
const detectSectionType = (title: string): ExtractedSection['type'] => {
  const lower = title.toLowerCase();
  if (lower.includes('목표') || lower.includes('objective')) return 'objectives';
  if (lower.includes('대상') || lower.includes('학습자') || lower.includes('타겟')) return 'audience';
  if (lower.includes('커리큘럼') || lower.includes('개요') || lower.includes('구성')) return 'overview';
  if (lower.includes('세션') || lower.includes('차시') || lower.includes('수업')) return 'sessions';
  if (lower.includes('경로') || lower.includes('로드맵') || lower.includes('순서')) return 'path';
  if (lower.includes('평가') || lower.includes('퀴즈') || lower.includes('검토')) return 'assessment';
  if (lower.includes('요약') || lower.includes('정리')) return 'summary';
  return 'other';
};

// ===== HTML 코드 생성 =====
const generateHtmlCode = (title: string, description: string | undefined, aiModel: string, createdAt: string, sections: ExtractedSection[]): string => {
  const escapeHtml = (str: string) => str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  
  const generateSectionHtml = (section: ExtractedSection, index: number): string => {
    const colors: Record<ExtractedSection['type'], { bg: string; border: string; text: string; icon: string }> = {
      objectives: { bg: '#eff6ff', border: '#bfdbfe', text: '#1e40af', icon: '🎯' },
      audience: { bg: '#ecfdf5', border: '#a7f3d0', text: '#065f46', icon: '👥' },
      overview: { bg: '#fffbeb', border: '#fde68a', text: '#92400e', icon: '📋' },
      sessions: { bg: '#fffbeb', border: '#fde68a', text: '#92400e', icon: '📅' },
      path: { bg: '#eef2ff', border: '#c7d2fe', text: '#3730a3', icon: '🛤️' },
      assessment: { bg: '#fff1f2', border: '#fecdd3', text: '#be123c', icon: '✅' },
      summary: { bg: '#f0f9ff', border: '#bae6fd', text: '#075985', icon: '⭐' },
      other: { bg: '#f8fafc', border: '#e2e8f0', text: '#334155', icon: '📄' },
    };
    
    const color = colors[section.type];
    
    let itemsHtml = '';
    if (section.subsections && section.subsections.length > 0) {
      itemsHtml = section.subsections.map((sub, i) => `
      <div style="margin-left: 40px; margin-bottom: 16px; position: relative;">
        <div style="position: absolute; left: -30px; top: 0; width: 24px; height: 24px; background: linear-gradient(135deg, ${color.text}, ${color.border}); border-radius: 50%; color: white; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 12px;">${i + 1}</div>
        <div style="background: white; border-radius: 12px; padding: 16px; border: 1px solid ${color.border};">
          <h4 style="font-weight: bold; color: ${color.text}; margin-bottom: 8px;">${escapeHtml(sub.title)}</h4>
          <ul style="margin: 0; padding-left: 20px;">
            ${sub.items.map(item => `<li style="color: #475569; margin-bottom: 4px;">${escapeHtml(item)}</li>`).join('\n            ')}
          </ul>
        </div>
      </div>`).join('\n');
    } else {
      itemsHtml = section.items.map((item, i) => `
      <div style="display: flex; align-items: flex-start; gap: 12px; background: white; border-radius: 12px; padding: 16px; border: 1px solid ${color.border}; margin-bottom: 12px;">
        <div style="width: 28px; height: 28px; background: ${color.bg}; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
          <span style="color: ${color.text}; font-weight: bold; font-size: 12px;">${i + 1}</span>
        </div>
        <p style="color: #334155; margin: 0; line-height: 1.6;">${escapeHtml(item)}</p>
      </div>`).join('\n');
    }
    
    return `
  <!-- ${section.title} 섹션 -->
  <section style="background: linear-gradient(135deg, ${color.bg}, ${color.bg}); border-radius: 16px; padding: 24px; border: 2px solid ${color.border}; margin-bottom: 24px;">
    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 20px;">
      <div style="width: 48px; height: 48px; background: linear-gradient(135deg, ${color.text}, ${color.border}); border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 24px;">
        ${color.icon}
      </div>
      <h3 style="font-size: 20px; font-weight: bold; color: ${color.text}; margin: 0;">${escapeHtml(section.title)}</h3>
    </div>
    ${itemsHtml}
  </section>`;
  };

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)} - 인포그래픽</title>
  <style>
    * { box-sizing: border-box; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Noto Sans KR', sans-serif;
      margin: 0; 
      padding: 0; 
      background: #f1f5f9;
      line-height: 1.6;
    }
  </style>
</head>
<body>
  <!-- 헤더 -->
  <header style="background: linear-gradient(135deg, #2563eb, #4f46e5, #7c3aed); color: white; padding: 40px 24px;">
    <div style="max-width: 800px; margin: 0 auto;">
      <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
        <span style="background: rgba(255,255,255,0.2); padding: 4px 12px; border-radius: 20px; font-size: 12px;">✨ ${escapeHtml(aiModel.toUpperCase())} 생성</span>
        <span style="font-size: 14px; opacity: 0.8;">📅 ${new Date(createdAt).toLocaleDateString('ko-KR')}</span>
      </div>
      <h1 style="font-size: 32px; font-weight: bold; margin: 0 0 12px 0;">${escapeHtml(title)}</h1>
      ${description ? `<p style="font-size: 18px; opacity: 0.9; margin: 0;">${escapeHtml(description)}</p>` : ''}
    </div>
  </header>

  <!-- 메인 콘텐츠 -->
  <main style="max-width: 800px; margin: 0 auto; padding: 32px 24px;">
${sections.map((section, index) => generateSectionHtml(section, index)).join('\n')}
  </main>

  <!-- 푸터 -->
  <footer style="background: white; border-top: 1px solid #e2e8f0; padding: 24px; text-align: center;">
    <span style="background: linear-gradient(135deg, #eff6ff, #f5f3ff); padding: 8px 16px; border-radius: 20px; font-size: 14px; color: #3b82f6; border: 1px solid #bfdbfe;">
      ✨ AI Autopilot으로 생성된 교육 콘텐츠
    </span>
  </footer>
</body>
</html>`;
};

// ===== 인포그래픽 컴포넌트들 =====

// 학습 목표 - 체크마크 카드 그리드
const ObjectivesInfographic = ({ section }: { section: ExtractedSection }) => (
  <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl p-6 border-2 border-blue-200">
    <div className="flex items-center gap-3 mb-5">
      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 text-white flex items-center justify-center shadow-lg">
        <Target className="w-6 h-6" />
      </div>
      <h3 className="text-xl font-bold text-blue-800">{section.title}</h3>
    </div>
    <div className="grid gap-3">
      {section.items.map((item, i) => (
        <div key={i} className="flex items-start gap-3 bg-white rounded-xl p-4 shadow-sm border border-blue-100">
          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
            <CheckCircle2 className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-slate-700 leading-relaxed pt-1">{item}</p>
        </div>
      ))}
    </div>
  </div>
);

// 대상 학습자 - 프로필 카드
const AudienceInfographic = ({ section }: { section: ExtractedSection }) => (
  <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl p-6 border-2 border-emerald-200">
    <div className="flex items-center gap-3 mb-5">
      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white flex items-center justify-center shadow-lg">
        <Users className="w-6 h-6" />
      </div>
      <h3 className="text-xl font-bold text-emerald-800">{section.title}</h3>
    </div>
    <div className="grid md:grid-cols-2 gap-4">
      {section.items.map((item, i) => {
        const [label, ...rest] = item.split(':');
        const value = rest.join(':').trim();
        return (
          <div key={i} className="bg-white rounded-xl p-4 shadow-sm border border-emerald-100 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
              <User className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-emerald-700">{label}</p>
              {value && <p className="text-slate-600">{value}</p>}
            </div>
          </div>
        );
      })}
    </div>
  </div>
);

// 커리큘럼 개요 / 세션 - 타임라인 스텝
const SessionsInfographic = ({ section }: { section: ExtractedSection }) => {
  const sessions = section.subsections || section.items.map((item, i) => ({
    title: `항목 ${i + 1}`,
    items: [item],
  }));
  
  return (
    <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-6 border-2 border-amber-200">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 text-white flex items-center justify-center shadow-lg">
          <Calendar className="w-6 h-6" />
        </div>
        <h3 className="text-xl font-bold text-amber-800">{section.title}</h3>
      </div>
      
      <div className="relative">
        {/* 타임라인 선 */}
        <div className="absolute left-5 top-0 bottom-0 w-1 bg-gradient-to-b from-amber-400 to-orange-400 rounded-full" />
        
        <div className="space-y-4">
          {sessions.map((session, i) => (
            <div key={i} className="relative pl-14">
              {/* 타임라인 도트 */}
              <div className="absolute left-0 w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 text-white flex items-center justify-center font-bold shadow-lg border-4 border-amber-50 z-10">
                {i + 1}
              </div>
              
              <div className="bg-white rounded-xl p-4 shadow-sm border border-amber-100">
                <div className="flex items-center gap-2 mb-2">
                  <PlayCircle className="w-5 h-5 text-amber-600" />
                  <h4 className="font-bold text-amber-800">{session.title}</h4>
                </div>
                <ul className="space-y-1.5">
                  {session.items.map((item, j) => (
                    <li key={j} className="flex items-start gap-2 text-sm text-slate-600">
                      <span className="text-amber-500 mt-1">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// 학습 경로 - 플로우 차트
const PathInfographic = ({ section }: { section: ExtractedSection }) => {
  const pathItems = section.items.map(item => {
    const [label, ...rest] = item.split(':');
    return { title: label.trim(), desc: rest.join(':').trim() };
  });
  
  return (
    <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-6 border-2 border-indigo-200">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 text-white flex items-center justify-center shadow-lg">
          <Route className="w-6 h-6" />
        </div>
        <h3 className="text-xl font-bold text-indigo-800">{section.title}</h3>
      </div>
      
      <div className="flex flex-col md:flex-row items-stretch gap-3">
        {pathItems.map((item, i) => (
          <div key={i} className="flex-1 flex items-center gap-3">
            <div className="flex-1 bg-white rounded-xl p-5 shadow-sm border border-indigo-100 text-center relative">
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 text-white flex items-center justify-center font-bold text-sm shadow">
                {i + 1}
              </div>
              <div className="pt-3">
                <p className="font-bold text-indigo-800 mb-1">{item.title}</p>
                {item.desc && <p className="text-sm text-slate-600">{item.desc}</p>}
              </div>
            </div>
            {i < pathItems.length - 1 && (
              <ArrowRight className="w-6 h-6 text-indigo-400 flex-shrink-0 hidden md:block" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// 평가 - 체크리스트 카드
const AssessmentInfographic = ({ section }: { section: ExtractedSection }) => (
  <div className="bg-gradient-to-br from-rose-50 to-pink-50 rounded-2xl p-6 border-2 border-rose-200">
    <div className="flex items-center gap-3 mb-5">
      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-rose-500 to-pink-500 text-white flex items-center justify-center shadow-lg">
        <ClipboardCheck className="w-6 h-6" />
      </div>
      <h3 className="text-xl font-bold text-rose-800">{section.title}</h3>
    </div>
    <div className="grid md:grid-cols-2 gap-3">
      {section.items.map((item, i) => {
        const [label, ...rest] = item.split(':');
        const value = rest.join(':').trim();
        return (
          <div key={i} className="bg-white rounded-xl p-4 shadow-sm border border-rose-100 flex items-start gap-3">
            <div className="w-6 h-6 rounded bg-rose-100 flex items-center justify-center flex-shrink-0 mt-0.5">
              <CheckSquare className="w-4 h-4 text-rose-600" />
            </div>
            <div>
              <p className="font-semibold text-rose-800">{label}</p>
              {value && <p className="text-sm text-slate-600 mt-1">{value}</p>}
            </div>
          </div>
        );
      })}
    </div>
  </div>
);

// 기타 섹션 - 일반 카드
const OtherInfographic = ({ section, colorIndex }: { section: ExtractedSection; colorIndex: number }) => {
  const colors = [
    { from: 'from-slate-50', to: 'to-gray-50', border: 'border-slate-200', text: 'text-slate-800', gradient: 'from-slate-500 to-gray-500' },
    { from: 'from-violet-50', to: 'to-purple-50', border: 'border-violet-200', text: 'text-violet-800', gradient: 'from-violet-500 to-purple-500' },
    { from: 'from-cyan-50', to: 'to-blue-50', border: 'border-cyan-200', text: 'text-cyan-800', gradient: 'from-cyan-500 to-blue-500' },
  ];
  const color = colors[colorIndex % colors.length];
  
  return (
    <div className={`bg-gradient-to-br ${color.from} ${color.to} rounded-2xl p-6 border-2 ${color.border}`}>
      <div className="flex items-center gap-3 mb-5">
        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${color.gradient} text-white flex items-center justify-center shadow-lg`}>
          <Layers className="w-6 h-6" />
        </div>
        <h3 className={`text-xl font-bold ${color.text}`}>{section.title}</h3>
      </div>
      <div className="space-y-2">
        {section.items.map((item, i) => (
          <div key={i} className="bg-white rounded-lg p-3 shadow-sm border flex items-start gap-3">
            <span className={`w-6 h-6 rounded-full bg-gradient-to-br ${color.gradient} text-white flex items-center justify-center text-xs font-bold flex-shrink-0`}>
              {i + 1}
            </span>
            <p className="text-slate-700">{item}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

// 섹션 렌더링 선택
const renderSection = (section: ExtractedSection, index: number) => {
  switch (section.type) {
    case 'objectives':
      return <ObjectivesInfographic key={index} section={section} />;
    case 'audience':
      return <AudienceInfographic key={index} section={section} />;
    case 'overview':
    case 'sessions':
      return <SessionsInfographic key={index} section={section} />;
    case 'path':
      return <PathInfographic key={index} section={section} />;
    case 'assessment':
      return <AssessmentInfographic key={index} section={section} />;
    default:
      return <OtherInfographic key={index} section={section} colorIndex={index} />;
  }
};

// ===== Code View 모달 =====
const CodeViewModal = ({ 
  isOpen, 
  onClose, 
  code, 
  onCodeChange 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  code: string; 
  onCodeChange: (code: string) => void;
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-[90vw] max-w-4xl h-[85vh] flex flex-col">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-slate-700 to-slate-900 text-white flex items-center justify-center">
              <Code className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-lg">HTML 코드 보기</h2>
              <p className="text-sm text-muted-foreground">인포그래픽을 HTML로 내보내기</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleCopy}
              className="gap-2"
            >
              {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
              {copied ? '복사됨!' : '복사'}
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* 코드 에디터 */}
        <div className="flex-1 overflow-hidden p-4">
          <textarea
            value={code}
            onChange={(e) => onCodeChange(e.target.value)}
            className="w-full h-full font-mono text-sm bg-slate-900 text-slate-100 p-4 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            spellCheck={false}
            aria-label="HTML 코드 편집기"
          />
        </div>

        {/* 푸터 */}
        <div className="px-6 py-4 border-t bg-slate-50 rounded-b-2xl">
          <p className="text-sm text-muted-foreground">
            이 HTML 코드를 복사하여 웹 페이지에 붙여넣거나 .html 파일로 저장할 수 있습니다.
          </p>
        </div>
      </div>
    </div>
  );
};

// ===== 메인 컴포넌트 =====
export const InfographicPreview = ({ 
  title, 
  description, 
  aiModel, 
  stages,
  createdAt,
}: InfographicPreviewProps) => {
  const [showCodeView, setShowCodeView] = useState(false);
  const [editableCode, setEditableCode] = useState('');

  // 완료된 단계의 콘텐츠를 모두 합침
  const allContent = useMemo(() => {
    return stages
      .filter(s => s.status === "completed" && s.content)
      .sort((a, b) => a.stage_order - b.stage_order)
      .map(s => s.content)
      .join('\n\n');
  }, [stages]);
    
  // 콘텐츠에서 섹션 추출
  const sections = useMemo(() => {
    if (!allContent) return [];
    return extractSections(allContent);
  }, [allContent]);

  // HTML 코드 생성
  const htmlCode = useMemo(() => {
    return generateHtmlCode(title, description, aiModel, createdAt, sections);
  }, [title, description, aiModel, createdAt, sections]);

  // Code View 열기
  const handleOpenCodeView = () => {
    setEditableCode(htmlCode);
    setShowCodeView(true);
  };

  if (sections.length === 0) {
    return (
      <div className="min-h-[400px] flex items-center justify-center bg-slate-50">
        <div className="text-center p-8">
          <div className="text-6xl mb-4">📊</div>
          <h3 className="text-xl font-bold mb-2">인포그래픽 준비 중</h3>
          <p className="text-muted-foreground">
            AI가 콘텐츠를 생성하면 인포그래픽이 자동으로 표시됩니다.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-100 min-h-screen relative">
      {/* 헤더 */}
      <header className="bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 text-white relative">
        {/* Code View 버튼 - 헤더 우측 상단 */}
        <Button
          variant="outline"
          size="sm"
          onClick={handleOpenCodeView}
          className="absolute top-4 right-4 gap-2 bg-white/20 hover:bg-white/30 text-white border-white/40 hover:border-white/60"
        >
          <Code className="w-4 h-4" />
          Code View
        </Button>

        <div className="max-w-4xl mx-auto px-6 py-10">
          <div className="flex items-center gap-2 mb-3">
            <Badge className="bg-white/20 text-white border-white/30 hover:bg-white/30">
            <Sparkles className="w-3 h-3 mr-1" />
            {aiModel.toUpperCase()} 생성
          </Badge>
            <span className="text-sm text-white/80 flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {new Date(createdAt).toLocaleDateString("ko-KR")}
            </span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-3">{title}</h1>
          {description && (
            <p className="text-lg text-white/90 leading-relaxed">{description}</p>
          )}
        </div>
      </header>

      {/* 인포그래픽 섹션들 */}
      <main className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {sections.map((section, index) => renderSection(section, index))}
      </main>

        {/* 푸터 */}
      <footer className="bg-white border-t">
        <div className="max-w-4xl mx-auto px-6 py-6 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-50 to-violet-50 rounded-full border border-blue-100">
            <Sparkles className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-700">
              AI Autopilot으로 생성된 교육 콘텐츠
            </span>
          </div>
        </div>
      </footer>

      {/* Code View 모달 */}
      <CodeViewModal
        isOpen={showCodeView}
        onClose={() => setShowCodeView(false)}
        code={editableCode}
        onCodeChange={setEditableCode}
      />
    </div>
  );
};
