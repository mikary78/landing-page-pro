# Week 2-4 마이그레이션 완료 기록

## 작업일: 2026-01-02

## 요청 내용
- Week 2: LessonDetailPane, ProjectDetail 마이그레이션
- Week 3/4: 통합 테스트 + Supabase 완전 제거 + 부가 기능 (통계, 배포/피드백)

## 구현된 Azure Functions API (총 14개 추가)

### Week 2 - 레슨/프로젝트 상세 API
| API | 경로 | 설명 |
|-----|------|------|
| `getLessonDetail` | `/api/getlesson/{lessonId}` | 레슨 상세 + 프로젝트 + AI 결과 조회 |
| `getProjectStages` | `/api/getprojectstages/{projectId}` | 프로젝트 스테이지 조회 |
| `createLessonProject` | `/api/createlessonproject` | 레슨용 프로젝트 생성 |
| `getProjectDetail` | `/api/getproject/{projectId}` | 프로젝트 상세 조회 |
| `updateProjectStage` | `/api/updateprojectstage/{stageId}` | 스테이지 업데이트 |
| `updateProject` | `/api/updateproject/{projectId}` | 프로젝트 업데이트 |
| `saveTemplate` | `/api/savetemplate` | 템플릿 저장 |

### Week 3/4 - 배포/피드백 API
| API | 경로 | 설명 |
|-----|------|------|
| `getCoursePublic` | `/api/course/public/{projectId}` | 공개 코스 조회 (인증 불필요) |
| `getDeployment` | `/api/deployment/{projectId}` | 배포 정보 조회 |
| `createDeployment` | `/api/deployment` | 배포 생성 |
| `getFeedbacks` | `/api/feedback/{projectId}` | 피드백 목록 조회 |
| `createFeedback` | `/api/feedback` | 피드백 생성 (공개) |

## 마이그레이션된 프론트엔드 컴포넌트

### Week 2
1. **`LessonDetailPane.tsx`** - 레슨 상세, AI 콘텐츠 생성/재생성
2. **`ProjectDetail.tsx`** - 프로젝트 상세, 스테이지 재생성, 템플릿 저장

### Week 3/4
3. **`CourseView.tsx`** - 공개 코스 뷰어
4. **`CourseDeployment.tsx`** - 배포 관리
5. **`CourseFeedback.tsx`** - 피드백 수집/표시

## 알려진 이슈
- `column "ai_model" does not exist` - DB 스키마 문제, projects 테이블에 ai_model 컬럼 필요
- 실시간 업데이트 기능 제한 (Supabase Realtime → 폴링 방식으로 대체)

## 남은 Supabase import 파일
다음 파일들에서 아직 Supabase import가 남아있음 (대부분 주석 처리됨):
- `src/pages/Dashboard.tsx`
- `src/pages/CoursesPage.tsx`
- `src/pages/CourseCreatePage.tsx`
- `src/pages/ProjectCreate.tsx`
- `src/hooks/useUserRole.ts`
- `src/pages/Admin.tsx`
- `src/pages/CourseFeedbackPage.tsx`
- `src/pages/ResetPassword.tsx`

## 다음 작업
1. DB 스키마 수정 (ai_model 컬럼 추가)
2. 남은 Supabase import 완전 제거
3. 통합 테스트 진행
4. 최종 문서화

