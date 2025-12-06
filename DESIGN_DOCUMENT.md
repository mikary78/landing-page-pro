# 시스템 설계문서 (System Design Document)

**프로젝트명**: AI Autopilot - 교육 콘텐츠 자동 생성 플랫폼  
**버전**: 1.0.0  
**작성일**: 2025년 12월 6일  
**최종 수정일**: 2025년 12월 6일

---

## 📑 목차

1. [프로젝트 개요](#1-프로젝트-개요)
2. [시스템 아키텍처](#2-시스템-아키텍처)
3. [데이터베이스 설계](#3-데이터베이스-설계)
4. [프론트엔드 설계](#4-프론트엔드-설계)
5. [백엔드 설계](#5-백엔드-설계)
6. [보안 설계](#6-보안-설계)
7. [개발 정책](#7-개발-정책)
8. [배포 및 운영](#8-배포-및-운영)
9. [개발 히스토리](#9-개발-히스토리)
10. [참고자료](#10-참고자료)

---

## 1. 프로젝트 개요

### 1.1 프로젝트 목적

AI를 활용하여 교육 콘텐츠를 자동으로 생성하는 B2B SaaS 플랫폼입니다. 기존 36시간이 걸리던 콘텐츠 제작 과정을 자동화하여 시간을 획기적으로 단축합니다.

### 1.2 핵심 가치 제안

- **시간 단축**: 브리프부터 배포까지 36시간 → 자동화
- **다중 AI 비교**: Gemini, Claude, ChatGPT 3가지 AI 모델 동시 활용
- **6단계 파이프라인**: 체계적인 콘텐츠 생성 프로세스
- **품질 보장**: AI 결과물 비교 및 피드백 기능

### 1.3 주요 사용자

1. **교육 기관 관리자**: 대학, 교육센터의 콘텐츠 담당자
2. **기업 교육 담당자**: 기업 내 교육/연수 담당 부서
3. **이러닝 제작자**: 온라인 강의 콘텐츠 제작자
4. **교육 콘텐츠 기획자**: 프리랜서 또는 소규모 에이전시

### 1.4 기술 스택

#### 프론트엔드
- **프레임워크**: React 18.3.1 + TypeScript 5.8.3
- **빌드 도구**: Vite 5.4.19
- **UI 라이브러리**: shadcn/ui (Radix UI 기반)
- **스타일링**: Tailwind CSS 3.4.17
- **상태 관리**: React Query (@tanstack/react-query 5.83.0)
- **라우팅**: React Router DOM 6.30.1
- **폼 관리**: React Hook Form 7.61.1 + Zod 3.25.76
- **애니메이션**: Framer Motion 12.23.24

#### 백엔드
- **플랫폼**: Supabase (PostgreSQL 기반)
- **인증**: Supabase Auth
- **데이터베이스**: PostgreSQL with Row Level Security (RLS)
- **Edge Functions**: Deno runtime
- **스토리지**: Supabase Storage

#### AI 서비스
- **Google Gemini**: gemini-2.0-flash
- **Anthropic Claude**: claude-3-5-sonnet-20241022
- **OpenAI ChatGPT**: gpt-4o-mini

#### 개발 도구
- **테스트**: Vitest 4.0.12 + React Testing Library
- **린팅**: ESLint 9.32.0 + TypeScript ESLint
- **타입 체크**: TypeScript (strict mode)
- **버전 관리**: Git + GitHub

---

## 2. 시스템 아키텍처

### 2.1 전체 시스템 구조

```
┌─────────────────────────────────────────────────────────────┐
│                        사용자 (브라우저)                      │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            │ HTTPS
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    프론트엔드 (React + Vite)                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Landing Page │  │  Auth Pages  │  │  Dashboard   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Project List │  │ Project Form │  │ AI Comparison│      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            │ Supabase Client SDK
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Supabase 플랫폼                           │
│  ┌────────────────────────────────────────────────────┐     │
│  │              PostgreSQL Database                    │     │
│  │  - profiles, user_roles                            │     │
│  │  - projects, project_stages, project_ai_results    │     │
│  │  - project_templates                               │     │
│  │  - Row Level Security (RLS) 정책                   │     │
│  └────────────────────────────────────────────────────┘     │
│  ┌────────────────────────────────────────────────────┐     │
│  │              Authentication Service                 │     │
│  │  - Email/Password                                  │     │
│  │  - Google OAuth (예정)                             │     │
│  │  - JWT Token Management                            │     │
│  └────────────────────────────────────────────────────┘     │
│  ┌────────────────────────────────────────────────────┐     │
│  │              Edge Function (Deno)                   │     │
│  │            process-document function                │     │
│  │                                                     │     │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐        │     │
│  │  │  Gemini  │  │  Claude  │  │ ChatGPT  │        │     │
│  │  │ API Call │  │ API Call │  │ API Call │        │     │
│  │  └────┬─────┘  └────┬─────┘  └────┬─────┘        │     │
│  └───────┼─────────────┼─────────────┼───────────────┘     │
└──────────┼─────────────┼─────────────┼─────────────────────┘
           │             │             │
           ▼             ▼             ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│  Google AI   │ │  Anthropic   │ │   OpenAI     │
│  Platform    │ │    API       │ │     API      │
└──────────────┘ └──────────────┘ └──────────────┘
```

### 2.2 데이터 흐름

#### 2.2.1 프로젝트 생성 및 AI 처리 흐름

```
사용자
  │
  ├─ 1. 프로젝트 정보 입력 (BriefWizard)
  │    ├─ 교육 정보 (차시, 기간, 과정명)
  │    ├─ 문서 업로드 (PDF)
  │    └─ AI 모델 선택 (Gemini, Claude, ChatGPT)
  │
  ▼
프론트엔드
  │
  ├─ 2. Supabase Client로 데이터 저장
  │    └─ projects 테이블에 INSERT
  │
  ├─ 3. Edge Function 호출
  │    └─ process-document function
  │
  ▼
Edge Function
  │
  ├─ 4. AI 모델별 병렬 처리
  │    ├─ Gemini API 호출
  │    ├─ Claude API 호출
  │    └─ ChatGPT API 호출
  │
  ├─ 5. 6단계 콘텐츠 생성
  │    ├─ 1단계: 콘텐츠 기획
  │    ├─ 2단계: 시나리오 작성
  │    ├─ 3단계: 이미지 생성
  │    ├─ 4단계: 음성/영상 제작
  │    ├─ 5단계: 콘텐츠 조립
  │    └─ 6단계: 배포
  │
  ├─ 6. 결과 저장
  │    ├─ project_stages 테이블 (각 단계별)
  │    └─ project_ai_results 테이블 (AI 모델별)
  │
  ▼
데이터베이스
  │
  └─ 7. RLS 정책으로 권한 확인 후 저장
       └─ user_id 기반 접근 제어
```

#### 2.2.2 인증 흐름

```
사용자
  │
  ├─ 회원가입 / 로그인
  │
  ▼
Supabase Auth
  │
  ├─ 1. 인증 처리
  │    ├─ 이메일/비밀번호 검증
  │    └─ JWT 토큰 발급
  │
  ├─ 2. Database Trigger 실행
  │    └─ handle_new_user() 함수
  │         ├─ profiles 테이블에 프로필 생성
  │         └─ user_roles 테이블에 'user' 역할 부여
  │
  ▼
프론트엔드
  │
  └─ 3. 토큰 저장 및 상태 관리
       ├─ HttpOnly Cookie (보안)
       └─ useAuth hook으로 상태 관리
```

### 2.3 배포 아키텍처

```
┌─────────────────────────────────────────────────────────┐
│                    GitHub Repository                     │
│  https://github.com/mikary78/landing-page-pro           │
└────────────────────────┬────────────────────────────────┘
                         │
                         │ Git Push
                         ▼
┌─────────────────────────────────────────────────────────┐
│                  Lovable Platform                        │
│  - 자동 빌드 및 배포                                      │
│  - 프리뷰 URL 생성                                        │
└────────────────────────┬────────────────────────────────┘
                         │
                         │ Deploy
                         ▼
┌─────────────────────────────────────────────────────────┐
│              Production Environment                      │
│  - CDN으로 정적 파일 서빙                                 │
│  - Supabase Edge Functions 자동 배포                     │
│  - 환경변수 암호화 관리                                   │
└─────────────────────────────────────────────────────────┘
```

---

## 3. 데이터베이스 설계

### 3.1 ERD (Entity Relationship Diagram)

```
┌──────────────────┐
│   auth.users     │
│  (Supabase Auth) │
└────────┬─────────┘
         │ 1
         │
         │ N
┌────────▼─────────┐         ┌──────────────────┐
│    profiles      │         │   app_role ENUM  │
│ ─────────────────│         │ ─────────────────│
│ • id (PK)        │         │ • admin          │
│ • user_id (FK)   │         │ • moderator      │
│ • display_name   │         │ • user           │
│ • avatar_url     │         └──────────────────┘
└────────┬─────────┘                  ▲
         │ 1                          │
         │                            │
         │ N                          │
┌────────▼─────────┐                  │
│   user_roles     │──────────────────┘
│ ─────────────────│
│ • id (PK)        │
│ • user_id (FK)   │
│ • role           │
└────────┬─────────┘
         │ 1
         │
         │ N
┌────────▼─────────────────────────────┐
│           projects                   │
│ ────────────────────────────────────│
│ • id (PK)                            │
│ • user_id (FK)                       │
│ • document_content                   │
│ • generated_content                  │
│ • status (pending/processing/...)    │
│ • ai_model (gemini/claude/chatgpt)  │
│ • education_session                  │
│ • education_duration                 │
│ • education_course                   │
└────────┬─────────────────────────────┘
         │ 1
         │
         ├─────────────────────┬───────────────────────┐
         │ N                   │ N                     │ N
┌────────▼─────────┐  ┌────────▼──────────┐  ┌───────▼────────────┐
│ project_stages   │  │project_ai_results │  │project_templates   │
│ ────────────────│  │ ──────────────────│  │ ───────────────────│
│ • id (PK)        │  │ • id (PK)         │  │ • id (PK)          │
│ • project_id(FK) │  │ • project_id (FK) │  │ • user_id (FK)     │
│ • stage_name     │  │ • ai_model        │  │ • template_name    │
│ • stage_order    │  │ • generated_      │  │ • description      │
│ • content        │  │   content         │  │ • education_       │
│ • status         │  │ • status          │  │   session          │
│ • feedback       │  │ • created_at      │  │ • education_       │
│ • ai_model       │  │ • updated_at      │  │   duration         │
│ • created_at     │  └───────────────────┘  │ • education_course │
│ • updated_at     │                         │ • ai_model         │
└──────────────────┘                         └────────────────────┘
```

### 3.2 테이블 상세 설계

#### 3.2.1 profiles 테이블

사용자 프로필 정보를 저장합니다.

| 컬럼명 | 타입 | 제약조건 | 설명 |
|--------|------|----------|------|
| id | UUID | PRIMARY KEY | 프로필 고유 ID |
| user_id | UUID | FOREIGN KEY, UNIQUE | auth.users 참조 |
| display_name | TEXT | NULL | 사용자 표시 이름 |
| avatar_url | TEXT | NULL | 아바타 이미지 URL |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | 생성 일시 |
| updated_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | 수정 일시 |

**RLS 정책**:
- 모든 사용자가 다른 사용자의 프로필 조회 가능
- 본인 프로필만 수정/생성 가능

#### 3.2.2 user_roles 테이블

사용자 역할을 관리합니다.

| 컬럼명 | 타입 | 제약조건 | 설명 |
|--------|------|----------|------|
| id | UUID | PRIMARY KEY | 역할 고유 ID |
| user_id | UUID | FOREIGN KEY | auth.users 참조 |
| role | app_role | NOT NULL | admin/moderator/user |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | 생성 일시 |

**UNIQUE 제약**: (user_id, role)

**RLS 정책**:
- 본인 역할만 조회 가능
- admin만 모든 역할 관리 가능

#### 3.2.3 projects 테이블

프로젝트 메타 정보를 저장합니다.

| 컬럼명 | 타입 | 제약조건 | 설명 |
|--------|------|----------|------|
| id | UUID | PRIMARY KEY | 프로젝트 고유 ID |
| user_id | UUID | FOREIGN KEY | profiles.user_id 참조 |
| document_content | TEXT | NULL | 업로드한 문서 내용 |
| generated_content | TEXT | NULL | 생성된 최종 콘텐츠 |
| status | TEXT | NOT NULL, DEFAULT 'pending' | 프로젝트 상태 |
| ai_model | TEXT | NOT NULL, DEFAULT 'gemini' | 사용한 AI 모델 |
| education_session | INTEGER | NULL | 교육 차시 |
| education_duration | TEXT | NULL | 교육 기간 |
| education_course | TEXT | NULL | 과정명 |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | 생성 일시 |
| updated_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | 수정 일시 |

**상태값**:
- `pending`: 대기 중
- `processing`: 처리 중
- `completed`: 완료
- `failed`: 실패
- `partial`: 부분 완료

**RLS 정책**:
- 본인이 생성한 프로젝트만 조회/생성/수정/삭제 가능

#### 3.2.4 project_stages 테이블

프로젝트의 각 단계별 콘텐츠를 저장합니다.

| 컬럼명 | 타입 | 제약조건 | 설명 |
|--------|------|----------|------|
| id | UUID | PRIMARY KEY | 단계 고유 ID |
| project_id | UUID | FOREIGN KEY | projects.id 참조 |
| stage_name | TEXT | NOT NULL | 단계명 |
| stage_order | INTEGER | NOT NULL | 단계 순서 (1-6) |
| content | TEXT | NULL | 생성된 콘텐츠 |
| status | TEXT | NOT NULL, DEFAULT 'pending' | 단계 상태 |
| feedback | TEXT | NULL | 사용자 피드백 |
| ai_model | TEXT | NOT NULL, DEFAULT 'gemini' | 사용한 AI 모델 |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | 생성 일시 |
| updated_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | 수정 일시 |

**6단계 구성**:
1. 콘텐츠 기획
2. 시나리오 작성
3. 이미지 생성
4. 음성/영상 제작
5. 콘텐츠 조립
6. 배포

**인덱스**: (project_id, ai_model)

**RLS 정책**:
- 프로젝트 소유자만 조회/생성/수정/삭제 가능

#### 3.2.5 project_ai_results 테이블

AI 모델별 결과를 저장합니다.

| 컬럼명 | 타입 | 제약조건 | 설명 |
|--------|------|----------|------|
| id | UUID | PRIMARY KEY | 결과 고유 ID |
| project_id | UUID | FOREIGN KEY | projects.id 참조 |
| ai_model | TEXT | NOT NULL | AI 모델명 |
| generated_content | TEXT | NULL | AI가 생성한 전체 콘텐츠 |
| status | TEXT | NOT NULL, DEFAULT 'pending' | 처리 상태 |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | 생성 일시 |
| updated_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | 수정 일시 |

**UNIQUE 제약**: (project_id, ai_model)

**RLS 정책**:
- 프로젝트 소유자만 조회/생성/수정 가능

#### 3.2.6 project_templates 테이블

재사용 가능한 프로젝트 템플릿을 저장합니다.

| 컬럼명 | 타입 | 제약조건 | 설명 |
|--------|------|----------|------|
| id | UUID | PRIMARY KEY | 템플릿 고유 ID |
| user_id | UUID | FOREIGN KEY | profiles.user_id 참조 |
| template_name | TEXT | NOT NULL | 템플릿 이름 |
| description | TEXT | NULL | 템플릿 설명 |
| education_session | INTEGER | NULL | 교육 차시 |
| education_duration | TEXT | NULL | 교육 기간 |
| education_course | TEXT | NULL | 과정명 |
| ai_model | TEXT | NOT NULL, DEFAULT 'gemini' | 기본 AI 모델 |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | 생성 일시 |
| updated_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() | 수정 일시 |

**RLS 정책**:
- 본인이 생성한 템플릿만 조회/생성/수정/삭제 가능

### 3.3 데이터베이스 트리거

#### 3.3.1 handle_new_user()

새 사용자 가입 시 자동으로 프로필과 역할을 생성합니다.

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- 프로필 생성
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'display_name', new.email)
  );
  
  -- 기본 'user' 역할 부여
  INSERT INTO public.user_roles (user_id, role)
  VALUES (new.id, 'user');
  
  RETURN new;
END;
$$;
```

#### 3.3.2 update_updated_at_column()

레코드 수정 시 `updated_at` 컬럼을 자동 갱신합니다.

```sql
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  new.updated_at = now();
  RETURN new;
END;
$$;
```

### 3.4 보안 정책 (Row Level Security)

모든 테이블에 RLS가 활성화되어 있으며, 다음 원칙을 따릅니다:

1. **기본 거부 원칙**: RLS 정책이 없으면 접근 불가
2. **소유자 기반 접근**: `auth.uid() = user_id` 조건으로 본인 데이터만 접근
3. **역할 기반 접근**: `has_role()` 함수로 admin 권한 확인
4. **계층적 접근**: 프로젝트 → 단계 → 결과 순으로 권한 상속

---

## 4. 프론트엔드 설계

### 4.1 컴포넌트 구조

```
src/
├── App.tsx                    # 메인 앱 컴포넌트
├── main.tsx                   # 엔트리 포인트
├── index.css                  # 글로벌 스타일
├── components/                # UI 컴포넌트
│   ├── AuthForm.tsx          # 로그인/회원가입 폼
│   ├── BriefWizard.tsx       # 프로젝트 생성 마법사
│   ├── CTA.tsx               # Call-to-Action 섹션
│   ├── DashboardStats.tsx    # 대시보드 통계
│   ├── Features.tsx          # 기능 소개 섹션
│   ├── Footer.tsx            # 푸터
│   ├── Header.tsx            # 헤더 네비게이션
│   ├── Hero.tsx              # 히어로 섹션
│   ├── InfographicPreview.tsx # 인포그래픽 미리보기
│   ├── Metrics.tsx           # 성과 지표
│   ├── NavLink.tsx           # 네비게이션 링크
│   ├── Personas.tsx          # 사용자 페르소나
│   ├── Pipeline.tsx          # 6단계 파이프라인
│   └── ui/                   # shadcn/ui 기본 컴포넌트
│       ├── button.tsx
│       ├── card.tsx
│       ├── dialog.tsx
│       ├── input.tsx
│       ├── label.tsx
│       ├── select.tsx
│       ├── tabs.tsx
│       ├── toast.tsx
│       └── ... (40+ 컴포넌트)
├── pages/                    # 페이지 컴포넌트
│   ├── Index.tsx            # 랜딩 페이지
│   ├── Auth.tsx             # 로그인/회원가입 페이지
│   ├── Dashboard.tsx        # 대시보드
│   ├── Demo.tsx             # 데모 페이지
│   ├── ProjectCreate.tsx    # 프로젝트 생성
│   ├── ProjectDetail.tsx    # 프로젝트 상세
│   ├── ResetPassword.tsx    # 비밀번호 재설정
│   └── NotFound.tsx         # 404 페이지
├── hooks/                   # 커스텀 훅
│   ├── useAuth.tsx         # 인증 상태 관리
│   ├── useToast.ts         # Toast 알림
│   └── use-mobile.tsx      # 모바일 감지
├── integrations/           # 외부 서비스 통합
│   └── supabase/
│       ├── client.ts       # Supabase 클라이언트
│       └── types.ts        # DB 타입 정의
├── lib/                    # 유틸리티 함수
│   └── utils.ts           # 공통 유틸리티
├── utils/                 # 비즈니스 로직 유틸
│   └── contentSelector.ts # 콘텐츠 선택 로직
└── test/                  # 테스트 설정
    └── setup.ts          # Vitest 설정
```

### 4.2 라우팅 구조

| 경로 | 컴포넌트 | 설명 | 인증 필요 |
|------|----------|------|-----------|
| `/` | Index.tsx | 랜딩 페이지 | ❌ |
| `/auth` | Auth.tsx | 로그인/회원가입 | ❌ |
| `/reset-password` | ResetPassword.tsx | 비밀번호 재설정 | ❌ |
| `/demo` | Demo.tsx | 데모 페이지 | ❌ |
| `/dashboard` | Dashboard.tsx | 대시보드 | ✅ |
| `/project/create` | ProjectCreate.tsx | 프로젝트 생성 | ✅ |
| `/project/:id` | ProjectDetail.tsx | 프로젝트 상세 | ✅ |
| `*` | NotFound.tsx | 404 페이지 | ❌ |

### 4.3 상태 관리 전략

#### 4.3.1 서버 상태 (React Query)

```typescript
// 프로젝트 목록 조회
const { data: projects } = useQuery({
  queryKey: ['projects'],
  queryFn: async () => {
    const { data } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false });
    return data;
  }
});

// 프로젝트 생성
const createProject = useMutation({
  mutationFn: async (project) => {
    const { data } = await supabase
      .from('projects')
      .insert(project)
      .select()
      .single();
    return data;
  },
  onSuccess: () => {
    queryClient.invalidateQueries(['projects']);
  }
});
```

#### 4.3.2 클라이언트 상태 (React Hooks)

- **인증 상태**: `useAuth()` 커스텀 훅
- **폼 상태**: React Hook Form
- **UI 상태**: React useState/useReducer
- **Toast 알림**: `useToast()` 커스텀 훅

### 4.4 디자인 시스템

#### 4.4.1 색상 팔레트

```css
/* Primary Colors */
--primary: 222.2 47.4% 11.2%;
--primary-foreground: 210 40% 98%;

/* Accent Colors */
--accent: 210 40% 96.1%;
--accent-foreground: 222.2 47.4% 11.2%;

/* Success Colors */
--success: 142 76% 36%;
--success-foreground: 355.7 100% 97.3%;

/* Gradient Tokens */
--gradient-primary: linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--accent)) 100%);
--gradient-accent: linear-gradient(135deg, hsl(var(--accent)) 0%, hsl(var(--success)) 100%);
--gradient-hero: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
```

#### 4.4.2 타이포그래피

- **제목 폰트**: System UI, sans-serif
- **본문 폰트**: System UI, sans-serif
- **코드 폰트**: Monospace

#### 4.4.3 간격 시스템

Tailwind CSS의 기본 간격 시스템 사용:
- `p-4`: 1rem (16px)
- `p-8`: 2rem (32px)
- `p-12`: 3rem (48px)

#### 4.4.4 반응형 브레이크포인트

```javascript
screens: {
  'sm': '640px',   // 모바일
  'md': '768px',   // 태블릿
  'lg': '1024px',  // 데스크톱
  'xl': '1280px',  // 큰 화면
  '2xl': '1536px'  // 매우 큰 화면
}
```

### 4.5 성능 최적화

1. **코드 스플리팅**: React.lazy()로 페이지별 분할
2. **이미지 최적화**: WebP 포맷, lazy loading
3. **번들 최적화**: Vite의 자동 트리 쉐이킹
4. **캐싱 전략**: React Query의 staleTime 설정

---

## 5. 백엔드 설계

### 5.1 Supabase Edge Function

#### 5.1.1 process-document Function

**파일**: `supabase/functions/process-document/index.ts`

**목적**: 프로젝트 문서를 AI로 처리하여 6단계 콘텐츠를 생성합니다.

**입력 파라미터**:

```typescript
interface ProcessDocumentRequest {
  projectId: string;           // 프로젝트 ID
  documentContent: string;     // 문서 내용
  aiModel: 'gemini' | 'claude' | 'chatgpt'; // AI 모델
  stageId?: string;           // 재생성할 단계 ID (선택)
  regenerate?: boolean;       // 재생성 여부 (선택)
  retryWithDifferentAi?: boolean; // 다른 AI로 재시도 (선택)
}
```

**출력 형식**:

```typescript
interface ProcessDocumentResponse {
  success: boolean;
  status: 'completed' | 'failed' | 'partial';
  content: string;            // 최종 생성 콘텐츠
  stats: {
    total: number;            // 전체 단계 수
    success: number;          // 성공 단계 수
    failed: number;           // 실패 단계 수
  };
  provider: string;           // 사용한 AI 제공자
  model: string;              // 사용한 모델명
}
```

#### 5.1.2 AI 모델 통합

**Gemini API 호출**:

```typescript
const generateWithGemini = async (
  model: string,
  systemPrompt: string,
  userPrompt: string,
  apiKey: string
): Promise<string> => {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: userPrompt }] }],
      system_instruction: {
        role: "system",
        parts: [{ text: systemPrompt }],
      },
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 2048,
      },
    }),
  });
  
  // 응답 처리
  const data = await response.json();
  return data?.candidates?.[0]?.content?.parts
    ?.map((p: { text?: string }) => p.text || "")
    .join("")
    .trim() || "";
};
```

**참고자료**: [Google AI for Developers - Gemini API](https://ai.google.dev/docs)

**Claude API 호출**:

```typescript
const generateWithClaude = async (
  model: string,
  systemPrompt: string,
  userPrompt: string,
  apiKey: string
): Promise<string> => {
  const url = "https://api.anthropic.com/v1/messages";
  
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: model,
      max_tokens: 2048,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: userPrompt,
        },
      ],
    }),
  });
  
  const data = await response.json();
  return data?.content
    ?.filter((block: { type: string }) => block.type === "text")
    .map((block: { text: string }) => block.text)
    .join("")
    .trim() || "";
};
```

**참고자료**: [Anthropic API Documentation](https://docs.anthropic.com/claude/reference/getting-started-with-the-api)

**ChatGPT API 호출**:

```typescript
const generateWithChatGPT = async (
  model: string,
  systemPrompt: string,
  userPrompt: string,
  apiKey: string
): Promise<string> => {
  const url = "https://api.openai.com/v1/chat/completions";
  
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: model,
      max_tokens: 2048,
      temperature: 0.7,
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: userPrompt,
        },
      ],
    }),
  });
  
  const data = await response.json();
  return data?.choices?.[0]?.message?.content?.trim() || "";
};
```

**참고자료**: [OpenAI API Reference](https://platform.openai.com/docs/api-reference)

#### 5.1.3 재시도 로직

```typescript
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

const generateContent = async (
  provider: AIProvider,
  systemPrompt: string,
  userPrompt: string,
  apiKey: string
): Promise<string> => {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`[${provider}] Attempt ${attempt}/${MAX_RETRIES}`);
      
      // AI 모델별 호출
      let result: string;
      switch (provider) {
        case "gemini":
          result = await generateWithGemini(/*...*/);
          break;
        case "claude":
          result = await generateWithClaude(/*...*/);
          break;
        case "chatgpt":
          result = await generateWithChatGPT(/*...*/);
          break;
      }
      
      return result;
    } catch (error) {
      lastError = error;
      if (attempt < MAX_RETRIES) {
        await sleep(RETRY_DELAY * attempt); // 지수 백오프
      }
    }
  }
  
  throw lastError;
};
```

#### 5.1.4 타임아웃 처리

```typescript
const REQUEST_TIMEOUT = 60000; // 60초

const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

try {
  const response = await fetch(url, {
    method: "POST",
    headers: headers,
    body: JSON.stringify(body),
    signal: controller.signal, // 타임아웃 시그널 연결
  });
  
  clearTimeout(timeoutId);
  // 응답 처리
} finally {
  clearTimeout(timeoutId);
}
```

### 5.2 환경변수 관리

**필수 환경변수**:

```bash
# Supabase
FUNCTION_SUPABASE_URL=https://your-project.supabase.co
FUNCTION_SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# AI API Keys
VERTEX_API_KEY=your-gemini-api-key
ANTHROPIC_API_KEY=your-claude-api-key
OPENAI_API_KEY=your-chatgpt-api-key
```

**보안 원칙**:
- 환경변수는 Supabase Secrets로 암호화 저장
- 코드에 절대 하드코딩 금지
- `.env` 파일은 Git에 커밋하지 않음

---

## 6. 보안 설계

### 6.1 보안 원칙

본 프로젝트는 **한국 개인정보보호법** 및 **ISMS-P** 수준의 보안을 준수합니다.

#### 6.1.1 최소 권한 원칙

- 사용자는 본인 데이터만 접근 가능
- RLS 정책으로 데이터베이스 레벨에서 강제
- API 키는 서버 측에서만 관리

#### 6.1.2 Defense in Depth (다층 방어)

```
┌─────────────────────────────────────┐
│  1. 프론트엔드 검증 (UX)           │
├─────────────────────────────────────┤
│  2. API Gateway (CORS)              │
├─────────────────────────────────────┤
│  3. Edge Function 검증 (비즈니스)   │
├─────────────────────────────────────┤
│  4. Database RLS (데이터)           │
├─────────────────────────────────────┤
│  5. 암호화 (저장/전송)              │
└─────────────────────────────────────┘
```

### 6.2 인증 보안

#### 6.2.1 비밀번호 정책

- **해싱**: BCrypt (Supabase Auth 기본)
- **최소 길이**: 6자 이상 (권장: 8자 이상)
- **로그 금지**: 비밀번호는 로그에 절대 기록하지 않음

#### 6.2.2 세션 관리

- **JWT 토큰**: HttpOnly Cookie로 전송
- **토큰 갱신**: Refresh Token 패턴
- **만료 시간**: Access Token 1시간, Refresh Token 7일

### 6.3 API 보안

#### 6.3.1 CORS 설정

```typescript
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};
```

#### 6.3.2 Rate Limiting

Supabase의 기본 Rate Limit 적용:
- 인증된 요청: 분당 100회
- 익명 요청: 분당 10회

### 6.4 데이터 보안

#### 6.4.1 민감정보 처리

```typescript
// ❌ 잘못된 예: 환경변수명 노출
throw new Error(`Missing environment variable: ${name}`);

// ✅ 올바른 예: 일반 메시지만 전달
console.error(`[Security] Missing required configuration: ${name}`);
throw new Error(`Missing required configuration. Please check server settings.`);
```

**참고자료**: [OWASP - Improper Error Handling](https://owasp.org/www-community/Improper_Error_Handling)

#### 6.4.2 로그 보안

```typescript
// ❌ 잘못된 예: 민감정보 로그 노출
console.log(`Using model: ${AI_CONFIG[provider].model}`);
console.log("Request:", req.body);

// ✅ 올바른 예: 최소 정보만 기록
console.log(`[Process] AI provider initialized: ${provider}`);
console.log("[Request] Processing request:", {
  projectId: projectId ? "provided" : "missing",
  aiModel: aiModel || "none",
});
```

#### 6.4.3 에러 메시지 일반화

```typescript
// ❌ 잘못된 예: 상세 에러 노출
return new Response(
  JSON.stringify({ 
    error: "Failed to create project", 
    details: createError // 데이터베이스 에러 노출
  }),
  { status: 500 }
);

// ✅ 올바른 예: 일반 메시지만 전달
console.error("[Error] Failed to create project:", createError); // 내부 로그만
return new Response(
  JSON.stringify({ 
    error: "프로젝트 생성에 실패했습니다. 잠시 후 다시 시도해주세요." 
  }),
  { status: 500 }
);
```

### 6.5 파일 업로드 보안

#### 6.5.1 허용 파일 타입

```typescript
const ALLOWED_FILE_TYPES = ['application/pdf'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// 파일 검증
const validateFile = (file: File): boolean => {
  if (!ALLOWED_FILE_TYPES.includes(file.type)) {
    throw new Error('PDF 파일만 업로드 가능합니다.');
  }
  if (file.size > MAX_FILE_SIZE) {
    throw new Error('파일 크기는 10MB 이하여야 합니다.');
  }
  return true;
};
```

#### 6.5.2 파일명 보안

```typescript
// ❌ 잘못된 예: 원본 파일명 그대로 사용
const filePath = `uploads/${originalFileName}`;

// ✅ 올바른 예: UUID로 파일명 생성
const filePath = `uploads/${crypto.randomUUID()}.pdf`;
```

### 6.6 보안 테스트

**파일**: `supabase/functions/process-document/index.test.ts`

- 환경변수 누락 테스트
- 에러 응답 민감정보 노출 테스트
- 로그 출력 보안 테스트
- 보안 원칙 준수 검증

**실행 방법**:
```bash
deno test supabase/functions/process-document/index.test.ts
```

---

## 7. 개발 정책

### 7.1 개발 원칙

**참고**: `DEV_POLICY.md` 파일 참조

#### 7.1.1 언어

- 모든 응답과 문서는 **한국어**로 작성
- 코드 주석도 한국어 권장
- 사용자 대면 메시지는 100% 한국어

#### 7.1.2 출처 명시

```typescript
// ✅ 좋은 예: 출처 명시
/**
 * AI 콘텐츠 생성 함수
 * 
 * 참고자료:
 * - Google Gemini API: https://ai.google.dev/docs
 * - Anthropic Claude API: https://docs.anthropic.com/claude/reference
 * - OpenAI API: https://platform.openai.com/docs/api-reference
 */
const generateContent = async (/*...*/) => {
  // 구현 내용
};
```

#### 7.1.3 테스트 코드 작성

새로운 기능 구현 시 반드시 테스트 코드를 함께 작성합니다.

```typescript
// 기능 구현
export const contentSelector = (/*...*/) => {
  // 구현 내용
};

// 테스트 코드
describe('contentSelector', () => {
  it('should select correct content', () => {
    // 테스트 내용
  });
});
```

### 7.2 브랜치 전략

#### 7.2.1 브랜치 명명 규칙

```
feature/기능명        # 신기능 구현
fix/버그명            # 버그 수정
chore/작업명          # 기타 작업
refactor/리팩토링명   # 코드 개선
docs/문서명           # 문서 작업
test/테스트명         # 테스트 작성
```

#### 7.2.2 중대한 변경 기준

다음 경우 반드시 새 브랜치를 생성합니다:

1. **신기능 구현**: 새로운 페이지, 컴포넌트, API 추가
2. **DB 구조 수정**: 테이블 추가/수정, 마이그레이션
3. **UI 레이아웃 대규모 변경**: 전체 디자인 시스템 변경

### 7.3 커밋 메시지 규칙

```
제목: 간단한 변경 요약 (50자 이내)

[사용자 요구사항]
- 사용자가 요청한 내용

[AI 답변 내용]
- 개발자가 답한 내용
- 구현 계획

[수정 내용 요약]
수정된 파일:
- 파일1: 변경 내용
- 파일2: 변경 내용

신규 파일:
- 파일3: 추가 이유

참고자료:
- 출처 URL
```

### 7.4 코드 리뷰 체크리스트

- [ ] 보안: 민감정보 노출 없음
- [ ] 성능: 불필요한 렌더링/쿼리 없음
- [ ] 테스트: 테스트 코드 작성 완료
- [ ] 문서: 주석 및 문서화 완료
- [ ] 접근성: ARIA 속성 적용
- [ ] 반응형: 모바일/태블릿/데스크톱 확인

### 7.5 History 문서화

**위치**: `history/` 폴더

**문서 형식**:

```markdown
# [날짜] - [변경 제목]

## 사용자 요구사항
- 사용자가 요청한 내용

## 구현 답변
- 개발자가 답한 내용

## 수정 내역 요약
- 실제 수정된 파일 및 내용

## 테스트
- 구현한 기능의 테스트 코드 위치

## 참고자료
- 출처 URL
```

---

## 8. 배포 및 운영

### 8.1 개발 환경 설정

#### 8.1.1 Windows 환경

```powershell
# 1. Node.js 설치 (nvm 사용 권장)
nvm install 18
nvm use 18

# 2. 프로젝트 클론
git clone https://github.com/mikary78/landing-page-pro.git
cd landing-page-pro

# 3. 의존성 설치
npm ci

# 4. 환경변수 설정
cp .env.example .env
# .env 파일 편집

# 5. 개발 서버 실행
npm run dev

# 6. Supabase 로컬 환경 (선택)
supabase start
supabase functions serve --env-file .env
```

#### 8.1.2 Ubuntu 환경

```bash
# 1. Node.js 설치 (nvm 사용)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 18
nvm use 18

# 2. 프로젝트 클론
git clone https://github.com/mikary78/landing-page-pro.git
cd landing-page-pro

# 3. 의존성 설치
npm ci

# 4. 환경변수 설정
cp .env.example .env
nano .env  # 또는 vim .env

# 5. 개발 서버 실행
npm run dev

# 6. Supabase CLI 설치 (선택)
brew install supabase/tap/supabase
# 또는
npm install -g supabase

supabase start
supabase functions serve --env-file .env
```

### 8.2 배포 프로세스

#### 8.2.1 프론트엔드 배포

```bash
# 1. 빌드
npm run build

# 2. Lovable을 통한 자동 배포
# Git push만 하면 자동 배포됨
git push origin main

# 또는 수동 배포 (Vercel, Netlify 등)
# Vercel
vercel --prod

# Netlify
netlify deploy --prod
```

#### 8.2.2 Edge Function 배포

```bash
# 1. Supabase 프로젝트 연결
supabase link --project-ref your-project-ref

# 2. Edge Function 배포
supabase functions deploy process-document

# 3. 환경변수 설정 (Supabase Dashboard)
# - VERTEX_API_KEY
# - ANTHROPIC_API_KEY
# - OPENAI_API_KEY
# - FUNCTION_SUPABASE_URL
# - FUNCTION_SUPABASE_SERVICE_ROLE_KEY
```

#### 8.2.3 데이터베이스 마이그레이션

```bash
# 로컬에서 마이그레이션 생성
supabase migration new migration_name

# 마이그레이션 적용
supabase db push

# 또는 Supabase Dashboard에서 SQL Editor 사용
```

### 8.3 모니터링

#### 8.3.1 로그 확인

```bash
# Edge Function 로그
supabase functions logs process-document --tail

# 데이터베이스 로그
# Supabase Dashboard > Logs 메뉴
```

#### 8.3.2 성능 모니터링

- **프론트엔드**: Lighthouse, Web Vitals
- **백엔드**: Supabase Dashboard 메트릭
- **AI API**: 각 제공자의 Usage Dashboard

### 8.4 백업 및 복구

#### 8.4.1 데이터베이스 백업

```bash
# 백업
pg_dump -h db.your-project.supabase.co -U postgres -d postgres > backup.sql

# 복구
psql -h db.your-project.supabase.co -U postgres -d postgres < backup.sql
```

#### 8.4.2 스토리지 백업

- Supabase Storage는 자동 백업됨
- 중요 파일은 별도 S3 등에 백업 권장

---

## 9. 개발 히스토리

### 9.1 주요 마일스톤

| 날짜 | 이벤트 | 설명 |
|------|--------|------|
| 2024-11-20 | 프로젝트 시작 | 랜딩페이지 초기 구현 |
| 2024-11-20 | Lovable Cloud 활성화 | Supabase 백엔드 연결 |
| 2024-11-20 | 테스트 환경 구축 | Vitest + React Testing Library |
| 2025-11-22 | 개발 정책 도입 | DEV_POLICY.md 작성 |
| 2025-12-06 | 보안 강화 | 로그 및 에러 메시지 보안 개선 |

### 9.2 상세 히스토리

#### 2024-11-20: 초기 랜딩페이지

**파일**: `history/2024-11-20_initial-landing-page.md`

- 전문적인 B2B SaaS 디자인 시스템 구축
- Hero, Features, Pipeline, Personas, Metrics, CTA 섹션 구현
- 반응형 레이아웃 및 SEO 최적화

#### 2024-11-20: Lovable Cloud 활성화

**파일**: `history/2024-11-20_cloud-activation.md`

- Supabase 프로젝트 생성 및 연결
- 데이터베이스, 인증, 스토리지, Edge Functions 활성화

#### 2024-11-20: 테스트 프레임워크

**파일**: `history/2024-11-20_test-framework-setup.md`

- Vitest + React Testing Library 환경 구축
- Button 컴포넌트 예시 테스트 작성
- history 폴더 구조 생성

#### 2025-11-22: 개발 정책 도입

**파일**: `history/2025-11-22_dev-policy-adoption.md`

- 한국어 응답, 출처 표기, 테스트 코드 포함 정책
- 중대한 변경 시 브랜치 분기 및 문서화

#### 2025-12-06: 보안 강화

**파일**: `history/2025-12-06_security-logging-improvements.md`

- 환경변수 노출 방지
- 로그 민감정보 제거
- 에러 메시지 일반화
- 보안 테스트 코드 작성

---

## 10. 참고자료

### 10.1 공식 문서

#### 프론트엔드
- **React**: https://react.dev/
- **TypeScript**: https://www.typescriptlang.org/
- **Vite**: https://vitejs.dev/
- **Tailwind CSS**: https://tailwindcss.com/
- **shadcn/ui**: https://ui.shadcn.com/
- **React Query**: https://tanstack.com/query/latest

#### 백엔드
- **Supabase**: https://supabase.com/docs
- **PostgreSQL**: https://www.postgresql.org/docs/
- **Deno**: https://deno.land/manual

#### AI 서비스
- **Google Gemini**: https://ai.google.dev/docs
- **Anthropic Claude**: https://docs.anthropic.com/claude/reference
- **OpenAI**: https://platform.openai.com/docs/api-reference

### 10.2 보안 가이드

- **OWASP Top 10**: https://owasp.org/www-project-top-ten/
- **OWASP Improper Error Handling**: https://owasp.org/www-community/Improper_Error_Handling
- **한국 개인정보보호법**: https://www.law.go.kr/
- **ISMS-P 인증기준**: https://isms.kisa.or.kr/

### 10.3 디자인 참고

- **Notion**: https://www.notion.so/
- **Linear**: https://linear.app/
- **Figma**: https://www.figma.com/

### 10.4 프로젝트 링크

- **GitHub Repository**: https://github.com/mikary78/landing-page-pro
- **Lovable Project**: https://lovable.dev/projects/910b934b-623e-4523-afa8-076ea8f4bbc6
- **Production URL**: (배포 후 업데이트 필요)

---

## 부록 A: 용어 사전

| 용어 | 설명 |
|------|------|
| **RLS** | Row Level Security, PostgreSQL의 행 단위 보안 정책 |
| **Edge Function** | 서버리스 함수, Deno 런타임으로 실행 |
| **JWT** | JSON Web Token, 인증 토큰 표준 |
| **CORS** | Cross-Origin Resource Sharing, 교차 출처 리소스 공유 |
| **shadcn/ui** | Radix UI 기반의 React 컴포넌트 라이브러리 |
| **Vitest** | Vite 기반 테스트 프레임워크 |

---

## 부록 B: 트러블슈팅

### B.1 개발 환경 문제

**문제**: `npm install` 실패

```bash
# 해결: 캐시 삭제 후 재설치
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

**문제**: Supabase 연결 실패

```bash
# 해결: 환경변수 확인
echo $VITE_SUPABASE_URL
echo $VITE_SUPABASE_ANON_KEY

# .env 파일 확인
cat .env
```

### B.2 배포 문제

**문제**: Edge Function 타임아웃

```bash
# 해결: REQUEST_TIMEOUT 값 조정
# supabase/functions/process-document/index.ts
const REQUEST_TIMEOUT = 30000; // 60초 → 30초
```

**문제**: RLS 정책 오류

```sql
-- 해결: 정책 재생성
DROP POLICY IF EXISTS "policy_name" ON table_name;
CREATE POLICY "policy_name" ON table_name FOR SELECT USING (/*...*/);
```

---

## 부록 C: FAQ

**Q: 로컬에서 Edge Function을 테스트하려면?**

A: Supabase CLI를 사용합니다:
```bash
supabase start
supabase functions serve --env-file .env
```

**Q: 새로운 AI 모델을 추가하려면?**

A: 
1. `AI_CONFIG` 객체에 모델 정보 추가
2. 해당 AI의 API 호출 함수 구현
3. `generateContent` 함수의 switch 문에 케이스 추가
4. 환경변수 추가

**Q: 데이터베이스 스키마를 변경하려면?**

A:
```bash
supabase migration new your_migration_name
# SQL 작성
supabase db push
```

---

**End of Document**

---

본 문서는 프로젝트의 전체 설계를 포괄적으로 설명하며, 새로운 개발자가 프로젝트를 이해하고 참여하는 데 필요한 모든 정보를 포함합니다.

**작성자**: AI Autopilot  
**검토자**: (추후 업데이트)  
**버전 관리**: Git을 통해 이 문서의 변경 이력을 추적합니다.

