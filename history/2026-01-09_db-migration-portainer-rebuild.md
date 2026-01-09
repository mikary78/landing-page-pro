# 2026-01-09 DB 마이그레이션 통합(ai_model/stage_order) + Portainer Compose 포함 + No-cache Rebuild

## 배경 / 문제
- 운영/로컬 로그에서 다음 에러가 발생:
  - `invalid input syntax for type uuid` (UUID 컬럼에 잘못된 입력값)
  - `project_stages`에서 `ai_model` 컬럼이 없는데 필터링 쿼리가 실행되어 에러 발생
- 기존에는 `addAiModelColumn` 같은 “임시 스크립트”가 있었으나, 공식 `migrationSQL` 경로에 통합되어 있지 않아 환경에 따라 스키마 불일치가 발생 가능.

## 변경 요약
### 1) DB 스키마(공식 migrationSQL) 통합
- 파일: `azure-functions/src/lib/migrationSQL.ts`
- 변경:
  - `project_stages`에 아래 컬럼을 **공식 마이그레이션**으로 추가
    - `ai_model VARCHAR(50) DEFAULT 'gemini'`
    - `stage_order INTEGER`
  - 기존 DB에도 적용되도록 `ALTER TABLE ... ADD COLUMN IF NOT EXISTS ...` 포함
  - 기존 데이터 backfill:
    - `ai_model IS NULL` → `'gemini'`
    - `stage_order IS NULL` → `order_index`
  - 인덱스 추가: `idx_project_stages_ai_model (project_id, ai_model)`

### 2) Docker Compose에 Portainer 포함
- 파일: `docker-compose.yml`
- 추가:
  - `portainer` 서비스 및 `portainer_data` 볼륨
  - 포트: `127.0.0.1:19000->9000`, `127.0.0.1:19443->9443`
  - 마운트: `/var/run/docker.sock:/var/run/docker.sock`, `portainer_data:/data`

## 로컬 운영 가이드 (No-cache 전체 재생성)
> 주의: 아래 명령은 **이미지 빌드 캐시를 사용하지 않고** 컨테이너를 새로 만듭니다.  
> 기본적으로 **DB 볼륨(postgres_data)은 유지**됩니다. 데이터까지 초기화하려면 `-v` 옵션을 사용하세요.

### A) 컨테이너만 새로 만들기(데이터 유지)
```powershell
docker rm -f landing-page-pro-portainer 2>$null
docker compose down --remove-orphans
docker compose build --no-cache
docker compose up -d --force-recreate --remove-orphans
```

### B) 데이터까지 초기화(주의: DB/Portainer 설정 삭제)
```powershell
docker rm -f landing-page-pro-portainer 2>$null
docker compose down --remove-orphans -v
docker compose build --no-cache
docker compose up -d --force-recreate --remove-orphans
```

## 테스트
- `azure-functions`에서 `migrationSQL` 문자열에 공식 컬럼 추가가 포함되는지 최소 단위 테스트 추가
  - `azure-functions/test/migrationSQL.test.ts`

