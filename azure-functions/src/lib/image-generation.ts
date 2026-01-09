import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface GeneratedImage {
  prompt: string;
  dataUrl: string;
  createdAt: string;
  model: string;
}

export async function generateImageDataUrl(prompt: string): Promise<GeneratedImage | null> {
  if (!process.env.OPENAI_API_KEY) return null;

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
  }
}

