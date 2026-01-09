import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Header from "@/components/Header";
import { useAuth } from "@/hooks/useAuth";
import { getGenerationJob, callAzureFunctionDirect, type GenerationArtifactDto } from "@/lib/azureFunctions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, RefreshCw } from "lucide-react";
import { InfographicCanvas } from "@/components/studio/InfographicCanvas";
import { SlidesCanvas } from "@/components/studio/SlidesCanvas";

interface Project {
  id: string;
  title: string;
  description?: string;
  document_content?: string;
  ai_model?: string;
  status?: string;
}

export default function GenerationStudioPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [project, setProject] = useState<Project | null>(null);
  const [jobState, setJobState] = useState<{
    job: any | null;
    steps: any[];
    artifacts: GenerationArtifactDto[];
  }>({ job: null, steps: [], artifacts: [] });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [authLoading, user, navigate]);

  const fetchAll = async (isPolling = false) => {
    if (!id) return;
    if (!isPolling) setLoading(true);
    try {
      const [projRes, jobRes] = await Promise.all([
        callAzureFunctionDirect<{ success: boolean; project: Project }>(`/api/getproject/${id}`, "GET"),
        getGenerationJob(id),
      ]);

      if (projRes.error) throw projRes.error;
      if (projRes.data?.success) setProject(projRes.data.project);

      if (jobRes.error) throw jobRes.error;
      if (jobRes.data?.success) {
        setJobState({
          job: jobRes.data.job,
          steps: jobRes.data.steps || [],
          artifacts: jobRes.data.artifacts || [],
        });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll(false);
    // 폴링: 진행 중이면 3초마다 갱신
    const t = setInterval(() => {
      if (jobState.job?.status === "processing" || jobState.job?.status === "queued") {
        fetchAll(true);
      }
    }, 3000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const artifactsByType = useMemo(() => {
    const map = new Map<string, GenerationArtifactDto>();
    for (const a of jobState.artifacts) map.set(a.artifact_type, a);
    return map;
  }, [jobState.artifacts]);

  const webSources = useMemo(() => {
    const webStep = jobState.steps.find((s: any) => s.step_type === "web_search" && s.status === "completed");
    const sources = webStep?.output?.sources;
    return Array.isArray(sources) ? sources : [];
  }, [jobState.steps]);

  const statusBadge = (status?: string) => {
    const s = status || "unknown";
    const variant =
      s === "completed" ? "secondary" : s === "failed" ? "destructive" : "outline";
    return <Badge variant={variant as any}>{s}</Badge>;
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-12">
          <div className="flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm text-muted-foreground">스튜디오 로딩 중...</span>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={() => navigate(`/project/${id}`)} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              프로젝트로
            </Button>
            <div>
              <div className="text-lg font-semibold">{project?.title || "프로젝트"}</div>
              <div className="text-sm text-muted-foreground flex items-center gap-2">
                스튜디오 {jobState.job ? <>· Job {statusBadge(jobState.job.status)}</> : <>· Job 없음</>}
              </div>
            </div>
          </div>

          <Button
            variant="outline"
            onClick={async () => {
              setRefreshing(true);
              try {
                await fetchAll(false);
              } finally {
                setRefreshing(false);
              }
            }}
            className="gap-2"
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            새로고침
          </Button>
        </div>

        <div className="grid gap-4 lg:grid-cols-[420px_1fr]">
          {/* Left: 진행/해석 */}
          <Card className="h-[calc(100vh-180px)]">
            <CardHeader>
              <CardTitle className="text-base">진행 상황</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[calc(100vh-240px)] px-6 pb-6">
                <div className="space-y-4">
                  <div className="rounded-lg border bg-muted/30 p-3">
                    <div className="text-xs text-muted-foreground mb-1">입력 내용</div>
                    <pre className="text-xs whitespace-pre-wrap font-mono max-h-48 overflow-auto">
                      {project?.document_content || "(없음)"}
                    </pre>
                  </div>

                  <div className="space-y-2">
                    {jobState.steps.map((s: any) => (
                      <div key={s.id} className="rounded-lg border p-3">
                        <div className="flex items-center justify-between gap-2">
                          <div className="font-medium text-sm">{s.title}</div>
                          {statusBadge(s.status)}
                        </div>
                        {s.log && <div className="text-xs text-muted-foreground mt-1">{s.log}</div>}
                        {s.error && <div className="text-xs text-destructive mt-1">{s.error}</div>}
                      </div>
                    ))}
                    {jobState.steps.length === 0 && (
                      <div className="text-sm text-muted-foreground">아직 단계 정보가 없습니다.</div>
                    )}
                  </div>
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Right: Canvas Preview */}
          <Card className="h-[calc(100vh-180px)]">
            <CardHeader>
              <CardTitle className="text-base">캔버스(미리보기)</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="document" className="w-full">
                <TabsList>
                  <TabsTrigger value="document">강의안</TabsTrigger>
                  <TabsTrigger value="infographic">인포그래픽</TabsTrigger>
                  <TabsTrigger value="slides">슬라이드</TabsTrigger>
                </TabsList>

                <TabsContent value="document" className="mt-4">
                  <div className="rounded-xl border bg-white text-black shadow-sm p-6 min-h-[520px]">
                    <div className="text-xs text-muted-foreground mb-3">
                      {artifactsByType.get("document") ? statusBadge(artifactsByType.get("document")?.status) : "선택되지 않음"}
                    </div>
                    <pre className="whitespace-pre-wrap text-sm leading-6">
                      {artifactsByType.get("document")?.content_text || "강의안 산출물이 아직 없습니다."}
                    </pre>
                  </div>
                </TabsContent>

                <TabsContent value="infographic" className="mt-4">
                  <div className="rounded-xl border bg-white text-black shadow-sm p-6 min-h-[520px]">
                    <div className="text-xs text-muted-foreground mb-3">
                      {artifactsByType.get("infographic") ? statusBadge(artifactsByType.get("infographic")?.status) : "선택되지 않음"}
                    </div>
                    <InfographicCanvas
                      data={artifactsByType.get("infographic")?.content_json}
                      assets={artifactsByType.get("infographic")?.assets}
                    />
                    {webSources.length > 0 && (
                      <div className="mt-4">
                        <div className="text-xs text-muted-foreground mb-2">참고 출처</div>
                        <ul className="text-xs space-y-1 list-disc pl-5">
                          {webSources.slice(0, 6).map((s: any) => (
                            <li key={s.url}>
                              <a className="underline" href={s.url} target="_blank" rel="noreferrer">
                                {s.title || s.url}
                              </a>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="slides" className="mt-4">
                  <div className="rounded-xl border bg-white text-black shadow-sm p-6 min-h-[520px]">
                    <div className="text-xs text-muted-foreground mb-3">
                      {artifactsByType.get("slides") ? statusBadge(artifactsByType.get("slides")?.status) : "선택되지 않음"}
                    </div>
                    <SlidesCanvas
                      data={artifactsByType.get("slides")?.content_json}
                      assets={artifactsByType.get("slides")?.assets}
                    />
                    {webSources.length > 0 && (
                      <div className="mt-4">
                        <div className="text-xs text-muted-foreground mb-2">참고 출처</div>
                        <ul className="text-xs space-y-1 list-disc pl-5">
                          {webSources.slice(0, 6).map((s: any) => (
                            <li key={s.url}>
                              <a className="underline" href={s.url} target="_blank" rel="noreferrer">
                                {s.title || s.url}
                              </a>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

