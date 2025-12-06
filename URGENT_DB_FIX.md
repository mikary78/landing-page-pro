# 🚨 긴급: 데이터베이스 스키마 수정

## 상황
현재 원격 Supabase DB의 `projects` 테이블에 **필수 칼럼들이 누락**되어 있습니다:
- ❌ `user_id` 칼럼 없음
- ❌ `description` 칼럼 없음
- ❌ `project_templates` 테이블 없음

**마이그레이션 repair만으로는 실제 테이블이 생성되지 않습니다.**

## 🔧 해결책 (3분)

### 1단계: Supabase SQL 에디터 열기
**https://app.supabase.com/project/nzedvnncozntizujvktb/sql/new**

### 2단계: 다음 SQL을 복사해서 붙여넣고 실행

```sql
-- 1. projects 테이블에 user_id 칼럼 추가
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- 2. projects 테이블에 다른 누락된 칼럼 추가
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

-- 5. project_templates 정책 생성
CREATE POLICY IF NOT EXISTS "Users can view their own templates"
ON public.project_templates FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can create their own templates"
ON public.project_templates FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can update their own templates"
ON public.project_templates FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can delete their own templates"
ON public.project_templates FOR DELETE
USING (auth.uid() = user_id);

-- 6. project_stages 테이블 존재 확인 및 필요한 칼럼 추가
ALTER TABLE IF EXISTS public.project_stages
ADD COLUMN IF NOT EXISTS ai_model TEXT DEFAULT 'gemini';

-- 7. project_ai_results 테이블 생성
CREATE TABLE IF NOT EXISTS public.project_ai_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  ai_model TEXT NOT NULL,
  generated_content TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(project_id, ai_model)
);

-- 8. project_ai_results RLS 활성화
ALTER TABLE IF EXISTS public.project_ai_results ENABLE ROW LEVEL SECURITY;
```

### 3단계: RUN 버튼 클릭
Supabase SQL 에디터에서 **RUN** 또는 **Execute** 버튼을 클릭합니다.

성공하면:
- ✅ 모든 칼럼이 추가됨
- ✅ project_templates 테이블이 생성됨
- ✅ RLS 정책이 설정됨

### 4단계: 브라우저 새로고침
1. 브라우저에서 **Ctrl+Shift+R** (강제 새로고침)
2. 개발자 도구 (F12) 에서 콘솔 확인
3. 대시보드 또는 프로젝트 생성 페이지 테스트

## ✅ 예상 결과
- 대시보드에서 프로젝트 목록 로드 (또는 빈 목록)
- 프로젝트 생성 페이지가 정상 작동
- 새 프로젝트 생성 가능

## 💡 주의사항
- SQL을 여러 번 실행해도 안전합니다 (`IF NOT EXISTS` 사용)
- 기존 데이터는 손상되지 않습니다
- RLS 정책은 users 테이블의 `auth.uid()` 함수를 사용합니다

---

**이 단계를 완료한 후, 브라우저에서 테스트 결과를 알려주세요.**
