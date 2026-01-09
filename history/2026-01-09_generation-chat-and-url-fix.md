# 2026-01-09 스튜디오 생성 404 수정 + 채팅(수정/중단) 기능 추가

## 배경 / 문제
- 스튜디오에서 콘텐츠 생성 시작 시 브라우저 콘솔에 **404 (Not Found)** 가 발생.
- 캡처에서 요청 URL이 `https://...azurewebsites.net/?/api/generation/start` 형태로 보였고,
  이는 `/api/...`가 **쿼리스트링으로 취급**되어 Azure Functions 라우팅이 매칭되지 않는 구성입니다.

## 변경 요약

### 1) Azure Functions URL 조합 로직 하드닝 (프론트)
- 파일: `src/lib/azureFunctionsUrl.ts`, `src/lib/azureFunctions.ts`
- 내용:
  - `VITE_AZURE_FUNCTIONS_URL`이 `https://<app>.azurewebsites.net/?`처럼 잘못 설정되어도
    `buildAzureFunctionsUrl()`이 **항상 `/api/...` 경로로 정상 조합**하도록 수정
  - `?code=...` 같은 실제 쿼리 파라미터는 유지
- 테스트: `src/lib/__tests__/azureFunctionsUrl.test.ts`

### 2) 스튜디오 채팅 UI 추가(좌측 패널)
- 파일: `src/pages/GenerationStudioPage.tsx`
- 내용:
  - 좌측에 **채팅 윈도우**를 추가하여 AI에게 수정 요청/중단 요청 가능
  - 우측 탭(강의안/인포그래픽/슬라이드) 선택 상태를 채팅 대상 산출물로 사용
  - “중단” 버튼은 cancel API 호출로 처리

### 3) 백엔드: 채팅/중단 API 추가 + worker 수정
- 파일:
  - `azure-functions/src/functions/generationChat.ts`
  - `azure-functions/src/functions/cancelGenerationJob.ts`
  - `azure-functions/src/functions/generationJobWorker.ts`
  - `azure-functions/src/lib/agent/plan.ts`
  - `azure-functions/src/index.ts`
- 내용:
  - `POST /api/generation/chat`:
    - 사용자의 수정 요청을 받아 `revise_document|revise_infographic|revise_slides` step을 **동적으로 추가**
    - job을 `processing`으로 설정 후 큐 재-enqueue → worker가 수정 step 실행
  - `POST /api/generation/cancel`:
    - job을 `cancelled`로 업데이트 + pending step을 `cancelled`로 마킹
  - worker:
    - `cancelled` 상태면 즉시 중단
    - `revise_*` step을 처리하여 산출물을 업데이트

## 참고자료(외부)
- Azure Functions Node.js v4 HTTP trigger:
  - `https://learn.microsoft.com/en-us/azure/azure-functions/functions-reference-node?tabs=v4`

