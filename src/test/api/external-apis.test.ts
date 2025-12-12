/**
 * 외부 API 테스트
 * 
 * 테스트 대상:
 * - Lovable AI Gateway: AI 콘텐츠 생성 API
 *   URL: https://ai.gateway.lovable.dev/v1/chat/completions
 * 
 * 출처: Lovable AI Gateway API
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Edge Function 내부에서 사용되는 외부 API이므로 fetch를 모킹
global.fetch = vi.fn();

describe('External APIs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Lovable AI Gateway API', () => {
    const apiUrl = 'https://ai.gateway.lovable.dev/v1/chat/completions';
    const mockApiKey = 'test-api-key';

    it('AI 콘텐츠 생성 요청이 성공적으로 처리되어야 함', async () => {
      const mockResponse = {
        id: 'chatcmpl-123',
        object: 'chat.completion',
        created: 1677652288,
        model: 'gpt-4',
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: 'Generated AI content',
            },
            finish_reason: 'stop',
          },
        ],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 20,
          total_tokens: 30,
        },
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${mockApiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4',
          messages: [
            {
              role: 'user',
              content: 'Generate course content',
            },
          ],
        }),
      });

      expect(global.fetch).toHaveBeenCalledWith(
        apiUrl,
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Authorization: `Bearer ${mockApiKey}`,
          }),
        })
      );

      expect(response.ok).toBe(true);
      const data = await response.json();
      expect(data.choices).toBeDefined();
      expect(data.choices[0].message.content).toBe('Generated AI content');
    });

    it('API 키가 유효하지 않으면 401 에러를 반환해야 함', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: async () => ({
          error: {
            message: 'Invalid API key',
            type: 'invalid_request_error',
          },
        }),
      });

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer invalid-key',
        },
        body: JSON.stringify({
          model: 'gpt-4',
          messages: [{ role: 'user', content: 'Test' }],
        }),
      });

      expect(response.ok).toBe(false);
      expect(response.status).toBe(401);
      const error = await response.json();
      expect(error.error.message).toBe('Invalid API key');
    });

    it('요청 제한을 초과하면 429 에러를 반환해야 함', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        json: async () => ({
          error: {
            message: 'Rate limit exceeded',
            type: 'rate_limit_error',
          },
        }),
      });

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${mockApiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4',
          messages: [{ role: 'user', content: 'Test' }],
        }),
      });

      expect(response.ok).toBe(false);
      expect(response.status).toBe(429);
      const error = await response.json();
      expect(error.error.message).toBe('Rate limit exceeded');
    });

    it('잘못된 요청 형식이면 400 에러를 반환해야 함', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: async () => ({
          error: {
            message: 'Invalid request format',
            type: 'invalid_request_error',
          },
        }),
      });

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${mockApiKey}`,
        },
        body: JSON.stringify({
          // model 필드 누락
          messages: [{ role: 'user', content: 'Test' }],
        }),
      });

      expect(response.ok).toBe(false);
      expect(response.status).toBe(400);
      const error = await response.json();
      expect(error.error.message).toBe('Invalid request format');
    });

    it('네트워크 오류 시 에러를 처리해야 함', async () => {
      (global.fetch as any).mockRejectedValueOnce(
        new Error('Network error')
      );

      await expect(
        fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${mockApiKey}`,
          },
          body: JSON.stringify({
            model: 'gpt-4',
            messages: [{ role: 'user', content: 'Test' }],
          }),
        })
      ).rejects.toThrow('Network error');
    });

    it('다양한 AI 모델을 지원해야 함', async () => {
      const models = ['gpt-4', 'claude-3', 'gpt-3.5-turbo'];

      for (const model of models) {
        const mockResponse = {
          id: `chatcmpl-${model}`,
          model,
          choices: [
            {
              message: {
                content: `Response from ${model}`,
              },
            },
          ],
        };

        (global.fetch as any).mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse,
        });

        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${mockApiKey}`,
          },
          body: JSON.stringify({
            model,
            messages: [{ role: 'user', content: 'Test' }],
          }),
        });

        expect(response.ok).toBe(true);
        const data = await response.json();
        expect(data.model).toBe(model);
      }
    });

    it('스트리밍 응답을 처리할 수 있어야 함', async () => {
      const streamResponse = new ReadableStream({
        start(controller) {
          const chunks = [
            'data: {"id":"chatcmpl-123","choices":[{"delta":{"content":"Hello"}}]}\n\n',
            'data: {"id":"chatcmpl-123","choices":[{"delta":{"content":" World"}}]}\n\n',
            'data: [DONE]\n\n',
          ];

          chunks.forEach((chunk) => {
            controller.enqueue(new TextEncoder().encode(chunk));
          });
          controller.close();
        },
      });

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        body: streamResponse,
      });

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${mockApiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4',
          messages: [{ role: 'user', content: 'Test' }],
          stream: true,
        }),
      });

      expect(response.ok).toBe(true);
      expect(response.body).toBeDefined();
    });
  });
});

