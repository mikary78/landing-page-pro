# Azure Functions v4 배포 성공 (2025-12-18)

## 개요
Azure Functions v4 Node.js Programming Model을 사용한 TypeScript 함수를 성공적으로 배포했습니다. "No HTTP triggers found" 오류를 해결하는 과정에서 여러 설정 문제를 발견하고 수정했습니다.

## 문제 상황

### 초기 증상
- VS Code Azure Functions extension으로 배포 시 "No HTTP triggers found" 오류 반복 발생
- 10회 이상 배포 시도했으나 계속 동일한 오류
- Azure Portal에서 함수 목록이 비어있음
- 404 Not Found 오류 발생

### 배포 로그
```
Deployment successful.
Started postDeployTask "npm install (functions)".
Syncing triggers...
Querying triggers...
No HTTP triggers found.
```

## 원인 분석

### 1. package.json의 main 필드 누락
**문제**: Azure Functions v4 Node.js Programming Model에서는 `package.json`의 `main` 필드가 **필수**입니다. 이 필드가 없으면 런타임이 함수의 진입점을 찾지 못합니다.

**해결**: `package.json`에 다음 추가
```json
{
  "main": "dist/index.js"
}
```

### 2. 루트 디렉터리에 오래된 빌드 파일 존재
**문제**: `tsconfig.json`의 `outDir`을 "."에서 "dist"로 변경했지만, 이전에 루트에 생성된 `index.js`, `functions/`, `lib/`, `middleware/` 폴더가 남아있어서 혼란 발생.

**해결**: 루트의 오래된 빌드 파일 삭제
```bash
rm -rf index.js functions lib middleware
```

### 3. dist 폴더에 host.json과 package.json 누락
**문제**: TypeScript 빌드 시 `.ts` 파일만 컴파일되고, Azure Functions 런타임에 필요한 `host.json`과 `package.json`이 dist 폴더에 복사되지 않음.

**해결**: 빌드 스크립트에 파일 복사 단계 추가
```json
{
  "scripts": {
    "build": "tsc && npm run copy-files",
    "copy-files": "cp host.json dist/ && cp package.dist.json dist/package.json"
  }
}
```

**참고**: `dist/package.json`의 `main` 필드는 `"index.js"`로 설정 (상대 경로)

### 4. AzureWebJobsFeatureFlags 설정 필요
**문제**: Azure Functions v4 Programming Model을 사용하려면 특정 기능 플래그가 필요.

**해결**: Azure 앱 설정에 추가
```bash
az functionapp config appsettings set \
  --name func-landing-page-pro \
  --resource-group rg-landing-page-pro \
  --settings "AzureWebJobsFeatureFlags=EnableWorkerIndexing"
```

### 5. .funcignore 설정 오류
**문제**: 초기에 `.funcignore`를 다음과 같이 설정하여 모든 파일이 제외됨
```
*
!dist/**
```

**해결**: 필요한 파일만 제외하도록 변경
```
.git*
.vscode
local.settings.json
test
src
tsconfig.json
*.d.ts
*.d.ts.map
package.dist.json
deploy.zip
```

### 6. node_modules 크기 문제
**문제**: 처음에는 node_modules를 포함하여 배포 패키지 크기가 488MB로 매우 컸음.

**참고**: Azure에서 배포 후 자동으로 `npm install`을 실행하므로 node_modules는 배포하지 않아도 됨.

## 최종 해결 방법

### 프로젝트 구조
```
azure-functions/
├── dist/                          # 빌드 결과물 (배포됨)
│   ├── host.json
│   ├── package.json              # main: "index.js"
│   ├── index.js                   # 모든 함수 import
│   ├── functions/
│   │   ├── hello.js
│   │   ├── processDocument.js
│   │   └── generateCurriculum.js
│   ├── lib/
│   │   ├── ai-services.js
│   │   └── database.js
│   └── middleware/
│       └── auth.js
├── src/                           # TypeScript 소스 (배포 안 됨)
│   ├── index.ts
│   ├── functions/
│   ├── lib/
│   └── middleware/
├── package.json                   # main: "dist/index.js"
├── package.dist.json             # dist용 package.json 템플릿
├── tsconfig.json
├── host.json
└── .funcignore
```

### 핵심 파일 설정

#### 1. package.json (루트)
```json
{
  "name": "landing-page-pro-functions",
  "version": "1.0.0",
  "main": "dist/index.js",
  "type": "commonjs",
  "engines": {
    "node": ">=18.0.0"
  },
  "scripts": {
    "build": "tsc && npm run copy-files",
    "copy-files": "cp host.json dist/ && cp package.dist.json dist/package.json",
    "watch": "tsc -w",
    "prestart": "npm run build",
    "start": "func start"
  },
  "dependencies": {
    "@azure/functions": "^4.5.0",
    "pg": "^8.11.3",
    "jsonwebtoken": "^9.0.2",
    "jwks-rsa": "^3.1.0",
    "openai": "^4.20.1",
    "@anthropic-ai/sdk": "^0.17.0",
    "@google/generative-ai": "^0.1.3",
    "dotenv": "^16.3.1",
    "typescript": "^5.3.3"
  }
}
```

#### 2. package.dist.json (dist 폴더용)
```json
{
  "name": "landing-page-pro-functions",
  "version": "1.0.0",
  "main": "index.js",
  "type": "commonjs",
  "engines": {
    "node": ">=18.0.0"
  },
  "dependencies": {
    "@azure/functions": "^4.5.0",
    "pg": "^8.11.3",
    "jsonwebtoken": "^9.0.2",
    "jwks-rsa": "^3.1.0",
    "openai": "^4.20.1",
    "@anthropic-ai/sdk": "^0.17.0",
    "@google/generative-ai": "^0.1.3",
    "dotenv": "^16.3.1"
  }
}
```

#### 3. tsconfig.json
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "moduleResolution": "node",
    "declaration": false,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

#### 4. .funcignore
```
.git*
.vscode
local.settings.json
test
.editorconfig
.npmrc
.env
README.md
src
tsconfig.json
*.d.ts
*.d.ts.map
package.dist.json
deploy.zip
```

#### 5. host.json
```json
{
  "version": "2.0",
  "logging": {
    "applicationInsights": {
      "samplingSettings": {
        "isEnabled": true,
        "maxTelemetryItemsPerSecond": 20
      }
    }
  },
  "extensionBundle": {
    "id": "Microsoft.Azure.Functions.ExtensionBundle",
    "version": "[4.*, 5.0.0)"
  },
  "extensions": {
    "http": {
      "routePrefix": "api"
    }
  }
}
```

#### 6. src/index.ts
```typescript
/**
 * Azure Functions Entry Point
 * Import all function modules to register them
 */

import './functions/hello';
import './functions/processDocument';
import './functions/generateCurriculum';
```

### 배포 프로세스

1. **빌드**
```bash
cd azure-functions
npm run build
```

2. **VS Code에서 배포**
   - `azure-functions` 폴더 우클릭 (dist 폴더가 아니라!)
   - "Deploy to Function App..." 선택
   - func-landing-page-pro 선택
   - Deploy 클릭

3. **배포 결과 확인**
```
HTTP Trigger Urls:
  generateCurriculum: https://func-landing-page-pro.azurewebsites.net/api/generatecurriculum
  hello: https://func-landing-page-pro.azurewebsites.net/api/hello
  processDocument: https://func-landing-page-pro.azurewebsites.net/api/processdocument
```

## 배포된 Azure Functions

### 1. hello
- **URL**: `https://func-landing-page-pro.azurewebsites.net/api/hello`
- **메서드**: GET, POST
- **용도**: 테스트용 간단한 함수
- **테스트**:
```bash
curl "https://func-landing-page-pro.azurewebsites.net/api/hello?name=Azure"
# 출력: Hello, Azure!
```

### 2. processDocument
- **URL**: `https://func-landing-page-pro.azurewebsites.net/api/processdocument`
- **메서드**: POST
- **용도**: 업로드된 문서를 AI로 분석하여 프로젝트/코스 생성
- **인증**: Microsoft Entra ID (JWT)
- **AI 모델**: Gemini, Claude, ChatGPT

### 3. generateCurriculum
- **URL**: `https://func-landing-page-pro.azurewebsites.net/api/generatecurriculum`
- **메서드**: POST
- **용도**: 프로젝트/코스의 커리큘럼 생성
- **인증**: Microsoft Entra ID (JWT)
- **AI 모델**: Gemini, Claude, ChatGPT

## Azure 설정

### App Settings
```bash
# Function App 기본 설정
FUNCTIONS_WORKER_RUNTIME=node
FUNCTIONS_EXTENSION_VERSION=~4
AzureWebJobsFeatureFlags=EnableWorkerIndexing

# Microsoft Entra ID
ENTRA_TENANT_ID=f9230b9b-e666-42ce-83be-aa6deb0f78b4
ENTRA_CLIENT_ID=234895ba-cc32-4306-a28b-e287742f8

# PostgreSQL
AZURE_POSTGRES_HOST=psql-landing-page-pro.postgres.database.azure.com
AZURE_POSTGRES_DATABASE=landing_page_db
AZURE_POSTGRES_USER=adminuser
AZURE_POSTGRES_PASSWORD=[REDACTED]
AZURE_POSTGRES_PORT=5432

# AI API Keys
GEMINI_API_KEY=[REDACTED]
ANTHROPIC_API_KEY=[REDACTED]
OPENAI_API_KEY=[REDACTED]
```

### CORS 설정
```bash
az functionapp cors add \
  --name func-landing-page-pro \
  --resource-group rg-landing-page-pro \
  --allowed-origins "http://localhost:5173"
```

## 학습한 교훈

### Azure Functions v4 Node.js Programming Model의 핵심 요구사항

1. **package.json의 main 필드는 필수**
   - v3에서는 선택적이었지만, v4에서는 필수
   - 함수의 진입점을 정확히 지정해야 함

2. **TypeScript 프로젝트에서는 빌드 결과물 구조가 중요**
   - dist 폴더에 host.json과 package.json이 있어야 함
   - package.json의 main 경로가 배포 구조와 일치해야 함

3. **파일 경로는 상대 경로로**
   - 루트 package.json: `main: "dist/index.js"`
   - dist/package.json: `main: "index.js"`

4. **v4 모델은 function.json 불필요**
   - 코드에서 `app.http()`로 함수 등록
   - 폴더 구조가 자유로움

5. **.funcignore는 신중하게 설정**
   - `*` 패턴 사용 시 주의
   - 필요한 파일(dist, host.json, package.json)이 제외되지 않도록

### 디버깅 팁

1. **배포 로그 주의 깊게 확인**
   - "Adding X files to zip package..." - 파일 수 확인
   - "Zip package size" - 너무 작으면 파일이 누락된 것

2. **Azure CLI로 함수 목록 확인**
```bash
az functionapp function list \
  --name func-landing-page-pro \
  --resource-group rg-landing-page-pro \
  -o table
```

3. **직접 HTTP 요청으로 테스트**
```bash
curl "https://func-landing-page-pro.azurewebsites.net/api/hello"
```

4. **Application Insights 로그 확인**
   - Azure Portal에서 실시간 로그 스트림 확인
   - 함수 시작 시 오류 메시지 확인

## 다음 단계

1. ✅ Azure Functions 배포 완료
2. ⏳ 프론트엔드에서 Azure Functions 연동 테스트
3. ⏳ Microsoft Entra ID 인증 통합 테스트
4. ⏳ AI API 키 설정 및 문서 처리 테스트
5. ⏳ PostgreSQL 데이터베이스 연동 테스트

## 참고 자료

- [Azure Functions v4 Node.js Programming Model](https://learn.microsoft.com/en-us/azure/azure-functions/functions-reference-node)
- [Azure Functions TypeScript Developer Guide](https://learn.microsoft.com/en-us/azure/azure-functions/functions-reference-node?tabs=typescript)
- [Troubleshooting "No HTTP triggers found"](https://github.com/Azure/azure-functions-nodejs-worker/issues/254)
