# Azure Functions 배포 가이드

## 문제 상황

새로 만든 API 함수들(`getProjects`, `getCourses`, `getTemplates`, `createProject`, `createCourse`, `deleteProject`, `deleteCourse`, `getStats`)이 Azure에 배포되지 않아 404 에러가 발생합니다.

## 배포 방법

### 1. Azure Functions 빌드

```bash
cd azure-functions
npm run build
```

### 2. Azure Functions 배포

```bash
func azure functionapp publish func-landing-page-pro
```

### 3. 배포 확인

배포 후 다음 URL들이 작동해야 합니다:
- `https://func-landing-page-pro.azurewebsites.net/api/getProjects`
- `https://func-landing-page-pro.azurewebsites.net/api/getCourses`
- `https://func-landing-page-pro.azurewebsites.net/api/getTemplates`
- `https://func-landing-page-pro.azurewebsites.net/api/createProject`
- `https://func-landing-page-pro.azurewebsites.net/api/createCourse`
- `https://func-landing-page-pro.azurewebsites.net/api/deleteProject/{projectId}`
- `https://func-landing-page-pro.azurewebsites.net/api/deleteCourse/{courseId}`
- `https://func-landing-page-pro.azurewebsites.net/api/getStats/{userId}`

## 로컬 테스트 (선택사항)

로컬에서 테스트하려면:

1. Azure Functions 로컬 실행:
```bash
cd azure-functions
npm run build
npm start
```

2. 프론트엔드 `.env` 파일 수정:
```env
VITE_AZURE_FUNCTIONS_URL=http://localhost:7071
```

3. 프론트엔드 재시작

## 환경 변수 확인

Azure Portal에서 다음 환경 변수가 설정되어 있는지 확인:

- `AZURE_POSTGRES_HOST`
- `AZURE_POSTGRES_DATABASE`
- `AZURE_POSTGRES_USER`
- `AZURE_POSTGRES_PASSWORD`
- `ENTRA_TENANT_ID`
- `ENTRA_CLIENT_ID`
- `ENTRA_TENANT_NAME` (External ID 사용 시)
- `GEMINI_API_KEY`
- `ANTHROPIC_API_KEY`
- `OPENAI_API_KEY`

## 배포 후 확인 사항

1. Azure Portal → Function App → Functions에서 모든 함수가 표시되는지 확인
2. 각 함수의 "Test/Run"에서 테스트 가능한지 확인
3. 프론트엔드에서 API 호출이 정상 작동하는지 확인
