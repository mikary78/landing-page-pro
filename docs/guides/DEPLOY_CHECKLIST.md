# 배포 체크리스트

## 코드 변경 후 반드시 확인
- [ ] npm run lint 통과
- [ ] npm run typecheck 통과
- [ ] npm run build 성공

## 배포 순서
1. [ ] 프론트엔드: swa deploy ./dist
2. [ ] 백엔드: cd azure-functions && func azure functionapp publish func-landing-page-pro

## 배포 후 확인
- [ ] 웹사이트 접속 확인
- [ ] 로그인 테스트
- [ ] API 호출 테스트 (개발자 도구 Network 탭)
- [ ] 콘솔 에러 없음 확인
