# 프로젝트 및 코스 삭제 기능 개선 (2025-12-18)

## 개요
대시보드와 내 코스 페이지에서 프로젝트 및 코스를 삭제할 때 사용자 친화적인 확인 대화상자를 추가하고, 삭제 후 즉시 목록이 업데이트되도록 개선했습니다.

## 사용자 요구사항

1. **프로젝트와 코스 구분**: 대시보드에서 "내 프로젝트"와 "내 코스"가 명확히 구분되어야 함
2. **삭제 기능 추가**: 내 코스 목록에 삭제 버튼 추가
3. **확인 대화상자**: 삭제 시 "정말 삭제하시겠습니까?" 팝업과 "예/아니오" 버튼
4. **즉시 반영**: "예" 선택 시 대시보드에서 바로 삭제되어야 함

## 구현 내용

### 1. 커스텀 삭제 확인 대화상자

기존의 브라우저 기본 `confirm()` 대화상자를 shadcn/ui의 `AlertDialog` 컴포넌트로 교체하여 더 나은 UX를 제공합니다.

#### CoursesPage.tsx 변경사항

**추가된 import:**
```typescript
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Trash2 } from "lucide-react";
```

**상태 관리:**
```typescript
const [deletingId, setDeletingId] = useState<string | null>(null);
const [courseToDelete, setCourseToDelete] = useState<string | null>(null);
```

**삭제 함수 개선:**
```typescript
const confirmDeleteCourse = async () => {
  if (!courseToDelete) return;

  try {
    setDeletingId(courseToDelete);
    const { error } = await supabase
      .from("courses")
      .delete()
      .eq("id", courseToDelete);

    if (error) throw error;

    // 삭제 후 즉시 목록 업데이트
    setCourses(courses.filter(course => course.id !== courseToDelete));
    toast.success("코스가 성공적으로 삭제되었습니다.");
    setCourseToDelete(null);
  } catch (error) {
    console.error("Error deleting course:", error);
    toast.error("코스 삭제 중 오류가 발생했습니다.");
  } finally {
    setDeletingId(null);
  }
};
```

**UI 변경 - 삭제 버튼:**
```typescript
<Button
  variant="ghost"
  size="sm"
  onClick={(e) => {
    e.stopPropagation();
    setCourseToDelete(course.id);
  }}
  disabled={deletingId === course.id}
>
  {deletingId === course.id ? (
    <Loader2 className="h-4 w-4 animate-spin" />
  ) : (
    <Trash2 className="h-4 w-4" />
  )}
</Button>
```

**AlertDialog 컴포넌트:**
```typescript
<AlertDialog open={!!courseToDelete} onOpenChange={(open) => !open && setCourseToDelete(null)}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>정말 삭제하시겠습니까?</AlertDialogTitle>
      <AlertDialogDescription>
        이 코스를 삭제하면 되돌릴 수 없습니다. 코스와 관련된 모든 데이터가 영구적으로 삭제됩니다.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>아니오</AlertDialogCancel>
      <AlertDialogAction onClick={confirmDeleteCourse}>예</AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

### 2. Dashboard.tsx 변경사항

Dashboard에서는 프로젝트와 코스 모두에 삭제 기능을 추가했습니다.

**상태 관리:**
```typescript
const [deletingProjectId, setDeletingProjectId] = useState<string | null>(null);
const [deletingCourseId, setDeletingCourseId] = useState<string | null>(null);
const [projectToDelete, setProjectToDelete] = useState<string | null>(null);
const [courseToDelete, setCourseToDelete] = useState<string | null>(null);
```

**프로젝트 삭제 함수:**
```typescript
const confirmDeleteProject = async () => {
  if (!projectToDelete) return;

  try {
    setDeletingProjectId(projectToDelete);
    const { error } = await supabase
      .from("projects")
      .delete()
      .eq("id", projectToDelete);

    if (error) throw error;

    // 삭제 후 즉시 목록 업데이트
    setProjects(projects.filter(project => project.id !== projectToDelete));
    toast.success("프로젝트가 성공적으로 삭제되었습니다.");
    setProjectToDelete(null);
  } catch (error) {
    console.error("Error deleting project:", error);
    toast.error("프로젝트 삭제 중 오류가 발생했습니다.");
  } finally {
    setDeletingProjectId(null);
  }
};
```

**코스 삭제 함수:**
```typescript
const confirmDeleteCourse = async () => {
  if (!courseToDelete) return;

  try {
    setDeletingCourseId(courseToDelete);
    const { error } = await supabase
      .from("courses")
      .delete()
      .eq("id", courseToDelete);

    if (error) throw error;

    // 삭제 후 즉시 목록 업데이트
    setCourses(courses.filter(course => course.id !== courseToDelete));
    toast.success("코스가 성공적으로 삭제되었습니다.");
    setCourseToDelete(null);
  } catch (error) {
    console.error("Error deleting course:", error);
    toast.error("코스 삭제 중 오류가 발생했습니다.");
  } finally {
    setDeletingCourseId(null);
  }
};
```

**두 개의 AlertDialog 추가:**
```typescript
{/* 프로젝트 삭제 확인 대화상자 */}
<AlertDialog open={!!projectToDelete} onOpenChange={(open) => !open && setProjectToDelete(null)}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>정말 삭제하시겠습니까?</AlertDialogTitle>
      <AlertDialogDescription>
        이 프로젝트를 삭제하면 되돌릴 수 없습니다. 프로젝트와 관련된 모든 데이터가 영구적으로 삭제됩니다.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>아니오</AlertDialogCancel>
      <AlertDialogAction onClick={confirmDeleteProject}>예</AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>

{/* 코스 삭제 확인 대화상자 */}
<AlertDialog open={!!courseToDelete} onOpenChange={(open) => !open && setCourseToDelete(null)}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>정말 삭제하시겠습니까?</AlertDialogTitle>
      <AlertDialogDescription>
        이 코스를 삭제하면 되돌릴 수 없습니다. 코스와 관련된 모든 데이터가 영구적으로 삭제됩니다.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>아니오</AlertDialogCancel>
      <AlertDialogAction onClick={confirmDeleteCourse}>예</AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

## 주요 개선 사항

### 1. 사용자 경험 개선

**이전:**
- 브라우저 기본 `confirm()` 대화상자 사용
- "확인" / "취소" 버튼
- 스타일링 불가능
- 삭제 후 페이지 새로고침 필요

**이후:**
- 커스텀 AlertDialog 컴포넌트
- "예" / "아니오" 버튼으로 명확한 의도 표현
- 애플리케이션 테마와 일관된 디자인
- 삭제 즉시 목록에서 제거 (새로고침 불필요)

### 2. 즉시 반영 (Optimistic Update)

**핵심 변경:**
```typescript
// 삭제 성공 후 즉시 상태 업데이트
setCourses(courses.filter(course => course.id !== courseToDelete));
setProjects(projects.filter(project => project.id !== projectToDelete));
```

**장점:**
- 사용자가 삭제 결과를 즉시 확인 가능
- 페이지 이탈/재진입 불필요
- 더 나은 사용자 경험

**작동 순서:**
1. 삭제 버튼 클릭
2. AlertDialog 표시
3. "예" 버튼 클릭
4. Supabase에서 데이터 삭제
5. **즉시 화면에서 항목 제거** ✨
6. 성공 토스트 메시지 표시

### 3. 로딩 상태 관리

**로딩 인디케이터:**
```typescript
{deletingId === course.id ? (
  <Loader2 className="h-4 w-4 animate-spin" />
) : (
  <Trash2 className="h-4 w-4" />
)}
```

**disabled 상태:**
```typescript
disabled={deletingId === course.id}
// 또는
disabled={deletingProjectId === project.id}
```

**이점:**
- 삭제 진행 중 시각적 피드백
- 중복 클릭 방지
- 사용자에게 작업 진행 상태 전달

### 4. 에러 처리

**견고한 에러 핸들링:**
```typescript
try {
  // 삭제 로직
} catch (error) {
  console.error("Error deleting course:", error);
  toast.error("코스 삭제 중 오류가 발생했습니다.");
} finally {
  setDeletingId(null); // 항상 로딩 상태 해제
}
```

**토스트 메시지:**
- 성공: "코스가 성공적으로 삭제되었습니다."
- 실패: "코스 삭제 중 오류가 발생했습니다."

## 기술적 세부사항

### 상태 관리 구조

```typescript
// 삭제 진행 상태 (로딩 인디케이터용)
const [deletingId, setDeletingId] = useState<string | null>(null);

// 삭제 확인 대기 중인 항목 (AlertDialog 제어용)
const [courseToDelete, setCourseToDelete] = useState<string | null>(null);
```

**이유:**
- `deletingId`: 어떤 항목이 현재 삭제 중인지 추적
- `courseToDelete`: AlertDialog의 open/close 상태 제어

### AlertDialog 상태 관리

```typescript
open={!!courseToDelete}
onOpenChange={(open) => !open && setCourseToDelete(null)}
```

**동작:**
- `!!courseToDelete`: courseToDelete가 있으면 대화상자 열림
- `onOpenChange`: 대화상자가 닫히면 courseToDelete를 null로 설정
- "아니오" 버튼 클릭 시 자동으로 onOpenChange 호출됨

### 이벤트 전파 중단

```typescript
onClick={(e) => {
  e.stopPropagation();
  setCourseToDelete(course.id);
}}
```

**필요성:**
- 코스 카드 자체에 `onClick` 이벤트가 있음 (빌더 페이지로 이동)
- 삭제 버튼 클릭 시 카드 클릭 이벤트 방지
- `e.stopPropagation()`으로 이벤트 버블링 차단

## 수정된 파일

### 1. src/pages/CoursesPage.tsx
- AlertDialog import 추가
- `courseToDelete` 상태 추가
- `confirmDeleteCourse` 함수 구현
- 삭제 버튼 UI 추가
- AlertDialog 컴포넌트 추가
- 즉시 목록 업데이트 로직 추가

### 2. src/pages/Dashboard.tsx
- AlertDialog import 추가
- `projectToDelete`, `courseToDelete` 상태 추가
- `confirmDeleteProject`, `confirmDeleteCourse` 함수 구현
- 프로젝트 삭제 버튼 UI 수정
- 코스 삭제 버튼 UI 추가
- 두 개의 AlertDialog 컴포넌트 추가
- 즉시 목록 업데이트 로직 추가

## 사용자 플로우

### 코스 삭제 플로우
1. 사용자가 코스 카드의 휴지통 아이콘 클릭
2. "정말 삭제하시겠습니까?" 대화상자 표시
3. 사용자가 "예" 또는 "아니오" 선택
4. **"예" 선택 시:**
   - 휴지통 아이콘이 로딩 스피너로 변경
   - Supabase에서 코스 삭제
   - 화면에서 해당 코스 카드 즉시 제거
   - "코스가 성공적으로 삭제되었습니다." 토스트 표시
5. **"아니오" 선택 시:**
   - 대화상자 닫힘
   - 아무 변경 없음

### 프로젝트 삭제 플로우
동일한 플로우로 작동하며, 메시지만 "프로젝트" 관련으로 변경됨

## 테스트 체크리스트

- [x] 코스 삭제 버튼 클릭 시 AlertDialog 표시
- [x] "아니오" 클릭 시 대화상자 닫힘, 삭제 취소
- [x] "예" 클릭 시 즉시 목록에서 제거
- [x] 삭제 중 로딩 스피너 표시
- [x] 삭제 성공 시 토스트 메시지 표시
- [x] 삭제 실패 시 에러 토스트 표시
- [x] 프로젝트 삭제도 동일하게 작동
- [x] Dashboard의 "내 프로젝트" 탭에서 삭제 가능
- [x] Dashboard의 "내 코스" 탭에서 삭제 가능
- [x] CoursesPage에서 코스 삭제 가능

## 알려진 이슈 및 해결

### 이슈 1: 실시간 구독이 작동하지 않음
**문제:** Supabase 실시간 구독이 삭제 이벤트를 감지하지 못함

**해결:** 삭제 성공 후 `filter()` 메서드로 상태를 직접 업데이트
```typescript
setCourses(courses.filter(course => course.id !== courseToDelete));
```

### 이슈 2: 삭제 후 목록이 업데이트되지 않음
**문제:** 삭제 후 다른 페이지로 이동했다가 돌아와야 목록 갱신됨

**해결:** Optimistic Update 패턴 적용 - 삭제 즉시 상태 업데이트

## 향후 개선 방향

1. **일괄 삭제**: 여러 항목을 한 번에 삭제하는 기능
2. **삭제 취소**: 삭제 후 일정 시간 내 복구 가능한 기능
3. **휴지통**: 삭제된 항목을 일시적으로 보관하는 휴지통 기능
4. **삭제 애니메이션**: 항목이 사라질 때 부드러운 페이드아웃 효과
5. **실시간 구독 개선**: Supabase 실시간 이벤트 디버깅 및 수정

## 참고 자료

- [shadcn/ui AlertDialog Documentation](https://ui.shadcn.com/docs/components/alert-dialog)
- [React State Management Best Practices](https://react.dev/learn/managing-state)
- [Optimistic Updates Pattern](https://tkdodo.eu/blog/react-query-and-forms#optimistic-updates)
- [Supabase Realtime Documentation](https://supabase.com/docs/guides/realtime)

## 결론

프로젝트 및 코스 삭제 기능을 사용자 친화적으로 개선하여:
- 명확한 "예/아니오" 확인 대화상자 제공
- 삭제 즉시 목록에서 제거되어 즉각적인 피드백 제공
- 로딩 상태와 에러 처리로 안정적인 UX 구현
- 일관된 디자인으로 애플리케이션 품질 향상

사용자는 이제 더 안전하고 편리하게 프로젝트와 코스를 관리할 수 있습니다.
