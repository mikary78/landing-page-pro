from __future__ import annotations

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    PRD v2.0 기준 서비스 설정.
    - 외부 API Key는 코드/레포에 하드코딩하지 않고 환경변수로만 주입합니다.
    """

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # LLM
    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-4o-mini"  # 비용/속도 기본값(필요시 변경)

    # Image search
    UNSPLASH_ACCESS_KEY: str = ""
    PEXELS_API_KEY: str = ""

    # Mermaid CLI (mmdc)
    MERMAID_CLI_PATH: str = "mmdc"
    MERMAID_RENDER_TIMEOUT_SEC: int = 25

    # Networking
    HTTP_TIMEOUT_SEC: int = 15


settings = Settings()

