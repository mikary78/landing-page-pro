# Azure 리소스 자동 생성 스크립트
# PowerShell 7+ 필요

param(
    [Parameter(Mandatory=$false)]
    [string]$ResourceGroup = "rg-landing-page-pro",

    [Parameter(Mandatory=$false)]
    [string]$Location = "koreacentral",

    [Parameter(Mandatory=$false)]
    [string]$PostgresPassword = "",

    [Parameter(Mandatory=$false)]
    [switch]$SkipPostgres,

    [Parameter(Mandatory=$false)]
    [switch]$SkipStorage,

    [Parameter(Mandatory=$false)]
    [switch]$SkipFunctions,

    [Parameter(Mandatory=$false)]
    [switch]$SkipAppService
)

# 색상 출력 함수
function Write-Step {
    param([string]$Message)
    Write-Host "`n===> $Message" -ForegroundColor Cyan
}

function Write-Success {
    param([string]$Message)
    Write-Host "✓ $Message" -ForegroundColor Green
}

function Write-Error-Custom {
    param([string]$Message)
    Write-Host "✗ $Message" -ForegroundColor Red
}

function Write-Info {
    param([string]$Message)
    Write-Host "ℹ $Message" -ForegroundColor Yellow
}

# Azure CLI 확인
Write-Step "Azure CLI 확인 중..."
if (-not (Get-Command az -ErrorAction SilentlyContinue)) {
    Write-Error-Custom "Azure CLI가 설치되지 않았습니다."
    Write-Info "설치: winget install Microsoft.AzureCLI"
    exit 1
}
Write-Success "Azure CLI 설치됨"

# 로그인 확인
Write-Step "Azure 로그인 확인 중..."
$account = az account show 2>&1 | ConvertFrom-Json
if ($LASTEXITCODE -ne 0) {
    Write-Info "Azure 로그인이 필요합니다..."
    az login
}
$subscription = $account.name
Write-Success "로그인됨: $subscription"

# PostgreSQL 비밀번호 확인
if (-not $SkipPostgres -and -not $PostgresPassword) {
    $PostgresPassword = Read-Host -Prompt "PostgreSQL 관리자 비밀번호 입력 (최소 8자, 대소문자+숫자+특수문자)" -AsSecureString
    $PostgresPassword = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
        [Runtime.InteropServices.Marshal]::SecureStringToBSTR($PostgresPassword)
    )
}

# Resource Group 생성
Write-Step "Resource Group 생성 중..."
az group create `
    --name $ResourceGroup `
    --location $Location `
    --tags Environment=Production Project=LandingPagePro
if ($LASTEXITCODE -eq 0) {
    Write-Success "Resource Group 생성 완료: $ResourceGroup"
} else {
    Write-Error-Custom "Resource Group 생성 실패"
    exit 1
}

# PostgreSQL 생성
if (-not $SkipPostgres) {
    Write-Step "PostgreSQL Flexible Server 생성 중 (5-10분 소요)..."
    $postgresName = "psql-landing-page-pro"

    az postgres flexible-server create `
        --resource-group $ResourceGroup `
        --name $postgresName `
        --location $Location `
        --admin-user pgadmin `
        --admin-password $PostgresPassword `
        --sku-name Standard_B1ms `
        --tier Burstable `
        --storage-size 32 `
        --version 15 `
        --public-access 0.0.0.0 `
        --backup-retention 7 `
        --yes

    if ($LASTEXITCODE -eq 0) {
        Write-Success "PostgreSQL 서버 생성 완료"

        # 데이터베이스 생성
        Write-Step "데이터베이스 생성 중..."
        az postgres flexible-server db create `
            --resource-group $ResourceGroup `
            --server-name $postgresName `
            --database-name landingpagepro

        Write-Success "데이터베이스 생성 완료: landingpagepro"

        # Azure 서비스 방화벽 규칙
        Write-Step "방화벽 규칙 추가 중..."
        az postgres flexible-server firewall-rule create `
            --resource-group $ResourceGroup `
            --name $postgresName `
            --rule-name AllowAzureServices `
            --start-ip-address 0.0.0.0 `
            --end-ip-address 0.0.0.0

        # 연결 문자열 출력
        Write-Info "연결 문자열:"
        $connString = "postgresql://pgadmin:$PostgresPassword@$postgresName.postgres.database.azure.com:5432/landingpagepro?sslmode=require"
        Write-Host $connString -ForegroundColor White
    } else {
        Write-Error-Custom "PostgreSQL 생성 실패"
    }
}

# Storage Account 생성
if (-not $SkipStorage) {
    Write-Step "Storage Account 생성 중..."
    $storageName = "stlandingpagepro"

    az storage account create `
        --name $storageName `
        --resource-group $ResourceGroup `
        --location $Location `
        --sku Standard_LRS `
        --kind StorageV2 `
        --access-tier Hot

    if ($LASTEXITCODE -eq 0) {
        Write-Success "Storage Account 생성 완료"

        # Blob 컨테이너 생성
        Write-Step "Blob 컨테이너 생성 중..."
        az storage container create `
            --name user-uploads `
            --account-name $storageName `
            --public-access blob `
            --auth-mode login

        az storage container create `
            --name generated-documents `
            --account-name $storageName `
            --public-access blob `
            --auth-mode login

        Write-Success "컨테이너 생성 완료"

        # 연결 문자열 출력
        $storageConn = az storage account show-connection-string `
            --name $storageName `
            --resource-group $ResourceGroup `
            --output tsv
        Write-Info "Storage 연결 문자열:"
        Write-Host $storageConn -ForegroundColor White
    } else {
        Write-Error-Custom "Storage Account 생성 실패"
    }
}

# Azure Functions 생성
if (-not $SkipFunctions) {
    Write-Step "Azure Functions 생성 중..."
    $funcName = "func-landing-page-pro"
    $storageName = "stlandingpagepro"

    az functionapp create `
        --resource-group $ResourceGroup `
        --name $funcName `
        --storage-account $storageName `
        --consumption-plan-location $Location `
        --runtime node `
        --runtime-version 20 `
        --functions-version 4 `
        --os-type Linux

    if ($LASTEXITCODE -eq 0) {
        Write-Success "Azure Functions 생성 완료"

        # CORS 설정
        Write-Step "CORS 설정 중..."
        az functionapp cors add `
            --name $funcName `
            --resource-group $ResourceGroup `
            --allowed-origins "http://localhost:5173" "https://app-landing-page-pro.azurewebsites.net"

        Write-Success "CORS 설정 완료"
        Write-Info "Functions URL: https://$funcName.azurewebsites.net"
    } else {
        Write-Error-Custom "Azure Functions 생성 실패"
    }
}

# App Service 생성
if (-not $SkipAppService) {
    Write-Step "App Service 생성 중..."
    $appName = "app-landing-page-pro"
    $planName = "plan-landing-page-pro"

    # App Service Plan
    az appservice plan create `
        --name $planName `
        --resource-group $ResourceGroup `
        --location $Location `
        --sku B1 `
        --is-linux

    # Web App
    az webapp create `
        --name $appName `
        --resource-group $ResourceGroup `
        --plan $planName `
        --runtime "NODE:20-lts"

    if ($LASTEXITCODE -eq 0) {
        Write-Success "App Service 생성 완료"
        Write-Info "App URL: https://$appName.azurewebsites.net"
    } else {
        Write-Error-Custom "App Service 생성 실패"
    }
}

# 완료 메시지
Write-Host "`n" -NoNewline
Write-Host "========================================" -ForegroundColor Green
Write-Host "Azure 리소스 생성 완료!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host "`n다음 단계:" -ForegroundColor Yellow
Write-Host "1. Azure Portal에서 Azure AD B2C 테넌트 생성" -ForegroundColor White
Write-Host "2. .env.azure 파일 작성 (PHASE1-SETUP-GUIDE.md 참고)" -ForegroundColor White
Write-Host "3. Phase 2: 데이터 마이그레이션 진행" -ForegroundColor White
Write-Host "`nAzure Portal: https://portal.azure.com" -ForegroundColor Cyan
