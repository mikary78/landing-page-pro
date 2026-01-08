# Azure Functions Dockerfile
FROM mcr.microsoft.com/azure-functions/node:4-node18-appservice

ENV AzureWebJobsScriptRoot=/home/site/wwwroot \
    AzureFunctionsJobHost__Logging__Console__IsEnabled=true \
    NODE_ENV=production

WORKDIR /home/site/wwwroot

# 의존성 파일 복사 및 설치
COPY package*.json ./
RUN npm ci --only=production

# 소스 코드 복사 및 빌드
COPY . .
RUN npm run build

# 빌드된 파일을 함수 앱 디렉토리로 복사
RUN cp -r dist/* . && \
    cp host.json . && \
    cp package.dist.json package.json

EXPOSE 80

