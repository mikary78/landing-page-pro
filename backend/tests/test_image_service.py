import pytest
from aioresponses import aioresponses
import re

from app.services.image_service import ImageSearchService


@pytest.mark.asyncio
async def test_search_images_prefers_unsplash_then_pexels(monkeypatch):
    svc = ImageSearchService()
    # set keys for test
    monkeypatch.setattr(svc, "unsplash_api_key", "U_KEY")
    monkeypatch.setattr(svc, "pexels_api_key", "P_KEY")

    with aioresponses() as m:
        m.get(
            re.compile(r"^https://api\.unsplash\.com/search/photos.*"),
            payload={
                "results": [
                    {
                        "urls": {"regular": "u1", "small": "u1s", "full": "u1f"},
                        "links": {"download": "u1d"},
                        "user": {"name": "a", "links": {"html": "au"}},
                        "width": 1600,
                        "height": 900,
                        "alt_description": "alt",
                        "color": "#ffffff",
                    }
                ]
            },
            status=200,
        )
        m.get(
            re.compile(r"^https://api\.pexels\.com/v1/search.*"),
            payload={
                "photos": [
                    {
                        "src": {"large2x": "p1", "medium": "p1m", "original": "p1o"},
                        "photographer": "p",
                        "photographer_url": "pu",
                        "width": 1200,
                        "height": 800,
                        "alt": "alt2",
                    }
                ]
            },
            status=200,
        )

        out = await svc.search_images("ai business", count=2, orientation="landscape")
        assert len(out) == 2
        assert out[0]["source"] == "unsplash"
        assert out[1]["source"] == "pexels"


@pytest.mark.asyncio
async def test_search_images_returns_empty_when_no_keywords():
    svc = ImageSearchService()
    out = await svc.search_images("", count=3)
    assert out == []

