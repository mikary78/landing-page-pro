import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// 교육 콘텐츠 생성 단계
const STAGE_NAMES = [
  "커리큘럼 설계",
  "수업안 작성",
  "슬라이드 구성",
  "실습 템플릿",
  "평가/퀴즈",
  "최종 검토"
];

// 각 단계별 상세 프롬프트
const STAGE_PROMPTS: Record<string, string> = {
  "커리큘럼 설계": `당신은 교육 콘텐츠 전문가입니다. 주어진 브리프를 바탕으로 체계적인 커리큘럼을 설계해주세요.

다음 형식으로 작성해주세요:
1. **학습 목표** (3-5개의 구체적이고 측정 가능한 목표)
2. **대상 학습자** (수준, 사전 지식 요구사항)
3. **전체 커리큘럼 개요**
   - 각 세션별 주제
   - 예상 소요 시간
   - 핵심 학습 내용
4. **학습 경로** (선수 학습 → 본 학습 → 심화 학습)
5. **평가 계획** (형성평가, 총괄평가 방법)`,

  "수업안 작성": `당신은 교육 콘텐츠 전문가입니다. 커리큘럼을 바탕으로 상세 수업안을 작성해주세요.

다음 형식으로 각 세션별 수업안을 작성해주세요:
1. **도입 (10분)**
   - 학습 동기 유발 활동
   - 선수 학습 확인
   - 학습 목표 안내

2. **전개 (본 수업 시간의 70%)**
   - 핵심 개념 설명
   - 시연 및 예시
   - 학습자 참여 활동
   - 점검 질문

3. **정리 (10분)**
   - 핵심 내용 요약
   - Q&A
   - 다음 수업 예고

4. **준비물 및 자료**`,

  "슬라이드 구성": `당신은 프레젠테이션 전문가입니다. 수업안을 바탕으로 슬라이드 구성안을 작성해주세요.

다음 형식으로 슬라이드를 구성해주세요:
각 슬라이드마다:
- **슬라이드 번호 및 제목**
- **핵심 내용** (불릿 포인트 3-5개)
- **시각 자료 제안** (이미지, 다이어그램, 차트 등)
- **발표자 노트** (설명 포인트, 강조 사항)
- **예상 소요 시간**

슬라이드 구성 원칙:
- 한 슬라이드 한 개념
- 텍스트 최소화, 시각화 최대화
- 일관된 디자인 스타일 유지`,

  "실습 템플릿": `당신은 교육 콘텐츠 전문가입니다. 학습자들이 실제로 따라할 수 있는 실습 템플릿을 작성해주세요.

다음 형식으로 실습 자료를 작성해주세요:
1. **실습 개요**
   - 실습 목표
   - 예상 소요 시간
   - 필요 도구/환경

2. **단계별 실습 가이드**
   - Step 1: [제목]
     - 상세 설명
     - 스크린샷/코드 예시 위치 표시
     - 예상 결과
   - Step 2: ...

3. **실습 체크리스트**
   - [ ] 완료해야 할 항목들

4. **트러블슈팅 가이드**
   - 자주 발생하는 문제와 해결법

5. **심화 과제** (선택)`,

  "평가/퀴즈": `당신은 교육 평가 전문가입니다. 학습 효과를 측정할 수 있는 평가 문항과 퀴즈를 작성해주세요.

다음 형식으로 평가 자료를 작성해주세요:
1. **형성평가 (수업 중 확인 문제)**
   - 간단한 O/X 퀴즈 (5문항)
   - 객관식 문제 (5문항)

2. **총괄평가 (최종 테스트)**
   - 객관식 문제 (10문항)
   - 단답형 문제 (5문항)
   - 서술형/실습형 문제 (2문항)

3. **채점 기준표 (루브릭)**
   - 평가 항목별 배점
   - 수준별 채점 기준

4. **정답 및 해설**`,

  "최종 검토": `당신은 교육 품질 관리 전문가입니다. 전체 콘텐츠를 검토하고 최종 요약을 작성해주세요.

다음 내용을 포함해주세요:
1. **콘텐츠 완성도 체크리스트**
   - [ ] 학습 목표 달성 가능성
   - [ ] 내용의 논리적 흐름
   - [ ] 난이도 적절성
   - [ ] 실습 활동 충분성

2. **개선 제안사항**
   - 보완이 필요한 부분
   - 추가 권장 자료

3. **전체 요약**
   - 총 학습 시간
   - 주요 학습 내용
   - 기대 학습 성과

4. **강사 가이드**
   - 수업 운영 팁
   - 주의사항`
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { projectId, documentContent, aiModel, stageId, stageOrder, regenerate, retryWithDifferentAi, educationDuration, educationCourse, educationSession } = await req.json();
    console.log('Request received:', { projectId, regenerate, stageId, aiModel, retryWithDifferentAi });

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!LOVABLE_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Missing environment variables");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const modelMap: Record<string, string> = {
      gemini: "google/gemini-2.5-flash",
      claude: "google/gemini-2.5-pro",
      chatgpt: "openai/gpt-5-mini",
    };

    const selectedModel = modelMap[aiModel] || "google/gemini-2.5-flash";
    console.log(`Using model: ${selectedModel}`);

    // 재생성 요청인 경우
    if (regenerate && stageId) {
      console.log(`Regenerating stage: ${stageId}`);
      
      const { data: stage, error: stageError } = await supabase
        .from('project_stages')
        .select('*')
        .eq('id', stageId)
        .single();

      if (stageError || !stage) {
        console.error('Stage not found:', stageError);
        throw new Error('Stage not found');
      }

      // 프로젝트 정보 가져오기
      const { data: project } = await supabase
        .from('projects')
        .select('*')
        .eq('id', stage.project_id)
        .single();

      const stagePrompt = STAGE_PROMPTS[stage.stage_name] || '';
      
      const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: selectedModel,
          messages: [
            {
              role: 'system',
              content: stagePrompt
            },
            {
              role: 'user',
              content: `브리프: ${project?.document_content || ''}\n\n기존 콘텐츠:\n${stage.content}\n\n사용자 피드백: ${stage.feedback}\n\n위 피드백을 반영하여 "${stage.stage_name}" 단계의 콘텐츠를 개선해주세요.`
            }
          ],
        }),
      });

      if (!response.ok) {
        console.error('AI API error:', response.status, await response.text());
        await supabase
          .from('project_stages')
          .update({ status: 'failed' })
          .eq('id', stageId);
        throw new Error('AI content generation failed');
      }

      const data = await response.json();
      const generatedContent = data.choices?.[0]?.message?.content;

      await supabase
        .from('project_stages')
        .update({ 
          content: generatedContent,
          status: 'completed',
        })
        .eq('id', stageId);

      console.log('Stage regeneration completed');

      return new Response(
        JSON.stringify({ success: true, content: generatedContent }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 새 프로젝트 처리
    if (!projectId || !documentContent || !aiModel) {
      console.error('Missing required fields:', { projectId, documentContent, aiModel });
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Processing project: ${projectId} with AI: ${aiModel}`);

    // 교육 설정 정보 구성
    const educationContext = `
교육 시간: ${educationDuration || '미정'}
교육 과정: ${educationCourse || '미정'}
교육 회차: ${educationSession ? `${educationSession}회차` : '미정'}
`.trim();

    // 프로젝트 AI 결과 레코드 생성 또는 업데이트
    const { data: existingResult } = await supabase
      .from('project_ai_results')
      .select('*')
      .eq('project_id', projectId)
      .eq('ai_model', aiModel)
      .single();

    if (!existingResult) {
      await supabase
        .from('project_ai_results')
        .insert({
          project_id: projectId,
          ai_model: aiModel,
          status: 'processing',
        });
    } else {
      await supabase
        .from('project_ai_results')
        .update({ status: 'processing' })
        .eq('project_id', projectId)
        .eq('ai_model', aiModel);
    }

    // 프로젝트 상태 업데이트
    await supabase
      .from('projects')
      .update({ status: 'processing' })
      .eq('id', projectId);

    // 해당 AI 모델의 기존 stages 삭제 (재시도인 경우)
    if (retryWithDifferentAi) {
      await supabase
        .from('project_stages')
        .delete()
        .eq('project_id', projectId)
        .eq('ai_model', aiModel);
    }

    // 이전 단계 콘텐츠 누적 저장
    let previousContents: string[] = [];

    // 6단계 생성
    for (let i = 0; i < STAGE_NAMES.length; i++) {
      const stageName = STAGE_NAMES[i];
      console.log(`Creating stage ${i + 1}: ${stageName} for AI: ${aiModel}`);
      
      const { data: newStage, error: stageError } = await supabase
        .from('project_stages')
        .insert({
          project_id: projectId,
          stage_name: stageName,
          stage_order: i + 1,
          status: 'processing',
          ai_model: aiModel,
        })
        .select()
        .single();

      if (stageError) {
        console.error('Stage creation error:', stageError);
        continue;
      }

      console.log(`Stage created: ${newStage.id}`);

      try {
        const stagePrompt = STAGE_PROMPTS[stageName] || '';
        
        // 이전 단계 콘텐츠를 컨텍스트로 제공
        const previousContext = previousContents.length > 0 
          ? `\n\n이전 단계 결과물:\n${previousContents.map((c, idx) => `### ${STAGE_NAMES[idx]}\n${c}`).join('\n\n')}`
          : '';

        const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: selectedModel,
            messages: [
              {
                role: 'system',
                content: stagePrompt
              },
              {
                role: 'user',
                content: `교육 브리프:\n${documentContent}\n\n${educationContext}${previousContext}\n\n위 내용을 바탕으로 "${stageName}" 단계의 콘텐츠를 생성해주세요.`
              }
            ],
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`AI API error for stage ${stageName}:`, response.status, errorText);
          await supabase
            .from('project_stages')
            .update({ status: 'failed' })
            .eq('id', newStage.id);
          continue;
        }

        const data = await response.json();
        const stageContent = data.choices?.[0]?.message?.content;

        // 이전 단계 콘텐츠에 추가
        previousContents.push(stageContent || '');

        await supabase
          .from('project_stages')
          .update({ 
            content: stageContent,
            status: 'completed',
          })
          .eq('id', newStage.id);

        console.log(`Stage ${stageName} completed successfully`);
      } catch (error) {
        console.error(`Error generating content for stage ${stageName}:`, error);
        await supabase
          .from('project_stages')
          .update({ status: 'failed' })
          .eq('id', newStage.id);
      }
    }

    // 최종 결과물 생성
    console.log('Generating final content for AI:', aiModel);
    
    const { data: completedStages, error: stagesError } = await supabase
      .from('project_stages')
      .select('*')
      .eq('project_id', projectId)
      .eq('ai_model', aiModel)
      .order('stage_order', { ascending: true });

    if (stagesError) {
      console.error('Error fetching stages:', stagesError);
    }

    const finalContent = completedStages
      ?.map(stage => `## ${stage.stage_name}\n\n${stage.content || '생성 실패'}`)
      .join('\n\n---\n\n');

    // AI 결과 업데이트
    await supabase
      .from('project_ai_results')
      .update({ 
        status: 'completed',
        generated_content: finalContent,
      })
      .eq('project_id', projectId)
      .eq('ai_model', aiModel);

    // 프로젝트의 기본 generated_content도 업데이트
    await supabase
      .from('projects')
      .update({ 
        status: 'completed',
        generated_content: finalContent,
        ai_model: aiModel,
      })
      .eq('id', projectId);

    console.log('Project processing completed');

    return new Response(
      JSON.stringify({ 
        success: true,
        content: finalContent,
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );

  } catch (error) {
    console.error("Error in process-document function:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error" 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
