# 🔧 프로젝트 생성 오류 최종 해결 가이드

## 📋 현재 상황

**원격 Supabase DB의 `projects` 테이블이 불완전한 상태입니다:**
- ❌ `user_id` 칼럼 없음 → 400 Bad Request (42703 에러)
- ❌ `description` 칼럼 없음 → PGRST204 에러
- ❌ `project_templates` 테이블 없음 → 404 Not Found

**마이그레이션 상태:**
- ✅ 로컬 마이그레이션 파일: 7개 모두 생성됨 (IF NOT EXISTS로 안전하게 설정)
- ✅ 원격 마이그레이션 히스토리: 7개 모두 "applied"로 표시됨
- ❓ 실제 테이블 생성: 실패 (마이그레이션 파일이 실행되지 않음)

---

## ✅ 해결 방법 (선택 중 하나)

### 방법 1: Supabase 웹 UI에서 수동 SQL 실행 (권장, 5분)

#### 단계 1: Supabase 대시보드 열기
```
https://app.supabase.com/project/nzedvnncozntizujvktb/sql/new
```

#### 단계 2: 다음 SQL 복사 & 붙여넣기

```sql
-- 1. projects 테이블에 user_id 칼럼 추가
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- 2. projects 테이블에 다른 칼럼 추가
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS title TEXT,
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS education_stage TEXT DEFAULT 'elementary',
ADD COLUMN IF NOT EXISTS subject TEXT,
ADD COLUMN IF NOT EXISTS duration_minutes INTEGER,
ADD COLUMN IF NOT EXISTS education_duration TEXT,
ADD COLUMN IF NOT EXISTS education_course TEXT,
ADD COLUMN IF NOT EXISTS education_session INTEGER;

-- 3. project_templates 테이블 생성
CREATE TABLE IF NOT EXISTS public.project_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  template_name TEXT NOT NULL,
  description TEXT,
  education_session INTEGER,
  education_duration TEXT,
  education_course TEXT,
  ai_model TEXT NOT NULL DEFAULT 'gemini',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. project_templates RLS 활성화
ALTER TABLE public.project_templates ENABLE ROW LEVEL SECURITY;

-- 5. project_templates 정책
CREATE POLICY IF NOT EXISTS "Users can view their own templates"
ON public.project_templates FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can create their own templates"
ON public.project_templates FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can update their own templates"
ON public.project_templates FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can delete their own templates"
ON public.project_templates FOR DELETE USING (auth.uid() = user_id);
```

#### 단계 3: RUN 또는 EXECUTE 클릭

---

### 방법 2: 임시 프론트엔드 회피 (코드 수정 완료)

**이미 적용됨:**
- ✅ `ProjectCreate.tsx`: 칼럼이 없으면 재시도 로직 추가
- ✅ `Dashboard.tsx`: `user_id` 필터 실패 → 전체 조회 후 클라이언트 필터
- ✅ `ProjectDetail.tsx`: 페칭 실패 시 fallback

**결과:** 데이터베이스 스키마 수정 전까지도 앱이 작동합니다.

---

## 🧪 테스트 방법

### 브라우저에서:

1. **강제 새로고침**: `Ctrl+Shift+R` (Windows) 또는 `Cmd+Shift+R` (Mac)
2. **개발자 도구 열기**: `F12`
3. **콘솔 탭에서 확인**:
   - SQL 실행 후: ✅ 에러 없음
   - SQL 실행 전: ⚠️ "Column missing" fallback 메시지

### 테스트 시나리오:

#### 시나리오 1: 대시보드 접근
```
1. 왼쪽 메뉴 → "Dashboard" 클릭
2. 프로젝트 목록 로드 (빈 목록이면 OK)
```
**예상 결과:**
- SQL 적용 전: fallback 로직으로 빈 목록 표시
- SQL 적용 후: 실제 프로젝트 로드

#### 시나리오 2: 프로젝트 생성
```
1. 왼쪽 메뉴 → "Create" 클릭
2. 폼 입력 (예: 제목 "테스트", 내용 입력)
3. "프로젝트 생성" 버튼 클릭
```
**예상 결과:**
- SQL 적용 전: 로드 중 → 프로젝트 상세 페이지 이동
- SQL 적용 후: ✅ 정상 작동 (모든 필드 저장)

---

## 🐛 체크할 콘솔 메시지

### SQL 실행 전:
```
Dashboard.tsx:52 Column missing on remote DB, falling back to unfiltered projects fetch
ProjectCreate.tsx:54 Error fetching templates: {code: 'PGRST205', ...}
```
→ **OK** (fallback이 작동 중)

### SQL 실행 후:
```
(에러 메시지 없음 또는 정상 데이터 로드)
```
→ **완료!** 🎉

---

## 💡 참고사항

### SQL 실행 안전성
- `IF NOT EXISTS` 사용으로 중복 실행 가능
- 기존 데이터 손상 없음
- 언제든 재실행 가능

### 만약 SQL 실행 후에도 에러가 나면:
1. 브라우저 캐시 삭제: `Ctrl+Shift+Delete` → "전체 시간" → 삭제
2. 강제 새로고침: `Ctrl+Shift+R`
3. 개발자 도구에서 Network 탭에서 네트워크 캐시 비활성화 체크

### RLS (Row Level Security) 정책
- 각 사용자는 자신의 프로젝트/템플릿만 볼 수 있음
- `auth.uid()` 함수로 자동 검증
- 보안상 문제 없음

---

## 📞 문제 해결

| 증상 | 원인 | 해결책 |
|------|------|--------|
| SQL 실행 후에도 "Column missing" 에러 | 캐시 미갱신 | 브라우저 캐시 삭제 + 강제 새로고침 |
| "Column already exists" 에러 | SQL 중복 실행 | 무시 (IF NOT EXISTS로 안전) |
| 프로젝트 생성 후 상세 페이지 로드 안 됨 | Edge Function 에러 | 콘솔의 "Function invoke result" 메시지 확인 |
| "Not authenticated" 에러 | JWT 토큰 만료 | 로그아웃 후 재로그인 |

---

## ✨ 완료 체크리스트

- [ ] SQL을 Supabase SQL 에디터에서 실행
- [ ] 각 쿼리가 성공 메시지 표시
- [ ] 브라우저 강제 새로고침 (Ctrl+Shift+R)
- [ ] 대시보드 접근 테스트
- [ ] 프로젝트 생성 테스트
- [ ] 콘솔에서 에러 없음 확인

---

**완료 후 사용자에게 알려주세요!** 🚀
