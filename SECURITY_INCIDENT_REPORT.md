# 보안 사고 보고서 (Security Incident Report)

**작성일**: 2025년 12월 6일  
**사고 유형**: API 키 노출 (GitHub Push Protection 차단)  
**심각도**: ⚠️ 높음 (High)

---

## 📋 사고 개요

GitHub에 푸시하는 과정에서 `.env` 파일이 Git 히스토리에 포함되어 있었고, GitHub Push Protection이 API 키 노출을 감지하여 푸시를 차단했습니다.

---

## 🔍 발견된 문제

### 노출된 민감정보

**커밋**: `ccfcb7cbd22041f23bd999e28e47798f59e0530e`
**날짜**: 2024년 12월 6일

**노출된 파일**:
1. `.env` (라인 7-8)
2. `supabase/functions/.env` (라인 8-9)

**노출된 API 키**:
- ❌ OpenAI API Key
- ❌ Anthropic API Key

### 근본 원인

1. **`.gitignore` 파일에 `.env` 항목이 없었음**
   - `.env` 파일이 Git에 추적됨
   - 민감정보가 커밋에 포함됨

2. **보안 검증 부족**
   - 커밋 전 `.env` 파일 확인 누락
   - Git hooks 미설정

---

## ✅ 조치 내역

### 즉시 조치 (완료)

1. **✅ Git 히스토리 정리**
   ```bash
   pip install git-filter-repo
   git-filter-repo --path .env --path supabase/functions/.env --invert-paths --force
   ```
   - 결과: 60개 커밋 재작성 완료
   - `.env` 파일 완전 제거 확인

2. **✅ `.gitignore` 파일 수정**
   ```gitignore
   # Environment variables (CRITICAL: Never commit!)
   .env
   .env.*
   !.env.example
   supabase/functions/.env
   supabase/functions/.env.*
   !supabase/functions/.env.example
   ```

### 필수 후속 조치 (사용자 액션 필요)

#### 🚨 1. API 키 즉시 무효화 및 재발급 (최우선!)

**OpenAI API 키**:
1. https://platform.openai.com/api-keys 접속
2. 노출된 키 삭제
3. 새 키 발급
4. 새 키를 `.env` 파일에 업데이트

**Anthropic API 키**:
1. https://console.anthropic.com/settings/keys 접속
2. 노출된 키 삭제
3. 새 키 발급
4. 새 키를 `.env` 파일에 업데이트

⚠️ **중요**: 노출된 키는 이미 Git 히스토리에 기록되었으므로, 반드시 재발급해야 합니다.

#### 📝 2. Supabase Secrets 업데이트

```bash
# Supabase Dashboard에서 환경변수 업데이트
# Settings > Edge Functions > Secrets

OPENAI_API_KEY=새로_발급받은_키
ANTHROPIC_API_KEY=새로_발급받은_키
```

#### 🔐 3. 로컬 저장소 재설정

현재 로컬 저장소가 `git-filter-repo`로 인해 복잡한 상태이므로, 다음 방법 중 하나를 선택하세요:

**옵션 A: 새로 클론 (권장)**
```bash
cd ..
mv landing-page-pro landing-page-pro.backup
git clone git@github.com:mikary78/landing-page-pro.git
cd landing-page-pro

# 작업 파일 복사
cp ../landing-page-pro.backup/.env .env
cp ../landing-page-pro.backup/DESIGN_DOCUMENT.md .
cp ../landing-page-pro.backup/supabase/functions/process-document/index.ts supabase/functions/process-document/
cp ../landing-page-pro.backup/supabase/functions/process-document/index.test.ts supabase/functions/process-document/
cp ../landing-page-pro.backup/history/2025-12-06_security-logging-improvements.md history/

# 새 키로 .env 업데이트
nano .env
```

**옵션 B: 원격 저장소 강제 업데이트**
```bash
# ⚠️ 주의: 이 명령은 원격 저장소를 강제로 덮어씁니다
git remote add origin git@github.com:mikary78/landing-page-pro.git
git push --force-with-lease origin main
```

---

## 🛡️ 재발 방지 대책

### 1. Git Hooks 설정

**pre-commit hook 설정** (`.git/hooks/pre-commit`):

```bash
#!/bin/sh

# .env 파일이 스테이징되었는지 확인
if git diff --cached --name-only | grep -E '^\.env$|^supabase/functions/\.env$'; then
    echo "❌ 오류: .env 파일을 커밋할 수 없습니다!"
    echo "민감정보가 포함된 .env 파일은 Git에 추가하지 마세요."
    exit 1
fi

# API 키 패턴 검사
if git diff --cached | grep -E 'sk-[A-Za-z0-9]{48}|sk-ant-[A-Za-z0-9-_]{95}|AIza[0-9A-Za-z-_]{35}'; then
    echo "❌ 오류: API 키가 감지되었습니다!"
    echo "민감정보를 커밋하기 전에 제거하세요."
    exit 1
fi

exit 0
```

설치:
```bash
chmod +x .git/hooks/pre-commit
```

### 2. Secret Scanning 활성화

GitHub 저장소 설정:
1. Settings > Code security and analysis
2. "Secret scanning" 활성화
3. "Push protection" 활성화 (이미 작동 중)

### 3. .env.example 파일 유지

```bash
# .env.example 파일 예시
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Edge Function용
FUNCTION_SUPABASE_URL=https://your-project.supabase.co
FUNCTION_SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# AI API Keys
VERTEX_API_KEY=your-gemini-api-key
ANTHROPIC_API_KEY=your-anthropic-api-key
OPENAI_API_KEY=your-openai-api-key
```

### 4. CI/CD 파이프라인 보안 검사

```yaml
# .github/workflows/security-check.yml
name: Security Check

on: [push, pull_request]

jobs:
  secret-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run gitleaks
        uses: gitleaks/gitleaks-action@v2
```

---

## 📊 영향 평가

### 영향 범위
- ❌ OpenAI API: 노출됨 → 재발급 필요
- ❌ Anthropic API: 노출됨 → 재발급 필요
- ✅ Supabase Keys: 노출되지 않음
- ✅ 사용자 데이터: 영향 없음

### 비용 영향
- 노출 기간: 짧음 (푸시가 차단됨)
- 악용 가능성: 낮음 (아직 원격 저장소에 푸시되지 않음)

---

## 📚 학습 및 개선

### 배운 점
1. `.gitignore` 파일은 프로젝트 시작 시 반드시 설정
2. Git hooks를 통한 자동 검증 중요
3. GitHub Push Protection은 마지막 방어선

### 참고자료
- [GitHub Secret Scanning](https://docs.github.com/en/code-security/secret-scanning)
- [OWASP - Sensitive Data Exposure](https://owasp.org/www-project-top-ten/2017/A3_2017-Sensitive_Data_Exposure)
- [12-Factor App - Config](https://12factor.net/config)

---

## ✅ 체크리스트

### 즉시 조치
- [x] Git 히스토리에서 .env 파일 제거
- [x] .gitignore 파일 수정
- [ ] **OpenAI API 키 재발급** ⚠️
- [ ] **Anthropic API 키 재발급** ⚠️
- [ ] Supabase Secrets 업데이트

### 추가 조치
- [ ] Git hooks 설정
- [ ] Secret Scanning 활성화 확인
- [ ] 팀원에게 사고 공유
- [ ] 보안 정책 문서 업데이트

---

**보고서 작성자**: AI Autopilot  
**최종 수정**: 2025년 12월 6일  
**상태**: 진행 중 (API 키 재발급 대기)

---

**다음 단계**: API 키 재발급 후 이 보고서를 `history/2025-12-06_security-incident-api-keys.md`로 저장하세요.

