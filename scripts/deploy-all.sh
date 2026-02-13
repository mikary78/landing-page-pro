#!/bin/bash

# 전체 배포 스크립트 - 프론트엔드와 백엔드를 모두 배포합니다
# 사용법: ./deploy-all.sh

set -e  # 에러 발생 시 즉시 중단

echo "=================================="
echo "전체 배포 스크립트 시작"
echo "=================================="
echo ""

# 1단계: 사전 검증
echo "📋 1단계: 사전 검증 시작..."
echo ""

echo "  ✓ Lint 검사..."
npm run lint
echo ""

echo "  ✓ TypeScript 타입 검사..."
npm run typecheck
echo ""

echo "  ✓ 테스트 실행..."
npm run test:run
echo ""

echo "✅ 사전 검증 완료"
echo ""

# 2단계: 프론트엔드 빌드 및 배포
echo "🎨 2단계: 프론트엔드 배포 시작..."
echo ""

echo "  ✓ 프론트엔드 빌드..."
npm run build
echo ""

echo "  ✓ Azure Static Web Apps 배포..."
# swa deploy 명령어가 있다면 추가, 없으면 GitHub Actions를 통해 배포됨
# swa deploy --deployment-token $DEPLOYMENT_TOKEN
echo "  ℹ️  프론트엔드는 GitHub Actions를 통해 자동 배포됩니다."
echo ""

echo "✅ 프론트엔드 배포 단계 완료"
echo ""

# 3단계: Azure Functions 빌드 및 배포
echo "⚡ 3단계: Azure Functions 배포 시작..."
echo ""

echo "  ✓ Azure Functions 디렉토리로 이동..."
cd azure-functions
echo ""

echo "  ✓ Azure Functions 빌드..."
npm run build
echo ""

echo "  ✓ Azure Functions 배포..."
func azure functionapp publish func-landing-page-pro
echo ""

echo "  ✓ 원래 디렉토리로 복귀..."
cd ..
echo ""

echo "✅ Azure Functions 배포 완료"
echo ""

# 4단계: 배포 검증
echo "🔍 4단계: 배포 검증 시작..."
echo ""

echo "  ✓ Function App 상태 확인..."
az functionapp show --name func-landing-page-pro --resource-group rg-landing-page-pro --query "{name:name, state:state}" -o table
echo ""

echo "  ✓ CORS 설정 확인..."
az functionapp cors show --name func-landing-page-pro --resource-group rg-landing-page-pro -o json
echo ""

echo "  ✓ API 엔드포인트 테스트..."
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "https://func-landing-page-pro.azurewebsites.net/api/hello")
if [ "$HTTP_STATUS" = "200" ]; then
  echo "  ✅ API 정상 응답 (HTTP $HTTP_STATUS)"
else
  echo "  ❌ API 응답 오류 (HTTP $HTTP_STATUS)"
  exit 1
fi
echo ""

echo "✅ 배포 검증 완료"
echo ""

# 완료
echo "=================================="
echo "🎉 전체 배포 완료!"
echo "=================================="
echo ""
echo "배포된 항목:"
echo "  - 프론트엔드: https://icy-forest-03cc7cb00.1.azurestaticapps.net"
echo "  - Azure Functions: https://func-landing-page-pro.azurewebsites.net"
echo ""
echo "다음 단계:"
echo "  1. 프론트엔드 사이트에 접속하여 기능 테스트"
echo "  2. 브라우저 개발자 도구에서 API 호출 확인"
echo "  3. 에러 로그 모니터링"
echo ""
