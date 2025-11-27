import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { 
  Rocket, 
  Globe, 
  Copy, 
  CheckCircle2, 
  Loader2,
  ExternalLink,
  RefreshCw
} from "lucide-react";

interface CourseDeploymentProps {
  projectId: string;
  userId: string;
  projectTitle: string;
}

interface Deployment {
  id: string;
  deployment_url: string | null;
  deployment_status: string;
  version: number;
  published_at: string | null;
  created_at: string;
}

const CourseDeployment = ({ projectId, userId, projectTitle }: CourseDeploymentProps) => {
  const [deployment, setDeployment] = useState<Deployment | null>(null);
  const [loading, setLoading] = useState(true);
  const [deploying, setDeploying] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchDeployment();
  }, [projectId]);

  const fetchDeployment = async () => {
    try {
      const { data, error } = await supabase
        .from("course_deployments")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      setDeployment(data);
    } catch (error) {
      console.error("Error fetching deployment:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeploy = async () => {
    setDeploying(true);
    try {
      const deploymentUrl = `${window.location.origin}/course/${projectId}`;
      const newVersion = deployment ? deployment.version + 1 : 1;

      const { data, error } = await supabase
        .from("course_deployments")
        .insert({
          project_id: projectId,
          user_id: userId,
          deployment_url: deploymentUrl,
          deployment_status: "published",
          version: newVersion,
          published_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      setDeployment(data);
      toast.success("교육 과정이 성공적으로 배포되었습니다!");
    } catch (error) {
      console.error("Error deploying:", error);
      toast.error("배포 중 오류가 발생했습니다.");
    } finally {
      setDeploying(false);
    }
  };

  const copyToClipboard = async () => {
    if (deployment?.deployment_url) {
      await navigator.clipboard.writeText(deployment.deployment_url);
      setCopied(true);
      toast.success("링크가 복사되었습니다!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "published":
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/20">배포됨</Badge>;
      case "draft":
        return <Badge variant="secondary">초안</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Rocket className="h-5 w-5" />
              배포 관리
            </CardTitle>
            <CardDescription>
              교육 과정을 배포하고 공유 링크를 생성합니다
            </CardDescription>
          </div>
          {deployment && getStatusBadge(deployment.deployment_status)}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {deployment?.deployment_status === "published" ? (
          <>
            <div className="space-y-2">
              <Label>배포 URL</Label>
              <div className="flex gap-2">
                <Input
                  value={deployment.deployment_url || ""}
                  readOnly
                  className="font-mono text-sm"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={copyToClipboard}
                >
                  {copied ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => window.open(deployment.deployment_url || "", "_blank")}
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>버전 {deployment.version}</span>
              <span>
                배포일: {new Date(deployment.published_at || "").toLocaleDateString("ko-KR")}
              </span>
            </div>

            <Button
              onClick={handleDeploy}
              disabled={deploying}
              variant="outline"
              className="w-full"
            >
              {deploying ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              새 버전으로 업데이트
            </Button>
          </>
        ) : (
          <div className="text-center py-6">
            <Globe className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">
              아직 배포되지 않았습니다. 배포하면 공유 가능한 링크가 생성됩니다.
            </p>
            <Button onClick={handleDeploy} disabled={deploying}>
              {deploying ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  배포 중...
                </>
              ) : (
                <>
                  <Rocket className="h-4 w-4 mr-2" />
                  지금 배포하기
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CourseDeployment;
