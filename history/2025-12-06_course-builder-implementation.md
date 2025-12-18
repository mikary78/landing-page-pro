# 2025-12-06 - Course Builder 기능 구현

**작성일**: 2025년 12월 6일  
**브랜치**: feature/course-builder  
**프로젝트**: AI Autopilot

---

## 사용자 요구사항

> "AI Autopilot + Coursera Course Builder 업그레이드"
> 
> 현재 "프로젝트 단위 자동 생성기"를 "Coursera Course Builder 스타일의 코스(과정) 단위 Course Builder"로 확장

---

## 구현 완료 사항

### Phase 1: 데이터베이스 마이그레이션 ✅

**파일**: `supabase/migrations/20251206120000_bef5e790-ae9d-4f1b-a7c0-d59b509e638b.sql`

**생성된 테이블**:
1. `courses` - 코스 엔티티
   - `id`, `owner_id`, `title`, `description`, `level`, `target_audience`, `total_duration`, `status`
   - RLS 정책: owner_id 기준 접근 제어, admin 권한 지원

2. `course_modules` - 모듈(챕터/주차)
   - `id`, `course_id`, `title`, `summary`, `order_index`
   - RLS 정책: courses.owner_id 기준 접근 제어

3. `lessons` - 레슨(차시)
   - `id`, `module_id`, `project_id`, `title`, `order_index`, `learning_objectives`
   - RLS 정책: courses.owner_id 기준 접근 제어
   - `project_id`로 기존 `projects` 테이블과 연결

**RLS 정책**:
- 모든 테이블에 RLS 활성화
- `owner_id = auth.uid()` 기준 접근 제어
- `has_role(auth.uid(), 'admin')` 함수로 admin 권한 지원

**트리거**:
- `update_updated_at_column()` 함수로 자동 타임스탬프 업데이트

**인덱스**:
- 성능 최적화를 위한 인덱스 추가

### Phase 2: Supabase 타입 정의 업데이트 ✅

**파일**: `src/integrations/supabase/types.ts`

**추가된 타입**:
- `courses` 테이블 타입 (Row, Insert, Update)
- `course_modules` 테이블 타입
- `lessons` 테이블 타입
- Relationships 정의

### Phase 3: 프론트엔드 기본 구조 ✅

**생성된 페이지**:
1. `src/pages/CoursesPage.tsx`
   - 코스 목록 표시
   - 코스 생성 버튼
   - 코스 상태별 Badge 표시
   - 코스 클릭 시 빌더로 이동

2. `src/pages/CourseCreatePage.tsx`
   - 코스 생성 폼
   - 필드: title (필수), description, level, target_audience, total_duration
   - 생성 후 `/courses/:id/builder`로 리다이렉트

**라우팅 추가**:
- `/courses` - 코스 목록
- `/courses/create` - 코스 생성
- `/courses/:id/builder` - 코스 빌더

### Phase 4: 코스 빌더 UI ✅

**생성된 컴포넌트**:
1. `src/pages/CourseBuilderPage.tsx`
   - 메인 레이아웃 (좌우 분할)
   - 좌측: CurriculumTreePane
   - 우측: LessonDetailPane

2. `src/components/course/CurriculumTreePane.tsx`
   - 모듈/레슨 트리 표시
   - Accordion으로 모듈별 레슨 표시
   - 모듈/레슨 추가 기능
   - 레슨 선택 기능

3. `src/components/course/LessonDetailPane.tsx`
   - 레슨 정보 표시
   - AI 콘텐츠 생성 버튼
   - 프로젝트 스테이지 표시
   - AI 결과 비교 (탭)

### Phase 5: AI 파이프라인 연동 ✅

**구현 내용**:
- 레슨 생성 시 `project` 자동 생성
- `process-document` Edge Function 호출
- `lessons.project_id` 업데이트
- 프로젝트 스테이지 및 AI 결과 조회/표시

**기능**:
- "이 레슨을 AI로 생성하기" 버튼
- 재생성 기능
- 여러 AI 모델 결과 비교

---

## 변경된 파일 목록

### 새로 생성된 파일
- `supabase/migrations/20251206120000_bef5e790-ae9d-4f1b-a7c0-d59b509e638b.sql`
- `src/pages/CoursesPage.tsx`
- `src/pages/CourseCreatePage.tsx`
- `src/pages/CourseBuilderPage.tsx`
- `src/components/course/CurriculumTreePane.tsx`
- `src/components/course/LessonDetailPane.tsx`

### 수정된 파일
- `src/integrations/supabase/types.ts` - 새 테이블 타입 추가
- `src/App.tsx` - 라우팅 추가

---

## 기술 스택

- **프론트엔드**: React 18, TypeScript, Vite
- **스타일링**: Tailwind CSS, shadcn/ui
- **상태 관리**: React Query
- **백엔드**: Supabase (PostgreSQL, Edge Functions)
- **라우팅**: React Router

---

## 보안 고려사항

- 모든 테이블에 RLS 정책 적용
- `owner_id` 기준 접근 제어
- Admin 권한 지원 (`has_role()` 함수)
- 클라이언트에서 민감한 오류 메시지 노출 방지

---

## 향후 개선 사항

1. **DnD 기능**
   - 모듈/레슨 순서 변경을 드래그 앤 드롭으로 지원

2. **모듈/레슨 편집**
   - 이름 변경, 삭제 기능 추가

3. **AI 커리큘럼 생성**
   - "AI로 커리큘럼 생성" 버튼 구현
   - `process-course` Edge Function 구현

4. **레슨 브리프 입력**
   - 레슨 생성 시 브리프 입력 폼 추가

5. **테스트 코드**
   - 주요 로직에 Vitest 테스트 추가

---

## 참고 자료

1. **기존 코드 패턴**
   - `src/pages/Dashboard.tsx` - 목록 페이지 참고
   - `src/pages/ProjectCreate.tsx` - 생성 페이지 참고
   - `src/pages/ProjectDetail.tsx` - 상세 페이지 참고

2. **Supabase RLS 정책**
   - `supabase/migrations/20251122020348_*.sql` - project_stages RLS 참고

3. **Edge Function 호출**
   - `src/pages/ProjectCreate.tsx:101-107`
   - `src/pages/ProjectDetail.tsx:586-593`

---

## 테스트 방법

1. **코스 생성**
   - `/courses/create` 접속
   - 코스 정보 입력 후 생성
   - `/courses/:id/builder`로 리다이렉트 확인

2. **모듈/레슨 추가**
   - 빌더에서 모듈 추가
   - 모듈 내 레슨 추가
   - 레슨 선택 확인

3. **AI 콘텐츠 생성**
   - 레슨 선택 후 "이 레슨을 AI로 생성하기" 클릭
   - 프로젝트 생성 및 `process-document` 호출 확인
   - 스테이지 및 AI 결과 표시 확인

---

**End of Document**








