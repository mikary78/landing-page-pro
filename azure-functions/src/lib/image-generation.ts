/**
 * Image Generation Service
 *
 * 지원하는 이미지 생성 API:
 * 1. OpenAI DALL-E 3 - 기본 사용
 * 2. Google Imagen API (Vertex AI) - 대체 옵션
 *
 * 작성일: 2026-01-11
 * 수정일: 2026-02-04 - OpenAI 우선, lazy init, 안정성 개선
 */

import OpenAI from 'openai';

// Lazy initialization - 모듈 로드 시 환경 변수 미설정으로 인한 크래시 방지
let _openaiClient: OpenAI | null = null;
function getOpenAI(): OpenAI | null {
  if (!process.env.OPENAI_API_KEY) return null;
  if (!_openaiClient) {
    _openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return _openaiClient;
}

export interface GeneratedImage {
  prompt: string;
  dataUrl: string;
  createdAt: string;
  model: string;
}

/**
 * 이미지 생성
 *
 * 우선순위 (변경됨):
 * 1. OpenAI DALL-E 3 (OPENAI_API_KEY 설정 시) - 기본
 * 2. Vertex AI Imagen API - 대체
 */
export async function generateImageDataUrl(prompt: string): Promise<GeneratedImage | null> {
  console.log('[image-generation] === 이미지 생성 시작 ===');
  console.log('[image-generation] OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? `set (${process.env.OPENAI_API_KEY.substring(0, 10)}...)` : 'NOT SET');

  // 1. OpenAI DALL-E 사용 (우선)
  if (process.env.OPENAI_API_KEY) {
    const client = getOpenAI();
    if (client) {
      try {
        console.log('[image-generation] DALL-E 3 호출 시작');
        console.log('[image-generation] Prompt:', prompt.substring(0, 100) + '...');

        const res = await client.images.generate({
          model: 'dall-e-3',
          prompt,
          size: '1024x1024',
          response_format: 'b64_json',
        });

        console.log('[image-generation] DALL-E 3 응답 수신');

        const b64 = res?.data?.[0]?.b64_json;
        if (!b64) {
          console.error('[image-generation] No b64_json in DALL-E response. Response data:', JSON.stringify(res?.data?.[0] ? { ...res.data[0], b64_json: undefined } : null));
        } else {
          console.log('[image-generation] DALL-E 3 이미지 생성 성공 (b64 length:', b64.length, ')');
          return {
            prompt,
            dataUrl: `data:image/png;base64,${b64}`,
            createdAt: new Date().toISOString(),
            model: 'dall-e-3',
          };
        }
      } catch (error: any) {
        console.error('[image-generation] DALL-E 3 이미지 생성 실패');
        if (error instanceof Error) {
          console.error('[image-generation] Error:', error.name, '-', error.message);
        }
        if (error?.status) {
          console.error('[image-generation] HTTP Status:', error.status);
        }
        if (error?.error) {
          console.error('[image-generation] API Error:', JSON.stringify(error.error));
        }
      }
    }
  } else {
    console.warn('[image-generation] OPENAI_API_KEY가 설정되지 않음 - DALL-E 사용 불가');
  }

  // 2. Vertex AI Imagen API 시도 (대체)
  const vertexApiKey = process.env.VERTEX_API_KEY || process.env.VERTEXX_API_KEY;
  const vertexProjectId = process.env.VERTEX_PROJECT_ID;
  const vertexLocation = process.env.VERTEX_LOCATION || 'us-central1';

  if (vertexApiKey || process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    try {
      console.log('[image-generation] Vertex AI Imagen 시도');
      const imagenResult = await generateImageWithImagen(prompt, {
        apiKey: vertexApiKey,
        projectId: vertexProjectId,
        location: vertexLocation,
      });
      if (imagenResult) {
        return imagenResult;
      }
      console.warn('[image-generation] Vertex AI Imagen도 실패');
    } catch (error) {
      console.warn('[image-generation] Imagen API 실패:', error);
    }
  }

  console.error('[image-generation] === 모든 이미지 생성 시도 실패 ===');
  return null;
}

/**
 * Google Imagen API를 사용한 이미지 생성
 */
interface ImagenOptions {
  apiKey?: string;
  projectId?: string;
  location?: string;
}

export async function generateImageWithImagen(
  prompt: string,
  options?: ImagenOptions
): Promise<GeneratedImage | null> {
  const apiKey = options?.apiKey || process.env.VERTEX_API_KEY || process.env.VERTEXX_API_KEY;
  const projectId = options?.projectId || process.env.VERTEX_PROJECT_ID;
  const location = options?.location || process.env.VERTEX_LOCATION || 'us-central1';

  if (apiKey && projectId) {
    try {
      const endpoint = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/imagegeneration@006:predict`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          instances: [{ prompt }],
          parameters: {
            sampleCount: 1,
            aspectRatio: '1:1',
            safetyFilterLevel: 'block_some',
            personGeneration: 'allow_all',
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[image-generation] Imagen API 오류:', response.status, errorText);
        return null;
      }

      const result = await response.json() as { predictions?: Array<{ bytesBase64Encoded?: string }> };
      const base64Image = result.predictions?.[0]?.bytesBase64Encoded;

      if (base64Image) {
        return {
          prompt,
          dataUrl: `data:image/png;base64,${base64Image}`,
          createdAt: new Date().toISOString(),
          model: 'imagen-3.0-generate-001',
        };
      }
    } catch (error) {
      console.error('[image-generation] Imagen API 호출 실패:', error);
      return null;
    }
  }

  return null;
}
