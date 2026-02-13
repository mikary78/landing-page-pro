# Local development (로컬 개발)

## 0. 개발 환경 구축

### Windows 환경

#### Node.js 설치 (nvm-windows 사용)

Windows에서는 `nvm-windows`를 사용하여 Node.js 버전을 관리합니다.

**설치 방법:**

1. **nvm-windows 다운로드 및 설치**
   - GitHub 릴리즈 페이지에서 최신 버전 다운로드: https://github.com/coreybutler/nvm-windows/releases
   - `nvm-setup.exe` 파일을 다운로드하여 실행
   - 설치 완료 후 **PowerShell을 관리자 권한으로 재시작**

2. **설치 확인**
   ```powershell
   nvm version
   ```

3. **Node.js 설치**
   ```powershell
   # LTS 버전 설치 (권장)
   nvm install lts
   
   # 또는 특정 버전 설치 (예: 20.x)
   nvm install 20.11.0
   
   # 설치된 버전 사용
   nvm use 20.11.0
   ```

4. **설치 확인**
   ```powershell
   node --version
   npm --version
   ```

**nvm이 설치되어 있지만 명령어를 인식하지 못하는 경우:**

nvm-windows가 설치되어 있지만 (`C:\Users\<사용자명>\AppData\Local\nvm`) PowerShell에서 `nvm` 명령어를 인식하지 못하는 경우:

1. **현재 세션에서 임시로 사용하기:**
   ```powershell
   # PATH에 nvm 추가
   $env:PATH += ";C:\Users\<사용자명>\AppData\Local\nvm"
   
   # 환경 변수 설정 (필요한 경우)
   $env:NVM_HOME = "C:\Users\<사용자명>\AppData\Local\nvm"
   $env:NVM_SYMLINK = "C:\Program Files\nodejs"
   
   # nvm 확인
   nvm version
   nvm list
   nvm use <버전>
   ```

2. **영구적으로 설정하기 (PowerShell 프로필에 추가):**
   ```powershell
   # PowerShell 프로필 경로 확인
   $PROFILE
   
   # 프로필이 없으면 생성
   if (!(Test-Path -Path $PROFILE)) {
       New-Item -ItemType File -Path $PROFILE -Force
   }
   
   # 프로필에 다음 내용 추가 (Notepad로 편집)
   notepad $PROFILE
   ```
   
   프로필에 추가할 내용:
   ```powershell
   # nvm-windows 설정
   $env:NVM_HOME = "$env:LOCALAPPDATA\nvm"
   $env:NVM_SYMLINK = "C:\Program Files\nodejs"
   $env:PATH = "$env:NVM_HOME;$env:NVM_SYMLINK;$env:PATH"
   ```

3. **시스템 환경 변수 확인:**
   - Windows 설정 > 시스템 > 고급 시스템 설정 > 환경 변수
   - 사용자 변수에 `NVM_HOME`과 `NVM_SYMLINK`가 있는지 확인
   - PATH에 `%NVM_HOME%`과 `%NVM_SYMLINK%`가 포함되어 있는지 확인

**참고:**
- nvm-windows는 Linux/Mac의 nvm과 다른 프로젝트입니다
- 출처: https://github.com/coreybutler/nvm-windows
- 설치 후 PowerShell을 재시작해야 PATH가 업데이트됩니다

#### 대안: Node.js 직접 설치

nvm-windows 대신 Node.js를 직접 설치할 수도 있습니다:
- 공식 사이트: https://nodejs.org/
- LTS 버전 다운로드 및 설치

### Ubuntu/Linux 환경

#### Node.js 설치 (nvm 사용)

1. **nvm 설치**
   ```bash
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
   # 또는
   wget -qO- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
   ```

2. **셸 재시작 또는 소스 적용**
   ```bash
   source ~/.bashrc
   # 또는
   source ~/.zshrc
   ```

3. **Node.js 설치**
   ```bash
   # LTS 버전 설치
   nvm install --lts
   nvm use --lts
   ```

4. **설치 확인**
   ```bash
   node --version
   npm --version
   ```

**참고:**
- 출처: https://github.com/nvm-sh/nvm

---

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

### API 테스트

프로젝트에서 사용하는 모든 API에 대한 테스트 코드가 `src/test/api/` 디렉토리에 있습니다:

- **auth.test.ts**: Supabase Auth API 테스트 (회원가입, 로그인, 로그아웃, 비밀번호 재설정 등)
- **database.test.ts**: Supabase Database API 테스트 (projects, project_stages, project_ai_results 등)
- **edge-functions.test.ts**: Supabase Edge Functions 테스트 (process-document)
- **external-apis.test.ts**: 외부 API 테스트 (Lovable AI Gateway)
- **realtime.test.ts**: Supabase Realtime API 테스트 (실시간 구독)
- **integration.test.ts**: 통합 테스트 (여러 API가 함께 작동하는 시나리오)

**특정 API 테스트 실행:**
```bash
npm run test:run -- src/test/api/auth.test.ts
npm run test:run -- src/test/api/database.test.ts
```

**모든 API 테스트 실행:**
```bash
npm run test:run -- src/test/api
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

## E2E 테스트 (Selenium)

프로젝트의 모든 페이지와 기능을 사람처럼 테스트하는 E2E 테스트가 포함되어 있습니다.

**E2E 테스트 실행:**
```bash
# 개발 서버 실행 (별도 터미널)
npm run dev

# E2E 테스트 실행
npm run test:e2e
```

**자세한 내용은 `README_E2E.md`를 참고하세요.**

---
추가 안내가 필요하면 `README.md`도 함께 확인하세요.
