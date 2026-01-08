# ============================================
# Azure API Management 설정 스크립트
# ============================================
# 
# 이 스크립트는 API Management가 생성된 후 실행해야 합니다.
# Azure Functions API를 API Management에 등록하고 정책을 설정합니다.
#
# 실행: .\setup-apim.ps1
# ============================================

param(
    [string]$ResourceGroup = "rg-landing-page-pro",
    [string]$ApimName = "apim-landing-page-pro",
    [string]$FunctionAppName = "func-landing-page-pro",
    [string]$ApiName = "landing-page-pro-api",
    [string]$ApiDisplayName = "Landing Page Pro API",
    [string]$ApiPath = "api"
)

Write-Host "======================================"
Write-Host "Azure API Management 설정 시작"
Write-Host "======================================" -ForegroundColor Cyan

# API Management 상태 확인
Write-Host "`n1. API Management 상태 확인..." -ForegroundColor Yellow
$apimState = az apim show --name $ApimName --resource-group $ResourceGroup --query "provisioningState" --output tsv

if ($apimState -ne "Succeeded") {
    Write-Host "API Management가 아직 준비되지 않았습니다. 현재 상태: $apimState" -ForegroundColor Red
    Write-Host "잠시 후 다시 시도해주세요." -ForegroundColor Yellow
    exit 1
}

Write-Host "API Management 준비 완료!" -ForegroundColor Green

# Function App Function Key 가져오기
Write-Host "`n2. Function App 키 가져오기..." -ForegroundColor Yellow
$functionKey = az functionapp keys list --name $FunctionAppName --resource-group $ResourceGroup --query "functionKeys.default" --output tsv

if (-not $functionKey) {
    Write-Host "Function Key를 가져올 수 없습니다." -ForegroundColor Red
    exit 1
}

Write-Host "Function Key 획득 완료!" -ForegroundColor Green

# API Management에서 API 가져오기 (Azure Functions)
Write-Host "`n3. Azure Functions API 가져오기..." -ForegroundColor Yellow

# OpenAPI 스펙 URL (Azure Functions가 제공하는 경우)
$functionAppUrl = "https://$FunctionAppName.azurewebsites.net"

# Named Value로 Function Key 저장
Write-Host "   - Named Value 생성 (Function Key)..." -ForegroundColor Gray
az apim nv create `
    --resource-group $ResourceGroup `
    --service-name $ApimName `
    --named-value-id "function-key" `
    --display-name "Azure Functions Key" `
    --value $functionKey `
    --secret true `
    --output none

# API 생성 (수동)
Write-Host "   - API 생성..." -ForegroundColor Gray
az apim api create `
    --resource-group $ResourceGroup `
    --service-name $ApimName `
    --api-id $ApiName `
    --display-name $ApiDisplayName `
    --path $ApiPath `
    --protocols https `
    --service-url "$functionAppUrl/api" `
    --subscription-required false `
    --output none

Write-Host "API 생성 완료!" -ForegroundColor Green

# API 작업(Operations) 추가
Write-Host "`n4. API Operations 추가..." -ForegroundColor Yellow

# Hello API
az apim api operation create `
    --resource-group $ResourceGroup `
    --service-name $ApimName `
    --api-id $ApiName `
    --operation-id "hello" `
    --display-name "Hello" `
    --method GET `
    --url-template "/hello" `
    --output none
Write-Host "   - GET /hello" -ForegroundColor Gray

# Health Check
az apim api operation create `
    --resource-group $ResourceGroup `
    --service-name $ApimName `
    --api-id $ApiName `
    --operation-id "health" `
    --display-name "Health Check" `
    --method GET `
    --url-template "/health" `
    --output none
Write-Host "   - GET /health" -ForegroundColor Gray

# User Profile
az apim api operation create `
    --resource-group $ResourceGroup `
    --service-name $ApimName `
    --api-id $ApiName `
    --operation-id "user-profile-get" `
    --display-name "Get User Profile" `
    --method GET `
    --url-template "/user/profile" `
    --output none
Write-Host "   - GET /user/profile" -ForegroundColor Gray

az apim api operation create `
    --resource-group $ResourceGroup `
    --service-name $ApimName `
    --api-id $ApiName `
    --operation-id "user-profile-post" `
    --display-name "Update User Profile" `
    --method POST `
    --url-template "/user/profile" `
    --output none
Write-Host "   - POST /user/profile" -ForegroundColor Gray

# Projects
az apim api operation create `
    --resource-group $ResourceGroup `
    --service-name $ApimName `
    --api-id $ApiName `
    --operation-id "projects-list" `
    --display-name "List Projects" `
    --method GET `
    --url-template "/projects" `
    --output none
Write-Host "   - GET /projects" -ForegroundColor Gray

az apim api operation create `
    --resource-group $ResourceGroup `
    --service-name $ApimName `
    --api-id $ApiName `
    --operation-id "projects-create" `
    --display-name "Create Project" `
    --method POST `
    --url-template "/projects" `
    --output none
Write-Host "   - POST /projects" -ForegroundColor Gray

az apim api operation create `
    --resource-group $ResourceGroup `
    --service-name $ApimName `
    --api-id $ApiName `
    --operation-id "project-get" `
    --display-name "Get Project" `
    --method GET `
    --url-template "/projects/{projectId}" `
    --output none
Write-Host "   - GET /projects/{projectId}" -ForegroundColor Gray

# Courses
az apim api operation create `
    --resource-group $ResourceGroup `
    --service-name $ApimName `
    --api-id $ApiName `
    --operation-id "courses-list" `
    --display-name "List Courses" `
    --method GET `
    --url-template "/courses" `
    --output none
Write-Host "   - GET /courses" -ForegroundColor Gray

# Brief Generation
az apim api operation create `
    --resource-group $ResourceGroup `
    --service-name $ApimName `
    --api-id $ApiName `
    --operation-id "brief-generate" `
    --display-name "Generate Brief" `
    --method POST `
    --url-template "/brief/generate" `
    --output none
Write-Host "   - POST /brief/generate" -ForegroundColor Gray

Write-Host "Operations 추가 완료!" -ForegroundColor Green

# API 정책 설정
Write-Host "`n5. API 정책 설정..." -ForegroundColor Yellow

$policy = @"
<policies>
    <inbound>
        <base />
        <!-- Function Key 헤더 추가 -->
        <set-header name="x-functions-key" exists-action="override">
            <value>{{function-key}}</value>
        </set-header>
        <!-- Rate Limiting -->
        <rate-limit calls="100" renewal-period="60" />
        <!-- CORS -->
        <cors allow-credentials="true">
            <allowed-origins>
                <origin>https://app-landing-page-pro.azurewebsites.net</origin>
                <origin>https://app-landing-page-pro-staging.azurewebsites.net</origin>
                <origin>http://localhost:5173</origin>
                <origin>http://localhost:3000</origin>
            </allowed-origins>
            <allowed-methods>
                <method>GET</method>
                <method>POST</method>
                <method>PUT</method>
                <method>DELETE</method>
                <method>OPTIONS</method>
            </allowed-methods>
            <allowed-headers>
                <header>*</header>
            </allowed-headers>
        </cors>
    </inbound>
    <backend>
        <base />
    </backend>
    <outbound>
        <base />
        <!-- 보안 헤더 추가 -->
        <set-header name="X-Content-Type-Options" exists-action="override">
            <value>nosniff</value>
        </set-header>
        <set-header name="X-Frame-Options" exists-action="override">
            <value>DENY</value>
        </set-header>
    </outbound>
    <on-error>
        <base />
    </on-error>
</policies>
"@

# 정책을 임시 파일로 저장
$policyFile = "$env:TEMP\apim-policy.xml"
$policy | Out-File -FilePath $policyFile -Encoding utf8

az apim api policy set `
    --resource-group $ResourceGroup `
    --service-name $ApimName `
    --api-id $ApiName `
    --policy-file $policyFile `
    --output none

Remove-Item $policyFile -ErrorAction SilentlyContinue

Write-Host "정책 설정 완료!" -ForegroundColor Green

# 결과 출력
Write-Host "`n======================================"
Write-Host "API Management 설정 완료!"
Write-Host "======================================" -ForegroundColor Cyan

$gatewayUrl = az apim show --name $ApimName --resource-group $ResourceGroup --query "gatewayUrl" --output tsv

Write-Host "`nAPI Gateway URL: $gatewayUrl" -ForegroundColor Green
Write-Host "API Base URL: $gatewayUrl/$ApiPath" -ForegroundColor Green

Write-Host "`n테스트 명령어:" -ForegroundColor Yellow
Write-Host "  curl $gatewayUrl/$ApiPath/hello"
Write-Host "  curl $gatewayUrl/$ApiPath/health"

Write-Host "`n프론트엔드 설정:" -ForegroundColor Yellow
Write-Host "  VITE_AZURE_FUNCTIONS_URL=$gatewayUrl/$ApiPath"
