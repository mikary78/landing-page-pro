# 2024-11-20 - 테스트 프레임워크 설정

## 사용자 요구사항
- 테스트 프레임워크 설정
- history 폴더 구조 생성 (중대한 변화만 문서화)
- 커밋 메시지 충실하게 작성

## 구현 답변
- Vitest + React Testing Library 환경 구축
- 테스트 셋업 파일 생성
- Button 컴포넌트 예시 테스트 작성
- history 폴더 구조 및 문서 템플릿 생성

## 수정 내역 요약

### 패키지 설치
- vitest@latest
- @testing-library/react@latest
- @testing-library/jest-dom@latest
- @testing-library/user-event@latest
- @vitest/ui@latest
- jsdom@latest

### 설정 파일
**파일**: `vitest.config.ts`
- Vitest 설정 (jsdom 환경, globals, css 지원)
- React 플러그인 설정
- path alias (@) 설정

**파일**: `src/test/setup.ts`
- @testing-library/jest-dom import
- afterEach cleanup 설정

### 테스트 코드
**파일**: `src/components/__tests__/Button.test.tsx`
- 기본 렌더링 테스트
- variant (hero) 테스트
- size (xl) 테스트
- disabled 상태 테스트

### 문서화 구조
**파일**: 
- `history/README.md` - 문서화 가이드라인
- `history/2024-11-20_initial-landing-page.md` - 초기 랜딩페이지 기록
- `history/2024-11-20_test-framework-setup.md` - 현재 문서

## 테스트
- `src/components/__tests__/Button.test.tsx`
  - Button 컴포넌트의 기본 동작 검증
  - variant 및 size props 테스트
  - disabled 상태 테스트

## 테스트 실행 방법
```bash
# 테스트 실행
npm run test

# UI 모드로 테스트 실행
npm run test:ui

# 커버리지 확인
npm run test:coverage
```

## 참고자료
- **테스트 프레임워크**: [Vitest 공식 문서](https://vitest.dev/)
- **테스팅 라이브러리**: [React Testing Library](https://testing-library.com/react)
