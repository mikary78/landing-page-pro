# 🔴 긴급: Unauthorized 오류 해결 방법

## 문제 상황

브라우저 콘솔 로그에서 확인된 내용:
- ✅ 토큰의 `aud`: `9222c648-3066-455a-aa7e-49cdd9782943` (올바름)
- ❌ Azure Function이 기대하는 `aud`: `api://234895ba-cc32-4306-a28b-e287742f8e4e` (잘못됨)

**원인**: Azure Portal의 Function App 환경 변수가 잘못된 Client ID를 사용하고 있습니다.

---

## 해결 방법: Azure Portal에서 환경 변수 업데이트

### 1단계: Azure Portal 접속

1. [Azure Portal](https://portal.azure.com) 접속
2. **Function App** 검색 또는 리소스 그룹에서 `func-landing-page-pro` 선택

### 2단계: Configuration 메뉴 접속

1. 왼쪽 메뉴에서 **Configuration** 클릭
2. **Application settings** 탭 선택

### 3단계: 환경 변수 확인 및 업데이트

다음 3개의 환경 변수를 확인하고, 값이 다르면 업데이트:

#### ✅ `ENTRA_CLIENT_ID`
- **현재 값 확인**: `234895ba-cc32-4306-a28b-e287742f8e4e` (잘못됨)
- **올바른 값**: `9222c648-3066-455a-aa7e-49cdd9782943`
- **업데이트 방법**:
  1. `ENTRA_CLIENT_ID` 행 찾기
  2. **편집** (연필 아이콘) 클릭
  3. 값 변경: `9222c648-3066-455a-aa7e-49cdd9782943`
  4. **OK** 클릭

#### ✅ `ENTRA_TENANT_ID`
- **올바른 값**: `64425cef-1c32-4713-bb61-7dcd4939e326`
- **없으면 추가**: **+ New application setting** 클릭
  - Name: `ENTRA_TENANT_ID`
  - Value: `64425cef-1c32-4713-bb61-7dcd4939e326`

#### ✅ `ENTRA_TENANT_NAME`
- **올바른 값**: `Landingpage`
- **없으면 추가**: **+ New application setting** 클릭
  - Name: `ENTRA_TENANT_NAME`
  - Value: `Landingpage`

### 4단계: 저장 및 재시작

1. 상단의 **저장** 버튼 클릭
2. **계속** 클릭 (Function App 재시작 확인)
3. 재시작 완료까지 1-2분 대기

---

## 확인 방법

### 방법 1: Azure Portal에서 확인

1. **Configuration** → **Application settings**에서 다음 값 확인:
   ```
   ENTRA_CLIENT_ID = 9222c648-3066-455a-aa7e-49cdd9782943
   ENTRA_TENANT_ID = 64425cef-1c32-4713-bb61-7dcd4939e326
   ENTRA_TENANT_NAME = Landingpage
   ```

### 방법 2: 브라우저에서 테스트

1. 브라우저 캐시 초기화 (Ctrl + Shift + Delete)
2. 로그인 후 대시보드 접속
3. 브라우저 콘솔(F12)에서 다음 로그 확인:
   ```
   [AzureFunctions] Audience (aud): 9222c648-3066-455a-aa7e-49cdd9782943
   [AzureFunctions] Expected aud: api://9222c648-3066-455a-aa7e-49cdd9782943
   [AzureFunctions] Match: ✅
   ```

---

## Azure CLI로 빠르게 업데이트 (선택사항)

PowerShell 또는 Azure Cloud Shell에서:

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

## 참고: 올바른 설정 값

| 환경 변수 | 값 |
|---------|-----|
| `ENTRA_CLIENT_ID` | `9222c648-3066-455a-aa7e-49cdd9782943` |
| `ENTRA_TENANT_ID` | `64425cef-1c32-4713-bb61-7dcd4939e326` |
| `ENTRA_TENANT_NAME` | `Landingpage` |

이 값들은 **모든 곳에서 동일**해야 합니다:
- ✅ 프론트엔드 `.env`
- ✅ Azure Functions `local.settings.json`
- ✅ Azure Portal Function App 설정

---

**작성일**: 2025-12-31
**작성자**: Claude Code

