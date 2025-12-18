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
  const model = gemini.getGenerativeModel({ model: 'gemini-1.5-flash-latest' });

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
 */
export async function generateContent(
  aiModel: 'gemini' | 'claude' | 'chatgpt',
  prompt: string,
  systemPrompt?: string
): Promise<string> {
  switch (aiModel) {
    case 'gemini':
      return await generateWithGemini(prompt, systemPrompt);
    case 'claude':
      return await generateWithClaude(prompt, systemPrompt);
    case 'chatgpt':
      return await generateWithChatGPT(prompt, systemPrompt);
    default:
      throw new Error(`Unsupported AI model: ${aiModel}`);
  }
}
