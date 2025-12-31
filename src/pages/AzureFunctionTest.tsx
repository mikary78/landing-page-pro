import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Header from "@/components/Header";
import { Loader2, CheckCircle2, XCircle, AlertCircle, LogIn, LogOut } from "lucide-react";
import { toast } from "sonner";
import { callAzureFunctionUnauthenticated, processDocument, generateCurriculum } from "@/lib/azureFunctions";
import { useAzureAuth } from "@/hooks/useAzureAuth";

interface TestResult {
  name: string;
  status: 'pending' | 'success' | 'error' | 'testing';
  message?: string;
  duration?: number;
}

const AzureFunctionTest = () => {
  const { isAuthenticated, user, loginPopup, logout } = useAzureAuth();
  const [tests, setTests] = useState<TestResult[]>([
    { name: 'hello (GET)', status: 'pending' },
    { name: 'hello (POST)', status: 'pending' },
    { name: 'processDocument (인증 없이)', status: 'pending' },
    { name: 'generateCurriculum (인증 없이)', status: 'pending' },
    { name: 'processDocument (인증 포함)', status: 'pending' },
    { name: 'generateCurriculum (인증 포함)', status: 'pending' },
  ]);
  const [isRunning, setIsRunning] = useState(false);

  const updateTestStatus = (index: number, status: TestResult['status'], message?: string, duration?: number) => {
    setTests(prev => prev.map((test, i) =>
      i === index ? { ...test, status, message, duration } : test
    ));
  };

  const runTests = async () => {
    setIsRunning(true);
    toast.info("Azure Functions 테스트를 시작합니다...");

    // Test 1: hello (GET)
    try {
      updateTestStatus(0, 'testing');
      const startTime = Date.now();

      const response = await fetch(
        `${import.meta.env.VITE_AZURE_FUNCTIONS_URL}/api/hello?name=Test`
      );
      const text = await response.text();
      const duration = Date.now() - startTime;

      if (response.ok && text.includes('Hello')) {
        updateTestStatus(0, 'success', `응답: ${text}`, duration);
      } else {
        updateTestStatus(0, 'error', `예상치 못한 응답: ${text}`);
      }
    } catch (error) {
      updateTestStatus(0, 'error', `오류: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Test 2: hello (POST)
    try {
      updateTestStatus(1, 'testing');
      const startTime = Date.now();

      const response = await fetch(
        `${import.meta.env.VITE_AZURE_FUNCTIONS_URL}/api/hello`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'Azure' })
        }
      );
      const text = await response.text();
      const duration = Date.now() - startTime;

      if (response.ok && text.includes('Hello')) {
        updateTestStatus(1, 'success', `응답: ${text}`, duration);
      } else {
        updateTestStatus(1, 'error', `예상치 못한 응답: ${text}`);
      }
    } catch (error) {
      updateTestStatus(1, 'error', `오류: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Test 3: processDocument (인증 없이 - should return 401)
    try {
      updateTestStatus(2, 'testing');
      const startTime = Date.now();

      const { data, error } = await callAzureFunctionUnauthenticated(
        '/api/processdocument',
        'POST',
        { test: 'data' }
      );
      const duration = Date.now() - startTime;

      if (error && error.message.includes('401')) {
        updateTestStatus(2, 'success', '인증 미들웨어가 정상 작동 중 (401 Unauthorized)', duration);
      } else if (data) {
        updateTestStatus(2, 'error', '인증 없이 접근 가능 - 보안 문제!');
      } else {
        updateTestStatus(2, 'error', error?.message || 'Unknown error');
      }
    } catch (error) {
      updateTestStatus(2, 'error', `오류: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Test 4: generateCurriculum (인증 없이 - should return 401)
    try {
      updateTestStatus(3, 'testing');
      const startTime = Date.now();

      const { data, error } = await callAzureFunctionUnauthenticated(
        '/api/generatecurriculum',
        'POST',
        { test: 'data' }
      );
      const duration = Date.now() - startTime;

      if (error && error.message.includes('401')) {
        updateTestStatus(3, 'success', '인증 미들웨어가 정상 작동 중 (401 Unauthorized)', duration);
      } else if (data) {
        updateTestStatus(3, 'error', '인증 없이 접근 가능 - 보안 문제!');
      } else {
        updateTestStatus(3, 'error', error?.message || 'Unknown error');
      }
    } catch (error) {
      updateTestStatus(3, 'error', `오류: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Test 5: processDocument (인증 포함)
    if (isAuthenticated) {
      try {
        updateTestStatus(4, 'testing');
        const startTime = Date.now();

        const { data, error } = await processDocument({
          projectId: '00000000-0000-0000-0000-000000000001', // Valid UUID for testing
          aiModel: 'gemini',
          documentContent: 'Test document content for Azure Functions integration test'
        });
        const duration = Date.now() - startTime;

        if (data && data.success) {
          updateTestStatus(4, 'success', `정상 응답: ${JSON.stringify(data).substring(0, 100)}...`, duration);
        } else if (error) {
          updateTestStatus(4, 'error', `오류: ${error.message}`);
        } else {
          updateTestStatus(4, 'error', '예상치 못한 응답');
        }
      } catch (error) {
        updateTestStatus(4, 'error', `오류: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    } else {
      updateTestStatus(4, 'pending', '로그인 필요');
    }

    // Test 6: generateCurriculum (인증 포함)
    if (isAuthenticated) {
      try {
        updateTestStatus(5, 'testing');
        const startTime = Date.now();

        const { data, error } = await generateCurriculum({
          courseId: '00000000-0000-0000-0000-000000000002', // Valid UUID for testing
          courseTitle: 'Test Course',
          courseDescription: 'Test description for Azure Functions integration test',
          aiModel: 'gemini'
        });
        const duration = Date.now() - startTime;

        if (data && data.success) {
          updateTestStatus(5, 'success', `정상 응답: ${data.message}`, duration);
        } else if (error) {
          updateTestStatus(5, 'error', `오류: ${error.message}`);
        } else {
          updateTestStatus(5, 'error', '예상치 못한 응답');
        }
      } catch (error) {
        updateTestStatus(5, 'error', `오류: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    } else {
      updateTestStatus(5, 'pending', '로그인 필요');
    }

    setIsRunning(false);

    const allSuccess = tests.every(test => test.status === 'success' || test.status === 'testing');
    if (allSuccess) {
      toast.success("모든 테스트가 성공했습니다!");
    } else {
      toast.warning("일부 테스트가 실패했습니다.");
    }
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'testing':
        return <Loader2 className="h-5 w-5 animate-spin text-blue-500" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: TestResult['status']) => {
    switch (status) {
      case 'success':
        return <Badge className="bg-green-500">성공</Badge>;
      case 'error':
        return <Badge variant="destructive">실패</Badge>;
      case 'testing':
        return <Badge className="bg-blue-500">테스트 중</Badge>;
      default:
        return <Badge variant="outline">대기 중</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
      <Header />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Azure Functions 테스트</h1>
          <p className="text-muted-foreground">
            배포된 Azure Functions의 상태를 확인합니다.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 mb-6">
          <Card>
            <CardHeader>
              <CardTitle>연결 정보</CardTitle>
              <CardDescription>현재 연결된 Azure Functions 엔드포인트</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">Base URL:</span>
                  <code className="px-2 py-1 bg-muted rounded text-sm">
                    {import.meta.env.VITE_AZURE_FUNCTIONS_URL}
                  </code>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">Region:</span>
                  <Badge variant="outline">Korea Central</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>인증 상태</CardTitle>
              <CardDescription>Microsoft Entra ID 로그인 상태</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">상태:</span>
                  {isAuthenticated ? (
                    <Badge className="bg-green-500">로그인됨</Badge>
                  ) : (
                    <Badge variant="outline">로그아웃</Badge>
                  )}
                </div>
                {isAuthenticated && user && (
                  <div className="text-sm">
                    <p className="text-muted-foreground">사용자: {user.displayName || user.name}</p>
                    <p className="text-muted-foreground text-xs">{user.email}</p>
                  </div>
                )}
                <div className="pt-2">
                  {isAuthenticated ? (
                    <Button onClick={logout} variant="outline" size="sm">
                      <LogOut className="h-4 w-4 mr-2" />
                      로그아웃
                    </Button>
                  ) : (
                    <div className="space-y-2">
                      <Button onClick={loginPopup} size="sm" className="w-full">
                        <LogIn className="h-4 w-4 mr-2" />
                        Microsoft 로그인
                      </Button>
                      <p className="text-xs text-muted-foreground">
                        참고: Microsoft Entra ID 설정이 필요합니다
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>테스트 결과</CardTitle>
                <CardDescription>각 엔드포인트의 응답 상태</CardDescription>
              </div>
              <Button
                onClick={runTests}
                disabled={isRunning}
                size="lg"
              >
                {isRunning ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    테스트 중...
                  </>
                ) : (
                  '모든 테스트 실행'
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {tests.map((test, index) => (
                <div
                  key={index}
                  className="flex items-start gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="mt-1">
                    {getStatusIcon(test.status)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold">{test.name}</h3>
                      {getStatusBadge(test.status)}
                      {test.duration && (
                        <Badge variant="outline" className="ml-auto">
                          {test.duration}ms
                        </Badge>
                      )}
                    </div>
                    {test.message && (
                      <p className="text-sm text-muted-foreground">{test.message}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>테스트 가이드</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">1단계: 인증 없이 테스트</h4>
                <ul className="space-y-1 text-sm text-muted-foreground ml-4">
                  <li>• "모든 테스트 실행" 버튼 클릭</li>
                  <li>• hello 테스트 성공 확인</li>
                  <li>• 인증 필요 엔드포인트는 401 반환 확인</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-2">2단계: Microsoft 로그인</h4>
                <ul className="space-y-1 text-sm text-muted-foreground ml-4">
                  <li>• "Microsoft 로그인" 버튼 클릭</li>
                  <li>• Microsoft 계정으로 로그인</li>
                  <li>• 인증 상태가 "로그인됨"으로 변경 확인</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-2">3단계: 인증된 요청 테스트</h4>
                <ul className="space-y-1 text-sm text-muted-foreground ml-4">
                  <li>• 다시 "모든 테스트 실행" 버튼 클릭</li>
                  <li>• 인증 포함 테스트가 성공하는지 확인</li>
                  <li>• AI 모델이 정상적으로 응답하는지 확인</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default AzureFunctionTest;
