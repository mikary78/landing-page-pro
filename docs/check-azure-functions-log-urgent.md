# 🔴 긴급: Azure Functions 실제 로그 확인 방법

## 현재 상황

- ✅ 프론트엔드: 올바른 토큰 획득 (`aud`: `9222c648-3066-455a-aa7e-49cdd9782943`)
- ✅ Azure Portal 설정: 올바르게 설정됨
- ❌ Azure Functions: 여전히 "Unauthorized" 오류 발생

**가능한 원인:**
1. Azure Functions 코드가 재배포되지 않음
2. 배포된 환경에서 환경 변수가 올바르게 로드되지 않음

---

## 즉시 확인할 사항

### 방법 1: Azure Portal Log Stream (가장 빠름)

1. [Azure Portal](https://portal.azure.com) 접속
2. **Function App** → `func-landing-page-pro` 선택
3. 왼쪽 메뉴: **Monitoring** → **Log stream** 클릭
4. **브라우저에서 대시보드 접속** (API 호출 발생)
5. Log Stream에서 다음 로그를 찾아주세요:

```
[Auth] Valid audiences: [...]
[Auth] Client ID: ...
[Auth] Tenant ID: ...
[Auth] Tenant Name: ...
[Auth] ❌ Invalid audience: ...
[Auth] Expected one of: ...
```

**중요**: 이 로그에 나타나는 `Client ID` 값을 확인해주세요.

- ✅ `9222c648-3066-455a-aa7e-49cdd9782943`이면: 코드 문제
- ❌ `234895ba-cc32-4306-a28b-e287742f8e4e`이면: 환경 변수 문제

---

### 방법 2: Kudu Console (환경 변수 직접 확인)

1. Azure Portal → Function App → **Development Tools** → **Console** (Kudu)
2. 또는 직접 접속: `https://func-landing-page-pro.scm.azurewebsites.net`
3. 상단 메뉴: **Debug console** → **PowerShell** 클릭
4. 다음 명령 실행:

```powershell
$env:ENTRA_CLIENT_ID
$env:ENTRA_TENANT_ID  
$env:ENTRA_TENANT_NAME
```

**기대 값:**
```
9222c648-3066-455a-aa7e-49cdd9782943
64425cef-1c32-4713-bb61-7dcd4939e326
Landingpage
```

---

## 문제 해결

### 시나리오 1: Log Stream에서 잘못된 Client ID 표시

**증상**: `[Auth] Client ID: 234895ba-cc32-4306-a28b-e287742f8e4e` (잘못됨)

**해결:**

1. **Azure Portal에서 환경 변수 다시 확인:**
   - Function App → **Configuration** → **Application settings**
   - `ENTRA_CLIENT_ID` 값 확인

2. **환경 변수 업데이트 (Azure CLI):**
   ```bash
   az functionapp config appsettings set \
     --name func-landing-page-pro \
     --resource-group rg-landing-page-pro \
     --settings \
       ENTRA_CLIENT_ID="9222c648-3066-455a-aa7e-49cdd9782943" \
       ENTRA_TENANT_ID="64425cef-1c32-4713-bb61-7dcd4939e326" \
       ENTRA_TENANT_NAME="Landingpage"
   ```

3. **Function App 재시작:**
   - Azure Portal → Function App → **Overview** → **Restart**
   - 또는 Azure CLI:
     ```bash
     az functionapp restart \
       --name func-landing-page-pro \
       --resource-group rg-landing-page-pro
     ```

---

### 시나리오 2: Log Stream에 로그가 없음

**증상**: API 호출 시 아무 로그도 나타나지 않음

**원인**: 코드가 재배포되지 않았거나, 함수가 실행되지 않음

**해결:**

1. **코드 재배포:**
   ```bash
   cd azure-functions
   npm run build
   func azure functionapp publish func-landing-page-pro
   ```

2. **재배포 후 1-2분 대기** (배포 완료 대기)

3. **다시 테스트 및 로그 확인**

---

### 시나리오 3: 올바른 Client ID지만 여전히 오류

**증상**: `[Auth] Client ID: 9222c648-3066-455a-aa7e-49cdd9782943` (올바름) 하지만 여전히 오류

**확인 사항:**

1. **Valid audiences 확인:**
   ```
   [Auth] Valid audiences: ['api://9222c648-3066-455a-aa7e-49cdd9782943', '9222c648-3066-455a-aa7e-49cdd9782943', ...]
   ```
   - `9222c648-3066-455a-aa7e-49cdd9782943`이 포함되어 있는지 확인

2. **Token audience 확인:**
   ```
   [Auth] ❌ Invalid audience: 9222c648-3066-455a-aa7e-49cdd9782943
   ```
   - 토큰의 `aud` 값과 `Valid audiences`를 비교

3. **Issuer 확인:**
   - `[Auth] Invalid issuer:` 로그가 있는지 확인
   - 토큰의 `iss`가 `https://landingpage.ciamlogin.com/64425cef-1c32-4713-bb61-7dcd4939e326/v2.0`인지 확인

---

## 다음 단계

위 방법으로 확인한 결과를 공유해주시면 정확한 해결 방법을 제시하겠습니다.

**확인해야 할 정보:**
1. Log Stream의 `[Auth] Client ID:` 값
2. Log Stream의 `[Auth] Valid audiences:` 값
3. Log Stream의 `[Auth] ❌ Invalid audience:` 값 (있는 경우)
4. Kudu Console의 환경 변수 값 (방법 2 사용 시)

---

**작성일**: 2025-12-31
**작성자**: Claude Code

