# 2025-12-31: Dashboard 및 Courses 페이지 Supabase 제거

## 작업 개요

Azure 인증 전환 후에도 Dashboard와 Courses 페이지가 Supabase를 사용하여 에러가 발생하는 문제를 해결했습니다.

## 사용자 요청

> 대시보드나 내코스 버튼을 누르면 오류가 발생해.

**에러 내용:**
- `TypeError: Failed to fetch` - Dashboard.tsx:78
- `WebSocket connection failed` - Supabase Realtime 연결 실패
- `ERR_NAME_NOT_RESOLVED` - Supabase 도메인을 찾을 수 없음

## 발견된 문제

### 문제 1: Dashboard 페이지

**파일**: `src/pages/Dashboard.tsx`

**문제점**:
- `fetchProjects()`: Supabase에서 프로젝트 목록 조회
- `fetchCourses()`: Supabase에서 코스 목록 조회
- `confirmDeleteProject()`: Supabase에서 프로젝트 삭제
- `confirmDeleteCourse()`: Supabase에서 코스 삭제
- Supabase Realtime 구독: 실시간 업데이트

**에러**:
```
TypeError: Failed to fetch
ERR_NAME_NOT_RESOLVED: nzedvnncozntizujvktb.supabase.co
WebSocket connection failed
```

### 문제 2: Courses 페이지

**파일**: `src/pages/CoursesPage.tsx`

**문제점**:
- `fetchCourses()`: Supabase에서 코스 목록 조회
- `confirmDeleteCourse()`: Supabase에서 코스 삭제
- Supabase Realtime 구독: 실시간 업데이트

### 문제 3: DashboardStats 컴포넌트

**파일**: `src/components/DashboardStats.tsx`

**문제점**:
- `fetchStats()`: Supabase에서 통계 데이터 조회

## 수정 사항

### 1. Dashboard.tsx 수정

**변경 내용**:
1. Supabase import 주석 처리
2. Supabase 타입 대신 직접 타입 정의
3. `fetchProjects()`: Supabase 호출 제거, 빈 배열 반환
4. `fetchCourses()`: Supabase 호출 제거, 빈 배열 반환
5. `confirmDeleteProject()`: Supabase 호출 제거, 로컬 상태만 업데이트
6. `confirmDeleteCourse()`: Supabase 호출 제거, 로컬 상태만 업데이트
7. Supabase Realtime 구독 제거

**Before**:
```typescript
const { data, error } = await supabase
  .from("projects")
  .select("*")
  .eq("user_id", user.id);
```

**After**:
```typescript
// TODO: Azure Functions API로 프로젝트 목록 가져오기
console.log('[Dashboard] Projects API not implemented yet, returning empty list');
setProjects([]);
```

### 2. CoursesPage.tsx 수정

**변경 내용**:
1. Supabase import 주석 처리
2. Supabase 타입 대신 직접 타입 정의
3. `fetchCourses()`: Supabase 호출 제거, 빈 배열 반환
4. `confirmDeleteCourse()`: Supabase 호출 제거, 로컬 상태만 업데이트
5. Supabase Realtime 구독 제거

### 3. DashboardStats.tsx 수정

**변경 내용**:
1. Supabase import 주석 처리
2. `fetchStats()`: Supabase 호출 제거, 빈 통계 데이터 반환

**Before**:
```typescript
const { data: projects, error } = await supabase
  .from("projects")
  .select("status, ai_model, created_at")
  .eq("user_id", userId);
```

**After**:
```typescript
// TODO: Azure Functions API로 통계 데이터 가져오기
setStats({
  total: 0,
  byStatus: [],
  byModel: [],
  recentActivity: [...],
});
```

## 수정된 파일

1. **src/pages/Dashboard.tsx** - Supabase 호출 제거, 에러 조용히 처리
2. **src/pages/CoursesPage.tsx** - Supabase 호출 제거, 에러 조용히 처리
3. **src/components/DashboardStats.tsx** - Supabase 호출 제거, 빈 통계 반환

## 현재 상태

### ✅ 작동하는 것
- 로그인/로그아웃
- 페이지 로드 (에러 없음)
- UI 표시

### ⚠️ 작동하지 않는 것 (임시)
- 프로젝트 목록 조회 (빈 배열 반환)
- 코스 목록 조회 (빈 배열 반환)
- 프로젝트/코스 삭제 (로컬 상태만 업데이트)
- 통계 데이터 (빈 데이터 반환)
- 실시간 업데이트 (Realtime 구독 제거)

## 향후 작업 (필수)

### Azure Functions API 엔드포인트 추가 필요

1. **프로젝트 목록 조회**: `/api/getProjects`
   - 사용자 ID로 프로젝트 목록 조회
   - Azure PostgreSQL에서 데이터 가져오기

2. **코스 목록 조회**: `/api/getCourses`
   - 사용자 ID로 코스 목록 조회
   - Azure PostgreSQL에서 데이터 가져오기

3. **프로젝트 삭제**: `/api/deleteProject/:id`
   - 프로젝트 삭제
   - Azure PostgreSQL에서 삭제

4. **코스 삭제**: `/api/deleteCourse/:id`
   - 코스 삭제
   - Azure PostgreSQL에서 삭제

5. **통계 데이터**: `/api/getStats/:userId`
   - 프로젝트 통계 데이터 조회
   - Azure PostgreSQL에서 집계

6. **실시간 업데이트** (선택사항):
   - Azure Functions SignalR 통합
   - 또는 Polling 방식으로 주기적 업데이트

## 테스트 결과

### Before (에러 발생)
- ❌ Dashboard 페이지 접속 시 Supabase 연결 에러
- ❌ Courses 페이지 접속 시 Supabase 연결 에러
- ❌ WebSocket 연결 실패
- ❌ 콘솔에 빨간 에러 메시지

### After (에러 없음)
- ✅ Dashboard 페이지 정상 로드 (빈 목록 표시)
- ✅ Courses 페이지 정상 로드 (빈 목록 표시)
- ✅ 콘솔 에러 없음
- ⚠️ 데이터는 표시되지 않음 (API 미구현)

## 결론

Azure 인증 전환 후 Supabase 연결이 불가능해 발생한 에러를 해결했습니다. 현재는 데이터를 표시하지 않지만, 에러 없이 페이지가 로드됩니다.

**다음 단계**: Azure Functions에 필요한 API 엔드포인트를 추가하여 실제 데이터를 표시할 수 있도록 해야 합니다.

---

**작업일**: 2025-12-31
**작업자**: Claude Code
**관련 문서**:
- [2025-12-31_auth-system-unification.md](./2025-12-31_auth-system-unification.md)
- [2025-12-31_auth-signup-google-improvements.md](./2025-12-31_auth-signup-google-improvements.md)

