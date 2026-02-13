# Phase 2: 데이터 마이그레이션 가이드

**날짜**: 2025-12-17
**대상**: Supabase PostgreSQL → Azure PostgreSQL / Azure SQL

---

## 🎯 목표

1. Supabase 데이터를 안전하게 백업
2. Azure 데이터베이스 스키마 생성
3. 데이터 마이그레이션 실행
4. 무결성 검증

---

## 📋 사전 준비

### ✅ 체크리스트

- [ ] Azure PostgreSQL Flexible Server 또는 Azure SQL Database 생성 완료
- [ ] 연결 문자열 확인 (.env.azure)
- [ ] Supabase 프로젝트 접근 권한
- [ ] PostgreSQL 클라이언트 도구 설치 (psql, pgAdmin)

---

## 🗂️ 마이그레이션 옵션 비교

| 옵션 | 설명 | 장점 | 단점 | 추천 |
|------|------|------|------|------|
| **Option 1: PostgreSQL → PostgreSQL** | Azure Database for PostgreSQL | ✅ 완벽한 호환성<br>✅ pg_dump/restore 사용<br>✅ RLS 그대로 유지 | ❌ SQL Server보다 비쌈 | ⭐ **강력 추천** |
| **Option 2: PostgreSQL → Azure SQL** | Azure SQL Database | ✅ 엔터프라이즈급 성능<br>✅ MS 생태계 통합 | ❌ 문법 변환 필요<br>❌ RLS 미지원 | 🟡 장기 계획 시 |
| **Option 3: 하이브리드** | Supabase 유지 + Azure Functions | ✅ 점진적 전환<br>✅ 리스크 최소화 | ❌ 이중 관리 부담 | 🟢 초기 단계 |

**추천**: **Option 1 (PostgreSQL → PostgreSQL)** - 마이그레이션 리스크 최소화

---

## 🚀 Option 1: Azure PostgreSQL 마이그레이션 (추천)

### Step 1: Supabase 데이터 백업

```bash
# Supabase 연결 정보 (Supabase Dashboard → Settings → Database)
SUPABASE_HOST=db.nzedvnncozntizujvktb.supabase.co
SUPABASE_PORT=5432
SUPABASE_DB=postgres
SUPABASE_USER=postgres
SUPABASE_PASSWORD=<your-password>

# 전체 데이터베이스 백업 (스키마 + 데이터)
pg_dump \
  -h $SUPABASE_HOST \
  -p $SUPABASE_PORT \
  -U $SUPABASE_USER \
  -d $SUPABASE_DB \
  -F c \
  -b \
  -v \
  -f supabase_backup_$(date +%Y%m%d).dump

# 스키마만 백업 (테스트용)
pg_dump \
  -h $SUPABASE_HOST \
  -p $SUPABASE_PORT \
  -U $SUPABASE_USER \
  -d $SUPABASE_DB \
  --schema-only \
  -f supabase_schema.sql

# 데이터만 백업
pg_dump \
  -h $SUPABASE_HOST \
  -p $SUPABASE_PORT \
  -U $SUPABASE_USER \
  -d $SUPABASE_DB \
  --data-only \
  -f supabase_data.sql
```

**Windows PowerShell:**
```powershell
$env:PGPASSWORD = "your-supabase-password"
pg_dump `
  -h db.nzedvnncozntizujvktb.supabase.co `
  -U postgres `
  -d postgres `
  -F c `
  -b `
  -v `
  -f "supabase_backup_$(Get-Date -Format yyyyMMdd).dump"
```

---

### Step 2: Azure PostgreSQL 스키마 생성

```bash
# Azure PostgreSQL 연결 정보
AZURE_PG_HOST=psql-landing-page-pro.postgres.database.azure.com
AZURE_PG_PORT=5432
AZURE_PG_DB=landingpagepro
AZURE_PG_USER=pgadmin
AZURE_PG_PASSWORD=<your-azure-password>

# 마이그레이션 스크립트 실행
psql \
  -h $AZURE_PG_HOST \
  -U $AZURE_PG_USER \
  -d $AZURE_PG_DB \
  -f azure-migration/PHASE2-AZURE-SQL-MIGRATION-SCRIPT.sql
```

**PowerShell:**
```powershell
$env:PGPASSWORD = "your-azure-password"
psql `
  -h psql-landing-page-pro.postgres.database.azure.com `
  -U pgadmin `
  -d landingpagepro `
  -f "azure-migration\PHASE2-AZURE-SQL-MIGRATION-SCRIPT.sql"
```

---

### Step 3: 데이터 복원

#### 방법 A: pg_restore (압축 백업 사용)

```bash
pg_restore \
  -h $AZURE_PG_HOST \
  -U $AZURE_PG_USER \
  -d $AZURE_PG_DB \
  -v \
  --no-owner \
  --no-acl \
  supabase_backup_20251217.dump
```

**주의사항:**
- `--no-owner`: Supabase의 소유자 정보 무시
- `--no-acl`: 권한 설정 무시 (Azure에서 재설정)

#### 방법 B: psql (SQL 백업 사용)

```bash
psql \
  -h $AZURE_PG_HOST \
  -U $AZURE_PG_USER \
  -d $AZURE_PG_DB \
  -f supabase_data.sql
```

---

### Step 4: auth.users 테이블 마이그레이션

**문제점**: Supabase `auth.users` 테이블은 Azure로 마이그레이션 불가 (Supabase 내부 스키마)

**해결 방법**: `profiles.user_id` 매핑

```sql
-- Supabase에서 사용자 목록 추출
SELECT
  id as user_id,
  email,
  raw_user_meta_data->>'display_name' as display_name,
  created_at
FROM auth.users;

-- 결과를 CSV로 내보내기
\copy (SELECT id, email, raw_user_meta_data->>'display_name' as display_name FROM auth.users) TO 'users_export.csv' CSV HEADER;

-- Azure에서 profiles 테이블에 수동 삽입 (Azure AD B2C 연동 후)
-- 각 사용자의 user_id를 Azure AD B2C ObjectId로 매핑
```

---

### Step 5: 데이터 검증

```sql
-- 1. 테이블별 행 수 비교
SELECT 'profiles' AS table_name, COUNT(*) AS row_count FROM profiles
UNION ALL
SELECT 'projects', COUNT(*) FROM projects
UNION ALL
SELECT 'courses', COUNT(*) FROM courses
UNION ALL
SELECT 'course_modules', COUNT(*) FROM course_modules
UNION ALL
SELECT 'lessons', COUNT(*) FROM lessons;

-- 2. 외래 키 무결성 확인
SELECT
  conname AS constraint_name,
  conrelid::regclass AS table_name,
  confrelid::regclass AS referenced_table
FROM pg_constraint
WHERE contype = 'f';

-- 3. NULL 값 확인
SELECT COUNT(*) FROM profiles WHERE user_id IS NULL;
SELECT COUNT(*) FROM projects WHERE user_id IS NULL;
SELECT COUNT(*) FROM courses WHERE owner_id IS NULL;

-- 4. 중복 데이터 확인
SELECT user_id, COUNT(*) FROM profiles GROUP BY user_id HAVING COUNT(*) > 1;
```

---

## 🔄 Option 2: Azure SQL Database 마이그레이션

### Step 1: Azure Data Migration Service 사용

1. **Azure Portal** → "Azure Database Migration Service" → "새로 만들기"
2. 마이그레이션 프로젝트 생성:
   - 원본: PostgreSQL (Supabase)
   - 대상: Azure SQL Database
3. 스키마 변환 자동 실행 (일부 수동 수정 필요)

### Step 2: 수동 데이터 변환 스크립트

```python
# Python 스크립트로 PostgreSQL → SQL Server 변환
import psycopg2
import pyodbc

# Supabase 연결
supabase_conn = psycopg2.connect(
    host="db.nzedvnncozntizujvktb.supabase.co",
    database="postgres",
    user="postgres",
    password="your-password"
)

# Azure SQL 연결
azure_sql_conn = pyodbc.connect(
    "DRIVER={ODBC Driver 18 for SQL Server};"
    "SERVER=sql-landing-page-pro.database.windows.net;"
    "DATABASE=landingpagepro;"
    "UID=sqladmin;PWD=your-password;"
    "Encrypt=yes;TrustServerCertificate=no"
)

# 데이터 복사
supabase_cursor = supabase_conn.cursor()
azure_cursor = azure_sql_conn.cursor()

supabase_cursor.execute("SELECT id, user_id, display_name, avatar_url, created_at, updated_at FROM profiles")
rows = supabase_cursor.fetchall()

for row in rows:
    azure_cursor.execute(
        "INSERT INTO profiles (id, user_id, display_name, avatar_url, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
        row
    )

azure_sql_conn.commit()
```

---

## 🛠️ 마이그레이션 도구

### 1. **pgAdmin** (GUI)
- Supabase 연결 → Backup → Azure 연결 → Restore

### 2. **Azure Data Studio** (MS 공식)
- PostgreSQL 확장 설치
- 마이그레이션 마법사 사용

### 3. **DBeaver** (무료)
- 데이터 Export/Import
- SQL 변환 도구

### 4. **Custom Script** (Python/Node.js)
```javascript
// Node.js 예시
const { Pool } = require('pg');
const supabase = new Pool({
  host: 'db.nzedvnncozntizujvktb.supabase.co',
  database: 'postgres',
  user: 'postgres',
  password: process.env.SUPABASE_PASSWORD,
});

const azure = new Pool({
  host: 'psql-landing-page-pro.postgres.database.azure.com',
  database: 'landingpagepro',
  user: 'pgadmin',
  password: process.env.AZURE_PG_PASSWORD,
});

async function migrateData() {
  const { rows } = await supabase.query('SELECT * FROM profiles');
  for (const row of rows) {
    await azure.query(
      'INSERT INTO profiles (id, user_id, display_name, avatar_url, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6)',
      [row.id, row.user_id, row.display_name, row.avatar_url, row.created_at, row.updated_at]
    );
  }
  console.log(`Migrated ${rows.length} profiles`);
}

migrateData();
```

---

## 🔧 트러블슈팅

### 문제 1: "relation does not exist"
**원인**: 스키마가 생성되지 않음
**해결**: `PHASE2-AZURE-SQL-MIGRATION-SCRIPT.sql` 먼저 실행

### 문제 2: "permission denied"
**원인**: Azure 방화벽 규칙
**해결**:
```bash
az postgres flexible-server firewall-rule create \
  --resource-group rg-landing-page-pro \
  --name psql-landing-page-pro \
  --rule-name AllowMyIP \
  --start-ip-address YOUR_IP \
  --end-ip-address YOUR_IP
```

### 문제 3: "SSL connection required"
**원인**: Azure는 기본적으로 SSL 필요
**해결**: 연결 문자열에 `?sslmode=require` 추가

### 문제 4: "auth.users does not exist"
**원인**: Supabase의 auth 스키마는 마이그레이션 불가
**해결**: 사용자 데이터를 CSV로 추출 후 Azure AD B2C로 수동 마이그레이션

---

## 📊 마이그레이션 체크리스트

### 사전 작업
- [ ] Azure PostgreSQL 서버 생성 완료
- [ ] 방화벽 규칙 설정 (내 IP 허용)
- [ ] 연결 테스트 성공 (`psql -h ... -U ...`)
- [ ] 백업 저장 공간 확보 (최소 1GB)

### 백업
- [ ] Supabase 전체 백업 완료 (`pg_dump`)
- [ ] 백업 파일 검증 (압축 해제 테스트)
- [ ] 로컬에 백업 사본 저장

### 스키마 마이그레이션
- [ ] Azure에서 스키마 생성 스크립트 실행
- [ ] 테이블 생성 확인 (`\dt` 명령어)
- [ ] 인덱스 생성 확인
- [ ] 트리거 생성 확인

### 데이터 마이그레이션
- [ ] `profiles` 테이블 마이그레이션
- [ ] `user_roles` 테이블 마이그레이션
- [ ] `projects` 테이블 마이그레이션
- [ ] `project_stages` 테이블 마이그레이션
- [ ] `courses`, `course_modules`, `lessons` 마이그레이션

### 검증
- [ ] 행 수 비교 (Supabase vs Azure)
- [ ] 외래 키 무결성 검증
- [ ] NULL 값 확인
- [ ] 샘플 쿼리 테스트

### 애플리케이션 연동
- [ ] `.env.azure` 파일 설정
- [ ] 데이터베이스 클라이언트 라이브러리 연결 테스트
- [ ] API 엔드포인트 테스트
- [ ] E2E 테스트 실행

---

## 🎯 예상 소요 시간

| 단계 | 소요 시간 | 비고 |
|------|-----------|------|
| 백업 | 5-10분 | 데이터 크기에 따라 |
| 스키마 생성 | 2분 | 스크립트 실행 |
| 데이터 복원 | 10-30분 | 데이터 크기에 따라 |
| 검증 | 10분 | 수동 확인 |
| **총계** | **30-60분** | |

---

## 📝 다음 단계

Phase 2 완료 후:
1. ✅ 데이터베이스 마이그레이션 완료
2. ⏭️ Phase 3: Azure AD B2C 인증 시스템 구축
3. ⏭️ Phase 4: Edge Functions → Azure Functions 전환
4. ⏭️ Phase 5: 프론트엔드 연동 테스트

---

**작성일**: 2025-12-17
**다음**: PHASE3-AZURE-AD-B2C-SETUP.md
