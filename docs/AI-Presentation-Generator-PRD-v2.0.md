# AI Presentation Generator - Product Requirements Document

**Version:** 2.0.0  
**Last Updated:** 2026-01-14  
**Project Type:** Full-Stack Web Application  
**Target:** MVP Development for AI-Powered PowerPoint Generation Service

**New in v2.0:**
- ✨ **Intelligent Image Search**: Automatic contextual image insertion
- 📊 **AI Diagram Generation**: Automated flowchart and diagram creation

---

## 📋 Table of Contents

1. [Project Overview](#project-overview)
2. [Technical Stack](#technical-stack)
3. [Project Structure](#project-structure)
4. [Core Features](#core-features)
5. [NEW: Advanced Features](#advanced-features)
6. [API Specifications](#api-specifications)
7. [Database Schema](#database-schema)
8. [Implementation Phases](#implementation-phases)
9. [Code Standards](#code-standards)
10. [Environment Configuration](#environment-configuration)

---

## 🎯 Project Overview

### Goal
사용자가 주제만 입력하면 AI가 자동으로 전문적인 PowerPoint 프레젠테이션을 생성하는 웹 서비스 개발

### Key Features
- 주제 기반 자동 슬라이드 생성 (LLM 활용)
- **🆕 자동 이미지 검색 및 삽입** (Unsplash/Pexels API)
- **🆕 AI 다이어그램 생성** (Mermaid 문법 자동 생성)
- 다양한 레이아웃 템플릿 지원
- PPTX 파일 다운로드
- 실시간 생성 진행률 표시
- 비동기 작업 처리 (Celery)

### Success Metrics
- 생성 시간: 평균 45-90초 (이미지/다이어그램 포함 시)
- 성공률: 95% 이상
- 이미지 관련성: 90% 이상
- 사용자 만족도: 4.0/5.0 이상

---

## 🛠 Technical Stack

### Backend
```yaml
Language: Python 3.11+
Framework: FastAPI 0.109+
LLM: OpenAI GPT-4 Turbo
Presentation: python-pptx 0.6.23
Image APIs: Unsplash API, Pexels API
Diagram: Mermaid.js + Puppeteer (or mermaid-cli)
Database: PostgreSQL 15
Cache: Redis 7
Task Queue: Celery 5.3
Storage: AWS S3 (or compatible)
```

### Frontend
```yaml
Framework: React 18 + TypeScript
Build Tool: Vite 5
Styling: Tailwind CSS 3
State: Zustand or React Query
HTTP Client: Axios
```

### DevOps
```yaml
Containerization: Docker + Docker Compose
Deployment: Railway / AWS ECS
CI/CD: GitHub Actions
Monitoring: Sentry (optional)
```

---

## 📁 Project Structure

### Directory Layout
```
ai-presentation-generator/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                 # FastAPI app entry point
│   │   ├── api/
│   │   │   ├── __init__.py
│   │   │   ├── routes/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── presentations.py  # Presentation endpoints
│   │   │   │   └── health.py         # Health check
│   │   │   └── dependencies.py       # Shared dependencies
│   │   ├── core/
│   │   │   ├── __init__.py
│   │   │   ├── config.py            # Settings management
│   │   │   ├── database.py          # DB connection
│   │   │   └── security.py          # Auth (future)
│   │   ├── services/
│   │   │   ├── __init__.py
│   │   │   ├── llm_service.py       # OpenAI integration
│   │   │   ├── pptx_service.py      # PPTX generation
│   │   │   ├── image_service.py     # 🆕 Image search (Unsplash/Pexels)
│   │   │   ├── diagram_service.py   # 🆕 Mermaid diagram generation
│   │   │   └── storage_service.py   # S3 file handling
│   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   └── presentation.py      # SQLAlchemy models
│   │   ├── schemas/
│   │   │   ├── __init__.py
│   │   │   └── presentation.py      # Pydantic schemas
│   │   ├── tasks/
│   │   │   ├── __init__.py
│   │   │   └── celery_tasks.py      # Background tasks
│   │   └── utils/
│   │       ├── __init__.py
│   │       ├── helpers.py
│   │       └── mermaid_renderer.py  # 🆕 Mermaid to image converter
│   ├── templates/
│   │   ├── default.pptx             # Default template
│   │   ├── modern.pptx
│   │   └── minimal.pptx
│   ├── tests/
│   │   ├── __init__.py
│   │   ├── test_api.py
│   │   ├── test_services.py
│   │   ├── test_image_service.py    # 🆕
│   │   └── test_diagram_service.py  # 🆕
│   ├── alembic/                     # DB migrations
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env.example
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── PresentationForm.tsx
│   │   │   ├── ProgressBar.tsx
│   │   │   ├── DownloadButton.tsx
│   │   │   ├── TemplateSelector.tsx
│   │   │   ├── ImageToggle.tsx      # 🆕 Enable/disable auto images
│   │   │   └── DiagramToggle.tsx    # 🆕 Enable/disable auto diagrams
│   │   ├── pages/
│   │   │   ├── Home.tsx
│   │   │   └── NotFound.tsx
│   │   ├── services/
│   │   │   └── api.ts              # API client
│   │   ├── types/
│   │   │   └── presentation.ts     # TypeScript types
│   │   ├── utils/
│   │   │   └── helpers.ts
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── index.css
│   ├── public/
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   └── Dockerfile
│
├── docker-compose.yml
├── .gitignore
└── README.md
```

---

## 🎯 Core Features

### Feature 1: Presentation Generation

**Description:** 사용자가 주제와 슬라이드 수를 입력하면 AI가 자동으로 프레젠테이션 생성

**User Flow:**
```
1. 사용자가 주제 입력 (예: "AI 기술의 비즈니스 활용")
2. 슬라이드 수 선택 (3-15장)
3. 템플릿 선택 (optional)
4. 🆕 자동 이미지 삽입 옵션 선택
5. 🆕 자동 다이어그램 생성 옵션 선택
6. "생성하기" 버튼 클릭
7. 백그라운드에서 생성 시작
8. 실시간 진행률 표시 (0% → 100%)
9. 생성 완료 후 다운로드 버튼 표시
```

**Technical Requirements:**
- LLM이 슬라이드 구조를 JSON 형식으로 생성
- 각 슬라이드는 레이아웃 타입 지정 필요
- 🆕 LLM이 각 슬라이드에 적합한 이미지 검색 키워드 생성
- 🆕 LLM이 필요한 경우 Mermaid 다이어그램 코드 생성
- 생성 작업은 Celery로 비동기 처리
- 진행 상태는 Redis에 저장
- 완성된 파일은 S3에 업로드

**Acceptance Criteria:**
- [ ] 주제 입력 시 30초 이내 생성 시작
- [ ] 진행률이 실시간으로 업데이트
- [ ] 생성된 PPTX 파일이 정상 다운로드
- [ ] 🆕 이미지가 슬라이드 내용과 90% 이상 관련성 있음
- [ ] 🆕 다이어그램이 올바르게 렌더링됨
- [ ] 에러 발생 시 명확한 메시지 표시

---

### Feature 2: Template System

**Description:** 사용자가 다양한 템플릿 중 선택 가능

**Template Types:**
```yaml
default:
  name: "Modern Professional"
  description: "깔끔하고 전문적인 비즈니스 템플릿"
  colors:
    primary: "#2563EB"
    secondary: "#64748B"
  layouts: [title_slide, title_and_content, two_column, content_with_image, diagram_slide]

minimal:
  name: "Minimal Clean"
  description: "미니멀한 디자인"
  colors:
    primary: "#000000"
    secondary: "#F3F4F6"

creative:
  name: "Creative Bold"
  description: "창의적이고 대담한 디자인"
  colors:
    primary: "#DC2626"
    secondary: "#FCD34D"
```

---

### Feature 3: Progress Tracking

**Description:** 생성 과정의 각 단계를 실시간으로 표시

**Stages:**
```yaml
Stage 1:
  name: "컨텐츠 생성 중"
  progress: 0-30%
  action: LLM이 슬라이드 구조 생성

Stage 2:
  name: "🆕 이미지 검색 중"
  progress: 30-50%
  action: Unsplash/Pexels에서 관련 이미지 검색

Stage 3:
  name: "🆕 다이어그램 생성 중"
  progress: 50-65%
  action: Mermaid 코드를 이미지로 렌더링

Stage 4:
  name: "슬라이드 디자인 중"
  progress: 65-85%
  action: python-pptx로 PPTX 파일 생성

Stage 5:
  name: "파일 업로드 중"
  progress: 85-95%
  action: S3에 파일 업로드

Stage 6:
  name: "완료"
  progress: 100%
  action: 다운로드 준비 완료
```

---

## 🆕 Advanced Features

### Feature 4: Intelligent Image Search & Insertion

**Description:** 슬라이드 내용을 분석하여 관련성 높은 이미지를 자동으로 검색하고 삽입

**How It Works:**

1. **Keyword Extraction (LLM)**
   ```python
   # LLM generates image search keywords for each slide
   {
     "slide_2": {
       "image_keywords": "artificial intelligence business meeting",
       "image_style": "professional, modern",
       "color_preference": "blue, tech"
     }
   }
   ```

2. **Multi-Source Search**
   - Unsplash API (고품질, 무료)
   - Pexels API (다양한 옵션)
   - Fallback to placeholder if no suitable image found

3. **Relevance Scoring**
   ```python
   def score_image_relevance(image, keywords, slide_content):
       # Check image tags, description, color palette
       # Return relevance score 0-100
   ```

4. **Smart Placement**
   - Automatically resize images to fit slide layout
   - Apply professional formatting (rounded corners, shadows)
   - Maintain aspect ratio

**Technical Implementation:**

```python
# backend/app/services/image_service.py
import aiohttp
from typing import List, Dict, Optional
from app.core.config import settings

class ImageSearchService:
    def __init__(self):
        self.unsplash_api_key = settings.UNSPLASH_ACCESS_KEY
        self.pexels_api_key = settings.PEXELS_API_KEY
        self.session = None
    
    async def search_images(
        self,
        keywords: str,
        count: int = 5,
        orientation: str = "landscape"
    ) -> List[Dict]:
        """
        Search for images across multiple sources
        
        Args:
            keywords: Search keywords
            count: Number of results
            orientation: Image orientation (landscape/portrait/square)
        
        Returns:
            List of image metadata with URLs
        """
        results = []
        
        # Try Unsplash first (higher quality)
        unsplash_results = await self._search_unsplash(keywords, count, orientation)
        results.extend(unsplash_results)
        
        # Fallback to Pexels if needed
        if len(results) < count:
            remaining = count - len(results)
            pexels_results = await self._search_pexels(keywords, remaining, orientation)
            results.extend(pexels_results)
        
        return results[:count]
    
    async def _search_unsplash(
        self,
        keywords: str,
        count: int,
        orientation: str
    ) -> List[Dict]:
        """Search Unsplash API"""
        url = "https://api.unsplash.com/search/photos"
        params = {
            "query": keywords,
            "per_page": count,
            "orientation": orientation,
            "client_id": self.unsplash_api_key
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.get(url, params=params) as response:
                if response.status == 200:
                    data = await response.json()
                    return [
                        {
                            "url": img["urls"]["regular"],
                            "thumbnail": img["urls"]["small"],
                            "download_url": img["links"]["download"],
                            "author": img["user"]["name"],
                            "author_url": img["user"]["links"]["html"],
                            "source": "unsplash",
                            "width": img["width"],
                            "height": img["height"],
                            "alt_description": img.get("alt_description", "")
                        }
                        for img in data.get("results", [])
                    ]
                return []
    
    async def _search_pexels(
        self,
        keywords: str,
        count: int,
        orientation: str
    ) -> List[Dict]:
        """Search Pexels API"""
        url = "https://api.pexels.com/v1/search"
        headers = {"Authorization": self.pexels_api_key}
        params = {
            "query": keywords,
            "per_page": count,
            "orientation": orientation
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.get(url, params=params, headers=headers) as response:
                if response.status == 200:
                    data = await response.json()
                    return [
                        {
                            "url": img["src"]["large"],
                            "thumbnail": img["src"]["medium"],
                            "download_url": img["src"]["original"],
                            "author": img["photographer"],
                            "author_url": img["photographer_url"],
                            "source": "pexels",
                            "width": img["width"],
                            "height": img["height"],
                            "alt_description": img.get("alt", "")
                        }
                        for img in data.get("photos", [])
                    ]
                return []
    
    async def download_image(self, image_url: str, save_path: str) -> str:
        """Download image from URL"""
        async with aiohttp.ClientSession() as session:
            async with session.get(image_url) as response:
                if response.status == 200:
                    content = await response.read()
                    with open(save_path, 'wb') as f:
                        f.write(content)
                    return save_path
                raise Exception(f"Failed to download image: {response.status}")
```

**Usage in LLM Prompt:**

```python
# Enhanced LLM prompt to include image keywords
user_prompt = f"""
주제: {topic}
슬라이드 수: {num_slides}

각 슬라이드에 대해 다음 정보를 JSON으로 제공:
{{
  "slides": [
    {{
      "slide_number": 2,
      "layout_type": "content_with_image",
      "title": "슬라이드 제목",
      "content": ["포인트1", "포인트2"],
      "image_search_keywords": "구체적인 이미지 검색 키워드 (영문)",
      "image_required": true
    }}
  ]
}}

이미지 검색 키워드는:
- 구체적이고 시각적인 용어 사용
- 3-5 단어 조합
- 영문으로 작성
- 슬라이드 내용과 직접 관련
"""
```

---

### Feature 5: AI Diagram Generation

**Description:** 프로세스, 플로우차트, 관계도 등을 자동으로 생성

**Supported Diagram Types:**

```yaml
Flowchart:
  use_case: "프로세스, 워크플로우, 의사결정 트리"
  mermaid_type: "flowchart TD"

Sequence Diagram:
  use_case: "시스템 간 상호작용, API 흐름"
  mermaid_type: "sequenceDiagram"

Class Diagram:
  use_case: "시스템 아키텍처, 데이터 모델"
  mermaid_type: "classDiagram"

Entity Relationship:
  use_case: "데이터베이스 구조"
  mermaid_type: "erDiagram"

Gantt Chart:
  use_case: "프로젝트 일정, 타임라인"
  mermaid_type: "gantt"

Pie Chart:
  use_case: "비율, 분포"
  mermaid_type: "pie"
```

**How It Works:**

1. **LLM Generates Mermaid Code**
   ```mermaid
   flowchart TD
       A[Start] --> B{Decision}
       B -->|Yes| C[Action 1]
       B -->|No| D[Action 2]
       C --> E[End]
       D --> E
   ```

2. **Render to Image**
   - Use `mermaid-cli` or Puppeteer
   - Generate PNG/SVG with transparent background
   - Optimize size for PowerPoint

3. **Insert into Slide**
   - Center diagram on slide
   - Add caption if needed
   - Maintain readability

**Technical Implementation:**

```python
# backend/app/services/diagram_service.py
import asyncio
import os
import tempfile
from typing import Optional
from app.core.config import settings

class DiagramService:
    def __init__(self):
        self.mermaid_cli_path = "mmdc"  # mermaid-cli command
    
    async def generate_diagram(
        self,
        mermaid_code: str,
        output_format: str = "png",
        theme: str = "default",
        background: str = "transparent"
    ) -> str:
        """
        Generate diagram image from Mermaid code
        
        Args:
            mermaid_code: Mermaid diagram syntax
            output_format: png or svg
            theme: default, forest, dark, neutral
            background: transparent or color hex
        
        Returns:
            Path to generated diagram image
        """
        
        # Create temp files
        with tempfile.NamedTemporaryFile(mode='w', suffix='.mmd', delete=False) as mmd_file:
            mmd_file.write(mermaid_code)
            mmd_path = mmd_file.name
        
        output_path = f"{mmd_path}.{output_format}"
        
        # Run mermaid-cli
        cmd = [
            self.mermaid_cli_path,
            "-i", mmd_path,
            "-o", output_path,
            "-t", theme,
            "-b", background,
            "-w", "1920",  # Width
            "-H", "1080"   # Height
        ]
        
        try:
            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            
            stdout, stderr = await process.communicate()
            
            if process.returncode != 0:
                raise Exception(f"Mermaid CLI error: {stderr.decode()}")
            
            # Clean up temp mermaid file
            os.remove(mmd_path)
            
            return output_path
            
        except Exception as e:
            # Clean up on error
            if os.path.exists(mmd_path):
                os.remove(mmd_path)
            raise Exception(f"Diagram generation failed: {str(e)}")
    
    def validate_mermaid_syntax(self, mermaid_code: str) -> bool:
        """Validate Mermaid syntax"""
        # Basic validation
        valid_starts = [
            "flowchart", "graph", "sequenceDiagram",
            "classDiagram", "erDiagram", "gantt", "pie"
        ]
        
        first_line = mermaid_code.strip().split('\n')[0].strip()
        return any(first_line.startswith(start) for start in valid_starts)
    
    async def optimize_diagram_for_pptx(self, image_path: str) -> str:
        """Optimize diagram image for PowerPoint"""
        # Could add image optimization here
        # - Compress file size
        # - Ensure proper DPI
        # - Add padding/margin
        return image_path
```

**LLM Prompt for Diagram Generation:**

```python
# When LLM detects need for visualization
system_prompt = """당신은 데이터 시각화 전문가입니다.
복잡한 프로세스나 관계를 Mermaid 다이어그램으로 표현할 수 있습니다.

다이어그램이 필요한 경우를 판단하고, 적절한 Mermaid 코드를 생성하세요."""

user_prompt = f"""
슬라이드 내용: {slide_content}

이 슬라이드에 다이어그램이 필요한가요?
필요하다면 다음 형식으로 Mermaid 코드를 제공:

{{
  "needs_diagram": true,
  "diagram_type": "flowchart",
  "mermaid_code": "flowchart TD\\n    A[Start] --> B[Process]",
  "diagram_caption": "프로세스 흐름도"
}}
"""
```

**Integration with PPTX Service:**

```python
# backend/app/services/pptx_service.py (enhanced)
from app.services.diagram_service import DiagramService

class PPTXService:
    def __init__(self):
        self.diagram_service = DiagramService()
        # ... existing code
    
    async def _handle_diagram_slide(self, slide, slide_data: Dict):
        """Handle slide with diagram"""
        
        # Generate diagram if mermaid code provided
        if "mermaid_code" in slide_data:
            diagram_path = await self.diagram_service.generate_diagram(
                slide_data["mermaid_code"],
                output_format="png",
                theme="default"
            )
            
            # Insert diagram into slide
            left = Inches(1)
            top = Inches(2)
            pic = slide.shapes.add_picture(
                diagram_path,
                left,
                top,
                width=Inches(8)
            )
            
            # Add caption if provided
            if "diagram_caption" in slide_data:
                caption_box = slide.shapes.add_textbox(
                    Inches(1),
                    Inches(6.5),
                    Inches(8),
                    Inches(0.5)
                )
                caption_box.text = slide_data["diagram_caption"]
            
            # Clean up temp file
            os.remove(diagram_path)
```

---

## 🔌 API Specifications

### Base URL
```
Development: http://localhost:8000/api
Production: https://your-domain.com/api
```

### Endpoints

#### 1. Generate Presentation (Enhanced)
```http
POST /api/presentations/generate
Content-Type: application/json

Request Body:
{
  "topic": "AI 기술의 비즈니스 활용",
  "num_slides": 7,
  "template": "default",
  "language": "ko",
  "enable_images": true,           // 🆕 Auto image insertion
  "enable_diagrams": true,         // 🆕 Auto diagram generation
  "image_style": "professional"    // 🆕 Image style preference
}

Response (202 Accepted):
{
  "job_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "processing",
  "message": "프레젠테이션 생성이 시작되었습니다.",
  "estimated_time": 60              // 🆕 Estimated completion time (seconds)
}

Error (400 Bad Request):
{
  "detail": "주제는 3자 이상이어야 합니다."
}
```

#### 2. Get Generation Status (Enhanced)
```http
GET /api/presentations/status/{job_id}

Response (200 OK):
{
  "job_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "processing",
  "progress": 45,
  "current_stage": "이미지 검색 중",
  "substatus": "Unsplash에서 3/5 이미지 검색 완료",  // 🆕
  "file_url": null,
  "error": null,
  "metadata": {                                    // 🆕
    "images_found": 3,
    "diagrams_generated": 1,
    "total_slides": 7
  },
  "created_at": "2026-01-14T10:30:00Z",
  "updated_at": "2026-01-14T10:30:45Z"
}

Response (200 OK - Completed):
{
  "job_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "completed",
  "progress": 100,
  "current_stage": "완료",
  "file_url": "https://s3.amazonaws.com/bucket/presentations/550e8400.pptx",
  "error": null,
  "metadata": {
    "images_found": 5,
    "diagrams_generated": 2,
    "total_slides": 7,
    "file_size_mb": 3.2
  },
  "created_at": "2026-01-14T10:30:00Z",
  "updated_at": "2026-01-14T10:31:20Z"
}
```

#### 3. Download Presentation
```http
GET /api/presentations/download/{job_id}

Response (200 OK):
{
  "download_url": "https://s3.amazonaws.com/bucket/presentations/550e8400.pptx?signature=...",
  "expires_in": 3600,
  "file_size_bytes": 3355443,        // 🆕
  "attribution": [                    // 🆕 Image attribution info
    {
      "source": "unsplash",
      "photographer": "John Doe",
      "photographer_url": "https://unsplash.com/@johndoe"
    }
  ]
}

Error (404 Not Found):
{
  "detail": "파일이 준비되지 않았습니다."
}
```

#### 4. Health Check
```http
GET /api/health

Response (200 OK):
{
  "status": "healthy",
  "timestamp": "2026-01-14T10:30:00Z",
  "services": {
    "database": "connected",
    "redis": "connected",
    "openai": "available",
    "unsplash_api": "available",     // 🆕
    "pexels_api": "available",       // 🆕
    "mermaid_cli": "available"       // 🆕
  }
}
```

---

## 🗄 Database Schema

### Table: presentation_jobs (Enhanced)

```sql
CREATE TABLE presentation_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    topic VARCHAR(500) NOT NULL,
    num_slides INTEGER NOT NULL CHECK (num_slides BETWEEN 3 AND 20),
    template VARCHAR(50) DEFAULT 'default',
    language VARCHAR(10) DEFAULT 'ko',
    
    -- 🆕 New options
    enable_images BOOLEAN DEFAULT TRUE,
    enable_diagrams BOOLEAN DEFAULT TRUE,
    image_style VARCHAR(50) DEFAULT 'professional',
    
    -- Status tracking
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    progress INTEGER DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
    current_stage VARCHAR(100),
    substatus VARCHAR(255),  -- 🆕 Detailed status
    
    -- Results
    file_url TEXT,
    file_size_bytes INTEGER,
    
    -- 🆕 Generation metadata
    images_found INTEGER DEFAULT 0,
    diagrams_generated INTEGER DEFAULT 0,
    generation_metadata JSONB,  -- Flexible metadata storage
    
    -- Error handling
    error TEXT,
    retry_count INTEGER DEFAULT 0,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    
    -- Indexing
    INDEX idx_status (status),
    INDEX idx_created_at (created_at DESC),
    INDEX idx_enable_images (enable_images),
    INDEX idx_enable_diagrams (enable_diagrams)
);

-- Status values: pending, processing, completed, failed
```

### Table: slide_images (New)

```sql
CREATE TABLE slide_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES presentation_jobs(id) ON DELETE CASCADE,
    slide_number INTEGER NOT NULL,
    
    -- Image source info
    image_url TEXT NOT NULL,
    thumbnail_url TEXT,
    download_url TEXT,
    source VARCHAR(50) NOT NULL,  -- unsplash, pexels, custom
    
    -- Attribution
    author VARCHAR(255),
    author_url TEXT,
    
    -- Search metadata
    search_keywords VARCHAR(500),
    relevance_score DECIMAL(3,2),  -- 0.00-1.00
    
    -- Image properties
    width INTEGER,
    height INTEGER,
    alt_description TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_job_id (job_id),
    INDEX idx_source (source)
);
```

### Table: slide_diagrams (New)

```sql
CREATE TABLE slide_diagrams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES presentation_jobs(id) ON DELETE CASCADE,
    slide_number INTEGER NOT NULL,
    
    -- Diagram info
    diagram_type VARCHAR(50) NOT NULL,  -- flowchart, sequence, class, etc.
    mermaid_code TEXT NOT NULL,
    diagram_caption VARCHAR(500),
    
    -- Generated image
    image_path TEXT,
    image_format VARCHAR(10) DEFAULT 'png',
    
    -- Metadata
    render_time_ms INTEGER,
    file_size_bytes INTEGER,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_job_id (job_id),
    INDEX idx_diagram_type (diagram_type)
);
```

### Table: templates (Existing)

```sql
CREATE TABLE templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    file_path VARCHAR(255) NOT NULL,
    preview_image_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    supports_images BOOLEAN DEFAULT TRUE,     -- 🆕
    supports_diagrams BOOLEAN DEFAULT TRUE,   -- 🆕
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 🚀 Implementation Phases

### Phase 1: Backend Core (Week 1-2)

**Tasks:**
```yaml
Setup:
  - [ ] Initialize FastAPI project
  - [ ] Configure PostgreSQL connection
  - [ ] Setup Redis for caching
  - [ ] Configure environment variables
  - [ ] 🆕 Setup Unsplash/Pexels API keys
  - [ ] 🆕 Install mermaid-cli (npm install -g @mermaid-js/mermaid-cli)

LLM Service:
  - [ ] Implement OpenAI API client
  - [ ] Create prompt templates
  - [ ] Add JSON parsing logic
  - [ ] 🆕 Enhance prompts for image keywords
  - [ ] 🆕 Add diagram detection logic
  - [ ] Implement error handling

🆕 Image Service:
  - [ ] Implement Unsplash API client
  - [ ] Implement Pexels API client
  - [ ] Add image relevance scoring
  - [ ] Add image download functionality
  - [ ] Implement attribution tracking

🆕 Diagram Service:
  - [ ] Setup Mermaid CLI wrapper
  - [ ] Implement diagram generation
  - [ ] Add syntax validation
  - [ ] Add diagram optimization

PPTX Service:
  - [ ] Setup python-pptx
  - [ ] Implement layout mapping
  - [ ] Create slide generation functions
  - [ ] 🆕 Add image insertion logic
  - [ ] 🆕 Add diagram insertion logic
  - [ ] Add template loading

API Routes:
  - [ ] POST /generate endpoint (enhanced)
  - [ ] GET /status/:id endpoint (enhanced)
  - [ ] GET /download/:id endpoint
  - [ ] GET /health endpoint (enhanced)
```

**Code Example - Enhanced LLM Service:**
```python
# backend/app/services/llm_service.py
from openai import AsyncOpenAI
import json
from typing import Dict
from app.core.config import settings

class LLMService:
    def __init__(self):
        self.client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
    
    async def generate_presentation_outline(
        self,
        topic: str,
        num_slides: int,
        language: str = "ko",
        enable_images: bool = True,
        enable_diagrams: bool = True
    ) -> Dict:
        """
        Generate presentation outline with image and diagram metadata
        
        Args:
            topic: Presentation topic
            num_slides: Number of slides to generate
            language: Content language
            enable_images: Whether to include image search keywords
            enable_diagrams: Whether to include diagram suggestions
        
        Returns:
            Dict with structured presentation data including image/diagram metadata
        """
        
        system_prompt = """당신은 전문 프레젠테이션 디자이너입니다.
주제를 받아서 논리적이고 설득력 있는 슬라이드 구조를 만듭니다.
각 슬라이드는 명확한 메시지와 3-5개의 핵심 포인트를 가져야 합니다.

시각적 요소 가이드라인:
- 이미지: 슬라이드 내용과 직접 관련된 구체적 검색어 제공
- 다이어그램: 프로세스, 관계, 구조를 시각화할 필요가 있는 경우 Mermaid 코드 생성"""

        image_instructions = """
이미지가 필요한 슬라이드의 경우:
- "image_required": true
- "image_search_keywords": "구체적인 영문 검색어 (3-5 단어)"
- "image_style": "professional/modern/minimalist/creative"
""" if enable_images else ""

        diagram_instructions = """
다이어그램이 필요한 경우:
- "needs_diagram": true
- "diagram_type": "flowchart/sequence/class/er/gantt/pie"
- "mermaid_code": "유효한 Mermaid 문법 코드"
- "diagram_caption": "다이어그램 설명"
""" if enable_diagrams else ""

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
      
      // 🆕 Image metadata (if applicable)
      "image_required": false,
      "image_search_keywords": "",
      "image_style": "professional",
      
      // 🆕 Diagram metadata (if applicable)
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
"""

        try:
            response = await self.client.chat.completions.create(
                model="gpt-4-turbo-preview",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                response_format={"type": "json_object"},
                temperature=0.7,
                max_tokens=4000
            )
            
            content = response.choices[0].message.content
            return json.loads(content)
            
        except Exception as e:
            raise Exception(f"LLM generation failed: {str(e)}")
```

**Code Example - Image Service:**
```python
# backend/app/services/image_service.py
import aiohttp
from typing import List, Dict, Optional
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

class ImageSearchService:
    def __init__(self):
        self.unsplash_api_key = settings.UNSPLASH_ACCESS_KEY
        self.pexels_api_key = settings.PEXELS_API_KEY
    
    async def search_images(
        self,
        keywords: str,
        count: int = 5,
        orientation: str = "landscape",
        style: str = "professional"
    ) -> List[Dict]:
        """
        Search for images across multiple sources
        
        Args:
            keywords: Search keywords
            count: Number of results
            orientation: landscape/portrait/square
            style: Image style preference
        
        Returns:
            List of image metadata
        """
        logger.info(f"Searching images: keywords='{keywords}', count={count}")
        
        results = []
        
        # Try Unsplash first (higher quality)
        try:
            unsplash_results = await self._search_unsplash(keywords, count, orientation)
            results.extend(unsplash_results)
            logger.info(f"Found {len(unsplash_results)} images from Unsplash")
        except Exception as e:
            logger.warning(f"Unsplash search failed: {e}")
        
        # Fallback to Pexels if needed
        if len(results) < count:
            try:
                remaining = count - len(results)
                pexels_results = await self._search_pexels(keywords, remaining, orientation)
                results.extend(pexels_results)
                logger.info(f"Found {len(pexels_results)} images from Pexels")
            except Exception as e:
                logger.warning(f"Pexels search failed: {e}")
        
        return results[:count]
    
    async def _search_unsplash(
        self,
        keywords: str,
        count: int,
        orientation: str
    ) -> List[Dict]:
        """Search Unsplash API"""
        url = "https://api.unsplash.com/search/photos"
        params = {
            "query": keywords,
            "per_page": min(count, 30),  # Unsplash limit
            "orientation": orientation
        }
        headers = {
            "Authorization": f"Client-ID {self.unsplash_api_key}"
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.get(url, params=params, headers=headers) as response:
                if response.status == 200:
                    data = await response.json()
                    return [
                        {
                            "url": img["urls"]["regular"],
                            "thumbnail": img["urls"]["small"],
                            "download_url": img["urls"]["full"],
                            "author": img["user"]["name"],
                            "author_url": img["user"]["links"]["html"],
                            "source": "unsplash",
                            "width": img["width"],
                            "height": img["height"],
                            "alt_description": img.get("alt_description", ""),
                            "color": img.get("color", "#FFFFFF")
                        }
                        for img in data.get("results", [])
                    ]
                else:
                    logger.error(f"Unsplash API error: {response.status}")
                    return []
    
    async def _search_pexels(
        self,
        keywords: str,
        count: int,
        orientation: str
    ) -> List[Dict]:
        """Search Pexels API"""
        url = "https://api.pexels.com/v1/search"
        headers = {"Authorization": self.pexels_api_key}
        params = {
            "query": keywords,
            "per_page": min(count, 80),  # Pexels limit
            "orientation": orientation
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.get(url, params=params, headers=headers) as response:
                if response.status == 200:
                    data = await response.json()
                    return [
                        {
                            "url": img["src"]["large2x"],
                            "thumbnail": img["src"]["medium"],
                            "download_url": img["src"]["original"],
                            "author": img["photographer"],
                            "author_url": img["photographer_url"],
                            "source": "pexels",
                            "width": img["width"],
                            "height": img["height"],
                            "alt_description": img.get("alt", ""),
                            "color": img.get("avg_color", "#FFFFFF")
                        }
                        for img in data.get("photos", [])
                    ]
                else:
                    logger.error(f"Pexels API error: {response.status}")
                    return []
    
    async def download_image(self, image_url: str, save_path: str) -> str:
        """Download image from URL to local file"""
        async with aiohttp.ClientSession() as session:
            async with session.get(image_url) as response:
                if response.status == 200:
                    content = await response.read()
                    with open(save_path, 'wb') as f:
                        f.write(content)
                    return save_path
                raise Exception(f"Failed to download image: {response.status}")
```

**Code Example - Diagram Service:**
```python
# backend/app/services/diagram_service.py
import asyncio
import os
import tempfile
from typing import Optional
import logging

logger = logging.getLogger(__name__)

class DiagramService:
    def __init__(self):
        self.mermaid_cli = "mmdc"  # mermaid-cli command
    
    async def generate_diagram(
        self,
        mermaid_code: str,
        output_format: str = "png",
        theme: str = "default",
        background: str = "transparent",
        width: int = 1920,
        height: int = 1080
    ) -> str:
        """
        Generate diagram image from Mermaid code
        
        Args:
            mermaid_code: Mermaid diagram syntax
            output_format: png or svg
            theme: default, forest, dark, neutral
            background: transparent or hex color
            width: Output width in pixels
            height: Output height in pixels
        
        Returns:
            Path to generated diagram image
        """
        logger.info(f"Generating diagram: format={output_format}, theme={theme}")
        
        # Validate Mermaid syntax
        if not self.validate_mermaid_syntax(mermaid_code):
            raise ValueError("Invalid Mermaid syntax")
        
        # Create temp files
        with tempfile.NamedTemporaryFile(
            mode='w', 
            suffix='.mmd', 
            delete=False, 
            encoding='utf-8'
        ) as mmd_file:
            mmd_file.write(mermaid_code)
            mmd_path = mmd_file.name
        
        output_path = f"{mmd_path}.{output_format}"
        
        # Prepare mermaid-cli command
        cmd = [
            self.mermaid_cli,
            "-i", mmd_path,
            "-o", output_path,
            "-t", theme,
            "-b", background,
            "-w", str(width),
            "-H", str(height),
            "--puppeteerConfigFile", "/path/to/puppeteer-config.json"  # Optional
        ]
        
        try:
            # Run mermaid-cli
            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            
            stdout, stderr = await process.communicate()
            
            if process.returncode != 0:
                error_msg = stderr.decode() if stderr else "Unknown error"
                logger.error(f"Mermaid CLI failed: {error_msg}")
                raise Exception(f"Diagram generation failed: {error_msg}")
            
            # Verify output file exists
            if not os.path.exists(output_path):
                raise Exception("Output file was not created")
            
            # Clean up input file
            os.remove(mmd_path)
            
            logger.info(f"Diagram generated successfully: {output_path}")
            return output_path
            
        except Exception as e:
            # Clean up on error
            if os.path.exists(mmd_path):
                os.remove(mmd_path)
            if os.path.exists(output_path):
                os.remove(output_path)
            raise Exception(f"Diagram generation failed: {str(e)}")
    
    def validate_mermaid_syntax(self, mermaid_code: str) -> bool:
        """Validate Mermaid syntax (basic check)"""
        valid_starts = [
            "flowchart", "graph", "sequenceDiagram",
            "classDiagram", "erDiagram", "gantt", 
            "pie", "journey", "gitGraph"
        ]
        
        first_line = mermaid_code.strip().split('\n')[0].strip()
        is_valid = any(first_line.startswith(start) for start in valid_starts)
        
        if not is_valid:
            logger.warning(f"Invalid Mermaid syntax: {first_line}")
        
        return is_valid
    
    async def check_mermaid_cli_available(self) -> bool:
        """Check if mermaid-cli is installed and accessible"""
        try:
            process = await asyncio.create_subprocess_exec(
                self.mermaid_cli,
                "--version",
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            await process.communicate()
            return process.returncode == 0
        except Exception as e:
            logger.error(f"Mermaid CLI not available: {e}")
            return False
```

---

### Phase 2: Frontend Development (Week 2-3)

**Tasks:**
```yaml
Setup:
  - [ ] Initialize Vite + React + TypeScript
  - [ ] Setup Tailwind CSS
  - [ ] Configure Axios

Components:
  - [ ] PresentationForm component (enhanced)
  - [ ] ProgressBar component (enhanced)
  - [ ] DownloadButton component
  - [ ] TemplateSelector component
  - [ ] 🆕 ImageToggle component
  - [ ] 🆕 DiagramToggle component
  - [ ] 🆕 FeatureExplainer component (tooltips)
  - [ ] ErrorDisplay component

State Management:
  - [ ] API service layer (enhanced)
  - [ ] Type definitions (enhanced)
  - [ ] Custom hooks for polling
```

**Code Example - Enhanced API Service:**
```typescript
// frontend/src/services/api.ts
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface GenerateRequest {
  topic: string;
  num_slides: number;
  template?: string;
  language?: string;
  enable_images?: boolean;        // 🆕
  enable_diagrams?: boolean;      // 🆕
  image_style?: string;           // 🆕
}

export interface GenerateResponse {
  job_id: string;
  status: string;
  message: string;
  estimated_time?: number;        // 🆕
}

export interface StatusResponse {
  job_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  current_stage: string;
  substatus?: string;             // 🆕
  file_url: string | null;
  error: string | null;
  metadata?: {                    // 🆕
    images_found?: number;
    diagrams_generated?: number;
    total_slides?: number;
    file_size_mb?: number;
  };
  created_at: string;
  updated_at: string;
}

export interface DownloadResponse {
  download_url: string;
  expires_in: number;
  file_size_bytes?: number;       // 🆕
  attribution?: Array<{           // 🆕
    source: string;
    photographer: string;
    photographer_url: string;
  }>;
}

export const presentationAPI = {
  generate: async (data: GenerateRequest): Promise<GenerateResponse> => {
    const response = await api.post('/presentations/generate', data);
    return response.data;
  },

  getStatus: async (jobId: string): Promise<StatusResponse> => {
    const response = await api.get(`/presentations/status/${jobId}`);
    return response.data;
  },

  getDownloadUrl: async (jobId: string): Promise<DownloadResponse> => {
    const response = await api.get(`/presentations/download/${jobId}`);
    return response.data;
  },
};
```

**Code Example - Enhanced Form Component:**
```typescript
// frontend/src/components/PresentationForm.tsx
import React, { useState } from 'react';
import { presentationAPI, StatusResponse } from '../services/api';

export const PresentationForm: React.FC = () => {
  const [topic, setTopic] = useState('');
  const [numSlides, setNumSlides] = useState(7);
  const [enableImages, setEnableImages] = useState(true);      // 🆕
  const [enableDiagrams, setEnableDiagrams] = useState(true);  // 🆕
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await presentationAPI.generate({
        topic,
        num_slides: numSlides,
        template: 'default',
        language: 'ko',
        enable_images: enableImages,      // 🆕
        enable_diagrams: enableDiagrams,  // 🆕
        image_style: 'professional',
      });

      // Start polling for status
      pollStatus(response.job_id);
    } catch (err: any) {
      setError(err.response?.data?.detail || '생성 중 오류가 발생했습니다.');
      setLoading(false);
    }
  };

  const pollStatus = async (jobId: string) => {
    const interval = setInterval(async () => {
      try {
        const statusData = await presentationAPI.getStatus(jobId);
        setStatus(statusData);

        if (statusData.status === 'completed' || statusData.status === 'failed') {
          clearInterval(interval);
          setLoading(false);

          if (statusData.status === 'failed') {
            setError(statusData.error || '생성에 실패했습니다.');
          }
        }
      } catch (err) {
        clearInterval(interval);
        setLoading(false);
        setError('상태 확인 중 오류가 발생했습니다.');
      }
    }, 2000);
  };

  const handleDownload = async () => {
    if (!status?.job_id) return;

    try {
      const { download_url, attribution } = await presentationAPI.getDownloadUrl(status.job_id);
      window.open(download_url, '_blank');
      
      // Show attribution info if present
      if (attribution && attribution.length > 0) {
        console.log('Image credits:', attribution);
      }
    } catch (err) {
      setError('다운로드 중 오류가 발생했습니다.');
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-8">
      <div className="bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          AI 프레젠테이션 생성기
        </h1>
        <p className="text-gray-600 mb-8">
          주제만 입력하면 이미지와 다이어그램이 포함된 전문 프레젠테이션을 자동 생성합니다
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Topic Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              프레젠테이션 주제 *
            </label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="예: AI 기술의 비즈니스 활용"
              required
              minLength={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg 
                       focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Slide Count */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              슬라이드 수: {numSlides}장
            </label>
            <input
              type="range"
              min="3"
              max="15"
              value={numSlides}
              onChange={(e) => setNumSlides(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>3장</span>
              <span>15장</span>
            </div>
          </div>

          {/* 🆕 Advanced Options */}
          <div className="bg-gray-50 p-4 rounded-lg space-y-4">
            <h3 className="font-medium text-gray-900 mb-3">고급 옵션</h3>
            
            {/* Enable Images Toggle */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-700">🖼️ 자동 이미지 삽입</span>
                <button
                  type="button"
                  className="text-gray-400 hover:text-gray-600"
                  title="슬라이드 내용에 맞는 이미지를 자동으로 검색하여 삽입합니다"
                >
                  ℹ️
                </button>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={enableImages}
                  onChange={(e) => setEnableImages(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 
                              peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full 
                              peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] 
                              after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full 
                              after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {/* Enable Diagrams Toggle */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-700">📊 자동 다이어그램 생성</span>
                <button
                  type="button"
                  className="text-gray-400 hover:text-gray-600"
                  title="프로세스나 관계를 시각화하는 다이어그램을 자동 생성합니다"
                >
                  ℹ️
                </button>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={enableDiagrams}
                  onChange={(e) => setEnableDiagrams(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 
                              peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full 
                              peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] 
                              after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full 
                              after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {enableImages && (
              <p className="text-xs text-gray-500 mt-2">
                💡 Unsplash와 Pexels에서 무료 고품질 이미지를 검색합니다
              </p>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || !topic}
            className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-medium
                     hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                     disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? '생성 중...' : '프레젠테이션 생성'}
          </button>
        </form>

        {/* Error Message */}
        {error && (
          <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        {/* Progress Display */}
        {status && (
          <div className="mt-8 space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <span className="text-sm font-medium text-gray-700 block">
                  {status.current_stage}
                </span>
                {status.substatus && (
                  <span className="text-xs text-gray-500">
                    {status.substatus}
                  </span>
                )}
              </div>
              <span className="text-sm font-medium text-gray-900">
                {status.progress}%
              </span>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <div
                className="bg-blue-600 h-3 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${status.progress}%` }}
              />
            </div>

            {/* Metadata Display */}
            {status.metadata && status.status === 'completed' && (
              <div className="bg-blue-50 p-3 rounded-lg">
                <div className="grid grid-cols-3 gap-2 text-center text-sm">
                  <div>
                    <div className="font-semibold text-blue-900">
                      {status.metadata.total_slides || 0}
                    </div>
                    <div className="text-blue-600 text-xs">슬라이드</div>
                  </div>
                  <div>
                    <div className="font-semibold text-blue-900">
                      {status.metadata.images_found || 0}
                    </div>
                    <div className="text-blue-600 text-xs">이미지</div>
                  </div>
                  <div>
                    <div className="font-semibold text-blue-900">
                      {status.metadata.diagrams_generated || 0}
                    </div>
                    <div className="text-blue-600 text-xs">다이어그램</div>
                  </div>
                </div>
              </div>
            )}

            {/* Download Button */}
            {status.status === 'completed' && (
              <button
                onClick={handleDownload}
                className="w-full bg-green-600 text-white py-3 px-6 rounded-lg font-medium
                         hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2
                         transition-colors"
              >
                📥 다운로드
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
```

---

### Phase 3: Integration & Testing (Week 3-4)

**Tasks:**
```yaml
Integration:
  - [ ] Connect frontend to backend
  - [ ] Setup Docker Compose
  - [ ] Configure CORS
  - [ ] Test end-to-end flow
  - [ ] 🆕 Test image search integration
  - [ ] 🆕 Test diagram generation

Testing:
  - [ ] Unit tests for services
  - [ ] API endpoint tests
  - [ ] 🆕 Image service tests
  - [ ] 🆕 Diagram service tests
  - [ ] Integration tests
  - [ ] Manual QA testing

Optimization:
  - [ ] Add request caching
  - [ ] Implement rate limiting
  - [ ] Optimize LLM prompts
  - [ ] 🆕 Implement image caching
  - [ ] 🆕 Optimize diagram rendering
  - [ ] Add error recovery
```

---

## 📏 Code Standards

### Python (Backend)

```python
# Follow PEP 8 style guide
# Use type hints everywhere
# Use async/await for I/O operations

# Good Example:
async def search_and_insert_image(
    slide_data: Dict,
    prs: Presentation,
    slide: Slide
) -> Optional[str]:
    """
    Search for relevant image and insert into slide.
    
    Args:
        slide_data: Slide metadata including image keywords
        prs: Presentation object
        slide: Target slide
    
    Returns:
        Image URL if successful, None otherwise
    
    Raises:
        ImageSearchError: If image search fails
    """
    if not slide_data.get("image_required"):
        return None
    
    # Implementation...
```

### TypeScript (Frontend)

```typescript
// Use strict TypeScript
// Define interfaces for all data structures
// Use functional components with hooks

// Good Example:
interface AdvancedOptionsProps {
  enableImages: boolean;
  enableDiagrams: boolean;
  onImageToggle: (enabled: boolean) => void;
  onDiagramToggle: (enabled: boolean) => void;
}

export const AdvancedOptions: React.FC<AdvancedOptionsProps> = ({
  enableImages,
  enableDiagrams,
  onImageToggle,
  onDiagramToggle
}) => {
  return (
    <div className="space-y-4">
      {/* Toggle controls */}
    </div>
  );
};
```

### Naming Conventions

```yaml
Files:
  Python: snake_case (image_service.py, diagram_service.py)
  TypeScript: PascalCase for components (ImageToggle.tsx)
  TypeScript: camelCase for utilities (imageHelpers.ts)

Variables:
  Python: snake_case (image_search_keywords, mermaid_code)
  TypeScript: camelCase (enableImages, diagramType)

Classes:
  Both: PascalCase (ImageSearchService, DiagramService)

Constants:
  Both: UPPER_SNAKE_CASE (MAX_IMAGE_SIZE, SUPPORTED_DIAGRAM_TYPES)
```

---

## ⚙️ Environment Configuration

### Backend (.env)

```bash
# OpenAI
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxx

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/presentations
REDIS_URL=redis://localhost:6379/0

# AWS S3
AWS_ACCESS_KEY_ID=AKIAXXXXXXXX
AWS_SECRET_ACCESS_KEY=xxxxxxxxxxxxxxxx
AWS_REGION=us-east-1
AWS_S3_BUCKET=ai-presentations

# 🆕 Image APIs
UNSPLASH_ACCESS_KEY=your_unsplash_access_key
PEXELS_API_KEY=your_pexels_api_key

# 🆕 Diagram Generation
MERMAID_CLI_PATH=mmdc
PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser  # Optional

# Application
DEBUG=True
LOG_LEVEL=INFO
ALLOWED_ORIGINS=http://localhost:3000,https://yourdomain.com

# Celery
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/0
```

### Frontend (.env)

```bash
VITE_API_URL=http://localhost:8000/api
VITE_APP_NAME=AI Presentation Generator
VITE_ENABLE_IMAGES_DEFAULT=true    # 🆕
VITE_ENABLE_DIAGRAMS_DEFAULT=true  # 🆕
```

---

## 🎯 Implementation Commands for Cursor

### Step 1: Backend Setup
```
Create the complete backend structure with all files in backend/ directory.
Include FastAPI app setup, database models, Pydantic schemas, and service classes.
Add the new image_service.py and diagram_service.py files.
Follow the project structure exactly as defined in PRD v2.0.
```

### Step 2: Image Service
```
Implement the ImageSearchService class in backend/app/services/image_service.py
with async Unsplash and Pexels API integration.
Include image search, relevance scoring, and download functionality.
Use the code example from the Advanced Features section.
```

### Step 3: Diagram Service
```
Create DiagramService class in backend/app/services/diagram_service.py
with Mermaid CLI integration and diagram generation.
Handle syntax validation, rendering, and optimization.
Use the code example from the Advanced Features section.
```

### Step 4: Enhanced LLM Service
```
Update the LLMService class to generate image keywords and diagram suggestions.
Enhance the prompt to include visual element metadata.
Follow the enhanced code example in Phase 1.
```

### Step 5: Enhanced API Routes
```
Update all API endpoints in backend/app/api/routes/presentations.py:
- Enhance POST /generate to accept image/diagram options
- Update GET /status/:id to return metadata
- Add attribution info to download endpoint
Follow the enhanced API specifications in PRD v2.0.
```

### Step 6: Frontend
```
Create the enhanced React frontend with TypeScript.
Add ImageToggle and DiagramToggle components.
Update PresentationForm with advanced options.
Display generation metadata in progress view.
Use the enhanced code examples from Phase 2.
```

### Step 7: Database Migrations
```
Create Alembic migrations for the new database tables:
- Add enable_images and enable_diagrams columns to presentation_jobs
- Create slide_images table
- Create slide_diagrams table
Follow the enhanced database schema in PRD v2.0.
```

### Step 8: Docker Setup
```
Update docker-compose.yml to include:
- Node.js container for mermaid-cli
- Environment variables for image APIs
Include updated Dockerfiles with new dependencies.
```

---

## 📦 Dependencies

### Backend (requirements.txt)
```
# Existing dependencies
fastapi==0.109.0
uvicorn[standard]==0.27.0
python-pptx==0.6.23
openai==1.10.0
sqlalchemy==2.0.25
psycopg2-binary==2.9.9
redis==5.0.1
celery==5.3.6
boto3==1.34.34
python-dotenv==1.0.0
pydantic==2.5.3
pydantic-settings==2.1.0

# 🆕 New dependencies
aiohttp==3.9.1           # Async HTTP client for APIs
Pillow==10.2.0           # Image processing
```

### System Dependencies
```bash
# 🆕 Install Mermaid CLI (Node.js required)
npm install -g @mermaid-js/mermaid-cli

# Or using Docker
docker pull minlag/mermaid-cli
```

### Frontend (package.json)
```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "axios": "^1.6.5",
    "zustand": "^4.4.7"
  },
  "devDependencies": {
    "@types/react": "^18.2.48",
    "@types/react-dom": "^18.2.18",
    "@vitejs/plugin-react": "^4.2.1",
    "typescript": "^5.3.3",
    "vite": "^5.0.11",
    "tailwindcss": "^3.4.1",
    "autoprefixer": "^10.4.17",
    "postcss": "^8.4.33"
  }
}
```

---

## ✅ Success Checklist

Before considering MVP complete:

```
Backend:
  - [ ] All API endpoints return correct responses
  - [ ] LLM generates valid JSON structure
  - [ ] 🆕 Image search returns relevant results (90%+ relevance)
  - [ ] 🆕 Diagrams render correctly from Mermaid code
  - [ ] PPTX files are created successfully
  - [ ] 🆕 Images are properly inserted into slides
  - [ ] 🆕 Diagrams are properly inserted into slides
  - [ ] Files upload to S3 correctly
  - [ ] Progress updates work in real-time
  - [ ] Error handling covers edge cases

Frontend:
  - [ ] Form validation works correctly
  - [ ] 🆕 Image toggle works
  - [ ] 🆕 Diagram toggle works
  - [ ] Progress bar updates smoothly
  - [ ] 🆕 Metadata display shows correct info
  - [ ] Download button appears after completion
  - [ ] Error messages display clearly
  - [ ] Responsive design works on mobile

Integration:
  - [ ] End-to-end flow completes successfully
  - [ ] 🆕 Images are contextually relevant
  - [ ] 🆕 Diagrams are readable and accurate
  - [ ] Docker containers run without errors
  - [ ] Database migrations apply correctly
  - [ ] Environment variables load properly

Testing:
  - [ ] Generate 10 presentations successfully
  - [ ] Test with various slide counts (3, 7, 15)
  - [ ] 🆕 Test with images enabled/disabled
  - [ ] 🆕 Test with diagrams enabled/disabled
  - [ ] Test error scenarios (invalid input, API failure)
  - [ ] 🆕 Test image API failures (fallback behavior)
  - [ ] 🆕 Test diagram generation failures
  - [ ] Load test with 5 concurrent requests
```

---

## 🔒 Security Considerations

```yaml
API Security:
  - Implement rate limiting (10 requests/minute per IP)
  - Add API key authentication (future)
  - Validate all user inputs
  - Sanitize file paths
  - 🆕 Validate image URLs before download
  - 🆕 Sanitize Mermaid code input

Data Security:
  - Use environment variables for secrets
  - Encrypt sensitive data in database
  - Use HTTPS in production
  - Implement CORS properly
  - 🆕 Secure image API keys
  - 🆕 Limit diagram rendering resources

File Security:
  - Scan uploaded files for malware
  - Set file size limits
  - Use secure S3 bucket policies
  - Implement presigned URL expiration
  - 🆕 Validate downloaded image types
  - 🆕 Limit diagram output file sizes
```

---

## 📈 Monitoring & Analytics

```yaml
Metrics to Track:
  - Generation success rate
  - Average generation time
  - API response times
  - Error rates by type
  - User engagement metrics
  - 🆕 Image search success rate
  - 🆕 Diagram generation success rate
  - 🆕 Image relevance scores
  - 🆕 Feature adoption rate (images/diagrams)

Tools:
  - Sentry for error tracking
  - CloudWatch for AWS metrics
  - Google Analytics for user behavior
  - Custom logging for business metrics
  - 🆕 Image API usage monitoring
  - 🆕 Mermaid CLI performance metrics
```

---

## 💰 Cost Considerations

```yaml
API Costs (Monthly):
  OpenAI GPT-4: $50-500 (usage-based)
  Unsplash API: Free (5,000 requests/hour)
  Pexels API: Free (200 requests/hour)
  
Infrastructure:
  AWS/Cloud: $30-200
  Additional: +$20-50 for image storage
  
Total Estimated: $100-750/month
```

---

## 📞 Next Steps After Implementation

1. **Deploy to staging environment**
2. **Conduct user testing with 20+ users**
3. **Collect feedback on image relevance**
4. **Measure diagram usage and satisfaction**
5. **Optimize image search algorithms**
6. **Expand diagram type support**
7. **Plan Phase 3 features (editing, animation, etc.)**

---

## 🚀 Future Enhancements (v3.0 Roadmap)

```yaml
Planned Features:
  - AI-generated animations and transitions
  - Voice-over generation for slides
  - Real-time collaborative editing
  - Custom brand asset library
  - Video clip insertion
  - Interactive charts and graphs
  - Multi-language support expansion
  - Mobile app version
```

---

**End of PRD v2.0**

_This document should be placed in your project root as `PRD.md` and referenced when asking Cursor AI to implement features._

**Changelog:**
- v2.0.0 (2026-01-14): Added intelligent image search and AI diagram generation features
- v1.0.0 (2026-01-13): Initial release with basic presentation generation
