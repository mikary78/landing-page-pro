# Azure Functions 로그 확인 방법

## 방법 1: Functions 목록에서 개별 함수 모니터링

1. Azure Portal → Function App → **Functions** 탭
2. 각 함수 옆에 있는 **Monitor** 링크 클릭 (예: `getProjects` 함수)
3. 함수별 실행 로그, 성공/실패 횟수 확인

## 방법 2: Logs 섹션 찾기

Azure Portal UI가 업데이트되어 다음 중 하나를 확인해보세요:

1. **왼쪽 메뉴에서 "Logs" 또는 "Monitoring" 섹션 찾기**
   - "Monitoring" 섹션 → "Logs" 또는 "Log stream"
   - 또는 "Development Tools" 섹션 → "Console" 또는 "Log stream"

2. **개발 도구에서 확인**
   - 왼쪽 메뉴 → "Development Tools" → "Log stream"
   - 또는 "Development Tools" → "Console" (Kudu)

## 방법 3: Azure CLI를 통한 로그 확인

```powershell
# Function App의 실시간 로그 스트림
az webapp log tail --name func-landing-page-pro --resource-group rg-landing-page-pro

# 최근 로그만 확인 (에러만 필터링)
az functionapp log show --name func-landing-page-pro --resource-group rg-landing-page-pro --filter Error

# Application Insights 로그 (활성화되어 있다면)
az monitor app-insights query --app func-landing-page-pro --analytics-query "traces | where severityLevel >= 2 | take 50"
```

## 방법 4: Application Insights 사용 (권장)

1. Azure Portal → Function App
2. 왼쪽 메뉴 → **Monitoring** → **Application Insights**
3. 또는 **Overview** → **Application Insights** 섹션에서 링크 클릭
4. Application Insights 대시보드에서:
   - **Logs** 섹션에서 쿼리 실행
   - **Failures** 섹션에서 실패한 요청 확인
   - **Live Metrics** 섹션에서 실시간 로그 확인

## 방법 5: 브라우저 콘솔에서 토큰 정보 확인

프론트엔드에서 발생하는 문제라면, 브라우저 개발자 도구(F12)에서 다음을 확인:

1. **Console 탭**에서 다음 로그 찾기:
   ```
   [AzureFunctions] Token payload: {...}
   [AzureFunctions] Audience (aud): ...
   ```

2. **Network 탭**에서:
   - `/api/getprojects` 요청 클릭
   - **Headers** 탭 → **Request Headers** → `Authorization: Bearer ...` 확인
   - **Response** 탭 → 에러 메시지 확인

## 방법 6: Function App의 Log stream 직접 접근

URL을 직접 입력하여 접근:
```
https://portal.azure.com/#@your-tenant/resource/subscriptions/70f6e0c4-c5fe-43e2-bfd2-138d80e020ec/resourceGroups/rg-landing-page-pro/providers/Microsoft.Web/sites/func-landing-page-pro/logStream
```

## 가장 빠른 방법: Azure CLI

가장 빠르게 로그를 확인하려면:

```powershell
az webapp log tail --name func-landing-page-pro --resource-group rg-landing-page-pro
```

이 명령어를 실행하면 실시간으로 로그가 표시됩니다.

---

**작성일**: 2025-12-31
**작성자**: Claude Code


