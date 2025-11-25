# Local development (로컬 개발)

## 1. 환경 복사 및 의존성 설치
```
cd <YOUR_PROJECT_NAME>
npm ci
```

## 2. 환경 변수 설정
루트에 `.env.example`이 있으니 복사하여 `.env`로 만드세요:
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=public-anon-key
```

## 3. 개발 서버 실행
```
npm run dev
```

## 4. 테스트, 타입 검사, 린트
```
npm run test        # 인터랙티브 테스트 UI
npm run test:run    # CI/자동 실행용
npm run typecheck   # 타입 검사
npm run lint        # 린트 확인
npm run lint:fix    # 린트 자동 수정
```

## 푸시 권한 문제
원격에 푸시할 때 `403` 권한 오류가 나오면 SSH 키 설정 또는 Personal Access Token(PAT) 사용을 권장합니다.

---
이 파일은 로컬 개발 시작 가이드를 빠르게 안내하기 위한 별도 문서입니다. 원하시면 `README.md`에 통합해 드리겠습니다.
