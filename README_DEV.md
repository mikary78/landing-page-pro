# Local development (로컬 개발)

## 1. 의존성 설치
```
cd <YOUR_PROJECT_NAME>
npm ci
```

## 2. 환경 변수 설정
`.env.example`을 복사해 `.env`를 만들고 실제 값을 채워주세요.
```
cp .env.example .env
# VITE_SUPABASE_URL=https://your-project.supabase.co
# VITE_SUPABASE_ANON_KEY=public-anon-key
```

## 3. 개발 서버 실행
```
npm run dev
```

## 4. 테스트 / 타입 / 린트
```
npm run test        # Vitest UI
npm run test:run    # CI/헤드리스 실행
npm run typecheck   # 타입 검사
npm run lint        # 린트 확인
npm run lint:fix    # 린트 자동 수정
```

## Supabase 준비
- 마이그레이션 적용: Supabase CLI로 `supabase db push` (또는 필요한 방식으로 `supabase/migrations` 반영)
- Edge Function 배포: `supabase functions deploy process-document` 후 프로젝트 대시보드에서 환경변수 설정
  - `LOVABLE_API_KEY`
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
- 로컬에서 함수 테스트 시 `supabase start` + `supabase functions serve --env-file .env` 사용 가능

## 원격 권한 문제
원격 저장소에 푸시할 때 `403`이 나면 SSH 키를 등록하거나 Personal Access Token(PAT)을 사용해 보세요.

---
추가 안내가 필요하면 `README.md`도 함께 확인하세요.
