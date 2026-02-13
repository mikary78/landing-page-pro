# AI Presentation Generator - Product Requirements Document

**Version:** 1.0.0  
**Last Updated:** 2026-01-13  
**Project Type:** Full-Stack Web Application  
**Target:** MVP Development for AI-Powered PowerPoint Generation Service

---

## 📋 Table of Contents

1. [Project Overview](#project-overview)
2. [Technical Stack](#technical-stack)
3. [Project Structure](#project-structure)
4. [Core Features](#core-features)
5. [API Specifications](#api-specifications)
6. [Database Schema](#database-schema)
7. [Implementation Phases](#implementation-phases)
8. [Code Standards](#code-standards)
9. [Environment Configuration](#environment-configuration)

---

## 🎯 Project Overview

### Goal
사용자가 주제만 입력하면 AI가 자동으로 전문적인 PowerPoint 프레젠테이션을 생성하는 웹 서비스 개발

### Key Features
- 주제 기반 자동 슬라이드 생성 (LLM 활용)
- 다양한 레이아웃 템플릿 지원
- PPTX 파일 다운로드
- 실시간 생성 진행률 표시
- 비동기 작업 처리 (Celery)

### Success Metrics
- 생성 시간: 평균 30-60초
- 성공률: 95% 이상
- 사용자 만족도: 4.0/5.0 이상

---

## 🛠 Technical Stack

### Backend
```yaml
Language: Python 3.11+
Framework: FastAPI 0.109+
LLM: OpenAI GPT-4 Turbo
Presentation: python-pptx 0.6.23
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
│   │       └── helpers.py
│   ├── templates/
│   │   ├── default.pptx             # Default template
│   │   ├── modern.pptx
│   │   └── minimal.pptx
│   ├── tests/
│   │   ├── __init__.py
│   │   ├── test_api.py
│   │   └── test_services.py
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
│   │   │   └── TemplateSelector.tsx
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
4. "생성하기" 버튼 클릭
5. 백그라운드에서 생성 시작
6. 실시간 진행률 표시 (0% → 100%)
7. 생성 완료 후 다운로드 버튼 표시
```

**Technical Requirements:**
- LLM이 슬라이드 구조를 JSON 형식으로 생성
- 각 슬라이드는 레이아웃 타입 지정 필요
- 생성 작업은 Celery로 비동기 처리
- 진행 상태는 Redis에 저장
- 완성된 파일은 S3에 업로드

**Acceptance Criteria:**
- [ ] 주제 입력 시 30초 이내 생성 시작
- [ ] 진행률이 실시간으로 업데이트
- [ ] 생성된 PPTX 파일이 정상 다운로드
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
  layouts: [title_slide, title_and_content, two_column, content_with_image]

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
  progress: 0-40%
  action: LLM이 슬라이드 구조 생성

Stage 2:
  name: "슬라이드 디자인 중"
  progress: 40-70%
  action: python-pptx로 PPTX 파일 생성

Stage 3:
  name: "파일 업로드 중"
  progress: 70-95%
  action: S3에 파일 업로드

Stage 4:
  name: "완료"
  progress: 100%
  action: 다운로드 준비 완료
```

---

## 🔌 API Specifications

### Base URL
```
Development: http://localhost:8000/api
Production: https://your-domain.com/api
```

### Endpoints

#### 1. Generate Presentation
```http
POST /api/presentations/generate
Content-Type: application/json

Request Body:
{
  "topic": "AI 기술의 비즈니스 활용",
  "num_slides": 7,
  "template": "default",
  "language": "ko"
}

Response (202 Accepted):
{
  "job_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "processing",
  "message": "프레젠테이션 생성이 시작되었습니다."
}

Error (400 Bad Request):
{
  "detail": "주제는 3자 이상이어야 합니다."
}
```

#### 2. Get Generation Status
```http
GET /api/presentations/status/{job_id}

Response (200 OK):
{
  "job_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "processing",
  "progress": 45,
  "current_stage": "슬라이드 디자인 중",
  "file_url": null,
  "error": null,
  "created_at": "2026-01-13T10:30:00Z",
  "updated_at": "2026-01-13T10:30:45Z"
}

Response (200 OK - Completed):
{
  "job_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "completed",
  "progress": 100,
  "current_stage": "완료",
  "file_url": "https://s3.amazonaws.com/bucket/presentations/550e8400.pptx",
  "error": null,
  "created_at": "2026-01-13T10:30:00Z",
  "updated_at": "2026-01-13T10:31:20Z"
}

Error (404 Not Found):
{
  "detail": "작업을 찾을 수 없습니다."
}
```

#### 3. Download Presentation
```http
GET /api/presentations/download/{job_id}

Response (200 OK):
{
  "download_url": "https://s3.amazonaws.com/bucket/presentations/550e8400.pptx?signature=...",
  "expires_in": 3600
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
  "timestamp": "2026-01-13T10:30:00Z",
  "services": {
    "database": "connected",
    "redis": "connected",
    "openai": "available"
  }
}
```

---

## 🗄 Database Schema

### Table: presentation_jobs

```sql
CREATE TABLE presentation_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    topic VARCHAR(500) NOT NULL,
    num_slides INTEGER NOT NULL CHECK (num_slides BETWEEN 3 AND 20),
    template VARCHAR(50) DEFAULT 'default',
    language VARCHAR(10) DEFAULT 'ko',
    
    -- Status tracking
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    progress INTEGER DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
    current_stage VARCHAR(100),
    
    -- Results
    file_url TEXT,
    file_size_bytes INTEGER,
    
    -- Error handling
    error TEXT,
    retry_count INTEGER DEFAULT 0,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    
    -- Indexing
    INDEX idx_status (status),
    INDEX idx_created_at (created_at DESC)
);

-- Status values: pending, processing, completed, failed
```

### Table: templates (Future Enhancement)

```sql
CREATE TABLE templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    file_path VARCHAR(255) NOT NULL,
    preview_image_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
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

LLM Service:
  - [ ] Implement OpenAI API client
  - [ ] Create prompt templates
  - [ ] Add JSON parsing logic
  - [ ] Implement error handling

PPTX Service:
  - [ ] Setup python-pptx
  - [ ] Implement layout mapping
  - [ ] Create slide generation functions
  - [ ] Add template loading

API Routes:
  - [ ] POST /generate endpoint
  - [ ] GET /status/:id endpoint
  - [ ] GET /download/:id endpoint
  - [ ] GET /health endpoint
```

**Code Example - LLM Service:**
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
        language: str = "ko"
    ) -> Dict:
        """
        Generate presentation outline using GPT-4
        
        Args:
            topic: Presentation topic
            num_slides: Number of slides to generate
            language: Content language (ko, en)
        
        Returns:
            Dict with structured presentation data
        """
        
        system_prompt = """당신은 전문 프레젠테이션 디자이너입니다.
주제를 받아서 논리적이고 설득력 있는 슬라이드 구조를 만듭니다.
각 슬라이드는 명확한 메시지와 3-5개의 핵심 포인트를 가져야 합니다."""

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
      "speaker_notes": "발표자 노트 (선택)"
    }}
  ]
}}

레이아웃 타입:
- title_slide: 표지
- title_and_content: 제목 + 불릿 포인트
- two_column: 2단 구성
- content_with_image: 텍스트 + 이미지 플레이스홀더
- section_header: 섹션 구분
- conclusion: 결론 슬라이드
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
                max_tokens=3000
            )
            
            content = response.choices[0].message.content
            return json.loads(content)
            
        except Exception as e:
            raise Exception(f"LLM generation failed: {str(e)}")
```

**Code Example - PPTX Service:**
```python
# backend/app/services/pptx_service.py
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.enum.text import PP_ALIGN
from typing import Dict, List
import os

class PPTXService:
    
    LAYOUT_MAPPING = {
        'title_slide': 0,
        'title_and_content': 1,
        'two_column': 3,
        'content_with_image': 8,
        'section_header': 2,
        'blank': 6
    }
    
    def __init__(self, template_path: str = "templates/default.pptx"):
        self.template_path = template_path
    
    def create_presentation(self, data: Dict) -> str:
        """
        Create PowerPoint presentation from structured data
        
        Args:
            data: Presentation data with slides
        
        Returns:
            Path to generated PPTX file
        """
        
        # Load template
        prs = Presentation(self.template_path)
        
        # Generate each slide
        for slide_data in data['slides']:
            self._add_slide(prs, slide_data)
        
        # Save to temp file
        output_path = f"temp/{data['title'].replace(' ', '_')}.pptx"
        os.makedirs('temp', exist_ok=True)
        prs.save(output_path)
        
        return output_path
    
    def _add_slide(self, prs: Presentation, slide_data: Dict):
        """Add individual slide to presentation"""
        
        layout_type = slide_data.get('layout_type', 'title_and_content')
        layout_index = self.LAYOUT_MAPPING.get(layout_type, 1)
        
        slide_layout = prs.slide_layouts[layout_index]
        slide = prs.slides.add_slide(slide_layout)
        
        # Set title
        if slide.shapes.title:
            slide.shapes.title.text = slide_data['title']
        
        # Handle content based on layout
        if layout_type == 'title_slide':
            self._handle_title_slide(slide, slide_data)
        elif layout_type == 'title_and_content':
            self._handle_content_slide(slide, slide_data)
        elif layout_type == 'two_column':
            self._handle_two_column_slide(slide, slide_data)
    
    def _handle_content_slide(self, slide, slide_data: Dict):
        """Handle content slide with bullet points"""
        
        # Find content placeholder
        for shape in slide.shapes:
            if shape.has_text_frame and shape != slide.shapes.title:
                text_frame = shape.text_frame
                text_frame.clear()
                
                # Add bullet points
                for i, content in enumerate(slide_data.get('content', [])):
                    if i == 0:
                        text_frame.text = content
                    else:
                        p = text_frame.add_paragraph()
                        p.text = content
                        p.level = 0
                break
    
    def _handle_title_slide(self, slide, slide_data: Dict):
        """Handle title slide"""
        if len(slide.placeholders) > 1:
            slide.placeholders[1].text = slide_data.get('subtitle', '')
    
    def _handle_two_column_slide(self, slide, slide_data: Dict):
        """Handle two column layout"""
        content = slide_data.get('content', [])
        mid = len(content) // 2
        
        # Split content into two columns
        left_content = content[:mid]
        right_content = content[mid:]
        
        # Implementation depends on template structure
        pass
```

**Code Example - API Routes:**
```python
# backend/app/api/routes/presentations.py
from fastapi import APIRouter, HTTPException, BackgroundTasks
from typing import Optional
from app.schemas.presentation import (
    PresentationRequest, 
    PresentationResponse,
    StatusResponse
)
from app.services.llm_service import LLMService
from app.services.pptx_service import PPTXService
from app.services.storage_service import StorageService
from app.models.presentation import PresentationJob
from app.core.database import get_db
import uuid
from datetime import datetime

router = APIRouter(prefix="/presentations", tags=["presentations"])

llm_service = LLMService()
pptx_service = PPTXService()
storage_service = StorageService()

@router.post("/generate", response_model=PresentationResponse, status_code=202)
async def generate_presentation(
    request: PresentationRequest,
    background_tasks: BackgroundTasks
):
    """
    Generate a new presentation
    
    This endpoint starts the presentation generation process in the background
    and returns a job_id for status tracking.
    """
    
    # Create job ID
    job_id = str(uuid.uuid4())
    
    # Create database record
    job = PresentationJob(
        id=job_id,
        topic=request.topic,
        num_slides=request.num_slides,
        template=request.template,
        language=request.language,
        status="pending",
        created_at=datetime.utcnow()
    )
    
    # Save to database (pseudo-code)
    # await db.add(job)
    
    # Add background task
    background_tasks.add_task(
        process_generation,
        job_id,
        request.topic,
        request.num_slides,
        request.template,
        request.language
    )
    
    return PresentationResponse(
        job_id=job_id,
        status="processing",
        message="프레젠테이션 생성이 시작되었습니다."
    )

async def process_generation(
    job_id: str,
    topic: str,
    num_slides: int,
    template: str,
    language: str
):
    """Background task for presentation generation"""
    
    try:
        # Update status: generating content
        await update_job_status(job_id, "processing", 10, "컨텐츠 생성 중")
        
        # Step 1: Generate content with LLM
        content_data = await llm_service.generate_presentation_outline(
            topic, num_slides, language
        )
        
        # Update status: creating slides
        await update_job_status(job_id, "processing", 50, "슬라이드 디자인 중")
        
        # Step 2: Create PPTX file
        file_path = pptx_service.create_presentation(content_data)
        
        # Update status: uploading
        await update_job_status(job_id, "processing", 80, "파일 업로드 중")
        
        # Step 3: Upload to S3
        file_url = await storage_service.upload_file(file_path, job_id)
        
        # Update status: completed
        await update_job_status(
            job_id, 
            "completed", 
            100, 
            "완료",
            file_url=file_url
        )
        
        # Clean up temp file
        os.remove(file_path)
        
    except Exception as e:
        await update_job_status(
            job_id,
            "failed",
            0,
            "실패",
            error=str(e)
        )

@router.get("/status/{job_id}", response_model=StatusResponse)
async def get_status(job_id: str):
    """Get generation status for a job"""
    
    # Fetch from database (pseudo-code)
    # job = await db.get(PresentationJob, job_id)
    
    # if not job:
    #     raise HTTPException(status_code=404, detail="작업을 찾을 수 없습니다")
    
    # Return mock response for example
    return StatusResponse(
        job_id=job_id,
        status="processing",
        progress=45,
        current_stage="슬라이드 디자인 중",
        file_url=None,
        error=None,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )

@router.get("/download/{job_id}")
async def download_presentation(job_id: str):
    """Get download URL for completed presentation"""
    
    # Fetch job from database
    # job = await db.get(PresentationJob, job_id)
    
    # if not job or job.status != "completed":
    #     raise HTTPException(status_code=404, detail="파일이 준비되지 않았습니다")
    
    # Generate presigned URL from S3
    download_url = await storage_service.generate_presigned_url(job_id)
    
    return {
        "download_url": download_url,
        "expires_in": 3600
    }

async def update_job_status(
    job_id: str,
    status: str,
    progress: int,
    current_stage: str,
    file_url: Optional[str] = None,
    error: Optional[str] = None
):
    """Helper function to update job status"""
    # Update database record
    pass
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
  - [ ] PresentationForm component
  - [ ] ProgressBar component
  - [ ] DownloadButton component
  - [ ] TemplateSelector component
  - [ ] ErrorDisplay component

State Management:
  - [ ] API service layer
  - [ ] Type definitions
  - [ ] Custom hooks for polling
```

**Code Example - API Service:**
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
}

export interface GenerateResponse {
  job_id: string;
  status: string;
  message: string;
}

export interface StatusResponse {
  job_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  current_stage: string;
  file_url: string | null;
  error: string | null;
  created_at: string;
  updated_at: string;
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

  getDownloadUrl: async (jobId: string): Promise<{ download_url: string; expires_in: number }> => {
    const response = await api.get(`/presentations/download/${jobId}`);
    return response.data;
  },
};
```

**Code Example - Main Component:**
```typescript
// frontend/src/components/PresentationForm.tsx
import React, { useState, useEffect } from 'react';
import { presentationAPI, StatusResponse } from '../services/api';

export const PresentationForm: React.FC = () => {
  const [topic, setTopic] = useState('');
  const [numSlides, setNumSlides] = useState(7);
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
      const { download_url } = await presentationAPI.getDownloadUrl(status.job_id);
      window.open(download_url, '_blank');
    } catch (err) {
      setError('다운로드 중 오류가 발생했습니다.');
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-8">
      <div className="bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          AI 프레젠테이션 생성기
        </h1>

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
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
              <span className="text-sm font-medium text-gray-700">
                {status.current_stage}
              </span>
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

Testing:
  - [ ] Unit tests for services
  - [ ] API endpoint tests
  - [ ] Integration tests
  - [ ] Manual QA testing

Optimization:
  - [ ] Add request caching
  - [ ] Implement rate limiting
  - [ ] Optimize LLM prompts
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
async def create_presentation(
    topic: str,
    num_slides: int,
    template: str = "default"
) -> PresentationJob:
    """
    Create a new presentation generation job.
    
    Args:
        topic: Presentation topic
        num_slides: Number of slides (3-20)
        template: Template name
    
    Returns:
        PresentationJob instance
    
    Raises:
        ValueError: If parameters are invalid
    """
    if not 3 <= num_slides <= 20:
        raise ValueError("num_slides must be between 3 and 20")
    
    # Implementation...
```

### TypeScript (Frontend)

```typescript
// Use strict TypeScript
// Define interfaces for all data structures
// Use functional components with hooks

// Good Example:
interface PresentationFormProps {
  onSubmit: (topic: string, numSlides: number) => Promise<void>;
  isLoading: boolean;
}

export const PresentationForm: React.FC<PresentationFormProps> = ({ 
  onSubmit, 
  isLoading 
}) => {
  const [topic, setTopic] = useState<string>('');
  const [numSlides, setNumSlides] = useState<number>(7);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(topic, numSlides);
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Form content */}
    </form>
  );
};
```

### Naming Conventions

```yaml
Files:
  Python: snake_case (llm_service.py)
  TypeScript: PascalCase for components (PresentationForm.tsx)
  TypeScript: camelCase for utilities (helpers.ts)

Variables:
  Python: snake_case (num_slides)
  TypeScript: camelCase (numSlides)

Classes:
  Both: PascalCase (LLMService, PresentationJob)

Constants:
  Both: UPPER_SNAKE_CASE (MAX_SLIDES, API_BASE_URL)
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
```

---

## 🎯 Implementation Commands for Cursor

### Step 1: Backend Setup
```
Create the complete backend structure with all files in backend/ directory.
Include FastAPI app setup, database models, Pydantic schemas, and service classes.
Follow the project structure exactly as defined in PRD.
```

### Step 2: LLM Service
```
Implement the LLMService class in backend/app/services/llm_service.py
with async OpenAI integration, JSON parsing, and error handling.
Use the code example from Phase 1 as reference.
```

### Step 3: PPTX Service
```
Create PPTXService class in backend/app/services/pptx_service.py
with layout mapping, slide generation, and template support.
Handle all layout types: title_slide, title_and_content, two_column, content_with_image.
```

### Step 4: API Routes
```
Implement all API endpoints in backend/app/api/routes/presentations.py:
- POST /generate
- GET /status/:id
- GET /download/:id
Follow the API specifications exactly as defined in the PRD.
```

### Step 5: Frontend
```
Create the complete React frontend with TypeScript.
Include PresentationForm, ProgressBar, and DownloadButton components.
Setup API service layer with proper type definitions.
Use Tailwind CSS for styling.
```

### Step 6: Docker Setup
```
Create docker-compose.yml with services for backend, frontend, postgres, and redis.
Include Dockerfiles for both backend and frontend.
```

---

## 📦 Dependencies

### Backend (requirements.txt)
```
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
  - [ ] PPTX files are created successfully
  - [ ] Files upload to S3 correctly
  - [ ] Progress updates work in real-time
  - [ ] Error handling covers edge cases

Frontend:
  - [ ] Form validation works correctly
  - [ ] Progress bar updates smoothly
  - [ ] Download button appears after completion
  - [ ] Error messages display clearly
  - [ ] Responsive design works on mobile

Integration:
  - [ ] End-to-end flow completes successfully
  - [ ] Docker containers run without errors
  - [ ] Database migrations apply correctly
  - [ ] Environment variables load properly

Testing:
  - [ ] Generate 10 presentations successfully
  - [ ] Test with various slide counts (3, 7, 15)
  - [ ] Test error scenarios (invalid input, API failure)
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

Data Security:
  - Use environment variables for secrets
  - Encrypt sensitive data in database
  - Use HTTPS in production
  - Implement CORS properly

File Security:
  - Scan uploaded files for malware
  - Set file size limits
  - Use secure S3 bucket policies
  - Implement presigned URL expiration
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

Tools:
  - Sentry for error tracking
  - CloudWatch for AWS metrics
  - Google Analytics for user behavior
  - Custom logging for business metrics
```

---

## 📞 Next Steps After Implementation

1. **Deploy to staging environment**
2. **Conduct user testing with 10+ users**
3. **Collect feedback and iterate**
4. **Optimize performance based on metrics**
5. **Plan Phase 2 features (templates, editing, etc.)**

---

**End of PRD**

_This document should be placed in your project root as `PRD.md` and referenced when asking Cursor AI to implement features._
