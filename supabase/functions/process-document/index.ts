import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { projectId, documentContent, aiModel } = await req.json();

    if (!projectId || !documentContent || !aiModel) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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
      claude: "google/gemini-2.5-pro", // Claude 대신 Gemini Pro 사용
      chatgpt: "openai/gpt-5-mini",
    };

    const selectedModel = modelMap[aiModel] || "google/gemini-2.5-flash";

    console.log(`Processing document with model: ${selectedModel}`);

    // AI에게 교육 콘텐츠 생성 요청
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: selectedModel,
        messages: [
          {
            role: "system",
            content: `당신은 교육 콘텐츠 전문가입니다. MVP/PRD 문서를 분석하여 6단계 교육 콘텐츠를 생성합니다:
1. 콘텐츠 기획 - 학습 목표와 대상 설정
2. 시나리오 작성 - 실제 업무 상황 기반 스토리
3. 대본 작성 - 학습자와 강사의 대화
4. 이미지 생성 가이드 - 시각 자료 설명
5. 영상 촬영 가이드 - 촬영 시나리오
6. 편집 및 배포 계획

각 단계를 구체적이고 실행 가능하게 작성해주세요.`,
          },
          {
            role: "user",
            content: `다음 MVP/PRD 문서를 기반으로 교육 콘텐츠를 생성해주세요:\n\n${documentContent}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      
      // 프로젝트 상태를 failed로 업데이트
      await supabase
        .from("projects")
        .update({ status: "failed" })
        .eq("id", projectId);

      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required. Please add credits to your workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const generatedContent = data.choices?.[0]?.message?.content;

    if (!generatedContent) {
      throw new Error("No content generated from AI");
    }

    console.log("Content generated successfully");

    // 프로젝트 상태를 completed로 업데이트하고 생성된 콘텐츠 저장
    const { error: updateError } = await supabase
      .from("projects")
      .update({ 
        status: "completed",
        description: generatedContent.substring(0, 500), // 처음 500자를 설명으로 저장
        generated_content: generatedContent, // 전체 생성된 콘텐츠 저장
      })
      .eq("id", projectId);

    if (updateError) {
      console.error("Error updating project:", updateError);
      throw updateError;
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        content: generatedContent,
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
