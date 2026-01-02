# Azure Portal 로그 확인 대체 방법

## 방법 1: Application Settings에서 환경 변수 직접 확인 (가장 빠름)

현재 **Configuration (preview)** 화면에 있으시므로:

1. 상단 탭에서 **"Application settings"** (또는 **"Environment variables"**) 탭 클릭
2. 다음 환경 변수들을 찾아서 값을 확인:
   - `ENTRA_CLIENT_ID` → `9222c648-3066-455a-aa7e-49cdd9782943`인지 확인
   - `ENTRA_TENANT_ID` → `64425cef-1c32-4713-bb61-7dcd4939e326`인지 확인
   - `ENTRA_TENANT_NAME` → `Landingpage`인지 확인

**값이 다르면:**
1. 해당 행의 **편집** (연필 아이콘) 클릭
2. 올바른 값으로 수정
3. **저장** 클릭
4. Function App 재시작

---

## 방법 2: Functions 메뉴에서 로그 확인

1. 왼쪽 메뉴에서 **"Functions"** 클릭
2. 함수 목록에서 하나를 선택 (예: `getProjects`)
3. 함수 상세 페이지에서 **"Monitor"** 탭 클릭
4. **"Logs"** 섹션에서 최근 로그 확인

또는:

1. **"Functions"** 메뉴에서 함수를 클릭
2. 상단 메뉴에서 **"Code + Test"** 선택
3. 하단의 **"Logs"** 창에서 실시간 로그 확인

---

## 방법 3: Kudu Console (환경 변수 직접 확인)

1. **Development Tools** 섹션 찾기 (왼쪽 메뉴 아래쪽)
2. **"Console"** 또는 **"Advanced Tools (Kudu)"** 클릭
3. 또는 직접 접속: `https://func-landing-page-pro.scm.azurewebsites.net`
4. 상단 메뉴: **"Debug console"** → **"PowerShell"** 선택
5. 다음 명령 실행:

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

## 방법 4: Application Insights (설정된 경우)

1. 왼쪽 메뉴에서 **"Application Insights"** 찾기
2. 클릭하여 Application Insights로 이동
3. **"Logs"** 또는 **"Live Metrics"** 메뉴 선택
4. 쿼리 실행:

```kusto
traces
| where message contains "Auth"
| order by timestamp desc
| take 50
```

---

## 방법 5: Azure CLI로 환경 변수 확인

터미널(PowerShell)에서:

```powershell
az functionapp config appsettings list `
  --name func-landing-page-pro `
  --resource-group rg-landing-page-pro `
  --query "[?name=='ENTRA_CLIENT_ID' || name=='ENTRA_TENANT_ID' || name=='ENTRA_TENANT_NAME'].{Name:name, Value:value}" `
  --output table
```

---

## 빠른 확인 순서 (추천)

1. ✅ **방법 1**: Application Settings에서 환경 변수 직접 확인 (현재 화면에서 가능)
2. ✅ **방법 3**: Kudu Console에서 환경 변수 확인
3. ✅ **방법 2**: Functions 메뉴에서 로그 확인

---

## 환경 변수 값이 다르면 즉시 수정

Azure Portal (Application Settings)에서:

1. **편집** 클릭
2. 값 변경:
   - `ENTRA_CLIENT_ID` = `9222c648-3066-455a-aa7e-49cdd9782943`
   - `ENTRA_TENANT_ID` = `64425cef-1c32-4713-bb61-7dcd4939e326`
   - `ENTRA_TENANT_NAME` = `Landingpage` (없으면 추가)
3. **저장** 클릭
4. **Function App 재시작** (Overview → Restart)

---

**작성일**: 2025-12-31
**작성자**: Claude Code

