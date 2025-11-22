import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const STAGE_NAMES = [
  "콘텐츠 기획",
  "시나리오 작성", 
  "이미지 생성",
  "음성/영상 제작",
  "콘텐츠 조립",
  "배포"
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { projectId, documentContent, aiModel, stageId, stageOrder, regenerate } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!LOVABLE_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Missing environment variables");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // AI 모델 매핑
    const modelMap: Record<string, string> = {
      gemini: "google/gemini-2.5-flash",
      claude: "google/gemini-2.5-pro",
      chatgpt: "openai/gpt-5-mini",
    };

    const selectedModel = modelMap[aiModel] || "google/gemini-2.5-flash";

    // 재생성 요청인 경우
    if (regenerate && stageId) {
      const { data: stage } = await supabase
        .from('project_stages')
        .select('*')
        .eq('id', stageId)
        .single();

      if (!stage) {
        throw new Error('Stage not found');
      }

      console.log(`Regenerating stage: ${stage.stage_name}`);

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
              content: '당신은 교육 콘텐츠 생성 전문가입니다. 사용자의 피드백을 반영하여 콘텐츠를 개선합니다.'
            },
            {
              role: 'user',
              content: `다음 단계를 사용자 피드백에 따라 재생성해주세요:\n\n단계: ${stage.stage_name}\n기존 콘텐츠: ${stage.content}\n사용자 피드백: ${stage.feedback}\n\n피드백을 반영하여 개선된 콘텐츠를 생성해주세요.`
            }
          ],
        }),
      });

      if (!response.ok) {
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

      return new Response(
        JSON.stringify({ success: true, content: generatedContent }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 새 프로젝트 처리
    if (!projectId || !documentContent || !aiModel) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Processing new project with model: ${selectedModel}`);

    await supabase
      .from('projects')
      .update({ status: 'processing' })
      .eq('id', projectId);

    // 6단계 생성
    for (let i = 0; i < STAGE_NAMES.length; i++) {
      const stageName = STAGE_NAMES[i];
      
      const { data: newStage, error: stageError } = await supabase
        .from('project_stages')
        .insert({
          project_id: projectId,
          stage_name: stageName,
          stage_order: i + 1,
          status: 'processing',
        })
        .select()
        .single();

      if (stageError) {
        console.error('Stage creation error:', stageError);
        continue;
      }

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
              content: '당신은 교육 콘텐츠 생성 전문가입니다. 각 단계에 맞는 구체적이고 실용적인 콘텐츠를 생성합니다.'
            },
            {
              role: 'user',
              content: `문서: ${documentContent}\n\n"${stageName}" 단계에 대한 상세 콘텐츠를 생성해주세요. 구체적이고 실행 가능한 내용으로 작성해주세요.`
            }
          ],
        }),
      });

      if (!response.ok) {
        await supabase
          .from('project_stages')
          .update({ status: 'failed' })
          .eq('id', newStage.id);
        continue;
      }

      const data = await response.json();
      const stageContent = data.choices?.[0]?.message?.content;

      await supabase
        .from('project_stages')
        .update({ 
          content: stageContent,
          status: 'completed',
        })
        .eq('id', newStage.id);
    }

    // 최종 결과물 생성
    const { data: completedStages } = await supabase
      .from('project_stages')
      .select('*')
      .eq('project_id', projectId)
      .order('stage_order', { ascending: true });

    const finalContent = completedStages
      ?.map(stage => `## ${stage.stage_name}\n\n${stage.content}`)
      .join('\n\n---\n\n');

    await supabase
      .from('projects')
      .update({ 
        status: 'completed',
        generated_content: finalContent,
      })
      .eq('id', projectId);

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
