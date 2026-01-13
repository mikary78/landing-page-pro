# 2026-01-13 — PPTX(슬라이드 만들기) Export 기능 추가

## 배경 / 요구사항
- 사용자 요청: `docs/AI-Presentation-Generator-PRD.md`를 기반으로 **"슬라이드 만들기" (PPTX 생성/다운로드)** 기능을 추가.
- 제약: **현재 코드 구조(Agent 기반 슬라이드 JSON 생성 + Studio UI) 유지**하면서 기능을 확장.
- 추가 고려: 기존 강제 인용(슬라이드 speakerNotes의 `[n]`, deck-level `sources`, `Sources` 슬라이드)을 **PPTX에도 그대로 반영**.

## 결정 사항(설계)
- **백엔드(Python/FastAPI/python-pptx)로 신규 스택을 도입하지 않음**  
  현재 프로젝트는 React + Azure Functions(Node/TS) 중심이므로, 기존 구조와 의존성(`pptxgenjs`)을 활용해 **프론트에서 PPTX 생성**.
- PPTX 생성 입력은 **DB artifact(`generation_artifacts.artifact_type='slides'`)의 `content_json`**을 우선 사용:
  - 이유: backend에서 이미 `sources` 표준화 및 `Sources` 슬라이드 자동 추가를 수행함.
  - 과거 데이터 호환을 위해 step output / markdown 기반 fallback도 유지.

## 구현 요약
### 1) PPTX 생성 로직 분리
- 파일: `src/lib/pptxExport.ts`
- 역할:
  - `slidesJson`(AI 산출물) + `assets.background.dataUrl`를 받아 PPTX 생성
  - deck에 `Sources` 슬라이드가 없으면 `slidesJson.sources`로 자동 추가(중복 방지)
  - 한국어 환경을 고려해 기본 폰트를 `Malgun Gothic`으로 지정

### 2) Studio UI의 "슬라이드 만들기(PPTX)" 다운로드 개선
- 파일: `src/pages/GenerationStudioPage.tsx`
- 변경:
  - 기존: step output 기반 슬라이드 → PPTX 생성
  - 개선: **artifact 기반 슬라이드 JSON 우선 사용** + sources/notes 반영
  - 다운로드 드롭다운 표시 조건을 완화:
    - 기존엔 `combinedDocument`가 없으면 다운로드 자체가 불가능했음
    - 이제 슬라이드 산출물이 있으면 PPTX 다운로드 가능

### 3) 테스트
- 파일: `src/lib/__tests__/pptxExport.test.ts`
- 최소 검증:
  - PPTX(=ZIP)의 시그니처 `"PK"`로 생성 결과 스모크 테스트

## 보안/운영 메모
- PPTX는 브라우저에서 생성되며 서버에 저장하지 않음(민감정보 서버 저장 최소화).
- 파일명은 Windows 금지문자(`\\ / : * ? " < > |`)를 `_`로 치환.

## 참고 자료(외부 의존성/문서)
- PptxGenJS: `https://github.com/gitbrent/PptxGenJS`
- PptxGenJS 타입 정의/메서드: `node_modules/pptxgenjs/types/index.d.ts`

