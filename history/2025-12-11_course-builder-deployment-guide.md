# 2025-12-11 - Course Builder 배포 가이드

## 사용자 요구사항
- Course Builder 기능 배포 및 테스트
- 마이그레이션 실행
- 기능 테스트

## 구현 답변
- 마이그레이션 실행 가이드 작성
- 테스트 체크리스트 제공
- 배포 절차 문서화

## 수정 내역 요약

### 1. 마이그레이션 파일 확인
- 파일 위치: `supabase/migrations/20251206120000_bef5e790-ae9d-4f1b-a7c0-d59b509e638b.sql`
- 내용: `courses`, `course_modules`, `lessons` 테이블 생성 및 RLS 정책 설정

### 2. 마이그레이션 실행 방법

#### 방법 1: Supabase CLI 사용 (권장)
```bash
# Supabase CLI 설치 확인
supabase --version

# Supabase 프로젝트 연결 (처음 한 번만)
supabase link --project-ref YOUR_PROJECT_REF

# 마이그레이션 적용
supabase db push
```

#### 방법 2: Supabase Dashboard 사용
1. Supabase Dashboard 접속: https://app.supabase.com
2. 프로젝트 선택
3. SQL Editor 메뉴 클릭
4. `supabase/migrations/20251206120000_bef5e790-ae9d-4f1b-a7c0-d59b509e638b.sql` 파일 내용 복사
5. SQL Editor에 붙여넣기
6. Run 버튼 클릭

#### 방법 3: Supabase CLI (로컬 개발)
```bash
# 로컬 Supabase 시작
supabase start

# 마이그레이션 적용
supabase db reset
```

### 3. 테스트 체크리스트

#### 3.1 코스 생성 테스트
- [ ] `/courses` 페이지 접근 가능
- [ ] "코스 생성" 버튼 클릭
- [ ] `/courses/create` 페이지에서 폼 작성
  - [ ] 제목 입력 (필수)
  - [ ] 설명 입력 (선택)
  - [ ] 레벨 선택 (beginner/intermediate/advanced)
  - [ ] 타겟 오디언스 입력
  - [ ] 총 기간 입력 (예: "4주", "12시간")
- [ ] 제출 후 `/courses/:id/builder`로 리다이렉트 확인

#### 3.2 모듈 추가 테스트
- [ ] 코스 빌더 페이지에서 "모듈 추가" 버튼 클릭
- [ ] 모듈 제목 입력
- [ ] 모듈 요약 입력 (선택)
- [ ] 모듈이 좌측 트리에 표시되는지 확인
- [ ] 모듈 순서 변경 기능 테스트 (위/아래 버튼)

#### 3.3 레슨 추가 테스트
- [ ] 모듈 선택 후 "레슨 추가" 버튼 클릭
- [ ] 레슨 제목 입력
- [ ] 학습 목표 입력 (선택)
- [ ] 레슨이 모듈 하위에 표시되는지 확인
- [ ] 레슨 클릭 시 우측 패널에 상세 정보 표시 확인

#### 3.4 AI 콘텐츠 생성 테스트
- [ ] 레슨 선택 후 "이 레슨을 AI로 생성하기" 버튼 클릭
- [ ] 프로젝트 자동 생성 확인
- [ ] Edge Function `process-document` 호출 확인
- [ ] AI 콘텐츠 생성 진행 상황 확인 (processing 상태)
- [ ] 6단계 콘텐츠 생성 완료 확인:
  - [ ] 커리큘럼 설계
  - [ ] 수업안 작성
  - [ ] 슬라이드 구성
  - [ ] 실습 템플릿
  - [ ] 평가/퀴즈
  - [ ] 최종 검토
- [ ] 각 단계의 콘텐츠가 우측 패널에 표시되는지 확인

#### 3.5 AI 모델 변경 테스트
- [ ] AI 모델 드롭다운에서 다른 모델 선택 (Gemini → ChatGPT → Claude)
- [ ] 모델 변경 시 stages 자동 새로고침 확인
- [ ] 다른 모델로 재생성 시 기존 stages 삭제 확인
- [ ] 새 모델로 콘텐츠 생성 시작 확인

#### 3.6 권한 테스트
- [ ] 다른 사용자 계정으로 로그인
- [ ] 다른 사용자의 코스에 접근 불가 확인
- [ ] 자신의 코스만 조회 가능 확인

### 4. 개선 사항 (향후 작업)

#### 4.1 DnD (Drag and Drop) 기능
- 모듈/레슨 순서를 드래그 앤 드롭으로 변경
- 라이브러리: `@dnd-kit/core`, `@dnd-kit/sortable`

#### 4.2 모듈/레슨 편집 기능
- 인라인 편집 (제목, 설명 등)
- 모달 또는 인라인 입력 필드

#### 4.3 커리큘럼 자동 생성
- "AI로 커리큘럼 생성" 버튼 구현
- Edge Function `process-course` 구현

#### 4.4 코스 공유 기능
- 코스 공개/비공개 설정
- 공유 링크 생성

### 5. 배포 절차

#### 5.1 마이그레이션 실행
```bash
# 방법 1: Supabase CLI
supabase db push

# 방법 2: Supabase Dashboard
# SQL Editor에서 마이그레이션 파일 내용 실행
```

#### 5.2 코드 배포
```bash
# feature/course-builder 브랜치에서
git checkout feature/course-builder

# 테스트 완료 후 main 브랜치로 머지
git checkout main
git merge feature/course-builder
git push origin main
```

#### 5.3 환경 변수 확인
- Edge Function `process-document`에 다음 환경 변수 설정 확인:
  - `LOVABLE_API_KEY`
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`

### 6. 문제 해결

#### 6.1 마이그레이션 실패 시
- Supabase Dashboard의 Logs 메뉴에서 에러 확인
- `update_updated_at_column()` 함수가 존재하는지 확인
- `has_role()` 함수가 존재하는지 확인

#### 6.2 RLS 정책 오류 시
- Supabase Dashboard의 Authentication > Policies 메뉴에서 정책 확인
- 테이블별 RLS 정책이 올바르게 설정되었는지 확인

#### 6.3 AI 콘텐츠 생성 실패 시
- Edge Function 로그 확인
- API 키 유효성 확인
- 크레딧 부족 여부 확인

### 7. 참고 자료
- Supabase 마이그레이션 가이드: https://supabase.com/docs/guides/cli/local-development#database-migrations
- Supabase RLS 정책: https://supabase.com/docs/guides/auth/row-level-security
- Course Builder 기능 분석: `history/2025-12-06_course-builder-feature-analysis.md`







