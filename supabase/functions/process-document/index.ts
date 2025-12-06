import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ============================================================
// CORS 설정
// ============================================================
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ============================================================
// 상수 정의
// ============================================================
const STAGE_NAMES = [
  "콘텐츠 기획",
  "시나리오 작성",
  "이미지 생성",
  "음성/영상 제작",
  "콘텐츠 조립",
  "배포",
];

// AI 모델 설정 - 각 AI별로 실제 API 호출
const AI_CONFIG = {
  gemini: {
    model: "gemini-2.0-flash",
    envKey: "VERTEX_API_KEY",
  },
  claude: {
    model: "claude-3-5-sonnet-20241022",
    envKey: "ANTHROPIC_API_KEY",
  },
  chatgpt: {
    model: "gpt-4o-mini",
    envKey: "OPENAI_API_KEY",
  },
} as const;

type AIProvider = keyof typeof AI_CONFIG;

// 재시도/타임아웃 설정
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;
const REQUEST_TIMEOUT = 60000;

// ============================================================
// 환경변수 검증
// ============================================================
// 보안 개선: 환경변수명을 에러 메시지에 노출하지 않음
// 참고: OWASP - Information Exposure Through an Error Message
// https://owasp.org/www-community/Improper_Error_Handling
const requireEnv = (name: string, value?: string): string => {
  if (!value) {
    // 내부 로그에만 변수명 기록
    console.error(`[Security] Missing required configuration: ${name}`);
    // 외부로는 일반적인 메시지만 전달
    throw new Error(`Missing required configuration. Please check server settings.`);
  }
  return value;
};

// ============================================================
// 대기 함수
// ============================================================
const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

// ============================================================
// Gemini API 호출
// ============================================================
const generateWithGemini = async (
  model: string,
  systemPrompt: string,
  userPrompt: string,
  apiKey: string
): Promise<string> => {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: userPrompt }] }],
        system_instruction: {
          role: "system",
          parts: [{ text: systemPrompt }],
        },
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2048,
        },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    const result =
      data?.candidates?.[0]?.content?.parts
        ?.map((p: { text?: string }) => p.text || "")
        .join("")
        .trim() || "";

    if (!result) {
      throw new Error("Empty response from Gemini API");
    }

    return result;
  } finally {
    clearTimeout(timeoutId);
  }
};

// ============================================================
// Claude (Anthropic) API 호출
// ============================================================
const generateWithClaude = async (
  model: string,
  systemPrompt: string,
  userPrompt: string,
  apiKey: string
): Promise<string> => {
  const url = "https://api.anthropic.com/v1/messages";

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: model,
        max_tokens: 2048,
        system: systemPrompt,
        messages: [
          {
            role: "user",
            content: userPrompt,
          },
        ],
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Claude API error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    const result =
      data?.content
        ?.filter((block: { type: string }) => block.type === "text")
        .map((block: { text: string }) => block.text)
        .join("")
        .trim() || "";

    if (!result) {
      throw new Error("Empty response from Claude API");
    }

    return result;
  } finally {
    clearTimeout(timeoutId);
  }
};

// ============================================================
// ChatGPT (OpenAI) API 호출
// ============================================================
const generateWithChatGPT = async (
  model: string,
  systemPrompt: string,
  userPrompt: string,
  apiKey: string
): Promise<string> => {
  const url = "https://api.openai.com/v1/chat/completions";

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model,
        max_tokens: 2048,
        temperature: 0.7,
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: userPrompt,
          },
        ],
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    const result = data?.choices?.[0]?.message?.content?.trim() || "";

    if (!result) {
      throw new Error("Empty response from OpenAI API");
    }

    return result;
  } finally {
    clearTimeout(timeoutId);
  }
};

// ============================================================
// 통합 AI 호출 함수 (재시도 로직 포함)
// ============================================================
const generateContent = async (
  provider: AIProvider,
  systemPrompt: string,
  userPrompt: string,
  apiKey: string
): Promise<string> => {
  const config = AI_CONFIG[provider];
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`[${provider}] Attempt ${attempt}/${MAX_RETRIES}`);

      let result: string;

      switch (provider) {
        case "gemini":
          result = await generateWithGemini(
            config.model,
            systemPrompt,
            userPrompt,
            apiKey
          );
          break;
        case "claude":
          result = await generateWithClaude(
            config.model,
            systemPrompt,
            userPrompt,
            apiKey
          );
          break;
        case "chatgpt":
          result = await generateWithChatGPT(
            config.model,
            systemPrompt,
            userPrompt,
            apiKey
          );
          break;
        default:
          throw new Error(`Unknown AI provider: ${provider}`);
      }

      console.log(`[${provider}] Success on attempt ${attempt}`);
      return result;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.error(
        `[${provider}] Attempt ${attempt}/${MAX_RETRIES} failed:`,
        lastError.message
      );

      if (attempt < MAX_RETRIES) {
        await sleep(RETRY_DELAY * attempt);
      }
    }
  }

  throw lastError || new Error(`Unknown error with ${provider}`);
};

// ============================================================
// 스테이지 상태 업데이트
// ============================================================
const updateStageStatus = async (
  supabase: ReturnType<typeof createClient>,
  stageId: string,
  status: string,
  content?: string
): Promise<void> => {
  const updateData: Record<string, unknown> = { status };
  if (content !== undefined) {
    updateData.content = content;
  }

  const { error } = await supabase
    .from("project_stages")
    .update(updateData)
    .eq("id", stageId);

  if (error) {
    console.error(`Failed to update stage ${stageId}:`, error);
  }
};

// ============================================================
// 프로젝트 상태 업데이트
// ============================================================
const updateProjectStatus = async (
  supabase: ReturnType<typeof createClient>,
  projectId: string,
  status: string,
  additionalData?: Record<string, unknown>
): Promise<void> => {
  const updateData = { status, ...additionalData };

  const { error } = await supabase
    .from("projects")
    .update(updateData)
    .eq("id", projectId);

  if (error) {
    console.error(`Failed to update project ${projectId}:`, error);
  }
};

// ============================================================
// AI 결과 상태 업데이트
// ============================================================
const updateAiResultStatus = async (
  supabase: ReturnType<typeof createClient>,
  projectId: string,
  aiModel: string,
  status: string,
  generatedContent?: string
): Promise<void> => {
  const updateData: Record<string, unknown> = { status };
  if (generatedContent !== undefined) {
    updateData.generated_content = generatedContent;
  }

  const { error } = await supabase
    .from("project_ai_results")
    .update(updateData)
    .eq("project_id", projectId)
    .eq("ai_model", aiModel);

  if (error) {
    console.error(`Failed to update AI result for ${projectId}:`, error);
  }
};

// ============================================================
// 메인 서버 함수
// ============================================================
serve(async (req) => {
  // CORS preflight 처리
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // --------------------------------------------------------
    // 환경변수 검증 (Supabase 기본)
    // --------------------------------------------------------
    // Supabase reserves SUPABASE_* for platform use; allow FUNCTION_SUPABASE_* as the primary names,
    // but still fall back to the old names if present.
    const supabaseUrl = requireEnv(
      "FUNCTION_SUPABASE_URL (or SUPABASE_URL)",
      Deno.env.get("FUNCTION_SUPABASE_URL") ?? Deno.env.get("SUPABASE_URL")
    );
    const supabaseServiceKey = requireEnv(
      "FUNCTION_SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SERVICE_ROLE_KEY)",
      Deno.env.get("FUNCTION_SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
    );

    // --------------------------------------------------------
    // 요청 파싱
    // --------------------------------------------------------
    const {
      projectId,
      documentContent,
      aiModel,
      stageId,
      regenerate,
      retryWithDifferentAi,
    } = await req.json();

    // 보안 개선: documentContent 제외 (민감정보 노출 방지)
    console.log("[Request] Processing request:", {
      projectId: projectId ? "provided" : "missing",
      regenerate: !!regenerate,
      stageId: stageId || "none",
      aiModel: aiModel || "none",
      retryWithDifferentAi: !!retryWithDifferentAi,
    });

    // --------------------------------------------------------
    // AI 제공자 검증 및 API 키 확인
    // --------------------------------------------------------
    const provider = aiModel as AIProvider;
    if (!AI_CONFIG[provider]) {
      // 내부 로그에만 상세 정보 기록
      console.error(`[Error] Invalid AI provider requested: ${aiModel}`);
      return new Response(
        JSON.stringify({
          error: "지원하지 않는 AI 모델입니다. 올바른 모델을 선택해주세요.",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 선택된 AI의 API 키 가져오기
    const aiApiKey = requireEnv(
      AI_CONFIG[provider].envKey,
      Deno.env.get(AI_CONFIG[provider].envKey)
    );

    // 보안 개선: API 모델명 제거 (민감정보 노출 방지)
    console.log(`[Process] AI provider initialized: ${provider}`);

    // --------------------------------------------------------
    // Supabase 클라이언트 생성
    // --------------------------------------------------------
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // ========================================================
    // 재생성 요청 처리
    // ========================================================
    if (regenerate && stageId) {
      console.log(`Regenerating stage: ${stageId}`);

      const { data: stage, error: stageError } = await supabase
        .from("project_stages")
        .select("*")
        .eq("id", stageId)
        .single();

      if (stageError || !stage) {
        // 내부 로그에만 상세 정보 기록
        console.error("[Error] Stage not found:", stageError);
        // 사용자에게는 일반적인 메시지만 전달
        return new Response(
          JSON.stringify({ 
            error: "요청한 단계를 찾을 수 없습니다. 프로젝트 ID를 확인해주세요."
          }),
          {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      try {
        const regenerated = await generateContent(
          provider,
          "당신은 교육 콘텐츠 제작 전문가입니다. 제공된 피드백을 반영해 콘텐츠를 개선하세요.",
          `단계: ${stage.stage_name}\n기존 콘텐츠: ${stage.content || ""}\n피드백: ${stage.feedback || ""}\n\n피드백을 반영하여 개선된 콘텐츠를 작성하세요.`,
          aiApiKey
        );

        await updateStageStatus(supabase, stageId, "completed", regenerated);
        console.log("Stage regeneration completed");

        return new Response(
          JSON.stringify({ success: true, content: regenerated }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (error) {
        // 내부 로그에만 상세 에러 기록
        console.error("[Error] Regeneration failed:", error);
        await updateStageStatus(supabase, stageId, "failed");

        return new Response(
          JSON.stringify({
            error: "콘텐츠 재생성 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
          }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

    // ========================================================
    // 기본 입력 검증
    // ========================================================
    if (!projectId || !documentContent || !aiModel) {
      // 내부 로그에만 상세 정보 기록
      console.error("[Error] Missing required fields:", {
        projectId: !!projectId,
        documentContent: !!documentContent,
        aiModel: !!aiModel,
      });
      return new Response(
        JSON.stringify({
          error: "필수 입력값이 누락되었습니다. 프로젝트 정보를 확인해주세요.",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // ========================================================
    // 프로젝트 생성 또는 확인
    // ========================================================
    const { data: existingProject } = await supabase
      .from("projects")
      .select("id")
      .eq("id", projectId)
      .maybeSingle();

    if (!existingProject) {
      const { error: createError } = await supabase
        .from("projects")
        .insert({
          id: projectId,
          status: "pending",
          document_content: documentContent,
          ai_model: aiModel,
        });

      if (createError) {
        // 내부 로그에만 상세 에러 기록
        console.error("[Error] Failed to create project:", createError);
        return new Response(
          JSON.stringify({ 
            error: "프로젝트 생성에 실패했습니다. 잠시 후 다시 시도해주세요." 
          }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      console.log(`[Process] Project created: ${projectId}`);
    }

    console.log(`[Process] Starting project processing: ${projectId}`);

    // ========================================================
    // AI 결과 상태 기록
    // ========================================================
    const { data: existingResult } = await supabase
      .from("project_ai_results")
      .select("*")
      .eq("project_id", projectId)
      .eq("ai_model", aiModel)
      .maybeSingle();

    if (!existingResult) {
      await supabase.from("project_ai_results").insert({
        project_id: projectId,
        ai_model: aiModel,
        status: "processing",
      });
    } else {
      await updateAiResultStatus(supabase, projectId, aiModel, "processing");
    }

    // ========================================================
    // 프로젝트 상태 업데이트
    // ========================================================
    await updateProjectStatus(supabase, projectId, "processing");

    // ========================================================
    // 다른 AI 재시도 시 기존 스테이지 제거
    // ========================================================
    if (retryWithDifferentAi) {
      const { error: deleteError } = await supabase
        .from("project_stages")
        .delete()
        .eq("project_id", projectId)
        .eq("ai_model", aiModel);

      if (deleteError) {
        console.error("Failed to delete existing stages:", deleteError);
      }
    }

    // ========================================================
    // 6단계 생성 및 처리
    // ========================================================
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < STAGE_NAMES.length; i++) {
      const stageName = STAGE_NAMES[i];
      console.log(`Creating stage ${i + 1}: ${stageName} for AI: ${aiModel}`);

      // 스테이지 생성
      const { data: newStage, error: stageError } = await supabase
        .from("project_stages")
        .insert({
          project_id: projectId,
          stage_name: stageName,
          stage_order: i + 1,
          status: "processing",
          ai_model: aiModel,
        })
        .select()
        .single();

      if (stageError || !newStage) {
        console.error(`Stage creation error for ${stageName}:`, stageError);
        failCount++;
        continue;
      }

      // 콘텐츠 생성 - 선택된 AI로 호출
      try {
        const stageContent = await generateContent(
          provider,
          "당신은 교육 콘텐츠 제작 전문가입니다. 각 단계에 맞는 구체적이고 실행 가능한 콘텐츠를 한국어로 작성하세요.",
          `문서 콘텐츠:\n${documentContent}\n\n단계: ${stageName}\n해당 단계에 맞는 구체적이고 실행 가능한 콘텐츠를 작성하세요.`,
          aiApiKey
        );

        await updateStageStatus(supabase, newStage.id, "completed", stageContent);
        console.log(`Stage ${stageName} completed successfully`);
        successCount++;
      } catch (error) {
        console.error(`Error generating content for stage ${stageName}:`, error);
        await updateStageStatus(supabase, newStage.id, "failed");
        failCount++;
      }
    }

    // ========================================================
    // 최종 결과물 합성
    // ========================================================
    console.log(
      `Generating final content for AI: ${aiModel} (Success: ${successCount}, Failed: ${failCount})`
    );

    const { data: completedStages, error: stagesError } = await supabase
      .from("project_stages")
      .select("*")
      .eq("project_id", projectId)
      .eq("ai_model", aiModel)
      .order("stage_order", { ascending: true });

    if (stagesError) {
      console.error("Error fetching stages:", stagesError);
    }

    const finalContent = completedStages
      ?.map(
        (stage) => `## ${stage.stage_name}\n\n${stage.content || "생성 실패"}`
      )
      .join("\n\n---\n\n");

    // ========================================================
    // 최종 상태 결정
    // ========================================================
    const finalStatus =
      failCount === 0
        ? "completed"
        : successCount === 0
          ? "failed"
          : "partial";

    // ========================================================
    // AI 결과 업데이트
    // ========================================================
    await updateAiResultStatus(
      supabase,
      projectId,
      aiModel,
      finalStatus,
      finalContent
    );

    // ========================================================
    // 프로젝트 기본 generated_content 업데이트
    // ========================================================
    await updateProjectStatus(supabase, projectId, finalStatus, {
      generated_content: finalContent,
      ai_model: aiModel,
    });

    console.log(`Project processing completed with status: ${finalStatus}`);

    // ========================================================
    // 응답 반환
    // ========================================================
    return new Response(
      JSON.stringify({
        success: finalStatus !== "failed",
        status: finalStatus,
        content: finalContent,
        stats: {
          total: STAGE_NAMES.length,
          success: successCount,
          failed: failCount,
        },
        provider: provider,
        model: AI_CONFIG[provider].model,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    // ========================================================
    // 전역 에러 처리
    // ========================================================
    // 내부 로그에만 상세 에러 기록
    console.error("[Error] Unhandled error in process-document function:", error);

    return new Response(
      JSON.stringify({
        error: "서버 내부 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
        timestamp: new Date().toISOString(),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
