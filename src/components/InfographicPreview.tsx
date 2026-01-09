import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  BookOpen, Target, Users, Clock, Lightbulb, CheckSquare, 
  Presentation, Brain, Award, Star, Zap,
  Layout, FileText, Sparkles, 
  GraduationCap, CheckCircle2, Route, ClipboardCheck, Calendar,
  ArrowRight, User, Layers, PlayCircle, Code, X, Copy, Check,
  ChevronRight, ChevronLeft
} from "lucide-react";
import { useMemo, useState, useEffect } from "react";

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
    ai_model?: string;
  }>;
  createdAt: string;
  generatedContent?: string;
}

// ===== 최종 결과물 파싱 =====
interface ParsedCurriculum {
  goals: string[];
  steps: Array<{
    title: string;
    duration?: string;
    content: Array<{
      time?: string;
      activity: string;
      desc?: string;
    }>;
    improvement?: string;
  }>;
  assessment: {
    methods: string[];
    criteria?: string;
  };
  materials: string[];
  totalDuration?: string;
  targetAudience?: string;
}

// 최종 결과물에서 구조화된 데이터 추출
const parseFinalContent = (content: string): ParsedCurriculum => {
  const result: ParsedCurriculum = {
    goals: [],
    steps: [],
    assessment: { methods: [] },
    materials: [],
  };

  console.log('[parseFinalContent] Content preview:', content.substring(0, 1000));

  // 교육 목표 추출 (커리큘럼 설계 섹션)
  // 패턴 1: ## 커리큘럼 설계 (표준 형식)
  // 패턴 2: ## 프로젝트명 - 커리큘럼 설계 (코스 상세 페이지 형식)
  let curriculumMatch = content.match(/##\s*커리큘럼 설계\s*\n([\s\S]*?)(?=\n---+\s*\n|\n##\s+[^\n]|$)/);
  
  // 패턴 2 시도: ## 프로젝트명 - 커리큘럼 설계
  if (!curriculumMatch) {
    curriculumMatch = content.match(/##\s*[^-]+\s*-\s*커리큘럼 설계\s*\n([\s\S]*?)(?=\n---+\s*\n|\n##\s+[^\n]|$)/);
  }
  
  // 여러 프로젝트의 커리큘럼 섹션을 모두 찾아서 통합
  if (!curriculumMatch) {
    const allCurriculumMatches = content.matchAll(/##\s*[^-]*\s*-?\s*커리큘럼 설계\s*\n([\s\S]*?)(?=\n---+\s*\n|\n##\s+[^\n]|$)/g);
    const curriculumContents: string[] = [];
    for (const match of allCurriculumMatches) {
      curriculumContents.push(match[1]);
    }
    if (curriculumContents.length > 0) {
      curriculumMatch = [null, curriculumContents.join('\n\n---\n\n')] as RegExpMatchArray;
    }
  }
  
  console.log('[parseFinalContent] Curriculum section found:', !!curriculumMatch);
  
  if (curriculumMatch) {
    let curriculumContent = curriculumMatch[1];
    // 끝에 있는 --- 구분자 제거
    curriculumContent = curriculumContent.replace(/\n---+\s*$/, '').trim();
    console.log('[parseFinalContent] Curriculum content length:', curriculumContent.length);
    console.log('[parseFinalContent] Curriculum content preview:', curriculumContent.substring(0, 1000));
    
    // 교육 목표 (더 유연한 패턴)
    const goalsPatterns = [
      /####?\s*교육 목표([\s\S]*?)(?=####?|###?|##|$)/i,
      /###?\s*교육 목표([\s\S]*?)(?=###?|##|$)/i,
      /\*\*\d+\.\s*교육 목표\*\*([\s\S]*?)(?=\*\*\d+\.|##|$)/i, // **2. 교육 목표** 형식
      /교육 목표[:\s]*\n([\s\S]*?)(?=####?|###?|##|$)/i,
    ];
    
    for (const pattern of goalsPatterns) {
      const goalsMatch = curriculumContent.match(pattern);
      console.log('[parseFinalContent] Trying goals pattern:', pattern, 'Match:', !!goalsMatch);
      if (goalsMatch) {
        const goalsText = goalsMatch[1];
        console.log('[parseFinalContent] Goals text preview:', goalsText.substring(0, 200));
        
        // 여러 형식 지원: -, *, •, 숫자 목록
        const rawGoals = goalsText.split('\n');
        console.log('[parseFinalContent] Raw goals lines:', rawGoals.length);
        
        result.goals = rawGoals
          .map((line, idx) => {
            const original = line;
            // 불릿 포인트 제거
            line = line.replace(/^[•\-*]\s*/, '');
            // 숫자 목록 제거
            line = line.replace(/^\d+[.)]\s*/, '');
            // **제목:** 형식 제거
            line = line.replace(/^\*\*[^*]+\*\*\s*/, '');
            const trimmed = line.trim();
            if (trimmed && trimmed.length > 10) {
              console.log(`[parseFinalContent] Goal ${idx}: "${original}" -> "${trimmed}"`);
            }
            return trimmed;
          })
          .filter(line => {
            // 빈 줄, 헤더 제외 (길이 제한 완화)
            const isValid = line && 
                   !line.startsWith('#') && 
                   !line.startsWith('**') &&
                   line.length > 5 &&  // 10에서 5로 완화
                   !line.match(/^[•\-*]\s*$/) &&
                   !line.match(/^[\d.]+\s*$/) &&
                   !line.match(/^[:-]\s*$/); // 콜론이나 대시만 있는 줄 제외
            return isValid;
          });
        console.log('[parseFinalContent] Goals found:', result.goals.length, result.goals);
        if (result.goals.length > 0) break;
      }
    }

    // 교육 시간
    const durationPatterns = [
      /####?\s*교육 시간[:\s]*([^\n]+)/i,
      /\*\*교육 기간:\*\*\s*([^\n]+)/i, // **교육 기간:** 형식
      /교육 기간[:\s]*([^\n]+)/i,
    ];
    for (const pattern of durationPatterns) {
      const durationMatch = curriculumContent.match(pattern);
      if (durationMatch) {
        result.totalDuration = durationMatch[1].trim();
        break;
      }
    }
    
    // 교육 대상
    const targetAudiencePatterns = [
      /####?\s*교육 대상[:\s]*([^\n]+)/i,
      /\*\*대상:\*\*\s*([^\n]+)/i, // **대상:** 형식
      /대상[:\s]*([^\n]+)/i,
    ];
    for (const pattern of targetAudiencePatterns) {
      const targetMatch = curriculumContent.match(pattern);
      if (targetMatch) {
        result.targetAudience = targetMatch[1].trim();
        break;
      }
    }

    // 교육 자료
    const materialsPatterns = [
      /####?\s*교육 자료([\s\S]*?)(?=####?|###?|##|$)/i,
      /교육 자료[:\s]*\n([\s\S]*?)(?=####?|###?|##|$)/i,
    ];
    for (const pattern of materialsPatterns) {
      const materialsMatch = curriculumContent.match(pattern);
      if (materialsMatch) {
        console.log('[parseFinalContent] Materials text preview:', materialsMatch[1].substring(0, 200));
        const rawMaterials = materialsMatch[1]
          .split('\n')
          .map(line => line.trim())
          .filter(line => line.length > 0);
        console.log('[parseFinalContent] Raw materials lines:', rawMaterials.length);
        
        result.materials = rawMaterials
          .map(line => {
            // 리스트 항목 형식 제거
            line = line.replace(/^[•\-*]\s*/, '').replace(/^\d+[.)]\s*/, '').trim();
            // HTML 태그 제거 (<br> 등)
            line = line.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').trim();
            return line;
          })
          .filter(line => line && !line.startsWith('#') && line.length > 2 && !line.match(/^[•\-*]\s*$/));
        
        console.log('[parseFinalContent] Materials found:', result.materials.length);
        if (result.materials.length > 0) break;
      }
    }

    // 평가 방법
    const assessmentPatterns = [
      /####?\s*평가 방법([\s\S]*?)(?=####?|$)/i,
      /평가 방법[:\s]*\n([\s\S]*?)(?=####?|###?|$)/i,
    ];
    for (const pattern of assessmentPatterns) {
      const assessmentMatch = curriculumContent.match(pattern);
      if (assessmentMatch) {
        result.assessment.methods = assessmentMatch[1]
          .split('\n')
          .map(line => line.replace(/^[•\-*]\s*/, '').replace(/^\d+[.)]\s*/, '').trim())
          .filter(line => line && !line.startsWith('#') && line.length > 3 && !line.match(/^[•\-*]\s*$/));
        if (result.assessment.methods.length > 0) break;
      }
    }

    // 커리큘럼 개요에서 단계 추출
    const overviewPatterns = [
      /####?\s*커리큘럼 개요([\s\S]*?)(?=####?|$)/i,
      /\*\*\d+\.\s*커리큘럼 구조\*\*([\s\S]*?)(?=\*\*\d+\.|##\s+[^#]|$)/i, // **3. 커리큘럼 구조** 형식 (## 다음 섹션 전까지)
      /커리큘럼 개요[:\s]*\n([\s\S]*?)(?=####?|###?|$)/i,
      /커리큘럼 구조[:\s]*\n([\s\S]*?)(?=####?|###?|$)/i,
    ];
    
    // 주차별 내용을 직접 찾기 (overviewPatterns 밖에서)
    const directWeeklyMatch = curriculumContent.match(/###\s*주차별 내용\s*\n([\s\S]*?)(?=###|##\s+[^#]|$)/i);
    if (directWeeklyMatch && result.steps.length === 0) {
      const weeklyContent = directWeeklyMatch[1];
      console.log('[parseFinalContent] Found direct weekly content, length:', weeklyContent.length);
      
      // **1주차: 제목** 형식 파싱
      const weeklyPattern = /\*\*(\d+주차[^:]*):\s*([^*]+)\*\*([\s\S]*?)(?=\*\*\d+주차|$)/g;
      const weeklyMatches = [...weeklyContent.matchAll(weeklyPattern)];
      
      if (weeklyMatches.length > 0) {
        for (const match of weeklyMatches) {
          const weekTitle = `${match[1]}: ${match[2].trim()}`;
          const weekContent = match[3] || '';
          
          // 회차별 내용 파싱 (- **1회차:** 형식)
          const sessionPattern = /-\s*\*\*(\d+회차[^:]*):\s*([^*]+)\*\*([\s\S]*?)(?=-\s*\*\*\d+회차|$)/g;
          const sessionMatches = [...weekContent.matchAll(sessionPattern)];
          
          const activities: Array<{ time?: string; activity: string; desc?: string }> = [];
          
          if (sessionMatches.length > 0) {
            for (const sessionMatch of sessionMatches) {
              const sessionTitle = `${sessionMatch[1]}: ${sessionMatch[2].trim()}`;
              const sessionContent = sessionMatch[3] || '';
              
              // 세션 내용의 리스트 항목 파싱
              const sessionItems = sessionContent
                .split('\n')
                .map(line => line.trim())
                .filter(line => line && line.startsWith('-') && !line.startsWith('**'))
                .map(line => line.replace(/^-\s*/, '').trim())
                .filter(line => line.length > 2);
              
              if (sessionItems.length > 0) {
                activities.push({
                  activity: sessionTitle,
                  desc: sessionItems.join(', '),
                });
              } else {
                activities.push({ activity: sessionTitle });
              }
            }
          } else {
            // 회차 형식이 없으면 전체 내용을 활동으로 추가
            const weekItems = weekContent
              .split('\n')
              .map(line => line.trim())
              .filter(line => line && line.startsWith('-') && !line.startsWith('**'))
              .map(line => line.replace(/^-\s*/, '').trim())
              .filter(line => line.length > 2);
            
            if (weekItems.length > 0) {
              activities.push(...weekItems.map(item => ({ activity: item })));
            }
          }
          
          result.steps.push({
            title: weekTitle,
            duration: '2시간',
            content: activities.length > 0 ? activities : [{ activity: weekTitle }],
          });
        }
        
        if (result.steps.length > 0) {
          console.log('[parseFinalContent] Parsed steps from direct weekly content:', result.steps.length);
        }
      }
    }
    for (const pattern of overviewPatterns) {
      const overviewMatch = curriculumContent.match(pattern);
      if (overviewMatch) {
        const overviewContent = overviewMatch[1];
        console.log('[parseFinalContent] Overview content preview:', overviewContent.substring(0, 300));
        
        // 테이블 형식 파싱 시도
        const tableMatch = overviewContent.match(/\|[\s\S]*?\n\|[-\s|:]+\|\n([\s\S]*?)(?=\n####?|\n###?|$)/);
        if (tableMatch) {
          console.log('[parseFinalContent] Found table format');
          const tableRows = tableMatch[1].split('\n').filter(row => row.trim().startsWith('|'));
          
          for (const row of tableRows) {
            const cells = row.split('|').map(cell => cell.trim()).filter(cell => cell);
            if (cells.length >= 2) {
              const week = cells[0]; // 주차
              const title = cells[1]; // 주제
              const content = cells[2] || ''; // 학습 내용
              const activity = cells[3] || ''; // 활동/과제
              
              console.log('[parseFinalContent] Parsing table row:', { week, title, content: content.substring(0, 50), activity: activity.substring(0, 50) });
              
              const activities: Array<{ time?: string; activity: string; desc?: string }> = [];
              
              // 학습 내용 파싱
              if (content) {
                // <br> 태그로 분리
                const contentItems = content.split(/<br\s*\/?>/i).map(item => item.trim()).filter(item => item);
                // 각 항목에서 리스트 마커 제거
                contentItems.forEach(item => {
                  let cleanItem = item.replace(/^[-\s•*]\s*/, '').trim();
                  // HTML 태그 제거
                  cleanItem = cleanItem.replace(/<[^>]+>/g, '').trim();
                  if (cleanItem && cleanItem.length > 2) {
                    activities.push({ activity: cleanItem });
                  }
                });
              }
              
              // 활동/과제 추가
              if (activity) {
                let cleanActivity = activity.replace(/^[-\s•*]\s*/, '').trim();
                // HTML 태그 제거
                cleanActivity = cleanActivity.replace(/<[^>]+>/g, '').trim();
                if (cleanActivity && cleanActivity.length > 2) {
                  activities.push({ activity: cleanActivity, desc: '과제' });
                }
              }
              
              // 최소한 제목은 있어야 함
              if (title && title.length > 0) {
                const step = {
                  title: title,
                  duration: '2시간',
                  content: activities.length > 0 ? activities : [{ activity: title }],
                };
                console.log('[parseFinalContent] Created step:', {
                  title: step.title,
                  activitiesCount: step.content.length,
                  activities: step.content.map(a => a.activity).slice(0, 3) // 첫 3개만
                });
                result.steps.push(step);
              }
            }
          }
          
          if (result.steps.length > 0) {
            console.log('[parseFinalContent] Parsed steps from table:', result.steps.length);
            break; // 테이블 파싱 성공
          }
        }
        
        // 주차별 내용 파싱 시도 (### 주차별 내용 형식)
        const weeklyContentMatch = overviewContent.match(/###\s*주차별 내용\s*\n([\s\S]*?)(?=###|##|$)/i);
        if (weeklyContentMatch) {
          const weeklyContent = weeklyContentMatch[1];
          // **1주차: 제목** 형식 파싱
          const weeklyPattern = /\*\*(\d+주차[^:]*):\s*([^*]+)\*\*([\s\S]*?)(?=\*\*\d+주차|$)/g;
          const weeklyMatches = [...weeklyContent.matchAll(weeklyPattern)];
          
          if (weeklyMatches.length > 0) {
            for (const match of weeklyMatches) {
              const weekTitle = `${match[1]}: ${match[2].trim()}`;
              const weekContent = match[3] || '';
              
              // 회차별 내용 파싱 (- **1회차:** 형식)
              const sessionPattern = /-\s*\*\*(\d+회차[^:]*):\s*([^*]+)\*\*([\s\S]*?)(?=-\s*\*\*\d+회차|$)/g;
              const sessionMatches = [...weekContent.matchAll(sessionPattern)];
              
              const activities: Array<{ time?: string; activity: string; desc?: string }> = [];
              
              if (sessionMatches.length > 0) {
                for (const sessionMatch of sessionMatches) {
                  const sessionTitle = `${sessionMatch[1]}: ${sessionMatch[2].trim()}`;
                  const sessionContent = sessionMatch[3] || '';
                  
                  // 세션 내용의 리스트 항목 파싱
                  const sessionItems = sessionContent
                    .split('\n')
                    .map(line => line.trim())
                    .filter(line => line && line.startsWith('-') && !line.startsWith('**'))
                    .map(line => line.replace(/^-\s*/, '').trim())
                    .filter(line => line.length > 2);
                  
                  if (sessionItems.length > 0) {
                    activities.push({
                      activity: sessionTitle,
                      desc: sessionItems.join(', '),
                    });
                  } else {
                    activities.push({ activity: sessionTitle });
                  }
                }
              } else {
                // 회차 형식이 없으면 전체 내용을 활동으로 추가
                const weekItems = weekContent
                  .split('\n')
                  .map(line => line.trim())
                  .filter(line => line && line.startsWith('-') && !line.startsWith('**'))
                  .map(line => line.replace(/^-\s*/, '').trim())
                  .filter(line => line.length > 2);
                
                if (weekItems.length > 0) {
                  activities.push(...weekItems.map(item => ({ activity: item })));
                }
              }
              
              result.steps.push({
                title: weekTitle,
                duration: '2시간',
                content: activities.length > 0 ? activities : [{ activity: weekTitle }],
              });
            }
            
            if (result.steps.length > 0) {
              console.log('[parseFinalContent] Parsed steps from weekly content:', result.steps.length);
              break; // 주차별 내용 파싱 성공
            }
          }
        }
        
        // 리스트 형식 파싱 시도 (기존 로직)
        const stepPatterns = [
          /\d+\.\s*\*\*([^*]+)\*\*([\s\S]*?)(?=\d+\.|$)/g,
          /\d+\.\s*([^\n]+)([\s\S]*?)(?=\d+\.|$)/g,
        ];
        
        for (const stepPattern of stepPatterns) {
          const stepMatches = [...overviewContent.matchAll(stepPattern)];
          if (stepMatches.length > 0) {
            for (const match of stepMatches) {
              const stepTitle = match[1].trim().replace(/^#+\s*/, '').trim();
              const stepContent = match[2] || '';
              const activities = stepContent
                .split('\n')
                .map(line => {
                  line = line.replace(/^[\s\-•*]\s*/, '').trim();
                  return line;
                })
                .filter(line => line && !line.startsWith('#') && line.length > 2)
                .map(item => ({ activity: item }));
              
              result.steps.push({
                title: stepTitle,
                content: activities.length > 0 ? activities : [{ activity: stepTitle }],
              });
            }
            break; // 첫 번째 패턴에서 매칭되면 종료
          }
        }
        break; // 첫 번째 overview 패턴에서 매칭되면 종료
      }
    }
  }

  // 수업안 작성 섹션에서 상세 단계 추출
  // 패턴: ## 수업안 작성 다음부터 --- 구분자 또는 ## (공백 포함)로 시작하는 다음 섹션까지
  const lessonPlanMatch = content.match(/##\s*수업안 작성\s*\n([\s\S]*?)(?=\n---+\s*\n|\n##\s+[^\n]|$)/);
  console.log('[parseFinalContent] Lesson plan section found:', !!lessonPlanMatch);
  
  if (lessonPlanMatch) {
    let lessonContent = lessonPlanMatch[1];
    // 끝에 있는 --- 구분자 제거
    lessonContent = lessonContent.replace(/\n---+\s*$/, '').trim();
    console.log('[parseFinalContent] Lesson content length:', lessonContent.length);
    console.log('[parseFinalContent] Lesson content preview:', lessonContent.substring(0, 500));
    
    // 각 단계별 상세 내용 추출 (더 유연한 패턴)
    const stepPatterns = [
      /###\s*(\d+)\.\s*([^\n]+)([\s\S]*?)(?=###|##|$)/g,
      /####\s*(\d+)\.\s*([^\n]+)([\s\S]*?)(?=####|###|##|$)/g,
    ];
    
    for (const pattern of stepPatterns) {
      const stepMatches = [...lessonContent.matchAll(pattern)];
      console.log('[parseFinalContent] Step matches found:', stepMatches.length, 'with pattern:', pattern);
      if (stepMatches.length > 0) {
        for (const match of stepMatches) {
          const stepNum = parseInt(match[1]);
          const stepTitle = match[2].trim().replace(/^#+\s*/, '').trim();
          const stepDetail = match[3];
          
          // 수업 내용 추출
          const contentPatterns = [
            /####?\s*수업 내용([\s\S]*?)(?=####?|###|$)/i,
            /수업 내용[:\s]*\n([\s\S]*?)(?=####?|###|$)/i,
          ];
          
          const activities: Array<{ time?: string; activity: string; desc?: string }> = [];
          
          for (const contentPattern of contentPatterns) {
            const contentMatch = stepDetail.match(contentPattern);
            if (contentMatch) {
              const contentLines = contentMatch[1].split('\n');
              for (const line of contentLines) {
                const trimmedLine = line.trim();
                if (!trimmedLine || trimmedLine.startsWith('#')) continue;
                
                // 시간 추출 (예: "1. **제미나이 소개** (10분)")
                const timeMatch = trimmedLine.match(/(\d+)\s*분/);
                // 활동 추출 (예: "**제미나이 소개 및 기능 설명**")
                const activityMatch = trimmedLine.match(/\*\*([^*]+)\*\*/);
                // 설명 추출 (예: "제미나이 소개 및 기능 설명: 목적 및 사용 사례 설명")
                const descMatch = trimmedLine.match(/:\s*([^\n]+)/);
                
                if (activityMatch) {
                  activities.push({
                    time: timeMatch ? `${timeMatch[1]}분` : undefined,
                    activity: activityMatch[1].trim(),
                    desc: descMatch ? descMatch[1].trim() : undefined,
                  });
                } else if (trimmedLine.length > 5 && !trimmedLine.match(/^[\d.\-•*]\s*$/)) {
                  // 활동 매칭이 안 되면 전체 줄을 활동으로 사용
                  activities.push({
                    time: timeMatch ? `${timeMatch[1]}분` : undefined,
                    activity: trimmedLine.replace(/^[\d.\-•*]\s*/, '').trim(),
                  });
                }
              }
              break;
            }
          }

          // 기존 단계 업데이트 또는 새로 추가
          if (result.steps[stepNum - 1]) {
            if (activities.length > 0) {
              result.steps[stepNum - 1].content = activities;
            }
            const durationMatch = stepDetail.match(/####?\s*수업 시간[:\s]*([^\n]+)/i);
            if (durationMatch) {
              result.steps[stepNum - 1].duration = durationMatch[1].trim();
            }
          } else {
            result.steps.push({
              title: stepTitle,
              duration: stepDetail.match(/####?\s*수업 시간[:\s]*([^\n]+)/i)?.[1]?.trim() || '60분',
              content: activities.length > 0 ? activities : [{ activity: stepTitle }],
            });
          }
        }
        break; // 첫 번째 패턴에서 매칭되면 종료
      }
    }
  }

  // 최종 검토 섹션에서 개선 제안 추출
  const reviewMatch = content.match(/##\s*최종 검토\s*\n([\s\S]*?)(?=\n---+\s*\n|\n##\s+[^\n]|$)/);
  if (reviewMatch) {
    const reviewContent = reviewMatch[1];
    const improvementMatches = reviewContent.matchAll(/\*\*개선 제안\*\*[:\s]*([^\n]+)/g);
    let improvementIndex = 0;
    for (const match of improvementMatches) {
      if (result.steps[improvementIndex]) {
        result.steps[improvementIndex].improvement = match[1].trim();
        improvementIndex++;
      }
    }
  }

    // 단계가 없으면 섹션 제목으로부터 기본 단계 생성
  if (result.steps.length === 0) {
    const sectionMatches = content.matchAll(/##\s*([^\n]+)/g);
    const sectionTitles: string[] = [];
    for (const match of sectionMatches) {
      const title = match[1].trim().replace(/^#+\s*/, '').trim();
      // 주요 섹션만 추출
      if (title && title.match(/^(커리큘럼|수업안|슬라이드|평가|퀴즈|최종)/i)) {
        sectionTitles.push(title);
      }
    }
    
    // 주요 섹션들을 단계로 변환
    if (sectionTitles.length > 0) {
      result.steps = sectionTitles.slice(0, 5).map((title, idx) => ({
        title,
        duration: '60분',
        content: [{ activity: title }],
      }));
    } else {
      // 완전히 비어있으면 기본 5단계 생성
      const defaultSteps = [
        '커리큘럼 설계',
        '수업안 작성',
        '슬라이드 구성',
        '평가/퀴즈',
        '최종 검토',
      ];
      result.steps = defaultSteps.map(title => ({
        title,
        duration: '60분',
        content: [{ activity: title }],
      }));
    }
  }

  console.log('[parseFinalContent] Final result:', {
    goalsCount: result.goals.length,
    stepsCount: result.steps.length,
    assessmentCount: result.assessment.methods.length,
    materialsCount: result.materials.length,
  });

  return result;
};

// ===== HTML 코드 생성 (제공된 예시 형식) =====
const generateHtmlCode = (
  title: string,
  description: string | undefined,
  aiModel: string,
  createdAt: string,
  curriculum: ParsedCurriculum
): string => {
  const escapeHtml = (str: string) => 
    str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  const stepIcons = ['image', 'monitor', 'layout', 'user', 'presentation'];
  const stepColors = [
    { bg: 'bg-blue-500', text: 'text-blue-600' },
    { bg: 'bg-purple-500', text: 'text-purple-600' },
    { bg: 'bg-pink-500', text: 'text-pink-600' },
    { bg: 'bg-indigo-500', text: 'text-indigo-600' },
    { bg: 'bg-emerald-500', text: 'text-emerald-600' },
  ];

  const materialIcons = ['book-open', 'layout', 'image', 'presentation'];
  const materialColors = [
    { bg: 'bg-blue-100', text: 'text-blue-600' },
    { bg: 'bg-purple-100', text: 'text-purple-600' },
    { bg: 'bg-pink-100', text: 'text-pink-600' },
    { bg: 'bg-emerald-100', text: 'text-emerald-600' },
  ];

  return `<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(title)}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://unpkg.com/lucide@latest"></script>
    <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;700;900&display=swap" rel="stylesheet">
    <style>
        body { font-family: 'Noto Sans KR', sans-serif; }
        .tab-active { background-color: #0f172a; color: white; transform: scale(1.1); }
        .transition-all { transition: all 0.3s ease; }
    </style>
</head>
<body class="bg-slate-50 p-4 md:p-8 text-slate-800">
    <div class="max-w-6xl mx-auto">
        <!-- Header Section -->
        <header class="bg-white rounded-[2rem] shadow-sm border border-slate-200 p-8 mb-8 relative overflow-hidden">
            <div class="absolute top-0 right-0 w-64 h-64 bg-blue-50 rounded-full -mr-32 -mt-32 opacity-50 blur-3xl"></div>
            <div class="relative z-10">
                <div class="flex items-center space-x-2 text-blue-600 font-bold mb-4 uppercase tracking-widest text-sm">
                    <i data-lucide="book-open" class="w-4 h-4"></i>
                    <span>Full Curriculum Infographic</span>
                </div>
                <h1 class="text-3xl md:text-4xl font-black text-slate-900 mb-4 leading-tight">
                    ${escapeHtml(title)}${description ? `<br /><span class="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">${escapeHtml(description)}</span>` : ''}
                </h1>
                <div class="flex flex-wrap gap-4 items-center mt-6">
                    ${curriculum.totalDuration ? `<div class="flex items-center bg-slate-100 px-4 py-2 rounded-full text-slate-600 text-sm">
                        <i data-lucide="clock" class="w-4 h-4 mr-2"></i>
                        <span>${escapeHtml(curriculum.totalDuration)}</span>
                    </div>` : ''}
                    ${curriculum.targetAudience ? `<div class="flex items-center bg-slate-100 px-4 py-2 rounded-full text-slate-600 text-sm">
                        <i data-lucide="target" class="w-4 h-4 mr-2"></i>
                        <span>${escapeHtml(curriculum.targetAudience)}</span>
                    </div>` : ''}
                    <div class="flex items-center bg-slate-100 px-4 py-2 rounded-full text-slate-600 text-sm">
                        <i data-lucide="sparkles" class="w-4 h-4 mr-2"></i>
                        <span>${escapeHtml(aiModel.toUpperCase())} 생성</span>
                    </div>
                </div>
            </div>
        </header>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <!-- Left Column: Goals & Evaluation -->
            <div class="space-y-8">
                <section class="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-200">
                    <h2 class="text-xl font-bold mb-6 flex items-center">
                        <i data-lucide="target" class="mr-2 text-blue-600"></i> 교육 목표
                    </h2>
                    <ul class="space-y-4">
                        ${curriculum.goals.map(goal => `
                            <li class="flex items-start">
                                <i data-lucide="check-circle" class="w-5 h-5 text-emerald-500 mr-3 mt-1 flex-shrink-0"></i>
                                <span class="text-slate-600 leading-relaxed">${escapeHtml(goal)}</span>
                            </li>
                        `).join('')}
                    </ul>
                </section>

                ${curriculum.assessment.methods.length > 0 ? `
                <section class="bg-slate-900 text-white p-6 rounded-[2rem] shadow-lg">
                    <h2 class="text-xl font-bold mb-6 flex items-center">
                        <i data-lucide="clipboard-check" class="mr-2 text-blue-400"></i> 평가 방법
                    </h2>
                    <div class="space-y-6">
                        ${curriculum.assessment.methods.map((method, idx) => {
                          const percentage = Math.round(100 / curriculum.assessment.methods.length);
                          const colors = ['blue', 'purple', 'emerald'];
                          const color = colors[idx % colors.length];
                          return `
                            <div>
                                <div class="flex justify-between mb-2">
                                    <span class="text-slate-300">${escapeHtml(method)}</span>
                                    <span class="text-${color}-400 font-bold">${percentage}%</span>
                                </div>
                                <div class="w-full bg-slate-700 h-2 rounded-full overflow-hidden">
                                    <div class="bg-${color}-400 h-full w-[${percentage}%]"></div>
                                </div>
                            </div>
                          `;
                        }).join('')}
                    </div>
                </section>
                ` : ''}
            </div>

            <!-- Right Column: Steps Timeline -->
            <div class="lg:col-span-2">
                <div class="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-200 h-full flex flex-col">
                    <div class="flex items-center justify-between mb-8">
                        <h2 class="text-2xl font-bold">단계별 커리큘럼</h2>
                        <div class="flex space-x-1" id="tab-buttons">
                            ${curriculum.steps.map((_, idx) => `
                                <button onclick="setActiveTab(${idx})" id="tab-btn-${idx}" 
                                        class="w-10 h-10 rounded-full font-bold bg-slate-100 text-slate-400 hover:bg-slate-200 transition-all">
                                    ${idx + 1}
                                </button>
                            `).join('')}
                        </div>
                    </div>

                    <!-- Active Step Content Area -->
                    <div id="step-content" class="flex-grow transition-all duration-300">
                        <!-- Dynamic content -->
                    </div>

                    <!-- Navigation Buttons -->
                    <div class="flex justify-between mt-8 pt-6 border-t border-slate-100">
                        <button id="prev-btn" class="px-4 py-2 rounded-xl text-sm font-bold flex items-center text-slate-600 hover:bg-slate-50 transition-colors">
                            이전 단계
                        </button>
                        <button id="next-btn" class="px-6 py-2 rounded-xl text-sm font-bold bg-slate-900 text-white flex items-center hover:bg-slate-800 transition-colors">
                            다음 단계 <i data-lucide="chevron-right" class="ml-1 w-4 h-4"></i>
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Footer Material Section -->
        ${curriculum.materials.length > 0 ? `
        <footer class="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            ${curriculum.materials.map((material, idx) => {
              const icon = materialIcons[idx % materialIcons.length];
              const color = materialColors[idx % materialColors.length];
              return `
                <div class="bg-white p-6 rounded-2xl border border-slate-200 flex items-center">
                    <div class="w-10 h-10 ${color.bg} ${color.text} rounded-lg flex items-center justify-center mr-4">
                        <i data-lucide="${icon}" class="w-5 h-5"></i>
                    </div>
                    <div>
                        <div class="text-[10px] text-slate-400 font-bold uppercase">제공 자료 ${String(idx + 1).padStart(2, '0')}</div>
                        <div class="text-sm font-bold">${escapeHtml(material)}</div>
                    </div>
                </div>
              `;
            }).join('')}
        </footer>
        ` : ''}
        
        <div class="mt-12 text-center text-slate-400 text-sm">
            © 2024 AI Creativity Workshop Curriculum. All rights reserved.
        </div>
    </div>

    <script>
        const steps = ${JSON.stringify(curriculum.steps.map((step, idx) => ({
          title: step.title,
          duration: step.duration || '60분',
          icon: stepIcons[idx % stepIcons.length],
          color: stepColors[idx % stepColors.length].bg,
          content: step.content,
          improvement: step.improvement,
        })))};

        let currentTab = 0;

        function setActiveTab(idx) {
            currentTab = idx;
            
            steps.forEach((_, i) => {
                const btn = document.getElementById(\`tab-btn-\${i}\`);
                if (i === idx) {
                    btn.classList.add('tab-active');
                    btn.classList.remove('bg-slate-100', 'text-slate-400');
                } else {
                    btn.classList.remove('tab-active');
                    btn.classList.add('bg-slate-100', 'text-slate-400');
                }
            });

            const step = steps[idx];
            const contentContainer = document.getElementById('step-content');
            
            contentContainer.innerHTML = \`
                <div class="flex items-center mb-6">
                    <div class="\${step.color} p-4 rounded-2xl text-white mr-4 shadow-lg">
                        <i data-lucide="\${step.icon}" class="w-6 h-6"></i>
                    </div>
                    <div>
                        <span class="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Step \${idx + 1}</span>
                        <h3 class="text-2xl font-bold">\${step.title}</h3>
                    </div>
                    <div class="ml-auto bg-slate-100 px-4 py-1 rounded-full text-slate-600 font-medium text-sm">
                        \${step.duration}
                    </div>
                </div>

                <div class="space-y-4 mb-8">
                    \${step.content.map(item => \`
                        <div class="flex group">
                            <div class="w-16 flex-shrink-0 text-slate-400 font-bold pt-1 text-sm">\${item.time || ''}</div>
                            <div class="border-l-2 border-slate-100 pl-6 pb-6 relative group-last:pb-0">
                                <div class="absolute w-3 h-3 bg-slate-200 rounded-full -left-[7.5px] top-2 transition-colors"></div>
                                <h4 class="font-bold text-slate-900 mb-1 text-base">\${item.activity}</h4>
                                \${item.desc ? \`<p class="text-slate-500 text-sm leading-relaxed">\${item.desc}</p>\` : ''}
                            </div>
                        </div>
                    \`).join('')}
                </div>

                \${step.improvement ? \`
                <div class="bg-orange-50 border border-orange-100 p-5 rounded-2xl">
                    <div class="flex items-center text-orange-700 font-bold mb-2 text-sm">
                        <i data-lucide="lightbulb" class="w-4 h-4 mr-2"></i>
                        추천 개선 사항
                    </div>
                    <p class="text-orange-600 text-sm">\${step.improvement}</p>
                </div>
                \` : ''}
            \`;

            const prevBtn = document.getElementById('prev-btn');
            const nextBtn = document.getElementById('next-btn');

            prevBtn.disabled = idx === 0;
            prevBtn.style.opacity = idx === 0 ? '0.3' : '1';
            
            if (idx === steps.length - 1) {
                nextBtn.style.visibility = 'hidden';
            } else {
                nextBtn.style.visibility = 'visible';
            }

            lucide.createIcons();
        }

        document.getElementById('prev-btn').addEventListener('click', () => {
            if (currentTab > 0) setActiveTab(currentTab - 1);
        });

        document.getElementById('next-btn').addEventListener('click', () => {
            if (currentTab < steps.length - 1) setActiveTab(currentTab + 1);
        });

        setActiveTab(0);
        lucide.createIcons();
    </script>
</body>
</html>`;
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
        <div className="flex-1 overflow-hidden p-4">
          <textarea
            value={code}
            onChange={(e) => onCodeChange(e.target.value)}
            className="w-full h-full font-mono text-sm bg-slate-900 text-slate-100 p-4 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            spellCheck={false}
          />
        </div>
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
  generatedContent,
}: InfographicPreviewProps) => {
  const [showCodeView, setShowCodeView] = useState(false);
  const [editableCode, setEditableCode] = useState('');
  const [currentStep, setCurrentStep] = useState(0);

  // 최종 결과물 콘텐츠 가져오기 (generatedContent 우선, 없으면 stages에서 합치기)
  const finalContent = useMemo(() => {
    if (generatedContent) {
      console.log('[InfographicPreview] Using generatedContent, length:', generatedContent.length);
      return generatedContent;
    }
    
    // stages에서 선택된 AI 모델에 맞는 것만 필터링 (대소문자 구분 없이, ChatGPT 변형 지원)
    const normalizedAiModel = aiModel.toLowerCase();
    const filteredStages = stages.filter(s => {
      const stageModel = s.ai_model?.toLowerCase() || '';
      let matchesModel = false;
      
      // 정확한 매칭
      if (stageModel === normalizedAiModel) {
        matchesModel = true;
      }
      // ChatGPT 관련 변형들
      else if (normalizedAiModel === 'chatgpt') {
        matchesModel = stageModel === 'chatgpt' || 
                      stageModel === 'gpt-4' || 
                      stageModel === 'gpt-3.5' ||
                      stageModel === 'gpt-4o' ||
                      stageModel === 'gpt-4o-mini' ||
                      stageModel.includes('gpt');
      }
      // 역방향 매칭
      else if (normalizedAiModel.includes('gpt') && stageModel === 'chatgpt') {
        matchesModel = true;
      }
      // ai_model이 없는 경우도 포함 (하위 호환성)
      else if (!s.ai_model) {
        matchesModel = true;
      }
      
      return matchesModel && s.status === "completed" && s.content;
    });
    
    console.log('[InfographicPreview] Using stages, filtered count:', filteredStages.length, 'aiModel:', aiModel, 'total stages:', stages.length);
    
    if (filteredStages.length === 0) {
      console.log('[InfographicPreview] No matching stages found');
      return null;
    }
    
    const content = filteredStages
      .sort((a, b) => (a.stage_order || 0) - (b.stage_order || 0))
      .map(s => s.content)
      .join('\n\n---\n\n');
    
    console.log('[InfographicPreview] Generated content from stages, length:', content.length);
    return content;
  }, [generatedContent, stages, aiModel]);

  // 최종 결과물 파싱
  const curriculum = useMemo(() => {
    if (!finalContent) {
      console.log('[InfographicPreview] No finalContent');
      return null;
    }
    console.log('[InfographicPreview] Parsing content, length:', finalContent.length);
    const parsed = parseFinalContent(finalContent);
    console.log('[InfographicPreview] Parsed curriculum:', {
      goals: parsed.goals.length,
      steps: parsed.steps.length,
      assessment: parsed.assessment.methods.length,
      materials: parsed.materials.length,
    });
    return parsed;
  }, [finalContent]);

  // curriculum이 변경될 때 currentStep이 유효한 범위를 벗어나면 리셋
  useEffect(() => {
    if (curriculum?.steps && currentStep >= curriculum.steps.length) {
      console.log('[InfographicPreview] Resetting currentStep from', currentStep, 'to 0 (steps length:', curriculum.steps.length, ')');
      setCurrentStep(0);
    }
  }, [curriculum?.steps, currentStep]);

  // HTML 코드 생성
  const htmlCode = useMemo(() => {
    if (!curriculum) return '';
    return generateHtmlCode(title, description || '', aiModel, createdAt, curriculum);
  }, [title, description, aiModel, createdAt, curriculum]);

  const handleOpenCodeView = () => {
    setEditableCode(htmlCode);
    setShowCodeView(true);
  };

  console.log('[InfographicPreview] Render check - curriculum:', curriculum ? 'exists' : 'null', 'steps:', curriculum?.steps?.length || 0);
  if (curriculum?.steps) {
    console.log('[InfographicPreview] Steps details:', curriculum.steps.map((s, i) => ({
      index: i,
      title: s.title,
      contentCount: s.content?.length || 0,
      content: s.content?.map(c => ({ activity: c.activity, desc: c.desc, time: c.time }))
    })));
    console.log('[InfographicPreview] Current step:', currentStep, 'step exists:', !!curriculum.steps[currentStep]);
    if (curriculum.steps[currentStep]) {
      console.log('[InfographicPreview] Current step content:', {
        title: curriculum.steps[currentStep].title,
        contentCount: curriculum.steps[currentStep].content?.length || 0,
        content: curriculum.steps[currentStep].content
      });
    }
  }
  
  if (!curriculum) {
    console.log('[InfographicPreview] No curriculum parsed');
    return (
      <div className="min-h-[400px] flex items-center justify-center bg-slate-50">
        <div className="text-center p-8">
          <div className="text-6xl mb-4">📊</div>
          <h3 className="text-xl font-bold mb-2">인포그래픽 준비 중</h3>
          <p className="text-muted-foreground">
            AI가 콘텐츠를 생성하면 인포그래픽이 자동으로 표시됩니다.
          </p>
          {finalContent && (
            <div className="mt-4 text-xs text-muted-foreground">
              <p>콘텐츠 길이: {finalContent.length}자</p>
              <p className="mt-2 max-w-md mx-auto break-all">{finalContent.substring(0, 200)}...</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (curriculum.steps.length === 0) {
    console.log('[InfographicPreview] Curriculum has no steps');
    return (
      <div className="min-h-[400px] flex items-center justify-center bg-slate-50">
        <div className="text-center p-8">
          <div className="text-6xl mb-4">📊</div>
          <h3 className="text-xl font-bold mb-2">인포그래픽 준비 중</h3>
          <p className="text-muted-foreground">
            단계별 커리큘럼 정보를 추출할 수 없습니다.
          </p>
        </div>
      </div>
    );
  }

  const stepIcons = ['image', 'monitor', 'layout', 'user', 'presentation'];
  const stepColors = [
    { bg: 'bg-blue-500', text: 'text-blue-600' },
    { bg: 'bg-purple-500', text: 'text-purple-600' },
    { bg: 'bg-pink-500', text: 'text-pink-600' },
    { bg: 'bg-indigo-500', text: 'text-indigo-600' },
    { bg: 'bg-emerald-500', text: 'text-emerald-600' },
  ];

  const materialIcons = ['book-open', 'layout', 'image', 'presentation'];
  const materialColors = [
    { bg: 'bg-blue-100', text: 'text-blue-600' },
    { bg: 'bg-purple-100', text: 'text-purple-600' },
    { bg: 'bg-pink-100', text: 'text-pink-600' },
    { bg: 'bg-emerald-100', text: 'text-emerald-600' },
  ];

  console.log('[InfographicPreview] Rendering infographic component');
  
  return (
    <div className="bg-slate-50 min-h-screen">
      {/* 헤더 */}
      <header className="bg-white rounded-[2rem] shadow-sm border border-slate-200 p-8 mb-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50 rounded-full -mr-32 -mt-32 opacity-50 blur-3xl"></div>
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2 text-blue-600 font-bold uppercase tracking-widest text-sm">
              <BookOpen className="w-4 h-4" />
              <span>Full Curriculum Infographic</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenCodeView}
              className="gap-2"
            >
              <Code className="w-4 h-4" />
              Code View
            </Button>
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-slate-900 mb-4 leading-tight">
            {title}
            {description && (
              <>
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
                  {description}
                </span>
              </>
            )}
          </h1>
          <div className="flex flex-wrap gap-4 items-center mt-6">
            {curriculum.totalDuration && (
              <div className="flex items-center bg-slate-100 px-4 py-2 rounded-full text-slate-600 text-sm">
                <Clock className="w-4 h-4 mr-2" />
                <span>{curriculum.totalDuration}</span>
              </div>
            )}
            {curriculum.targetAudience && (
              <div className="flex items-center bg-slate-100 px-4 py-2 rounded-full text-slate-600 text-sm">
                <Target className="w-4 h-4 mr-2" />
                <span>{curriculum.targetAudience}</span>
              </div>
            )}
            <div className="flex items-center bg-slate-100 px-4 py-2 rounded-full text-slate-600 text-sm">
              <Sparkles className="w-4 h-4 mr-2" />
              <span>{aiModel.toUpperCase()} 생성</span>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 md:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 좌측: 교육 목표 & 평가 */}
          <div className="space-y-8">
            {/* 교육 목표 */}
            <section className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-200">
              <h2 className="text-xl font-bold mb-6 flex items-center">
                <Target className="mr-2 text-blue-600" />
                교육 목표
              </h2>
              <ul className="space-y-4">
                {curriculum.goals.map((goal, idx) => (
                  <li key={idx} className="flex items-start">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 mr-3 mt-1 flex-shrink-0" />
                    <span className="text-slate-600 leading-relaxed">{goal}</span>
                  </li>
                ))}
              </ul>
            </section>

            {/* 평가 방법 */}
            {curriculum.assessment.methods.length > 0 && (
              <section className="bg-slate-900 text-white p-6 rounded-[2rem] shadow-lg">
                <h2 className="text-xl font-bold mb-6 flex items-center">
                  <ClipboardCheck className="mr-2 text-blue-400" />
                  평가 방법
                </h2>
                <div className="space-y-6">
                  {curriculum.assessment.methods.map((method, idx) => {
                    const percentage = Math.round(100 / curriculum.assessment.methods.length);
                    const colors = ['blue', 'purple', 'emerald'];
                    const color = colors[idx % colors.length];
                    return (
                      <div key={idx}>
                        <div className="flex justify-between mb-2">
                          <span className="text-slate-300">{method}</span>
                          <span className={`text-${color}-400 font-bold`}>{percentage}%</span>
                        </div>
                        <div className="w-full bg-slate-700 h-2 rounded-full overflow-hidden">
                          <div 
                            className={`bg-${color}-400 h-full`}
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}
          </div>

          {/* 우측: 단계별 커리큘럼 */}
          <div className="lg:col-span-2">
            <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-200 h-full flex flex-col">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-bold">단계별 커리큘럼</h2>
                <div className="flex space-x-1">
                  {curriculum.steps.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentStep(idx)}
                      className={`w-10 h-10 rounded-full font-bold transition-all ${
                        idx === currentStep
                          ? 'bg-slate-900 text-white scale-110'
                          : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                      }`}
                    >
                      {idx + 1}
                    </button>
                  ))}
                </div>
              </div>

              {/* 현재 단계 콘텐츠 */}
              <div className="flex-grow transition-all duration-300">
                {curriculum.steps && currentStep >= 0 && currentStep < curriculum.steps.length && curriculum.steps[currentStep] ? (
                  <>
                    <div className="flex items-center mb-6">
                      <div className={`${stepColors[currentStep % stepColors.length].bg} p-4 rounded-2xl text-white mr-4 shadow-lg`}>
                        <PlayCircle className="w-6 h-6" />
                      </div>
                      <div className="flex-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                          Step {currentStep + 1}
                        </span>
                        <h3 className="text-2xl font-bold">
                          {curriculum.steps[currentStep].title.replace(/^#+\s*/, '').trim()}
                        </h3>
                      </div>
                      <div className="ml-auto bg-slate-100 px-4 py-1 rounded-full text-slate-600 font-medium text-sm">
                        {curriculum.steps[currentStep].duration || '60분'}
                      </div>
                    </div>

                    <div className="space-y-4 mb-8">
                      {curriculum.steps[currentStep].content && curriculum.steps[currentStep].content.length > 0 ? (
                        curriculum.steps[currentStep].content.map((item, idx) => (
                          <div key={idx} className="flex group">
                            <div className="w-16 flex-shrink-0 text-slate-400 font-bold pt-1 text-sm">
                              {item.time || ''}
                            </div>
                            <div className="border-l-2 border-slate-100 pl-6 pb-6 relative last:pb-0">
                              <div className="absolute w-3 h-3 bg-slate-200 rounded-full -left-[7.5px] top-2"></div>
                              <h4 className="font-bold text-slate-900 mb-1 text-base">{item.activity}</h4>
                              {item.desc && (
                                <p className="text-slate-500 text-sm leading-relaxed">{item.desc}</p>
                              )}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-8 text-slate-400">
                          <p>이 단계에 대한 상세 내용이 없습니다.</p>
                          <p className="text-sm mt-2">제목: {curriculum.steps[currentStep].title}</p>
                        </div>
                      )}
                    </div>

                    {curriculum.steps[currentStep].improvement && (
                      <div className="bg-orange-50 border border-orange-100 p-5 rounded-2xl">
                        <div className="flex items-center text-orange-700 font-bold mb-2 text-sm">
                          <Lightbulb className="w-4 h-4 mr-2" />
                          추천 개선 사항
                        </div>
                        <p className="text-orange-600 text-sm">{curriculum.steps[currentStep].improvement}</p>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-8 text-slate-400">
                    <p>단계 정보를 불러올 수 없습니다.</p>
                    <p className="text-sm mt-2">currentStep: {currentStep}, steps length: {curriculum.steps?.length || 0}</p>
                  </div>
                )}
              </div>

              {/* 네비게이션 버튼 */}
              <div className="flex justify-between mt-8 pt-6 border-t border-slate-100">
                <Button
                  variant="ghost"
                  onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
                  disabled={currentStep === 0}
                  className="gap-2"
                >
                  <ChevronLeft className="w-4 h-4" />
                  이전 단계
                </Button>
                <Button
                  onClick={() => setCurrentStep(Math.min(curriculum.steps.length - 1, currentStep + 1))}
                  disabled={currentStep === curriculum.steps.length - 1}
                  className="gap-2"
                >
                  다음 단계
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* 교육 자료 푸터 */}
        {curriculum.materials.length > 0 && (
          <footer className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {curriculum.materials.map((material, idx) => {
              const icon = materialIcons[idx % materialIcons.length];
              const color = materialColors[idx % materialColors.length];
              return (
                <div key={idx} className="bg-white p-6 rounded-2xl border border-slate-200 flex items-center">
                  <div className={`w-10 h-10 ${color.bg} ${color.text} rounded-lg flex items-center justify-center mr-4`}>
                    {icon === 'book-open' && <BookOpen className="w-5 h-5" />}
                    {icon === 'layout' && <Layout className="w-5 h-5" />}
                    {icon === 'image' && <FileText className="w-5 h-5" />}
                    {icon === 'presentation' && <Presentation className="w-5 h-5" />}
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase">
                      제공 자료 {String(idx + 1).padStart(2, '0')}
                    </div>
                    <div className="text-sm font-bold">{material}</div>
                  </div>
                </div>
              );
            })}
          </footer>
        )}
      </div>

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
