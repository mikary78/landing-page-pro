# 마이크로서비스 아키텍처 구현

## 📅 날짜
2026-01-09

## 👤 요청 내용
장기 작업 진행:
1. 서비스 분리 (Microservice 아키텍처)
2. Azure Kubernetes Service 도입
3. 이벤트 기반 아키텍처 (Service Bus)

## 🎯 구현 내용

### 1. 마이크로서비스 아키텍처 설계 ✅

#### 서비스 분리 계획
| 서비스 | 주요 기능 | 데이터베이스 |
|--------|----------|-------------|
| Project Service | 프로젝트 CRUD, 단계 관리 | projects DB |
| Course Service | 강의/모듈/레슨 관리 | courses DB |
| AI Service | 커리큘럼 생성, 문서 처리 | Redis Cache |
| Template Service | 템플릿 관리 | templates DB |

#### 공유 라이브러리 구조
```
services/shared/
├── events/       # 도메인 이벤트 타입
├── auth/         # 인증 미들웨어
├── db/           # DB 연결 유틸
└── service-bus/  # Service Bus 클라이언트
```

### 2. Azure Kubernetes Service (AKS) 인프라 ✅

#### Terraform 모듈 생성
- `infrastructure/terraform/modules/aks/main.tf`
  - AKS 클러스터 설정
  - 노드 풀 설정 (Auto Scaling)
  - Azure Monitor 통합
  - RBAC 및 Azure AD 통합

#### Kubernetes 매니페스트
- `infrastructure/kubernetes/base/` - 기본 배포 설정
  - `namespace.yaml`
  - `project-service.yaml`
  - `course-service.yaml`
  - `ai-service.yaml`
  - `kustomization.yaml`

- `infrastructure/kubernetes/overlays/` - 환경별 오버레이
  - `staging/` - 스테이징 환경 (replicas: 1)
  - `production/` - 프로덕션 환경 (replicas: 3, 더 많은 리소스)

### 3. Azure Service Bus 구현 ✅

#### 생성된 Azure 리소스
- **Namespace**: `sb-landing-page-pro` (Standard tier)
- **Endpoint**: `https://sb-landing-page-pro.servicebus.windows.net:443/`

#### Topics 및 Subscriptions
| Topic | Subscribers |
|-------|-------------|
| project-events | course-service, stats-service |
| course-events | stats-service, ai-service |
| ai-events | project-service, course-service |
| user-events | project-service, course-service, template-service |
| template-events | project-service |

## 📁 생성된 파일

### 문서
- `docs/MICROSERVICE-ARCHITECTURE.md` - 아키텍처 설계 문서

### 공유 라이브러리
- `services/shared/events/index.ts` - 이벤트 타입 정의
- `services/shared/service-bus/index.ts` - Service Bus 클라이언트
- `services/shared/db/index.ts` - DB 유틸리티
- `services/shared/auth/index.ts` - 인증 미들웨어

### 인프라 (Terraform)
- `infrastructure/terraform/modules/aks/main.tf` - AKS 모듈
- `infrastructure/terraform/modules/service-bus/main.tf` - Service Bus 모듈

### 인프라 (Kubernetes)
- `infrastructure/kubernetes/base/namespace.yaml`
- `infrastructure/kubernetes/base/project-service.yaml`
- `infrastructure/kubernetes/base/course-service.yaml`
- `infrastructure/kubernetes/base/ai-service.yaml`
- `infrastructure/kubernetes/base/kustomization.yaml`
- `infrastructure/kubernetes/overlays/staging/kustomization.yaml`
- `infrastructure/kubernetes/overlays/production/kustomization.yaml`

## 🔄 이벤트 타입

```typescript
// Project Events
PROJECT_CREATED, PROJECT_UPDATED, PROJECT_DELETED, PROJECT_STAGE_UPDATED

// Course Events  
COURSE_CREATED, COURSE_UPDATED, COURSE_DELETED, MODULE_CREATED, LESSON_CREATED, LESSON_UPDATED

// AI Events
CURRICULUM_GENERATION_REQUESTED, CURRICULUM_GENERATED, CURRICULUM_GENERATION_FAILED, DOCUMENT_PROCESSED

// User Events
USER_CREATED, USER_UPDATED, USER_DELETED

// Template Events
TEMPLATE_CREATED, TEMPLATE_UPDATED
```

## 📊 아키텍처 다이어그램

```
┌─────────────┐     ┌──────────────────┐     ┌──────────────────┐
│   Client    │────▶│  API Management  │────▶│  Microservices   │
│   (React)   │     │  (Gateway)       │     │  (AKS)           │
└─────────────┘     └──────────────────┘     └──────────────────┘
                                                     │
                           ┌─────────────────────────┼─────────────────────────┐
                           │                         │                         │
                           ▼                         ▼                         ▼
                    ┌──────────────┐          ┌──────────────┐          ┌──────────────┐
                    │   Project    │          │    Course    │          │      AI      │
                    │   Service    │          │   Service    │          │   Service    │
                    └──────────────┘          └──────────────┘          └──────────────┘
                           │                         │                         │
                           └─────────────────────────┼─────────────────────────┘
                                                     │
                                                     ▼
                                          ┌──────────────────┐
                                          │  Azure Service   │
                                          │      Bus         │
                                          │  (Event Bus)     │
                                          └──────────────────┘
```

## 💰 예상 비용 (월간)

| 리소스 | 비용 |
|--------|------|
| AKS (3 nodes) | ~$150 |
| Service Bus (Standard) | ~$10 |
| PostgreSQL (4 instances) | ~$100 |
| Redis Cache | ~$15 |
| Container Registry | ~$5 |
| **Total** | **~$280** |

## ✅ 완료 상태

| 작업 | 상태 |
|------|------|
| 마이크로서비스 아키텍처 설계 | ✅ 완료 |
| 공유 라이브러리 구현 | ✅ 완료 |
| AKS Terraform 모듈 | ✅ 완료 |
| Kubernetes 매니페스트 | ✅ 완료 |
| Service Bus 생성 | ✅ 완료 |
| Service Bus 토픽/구독 | ✅ 완료 |

## 🔧 다음 단계 (실제 배포 시)

1. **AKS 클러스터 생성**
   ```bash
   cd infrastructure/terraform/environments/staging
   terraform init
   terraform apply
   ```

2. **Kubernetes 배포**
   ```bash
   kubectl apply -k infrastructure/kubernetes/overlays/staging
   ```

3. **서비스별 Docker 이미지 빌드**
   ```bash
   docker build -t project-service ./services/project-service
   docker build -t course-service ./services/course-service
   docker build -t ai-service ./services/ai-service
   ```

## 📚 참고 자료

- [Azure Service Bus Documentation](https://learn.microsoft.com/azure/service-bus-messaging/)
- [Azure Kubernetes Service](https://learn.microsoft.com/azure/aks/)
- [Microservices Architecture](https://learn.microsoft.com/azure/architecture/microservices/)
- [12-Factor App](https://12factor.net/)
