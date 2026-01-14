import asyncio
import os
from types import SimpleNamespace

import pytest

from app.services.diagram_service import DiagramService


class _FakeProc:
    def __init__(self, returncode=0, stderr=b""):
        self.returncode = returncode
        self._stderr = stderr

    async def communicate(self):
        return (b"", self._stderr)

    def kill(self):
        return None


@pytest.mark.asyncio
async def test_validate_mermaid_syntax():
    svc = DiagramService()
    assert svc.validate_mermaid_syntax("flowchart TD\nA-->B") is True
    assert svc.validate_mermaid_syntax("sequenceDiagram\nA->>B: hi") is True
    assert svc.validate_mermaid_syntax("unknown\nx") is False


@pytest.mark.asyncio
async def test_generate_diagram_builds_file_and_cleans_input(tmp_path, monkeypatch):
    svc = DiagramService()

    # intercept subprocess call
    async def fake_create_subprocess_exec(*cmd, **kwargs):
        # cmd contains output path after "-o"
        out_path = cmd[cmd.index("-o") + 1]
        # create fake output
        with open(out_path, "wb") as f:
            f.write(b"PNGDATA")
        return _FakeProc(returncode=0)

    monkeypatch.setattr(asyncio, "create_subprocess_exec", fake_create_subprocess_exec)

    path = await svc.generate_diagram("flowchart TD\nA-->B", output_format="png")
    assert os.path.exists(path)
    # cleanup output for this test
    os.remove(path)


@pytest.mark.asyncio
async def test_generate_diagram_rejects_bad_background():
    svc = DiagramService()
    with pytest.raises(ValueError):
        await svc.generate_diagram("flowchart TD\nA-->B", background=";rm -rf /")

