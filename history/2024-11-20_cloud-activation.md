# 2024-11-20 - Lovable Cloud 활성화

## 사용자 요구사항
- 프로젝트에 Lovable Cloud 활성화

## 구현 답변
- Lovable Cloud 활성화 완료
- 데이터베이스, 인증, 스토리지, Edge Functions 기능 사용 가능
- Supabase 클라이언트 자동 설치 및 구성

## 수정 내역 요약

### Backend 인프라 활성화
- Lovable Cloud (Supabase 기반) 프로젝트 생성 및 연결
- Project ID: afbpwfhfyjkadefclfia
- 자동 설치된 패키지: @supabase/supabase-js

### 자동 생성된 파일들
다음 파일들이 자동으로 생성되며 **절대 수동 편집하지 말 것**:
- `supabase/config.toml` - Supabase 프로젝트 설정
- `src/integrations/supabase/client.ts` - Supabase 클라이언트
- `src/integrations/supabase/types.ts` - 데이터베이스 타입 정의
- `.env` - 환경 변수 (VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY)

### 사용 가능한 기능
1. **데이터베이스**: PostgreSQL 데이터베이스 (테이블, RLS 정책)
2. **인증**: 이메일/비밀번호, 소셜 로그인 (Google 등)
3. **스토리지**: 파일 업로드 및 관리
4. **Edge Functions**: 서버리스 백엔드 로직 (자동 배포)
5. **실시간**: 실시간 데이터 동기화

## 사용 예시

### Supabase 클라이언트 사용
```typescript
import { supabase } from "@/integrations/supabase/client";

// 데이터 조회
const { data, error } = await supabase
  .from('table_name')
  .select('*');

// 인증
const { data, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'password'
});
```

## 보안 주의사항
- RLS (Row Level Security) 정책을 반드시 설정해야 함
- 민감한 데이터에는 적절한 접근 제어 필요
- Edge Functions에서 비밀 키는 Secrets로 관리

## 테스트
현재 테스트 코드 없음 (백엔드 기능 구현 후 작성 예정)

## 참고자료
- **Lovable Cloud 문서**: https://docs.lovable.dev/features/cloud
- **Supabase 클라이언트 문서**: https://supabase.com/docs/reference/javascript
