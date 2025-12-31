/**
 * 인증 페이지
 * Microsoft Entra External ID를 사용한 로그인/회원가입
 * 
 * 수정일: 2025-12-31
 * 수정 내용: useAuth 훅으로 통일 (이전: useAzureAuth와 혼용)
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useAzureAuth } from '@/hooks/useAzureAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

const Auth = () => {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const { user, isAuthenticated, loading } = useAuth();
  const { loginPopup, signupPopup, resetPassword } = useAzureAuth();
  const navigate = useNavigate();

  // 디버그 로그
  useEffect(() => {
    console.log('[Auth] Component state:', {
      isAuthenticated,
      user,
      loading,
      mode
    });
  }, [isAuthenticated, user, loading, mode]);

  // 이미 로그인된 상태면 홈으로 리다이렉트
  useEffect(() => {
    console.log('[Auth] Checking redirect:', { isAuthenticated, user, loading });
    
    // 로딩 중이면 대기
    if (loading) {
      console.log('[Auth] Still loading, waiting...');
      return;
    }
    
    // 인증되어 있고 사용자 정보가 있으면 리다이렉트
    if (isAuthenticated && user && user.id) {
      console.log('[Auth] User authenticated, redirecting to home...');
      // setTimeout을 사용하여 React Router 타이밍 이슈 방지
      setTimeout(() => {
        navigate('/', { replace: true });
      }, 100);
    }
  }, [isAuthenticated, user, loading, navigate]);

  const handleSignIn = async () => {
    try {
      console.log('[Auth] Button clicked - Starting sign in (popup)...');
      await loginPopup();
      console.log('[Auth] Login popup completed');
    } catch (error: any) {
      console.error('[Auth] Sign in failed:', error);
      // 에러 메시지 추출
      let errorMessage = '알 수 없는 오류가 발생했습니다.';
      if (error?.errorMessage) {
        errorMessage = error.errorMessage;
      } else if (error?.message) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      console.error('[Auth] Error details:', {
        errorCode: error?.errorCode,
        errorMessage: error?.errorMessage,
        message: error?.message,
        fullError: error,
      });
      alert(`로그인 실패: ${errorMessage}`);
    }
  };

  const handleSignUp = async () => {
    try {
      console.log('[Auth] Starting sign up (popup)...');
      // signupPopup을 호출하여 회원가입 화면으로 유도
      await signupPopup();
      console.log('[Auth] Signup popup completed');
    } catch (error: any) {
      console.error('[Auth] Sign up failed:', error);
      // 에러 메시지 추출
      let errorMessage = '알 수 없는 오류가 발생했습니다.';
      if (error?.errorMessage) {
        errorMessage = error.errorMessage;
      } else if (error?.message) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      console.error('[Auth] Error details:', {
        errorCode: error?.errorCode,
        errorMessage: error?.errorMessage,
        message: error?.message,
        fullError: error,
      });
      alert(`회원가입 실패: ${errorMessage}`);
    }
  };

  const handlePasswordReset = async () => {
    try {
      console.log('[Auth] Starting password reset...');
      await resetPassword();
    } catch (error) {
      console.error('[Auth] Password reset failed:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            {mode === 'signin' ? '로그인' : '회원가입'}
          </CardTitle>
          <CardDescription className="text-center">
            {mode === 'signin'
              ? 'Microsoft 계정으로 로그인하세요'
              : '새 계정을 만들어보세요'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {mode === 'signin' ? (
            <>
              <Button
                onClick={handleSignIn}
                className="w-full"
                size="lg"
                disabled={loading}
              >
                이메일로 로그인
              </Button>

              <Separator />
              
              <div className="text-xs text-center text-muted-foreground">
                <p>로그인 화면에서 Google 로그인 옵션도 사용할 수 있습니다.</p>
                <p className="text-[10px] mt-1">
                  (Azure Portal → External Identities → Identity providers에서 설정 필요)
                </p>
              </div>

              <div className="text-center">
                <button
                  type="button"
                  onClick={handlePasswordReset}
                  className="text-sm text-primary hover:underline"
                  disabled={loading}
                >
                  비밀번호를 잊으셨나요?
                </button>
              </div>

              <Separator />

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setMode('signup')}
                  className="text-sm text-muted-foreground hover:text-primary"
                  disabled={loading}
                >
                  계정이 없으신가요? <span className="text-primary font-medium">회원가입</span>
                </button>
              </div>
            </>
          ) : (
            <>
              <Button
                onClick={handleSignUp}
                className="w-full"
                size="lg"
                disabled={loading}
              >
                이메일로 회원가입
              </Button>

              <div className="text-xs text-center text-muted-foreground p-3 bg-muted rounded-lg">
                <p>팝업 창이 열리면 이메일 주소를 입력하고</p>
                <p><strong>"계정이 없나요? 계정 만들기"</strong> 링크를 클릭하세요.</p>
              </div>

              <div className="pt-2 border-t">
                <p className="text-xs text-center text-muted-foreground">
                  회원가입 시 이용약관 및 개인정보처리방침에 동의하게 됩니다
                </p>
              </div>

              <Separator />

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setMode('signin')}
                  className="text-sm text-muted-foreground hover:text-primary"
                  disabled={loading}
                >
                  이미 계정이 있으신가요? <span className="text-primary font-medium">로그인</span>
                </button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
