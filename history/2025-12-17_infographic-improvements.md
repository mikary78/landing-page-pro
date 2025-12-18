# 2025-12-17 - 인포그래픽 기능 개선

## 사용자 요구사항

1. **인포그래픽 시각화 개선**: 생성된 텍스트를 그대로 나열하지 않고, 시각적 인포그래픽 컴포넌트로 변환
2. **Code View 버튼 추가**: 인포그래픽 HTML 코드를 볼 수 있는 기능
3. **PDF 다운로드 한글 깨짐 수정**: jsPDF의 한글 폰트 미지원 문제 해결

## 구현 내용

### 1. 인포그래픽 컴포넌트 전면 재작성

**파일**: `src/components/InfographicPreview.tsx`

**변경 내용**:
- 텍스트 나열 방식에서 **시각적 인포그래픽**으로 변환
- 콘텐츠 내 `**학습 목표**`, `**대상 학습자**` 등의 패턴을 자동 감지
- 섹션 타입별로 다른 시각적 컴포넌트 렌더링

**섹션별 시각화**:
| 감지 키워드 | 렌더링 형태 | 색상 |
|-------------|-------------|------|
| 학습 목표 | 체크마크 아이콘 + 카드 그리드 | 파란색 |
| 대상 학습자 | 프로필 아이콘 + 정보 박스 | 초록색 |
| 커리큘럼/세션 | 타임라인 스텝 (1→2→3) | 주황색 |
| 학습 경로 | 플로우 차트 | 보라색 |
| 평가/퀴즈 | 체크리스트 카드 | 분홍색 |

**참고 디자인**: https://mikary78.github.io/small-business/

### 2. Code View 기능 추가

**위치**: 인포그래픽 헤더(보라색 영역) 우측 상단

**기능**:
- 현재 인포그래픽을 **완전한 HTML 코드**로 변환
- 모달 창에서 코드 표시
- **복사 버튼**: 클립보드에 전체 코드 복사
- **편집 가능**: textarea에서 직접 수정 가능

**생성되는 HTML**:
- `<!DOCTYPE html>` 부터 시작하는 독립 실행 가능한 파일
- 인라인 CSS 포함 (외부 의존성 없음)
- `.html` 파일로 저장하여 브라우저에서 바로 열 수 있음

### 3. PDF 다운로드 한글 깨짐 수정

**파일**: `src/pages/ProjectDetail.tsx`

**문제 원인**: jsPDF 라이브러리가 기본적으로 한글 폰트를 지원하지 않음

**해결 방법**: 브라우저 Print API 사용
- 새 창에서 HTML 문서 생성
- 한글 웹폰트 (Noto Sans KR, 맑은 고딕) 적용
- 마크다운 형식을 HTML로 변환 (`#`, `**`, `•` 등)
- 인쇄 다이얼로그에서 "PDF로 저장" 선택

**사용 방법**:
1. PDF 버튼 클릭
2. 새 창 열림 → 인쇄 다이얼로그 표시
3. "대상"에서 "PDF로 저장" 선택
4. 저장 클릭

## 수정된 파일 목록

1. `src/components/InfographicPreview.tsx` - 전면 재작성 (621줄)
2. `src/pages/ProjectDetail.tsx` - handleDownloadPDF 함수 수정

## 기술적 세부사항

### 콘텐츠 파싱 로직
```typescript
// 섹션 추출 패턴
const sectionPattern = /(?:\*\*([^*]+)\*\*|\n##\s*([^\n]+))/g;

// 섹션 타입 감지
const detectSectionType = (title: string): ExtractedSection['type'] => {
  const lower = title.toLowerCase();
  if (lower.includes('목표')) return 'objectives';
  if (lower.includes('대상') || lower.includes('학습자')) return 'audience';
  if (lower.includes('세션') || lower.includes('차시')) return 'sessions';
  // ...
};
```

### HTML 코드 생성
```typescript
const generateHtmlCode = (title, description, aiModel, createdAt, sections) => {
  // 각 섹션을 타입별로 다른 HTML 구조로 변환
  // 인라인 CSS로 스타일 적용
  return `<!DOCTYPE html>...`;
};
```

## 테스트 확인사항

- [x] 인포그래픽 탭에서 시각적 컴포넌트 표시 확인
- [x] Code View 버튼 위치 (헤더 우측 상단)
- [x] HTML 코드 복사 기능
- [x] PDF 다운로드 시 한글 정상 표시

## 관련 이슈

- 인포그래픽이 "준비 중"으로 표시되던 문제 해결
  - 원인: `parseContent` 함수가 콘텐츠 패턴을 찾지 못함
  - 해결: stages 데이터에서 직접 콘텐츠 추출 후 파싱

