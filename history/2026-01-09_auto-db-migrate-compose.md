# 2026-01-09 docker compose 자동 DB 마이그레이션(db-migrate one-shot) 추가

## 목적
- **빈 Postgres 볼륨(새 환경)**에서 `docker compose up -d`만 실행해도 DB 스키마가 자동으로 생성되도록 합니다.
- 기존에 UI에서 “생성 시작”을 눌렀을 때 `relation does not exist`류 에러가 나는 원인은, DB에 `projects`/`generation_*` 테이블이 없는데 API가 먼저 호출되었기 때문입니다.

## 변경 내용
- `db/migration.sql` 추가
  - `azure-functions/src/lib/migrationSQL.ts`에 들어있는 SQL과 **동일한 내용**을 파일로 분리하여, `psql -f`로 적용 가능하게 했습니다.
- `docker-compose.yml`에 `db-migrate` 서비스 추가(1회 실행)
  - `postgres`가 **healthy**가 되면 자동으로 `psql -f /migrations/migration.sql`을 실행합니다.
  - 성공 후 컨테이너가 **Exited** 상태로 남는 것이 정상입니다(one-shot).
- `azure-functions`는 `db-migrate`가 **성공 완료(service_completed_successfully)** 된 이후에만 시작되도록 의존성을 추가했습니다.
- 테스트 추가: `azure-functions/test/migrationSQLFileSync.test.ts`
  - `migrationSQL.ts`와 `db/migration.sql`이 **드리프트(불일치)** 하지 않도록 동기화 테스트를 추가했습니다.

## 운영 가이드

### 새 환경(데이터 볼륨 초기화)에서의 권장 실행
```powershell
docker compose down --remove-orphans -v
docker compose build --no-cache
docker compose up -d --force-recreate --remove-orphans
```

### 확인(마이그레이션 적용 여부)
```powershell
docker compose exec -T postgres psql -U ${POSTGRES_USER:-pgadmin} -d ${POSTGRES_DB:-landingpagepro} -c "\dt"
```

## 주의 사항
- 본 마이그레이션 SQL은 `CREATE EXTENSION`을 포함합니다. 로컬 `postgres:15-alpine` 컨테이너에서는 일반적으로 문제 없지만, 운영 DB 권한 정책에 따라 extension 권한이 제한될 수 있습니다.
- `db/migration.sql`은 **반드시** `azure-functions/src/lib/migrationSQL.ts`와 동기화되어야 합니다. (동기화 테스트가 이를 보장합니다.)

