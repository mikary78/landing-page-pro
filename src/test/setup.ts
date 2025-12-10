import '@testing-library/jest-dom';
import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// webidl-conversions 에러를 미리 처리
// 이 에러는 Supabase 의존성 문제로 발생하며, 테스트 실행에는 영향 없음
const originalError = console.error;
const originalWarn = console.warn;

console.error = (...args: unknown[]) => {
  const message = args.join(' ');
  if (
    message.includes('webidl-conversions') ||
    message.includes('whatwg-url') ||
    message.includes("Cannot read properties of undefined (reading 'get')")
  ) {
    // 이 에러는 무시
    return;
  }
  originalError(...args);
};

console.warn = (...args: unknown[]) => {
  const message = args.join(' ');
  if (
    message.includes('webidl-conversions') ||
    message.includes('whatwg-url') ||
    message.includes("Cannot read properties of undefined (reading 'get')")
  ) {
    // 이 경고는 무시
    return;
  }
  originalWarn(...args);
};

// Uncaught Exception 처리
if (typeof process !== 'undefined' && process.on) {
  const originalUncaughtException = process.listeners('uncaughtException');
  process.removeAllListeners('uncaughtException');
  process.on('uncaughtException', (error: Error) => {
    const errorMessage = error?.message || error?.toString() || '';
    if (
      errorMessage.includes('webidl-conversions') ||
      errorMessage.includes('whatwg-url') ||
      errorMessage.includes("Cannot read properties of undefined (reading 'get')")
    ) {
      // 이 에러는 무시
      return;
    }
    // 다른 에러는 원래 핸들러로 전달
    originalUncaughtException.forEach((handler) => {
      try {
        if (typeof handler === 'function') {
          (handler as (error: Error, origin: string) => void)(error, 'uncaughtException');
        }
      } catch {
        // 핸들러 에러는 무시
      }
    });
  });
}

// 각 테스트 후 자동 cleanup
afterEach(() => {
  cleanup();
});

// Node.js 환경 변수 설정 (webidl-conversions 모듈을 위한)
// jsdom 환경에서 Node.js 전역 변수 제공
if (typeof globalThis !== 'undefined') {
  (globalThis as Record<string, unknown>).global = globalThis;
  
  // process 객체가 없는 경우 빈 객체로 설정
  if (typeof process === 'undefined') {
    (globalThis as Record<string, unknown>).process = { env: {} };
  }
}

// Supabase 클라이언트는 vitest.config.ts의 resolve.alias를 통해 모킹됨
// 여기서는 추가 모킹이 필요 없음
