from __future__ import annotations

import asyncio
import os
import re
import tempfile
from dataclasses import dataclass
from pathlib import Path
from typing import Literal, Optional

from app.core.config import settings

DiagramFormat = Literal["png", "svg"]
DiagramTheme = Literal["default", "forest", "dark", "neutral"]


@dataclass(frozen=True)
class DiagramResult:
    output_path: str
    format: DiagramFormat
    theme: DiagramTheme


class DiagramService:
    """
    Feature 5 (PRD v2.0): AI Diagram Generation
    - LLM이 생성한 Mermaid 코드를 mermaid-cli(mmdc)로 렌더링
    - 결과를 PNG/SVG로 반환(경로/바이트)
    """

    def __init__(self) -> None:
        self.mermaid_cli_path = settings.MERMAID_CLI_PATH or "mmdc"
        self.timeout_sec = int(settings.MERMAID_RENDER_TIMEOUT_SEC)

    def validate_mermaid_syntax(self, mermaid_code: str) -> bool:
        """
        PRD 예시 수준의 기본 검증:
        - 첫 라인이 Mermaid 타입 키워드로 시작해야 함
        """
        code = (mermaid_code or "").strip()
        if not code:
            return False

        first = code.splitlines()[0].strip()
        valid_starts = (
            "flowchart",
            "graph",
            "sequenceDiagram",
            "classDiagram",
            "erDiagram",
            "gantt",
            "pie",
        )
        return any(first.startswith(s) for s in valid_starts)

    async def generate_diagram(
        self,
        mermaid_code: str,
        output_format: DiagramFormat = "png",
        theme: DiagramTheme = "default",
        background: str = "transparent",
        width: int = 1920,
        height: int = 1080,
    ) -> str:
        """
        Mermaid code → image 파일 생성 후 경로 반환

        - Mermaid CLI docs: https://github.com/mermaid-js/mermaid-cli
        """
        code = (mermaid_code or "").strip()
        if not self.validate_mermaid_syntax(code):
            raise ValueError("Invalid Mermaid syntax (unsupported or empty)")

        if output_format not in ("png", "svg"):
            raise ValueError("output_format must be 'png' or 'svg'")

        if theme not in ("default", "forest", "dark", "neutral"):
            theme = "default"  # fallback

        # background: transparent or css color (e.g. '#ffffff')
        if background != "transparent" and not re.match(r"^#?[0-9a-fA-F]{6}$", background):
            # fail-closed to avoid CLI injection vectors via weird strings
            raise ValueError("background must be 'transparent' or hex color like '#ffffff'")

        mmd_path: Optional[str] = None
        out_path: Optional[str] = None
        try:
            with tempfile.NamedTemporaryFile(mode="w", suffix=".mmd", delete=False, encoding="utf-8") as f:
                f.write(code)
                mmd_path = f.name

            out_path = f"{mmd_path}.{output_format}"

            cmd = [
                self.mermaid_cli_path,
                "-i",
                mmd_path,
                "-o",
                out_path,
                "-t",
                theme,
                "-b",
                background,
                "-w",
                str(int(width)),
                "-H",
                str(int(height)),
            ]

            proc = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )

            try:
                stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=self.timeout_sec)
            except asyncio.TimeoutError:
                proc.kill()
                raise RuntimeError(f"Mermaid CLI timed out after {self.timeout_sec}s")

            if proc.returncode != 0:
                raise RuntimeError(f"Mermaid CLI error: {stderr.decode(errors='ignore')[:800]}")

            if not out_path or not os.path.exists(out_path):
                raise RuntimeError("Diagram generation failed: output file not found")

            return out_path
        finally:
            # 항상 입력 mmd 파일은 제거
            if mmd_path and os.path.exists(mmd_path):
                try:
                    os.remove(mmd_path)
                except Exception:
                    pass

    async def generate_diagram_bytes(
        self,
        mermaid_code: str,
        output_format: DiagramFormat = "png",
        theme: DiagramTheme = "default",
        background: str = "transparent",
    ) -> bytes:
        """
        Mermaid code → image bytes 반환 (임시파일은 자동 정리)
        """
        path = await self.generate_diagram(
            mermaid_code=mermaid_code,
            output_format=output_format,
            theme=theme,
            background=background,
        )
        try:
            return Path(path).read_bytes()
        finally:
            try:
                os.remove(path)
            except Exception:
                pass

