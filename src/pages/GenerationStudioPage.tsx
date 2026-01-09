import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Header from "@/components/Header";
import { useAuth } from "@/hooks/useAuth";
import {
  getGenerationJob,
  callAzureFunctionDirect,
  generationChat,
  cancelGenerationJob,
  type GenerationArtifactDto,
} from "@/lib/azureFunctions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, RefreshCw, Square, SendHorizonal } from "lucide-react";
import { InfographicCanvas } from "@/components/studio/InfographicCanvas";
import { SlidesCanvas } from "@/components/studio/SlidesCanvas";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";

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
  const [previewTab, setPreviewTab] = useState<"document" | "infographic" | "slides">("document");

  // Chat UI state (frontend-only persistence)
  const [chatInput, setChatInput] = useState("");
  const [chatSending, setChatSending] = useState(false);
  const [chatMessages, setChatMessages] = useState<
    Array<{ role: "user" | "assistant"; content: string; createdAt: string }>
  >([]);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

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

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages.length]);

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

  const slidesDeckSources = useMemo(() => {
    const s = artifactsByType.get("slides")?.content_json?.sources;
    return Array.isArray(s) ? s : [];
  }, [artifactsByType]);

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
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-base">진행/대화</CardTitle>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-2"
                  onClick={async () => {
                    if (!id) return;
                    try {
                      const res = await cancelGenerationJob({ projectId: id, reason: "Cancelled by user" });
                      if (res.error) throw res.error;
                      toast.success("작업 중단을 요청했습니다.");
                      await fetchAll(false);
                    } catch (e: any) {
                      toast.error(`중단 요청 실패: ${e?.message || e}`);
                    }
                  }}
                  disabled={!jobState.job || jobState.job?.status === "completed" || jobState.job?.status === "failed"}
                >
                  <Square className="h-4 w-4" />
                  중단
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="h-[calc(100vh-240px)] px-6 pb-6 flex flex-col gap-4">
                {/* Progress */}
                <ScrollArea className="flex-1 pr-3">
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

                {/* Chat */}
                <div className="rounded-lg border bg-background">
                  <div className="px-3 py-2 border-b text-xs text-muted-foreground flex items-center justify-between">
                    <span>채팅 (현재 보기: {previewTab === "document" ? "강의안" : previewTab === "infographic" ? "인포그래픽" : "슬라이드"})</span>
                    <span className="text-[11px]">
                      {jobState.job?.status ? `Job: ${jobState.job.status}` : "Job 없음"}
                    </span>
                  </div>
                  <ScrollArea className="h-48 px-3 py-2">
                    <div className="space-y-2">
                      {chatMessages.length === 0 && (
                        <div className="text-xs text-muted-foreground">
                          예) “슬라이드 3장 더 추가하고, 2번 슬라이드에 실습 예시를 넣어줘” 또는 “강의안 목차를 더 자세히 바꿔줘”
                        </div>
                      )}
                      {chatMessages.map((m, i) => (
                        <div
                          key={`${m.createdAt}-${i}`}
                          className={`rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
                            m.role === "user"
                              ? "bg-primary text-primary-foreground ml-8"
                              : "bg-muted mr-8"
                          }`}
                        >
                          {m.content}
                        </div>
                      ))}
                      <div ref={chatEndRef} />
                    </div>
                  </ScrollArea>
                  <div className="p-3 border-t space-y-2">
                    <Textarea
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder="AI에게 수정/추가/중단 요청을 입력하세요..."
                      className="min-h-[72px]"
                    />
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-[11px] text-muted-foreground">
                        전송 시 해당 산출물({previewTab})에 수정 step이 추가됩니다.
                      </div>
                      <Button
                        size="sm"
                        className="gap-2"
                        onClick={async () => {
                          if (!id) return;
                          const msg = chatInput.trim();
                          if (!msg) return;

                          setChatSending(true);
                          setChatInput("");
                          const now = new Date().toISOString();
                          setChatMessages((prev) => [...prev, { role: "user", content: msg, createdAt: now }]);

                          try {
                            const targets =
                              previewTab === "document"
                                ? { document: true }
                                : previewTab === "infographic"
                                ? { infographic: true }
                                : { slides: true };

                            const res = await generationChat({ projectId: id, message: msg, targets });
                            if (res.error) throw res.error;
                            const assistant = res.data?.assistantMessage || "요청을 접수했습니다. 진행 상황을 갱신합니다.";
                            setChatMessages((prev) => [
                              ...prev,
                              { role: "assistant", content: assistant, createdAt: new Date().toISOString() },
                            ]);
                            await fetchAll(false);
                          } catch (e: any) {
                            setChatMessages((prev) => [
                              ...prev,
                              {
                                role: "assistant",
                                content: `오류가 발생했습니다: ${e?.message || e}`,
                                createdAt: new Date().toISOString(),
                              },
                            ]);
                            toast.error("채팅 요청 실패");
                          } finally {
                            setChatSending(false);
                          }
                        }}
                        disabled={chatSending}
                      >
                        <SendHorizonal className={`h-4 w-4 ${chatSending ? "opacity-70" : ""}`} />
                        보내기
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Right: Canvas Preview */}
          <Card className="h-[calc(100vh-180px)]">
            <CardHeader>
              <CardTitle className="text-base">캔버스(미리보기)</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs value={previewTab} onValueChange={(v) => setPreviewTab(v as any)} className="w-full">
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
                    {(slidesDeckSources.length > 0 || webSources.length > 0) && (
                      <div className="mt-4">
                        <div className="text-xs text-muted-foreground mb-2">참고 출처</div>
                        <ul className="text-xs space-y-1 list-disc pl-5">
                          {(slidesDeckSources.length > 0 ? slidesDeckSources : webSources)
                            .slice(0, 8)
                            .map((s: any) => (
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

