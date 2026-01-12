/**
 * AI Services Integration
 * Gemini, Claude, ChatGPT
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';

// Initialize clients
const gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Generate content with Gemini
 */
export async function generateWithGemini(
  prompt: string,
  systemPrompt?: string
): Promise<string> {
  // 모델 이름: gemini-1.5-flash (또는 gemini-1.5-flash-002)
  // 참고: -latest 접미사는 v1 API에서 지원되지 않음
  // 에러 발생 시 폴백 없이 에러를 그대로 throw
  const model = gemini.getGenerativeModel({ model: 'gemini-1.5-flash' });

  const fullPrompt = systemPrompt ? `${systemPrompt}\n\n---\n\n${prompt}` : prompt;

  const result = await model.generateContent(fullPrompt);
  const response = await result.response;
  return response.text();
}

/**
 * Generate content with Claude
 */
export async function generateWithClaude(
  prompt: string,
  systemPrompt?: string
): Promise<string> {
  const message = await anthropic.messages.create({
    model: 'claude-3-haiku-20240307',
    max_tokens: 4096,
    system: systemPrompt || '',
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  });

  const content = message.content[0];
  if (content.type === 'text') {
    return content.text;
  }

  throw new Error('Unexpected response type from Claude');
}

/**
 * Generate content with ChatGPT
 */
export async function generateWithChatGPT(
  prompt: string,
  systemPrompt?: string
): Promise<string> {
  const messages: any[] = [];

  if (systemPrompt) {
    messages.push({ role: 'system', content: systemPrompt });
  }

  messages.push({ role: 'user', content: prompt });

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: messages,
    max_tokens: 4096,
    temperature: 0.7,
  });

  return completion.choices[0]?.message?.content || '';
}

/**
 * Generate content with specified AI model
 * NOTE: Gemini and Claude are temporarily disabled. Only ChatGPT is active.
 * To re-enable: uncomment the respective case statements below
 */
export async function generateContent(
  aiModel: 'gemini' | 'claude' | 'chatgpt',
  prompt: string,
  systemPrompt?: string
): Promise<string> {
  switch (aiModel) {
    case 'gemini':
      // Gemini만 사용, 폴백 없음
      return await generateWithGemini(prompt, systemPrompt);

    case 'claude':
      // Claude만 사용, 폴백 없음
      return await generateWithClaude(prompt, systemPrompt);

    case 'chatgpt':
      // ChatGPT만 사용
      return await generateWithChatGPT(prompt, systemPrompt);

    default:
      throw new Error(`Unsupported AI model: ${aiModel}`);
  }
}
