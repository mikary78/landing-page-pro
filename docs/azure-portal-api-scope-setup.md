# Azure Portal에서 API Scope 노출 설정 가이드

## 개요

Azure Functions API를 호출하려면 애플리케이션에 API scope를 노출해야 합니다. 이 가이드에서는 Microsoft Entra External ID (CIAM)에서 API scope를 설정하는 방법을 설명합니다.

---

## Step 1: Azure Portal 접속

1. [Azure Portal](https://portal.azure.com)에 로그인
2. **Microsoft Entra External ID** 또는 **Azure Active Directory** 메뉴로 이동
3. **앱 등록 (App registrations)** 클릭

---

## Step 2: 애플리케이션 선택

1. 등록된 애플리케이션 목록에서 **landing-page-pro** 또는 해당 애플리케이션 선택
2. 애플리케이션 개요 페이지로 이동

---

## Step 3: API 노출 설정

### 3.1 "API 노출" 메뉴로 이동

1. 왼쪽 메뉴에서 **"API 노출 (Expose an API)"** 클릭
2. 처음 설정하는 경우 **"설정 (Set)"** 버튼 클릭

### 3.2 Application ID URI 설정

**Application ID URI** 형식 선택:

**옵션 1: 기본 형식 (권장)**
```
api://{client-id}
```
예: `api://9222c648-3066-455a-aa7e-49cdd9782943`

**옵션 2: 사용자 정의 형식**
```
https://{tenant-name}.onmicrosoft.com/api
```
예: `https://landingpage.onmicrosoft.com/api`

**옵션 3: 사용자 정의 도메인**
```
https://api.yourdomain.com
```

> **참고**: 현재 코드에서는 `api://{client-id}` 형식을 사용하고 있습니다.

### 3.3 Application ID URI 저장

1. 원하는 형식 선택 또는 입력
2. **저장 (Save)** 클릭

---

## Step 4: Scope 추가

### 4.1 "범위 추가" 클릭

1. **"범위 추가 (Add a scope)"** 버튼 클릭

### 4.2 Scope 정보 입력

**범위 이름 (Scope name)**:
```
access_as_user
```
또는
```
api_access
```

**누가 동의할 수 있나요? (Who can consent?)**:
- ✅ **관리자 및 사용자 (Admins and users)** - 선택 (개발/테스트용)
- ⚠️ **관리자만 (Admins only)** - 프로덕션 환경

**관리자 동의 표시 이름 (Admin consent display name)**:
```
Access Landing Page Pro API
```

**관리자 동의 설명 (Admin consent description)**:
```
Allow the application to access Landing Page Pro API on behalf of the signed-in user.
```

**사용자 동의 표시 이름 (User consent display name)**:
```
Access Landing Page Pro API
```

**사용자 동의 설명 (User consent description)**:
```
Allow the application to access your data in Landing Page Pro API.
```

**상태 (State)**:
- ✅ **사용 (Enabled)** - 선택

### 4.3 Scope 추가 완료

1. 모든 정보 입력 후 **"범위 추가 (Add scope)"** 클릭
2. Scope가 목록에 표시되는지 확인

---

## Step 5: 클라이언트 애플리케이션에 권한 추가

### 5.1 "API 사용 권한" 메뉴로 이동

1. 왼쪽 메뉴에서 **"API 사용 권한 (API permissions)"** 클릭

### 5.2 권한 추가

1. **"권한 추가 (Add a permission)"** 클릭
2. **"내 API (My APIs)"** 탭 선택
3. 애플리케이션 이름 선택 (예: **landing-page-pro**)
4. **위임된 권한 (Delegated permissions)** 선택
5. 방금 생성한 scope 체크:
   - ✅ `api://{client-id}/access_as_user`
6. **권한 추가 (Add permissions)** 클릭

### 5.3 관리자 동의 부여 (선택사항)

1. **"관리자 동의 부여 (Grant admin consent)"** 클릭
2. 확인 대화상자에서 **"예 (Yes)"** 클릭

> **참고**: 관리자 동의를 부여하면 모든 사용자가 개별적으로 동의할 필요가 없습니다.

---

## Step 6: 프론트엔드 코드 확인

### 6.1 authConfig.ts 확인

`src/config/authConfig.ts` 파일에서 API scope가 올바르게 설정되어 있는지 확인:

```typescript
const apiScope = `api://${clientId}/.default`;
// 또는
const apiScope = `api://${clientId}/access_as_user`;
```

### 6.2 .default vs 특정 scope

- **`.default`**: 애플리케이션에 노출된 모든 scope를 요청
- **`access_as_user`**: 특정 scope만 요청

> **권장**: 개발 단계에서는 `.default`를 사용하고, 프로덕션에서는 특정 scope를 사용하세요.

---

## Step 7: 테스트

### 7.1 브라우저 새로고침

1. 브라우저를 완전히 새로고침 (Ctrl+F5 또는 Cmd+Shift+R)
2. 로그인 후 대시보드 접속

### 7.2 콘솔 확인

브라우저 개발자 도구 콘솔에서 확인:

**성공 시**:
```
[AzureFunctions] Token acquired successfully
[AzureFunctions] Token length: 2336
[AzureFunctions] Audience (aud): api://9222c648-3066-455a-aa7e-49cdd9782943
```

**실패 시**:
```
[AzureFunctions] API scope token acquisition failed: ...
[AzureFunctions] Error code: invalid_scope
```

---

## 문제 해결

### 문제 1: "invalid_scope" 에러

**원인**: Scope가 Azure Portal에 노출되지 않음

**해결**:
1. Step 3-4를 다시 확인
2. Application ID URI가 올바른지 확인
3. Scope 이름이 정확한지 확인

### 문제 2: "consent_required" 에러

**원인**: 사용자 동의가 필요함

**해결**:
1. Step 5.3에서 관리자 동의 부여
2. 또는 사용자가 개별적으로 동의

### 문제 3: Audience 불일치

**원인**: Application ID URI와 코드의 scope가 일치하지 않음

**해결**:
1. Azure Portal의 Application ID URI 확인
2. `authConfig.ts`의 `apiScope` 값 확인
3. 두 값이 일치하도록 수정

---

## 확인 체크리스트

- [ ] Application ID URI 설정 완료
- [ ] Scope 추가 완료
- [ ] 클라이언트 애플리케이션에 권한 추가 완료
- [ ] 관리자 동의 부여 (선택사항)
- [ ] 프론트엔드 코드의 scope 확인
- [ ] 브라우저 새로고침 후 테스트

---

## 참고 자료

- [Microsoft Entra External ID 문서](https://learn.microsoft.com/azure/active-directory/external-identities/)
- [API 권한 설정 가이드](https://learn.microsoft.com/azure/active-directory/develop/scenario-spa-app-registration)
- [MSAL scope 설정](https://learn.microsoft.com/azure/active-directory/develop/scenario-spa-acquire-token)

---

**작성일**: 2025-12-31
**작성자**: Claude Code

