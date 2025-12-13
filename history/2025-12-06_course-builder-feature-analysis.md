# 2025-12-06 - Course Builder 기능 추가 요청 분석

## 사용자 요구사항

> "AI Autopilot + Coursera Course Builder 업그레이드"
> 
> 현재 "프로젝트 단위 자동 생성기"를 "Coursera Course Builder 스타일의 코스(과정) 단위 Course Builder"로 확장

---

## 현재 프로젝트 상태 분석

### ✅ 기존 인프라 (확인 완료)

1. **데이터베이스 구조**
   - `profiles`, `user_roles` - 사용자 관리
   - `projects` - 프로젝트 엔티티 (user_id, document_content, status 등)
   - `project_stages` - 6단계 파이프라인 (기획 → 시나리오 → 이미지 → 음성/영상 → 조립 → 배포)
   - `project_ai_results` - AI 모델별 결과 저장
   - `project_templates` - 프로젝트 템플릿
   - `course_deployments`, `course_feedbacks` - 배포 및 피드백

2. **프론트엔드 구조**
   - React 18 + TypeScript + Vite
   - Tailwind CSS + shadcn/ui
   - React Router (현재 라우트: `/dashboard`, `/project/create`, `/project/:id`)
   - React Query로 서버 상태 관리
   - Supabase JS SDK 직접 사용

3. **백엔드/Edge Functions**
   - `process-document` Edge Function (Deno)
   - 6단계 AI 콘텐츠 생성 파이프라인
   - CORS 설정 완료
   - Supabase 클라이언트를 통한 DB 업데이트

4. **RLS 정책 패턴**
   - `update_updated_at_column()` 트리거 함수 존재
   - 기존 테이블들에 RLS 정책 적용됨
   - `has_role()` 함수로 admin 권한 체크 가능

---

## 요청사항 상세 분석

### 1. 데이터베이스 설계 ✅ **진행 가능**

#### 1.1 새 테이블 추가
- `courses` - 코스 엔티티
- `course_modules` - 모듈(챕터/주차)
- `lessons` - 레슨(차시), `project_id`로 기존 projects와 연결

#### 1.2 RLS 정책
- 기존 패턴과 동일하게 구현 가능
- `courses.owner_id = auth.uid()` 기준으로 접근 제어
- Admin 역할 지원 (`has_role()` 함수 활용)

#### 1.3 트리거
- `update_updated_at_column()` 함수 재사용 가능

### 2. 프론트엔드 기능 ✅ **진행 가능**

#### 2.1 라우팅 추가
- `/courses` - 코스 목록
- `/courses/create` - 코스 생성
- `/courses/:id/builder` - 코스 빌더 메인 화면

**기존 패턴과 일관성**: 
- 현재 `/project/create`, `/project/:id` 패턴과 동일한 구조
- `App.tsx`에 라우트 추가만 하면 됨

#### 2.2 컴포넌트 구조
- `pages/CoursesPage.tsx` - 목록 페이지
- `pages/CourseCreatePage.tsx` - 생성 페이지
- `pages/CourseBuilderPage.tsx` - 빌더 메인
- `components/course/CurriculumTreePane.tsx` - 좌측 트리
- `components/course/LessonDetailPane.tsx` - 우측 상세

**기존 패턴과 일관성**:
- `pages/`, `components/` 폴더 구조 유지
- `Dashboard.tsx`, `ProjectDetail.tsx` 스타일 참고 가능

#### 2.3 UI 라이브러리
- shadcn/ui 컴포넌트 활용 (Accordion, Collapsible, Tabs 등)
- Tailwind CSS 스타일링

### 3. 백엔드/Edge Function 연동 ✅ **진행 가능**

#### 3.1 기존 `process-document` 재사용
- **현재 호출 방식**: `supabase.functions.invoke("process-document", { body: {...} })`
- **레슨 생성 시**: 
  1. `projects` 테이블에 레코드 생성
  2. `process-document` 호출
  3. 완료 후 `lessons.project_id` 업데이트

**기존 코드 참고**:
```typescript
// src/pages/ProjectCreate.tsx:101-107
const { error: functionError } = await supabase.functions.invoke("process-document", {
  body: {
    projectId: project.id,
    documentContent: formData.documentContent,
    aiModel: formData.aiModel,
  },
});
```

#### 3.2 `process-course` 함수 (향후 대비)
- 이번 구현에서는 타입/훅 구조만 준비
- 실제 Edge Function은 다음 단계에서 구현

---

## 진행 가능 여부 판단

### ✅ **진행 가능**

**이유**:
1. 기존 인프라가 요구사항을 충족
2. 기존 패턴과 일관성 있게 구현 가능
3. 기술 스택 호환성 확인 완료
4. RLS 정책 패턴 재사용 가능

### ⚠️ 주의사항

1. **중대한 변경사항**
   - DB 구조 변경 (새 테이블 3개)
   - 새로운 기능 영역 추가
   - **→ 브랜치 생성 필요**

2. **마이그레이션 순서**
   - DB 마이그레이션 먼저 실행
   - 타입 정의 업데이트 (`types.ts`)
   - 프론트엔드 코드 추가

3. **테스트 코드**
   - 주요 로직에 Vitest 테스트 추가
   - RLS 정책 테스트 (가능하면)

4. **문서화**
   - `history/` 폴더에 변경 내역 기록
   - API 사용법 문서화

---

## 구현 계획 (예상 작업 순서)

### Phase 1: 데이터베이스 마이그레이션
1. `courses`, `course_modules`, `lessons` 테이블 생성 SQL
2. RLS 정책 설정
3. 트리거 설정 (`update_updated_at_column`)
4. 마이그레이션 파일 생성

### Phase 2: 타입 정의 업데이트
1. `src/integrations/supabase/types.ts` 업데이트
2. Supabase 타입 재생성 (필요시)

### Phase 3: 프론트엔드 기본 구조
1. 라우팅 추가 (`App.tsx`)
2. `CoursesPage` - 목록 페이지
3. `CourseCreatePage` - 생성 페이지
4. 기본 CRUD 훅 작성

### Phase 4: 코스 빌더 UI
1. `CourseBuilderPage` - 메인 레이아웃
2. `CurriculumTreePane` - 좌측 트리
3. `LessonDetailPane` - 우측 상세
4. 모듈/레슨 CRUD 기능

### Phase 5: AI 파이프라인 연동
1. 레슨 생성 시 `project` 자동 생성
2. `process-document` 호출
3. 결과 조회 및 표시
4. 재생성 기능

### Phase 6: 테스트 및 문서화
1. Vitest 테스트 코드 작성
2. `history/` 폴더에 문서화
3. 코드 리뷰 및 최종 검증

---

## 예상 작업량

- **DB 마이그레이션**: 1-2시간
- **타입 정의**: 30분
- **프론트엔드 기본 구조**: 2-3시간
- **코스 빌더 UI**: 4-6시간
- **AI 파이프라인 연동**: 2-3시간
- **테스트 및 문서화**: 1-2시간

**총 예상 시간**: 10-16시간

---

## 참고 자료

1. **기존 코드 패턴**
   - `src/pages/Dashboard.tsx` - 목록 페이지 참고
   - `src/pages/ProjectCreate.tsx` - 생성 페이지 참고
   - `src/pages/ProjectDetail.tsx` - 상세 페이지 참고

2. **Supabase RLS 정책**
   - `supabase/migrations/20251120125945_*.sql` - 기본 RLS 패턴
   - `supabase/migrations/20251122020348_*.sql` - project_stages RLS 참고

3. **Edge Function 호출**
   - `src/pages/ProjectCreate.tsx:101-107`
   - `src/pages/ProjectDetail.tsx:586-593`

---

## 결론

✅ **요청사항은 모두 진행 가능합니다.**

기존 인프라와 패턴을 활용하여 일관성 있게 구현할 수 있으며, 기술적 장애물은 없습니다.

다만, 이는 **중대한 변경사항**이므로:
1. 새 브랜치에서 작업
2. 단계별로 진행
3. 각 단계마다 테스트 및 검증
4. `history/` 폴더에 문서화

를 권장합니다.

---

**End of Document**






