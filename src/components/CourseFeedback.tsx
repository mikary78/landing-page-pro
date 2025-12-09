import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
import { 
  MessageSquare, 
  Star, 
  Loader2,
  Copy,
  CheckCircle2,
  TrendingUp,
  Users
} from "lucide-react";

interface CourseFeedbackProps {
  projectId: string;
  isOwner?: boolean;
}

interface Feedback {
  id: string;
  user_email: string | null;
  rating: number | null;
  comment: string | null;
  feedback_type: string;
  created_at: string;
}

interface FeedbackStats {
  totalCount: number;
  averageRating: number;
  ratingDistribution: Record<number, number>;
}

const CourseFeedback = ({ projectId, isOwner = true }: CourseFeedbackProps) => {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [stats, setStats] = useState<FeedbackStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);

  // 피드백 제출 폼 (비소유자용)
  const [formData, setFormData] = useState({
    email: "",
    rating: 0,
    comment: "",
  });

  const fetchFeedbacks = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("course_feedbacks")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setFeedbacks(data || []);
      calculateStats(data || []);
    } catch (error) {
      console.error("Error fetching feedbacks:", error);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchFeedbacks();
  }, [fetchFeedbacks]);

  const calculateStats = (data: Feedback[]) => {
    if (data.length === 0) {
      setStats(null);
      return;
    }

    const ratingsWithValues = data.filter(f => f.rating !== null);
    const avgRating = ratingsWithValues.length > 0
      ? ratingsWithValues.reduce((sum, f) => sum + (f.rating || 0), 0) / ratingsWithValues.length
      : 0;

    const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    ratingsWithValues.forEach(f => {
      if (f.rating) {
        distribution[f.rating]++;
      }
    });

    setStats({
      totalCount: data.length,
      averageRating: Math.round(avgRating * 10) / 10,
      ratingDistribution: distribution,
    });
  };

  const handleSubmitFeedback = async () => {
    if (formData.rating === 0) {
      toast.error("평점을 선택해주세요.");
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from("course_feedbacks")
        .insert({
          project_id: projectId,
          user_email: formData.email || null,
          rating: formData.rating,
          comment: formData.comment || null,
          feedback_type: "general",
        });

      if (error) throw error;

      toast.success("피드백이 제출되었습니다. 감사합니다!");
      setFormData({ email: "", rating: 0, comment: "" });
      fetchFeedbacks();
    } catch (error) {
      console.error("Error submitting feedback:", error);
      toast.error("피드백 제출 중 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  const copyFeedbackLink = async () => {
    const feedbackUrl = `${window.location.origin}/course/${projectId}/feedback`;
    await navigator.clipboard.writeText(feedbackUrl);
    setCopied(true);
    toast.success("피드백 링크가 복사되었습니다!");
    setTimeout(() => setCopied(false), 2000);
  };

  const StarRating = ({ rating, onSelect, interactive = false }: { 
    rating: number; 
    onSelect?: (rating: number) => void;
    interactive?: boolean;
  }) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            disabled={!interactive}
            onClick={() => onSelect?.(star)}
            className={`${interactive ? 'cursor-pointer hover:scale-110' : 'cursor-default'} transition-transform`}
          >
            <Star
              className={`h-6 w-6 ${
                star <= rating
                  ? "fill-yellow-400 text-yellow-400"
                  : "text-muted-foreground"
              }`}
            />
          </button>
        ))}
      </div>
    );
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

  // 소유자가 아닌 경우 피드백 제출 폼 표시
  if (!isOwner) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            피드백 남기기
          </CardTitle>
          <CardDescription>
            이 교육 과정에 대한 의견을 남겨주세요
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>평점</Label>
            <StarRating
              rating={formData.rating}
              onSelect={(r) => setFormData({ ...formData, rating: r })}
              interactive
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">이메일 (선택)</Label>
            <Input
              id="email"
              type="email"
              placeholder="feedback@example.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="comment">의견</Label>
            <Textarea
              id="comment"
              placeholder="교육 과정에 대한 의견을 자유롭게 남겨주세요..."
              value={formData.comment}
              onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
              rows={4}
            />
          </div>

          <Button
            onClick={handleSubmitFeedback}
            disabled={submitting || formData.rating === 0}
            className="w-full"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4 mr-2" />
            )}
            피드백 제출
          </Button>
        </CardContent>
      </Card>
    );
  }

  // 소유자인 경우 피드백 통계 및 목록 표시
  return (
    <div className="space-y-4">
      {/* 피드백 링크 공유 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            피드백 수집
          </CardTitle>
          <CardDescription>
            수강생들의 피드백을 수집하고 관리합니다
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              value={`${window.location.origin}/course/${projectId}/feedback`}
              readOnly
              className="font-mono text-sm"
            />
            <Button variant="outline" onClick={copyFeedbackLink}>
              {copied ? (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            이 링크를 수강생들에게 공유하여 피드백을 수집하세요
          </p>
        </CardContent>
      </Card>

      {/* 피드백 통계 */}
      {stats && stats.totalCount > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              피드백 통계
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                  <span className="text-2xl font-bold">{stats.averageRating}</span>
                </div>
                <p className="text-sm text-muted-foreground">평균 평점</p>
              </div>
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Users className="h-5 w-5 text-primary" />
                  <span className="text-2xl font-bold">{stats.totalCount}</span>
                </div>
                <p className="text-sm text-muted-foreground">총 피드백</p>
              </div>
            </div>

            <div className="space-y-2">
              {[5, 4, 3, 2, 1].map((star) => {
                const count = stats.ratingDistribution[star] || 0;
                const percentage = stats.totalCount > 0 ? (count / stats.totalCount) * 100 : 0;
                return (
                  <div key={star} className="flex items-center gap-2">
                    <span className="w-8 text-sm">{star}점</span>
                    <Progress value={percentage} className="flex-1 h-2" />
                    <span className="w-8 text-sm text-muted-foreground">{count}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 피드백 목록 */}
      <Card>
        <CardHeader>
          <CardTitle>최근 피드백</CardTitle>
        </CardHeader>
        <CardContent>
          {feedbacks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>아직 수집된 피드백이 없습니다</p>
            </div>
          ) : (
            <div className="space-y-4">
              {feedbacks.slice(0, 10).map((feedback) => (
                <div
                  key={feedback.id}
                  className="p-4 border rounded-lg space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <StarRating rating={feedback.rating || 0} />
                    <span className="text-xs text-muted-foreground">
                      {new Date(feedback.created_at).toLocaleDateString("ko-KR")}
                    </span>
                  </div>
                  {feedback.comment && (
                    <p className="text-sm">{feedback.comment}</p>
                  )}
                  {feedback.user_email && (
                    <p className="text-xs text-muted-foreground">
                      {feedback.user_email}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CourseFeedback;
