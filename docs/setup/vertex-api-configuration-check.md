# Vertex API 설정 확인 보고서

## 작성일: 2026-01-11

## 현재 설정 상태

### ✅ 설정 완료된 항목

```json
{
  "VERTEX_API_KEY": "AQ.Ab8RN6J1SmiXggNT2qUnbqjEh64WcMqL_cDE3M4945rmRefGBQ",
  "VERTEX_PROJECT_ID": "gen-lang-client-0266350407",
  "VERTEX_LOCATION": "us-central1"
}
```

### 확인 사항

1. **API 키 형식**: `AQ.`으로 시작하는 형식
   - 일반적인 Google API 키는 `AIzaSy`로 시작
   - 이 형식은 Vertex AI의 특별한 인증 토큰일 수 있음
   - 또는 OAuth 2.0 액세스 토큰일 가능성

2. **프로젝트 ID**: `gen-lang-client-0266350407`
   - 형식이 올바른지 확인 필요
   - Google Cloud Console에서 확인된 프로젝트 ID인지 검증 필요

3. **리전**: `us-central1`
   - ✅ 올바른 리전 (지원되는 리전)

---

## 코드 구현 확인

### 현재 구현 상태

**파일**: `azure-functions/src/lib/image-generation.ts`

```typescript
// 1. Vertex AI Imagen API 우선 시도
if (vertexApiKey || process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  const imagenResult = await generateImageWithImagen(prompt, {
    apiKey: vertexApiKey,
    projectId: vertexProjectId,
    location: vertexLocation,
  });
  // ...
}

// 2. OpenAI DALL-E 대체 옵션
if (!imagenResult) {
  // OpenAI 사용
}
```

### API 호출 방식

```typescript
const endpoint = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/imagegeneration@006:predict`;

const response = await fetch(endpoint, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${apiKey}`,  // ← API 키를 Bearer 토큰으로 사용
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    instances: [{
      prompt: prompt,
    }],
    parameters: {
      sampleCount: 1,
      aspectRatio: '1:1',
      safetyFilterLevel: 'block_some',
      personGeneration: 'allow_all',
    },
  }),
});
```

---

## 잠재적 문제점 및 해결 방안

### 문제 1: API 키 인증 방식

**현재**: API 키를 Bearer 토큰으로 직접 사용
**문제**: Vertex AI API는 일반적으로 OAuth 2.0 액세스 토큰을 요구할 수 있음

**해결 방안**:
1. API 키가 실제로 액세스 토큰인지 확인
2. API 키를 사용하여 액세스 토큰을 발급받아야 할 수도 있음
3. 또는 서비스 계정 키를 사용하여 액세스 토큰 생성

### 문제 2: 엔드포인트 형식

**현재**: `imagegeneration@006:predict`
**확인 필요**: 실제 Imagen API 엔드포인트가 올바른지 확인

**가능한 엔드포인트**:
- `imagegeneration@006:predict` (현재 사용 중)
- `imagen-3.0-generate-001:predict`
- `imagen-3.0-generate-002:predict`

### 문제 3: 요청 본문 형식

**현재**: `instances` 배열 사용
**확인 필요**: Imagen API의 실제 요청 형식 확인

**가능한 형식**:
```json
{
  "instances": [{
    "prompt": "prompt text"
  }],
  "parameters": { ... }
}
```

또는

```json
{
  "prompt": "prompt text",
  "parameters": { ... }
}
```

---

## 테스트 방법

### 1. 로컬 테스트

```bash
cd azure-functions
npm run build
npm start
```

### 2. 이미지 생성 테스트

1. 프로젝트 생성 페이지에서 새 프로젝트 생성
2. "이미지 생성" 옵션 활성화
3. Generation Studio에서 이미지 생성 단계 확인
4. 로그 확인:
   - `[image-generation] Imagen API 사용` 메시지 확인
   - 오류 메시지 확인

### 3. API 직접 테스트 (선택사항)

```bash
curl -X POST \
  "https://us-central1-aiplatform.googleapis.com/v1/projects/gen-lang-client-0266350407/locations/us-central1/publishers/google/models/imagegeneration@006:predict" \
  -H "Authorization: Bearer AQ.Ab8RN6J1SmiXggNT2qUnbqjEh64WcMqL_cDE3M4945rmRefGBQ" \
  -H "Content-Type: application/json" \
  -d '{
    "instances": [{
      "prompt": "A beautiful sunset over mountains"
    }],
    "parameters": {
      "sampleCount": 1,
      "aspectRatio": "1:1"
    }
  }'
```

---

## 권장 사항

### 1. 즉시 확인할 사항

- ✅ API 키가 유효한지 확인
- ✅ 프로젝트 ID가 올바른지 확인
- ✅ Vertex AI API가 활성화되어 있는지 확인

### 2. 오류 발생 시 확인할 사항

1. **401 Unauthorized**: API 키가 유효하지 않음
   - Google Cloud Console에서 API 키 재생성
   - 또는 서비스 계정 키 사용

2. **403 Forbidden**: 권한 없음
   - Vertex AI API가 활성화되어 있는지 확인
   - 서비스 계정에 올바른 역할이 부여되어 있는지 확인

3. **404 Not Found**: 엔드포인트 오류
   - 프로젝트 ID 확인
   - 리전 확인
   - 모델 이름 확인

4. **400 Bad Request**: 요청 형식 오류
   - 요청 본문 형식 확인
   - 파라미터 이름 확인

### 3. 대체 방안

만약 Vertex AI Imagen API가 작동하지 않으면:
- ✅ OpenAI DALL-E가 자동으로 대체 옵션으로 사용됨
- ✅ `OPENAI_API_KEY`가 설정되어 있으면 정상 작동

---

## 다음 단계

1. ✅ 설정 확인 완료
2. 🔄 실제 이미지 생성 테스트
3. 🔄 오류 발생 시 로그 확인 및 문제 해결
4. 🔄 필요시 API 호출 방식 수정

---

**참고**: 
- Vertex AI API는 계속 업데이트되고 있으므로, 최신 문서를 확인하는 것이 중요합니다
- API 키 형식이 특이한 경우, Google Cloud Console에서 확인하거나 지원팀에 문의하세요
