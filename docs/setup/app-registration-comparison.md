# 애플리케이션 등록 비교

## 두 개의 애플리케이션 등록

현재 Azure Portal에 두 개의 애플리케이션 등록이 있습니다:

---

## 1. landing-page-pro (External ID)

**위치**: Microsoft Entra External ID

**정보**:
- **Display name**: `landing-page-pro`
- **Application (client) ID**: `9222c648-3066-455a-aa7e-49cdd9782943`
- **Object ID**: `f18aa014-c7d6-4936-ab50-f6bd449cefb8`
- **Directory (tenant) ID**: `64425cef-1c32-4713-bb61-7dcd4939e326`
- **Supported account types**: `My organization only`
- **Application ID URI**: `api://9222c648-3066-455a-aa7e-49cdd9782943`
- **Redirect URIs**: `0 web, 1 spa, 0 public client`

**특징**:
- ✅ External ID (CIAM) 테넌트 사용
- ✅ API scope `access_as_user` 등록됨
- ✅ 현재 코드에서 사용 중

---

## 2. landing-page-pro-app (Entra ID)

**위치**: Microsoft Entra ID (일반 Azure AD)

**정보**:
- **Display name**: `landing-page-pro-app`
- **Application (client) ID**: `234895ba-cc32-4306-a28b-e287742f8e4e`
- **Object ID**: `52b84520-d8e7-43da-8cae-7320c8848785`
- **Directory (tenant) ID**: `f9230b9b-e666-42ce-83be-aa6deb0f78b4`
- **Supported account types**: `My organization only`
- **Application ID URI**: `api://234895ba-cc32-4306-a28b-e287742f8e4e`
- **Redirect URIs**: `0 web, 5 spa, 0 public client`

**특징**:
- ⚠️ 일반 Entra ID 테넌트 사용 (Parandurume)
- ⚠️ 현재 코드에서 사용하지 않음

---

## 차이점 요약

| 항목 | landing-page-pro (External ID) | landing-page-pro-app (Entra ID) |
|------|-------------------------------|--------------------------------|
| **테넌트** | External ID (`64425cef-...`) | Entra ID (`f9230b9b-...`) |
| **Client ID** | `9222c648-3066-455a-aa7e-49cdd9782943` | `234895ba-cc32-4306-a28b-e287742f8e4e` |
| **사용 여부** | ✅ 현재 사용 중 | ❌ 사용하지 않음 |
| **API Scope** | ✅ `access_as_user` 등록됨 | ❓ 확인 필요 |
| **용도** | External ID (일반 사용자 회원가입) | Entra ID (조직 내부 사용자) |

---

## 현재 코드 설정

### 프론트엔드 (`.env`)
```env
VITE_ENTRA_TENANT_NAME="Landingpage"
VITE_ENTRA_TENANT_ID="64425cef-1c32-4713-bb61-7dcd4939e326"
VITE_ENTRA_CLIENT_ID="9222c648-3066-455a-aa7e-49cdd9782943"
```

### Azure Functions (`local.settings.json`)
```json
{
  "ENTRA_TENANT_ID": "f9230b9b-e666-42ce-83be-aa6deb0f78b4",
  "ENTRA_CLIENT_ID": "9222c648-3066-455a-aa7e-49cdd9782943"
}
```

### Azure Portal Function App
```
ENTRA_CLIENT_ID: 9222c648-3066-455a-aa7e-49cdd9782943
```

---

## ⚠️ 문제 발견

**Tenant ID 불일치**:
- 프론트엔드: `64425cef-1c32-4713-bb61-7dcd4939e326` (External ID)
- Azure Functions: `f9230b9b-e666-42ce-83be-aa6deb0f78b4` (Entra ID)

이것이 문제의 원인일 수 있습니다!

---

## 해결 방법

### 옵션 1: External ID 사용 (권장)

**프론트엔드와 Azure Functions 모두 External ID 사용**

1. **Azure Functions `local.settings.json` 수정**:
   ```json
   {
     "ENTRA_TENANT_ID": "64425cef-1c32-4713-bb61-7dcd4939e326",
     "ENTRA_CLIENT_ID": "9222c648-3066-455a-aa7e-49cdd9782943"
   }
   ```

2. **Azure Portal Function App 환경 변수 업데이트**:
   ```
   ENTRA_TENANT_ID: 64425cef-1c32-4713-bb61-7dcd4939e326
   ENTRA_CLIENT_ID: 9222c648-3066-455a-aa7e-49cdd9782943
   ```

3. **Azure Functions `auth.ts`의 JWKS URI 확인**:
   - External ID: `https://landingpage.ciamlogin.com/64425cef-1c32-4713-bb61-7dcd4939e326/discovery/v2.0/keys`

### 옵션 2: Entra ID 사용

**프론트엔드와 Azure Functions 모두 Entra ID 사용**

1. **프론트엔드 `.env` 수정**:
   ```env
   VITE_ENTRA_TENANT_ID="f9230b9b-e666-42ce-83be-aa6deb0f78b4"
   VITE_ENTRA_CLIENT_ID="234895ba-cc32-4306-a28b-e287742f8e4e"
   ```

2. **Azure Portal에서 `landing-page-pro-app`에 API scope 추가**

---

## 권장 사항

**옵션 1 (External ID 사용)을 권장합니다**:
- ✅ 이미 API scope가 등록되어 있음
- ✅ 일반 사용자 회원가입 지원
- ✅ 프론트엔드가 이미 External ID 사용 중

---

**작성일**: 2025-12-31
**작성자**: Claude Code

