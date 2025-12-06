import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";

const ResetPassword = () => {
  const navigate = useNavigate();
  const { resetPassword, updatePassword } = useAuth();

  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"request" | "reset">("request");

  // URL 해시에서 토큰(access_token, refresh_token)을 감지해 세션 설정
  useEffect(() => {
    const hash = window.location.hash.replace("#", "");
    if (!hash) return;
    const params = new URLSearchParams(hash);
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");
    const type = params.get("type");

    if (accessToken && refreshToken && type === "recovery") {
      supabase.auth
        .setSession({ access_token: accessToken, refresh_token: refreshToken })
        .then(({ error }) => {
          if (error) throw error;
          setMode("reset");
        })
        .catch((error) => {
          toast({
            title: "세션 설정 실패",
            description:
              error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.",
            variant: "destructive",
          });
        });
    }
  }, []);

  const requestReset = async () => {
    if (!email.trim()) {
      toast({
        title: "이메일을 입력해 주세요",
        variant: "destructive",
      });
      return;
    }
    setLoading(true);
    await resetPassword(email.trim());
    setLoading(false);
  };

  const handlePasswordUpdate = async () => {
    if (!newPassword || newPassword.length < 6) {
      toast({
        title: "비밀번호는 6자 이상이어야 합니다.",
        variant: "destructive",
      });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({
        title: "비밀번호가 일치하지 않습니다.",
        variant: "destructive",
      });
      return;
    }
    setLoading(true);
    await updatePassword(newPassword);
    setLoading(false);
  };

  const title = mode === "request" ? "비밀번호 재설정" : "새 비밀번호 설정";
  const description =
    mode === "request"
      ? "가입하신 이메일로 비밀번호 재설정 링크를 보내드립니다."
      : "이메일로 받은 링크를 통해 인증이 완료되었습니다. 새 비밀번호를 입력해 주세요.";

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8 md:py-12 max-w-xl">
        <Card>
          <CardHeader>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {mode === "request" ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="email">이메일</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="example@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <Button className="w-full" onClick={requestReset} disabled={loading}>
                  {loading ? "전송 중..." : "재설정 메일 보내기"}
                </Button>
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="newPassword">새 비밀번호</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    placeholder="새 비밀번호를 입력하세요"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">새 비밀번호 확인</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="한 번 더 입력하세요"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
                <Button className="w-full" onClick={handlePasswordUpdate} disabled={loading}>
                  {loading ? "변경 중..." : "비밀번호 변경"}
                </Button>
              </>
            )}
            <Button variant="ghost" className="w-full" onClick={() => navigate("/auth")}>
              로그인 화면으로 돌아가기
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default ResetPassword;
