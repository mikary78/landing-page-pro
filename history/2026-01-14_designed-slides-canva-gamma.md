# 2026-01-14 Canva/Gamma 스타일 “디자인 적용” PPT 슬라이드 생성 기능

## 목표
- 기존 **Agent 기반 슬라이드 생성(JSON)** + **Canvas 미리보기** + **PPTX 내보내기(pptxgenjs)** 흐름을 유지하면서,
  **Canva/Gamma처럼 ‘디자인이 적용된’ 덱**을 생성/미리보기/다운로드할 수 있도록 확장.

## 핵심 변경점
### 1) 슬라이드 JSON 확장(Backward compatible)
- `layoutType`(표지/섹션/2컬럼/이미지/다이어그램/결론/출처 등) 추가
- `deckTheme`(style/palette/typography/background) 추가
- `image` / `diagram` 메타 슬롯 추가(향후 실제 이미지/다이어그램 dataUrl 연결 가능)

### 2) Azure Functions (프롬프트/검증/옵션)
- `buildSlidesPrompt`에 **layoutType + deckTheme** 생성 규칙 추가
- `validateSlides`에 `layoutType` 허용값 검증(경고 수준) 추가
- `slidesOptions`에서 템플릿을 `default|minimal|creative|gamma|canva`로 확장
- 출처 슬라이드(`Sources`) 생성 시 `layoutType: sources`를 함께 기록

### 3) PPTX 내보내기(pptxgenjs) 디자인 엔진 확장
- `gamma/canva` 템플릿 프리셋 추가
- `layoutType`별 레이아웃 렌더링 구현:
  - `title_slide`, `section_header`, `title_and_content`, `two_column`, `content_with_image`, `diagram_slide`, `conclusion`, `sources`
- 배경 장식(도형 + 투명도)과 카드형 레이아웃을 사용해 Canva/Gamma 느낌의 시각적 계층 구조 구현

### 4) Canvas 미리보기(SlidesCanvas) 개선
- `layoutType` 기반으로 2컬럼/이미지/다이어그램/섹션 헤더 등 미리보기 레이아웃 반영
- `deckTheme` palette/style에 맞춰 색/장식 요소를 동적으로 적용

## 테스트
- Frontend: `npm test`
- Azure Functions: `cd azure-functions && npm test`
- 주요 커버리지:
  - `pptxExport`가 `gamma/canva` 템플릿 + `layoutType` 포함 JSON을 처리해도 `.pptx`(ZIP, PK 헤더) 생성됨
  - `slidesOptions`가 `gamma/canva` 템플릿을 허용/검증함

## 외부 참고/출처
- PptxGenJS (슬라이드/도형/이미지 생성 라이브러리): `https://gitbrent.github.io/PptxGenJS/`

