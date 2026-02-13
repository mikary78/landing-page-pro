# Google Cloud 프로젝트 ID 확인 방법

## 작성일: 2026-01-11

## 프로젝트 ID란?

프로젝트 ID는 Google Cloud 프로젝트를 고유하게 식별하는 문자열입니다.
- 형식: 영문자, 숫자, 하이픈으로 구성 (예: `landing-page-pro-123456`)
- 프로젝트 이름과는 다릅니다 (프로젝트 이름은 변경 가능하지만, 프로젝트 ID는 변경 불가)

---

## 방법 1: Google Cloud Console 상단에서 확인 (가장 간단)

### 현재 화면에서 확인

1. Google Cloud Console 상단의 **프로젝트 선택 드롭다운**을 클릭하세요
   ```
   [프로젝트 이름 ▼]  ← 이 부분을 클릭
   ```

2. 드롭다운이 열리면:
   - 현재 선택된 프로젝트가 표시됩니다
   - 프로젝트 이름 옆에 **프로젝트 ID**가 괄호 안에 표시됩니다
   ```
   예시:
   ┌─────────────────────────────────────┐
   │ 프로젝트 이름                        │
   │ landing-page-pro-images             │
   │ (landing-page-pro-123456)  ← 이것이 프로젝트 ID
   └─────────────────────────────────────┘
   ```

3. 괄호 안의 값이 **프로젝트 ID**입니다

---

## 방법 2: 프로젝트 정보 페이지에서 확인

1. Google Cloud Console 상단의 **프로젝트 선택 드롭다운** 클릭
2. **프로젝트 정보** 아이콘 (ℹ️) 클릭
3. 프로젝트 정보 페이지가 열리면:
   - **프로젝트 ID** 섹션에서 확인 가능
   - 복사 버튼을 클릭하여 복사 가능

```
┌─────────────────────────────────────────┐
│ 프로젝트 정보                            │
├─────────────────────────────────────────┤
│ 프로젝트 이름:                           │
│ landing-page-pro-images                  │
│                                          │
│ 프로젝트 ID:                             │
│ landing-page-pro-123456  [복사]  ← 클릭 │
│                                          │
│ 프로젝트 번호:                           │
│ 123456789012                             │
└─────────────────────────────────────────┘
```

---

## 방법 3: 프로젝트 설정에서 확인

1. Google Cloud Console 왼쪽 메뉴에서 **IAM 및 관리자** → **설정** 클릭
2. **프로젝트 정보** 섹션에서 **프로젝트 ID** 확인

---

## 방법 4: URL에서 확인

Google Cloud Console의 URL을 보면 프로젝트 ID를 확인할 수 있습니다:

```
https://console.cloud.google.com/apis/credentials?project=landing-page-pro-123456
                                                      ↑
                                              이것이 프로젝트 ID
```

---

## 방법 5: gcloud CLI로 확인

터미널에서 다음 명령어 실행:

```bash
# 현재 설정된 프로젝트 ID 확인
gcloud config get-value project

# 또는 프로젝트 목록 확인
gcloud projects list
```

---

## 프로젝트 ID vs 프로젝트 이름

### 프로젝트 ID
- ✅ 고유하고 변경 불가
- ✅ API 호출에 사용
- ✅ 형식: `landing-page-pro-123456`

### 프로젝트 이름
- ✅ 사용자가 지정한 이름
- ✅ 변경 가능
- ✅ 형식: `Landing Page Pro Images`

**중요**: `VERTEX_PROJECT_ID`에는 **프로젝트 ID**를 사용해야 합니다 (프로젝트 이름이 아님)

---

## local.settings.json에 설정하기

확인한 프로젝트 ID를 `azure-functions/local.settings.json`에 추가:

```json
{
  "Values": {
    "VERTEX_API_KEY": "your-api-key",
    "VERTEX_PROJECT_ID": "landing-page-pro-123456",  ← 여기에 프로젝트 ID
    "VERTEX_LOCATION": "us-central1"
  }
}
```

---

## 빠른 확인 방법 (요약)

1. **Google Cloud Console 상단**의 프로젝트 선택 드롭다운 클릭
2. 프로젝트 이름 옆 **괄호 안의 값**이 프로젝트 ID
3. 복사하여 `VERTEX_PROJECT_ID`에 붙여넣기

---

## 문제 해결

### 문제: 프로젝트 ID가 보이지 않음

**해결 방법**:
1. 올바른 Google 계정으로 로그인했는지 확인
2. 프로젝트가 생성되었는지 확인
3. 페이지를 새로고침 (F5)

### 문제: 여러 프로젝트가 있을 때

**해결 방법**:
1. 프로젝트 선택 드롭다운에서 올바른 프로젝트 선택
2. 선택한 프로젝트의 프로젝트 ID 확인
3. Vertex AI API가 활성화된 프로젝트인지 확인

---

**참고**: 프로젝트 ID는 한 번 생성되면 변경할 수 없으므로, 안전하게 보관하세요.
