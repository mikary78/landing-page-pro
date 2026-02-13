# Azure Functions 환경 변수 디버깅 가이드

## 문제 상황

Azure Portal 설정은 올바르지만 여전히 "Unauthorized" 오류가 발생하는 경우, 다음을 확인해야 합니다:

1. **코드가 배포되었는지 확인**
2. **배포된 환경에서 실제 환경 변수 값 확인**
3. **Azure Functions 로그에서 실제 값 확인**

---

## 1단계: Azure Functions 재배포

코드가 변경되었다면 반드시 재배포해야 합니다:

```bash
cd azure-functions
npm run build
func azure functionapp publish func-landing-page-pro
```

---

## 2단계: Azure Functions 로그 확인

### 방법 1: Azure Portal Log Stream

1. [Azure Portal](https://portal.azure.com) 접속
2. **Function App** → `func-landing-page-pro` 선택
3. 왼쪽 메뉴: **Monitoring** → **Log stream**
4. 브라우저에서 대시보드 접속 (API 호출 발생)
5. 다음 로그를 확인:

```
[Auth] Valid audiences: [...]
[Auth] Client ID: ...
[Auth] Tenant ID: ...
[Auth] Tenant Name: ...
```

**확인해야 할 값:**
- `Client ID`가 `9222c648-3066-455a-aa7e-49cdd9782943`인지
- `Tenant ID`가 `64425cef-1c32-4713-bb61-7dcd4939e326`인지
- `Tenant Name`이 `Landingpage`인지
- `Valid audiences`에 `api://9222c648-3066-455a-aa7e-49cdd9782943`과 `9222c648-3066-455a-aa7e-49cdd9782943`이 포함되어 있는지

### 방법 2: Kudu Console (환경 변수 직접 확인)

1. Azure Portal → Function App → **Development Tools** → **Console** (Kudu)
2. 또는 직접 접속: `https://func-landing-page-pro.scm.azurewebsites.net`
3. 상단 메뉴: **Debug console** → **CMD** 또는 **PowerShell**
4. 다음 명령 실행:

**PowerShell:**
```powershell
$env:ENTRA_CLIENT_ID
$env:ENTRA_TENANT_ID
$env:ENTRA_TENANT_NAME
```

**CMD:**
```cmd
echo %ENTRA_CLIENT_ID%
echo %ENTRA_TENANT_ID%
echo %ENTRA_TENANT_NAME%
```

---

## 3단계: 환경 변수 불일치 시 해결

### 문제: 로그에 잘못된 값이 표시됨

**해결 방법:**

1. **Azure Portal에서 환경 변수 확인:**
   - Function App → **Configuration** → **Application settings**
   - 각 변수의 값을 확인하고 필요시 수정

2. **환경 변수 업데이트:**
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
   - Azure Portal → Function App → **Overview** → **Restart** 버튼 클릭
   - 또는 Azure CLI:
     ```bash
     az functionapp restart \
       --name func-landing-page-pro \
       --resource-group rg-landing-page-pro
     ```

---

## 4단계: 코드 재배포

환경 변수를 업데이트한 후 코드도 재배포:

```bash
cd azure-functions
npm run build
func azure functionapp publish func-landing-page-pro
```

---

## 확인 체크리스트

- [ ] Azure Portal 환경 변수가 올바른가?
  - `ENTRA_CLIENT_ID` = `9222c648-3066-455a-aa7e-49cdd9782943`
  - `ENTRA_TENANT_ID` = `64425cef-1c32-4713-bb61-7dcd4939e326`
  - `ENTRA_TENANT_NAME` = `Landingpage`
- [ ] Kudu Console에서 실제 환경 변수가 올바른가?
- [ ] Azure Functions 로그에서 `[Auth] Client ID:` 값이 올바른가?
- [ ] 코드가 최신 버전으로 배포되었는가?
- [ ] Function App이 재시작되었는가?

---

## 자주 발생하는 문제

### 문제 1: 환경 변수는 올바르지만 코드에서 잘못된 값 읽기

**원인**: 환경 변수 업데이트 후 Function App이 재시작되지 않음

**해결**: Function App 재시작

### 문제 2: 코드 변경 후 배포하지 않음

**원인**: `local.settings.json`만 수정하고 코드를 배포하지 않음

**해결**: 코드 변경 후 반드시 재배포 (`func azure functionapp publish`)

### 문제 3: 환경 변수 이름 오타

**원인**: `ENTRA_TENANT_NAME` 대신 `ENTRA_TENANT` 등 잘못된 이름 사용

**해결**: 코드와 Azure Portal 모두에서 정확한 이름 확인

---

**작성일**: 2025-12-31
**작성자**: Claude Code

