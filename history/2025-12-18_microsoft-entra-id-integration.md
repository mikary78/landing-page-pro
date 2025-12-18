# Microsoft Entra ID 인증 통합

**날짜**: 2025-12-18
**작업**: Azure AD B2C → Microsoft Entra ID로 인증 시스템 변경
**작업자**: Claude Code

---

## 작업 개요

Azure AD B2C가 2025년 5월 1일부로 신규 생성 중단됨에 따라, Microsoft Entra ID (구 Azure AD)로 인증 시스템을 구현했습니다.

### 주요 목표
1. ✅ Microsoft Entra ID tenant 확인 (기존 Parandurume tenant 사용)
2. ✅ Application 등록
3. ✅ Redirect URIs 및 API Permissions 설정
4. ✅ 환경 변수 업데이트
5. ✅ MSAL 설정 파일 수정
6. ✅ Azure Functions 인증 미들웨어 업데이트

---

## Azure Portal 설정

### 1. Application 등록

**Tenant 정보:**
- **Name**: Parandurume
- **Tenant ID**: `f9230b9b-e666-42ce-83be-aa6deb0f78b4`
- **Primary domain**: `paranduru.me`

**Application 정보:**
- **Name**: `landing-page-pro-app`
- **Application (client) ID**: `234895ba-cc32-4306-a28b-e287742f8`
- **Supported account types**: Single tenant (Parandurume only)

### 2. Redirect URIs 설정

**Platform**: Single-page application (SPA)

**Redirect URIs:**
```
http://localhost:5173
http://localhost:5173/auth/callback
```

**Implicit grant:**
- ✅ Access tokens
- ✅ ID tokens

### 3. API Permissions

**Microsoft Graph - Delegated permissions:**
- ✅ `openid`
- ✅ `profile`
- ✅ `email`
- ✅ `offline_access`
- ✅ `User.Read`

**Admin consent**: Granted

---

## 코드 변경 사항

### 1. 환경 변수 (.env)

**Before (Azure AD B2C):**
```env
VITE_AZURE_AD_B2C_TENANT_NAME="landingpagepro"
VITE_AZURE_AD_B2C_CLIENT_ID="<YOUR_CLIENT_ID>"
VITE_AZURE_AD_B2C_POLICY_SIGNIN="B2C_1_signupsignin"
VITE_AZURE_AD_B2C_REDIRECT_URI="http://localhost:5173/auth/callback"
VITE_AZURE_AD_B2C_AUTHORITY="https://landingpagepro.b2clogin.com/..."
```

**After (Microsoft Entra ID):**
```env
VITE_ENTRA_TENANT_ID="f9230b9b-e666-42ce-83be-aa6deb0f78b4"
VITE_ENTRA_CLIENT_ID="234895ba-cc32-4306-a28b-e287742f8"
VITE_ENTRA_AUTHORITY="https://login.microsoftonline.com/f9230b9b-e666-42ce-83be-aa6deb0f78b4"
VITE_ENTRA_REDIRECT_URI="http://localhost:5173"
```

### 2. MSAL 설정 (src/config/authConfig.ts)

**Before:**
```typescript
const tenantName = import.meta.env.VITE_AZURE_AD_B2C_TENANT_NAME;
const authority = `https://${tenantName}.b2clogin.com/${tenantName}.onmicrosoft.com/${policySignIn}`;

export const msalConfig: Configuration = {
  auth: {
    clientId: clientId,
    authority: authority,
    knownAuthorities: [`${tenantName}.b2clogin.com`],
    // ...
  },
};

export const b2cPolicies = {
  names: {
    signUpSignIn: policySignIn,
    forgotPassword: 'B2C_1_passwordreset',
    editProfile: 'B2C_1_profileedit',
  },
  // ...
};
```

**After:**
```typescript
const tenantId = import.meta.env.VITE_ENTRA_TENANT_ID;
const authority = `https://login.microsoftonline.com/${tenantId}`;

export const msalConfig: Configuration = {
  auth: {
    clientId: clientId,
    authority: authority,
    redirectUri: redirectUri,
    // knownAuthorities 제거 (일반 Azure AD는 불필요)
  },
};

// b2cPolicies 제거 (일반 Azure AD는 user flows 없음)

export const loginRequest = {
  scopes: ['openid', 'profile', 'email', 'offline_access', 'User.Read'],
};
```

### 3. Azure Functions 인증 미들웨어 (azure-functions/src/middleware/auth.ts)

**Before (Azure AD B2C):**
```typescript
const client = new jwksClient.JwksClient({
  jwksUri: `https://${process.env.AZURE_AD_B2C_TENANT_NAME}.b2clogin.com/.../discovery/v2.0/keys`,
});

jwt.verify(token, getKey, {
  audience: process.env.AZURE_AD_B2C_CLIENT_ID,
  issuer: `https://${process.env.AZURE_AD_B2C_TENANT_NAME}.b2clogin.com/.../v2.0/`,
});
```

**After (Microsoft Entra ID):**
```typescript
const client = new jwksClient.JwksClient({
  jwksUri: `https://login.microsoftonline.com/${process.env.ENTRA_TENANT_ID}/discovery/v2.0/keys`,
});

jwt.verify(token, getKey, {
  audience: process.env.ENTRA_CLIENT_ID,
  issuer: `https://login.microsoftonline.com/${process.env.ENTRA_TENANT_ID}/v2.0`,
  algorithms: ['RS256'],
});
```

### 4. Azure Functions 환경 변수 (local.settings.json)

**Before:**
```json
{
  "Values": {
    "AZURE_AD_B2C_TENANT_NAME": "landingpagepro",
    "AZURE_AD_B2C_TENANT_ID": "<YOUR_TENANT_ID>",
    "AZURE_AD_B2C_CLIENT_ID": "<YOUR_CLIENT_ID>",
    "AZURE_AD_B2C_JWKS_URI": "https://..."
  }
}
```

**After:**
```json
{
  "Values": {
    "ENTRA_TENANT_ID": "f9230b9b-e666-42ce-83be-aa6deb0f78b4",
    "ENTRA_CLIENT_ID": "234895ba-cc32-4306-a28b-e287742f8"
  }
}
```

---

## Azure AD B2C vs Microsoft Entra ID 차이점

### 1. Authority URL

| Azure AD B2C | Microsoft Entra ID |
|--------------|-------------------|
| `https://{tenant}.b2clogin.com/{tenant}.onmicrosoft.com/{policy}` | `https://login.microsoftonline.com/{tenantId}` |

### 2. User Flows (Policies)

| Azure AD B2C | Microsoft Entra ID |
|--------------|-------------------|
| ✅ Custom user flows (B2C_1_signupsignin, B2C_1_passwordreset) | ❌ No custom user flows |
| UI 커스터마이징 가능 | 기본 Microsoft 로그인 UI |

### 3. JWT Claims

| Claim | Azure AD B2C | Microsoft Entra ID |
|-------|--------------|-------------------|
| User ID | `oid` | `oid` |
| Email | `emails[0]` | `email` 또는 `preferred_username` |
| Tenant | `tid` | `tid` |
| Policy | `tfp` (B2C_1_signupsignin) | ❌ 없음 |

### 4. JWKS URI

| Azure AD B2C | Microsoft Entra ID |
|--------------|-------------------|
| `https://{tenant}.b2clogin.com/{tenant}.onmicrosoft.com/{policy}/discovery/v2.0/keys` | `https://login.microsoftonline.com/{tenantId}/discovery/v2.0/keys` |

---

## 인증 흐름

### Microsoft Entra ID 인증 흐름

```
1. 사용자가 로그인 버튼 클릭
   ↓
2. MSAL이 Microsoft login 페이지로 리디렉션
   - URL: https://login.microsoftonline.com/{tenantId}/oauth2/v2.0/authorize
   ↓
3. 사용자가 Microsoft 계정으로 로그인
   - Email/Password 입력
   - MFA (필요 시)
   ↓
4. Microsoft가 JWT 토큰 발급
   - ID token (사용자 정보)
   - Access token (API 호출용)
   - Refresh token (토큰 갱신용)
   ↓
5. 브라우저가 redirect_uri로 리디렉션
   - http://localhost:5173?code=...
   ↓
6. MSAL이 code를 token으로 교환
   ↓
7. 토큰을 localStorage에 저장
   ↓
8. React 앱에서 토큰 사용
   - API 호출 시 Authorization: Bearer {token}
   ↓
9. Azure Functions가 JWT 검증
   - JWKS로 서명 확인
   - audience, issuer 확인
   ↓
10. user_id (oid) 추출하여 비즈니스 로직 실행
```

---

## 테스트 시나리오

### 1. 로컬 프론트엔드 테스트

```bash
# 프론트엔드 실행
npm run dev
```

**예상 결과:**
- 로그인 버튼 클릭 시 Microsoft 로그인 페이지로 이동
- 로그인 성공 시 http://localhost:5173으로 리디렉션
- localStorage에 토큰 저장

### 2. Azure Functions 로컬 테스트

```bash
cd azure-functions
npm run build
npm start
```

**JWT 토큰 테스트:**
```bash
# 프론트엔드에서 로그인 후 토큰 복사
# Chrome DevTools → Application → Local Storage → msal.* 확인

curl -X POST http://localhost:7071/api/processDocument \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "test-id",
    "aiModel": "gemini"
  }'
```

---

## 다음 단계

### 1. 프론트엔드 로그인 UI 통합
- AuthProvider 컴포넌트 App에 적용
- AzureAuthButton 추가
- ProtectedRoute 구현

### 2. Azure Functions 배포
```bash
az functionapp create \
  --resource-group rg-landing-page-pro \
  --name func-landing-page-pro \
  --storage-account stlandingpagepro \
  --runtime node \
  --runtime-version 20

# 환경 변수 설정
az functionapp config appsettings set \
  --name func-landing-page-pro \
  --resource-group rg-landing-page-pro \
  --settings \
    ENTRA_TENANT_ID=f9230b9b-e666-42ce-83be-aa6deb0f78b4 \
    ENTRA_CLIENT_ID=234895ba-cc32-4306-a28b-e287742f8

# 배포
func azure functionapp publish func-landing-page-pro
```

### 3. 통합 테스트
- 로그인 → API 호출 → 데이터 저장 전체 플로우 테스트

---

## 문제 해결

### 문제 1: "AADSTS50011: The reply URL specified in the request does not match..."
**원인**: Redirect URI 불일치
**해결**: Azure Portal에서 Redirect URI 확인 및 추가

### 문제 2: "AADSTS70011: The provided request must include a 'scope' input parameter"
**원인**: Scope 누락
**해결**: loginRequest에 scopes 추가
```typescript
export const loginRequest = {
  scopes: ['openid', 'profile', 'email', 'User.Read'],
};
```

### 문제 3: JWT 검증 실패
**원인**: 환경 변수 불일치
**해결**:
- 프론트엔드 VITE_ENTRA_CLIENT_ID 확인
- Azure Functions ENTRA_CLIENT_ID 확인
- 두 값이 동일해야 함

---

## 비용 분석

### Microsoft Entra ID (무료 tier)

**무료 제공:**
- 월 50,000 MAU (Monthly Active Users)
- 기본 인증 기능
- MSAL 라이브러리

**유료 전환 시 (Premium P1):**
- 사용자당 $6/월
- Conditional Access
- MFA
- Identity Protection

**예상 비용:**
- 개발/테스트: $0 (무료 tier)
- 프로덕션 (1,000 users): $0 (무료 tier 범위 내)

---

## 결론

Azure AD B2C 신규 생성 중단에 따라 Microsoft Entra ID로 성공적으로 전환했습니다.

### 주요 성과
1. ✅ 기존 Parandurume tenant 활용
2. ✅ Application 등록 완료
3. ✅ MSAL 설정 변경
4. ✅ Azure Functions 인증 미들웨어 업데이트
5. ✅ 환경 변수 전체 업데이트

### 기술 스택 변화
- **인증 Provider**: Azure AD B2C → Microsoft Entra ID
- **Authority URL**: b2clogin.com → login.microsoftonline.com
- **User Flows**: Custom B2C flows → 기본 Azure AD
- **비용**: 동일 (무료 tier)

---

**작성일**: 2025-12-18
**작성자**: Claude Code
**관련 문서**:
- [PHASE3-AZURE-AD-B2C-SETUP.md](../azure-migration/PHASE3-AZURE-AD-B2C-SETUP.md) (참고용)
- [PHASE4-AZURE-FUNCTIONS-DEPLOYMENT.md](../azure-migration/PHASE4-AZURE-FUNCTIONS-DEPLOYMENT.md)
- [PHASE5-FRONTEND-INTEGRATION.md](./2025-12-17_phase5-frontend-integration.md)
