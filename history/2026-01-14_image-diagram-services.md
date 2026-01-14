# 2026-01-14 이미지 검색 서비스(Unsplash/Pexels) + Mermaid 다이어그램 서비스 + LLM 강화 + 폼 UI 토글

## 배경
`docs/AI-Presentation-Generator-PRD-v2.0.md`의 v2.0 신규 기능을 코드로 반영:
- Feature 4: **Intelligent Image Search**
- Feature 5: **AI Diagram Generation**
- Enhanced LLM Service (이미지 키워드/다이어그램 메타 생성)
- Enhanced Form Component (이미지/다이어그램 토글)

## 구현 내용
### Backend (신규 스캐폴딩)
PRD가 지정한 경로를 그대로 생성하여 추후 FastAPI 앱/라우트에 연결 가능하도록 구성:
- `backend/app/services/image_service.py`
  - Unsplash → Pexels 순서 멀티 소스 검색
  - 결과에 attribution(photographer/URL/source) 포함
  - timeout/에러 처리 및 relevance scoring 확장 포인트 제공
- `backend/app/services/diagram_service.py`
  - Mermaid CLI(`mmdc`)를 subprocess로 호출해 PNG/SVG 렌더링
  - 입력 검증, timeout, 임시파일 정리, bytes 반환 API 제공
- `backend/app/services/llm_service.py`
  - PRD의 “Enhanced LLM Service” 예제 구조를 기반으로:
    - 프레젠테이션 outline(JSON) 생성
    - 슬라이드별 이미지 키워드 생성 함수
    - 슬라이드별 다이어그램 메타/mermaid 코드 생성 함수

설정:
- `backend/app/core/config.py` (환경변수 기반)
- `backend/requirements.txt`

테스트:
- `backend/tests/test_image_service.py` (aioresponses로 HTTP mocking)
- `backend/tests/test_diagram_service.py` (subprocess mocking)

### Frontend (UI)
PRD 예제 폼을 현재 레포 구조에 맞춰 추가:
- `src/components/PresentationForm.tsx`
- `src/components/presentation/ImageToggle.tsx`
- `src/components/presentation/DiagramToggle.tsx`

## 운영/설치 참고
- Mermaid CLI는 런타임 환경에 `mmdc`가 설치되어 있어야 합니다.

## 참고/출처(외부)
- Unsplash API (Search Photos): `https://unsplash.com/documentation#search-photos`
- Pexels API (Photo Search): `https://www.pexels.com/api/documentation/#photos-search`
- Mermaid CLI: `https://github.com/mermaid-js/mermaid-cli`
- OpenAI Python SDK: `https://github.com/openai/openai-python`

