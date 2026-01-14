from __future__ import annotations

import json
from typing import Any, Dict, Optional

from openai import AsyncOpenAI

from app.core.config import settings


class LLMService:
    """
    PRD v2.0 - Enhanced LLM Service
    - 슬라이드 구조(JSON) 생성
    - 이미지 검색 키워드/스타일 메타데이터 생성
    - 다이어그램 필요 여부 + Mermaid 코드/캡션 메타데이터 생성
    """

    def __init__(self) -> None:
        self.client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY or None)
        self.model = settings.OPENAI_MODEL

    async def generate_presentation_outline(
        self,
        topic: str,
        num_slides: int,
        language: str = "ko",
        enable_images: bool = True,
        enable_diagrams: bool = True,
        image_style_default: str = "professional",
    ) -> Dict[str, Any]:
        """
        PRD 예제 스키마를 따르는 outline(JSON) 생성.
        """
        if not (topic or "").strip():
            raise ValueError("topic is required")
        if num_slides < 3 or num_slides > 15:
            raise ValueError("num_slides must be between 3 and 15")

        system_prompt = (
            "당신은 전문 프레젠테이션 디자이너입니다.\n"
            "주제를 받아서 논리적이고 설득력 있는 슬라이드 구조를 만듭니다.\n"
            "각 슬라이드는 명확한 메시지와 3-5개의 핵심 포인트를 가져야 합니다.\n\n"
            "시각적 요소 가이드라인:\n"
            "- 이미지: 슬라이드 내용과 직접 관련된 구체적 영문 검색어(3~5 단어)를 제공\n"
            "- 다이어그램: 프로세스/관계/구조를 시각화할 필요가 있으면 Mermaid 코드 생성\n"
            "- JSON만 반환(추가 텍스트 금지)\n"
        )

        image_instructions = (
            "\n이미지가 필요한 슬라이드의 경우:\n"
            '- "image_required": true\n'
            '- "image_search_keywords": "구체적인 영문 검색어 (3-5 단어)"\n'
            '- "image_style": "professional/modern/minimalist/creative"\n'
            if enable_images
            else ""
        )

        diagram_instructions = (
            "\n다이어그램이 필요한 경우:\n"
            '- "needs_diagram": true\n'
            '- "diagram_type": "flowchart/sequence/class/er/gantt/pie"\n'
            '- "mermaid_code": "유효한 Mermaid 문법 코드"\n'
            '- "diagram_caption": "다이어그램 설명"\n'
            if enable_diagrams
            else ""
        )

        user_prompt = f"""
주제: {topic}
슬라이드 수: {num_slides}
언어: {language}

다음 JSON 형식으로 프레젠테이션을 구성해주세요:
{{
  "title": "전체 프레젠테이션 제목",
  "subtitle": "부제목",
  "slides": [
    {{
      "slide_number": 1,
      "layout_type": "title_slide",
      "title": "슬라이드 제목",
      "subtitle": "부제목 (선택)",
      "content": ["포인트1", "포인트2", "포인트3"],
      "speaker_notes": "발표자 노트 (선택)",

      "image_required": false,
      "image_search_keywords": "",
      "image_style": "{image_style_default}",

      "needs_diagram": false,
      "diagram_type": "",
      "mermaid_code": "",
      "diagram_caption": ""
    }}
  ]
}}

레이아웃 타입:
- title_slide: 표지
- title_and_content: 제목 + 불릿 포인트
- two_column: 2단 구성
- content_with_image: 텍스트 + 이미지
- diagram_slide: 다이어그램 중심 슬라이드
- section_header: 섹션 구분
- conclusion: 결론 슬라이드
{image_instructions}
{diagram_instructions}
""".strip()

        # OpenAI response_format(json_object)은 모델/SDK 버전에 따라 동작이 달라질 수 있어
        # 1차는 엄격 JSON 요청 + 파싱 실패 시 예외를 올려 상위에서 재시도하도록 합니다.
        resp = await self.client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.7,
            max_tokens=4000,
            response_format={"type": "json_object"},
        )

        content = resp.choices[0].message.content or ""
        try:
            data = json.loads(content)
        except Exception as e:
            raise RuntimeError(f"LLM generation failed: invalid JSON ({e})") from e

        # 후처리: 토글 OFF면 관련 메타 제거/기본값으로 정리
        slides = data.get("slides") or []
        if isinstance(slides, list):
            for s in slides:
                if not isinstance(s, dict):
                    continue
                if not enable_images:
                    s["image_required"] = False
                    s["image_search_keywords"] = ""
                    s["image_style"] = image_style_default
                if not enable_diagrams:
                    s["needs_diagram"] = False
                    s["diagram_type"] = ""
                    s["mermaid_code"] = ""
                    s["diagram_caption"] = ""

        return data

    async def generate_image_keywords_for_slide(
        self,
        slide_title: str,
        slide_bullets: list[str],
        language: str = "ko",
    ) -> Dict[str, str]:
        """
        슬라이드 내용 기반으로 이미지 검색 키워드(영문) 생성.
        PRD의 'Keyword Extraction (LLM)' 단계에 해당.
        """
        prompt = f"""
슬라이드 제목: {slide_title}
슬라이드 핵심 포인트: {slide_bullets}
언어: {language}

아래 JSON으로만 답하세요:
{{
  "image_search_keywords": "영문 3~5 단어 키워드",
  "image_style": "professional/modern/minimalist/creative",
  "color_preference": "예: blue, tech"
}}
""".strip()

        resp = await self.client.chat.completions.create(
            model=self.model,
            messages=[{"role": "system", "content": "당신은 프레젠테이션 이미지 큐레이터입니다. JSON만 출력하세요."}, {"role": "user", "content": prompt}],
            temperature=0.4,
            max_tokens=400,
            response_format={"type": "json_object"},
        )
        content = resp.choices[0].message.content or "{}"
        return json.loads(content)

    async def generate_diagram_metadata_for_slide(
        self,
        slide_content: str,
    ) -> Dict[str, Any]:
        """
        슬라이드 내용 기반으로 다이어그램 필요 여부/타입/Mermaid 코드/캡션 생성.
        """
        system_prompt = (
            "당신은 데이터 시각화 전문가입니다.\n"
            "복잡한 프로세스나 관계를 Mermaid 다이어그램으로 표현할 수 있습니다.\n"
            "요청에 맞춰 반드시 JSON만 출력하세요."
        )
        user_prompt = f"""
슬라이드 내용:
{slide_content}

다이어그램이 필요한가요?
필요하다면 다음 형식으로 Mermaid 코드를 제공:
{{
  "needs_diagram": true,
  "diagram_type": "flowchart|sequence|class|er|gantt|pie",
  "mermaid_code": "유효한 Mermaid 문법 코드",
  "diagram_caption": "다이어그램 설명"
}}
필요 없다면:
{{ "needs_diagram": false }}
""".strip()

        resp = await self.client.chat.completions.create(
            model=self.model,
            messages=[{"role": "system", "content": system_prompt}, {"role": "user", "content": user_prompt}],
            temperature=0.4,
            max_tokens=900,
            response_format={"type": "json_object"},
        )
        content = resp.choices[0].message.content or "{}"
        return json.loads(content)

