# ============================================
# Landing Page Pro - Azure Functions Dockerfile
# ============================================
# Azure Functions v4 Node.js 20 런타임 기반
#
# 빌드: docker build -t landing-page-pro-functions:latest .
# 실행: docker run -p 7071:80 landing-page-pro-functions:latest
# ============================================

# Azure Functions Node.js 20 베이스 이미지
FROM mcr.microsoft.com/azure-functions/node:4-node20

# 환경 변수 설정
ENV AzureWebJobsScriptRoot=/home/site/wwwroot \
    AzureFunctionsJobHost__Logging__Console__IsEnabled=true \
    FUNCTIONS_WORKER_RUNTIME=node \
    NODE_ENV=production

# 작업 디렉토리 설정
WORKDIR /home/site/wwwroot

# 패키지 파일 복사
COPY package*.json ./

# 프로덕션 의존성만 설치
RUN npm ci --omit=dev

# TypeScript 빌드된 파일 복사 (dist 폴더)
COPY dist/ ./

# host.json 복사
COPY host.json ./

# 헬스체크
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:80/api/hello || exit 1

# 포트 노출 (Azure Functions 기본 포트)
EXPOSE 80

# Azure Functions 런타임이 자동으로 시작됨
