/**
 * Image Generation Service
 * 
 * 지원하는 이미지 생성 API:
 * 1. Google Imagen API (Vertex AI) - 우선 사용
 * 2. OpenAI DALL-E - 대체 옵션
 * 
 * 참고: Gemini API는 이미지 생성 기능이 없습니다.
 * 
 * 작성일: 2026-01-11
 * 수정일: 2026-01-11 - Vertex AI Imagen 지원 추가
 */

import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface GeneratedImage {
  prompt: string;
  dataUrl: string;
  createdAt: string;
  model: string;
}

/**
 * 이미지 생성
 * 
 * 우선순위:
 * 1. Vertex AI Imagen API (VERTEX_API_KEY 또는 GOOGLE_APPLICATION_CREDENTIALS 설정 시)
 * 2. OpenAI DALL-E (OPENAI_API_KEY 설정 시)
 * 
 * 참고: Gemini API는 이미지 생성 기능이 없습니다.
 */
export async function generateImageDataUrl(prompt: string): Promise<GeneratedImage | null> {
  // 1. Vertex AI Imagen API 시도
  const vertexApiKey = process.env.VERTEX_API_KEY || process.env.VERTEXX_API_KEY;
  const vertexProjectId = process.env.VERTEX_PROJECT_ID;
  const vertexLocation = process.env.VERTEX_LOCATION || 'us-central1';
  
  if (vertexApiKey || process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    try {
      const imagenResult = await generateImageWithImagen(prompt, {
        apiKey: vertexApiKey,
        projectId: vertexProjectId,
        location: vertexLocation,
      });
      if (imagenResult) {
        return imagenResult;
      }
    } catch (error) {
      console.warn('[image-generation] Imagen API 실패, OpenAI로 대체:', error);
    }
  }
  
  // 2. OpenAI DALL-E 사용 (대체)
  if (!process.env.OPENAI_API_KEY) {
    console.warn('[image-generation] 이미지 생성 API 키가 설정되지 않았습니다. (VERTEX_API_KEY 또는 OPENAI_API_KEY 필요)');
    return null;
  }

  // NOTE: OpenAI SDK version in this repo is v4.x; images API shape can vary by model.
  // We try gpt-image-1 (base64) first, fallback to dall-e-3 if needed.
  try {
    const res: any = await (openai as any).images.generate({
      model: 'gpt-image-1',
      prompt,
      size: '1024x1024',
      // request base64 output (SDK will expose b64_json when supported)
      response_format: 'b64_json',
    });

    const b64 = res?.data?.[0]?.b64_json;
    if (!b64) throw new Error('No b64_json in image response');
    return {
      prompt,
      dataUrl: `data:image/png;base64,${b64}`,
      createdAt: new Date().toISOString(),
      model: 'gpt-image-1',
    };
  } catch (e) {
    // Fallback to DALL-E 3
    try {
      const res: any = await (openai as any).images.generate({
        model: 'dall-e-3',
        prompt,
        size: '1024x1024',
        response_format: 'b64_json',
      });
      const b64 = res?.data?.[0]?.b64_json;
      if (!b64) return null;
      return {
        prompt,
        dataUrl: `data:image/png;base64,${b64}`,
        createdAt: new Date().toISOString(),
        model: 'dall-e-3',
      };
    } catch (fallbackError) {
      console.error('[image-generation] 이미지 생성 실패:', fallbackError);
      return null;
    }
  }
}

/**
 * Google Imagen API를 사용한 이미지 생성
 * 
 * 참고: Vertex AI Imagen API는 REST API 또는 @google-cloud/aiplatform SDK를 통해 사용 가능합니다.
 * 
 * 옵션 1: REST API 직접 호출 (API 키 사용)
 * 옵션 2: @google-cloud/aiplatform SDK (서비스 계정 키 사용)
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
  
  // API 키가 있으면 REST API로 시도
  if (apiKey && projectId) {
    try {
      // Vertex AI Imagen REST API 호출
      // 참고: 실제 엔드포인트는 프로젝트 설정에 따라 다를 수 있습니다
      const endpoint = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/imagegeneration@006:predict`;
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          instances: [{
            prompt: prompt,
          }],
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
  
  // 서비스 계정 키가 있으면 SDK 사용 시도
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS && projectId) {
    try {
      // @google-cloud/aiplatform 패키지가 설치되어 있으면 사용
      // 동적 import로 선택적 사용
      // @ts-expect-error - 선택적 패키지이므로 타입 체크 스킵
      const { PredictionServiceClient } = await import('@google-cloud/aiplatform').catch(() => null);
      
      if (PredictionServiceClient) {
        const client = new PredictionServiceClient({
          apiEndpoint: `${location}-aiplatform.googleapis.com`,
        });
        
        // Imagen API 호출 (SDK 방식)
        // 참고: 실제 구현은 @google-cloud/aiplatform 문서 참조
        // 현재는 REST API 방식이 더 간단하므로 REST API 우선 사용
      }
    } catch (error) {
      console.error('[image-generation] Imagen SDK 사용 실패:', error);
    }
  }
  
  // API 키나 서비스 계정 키가 없으면 null 반환
  return null;
}
