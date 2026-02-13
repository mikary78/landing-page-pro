# 🚀 Autopilot

**교육콘텐츠 자동 생성 플랫폼 | 브리프부터 배포까지 36시간**

[![License](https://img.shields.io/badge/license-Proprietary-red.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.3-blue.svg)](https://react.dev/)
[![Azure Functions](https://img.shields.io/badge/Azure%20Functions-v4-blue.svg)](https://azure.microsoft.com/services/functions/)

---

## 📖 소개

**Autopilot**은 AI 기반 교육 콘텐츠 자동 생성 플랫폼입니다. 교육 주제와 대상만 입력하면 커리큘럼 설계부터 슬라이드, 퀴즈, 실습 가이드까지 전체 교육 콘텐츠를 자동으로 생성합니다.

**브리프부터 배포까지 36시간** - 교육 콘텐츠 제작 리드타임을 70% 단축합니다.

### 핵심 가치

- ⚡ **속도**: 브리프 입력부터 완성된 콘텐츠까지 **36시간 이내**
- 🎯 **정확성**: 6단계 검증 파이프라인으로 고품질 콘텐츠 보장
- 🔄 **자동화**: 수작업 50% 감소, 리드타임 대폭 단축
- 🎨 **다양성**: 슬라이드, 퀴즈, 실습, 읽기자료 등 다양한 형식 지원
- 🔍 **최신성**: 웹 검색 통합으로 최신 정보 자동 반영
- 🎨 **시각화**: AI 이미지 생성으로 풍부한 인포그래픽 제공

---

## ✨ 주요 기능

### 1. 🎓 6단계 AI 생성 파이프라인

완전 자동화된 AI 파이프라인으로 고품질 교육 콘텐츠를 생성합니다.

1. **커리큘럼 설계** (`curriculum_design`)
   - 교육 목표와 회차별 주제 구성
   - JSON 스키마 검증 및 재시도 로직
   
2. **수업안 작성** (`lesson_plan`)
   - 각 회차별 상세 수업 계획
   - 활동 블록 구조화
   
3. **슬라이드 구성** (`slides`)
   - 발표용 슬라이드 콘텐츠
   - 인용 및 출처 자동 추가
   
4. **실습 가이드** (`lab_template`)
   - 실습 및 활동 자료
   - 단계별 가이드 제공
   
5. **평가 퀴즈** (`assessment`)
   - 학습 확인용 평가 문항
   - 다양한 문제 유형 지원
   
6. **최종 검토** (`final_review`)
   - 전체 콘텐츠 통합 및 검토
   - 파이프라인 일관성 검사

### 2. 🔍 웹 검색 통합

- **최신 정보 자동 검색**: Tavily/Serper API를 통한 실시간 웹 검색
- **자동 통합**: 검색 결과를 AI 프롬프트에 자동 반영
- **신뢰성**: 최신 트렌드와 정보를 교육 콘텐츠에 반영

### 3. 🎨 AI 이미지 생성

- **Vertex AI Imagen** 또는 **OpenAI DALL-E**를 통한 이미지 생성
- 인포그래픽 및 슬라이드 배경 이미지 자동 생성
- 프롬프트 기반 맞춤형 이미지 제작

### 4. 📚 프로젝트-코스빌더 통합

- 프로젝트 생성 결과를 **코스빌더로 자동 변환**
- 모듈/레슨 구조 자동 매핑
- Coursera 스타일의 계층적 편집 구조
- 원본 프로젝트와의 연결 유지

### 5. 🛠 코스빌더 단일 콘텐츠 생성

- **개별 생성**: 슬라이드, 퀴즈, 실습, 읽기자료, 요약 등
- **콘텐츠 보강**: 기존 콘텐츠를 AI로 개선
- **재생성**: 다양한 스타일로 콘텐츠 재생성
- **버전 관리**: 콘텐츠 버전 이력 추적 및 복원

### 6. 📊 다양한 다운로드 형식

- **지원 형식**: PDF, DOCX, PPTX, TXT, Markdown
- **일괄 다운로드**: 전체 프로젝트 한 번에 다운로드
- **개별 다운로드**: 필요한 부분만 선택 다운로드

---

## 🎯 사용 사례

### 교육 기관
- 대학 강의 자료 제작
- 기업 교육 프로그램 개발
- 온라인 강의 콘텐츠 생성

### 강사 및 교육 기획자
- 신규 강의 자료 빠른 제작
- 기존 콘텐츠 보강 및 개선
- 다양한 형식의 교육 자료 생성

### 기업 교육팀
- 신입사원 교육 프로그램 개발
- 스킬 업그레이드 교육 자료 제작
- 표준화된 교육 콘텐츠 관리

---

## 🚀 빠른 시작

### 필수 요구사항

- Node.js 20.x 이상
- npm 또는 yarn
- Azure 계정 (배포 시)
- PostgreSQL 데이터베이스 (Azure Database for PostgreSQL 권장)

### 설치 및 실행

```bash
# 1. 저장소 클론
git clone <repository-url>
cd landing-page-pro

# 2. 의존성 설치
npm install

# 3. 환경 변수 설정
cp env.example .env.local
# .env.local 파일을 편집하여 필요한 환경 변수 설정

# 4. 개발 서버 실행
npm run dev
```

### Azure Functions 설정

```bash
# Azure Functions 디렉토리로 이동
cd azure-functions

# 의존성 설치
npm install

# 환경 변수 설정
# local.settings.json 파일을 편집하여 필요한 값 설정

# 로컬 실행
npm run build
npm start
```

자세한 설정 방법은 [`azure-functions/README.md`](./azure-functions/README.md)를 참조하세요.

---

## 🏗 기술 스택

### 프론트엔드
- **React 18** - UI 라이브러리
- **TypeScript** - 타입 안정성
- **Vite** - 빌드 도구
- **Tailwind CSS** - 스타일링
- **shadcn/ui** - UI 컴포넌트
- **React Router** - 라우팅
- **MSAL (Azure AD)** - 인증

### 백엔드
- **Azure Functions** - 서버리스 백엔드
- **Node.js 20** - 런타임
- **PostgreSQL** - 데이터베이스 (Azure Database for PostgreSQL)
- **Azure Storage Queue** - 작업 큐

### AI 서비스
- **Google Gemini** - 텍스트 생성 (무료)
- **Anthropic Claude** - 고품질 텍스트 생성
- **OpenAI ChatGPT** - 안정적인 텍스트 생성
- **Vertex AI Imagen** - 이미지 생성
- **OpenAI DALL-E** - 이미지 생성 (대체)

### 외부 서비스
- **Tavily API** - 웹 검색
- **Serper API** - 웹 검색 (대체)
- **Azure AD B2C** - 사용자 인증

---

## 📁 프로젝트 구조

```
landing-page-pro/
├── src/                    # 프론트엔드 소스 코드
│   ├── components/         # React 컴포넌트
│   ├── pages/             # 페이지 컴포넌트
│   ├── hooks/             # 커스텀 훅
│   ├── lib/               # 유틸리티 라이브러리
│   └── config/            # 설정 파일
│
├── azure-functions/       # Azure Functions 백엔드
│   ├── src/
│   │   ├── functions/     # HTTP 트리거 함수들
│   │   └── lib/           # 공통 라이브러리
│   │       ├── agent/      # AI 에이전트 로직
│   │       ├── database.ts # 데이터베이스 연결
│   │       └── ai-services.ts # AI 서비스 통합
│   └── README.md          # 백엔드 API 문서
│
├── docs/                  # 문서
│   ├── environment-variables-setup.md
│   ├── vertex-ai-imagen-setup-guide.md
│   └── ...
│
├── history/               # 변경 이력 문서
└── README.md              # 프로젝트 소개 (이 파일)
```

---

## 🔧 환경 변수 설정

### 프론트엔드 (`.env.local`)

```env
VITE_APP_ENV=development
VITE_AZURE_FUNCTIONS_URL=http://localhost:7071
VITE_ENTRA_CLIENT_ID=your-client-id
VITE_ENTRA_TENANT_ID=your-tenant-id
VITE_ENTRA_AUTHORITY=https://your-tenant.ciamlogin.com
```

### 백엔드 (`azure-functions/local.settings.json`)

```json
{
  "Values": {
    "AZURE_POSTGRES_HOST": "your-host",
    "AZURE_POSTGRES_DATABASE": "your-database",
    "AZURE_POSTGRES_USER": "your-user",
    "AZURE_POSTGRES_PASSWORD": "your-password",
    "ENTRA_CLIENT_ID": "your-client-id",
    "GEMINI_API_KEY": "your-api-key",
    "ANTHROPIC_API_KEY": "your-api-key",
    "OPENAI_API_KEY": "your-api-key",
    "TAVILY_API_KEY": "your-api-key",
    "SERPER_API_KEY": "your-api-key",
    "VERTEX_API_KEY": "your-api-key",
    "VERTEX_PROJECT_ID": "your-project-id"
  }
}
```

상세한 설정 방법은 [`docs/environment-variables-setup.md`](./docs/environment-variables-setup.md)를 참조하세요.

---

## 📚 문서

### 개발자 가이드
- [환경 변수 설정 가이드](./docs/environment-variables-setup.md)
- [Azure Functions API 문서](./azure-functions/README.md)
- [Vertex AI Imagen 설정 가이드](./docs/vertex-ai-imagen-setup-guide.md)

### 사용자 가이드
- [시작하기 가이드](https://your-domain.com/guide)
- [FAQ](https://your-domain.com/faq)
- [생성 예시](https://your-domain.com/examples)

---

## 🧪 테스트

```bash
# 단위 테스트
npm test

# E2E 테스트
npm run test:e2e

# Playwright 테스트
npm run test:playwright
```

---

## 📦 배포

### 프론트엔드 배포

```bash
npm run build
# dist/ 폴더를 정적 호스팅 서비스에 배포
```

### Azure Functions 배포

```bash
cd azure-functions
npm run build
func azure functionapp publish func-landing-page-pro
```

자세한 배포 방법은 [`azure-functions/README.md`](./azure-functions/README.md)의 배포 섹션을 참조하세요.

---

## 🤝 기여하기

프로젝트에 기여하고 싶으시다면:

1. 이 저장소를 Fork하세요
2. 새로운 기능 브랜치를 생성하세요 (`git checkout -b feature/amazing-feature`)
3. 변경사항을 커밋하세요 (`git commit -m 'Add some amazing feature'`)
4. 브랜치에 Push하세요 (`git push origin feature/amazing-feature`)
5. Pull Request를 생성하세요

### 개발 가이드라인

- 코드 스타일은 ESLint 설정을 따릅니다
- 커밋 메시지는 명확하고 설명적으로 작성합니다
- 테스트 코드를 함께 작성합니다
- 문서를 업데이트합니다

---

## 📊 검증된 성과

실제 교육 현장에서 검증된 핵심 지표:

- ⚡ **리드타임 70% 단축**: 기존 5일(120시간) → **36시간**
- 🎯 **수작업 50% 감소**: 자동화로 효율 극대화
- 📈 **콘텐츠 일관성 90점+**: 체크리스트 만족도
- 💯 **NPS +20p 향상**: 수강생 만족도 증가
- 🔄 **과정 개편 주기 단축**: 8주 → 4주

---

## 🔒 보안

- Azure AD B2C를 통한 안전한 사용자 인증
- JWT 토큰 기반 API 인증
- 환경 변수를 통한 민감 정보 관리
- PostgreSQL 연결 암호화

보안 관련 자세한 내용은 [`SECURITY_INCIDENT_REPORT.md`](./docs/security/SECURITY_INCIDENT_REPORT.md)를 참조하세요.

---

## 📄 라이선스

이 프로젝트는 Proprietary 라이선스 하에 있습니다. 자세한 내용은 [LICENSE](LICENSE) 파일을 참조하세요.

---

## 📞 문의

- **이메일**: support@autopilot.ai
- **웹사이트**: https://your-domain.com
- **문의 양식**: https://your-domain.com (Sales Team Inquiry)

---

## 🙏 감사의 말

이 프로젝트는 다음 오픈소스 프로젝트들을 사용합니다:

- [React](https://react.dev/)
- [Vite](https://vitejs.dev/)
- [shadcn/ui](https://ui.shadcn.com/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Azure Functions](https://azure.microsoft.com/services/functions/)

---

<div align="center">

**Made with ❤️ by Autopilot Team**

[시작하기](https://your-domain.com) • [문서](https://your-domain.com/guide) • [문의하기](https://your-domain.com)

</div>
