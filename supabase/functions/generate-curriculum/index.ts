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

serve(async (req) => {
  // CORS preflight 처리
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // --------------------------------------------------------
    // 요청 파싱
    // --------------------------------------------------------
    const {
      courseId,
      courseTitle,
      courseDescription,
      level,
      targetAudience,
      totalDuration,
      aiModel = "gemini",
    } = await req.json();

    console.log("Generate curriculum request received:", {
      courseId,
      courseTitle,
      aiModel,
    });

    // --------------------------------------------------------
    // 환경 변수 확인
    // --------------------------------------------------------
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") || Deno.env.get("VERTEX_API_KEY");
    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Missing required environment variables: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY");
    }

    // Supabase 클라이언트 생성 (Service Role)
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // --------------------------------------------------------
    // AI 프롬프트 구성
    // --------------------------------------------------------
    const curriculumPrompt = `당신은 교육 커리큘럼 설계 전문가입니다. 다음 코스 정보를 바탕으로 체계적이고 실용적인 커리큘럼 구조를 생성해주세요.

코스 정보:
- 제목: ${courseTitle}
- 설명: ${courseDescription || "설명 없음"}
- 난이도: ${level || "미지정"}
- 타겟 학습자: ${targetAudience || "미지정"}
- 총 기간: ${totalDuration || "미지정"}

요구사항:
1. 총 기간(${totalDuration})에 맞춰 적절한 수의 모듈과 레슨을 구성하세요.
2. 각 모듈은 명확한 학습 목표를 가져야 합니다.
3. 각 레슨은 구체적인 학습 목표(learning_objectives)를 가져야 합니다.
4. 모듈과 레슨은 논리적인 순서로 배치하세요.

다음 JSON 형식으로만 응답해주세요 (다른 텍스트 없이):
{
  "modules": [
    {
      "title": "모듈 제목",
      "summary": "모듈 요약 설명",
      "order_index": 1,
      "lessons": [
        {
          "title": "레슨 제목",
          "learning_objectives": "이 레슨에서 학습할 내용과 목표",
          "order_index": 1
        }
      ]
    }
  ]
}`;

    // --------------------------------------------------------
    // AI 모델 이름 매핑
    // --------------------------------------------------------
    const modelMapping: Record<string, string> = {
      'gemini': 'gemini-2.0-flash-exp',
      'claude': 'claude-3-5-sonnet-20241022',
      'chatgpt': 'gpt-4o',
    };
    const apiModel = modelMapping[aiModel] || aiModel;

    console.log(`Calling AI API with model: ${apiModel} (original: ${aiModel})`);

    // --------------------------------------------------------
    // AI API 호출 (각 서비스별 직접 호출)
    // --------------------------------------------------------
    const systemPrompt = '당신은 교육 커리큘럼 설계 전문가입니다. 요청된 형식의 JSON만 반환하세요.';
    let aiContent: string | null = null;

    try {
      if (aiModel === 'gemini' || aiModel === 'gemini-1.5-flash' || aiModel === 'gemini-2.0-flash' || aiModel === 'gemini-2.0-flash-exp') {
        if (!GEMINI_API_KEY) {
          throw new Error('GEMINI_API_KEY가 설정되지 않았습니다.');
        }
        // Gemini API v1beta 사용 (systemInstruction은 v1beta에서만 지원)
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${apiModel}:generateContent?key=${GEMINI_API_KEY}`;
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: curriculumPrompt }] }],
            systemInstruction: {
              parts: [{ text: systemPrompt }],
            },
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 4000,
            },
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Gemini API error: ${response.status} ${errorText}`);
        }

        const data = await response.json();
        aiContent = data?.candidates?.[0]?.content?.parts
          ?.map((p: { text?: string }) => p.text || "")
          .join("")
          .trim() || "";
      } else if (aiModel === 'claude' || aiModel === 'claude-3-5-sonnet') {
        if (!ANTHROPIC_API_KEY) {
          throw new Error('ANTHROPIC_API_KEY가 설정되지 않았습니다.');
        }
        const response = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": ANTHROPIC_API_KEY,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model: apiModel,
            max_tokens: 4000,
            system: systemPrompt,
            messages: [{ role: "user", content: curriculumPrompt }],
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Claude API error: ${response.status} ${errorText}`);
        }

        const data = await response.json();
        aiContent = data?.content
          ?.filter((block: { type: string }) => block.type === "text")
          .map((block: { text: string }) => block.text)
          .join("")
          .trim() || "";
      } else if (aiModel === 'chatgpt' || aiModel === 'gpt-4o') {
        if (!OPENAI_API_KEY) {
          throw new Error('OPENAI_API_KEY가 설정되지 않았습니다.');
        }
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: apiModel,
            max_tokens: 4000,
            temperature: 0.7,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: curriculumPrompt },
            ],
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`ChatGPT API error: ${response.status} ${errorText}`);
        }

        const data = await response.json();
        aiContent = data?.choices?.[0]?.message?.content?.trim() || "";
      } else {
        throw new Error(`지원하지 않는 AI 모델: ${aiModel}`);
      }
    } catch (apiError) {
      const errorMessage = apiError instanceof Error 
        ? apiError.message 
        : typeof apiError === 'string' 
          ? apiError 
          : "커리큘럼 생성 중 오류가 발생했습니다.";
      console.error("AI API error:", errorMessage);
      throw new Error(errorMessage);
    }

    if (!aiContent) {
      throw new Error("AI 응답에서 콘텐츠를 찾을 수 없습니다.");
    }

    console.log("AI response received, length:", aiContent.length);

    // --------------------------------------------------------
    // JSON 파싱 (마크다운 코드 블록 제거)
    // --------------------------------------------------------
    let curriculumData;
    try {
      // JSON 코드 블록이 있는 경우 제거
      const jsonMatch = aiContent.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
      const jsonString = jsonMatch ? jsonMatch[1] : aiContent.trim();
      curriculumData = JSON.parse(jsonString);
    } catch (parseError) {
      console.error("JSON parsing error:", parseError);
      console.error("AI response content:", aiContent);
      throw new Error("AI 응답을 JSON으로 파싱할 수 없습니다.");
    }

    if (!curriculumData.modules || !Array.isArray(curriculumData.modules)) {
      throw new Error("AI 응답에 modules 배열이 없습니다.");
    }

    console.log(`Parsed ${curriculumData.modules.length} modules`);

    // --------------------------------------------------------
    // 데이터베이스에 저장
    // --------------------------------------------------------
    const createdModules: string[] = [];
    const createdLessons: string[] = [];

    for (const moduleData of curriculumData.modules) {
      // 모듈 생성
      const { data: newModule, error: moduleError } = await supabase
        .from("course_modules")
        .insert({
          course_id: courseId,
          title: moduleData.title || `모듈 ${moduleData.order_index}`,
          summary: moduleData.summary || null,
          order_index: moduleData.order_index || 1,
        })
        .select()
        .single();

      if (moduleError) {
        console.error(`Error creating module ${moduleData.order_index}:`, moduleError);
        continue;
      }

      if (!newModule) continue;
      createdModules.push(newModule.id);

      // 레슨 생성
      if (moduleData.lessons && Array.isArray(moduleData.lessons)) {
        for (const lessonData of moduleData.lessons) {
          const { data: newLesson, error: lessonError } = await supabase
            .from("lessons")
            .insert({
              module_id: newModule.id,
              title: lessonData.title || `레슨 ${lessonData.order_index}`,
              learning_objectives: lessonData.learning_objectives || null,
              order_index: lessonData.order_index || 1,
            })
            .select()
            .single();

          if (lessonError) {
            console.error(`Error creating lesson ${lessonData.order_index}:`, lessonError);
            continue;
          }

          if (newLesson) {
            createdLessons.push(newLesson.id);
          }
        }
      }
    }

    console.log(`Created ${createdModules.length} modules and ${createdLessons.length} lessons`);

    // --------------------------------------------------------
    // 성공 응답
    // --------------------------------------------------------
    return new Response(
      JSON.stringify({
        success: true,
        message: "커리큘럼이 성공적으로 생성되었습니다.",
        data: {
          modulesCreated: createdModules.length,
          lessonsCreated: createdLessons.length,
        },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error generating curriculum:", error);
    const errorMessage = error instanceof Error 
      ? error.message 
      : typeof error === 'string' 
        ? error 
        : "커리큘럼 생성 중 오류가 발생했습니다.";
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});

