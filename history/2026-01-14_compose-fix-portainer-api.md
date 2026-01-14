# 2026-01-14 docker-compose YAML 파싱 오류 수정 + Portainer API 버전 호환성 조치

## 배경 / 증상
- `docker compose up -d --force-recreate --remove-orphans` 실행 시:
  - `yaml: line 72: did not find expected key`
  - `mapping key "volumes" already defined`
- Portainer UI에서:
  - `Error: The environment named primary is unreachable.`
  - 콘솔에 `/api/endpoints/.../_ping` 호출 실패(400/Bad Request)

## 원인
### 1) docker-compose.yml YAML 문법/구조 깨짐
- `services.functions.environment`에서 **맵(key: value)**과 **리스트(- KEY=VALUE)** 형식이 혼재되어 YAML 파서가 실패.
- 파일 하단에 `volumes:`가 2번 선언되어 중복 키 오류 발생.
- 네트워크/볼륨 네이밍이 `postgres_data` vs `postgres-data`, `landing-page-pro-network` vs `app-network`로 혼재되어 구성 해석이 일관되지 않음.

### 2) Portainer ↔ Docker Engine API 버전 불일치
- Docker Desktop(Engine 29.x)의 Docker API는 **최소 1.44 이상** 지원.
- 기존 Portainer(2.21.5)가 `v1.41`로 Docker 엔진에 `_ping`을 호출하여 거부됨:
  - `"client version 1.41 is too old. Minimum supported API version is 1.44"`

## 조치 내용
### 1) docker-compose.yml 구조 정리
- `services`, `networks`, `volumes`를 단일 섹션으로 정리하여 YAML 파싱 오류 제거.
- `functions.environment`를 맵 형태로 통일(리스트 항목 제거).
- `frontend`는 Nginx로 dist 서빙(`80`) 구조를 유지하고 호스트 포트는 `${FRONTEND_PORT:-5173}:80`로 통일.
- `azurite`는 10000/10001/10002 포트를 사용하도록 설정하고 데이터 볼륨을 마운트.

### 2) Portainer 업그레이드 및 재생성
- `portainer/portainer-ce:2.21.5` → `portainer/portainer-ce:2.33.0` 업그레이드
- 컨테이너 및 데이터 볼륨(`landing-page-pro_portainer_data`) 제거 후 재생성하여 깨끗한 상태로 초기화

## 확인 방법
```powershell
docker compose config -q
docker compose up -d --force-recreate --remove-orphans
docker compose ps
```

Portainer HTTP 상태 확인:
```powershell
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:19000/api/system/status
```

## 참고/출처(외부)
- Portainer CE: `https://github.com/portainer/portainer`
- Docker Engine API 버전(개요): `https://docs.docker.com/engine/api/`

