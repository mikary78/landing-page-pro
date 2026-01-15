# 2026-01-16: 프로젝트 커버 기능 개선

## 작업 개요
프로젝트 생성 시 "디자인/삽화 생성(이미지)" 기능을 "프로젝트 커버"로 용도 변경하고, 대시보드에 커버 이미지를 표시하도록 개선했습니다. 기존에 슬라이드/인포그래픽 배경으로 사용되던 이미지를 독립적인 프로젝트 커버로 분리했습니다.

## 주요 변경사항

### 1. 용어 변경: "디자인/삽화 생성(이미지)" → "프로젝트 커버"

#### Backend (Azure Functions)
**파일**: `azure-functions/src/lib/agent/plan.ts`

변경된 위치:
- Line 103: `title: '프로젝트 커버'`
- Line 129: `title: '프로젝트 커버'`
- Line 44: 타입 정의에 'gamma' | 'canva' 템플릿 추가

```typescript
export interface GenerationOptions {
  enableWebSearch?: boolean;
  enableImageGeneration?: boolean;
  useSixStagePipeline?: boolean;
  slides?: {
    slideCount?: number;
    template?: 'default' | 'minimal' | 'creative' | 'gamma' | 'canva'; // gamma, canva 추가
  };
}
```

#### Frontend
**파일**: `src/pages/GenerationStudioPage.tsx`

변경된 위치:
- Line 431: 주석 변경 - "프로젝트 커버 이미지 생성 결과"
- Line 448: UI 제목 - "생성된 프로젝트 커버"
- Line 495: 함수명 및 메시지 - "프로젝트 커버 다운로드"
- Line 1390: 다운로드 메뉴 - "프로젝트 커버 (PNG)"
- Line 1768: 이미지 타입 표시 - "프로젝트 커버"

### 2. 독립적인 'cover' Artifact 타입 생성

#### Backend 로직 변경
**파일**: `azure-functions/src/functions/generationJobWorker.ts` (lines 736-765)

**기존 구조**:
```typescript
// 배경 이미지를 infographic과 slides에 모두 할당
const artifacts: any[] = [
  { type: 'infographic', assets: { background: bg }, markCompleted: false },
  { type: 'slides', assets: { background: bg, illustrations }, markCompleted: false },
];
```

**변경된 구조**:
```typescript
// 프로젝트 커버를 독립적인 artifact로 저장
const artifacts: any[] = [
  { type: 'cover', assets: { background: bg }, markCompleted: false }, // 새로운 타입
];

// illustrations가 있으면 slides artifact에 추가 (background 제외)
if (illustrations.length > 0) {
  artifacts.push({ type: 'slides', assets: { illustrations }, markCompleted: false });
}
```

**출력 형식 변경**:
```typescript
const outputSummary = {
  cover: { model: bg.model, createdAt: bg.createdAt }, // 'background' → 'cover'로 변경
  illustrations: illustrations.map(ill => ({
    slideNumber: ill.slideNumber,
    title: ill.title,
    model: ill.model,
    createdAt: ill.createdAt,
  })),
};

const logMessage = illustrations.length > 0
  ? `프로젝트 커버 생성 완료: 커버 이미지 1개 + 삽화 ${illustrations.length}개`
  : '프로젝트 커버 이미지 생성 완료';
```

### 3. 대시보드에 커버 이미지 표시

#### Backend API 수정
**파일**: `azure-functions/src/functions/getProjects.ts` (lines 52-63)

프로젝트 목록 조회 시 커버 이미지 URL을 함께 반환하도록 SQL 쿼리 수정:

```sql
SELECT
  p.id,
  p.user_id,
  p.title,
  p.description,
  -- ... 기타 필드들 ...
  p.status,
  p.created_at,
  p.updated_at,
  CASE
    WHEN EXISTS (SELECT 1 FROM lessons WHERE project_id = p.id)
    THEN true
    ELSE false
  END as is_converted_to_course,
  (
    SELECT ga.assets->'background'->>'dataUrl'
    FROM generation_jobs gj
    JOIN generation_artifacts ga ON gj.id = ga.job_id
    WHERE gj.project_id = p.id
      AND ga.artifact_type = 'cover'  -- 'cover' 타입만 조회
      AND ga.assets IS NOT NULL
      AND ga.assets->'background' IS NOT NULL
      AND ga.assets->'background'->>'dataUrl' IS NOT NULL
    ORDER BY ga.created_at DESC
    LIMIT 1
  ) as cover_image_url
FROM projects p
WHERE p.user_id = $1
ORDER BY p.created_at DESC
```

#### Frontend 타입 정의
**파일**: `src/pages/Dashboard.tsx` (line 46)

```typescript
type Project = {
  id: string;
  title: string;
  description?: string;
  status: string;
  ai_model: string;
  education_course?: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  is_converted_to_course?: boolean;
  cover_image_url?: string; // 새로 추가
};
```

#### UI 컴포넌트 수정
**파일**: `src/pages/Dashboard.tsx` (lines 317-326)

```typescript
<Card key={project.id} className="hover:shadow-lg transition-shadow overflow-hidden">
  {/* 커버 이미지 표시 */}
  {project.cover_image_url && (
    <div className="w-full h-40 bg-gradient-to-br from-blue-50 to-purple-50 overflow-hidden">
      <img
        src={project.cover_image_url}
        alt={`${project.title} 커버`}
        className="w-full h-full object-cover"
      />
    </div>
  )}
  <CardHeader>
    {/* 기존 프로젝트 정보 */}
  </CardHeader>
</Card>
```

### 4. 슬라이드/인포그래픽 배경 사용 제거

#### GenerationStudioPage 수정
**파일**: `src/pages/GenerationStudioPage.tsx`

**Line 436-443**: 커버 이미지 가져오기 로직 변경
```typescript
// 기존: infographic, slides에서 background 가져오기
const infographicAssets = artifactsByType.get("infographic")?.assets;
const slidesAssets = artifactsByType.get("slides")?.assets;
const imageDataUrl = infographicAssets?.background?.dataUrl
  || slidesAssets?.background?.dataUrl
  || output.background?.dataUrl
  || output.dataUrl;

// 변경: cover artifact에서만 가져오기
const coverAssets = artifactsByType.get("cover")?.assets;
const imageDataUrl = coverAssets?.background?.dataUrl
  || output.cover?.dataUrl
  || output.background?.dataUrl
  || output.dataUrl;
```

**Line 496-499**: 다운로드 함수 수정
```typescript
// 기존: infographic 또는 slides에서 background 찾기
const infographicArtifact = jobState.artifacts.find(a => a.artifact_type === 'infographic');
const slidesArtifact = jobState.artifacts.find(a => a.artifact_type === 'slides');
const backgroundDataUrl = infographicArtifact?.assets?.background?.dataUrl ||
                         slidesArtifact?.assets?.background?.dataUrl;

// 변경: cover artifact에서만 찾기
const coverArtifact = jobState.artifacts.find(a => a.artifact_type === 'cover');
const backgroundDataUrl = coverArtifact?.assets?.background?.dataUrl;
```

**Line 1765-1774**: 에셋 목록 표시 수정
```typescript
// 기존: 인포그래픽 배경, 슬라이드 배경 각각 표시
allImages.push({ type: '인포그래픽 배경', ... });
allImages.push({ type: '슬라이드 배경', ... });

// 변경: 프로젝트 커버 하나만 표시
const coverArtifact = artifactsByType.get("cover");
if (coverArtifact?.assets?.background?.dataUrl) {
  allImages.push({
    type: '프로젝트 커버',
    dataUrl: coverArtifact.assets.background.dataUrl,
    source: 'cover'
  });
}
```

## 데이터베이스 스키마

### generation_artifacts 테이블
기존 테이블에 새로운 artifact_type 값 추가:
- `artifact_type = 'cover'` - 프로젝트 커버 이미지 저장

구조:
```sql
CREATE TABLE generation_artifacts (
  id UUID PRIMARY KEY,
  job_id UUID NOT NULL,
  artifact_type VARCHAR(30) NOT NULL, -- 'cover' 추가됨
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  content_text TEXT,
  content_json JSONB,
  assets JSONB, -- { background: { dataUrl, prompt, model, createdAt } }
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

## 사용자 워크플로우

### 기존 워크플로우
1. 프로젝트 생성 시 "디자인/삽화 생성(이미지)" 선택
2. DALL-E-3로 배경 이미지 생성
3. 생성된 이미지가 자동으로 슬라이드/인포그래픽 배경으로 사용됨
4. 대시보드에는 커버 이미지 표시 안됨

### 개선된 워크플로우
1. 프로젝트 생성 시 "프로젝트 커버" 선택
2. DALL-E-3로 커버 이미지 생성
3. **독립적인 'cover' artifact로 저장** (슬라이드/인포그래픽과 분리)
4. **대시보드 프로젝트 카드에 커버 이미지 표시**
5. 슬라이드/인포그래픽은 자체 디자인 팔레트만 사용

## UI/UX 개선사항

### 대시보드 프로젝트 카드
**변경 전**:
```
┌────────────────────────────┐
│ [프로젝트 제목]            │
│ 설명...                    │
│ [AI모델] [과정] [상태]     │
│ 날짜         [삭제][보기]  │
└────────────────────────────┘
```

**변경 후**:
```
┌────────────────────────────┐
│  [커버 이미지 (높이 40)]   │  ← 새로 추가
├────────────────────────────┤
│ [프로젝트 제목]            │
│ 설명...                    │
│ [AI모델] [과정] [상태]     │
│ 날짜         [삭제][보기]  │
└────────────────────────────┘
```

### 프로젝트 생성 스튜디오
- "디자인/삽화 생성(이미지)" → "프로젝트 커버"로 용어 변경
- 생성된 이미지는 "생성된 프로젝트 커버"로 표시
- 다운로드 시 파일명: `{프로젝트명}_커버이미지.png`

## 기술적 세부사항

### Canvas 컴포넌트 변경 없음
- `InfographicCanvas.tsx` - 변경 없음 (자체 팔레트 사용)
- `SlidesCanvas.tsx` - 변경 없음 (자체 팔레트 사용)

기존에 background를 받아서 사용하던 로직이 있었으나, 이제는 전달되지 않으므로:
```typescript
// InfographicCanvas.tsx (line 70)
const bg = assets?.background?.dataUrl as string | undefined; // undefined가 됨

// SlidesCanvas.tsx (line 121)
const bg = assets?.background?.dataUrl as string | undefined; // undefined가 됨
```

Canvas는 `bg`가 없으면 자체 gradient 팔레트로 배경을 그립니다.

### 이미지 생성 프롬프트
기존 프롬프트 유지 (변경 없음):
```typescript
const bgPrompt = `Create a clean, professional background image for an educational presentation.
Style: ${paletteText}.
Design: abstract gradient, modern, subtle texture, no text, no logos.
Aspect ratio: 16:9 landscape.`;
```

## 배포 정보

### 배포 일시
- 2026-01-16 17:17 (Azure Functions)
- 2026-01-16 17:18 (Frontend)

### 배포 위치
- **Backend**: https://func-landing-page-pro.azurewebsites.net
- **Frontend**: https://app-landing-page-pro.azurewebsites.net

## 테스트 시나리오

### 시나리오 1: 새 프로젝트 생성
1. ✅ 프로젝트 생성 시 "프로젝트 커버" 단계 표시 확인
2. ✅ 커버 이미지 생성 완료 후 미리보기 표시
3. ✅ 대시보드에서 프로젝트 카드 상단에 커버 이미지 표시
4. ✅ 슬라이드 생성 시 배경 이미지 없음 확인
5. ✅ 인포그래픽 생성 시 배경 이미지 없음 확인

### 시나리오 2: 기존 프로젝트 (커버 없음)
1. ✅ 기존 프로젝트는 cover_image_url이 null
2. ✅ 대시보드에서 커버 이미지 영역 표시 안됨
3. ✅ 기존 슬라이드/인포그래픽은 이전 background 유지

### 시나리오 3: 커버 다운로드
1. ✅ "프로젝트 커버 (PNG)" 메뉴 항목 클릭
2. ✅ 파일명: `{프로젝트명}_커버이미지.png`
3. ✅ Toast 메시지: "프로젝트 커버가 다운로드되었습니다."

## 향후 개선 계획

### Phase 1: 커버 이미지 편집 (우선순위: 중간)
- [ ] 커버 이미지 업로드 기능
- [ ] 커버 이미지 재생성 기능
- [ ] 커버 이미지 크롭/리사이즈

### Phase 2: 커버 템플릿 (우선순위: 낮음)
- [ ] 미리 디자인된 커버 템플릿 제공
- [ ] 사용자 지정 텍스트 오버레이
- [ ] 브랜딩 요소 추가

### Phase 3: 대시보드 개선 (우선순위: 낮음)
- [ ] 커버 이미지 없는 프로젝트에 기본 이미지 표시
- [ ] 커버 이미지 hover 효과
- [ ] 그리드/리스트 뷰 토글

## 관련 파일

### Frontend
- `src/pages/Dashboard.tsx` - 대시보드 UI (커버 이미지 표시)
- `src/pages/GenerationStudioPage.tsx` - 프로젝트 생성/관리 페이지
- `src/components/studio/InfographicCanvas.tsx` - 인포그래픽 렌더링
- `src/components/studio/SlidesCanvas.tsx` - 슬라이드 렌더링

### Backend
- `azure-functions/src/functions/getProjects.ts` - 프로젝트 목록 API
- `azure-functions/src/functions/generationJobWorker.ts` - 생성 작업 워커
- `azure-functions/src/lib/agent/plan.ts` - 생성 단계 정의

### Database
- `db/migration.sql` - generation_artifacts 테이블 스키마

## 참고 문서
- [DALL-E-3 API 문서](https://platform.openai.com/docs/guides/images)
- [Azure Blob Storage](https://docs.microsoft.com/azure/storage/blobs/)
- [2026-01-14 이미지/다이어그램 서비스](./2026-01-14_image-diagram-services.md)
- [2026-01-16 코스빌더 콘텐츠 생성 기능 개선](./2026-01-16_course-builder-enhancement.md)

## 작업 완료 일시
- 2026-01-16 작업 완료
- Azure Functions 및 Frontend 배포 완료 ✓
- 모든 TODO 항목 완료 ✓

## 주요 변경 요약

| 항목 | 기존 | 변경 후 |
|------|------|---------|
| **용어** | 디자인/삽화 생성(이미지) | 프로젝트 커버 |
| **Artifact 타입** | infographic, slides | cover (독립) |
| **슬라이드 배경** | design_assets 이미지 사용 | 자체 팔레트만 사용 |
| **인포그래픽 배경** | design_assets 이미지 사용 | 자체 팔레트만 사용 |
| **대시보드 표시** | 없음 | 커버 이미지 표시 |
| **다운로드 파일명** | `_배경이미지.png` | `_커버이미지.png` |
