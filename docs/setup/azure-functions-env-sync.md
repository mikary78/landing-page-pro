# Azure Functions 환경 변수 동기화 가이드

## 중요: Client ID 일치 확인

Azure Functions의 `ENTRA_CLIENT_ID`와 프론트엔드의 `VITE_ENTRA_CLIENT_ID`, 그리고 Azure Portal에 등록된 Client ID가 **모두 동일**해야 합니다.

---

## 현재 설정 확인

### Azure Portal에 등록된 정보
- **Client ID**: `9222c648-3066-455a-aa7e-49cdd9782943`
- **Scope URI**: `api://9222c648-3066-455a-aa7e-49cdd9782943/access_as_user`

### 확인해야 할 위치

1. **프론트엔드 `.env` 파일**
   ```env
   VITE_ENTRA_CLIENT_ID="9222c648-3066-455a-aa7e-49cdd9782943"
   ```

2. **Azure Functions `local.settings.json`**
   ```json
   {
     "Values": {
       "ENTRA_CLIENT_ID": "9222c648-3066-455a-aa7e-49cdd9782943"
     }
   }
   ```

3. **Azure Portal - Function App 설정**
   - Function App → Configuration → Application settings
   - `ENTRA_CLIENT_ID` 값 확인 (반드시 `9222c648-3066-455a-aa7e-49cdd9782943`이어야 함)
   - `ENTRA_TENANT_ID` 값 확인 (반드시 `64425cef-1c32-4713-bb61-7dcd4939e326`이어야 함)
   - `ENTRA_TENANT_NAME` 값 확인 (반드시 `Landingpage`이어야 함)

---

## Azure Portal에서 Function App 환경 변수 업데이트

### 방법 1: Azure Portal UI

1. [Azure Portal](https://portal.azure.com) 접속
2. **Function App** → `func-landing-page-pro` 선택
3. 왼쪽 메뉴: **Configuration** → **Application settings**
4. `ENTRA_CLIENT_ID` 찾기
5. **편집** 클릭
6. 다음 값들을 모두 확인/업데이트:
   - `ENTRA_CLIENT_ID`: `9222c648-3066-455a-aa7e-49cdd9782943`
   - `ENTRA_TENANT_ID`: `64425cef-1c32-4713-bb61-7dcd4939e326`
   - `ENTRA_TENANT_NAME`: `Landingpage` (없으면 **+ New application setting**으로 추가)
7. **저장** 클릭
8. **계속** 클릭 (Function App 재시작 확인)

### 방법 2: Azure CLI

```bash
az functionapp config appsettings set \
  --name func-landing-page-pro \
  --resource-group rg-landing-page-pro \
  --settings \
    ENTRA_CLIENT_ID="9222c648-3066-455a-aa7e-49cdd9782943" \
    ENTRA_TENANT_ID="64425cef-1c32-4713-bb61-7dcd4939e326" \
    ENTRA_TENANT_NAME="Landingpage"
```

---

## 확인 체크리스트

- [ ] 프론트엔드 `.env`의 `VITE_ENTRA_CLIENT_ID` = `9222c648-3066-455a-aa7e-49cdd9782943`
- [ ] 프론트엔드 `.env`의 `VITE_ENTRA_TENANT_ID` = `64425cef-1c32-4713-bb61-7dcd4939e326`
- [ ] 프론트엔드 `.env`의 `VITE_ENTRA_TENANT_NAME` = `Landingpage`
- [ ] Azure Functions `local.settings.json`의 `ENTRA_CLIENT_ID` = `9222c648-3066-455a-aa7e-49cdd9782943`
- [ ] Azure Functions `local.settings.json`의 `ENTRA_TENANT_ID` = `64425cef-1c32-4713-bb61-7dcd4939e326`
- [ ] Azure Functions `local.settings.json`의 `ENTRA_TENANT_NAME` = `Landingpage`
- [ ] Azure Portal Function App의 `ENTRA_CLIENT_ID` = `9222c648-3066-455a-aa7e-49cdd9782943`
- [ ] Azure Portal Function App의 `ENTRA_TENANT_ID` = `64425cef-1c32-4713-bb61-7dcd4939e326`
- [ ] Azure Portal Function App의 `ENTRA_TENANT_NAME` = `Landingpage`
- [ ] Azure Portal App Registration의 Client ID = `9222c648-3066-455a-aa7e-49cdd9782943`

---

## 문제 해결

### 문제: "Invalid audience" 에러

**원인**: Client ID 불일치

**해결**:
1. 위의 4곳 모두 동일한 Client ID인지 확인
2. Azure Portal Function App 재시작
3. 브라우저 캐시 클리어 후 재시도

### 문제: "Unauthorized" 에러

**원인**: 
- Client ID 불일치
- 또는 API scope가 Azure Portal에 노출되지 않음

**해결**:
1. Client ID 일치 확인
2. Azure Portal → App Registration → API 노출 → Scope 확인

---

**작성일**: 2025-12-31
**작성자**: Claude Code

