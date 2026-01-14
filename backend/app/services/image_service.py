from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Any, Dict, List, Literal, Optional

import aiohttp

from app.core.config import settings

logger = logging.getLogger(__name__)

Orientation = Literal["landscape", "portrait", "square"]


@dataclass(frozen=True)
class ImageResult:
    url: str
    thumbnail: str
    download_url: str
    author: str
    author_url: str
    source: Literal["unsplash", "pexels"]
    width: int
    height: int
    alt_description: str = ""
    color: str = "#FFFFFF"

    def to_dict(self) -> Dict[str, Any]:
        return {
            "url": self.url,
            "thumbnail": self.thumbnail,
            "download_url": self.download_url,
            "author": self.author,
            "author_url": self.author_url,
            "source": self.source,
            "width": self.width,
            "height": self.height,
            "alt_description": self.alt_description,
            "color": self.color,
        }


class ImageSearchService:
    """
    Feature 4 (PRD v2.0): Intelligent Image Search & Insertion
    - Unsplash → Pexels 순서로 검색 (멀티 소스 fallback)
    - 결과는 attribution(작성자/URL/출처)을 포함
    """

    def __init__(self) -> None:
        self.unsplash_api_key = settings.UNSPLASH_ACCESS_KEY
        self.pexels_api_key = settings.PEXELS_API_KEY
        self._timeout = aiohttp.ClientTimeout(total=settings.HTTP_TIMEOUT_SEC)

    async def search_images(
        self,
        keywords: str,
        count: int = 5,
        orientation: Orientation = "landscape",
        style: str = "professional",
    ) -> List[Dict[str, Any]]:
        """
        Search for images across multiple sources.
        Returns list of image metadata dicts.
        """
        kw = (keywords or "").strip()
        if not kw:
            return []

        count = max(1, min(int(count), 10))
        if orientation not in ("landscape", "portrait", "square"):
            orientation = "landscape"

        logger.info("Image search: keywords=%r count=%s orientation=%s style=%s", kw, count, orientation, style)

        results: List[ImageResult] = []

        # Unsplash first
        if self.unsplash_api_key:
            try:
                u = await self._search_unsplash(kw, count=count, orientation=orientation)
                results.extend(u)
                logger.info("Unsplash results=%d", len(u))
            except Exception as e:
                logger.warning("Unsplash search failed: %s", e)
        else:
            logger.info("Unsplash key missing; skipping Unsplash.")

        # Pexels fallback
        if len(results) < count and self.pexels_api_key:
            try:
                remaining = count - len(results)
                p = await self._search_pexels(kw, count=remaining, orientation=orientation)
                results.extend(p)
                logger.info("Pexels results=%d", len(p))
            except Exception as e:
                logger.warning("Pexels search failed: %s", e)
        elif not self.pexels_api_key:
            logger.info("Pexels key missing; skipping Pexels.")

        # PRD: relevance scoring hook (MVP에서는 단순히 반환, 확장 포인트만 제공)
        # results.sort(key=lambda r: self.score_image_relevance(r, kw, ""), reverse=True)

        return [r.to_dict() for r in results[:count]]

    async def _search_unsplash(self, keywords: str, count: int, orientation: Orientation) -> List[ImageResult]:
        """
        Unsplash Search API
        - Docs: https://unsplash.com/documentation#search-photos
        """
        url = "https://api.unsplash.com/search/photos"
        params = {"query": keywords, "per_page": min(count, 30), "orientation": orientation}
        headers = {"Authorization": f"Client-ID {self.unsplash_api_key}"}

        async with aiohttp.ClientSession(timeout=self._timeout) as session:
            async with session.get(url, params=params, headers=headers) as resp:
                if resp.status != 200:
                    text = await resp.text()
                    raise RuntimeError(f"Unsplash API error: status={resp.status} body={text[:300]}")
                data = await resp.json()

        out: List[ImageResult] = []
        for img in data.get("results", []) or []:
            try:
                out.append(
                    ImageResult(
                        url=img["urls"]["regular"],
                        thumbnail=img["urls"]["small"],
                        download_url=img["urls"].get("full") or img["links"]["download"],
                        author=img["user"]["name"],
                        author_url=img["user"]["links"]["html"],
                        source="unsplash",
                        width=int(img.get("width") or 0),
                        height=int(img.get("height") or 0),
                        alt_description=img.get("alt_description") or "",
                        color=img.get("color") or "#FFFFFF",
                    )
                )
            except Exception:
                continue
        return out

    async def _search_pexels(self, keywords: str, count: int, orientation: Orientation) -> List[ImageResult]:
        """
        Pexels Search API
        - Docs: https://www.pexels.com/api/documentation/#photos-search
        """
        url = "https://api.pexels.com/v1/search"
        headers = {"Authorization": self.pexels_api_key}
        params = {"query": keywords, "per_page": min(count, 80), "orientation": orientation}

        async with aiohttp.ClientSession(timeout=self._timeout) as session:
            async with session.get(url, params=params, headers=headers) as resp:
                if resp.status != 200:
                    text = await resp.text()
                    raise RuntimeError(f"Pexels API error: status={resp.status} body={text[:300]}")
                data = await resp.json()

        out: List[ImageResult] = []
        for img in data.get("photos", []) or []:
            src = img.get("src") or {}
            try:
                out.append(
                    ImageResult(
                        url=src.get("large2x") or src.get("large") or src.get("original"),
                        thumbnail=src.get("medium") or src.get("small") or src.get("tiny") or "",
                        download_url=src.get("original") or src.get("large2x") or "",
                        author=img.get("photographer") or "",
                        author_url=img.get("photographer_url") or "",
                        source="pexels",
                        width=int(img.get("width") or 0),
                        height=int(img.get("height") or 0),
                        alt_description=img.get("alt") or "",
                        color="#FFFFFF",
                    )
                )
            except Exception:
                continue
        return out

    async def download_image(self, image_url: str, save_path: str) -> str:
        """
        Download image from URL to local path.
        """
        url = (image_url or "").strip()
        if not url:
            raise ValueError("image_url is required")

        async with aiohttp.ClientSession(timeout=self._timeout) as session:
            async with session.get(url) as resp:
                if resp.status != 200:
                    raise RuntimeError(f"Failed to download image: status={resp.status}")
                content = await resp.read()

        with open(save_path, "wb") as f:
            f.write(content)
        return save_path

    def score_image_relevance(self, image: ImageResult, keywords: str, slide_content: str) -> int:
        """
        PRD v2.0: Relevance scoring hook (0~100).
        MVP에서는 간단한 휴리스틱만 제공하고, 추후 확장 가능하도록 분리합니다.
        """
        score = 50
        kw = (keywords or "").lower()
        alt = (image.alt_description or "").lower()
        if kw and alt and any(w in alt for w in kw.split()):
            score += 20
        if image.width and image.height and image.width >= 1200:
            score += 10
        return max(0, min(score, 100))

