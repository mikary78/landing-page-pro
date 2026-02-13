# Unauthorized 오류 해결 가이드

## 빠른 진단: 브라우저 콘솔 확인

1. **브라우저 개발자 도구 열기** (F12)
2. **Console 탭** 선택
3. **대시보드 페이지 접속**
4. 다음 로그를 찾아주세요:

### 확인할 로그:

```
[AzureFunctions] Acquiring token with scopes: [...]
[AzureFunctions] Token payload: {...}
[AzureFunctions] Audience (aud): ...
```

### 중요: 다음 정보를 복사해주세요:

1. **Token payload** 전체 내용
2. **Audience (aud)** 값
3. **Issuer (iss)** 값 (payload 내에 있음)

이 정보를 공유해주시면 정확한 원인을 파악할 수 있습니다.

---

## Azure Functions 로그 확인 (느림)

Azure Portal에서:

1. **Functions 탭** → 각 함수 옆의 **Monitor** 링크 클릭
   - 예: `getProjects` 함수 → Monitor 클릭
   
2. 또는 **왼쪽 메뉴**에서:
   - **Development Tools** → **Console** (Kudu)
   - 또는 **Monitoring** → **Logs** (Application Insights 사용 시)

---

## 빠른 테스트: 브라우저 콘솔에서 직접 확인

브라우저 콘솔(F12)에서 다음 코드를 실행:

```javascript
// MSAL 인스턴스 확인
const accounts = msalInstance.getAllAccounts();
console.log('Accounts:', accounts);

// 토큰 요청 (API scope)
msalInstance.acquireTokenSilent({
  scopes: ['api://9222c648-3066-455a-aa7e-49cdd9782943/access_as_user'],
  account: accounts[0],
}).then(response => {
  console.log('Token:', response);
  // 토큰 디코딩
  const parts = response.accessToken.split('.');
  const payload = JSON.parse(atob(parts[1]));
  console.log('Token Payload:', payload);
  console.log('Audience:', payload.aud);
  console.log('Issuer:', payload.iss);
}).catch(error => {
  console.error('Token acquisition error:', error);
});
```

이 코드를 실행한 결과를 공유해주세요.

---

**작성일**: 2025-12-31


